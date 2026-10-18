// =========================
// EVALUACIÓN DE LA RECUPERACIÓN (mejora de Consultas, fase 3) — SOLO LECTURA
// Corre un juego de preguntas con artículos esperados contra tres variantes
// y mide si los artículos correctos aparecen y en qué puesto:
//   A · producción: el mismo flujo de recuperación que usa hoy Consultas
//       (consultarLexit) sobre la base actual (__default__).
//   B · esquema nuevo con la búsqueda de hoy: el mismo algoritmo sobre el
//       namespace de prueba (los filtros por código se traducen a normaId/área).
//   C · esquema nuevo con búsqueda mejorada: pregunta original + reformulación,
//       30 candidatos por consulta, fusión (RRF), artículo exacto con letra si
//       se pide, sin derogados salvo que se pregunte, y reranker.
//   D · como C, pero el orden final combina el reranker (60 %) con la fusión
//       (40 %), y en preguntas de varios temas el mejor resultado de cada
//       subtema queda entre los 5 primeros.
// No escribe nada en Pinecone ni en Firestore. Solo admins. Las claves son
// los secretos de Firebase de siempre.
// =========================
import { onRequest } from 'firebase-functions/v2/https'
import * as logger from 'firebase-functions/logger'
import { Pinecone } from '@pinecone-database/pinecone'
import { initializeApp, getApps } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import { ORIGENES_PERMITIDOS, autorizar } from './seguridad'
import { GEMINI_API_KEY } from './geminiClient'
import {
  PINECONE_API_KEY, PINECONE_HOST, PINECONE_INDEX, SCORE_MINIMO_RELEVANCIA,
  type FragmentoResultado, type DecisionBusqueda,
  buscarEnPineconeInterno, dedupeFragmentos, esIndiceDelDocumento, tieneEncabezadoDeArticulo,
  tipoDocumentoEnPregunta, sufijoDeArticulo, decidirSiBuscar, numeroArticuloEnPregunta
} from './consultarLexit'
import { normaEnPregunta } from './especialidades'
import { NAMESPACES_PERMITIDOS } from './normasV2'

if (getApps().length === 0) initializeApp()

const MODELO_RERANK = 'bge-reranker-v2-m3'
const CANDIDATOS_C = 30

// =========================
// TIPOS
// =========================
interface Esperado { normaId: string; norma: string; numeroNorma: string; articulo: string }
interface Pregunta { id: string; pregunta: string; tipo?: string; area?: string; esperados: Esperado[] }
interface ArticuloRecuperado { normaId: string | null; norma: string; articulo: string | null; score: number }
interface ResultadoVariante {
  articulos: ArticuloRecuperado[]
  puestos: Array<number | null>
  hit1: boolean
  recall5: number
  recall8: number
  rr: number
  ms: number
  error?: string
}
interface NormaV2 { normaId: string; norma: string; numeroNorma: string; tipoNorma: string; area: string }

type Indice = ReturnType<Pinecone['index']>

// =========================
// UTILIDADES
// =========================
const plano = (t: string) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '')
const digitos = (t: string) => t.replace(/\D/g, '')
const claveDe = (normaId: string | null, articulo: string | null) => `${normaId ?? '?'}::${(articulo ?? '?').toUpperCase()}`

function validarPreguntas(valor: unknown): Pregunta[] | string {
  if (!Array.isArray(valor) || valor.length === 0 || valor.length > 60) return 'preguntas debe tener entre 1 y 60 elementos'
  const salida: Pregunta[] = []
  for (const p of valor as Array<Record<string, unknown>>) {
    if (!p || typeof p.id !== 'string' || typeof p.pregunta !== 'string' || !p.pregunta.trim() || p.pregunta.length > 500) return `pregunta inválida: ${JSON.stringify(p).slice(0, 80)}`
    if (!Array.isArray(p.esperados) || p.esperados.length === 0 || p.esperados.length > 10) return `esperados inválidos en ${p.id}`
    const esperados: Esperado[] = []
    for (const e of p.esperados as Array<Record<string, unknown>>) {
      if (!e || typeof e.normaId !== 'string' || typeof e.articulo !== 'string' || typeof e.norma !== 'string' || typeof e.numeroNorma !== 'string') return `esperado inválido en ${p.id}`
      esperados.push({ normaId: e.normaId, norma: e.norma, numeroNorma: e.numeroNorma, articulo: e.articulo })
    }
    salida.push({ id: p.id, pregunta: p.pregunta.trim(), ...(typeof p.tipo === 'string' ? { tipo: p.tipo } : {}), ...(typeof p.area === 'string' ? { area: p.area } : {}), esperados })
  }
  return salida
}

