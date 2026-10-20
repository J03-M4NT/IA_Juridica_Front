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
//   E · D sin reranker (solo la fusión): mide cuánto se pierde si se agota
//       la cuota mensual del reranker.
// No escribe nada en Pinecone ni en Firestore. Solo admins. Las claves son
// los secretos de Firebase de siempre.
// =========================
import { onRequest } from 'firebase-functions/v2/https'
import * as logger from 'firebase-functions/logger'
import { Pinecone } from '@pinecone-database/pinecone'
import { initializeApp, getApps } from 'firebase-admin/app'
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
import { type IndiceId, INDICE_POR_DEFECTO, abrirIndice, esIndiceId } from './indicesPinecone'
import {
  type Indice, type NormaV2, MODELO_RERANK, CANDIDATOS_C, PESO_RERANK_D, PUESTOS_GARANTIZADOS_D,
  plano, digitos, CODIGO_A_FILTRO, buscarV2, normaV2EnPregunta, recuperarMejorado, cargarNormasV2
} from './busquedaV2'

if (getApps().length === 0) initializeApp()


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


// =========================
// UTILIDADES
// =========================
const claveDe = (normaId: string | null, articulo: string | null) => `${normaId ?? '?'}::${(articulo ?? '?').toUpperCase()}`

function validarPreguntas(valor: unknown): Pregunta[] | string {
  if (!Array.isArray(valor) || valor.length === 0 || valor.length > 60) return 'preguntas debe tener entre 1 y 60 elementos'
  const salida: Pregunta[] = []
  for (const p of valor as Array<Record<string, unknown>>) {
    if (!p || typeof p.id !== 'string' || typeof p.pregunta !== 'string' || !p.pregunta.trim() || p.pregunta.length > 500) return `pregunta inválida: ${JSON.stringify(p).slice(0, 80)}`
    // "sin-base": temas que no están en las normas cargadas (para calibrar el umbral)
    const sinBase = p.tipo === 'sin-base'
    if (!Array.isArray(p.esperados) || (!sinBase && p.esperados.length === 0) || p.esperados.length > 10) return `esperados inválidos en ${p.id}`
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
  const dentro = (k: number) => (esperados.length ? puestos.filter(p => p !== null && p <= k).length / esperados.length : 0)
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

    const body = (req.body ?? {}) as { preguntas?: unknown; namespace?: unknown; indice?: unknown; variantes?: unknown; modo?: unknown }
    const preguntas = validarPreguntas(body.preguntas)
    if (typeof preguntas === 'string') {
      res.status(400).json({ error: preguntas })
      return
    }
    const namespace = typeof body.namespace === 'string' && (NAMESPACES_PERMITIDOS as readonly string[]).includes(body.namespace) ? body.namespace : NAMESPACES_PERMITIDOS[0]
    const indiceId: IndiceId = esIndiceId(body.indice) ? body.indice : INDICE_POR_DEFECTO
    // Variantes a correr (cada C/D gasta un uso del reranker por pregunta)
    const TODAS = ['A', 'B', 'C', 'D', 'E'] as const
    type Variante = typeof TODAS[number]
    const variantes = new Set<Variante>(Array.isArray(body.variantes) ? TODAS.filter(v => (body.variantes as unknown[]).includes(v)) : TODAS)
    logger.info(`🧪 Evaluación (${body.modo === 'citas' ? 'citas' : 'recuperación'}, ${preguntas.length} preguntas, ${indiceId}/${namespace}) solicitada por admin ${uid}`)
    const inicio = Date.now()

    // Precisión de citas: respuesta completa de Consultas con el índice de prueba
    if (body.modo === 'citas') {
      try {
        res.json({ generadoEn: new Date().toISOString(), indice: indiceId, namespace, ...(await evaluarCitas(req.headers.authorization ?? '', preguntas, indiceId, namespace)), segundos: Math.round((Date.now() - inicio) / 1000) })
      } catch (err) {
        logger.error('❌ Error evaluando citas:', (err as Error).message)
        res.status(500).json({ error: (err as Error).message })
      }
      return
    }

    try {
      const pinecone = new Pinecone({ apiKey: PINECONE_API_KEY.value() })
      const produccion = pinecone.index(PINECONE_INDEX, PINECONE_HOST)
      const v2 = (await abrirIndice(pinecone, indiceId)).namespace(namespace)

      // Normas cargadas en el namespace (para reconocer la norma nombrada)
      const normas: NormaV2[] = await cargarNormasV2(namespace, indiceId)

      const resultados: Array<{
        id: string; pregunta: string; tipo: string; esperados: Esperado[]
        reformulacion: { buscar: boolean; consultas: string[]; codigo: string | null } | null
        A: ResultadoVariante; B: ResultadoVariante; C: ResultadoVariante; D: ResultadoVariante; E: ResultadoVariante
        confianzaD: { rerank: number | null; denso: number } | null
        confianzaE: { denso: number } | null
      }> = []
      for (const p of preguntas) {
        // La reformulación de Gemini se calcula una vez y se usa en las tres variantes
        let decision: DecisionBusqueda | undefined
        try {
          decision = numeroArticuloEnPregunta(p.pregunta) === undefined ? await decidirSiBuscar(p.pregunta, '') : undefined
        } catch (err) {
          logger.warn(`decidirSiBuscar falló en ${p.id}: ${(err as Error).message}`)
        }

        const correr = async (fn: () => Promise<ArticuloRecuperado[]>, variante?: Variante): Promise<ResultadoVariante> => {
          if (variante && !variantes.has(variante)) return { ...medir([], p.esperados, 0), error: 'no evaluada' }
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
        })), 'A')
        const B = await correr(async () => (await recuperarHoyEnV2(v2, p.pregunta, decision, normas)).map(f => ({
          normaId: f.normaId || null, norma: f.nombreDocumento, articulo: f.esComentario ? null : (f.articulo || null), score: f.score
        })), 'B')
        const C = await correr(async () => (await recuperarMejorado(pinecone, v2, p.pregunta, decision, normas)).slice(0, 40).map(f => ({
          normaId: f.normaId || null, norma: f.nombreDocumento, articulo: f.articulo || null, score: f.score
        })), 'C')
        let confianzaD: { rerank: number | null; denso: number } | null = null
        const D = await correr(async () => {
          const hits = await recuperarMejorado(pinecone, v2, p.pregunta, decision, normas, 'D')
          const conRerank = hits.filter(h => h.rerank !== undefined && h.rerank < 1)
          confianzaD = { rerank: conRerank.length ? Math.max(...conRerank.map(h => h.rerank ?? 0)) : null, denso: hits.length ? Math.max(...hits.map(h => h.denso)) : 0 }
          return hits.slice(0, 40).map(f => ({ normaId: f.normaId || null, norma: f.nombreDocumento, articulo: f.articulo || null, score: f.score }))
        }, 'D')
        let confianzaE: { denso: number } | null = null
        const E = await correr(async () => {
          const hits = await recuperarMejorado(pinecone, v2, p.pregunta, decision, normas, 'E')
          confianzaE = { denso: hits.length ? Math.max(...hits.map(h => h.denso)) : 0 }
          return hits.slice(0, 40).map(f => ({ normaId: f.normaId || null, norma: f.nombreDocumento, articulo: f.articulo || null, score: f.score }))
        }, 'E')

        resultados.push({
          id: p.id, pregunta: p.pregunta, tipo: p.tipo ?? '', esperados: p.esperados,
          reformulacion: decision ? { buscar: decision.buscar, consultas: decision.consultas ?? [], codigo: decision.codigo ?? null } : null,
          A, B, C, D, E, confianzaD, confianzaE
        })
      }

      // Resumen por variante
      const conEsperados = resultados.filter(r => r.esperados.length > 0)
      const resumen = TODAS.filter(v => variantes.has(v)).map(v => {
        const rs = conEsperados.map(r => r[v])
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

      // Calibración del umbral de confianza (D): el valor que mejor separa las
      // preguntas cuya respuesta está en la base (y se encontró) de las "sin base"
      const calibrar = (valor: (r: typeof resultados[number]) => number | null) => {
        const positivos = conEsperados.filter(r => r.D.recall8 > 0).map(valor).filter((x): x is number => x !== null)
        const negativos = resultados.filter(r => r.esperados.length === 0).map(valor).filter((x): x is number => x !== null)
        if (!positivos.length || !negativos.length) return { positivos, negativos, recomendado: null, aciertos: null }
        const candidatos = [...new Set([...positivos, ...negativos])].sort((a, b) => a - b)
        let mejor = { umbral: 0, aciertos: -1 }
        for (const t of candidatos) {
          const aciertos = positivos.filter(x => x >= t).length + negativos.filter(x => x < t).length
          if (aciertos > mejor.aciertos) mejor = { umbral: t, aciertos }
        }
        return { positivos, negativos, recomendado: Number(mejor.umbral.toFixed(3)), aciertos: `${mejor.aciertos} de ${positivos.length + negativos.length}` }
      }
      const calibracion = variantes.has('D')
        ? { rerank: calibrar(r => r.confianzaD?.rerank ?? null), denso: calibrar(r => r.confianzaD?.denso ?? null) }
        : null

      // Preguntas donde D empeora respecto de A
      const dPeorQueA = conEsperados.filter(r => r.D.recall8 < r.A.recall8 || (r.D.recall8 === r.A.recall8 && r.D.rr < r.A.rr)).map(r => ({
        id: r.id, pregunta: r.pregunta, A: { puestos: r.A.puestos, cobertura8: r.A.recall8 }, D: { puestos: r.D.puestos, cobertura8: r.D.recall8 }
      }))

      // Preguntas donde C empeora respecto de A (peor cobertura@8 o peor primer puesto)
      const cPeorQueA = conEsperados.filter(r => r.C.recall8 < r.A.recall8 || (r.C.recall8 === r.A.recall8 && r.C.rr < r.A.rr)).map(r => ({
        id: r.id, pregunta: r.pregunta, A: { puestos: r.A.puestos, cobertura8: r.A.recall8 }, C: { puestos: r.C.puestos, cobertura8: r.C.recall8 }
      }))

      res.json({
        generadoEn: new Date().toISOString(),
        segundos: Math.round((Date.now() - inicio) / 1000),
        soloLectura: true,
        namespace,
        indice: indiceId,
        normasEnNamespace: normas.map(n => n.normaId),
        calibracion,
        variantes: {
          A: 'Producción: flujo actual de Consultas sobre la base actual (__default__)',
          B: `Esquema nuevo (${namespace}) con la búsqueda de hoy`,
          C: `Esquema nuevo (${namespace}) con búsqueda mejorada: pregunta + reformulación, ${CANDIDATOS_C} candidatos por consulta, fusión RRF, artículo exacto con letra, sin derogados y reranker ${MODELO_RERANK}`,
          E: 'Como D, sin reranker (solo la fusión de resultados)',
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

// =========================
// PRECISIÓN DE CITAS: respuesta completa de Consultas (con el índice de
// prueba, solo admins) y revisión de sus citas:
//   - citas correctas: fuentes citadas [n] que son artículos esperados;
//   - menciones no verificadas: "artículo N" marcado como no verificado;
//   - en preguntas "sin base", si la respuesta lo reconoce (aviso).
// Cada pregunta usa una consulta del cupo diario del admin.
// =========================
async function evaluarCitas(autorizacion: string, preguntas: Pregunta[], indice: IndiceId, namespace: string) {
  const proyecto = process.env.GCLOUD_PROJECT ?? 'lexit-ai'
  const url = `https://us-central1-${proyecto}.cloudfunctions.net/consultarLexit`
  const preguntar = async (p: Pregunta) => {
    const t0 = Date.now()
    const r = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: autorizacion },
      body: JSON.stringify({ pregunta: p.pregunta, historialMensajes: [], busquedaPrueba: { indice, namespace } })
    })
    const data = await r.json().catch(() => ({})) as { respuesta?: string; fragmentos?: Array<{ documentoId?: string; numeroArticulo?: number; sufijoArticulo?: string; nombreDocumento?: string; vigencia?: string }>; error?: string }
    if (!r.ok) throw new Error(data.error ?? `HTTP ${r.status}`)
    const respuesta = data.respuesta ?? ''
    const citadas = (data.fragmentos ?? []).map(f => ({
      clave: `${f.documentoId ?? '?'}::${f.numeroArticulo ?? '?'}${f.sufijoArticulo ? `-${f.sufijoArticulo}` : ''}`.toUpperCase(),
      etiqueta: `${f.nombreDocumento ?? ''} ${f.numeroArticulo ?? ''}${f.sufijoArticulo ? `-${f.sufijoArticulo}` : ''}${f.vigencia ? ` (${f.vigencia})` : ''}`.trim()
    }))
    const esperadas = new Set(p.esperados.map(e => `${e.normaId}::${e.articulo}`.toUpperCase()))
    return {
      id: p.id, pregunta: p.pregunta, tipo: p.tipo ?? '',
      esperados: p.esperados.map(e => `${e.norma} ${e.articulo}`),
      citas: citadas.map(c => c.etiqueta),
      citasCorrectas: citadas.filter(c => esperadas.has(c.clave)).length,
      citasTotales: citadas.length,
      citaAlgunEsperado: citadas.some(c => esperadas.has(c.clave)),
      noVerificadas: (respuesta.match(/\(no verificado en la base de LexIT\)/g) ?? []).length,
      avisoSinBase: /Respuesta orientativa\./.test(respuesta),
      ms: Date.now() - t0,
      respuesta
    }
  }
  const resultados: Array<Awaited<ReturnType<typeof preguntar>> | { id: string; pregunta: string; error: string }> = []
  // De a 4 en paralelo
  for (let i = 0; i < preguntas.length; i += 4) {
    const lote = await Promise.all(preguntas.slice(i, i + 4).map(p => preguntar(p).catch((err: unknown) => ({ id: p.id, pregunta: p.pregunta, error: (err as Error).message }))))
    resultados.push(...lote)
  }
  const ok = resultados.filter((r): r is Awaited<ReturnType<typeof preguntar>> => !('error' in r))
  const conEsperados = ok.filter(r => r.esperados.length > 0)
  const sinBase = ok.filter(r => r.esperados.length === 0)
  const totales = conEsperados.reduce((s, r) => s + r.citasTotales, 0)
  return {
    resumenCitas: {
      precisionCitas: totales ? Number((conEsperados.reduce((s, r) => s + r.citasCorrectas, 0) / totales).toFixed(3)) : null,
      preguntasQueCitanUnEsperado: `${conEsperados.filter(r => r.citaAlgunEsperado).length} de ${conEsperados.length}`,
      mencionesNoVerificadas: ok.reduce((s, r) => s + r.noVerificadas, 0),
      sinBaseReconocidas: `${sinBase.filter(r => r.avisoSinBase || r.citasTotales === 0).length} de ${sinBase.length}`,
      errores: resultados.length - ok.length,
      msPromedio: ok.length ? Math.round(ok.reduce((s, r) => s + r.ms, 0) / ok.length) : 0
    },
    resultadosCitas: resultados
  }
}