// Métricas sobre la lista de artículos (sin repetidos, en orden)
export function medir(articulos: ArticuloRecuperado[], esperados: Esperado[], ms: number): ResultadoVariante {
  const vistos = new Set<string>()
  const unicos = articulos.filter(a => {
    const k = claveDe(a.normaId, a.articulo)
    if (vistos.has(k)) return false
    vistos.add(k)
    return true
  })
  const claves = unicos.map(a => claveDe(a.normaId, a.articulo))
  const puestos = esperados.map(e => {
    const i = claves.indexOf(claveDe(e.normaId, e.articulo))
    return i === -1 ? null : i + 1
  })
  const dentro = (k: number) => puestos.filter(p => p !== null && p <= k).length / esperados.length
  const primero = Math.min(...puestos.map(p => p ?? Infinity))
  return {
    articulos: unicos.slice(0, 12),
    puestos,
    hit1: puestos.includes(1),
    recall5: dentro(5),
    recall8: dentro(8),
    rr: Number.isFinite(primero) ? 1 / primero : 0,
    ms
  }
}

// =========================
// A · PRODUCCIÓN (mismo flujo que consultarLexit, modo Consulta, sin historial
// ni especialidad). Se reproduce paso a paso para medirlo sin llamar a Gemini
// para la respuesta.
// =========================
async function recuperarProduccion(idx: Indice, pregunta: string, decision: DecisionBusqueda | undefined): Promise<FragmentoResultado[]> {
  if (decision?.buscar === false) return []
  const queryBusqueda = decision?.consultas?.[0] ?? pregunta
  const articuloPedido = numeroArticuloEnPregunta(pregunta)
  const tipoPedidoPorNombre = articuloPedido !== undefined ? tipoDocumentoEnPregunta(pregunta) : undefined
  const normaNombrada = !tipoPedidoPorNombre ? await normaEnPregunta(pregunta) : undefined
  const alcance = normaNombrada ? { documentoId: normaNombrada.documentoId } : {}
  const tipoPedido = normaNombrada ? undefined : tipoPedidoPorNombre
  const codigoDecidido = normaNombrada ? undefined : decision?.codigo

  let fragmentos: FragmentoResultado[]
  const subconsultas = decision?.consultas ?? []
  if (subconsultas.length > 1) {
    const listas = await Promise.all(subconsultas.map(c => buscarEnPineconeInterno(idx, c, 5, undefined, codigoDecidido, alcance)))
    const intercalados: FragmentoResultado[] = []
    for (let i = 0; i < Math.max(...listas.map(l => l.length)); i++) for (const l of listas) { const f = l[i]; if (f) intercalados.push(f) }
    fragmentos = dedupeFragmentos(intercalados)
  } else {
    const topK = articuloPedido === undefined ? 10 : 5
    fragmentos = dedupeFragmentos(await buscarEnPineconeInterno(idx, queryBusqueda, topK, articuloPedido, tipoPedido ?? codigoDecidido, alcance))
  }
  return postprocesarComoHoy(fragmentos, articuloPedido, subconsultas.length)
}

// Filtros que aplica consultarLexit después de buscar (modo Consulta)
function postprocesarComoHoy(entrada: FragmentoResultado[], articuloPedido: number | undefined, nSubconsultas: number): FragmentoResultado[] {
  let fragmentos = entrada.filter(f => !esIndiceDelDocumento(f.texto))
  if (articuloPedido === undefined) {
    const tope = nSubconsultas > 1 ? 8 : 5
    fragmentos = [
      ...fragmentos.filter(f => !f.esComentario && f.numeroArticulo !== undefined),
      ...fragmentos.filter(f => f.esComentario || f.numeroArticulo === undefined)
    ].slice(0, tope)
  }
  const vienenDelArticuloPedido = articuloPedido !== undefined && fragmentos.length > 0 && fragmentos.every(f => f.numeroArticulo === articuloPedido)
  fragmentos = vienenDelArticuloPedido
    ? fragmentos.filter(tieneEncabezadoDeArticulo)
    : fragmentos.filter(f => f.score >= SCORE_MINIMO_RELEVANCIA).map(f => {
      if (tieneEncabezadoDeArticulo(f)) return f
      const comentario: FragmentoResultado = { ...f, esComentario: true }
      delete comentario.numeroArticulo
      return comentario
    })
  return fragmentos.map(f => {
    const sufijo = sufijoDeArticulo(f)
    return { ...f, ...(sufijo ? { sufijoArticulo: sufijo } : {}) }
  })
}

// Base actual: a qué norma esperada corresponde un fragmento (por nombre o número)
export function normaIdEnProduccion(f: FragmentoResultado, esperados: Esperado[]): string | null {
  const nombre = plano(f.nombreDocumento)
  const nums = digitos(f.nombreDocumento)
  for (const e of esperados) {
    const n = plano(e.norma.replace(/^TUO de la /i, ''))
    const d = digitos(e.numeroNorma)
    // Un reglamento solo corresponde a un reglamento (su nombre incluye el de la ley)
    if (nombre.includes('reglamento') !== plano(e.norma).includes('reglamento')) continue
    if ((n.length >= 8 && nombre.length >= 8 && (nombre.includes(n) || n.includes(nombre))) || (d.length >= 4 && nums.includes(d))) return e.normaId
  }
  return null
}

// =========================
// B · ESQUEMA NUEVO CON LA BÚSQUEDA DE HOY
// Mismo algoritmo de buscarEnPineconeInterno; los filtros por "código"
// (tipoDocumento de la base actual) se traducen a normaId o área.
// =========================
const CODIGO_A_FILTRO: Record<string, Record<string, unknown>> = {
  constitucion: { normaId: { $eq: 'constitucion-1993' } },
  'codigo-civil': { normaId: { $eq: 'codigo-civil' } },
  'codigo-penal': { normaId: { $eq: 'codigo-penal' } },
  'codigo-laboral': { area: { $eq: 'derecho-laboral' } },
  'codigo-tributario': { area: { $eq: 'derecho-tributario' } }
}

const txt = (v: unknown): string => (typeof v === 'string' ? v : '')

function fragmentoDeHit(h: { _score?: number; fields?: Record<string, unknown> }): FragmentoResultado & { normaId: string; articulo: string } {
  const c = h.fields ?? {}
  return {
    texto: txt(c.text),
    nombreDocumento: txt(c.nombreDocumento) || txt(c.norma),
    tipoDocumento: txt(c.tipoDocumento),
    documentoId: txt(c.documentoId) || txt(c.normaId),
    indiceChunk: Number(c.indiceChunk ?? 0),
    score: h._score ?? 0,
    ...(typeof c.numeroArticulo === 'number' ? { numeroArticulo: c.numeroArticulo } : {}),
    esFuentePrimaria: true,
    ...(c.esComentario === true ? { esComentario: true } : {}),
    normaId: txt(c.normaId),
    articulo: txt(c.articulo)
  }
}

async function buscarV2(idx: Indice, consulta: string, topK: number, filtro: Record<string, unknown>) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const r: any = await idx.searchRecords({ query: { topK, inputs: { text: consulta }, ...(Object.keys(filtro).length ? { filter: filtro } : {}) } })
  return ((r?.result?.hits ?? []) as Array<{ _id?: string; _score?: number; fields?: Record<string, unknown> }>).map(h => ({ id: h._id ?? '', ...fragmentoDeHit(h) }))
}

async function buscarComoHoyV2(idx: Indice, consulta: string, topK: number, articulo: number | undefined, filtroCodigo: Record<string, unknown> | undefined, filtroAlcance: Record<string, unknown>) {
  const con = (extra: Record<string, unknown>) => ({ ...filtroAlcance, ...extra })
  if (articulo !== undefined) {
    const intentos = filtroCodigo ? [con({ ...filtroCodigo, numeroArticulo: { $eq: articulo } }), con({ numeroArticulo: { $eq: articulo } })] : [con({ numeroArticulo: { $eq: articulo } })]
    for (const f of intentos) {
      const r = await buscarV2(idx, consulta, 8, f)
      if (r.length) return r.sort((a, b) => a.documentoId.localeCompare(b.documentoId) || a.indiceChunk - b.indiceChunk)
    }
  }
  if (articulo === undefined && filtroCodigo) {
    const r = await buscarV2(idx, consulta, topK, con(filtroCodigo))
    if (r.length) return r
  }
  return buscarV2(idx, consulta, topK, con({}))
}

async function recuperarHoyEnV2(idx: Indice, pregunta: string, decision: DecisionBusqueda | undefined, normas: NormaV2[]) {
  if (decision?.buscar === false) return []
  const queryBusqueda = decision?.consultas?.[0] ?? pregunta
  const articuloPedido = numeroArticuloEnPregunta(pregunta)
  const tipoPedidoPorNombre = articuloPedido !== undefined ? tipoDocumentoEnPregunta(pregunta) : undefined
  const normaNombrada = !tipoPedidoPorNombre ? normaV2EnPregunta(pregunta, normas) : undefined
  const alcance = normaNombrada ? { normaId: { $eq: normaNombrada.normaId } } : {}
  const codigo = normaNombrada ? undefined : (tipoPedidoPorNombre ?? decision?.codigo)
  const filtroCodigo = codigo ? CODIGO_A_FILTRO[codigo] : undefined
  const subconsultas = decision?.consultas ?? []
  let fragmentos: Array<FragmentoResultado & { normaId: string; articulo: string }>
  if (subconsultas.length > 1) {
    const listas = await Promise.all(subconsultas.map(c => buscarComoHoyV2(idx, c, 5, undefined, filtroCodigo, alcance)))
    const intercalados: typeof fragmentos = []
    for (let i = 0; i < Math.max(...listas.map(l => l.length)); i++) for (const l of listas) { const f = l[i]; if (f) intercalados.push(f) }
    fragmentos = dedupeFragmentos(intercalados) as typeof fragmentos
  } else {
    fragmentos = dedupeFragmentos(await buscarComoHoyV2(idx, queryBusqueda, articuloPedido === undefined ? 10 : 5, articuloPedido, filtroCodigo, alcance)) as typeof fragmentos
  }
  const procesados = postprocesarComoHoy(fragmentos, articuloPedido, subconsultas.length) as typeof fragmentos
  return procesados
}

// Norma nombrada en la pregunta, entre las del namespace (por nombre o número)
export function normaV2EnPregunta(pregunta: string, normas: NormaV2[]): NormaV2 | undefined {
  const t = plano(pregunta)
  const nums = (pregunta.match(/\d{4,5}(?:-\d{2,4}(?:-[A-Z]{2,4})?)?/g) ?? []).map(digitos)
  const ALIAS: Record<string, string[]> = {
    'codigo-civil': ['codigocivil'], 'codigo-penal': ['codigopenal'], 'constitucion-1993': ['constitucion'],
    'tuo-ley-impuesto-renta': ['impuestoalarenta', 'leydelimpuestoalarenta', 'leydelir']
  }
  return normas.find(n => {
    const nombre = plano(n.norma.replace(/^TUO de la /i, ''))
    const d = digitos(n.numeroNorma)
    return (nombre.length >= 8 && t.includes(nombre)) || (ALIAS[n.normaId] ?? []).some(a => t.includes(a)) || (d.length >= 4 && n.tipoNorma === 'ley' && nums.includes(d))
  })
}

// =========================
// C · ESQUEMA NUEVO CON BÚSQUEDA MEJORADA
// =========================
// "artículo 14-A", "art. 108-C", "artículo 1351"
export function articuloConLetraEnPregunta(pregunta: string): string | undefined {
  const m = /\bart(?:[íi]culo|\.)\s*(\d{1,4})\s*[°º]?\s*(?:-\s*([A-Za-z])\b)?/i.exec(pregunta)
  return m?.[1] ? `${m[1]}${m[2] ? `-${m[2].toUpperCase()}` : ''}` : undefined
}

const PESO_RERANK_D = 0.6
const PUESTOS_GARANTIZADOS_D = 5

async function recuperarMejorado(pinecone: Pinecone, idx: Indice, pregunta: string, decision: DecisionBusqueda | undefined, normas: NormaV2[], modo: 'C' | 'D' = 'C') {
  if (decision?.buscar === false) return []
  const normaNombrada = normaV2EnPregunta(pregunta, normas)
  const articulo = articuloConLetraEnPregunta(pregunta)
  const preguntaDerogados = /derogad/i.test(pregunta)
  const base: Record<string, unknown> = { esComentario: { $eq: false }, ...(preguntaDerogados ? {} : { vigencia: { $ne: 'derogado' } }) }
  const filtroNorma = normaNombrada ? { normaId: { $eq: normaNombrada.normaId } } : {}

  // 1. Artículo pedido por número (con letra): directo y primero
  const exactos = articulo && normaNombrada
    ? await buscarV2(idx, pregunta, 10, { normaId: { $eq: normaNombrada.normaId }, articulo: { $eq: articulo } })
    : []

  // 2. Varias consultas (pregunta original + reformulaciones) y fusión por puesto (RRF)
  const consultas = [...new Set([pregunta, ...(decision?.consultas ?? [])])].slice(0, 5)
  const codigo = decision?.codigo ? CODIGO_A_FILTRO[decision.codigo] : undefined
  const listas = await Promise.all([
    ...consultas.map(c => buscarV2(idx, c, CANDIDATOS_C, { ...base, ...filtroNorma })),
    // Preferencia suave por el código que sugiere Gemini (no excluye el resto)
    ...(codigo && !normaNombrada ? [buscarV2(idx, decision?.consultas?.[0] ?? pregunta, CANDIDATOS_C, { ...base, ...codigo })] : [])
  ])
  const fusion = new Map<string, { hit: (typeof listas)[number][number]; rrf: number }>()
  for (const lista of listas) {
    lista.forEach((hit, i) => {
      const actual = fusion.get(hit.id) ?? { hit, rrf: 0 }
      actual.rrf += 1 / (60 + i + 1)
      fusion.set(hit.id, actual)
    })
  }
  const candidatos = [...fusion.values()].sort((a, b) => b.rrf - a.rrf).slice(0, 40).map(x => x.hit)

  // 3. Reranker contra la pregunta original
  let ordenados = candidatos
  if (candidatos.length > 1) {
    const r = await pinecone.inference.rerank({
      model: MODELO_RERANK, query: pregunta, documents: candidatos.map(c => c.texto),
      topN: modo === 'D' ? candidatos.length : Math.min(20, candidatos.length),
      returnDocuments: false, parameters: { truncate: 'END' }
    })
    if (modo === 'C') {
      ordenados = r.data.flatMap(d => {
        const c = candidatos[d.index]
        return c ? [{ ...c, score: d.score }] : []
      })
    } else {
      // D: combina reranker y fusión (el orden de la búsqueda sigue pesando)
      const rrfMax = Math.max(...candidatos.map(c => fusion.get(c.id)?.rrf ?? 0)) || 1
      ordenados = r.data.flatMap(d => {
        const c = candidatos[d.index]
        if (!c) return []
        const rrf = (fusion.get(c.id)?.rrf ?? 0) / rrfMax
        return [{ ...c, score: PESO_RERANK_D * d.score + (1 - PESO_RERANK_D) * rrf }]
      }).sort((a, b) => b.score - a.score)
      // Varios temas: el mejor de cada subtema entra entre los primeros
      // (reemplaza a los últimos de ese tramo que no son de ningún subtema)
      const subtemas = (decision?.consultas ?? []).filter(c => c !== pregunta)
      if (subtemas.length > 1) {
        const garantizados = subtemas
          .map(sub => listas[consultas.indexOf(sub)]?.[0])
          .filter((h): h is NonNullable<typeof h> => !!h)
          .filter((h, i, l) => l.findIndex(x => x.id === h.id) === i)
          .slice(0, PUESTOS_GARANTIZADOS_D)
        const ids = new Set(garantizados.map(g => g.id))
        const tramo = ordenados.slice(0, PUESTOS_GARANTIZADOS_D)
        const faltan = garantizados.filter(g => !tramo.some(t => t.id === g.id))
        if (faltan.length) {
          const libres = tramo.filter(t => !ids.has(t.id)).slice(0, PUESTOS_GARANTIZADOS_D - garantizados.length)
          const nuevoTramo = [...tramo.filter(t => ids.has(t.id) || libres.includes(t)), ...faltan.map(f => ordenados.find(o => o.id === f.id) ?? { ...f, score: 0 })]
          const resto = ordenados.filter(o => !nuevoTramo.some(n => n.id === o.id))
          ordenados = [...nuevoTramo, ...resto]
        }
      }
    }
  }
  return [...exactos.map(e => ({ ...e, score: 1 })), ...ordenados]
}

// =========================
// FUNCIÓN
// =========================
export const evaluarRecuperacion = onRequest(
  { cors: ORIGENES_PERMITIDOS, secrets: [PINECONE_API_KEY, GEMINI_API_KEY], timeoutSeconds: 540, memory: '1GiB' },
  async (req, res) => {
    if (req.method !== 'POST') {
      res.status(405).send('Method not allowed')
      return
    }
    const uid = await autorizar(req, res, { soloAdmin: true })
    if (!uid) return

    const body = (req.body ?? {}) as { preguntas?: unknown; namespace?: unknown }
    const preguntas = validarPreguntas(body.preguntas)
    if (typeof preguntas === 'string') {
      res.status(400).json({ error: preguntas })
      return
    }
    const namespace = typeof body.namespace === 'string' && (NAMESPACES_PERMITIDOS as readonly string[]).includes(body.namespace) ? body.namespace : NAMESPACES_PERMITIDOS[0]
    logger.info(`🧪 Evaluación de recuperación (${preguntas.length} preguntas, ${namespace}) solicitada por admin ${uid}`)
    const inicio = Date.now()

    try {
      const pinecone = new Pinecone({ apiKey: PINECONE_API_KEY.value() })
      const produccion = pinecone.index(PINECONE_INDEX, PINECONE_HOST)
      const v2 = produccion.namespace(namespace)

      // Normas cargadas en el namespace (para reconocer la norma nombrada)
      const snap = await getFirestore().collection('normas_v2').where('namespace', '==', namespace).get()
      const normas: NormaV2[] = snap.docs.map(d => d.data()).map(d => ({
        normaId: String(d.normaId ?? ''), norma: String(d.norma ?? ''), numeroNorma: String(d.numeroNorma ?? ''), tipoNorma: String(d.tipoNorma ?? ''), area: String(d.area ?? '')
      }))

      const resultados: Array<{
        id: string; pregunta: string; tipo: string; esperados: Esperado[]
        reformulacion: { buscar: boolean; consultas: string[]; codigo: string | null } | null
        A: ResultadoVariante; B: ResultadoVariante; C: ResultadoVariante; D: ResultadoVariante
      }> = []
      for (const p of preguntas) {
        // La reformulación de Gemini se calcula una vez y se usa en las tres variantes
        let decision: DecisionBusqueda | undefined
        try {
          decision = numeroArticuloEnPregunta(p.pregunta) === undefined ? await decidirSiBuscar(p.pregunta, '') : undefined
        } catch (err) {
          logger.warn(`decidirSiBuscar falló en ${p.id}: ${(err as Error).message}`)
        }

        const correr = async (fn: () => Promise<ArticuloRecuperado[]>): Promise<ResultadoVariante> => {
          const t0 = Date.now()
          try {
            return medir(await fn(), p.esperados, Date.now() - t0)
          } catch (err) {
            return { ...medir([], p.esperados, Date.now() - t0), error: (err as Error).message }
          }
        }

        const A = await correr(async () => (await recuperarProduccion(produccion, p.pregunta, decision)).map(f => ({
          normaId: normaIdEnProduccion(f, p.esperados),
          norma: f.nombreDocumento,
          articulo: f.esComentario || f.numeroArticulo === undefined ? null : `${f.numeroArticulo}${f.sufijoArticulo ? `-${f.sufijoArticulo}` : ''}`,
          score: f.score
        })))
        const B = await correr(async () => (await recuperarHoyEnV2(v2, p.pregunta, decision, normas)).map(f => ({
          normaId: f.normaId || null, norma: f.nombreDocumento, articulo: f.esComentario ? null : (f.articulo || null), score: f.score
        })))
        const C = await correr(async () => (await recuperarMejorado(pinecone, v2, p.pregunta, decision, normas)).slice(0, 40).map(f => ({
          normaId: f.normaId || null, norma: f.nombreDocumento, articulo: f.articulo || null, score: f.score
        })))
        const D = await correr(async () => (await recuperarMejorado(pinecone, v2, p.pregunta, decision, normas, 'D')).slice(0, 40).map(f => ({
          normaId: f.normaId || null, norma: f.nombreDocumento, articulo: f.articulo || null, score: f.score
        })))

        resultados.push({
          id: p.id, pregunta: p.pregunta, tipo: p.tipo ?? '', esperados: p.esperados,
          reformulacion: decision ? { buscar: decision.buscar, consultas: decision.consultas ?? [], codigo: decision.codigo ?? null } : null,
          A, B, C, D
        })
      }

      // Resumen por variante
      const resumen = (['A', 'B', 'C', 'D'] as const).map(v => {
        const rs = resultados.map(r => r[v])
        const prom = (f: (x: ResultadoVariante) => number) => Number((rs.reduce((s, x) => s + f(x), 0) / rs.length).toFixed(3))
        return {
          variante: v,
          acierto1: prom(x => (x.hit1 ? 1 : 0)),
          cobertura5: prom(x => x.recall5),
          cobertura8: prom(x => x.recall8),
          mrr: prom(x => x.rr),
          sinResultados: rs.filter(x => x.articulos.length === 0).length,
          errores: rs.filter(x => x.error).length,
          msPromedio: Math.round(rs.reduce((s, x) => s + x.ms, 0) / rs.length)
        }
      })

      // Preguntas donde D empeora respecto de A
      const dPeorQueA = resultados.filter(r => r.D.recall8 < r.A.recall8 || (r.D.recall8 === r.A.recall8 && r.D.rr < r.A.rr)).map(r => ({
        id: r.id, pregunta: r.pregunta, A: { puestos: r.A.puestos, cobertura8: r.A.recall8 }, D: { puestos: r.D.puestos, cobertura8: r.D.recall8 }
      }))

      // Preguntas donde C empeora respecto de A (peor cobertura@8 o peor primer puesto)
      const cPeorQueA = resultados.filter(r => r.C.recall8 < r.A.recall8 || (r.C.recall8 === r.A.recall8 && r.C.rr < r.A.rr)).map(r => ({
        id: r.id, pregunta: r.pregunta, A: { puestos: r.A.puestos, cobertura8: r.A.recall8 }, C: { puestos: r.C.puestos, cobertura8: r.C.recall8 }
      }))

      res.json({
        generadoEn: new Date().toISOString(),
        segundos: Math.round((Date.now() - inicio) / 1000),
        soloLectura: true,
        namespace,
        normasEnNamespace: normas.map(n => n.normaId),
        variantes: {
          A: 'Producción: flujo actual de Consultas sobre la base actual (__default__)',
          B: `Esquema nuevo (${namespace}) con la búsqueda de hoy`,
          C: `Esquema nuevo (${namespace}) con búsqueda mejorada: pregunta + reformulación, ${CANDIDATOS_C} candidatos por consulta, fusión RRF, artículo exacto con letra, sin derogados y reranker ${MODELO_RERANK}`,
          D: `Como C, con orden final ${Math.round(PESO_RERANK_D * 100)} % reranker + ${Math.round((1 - PESO_RERANK_D) * 100)} % fusión, y el mejor de cada subtema entre los ${PUESTOS_GARANTIZADOS_D} primeros`
        },
        resumen,
        cPeorQueA,
        dPeorQueA,
        resultados
      })
    } catch (err) {
      logger.error('❌ Error en evaluarRecuperacion:', (err as Error).message)
      res.status(500).json({ error: (err as Error).message })
    }
  }
)
