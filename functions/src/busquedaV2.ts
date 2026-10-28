// =========================
// BÚSQUEDA v2 (mejora de Consultas, fase 4)
// La búsqueda "D" evaluada en la fase 3, compartida por la evaluación
// (evaluacion.ts) y por Consultas (consultarLexit.ts), para que lo que se
// midió sea exactamente lo que llega a producción:
//   1. artículo pedido por número (con letra) → directo y primero;
//   2. pregunta original + reformulaciones de Gemini, 30 candidatos cada una,
//      sin derogados (salvo que se pregunte) y sin comentarios;
//   3. fusión por puesto (RRF) y reranker bge-reranker-v2-m3;
//   4. orden final: 60 % reranker + 40 % fusión, y en preguntas de varios
//      temas el mejor resultado de cada subtema entre los 5 primeros.
// =========================
import type { Pinecone } from '@pinecone-database/pinecone'
import { getFirestore } from 'firebase-admin/firestore'
import * as logger from 'firebase-functions/logger'
import type { FragmentoResultado, DecisionBusqueda } from './consultarLexit'
import { type IndiceId, INDICE_POR_DEFECTO } from './indicesPinecone'
import { quedaRerank, contarRerank } from './cuotaPinecone'

export type Indice = ReturnType<Pinecone['index']>

export interface NormaV2 { normaId: string; norma: string; numeroNorma: string; tipoNorma: string; area: string }

export const MODELO_RERANK = 'bge-reranker-v2-m3'
export const CANDIDATOS_C = 30
export const PESO_RERANK_D = 0.6
export const PUESTOS_GARANTIZADOS_D = 5

export const plano = (t: string) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '')
export const digitos = (t: string) => t.replace(/\D/g, '')
const txt = (v: unknown): string => (typeof v === 'string' ? v : '')

// "Código" que sugiere Gemini (valores de la base actual) → filtro del esquema nuevo
export const CODIGO_A_FILTRO: Record<string, Record<string, unknown>> = {
  constitucion: { normaId: { $eq: 'constitucion-1993' } },
  'codigo-civil': { normaId: { $eq: 'codigo-civil' } },
  'codigo-penal': { normaId: { $eq: 'codigo-penal' } },
  'codigo-laboral': { area: { $eq: 'derecho-laboral' } },
  'codigo-tributario': { area: { $eq: 'derecho-tributario' } }
}

export type HitV2 = FragmentoResultado & {
  id: string; normaId: string; articulo: string; parte: number; totalPartes: number; tituloArticulo: string; norma: string
  numeroNorma: string; vigenciaArticulo: string; vigenciaOrigen: string
  // Similitud de la búsqueda y puntaje del reranker (para el umbral de confianza)
  denso: number; rerank?: number
}

function fragmentoDeHit(h: { _id?: string; _score?: number; fields?: Record<string, unknown> }): HitV2 {
  const c = h.fields ?? {}
  return {
    id: h._id ?? '',
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
    articulo: txt(c.articulo),
    parte: Number(c.parte ?? 1),
    totalPartes: Number(c.totalPartes ?? 1),
    tituloArticulo: txt(c.tituloArticulo),
    norma: txt(c.norma),
    numeroNorma: txt(c.numeroNorma),
    vigenciaArticulo: txt(c.vigencia),
    vigenciaOrigen: txt(c.vigenciaOrigen),
    denso: h._score ?? 0
  }
}

export async function buscarV2(idx: Indice, consulta: string, topK: number, filtro: Record<string, unknown>): Promise<HitV2[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const r: any = await idx.searchRecords({ query: { topK, inputs: { text: consulta }, ...(Object.keys(filtro).length ? { filter: filtro } : {}) } })
  return ((r?.result?.hits ?? []) as Array<{ _id?: string; _score?: number; fields?: Record<string, unknown> }>).map(fragmentoDeHit)
}

// =========================
// NORMAS DEL NAMESPACE (Firestore normas_v2), con caché de 5 minutos
// =========================
const cacheNormas = new Map<string, { leidoEn: number; normas: NormaV2[] }>()
export async function cargarNormasV2(namespace: string, indice: IndiceId = INDICE_POR_DEFECTO): Promise<NormaV2[]> {
  const clave = `${indice}::${namespace}`
  const enCache = cacheNormas.get(clave)
  if (enCache && Date.now() - enCache.leidoEn < 5 * 60 * 1000) return enCache.normas
  const snap = await getFirestore().collection('normas_v2').where('namespace', '==', namespace).get()
  // Los documentos sin "indice" son del índice de siempre
  const normas = snap.docs.map(d => d.data()).filter(d => (d.indice ?? INDICE_POR_DEFECTO) === indice).map(d => ({
    normaId: txt(d.normaId), norma: txt(d.norma), numeroNorma: txt(d.numeroNorma), tipoNorma: txt(d.tipoNorma), area: txt(d.area)
  }))
  cacheNormas.set(clave, { leidoEn: Date.now(), normas })
  return normas
}

// Norma nombrada en la pregunta, entre las del namespace (por nombre, alias o número)
const ALIAS: Record<string, string[]> = {
  'codigo-civil': ['codigocivil'],
  'codigo-penal': ['codigopenal'],
  'constitucion-1993': ['constitucion'],
  'codigo-procesal-civil': ['codigoprocesalcivil'],
  'codigo-procesal-penal': ['codigoprocesalpenal', 'ncpp'],
  'tuo-ley-impuesto-renta': ['impuestoalarenta', 'leydelimpuestoalarenta', 'leydelir'],
  'tuo-ley-igv-isc': ['impuestogeneralalasventas', 'leydeligv']
}
export function normaV2EnPregunta(pregunta: string, normas: NormaV2[]): NormaV2 | undefined {
  const t = plano(pregunta)
  // Números de norma (no los de artículo: "artículo 140" no es el "D. Leg. 140")
  const sinArticulos = pregunta.replace(/\bart(?:[íi]culos?|s?\.)\s*\d+(?:\s*-\s*[A-Za-z]\b)?/gi, ' ')
  const nums = (sinArticulos.match(/\d{3,5}(?:-\d{2,4}(?:-[A-Z]{2,4})?)?/g) ?? []).map(digitos)
  // El nombre más largo primero: "Código Procesal Civil" antes que "Código Civil"
  const ordenadas = [...normas].sort((a, b) => b.norma.length - a.norma.length)
  return ordenadas.find(n => {
    const nombre = plano(n.norma.replace(/^TUO de la /i, ''))
    const d = digitos(n.numeroNorma)
    return (nombre.length >= 8 && t.includes(nombre)) ||
      (ALIAS[n.normaId] ?? []).some(a => t.includes(a)) ||
      (d.length >= 3 && ['ley', 'decreto-legislativo', 'decreto-ley'].includes(n.tipoNorma) && nums.includes(d))
  })
}

// "artículo 14-A", "art. 108-C", "artículo 1351"
export function articuloConLetraEnPregunta(pregunta: string): string | undefined {
  const m = /\bart(?:[íi]culo|\.)\s*(\d{1,4})\s*[°º]?\s*(?:-\s*([A-Za-z])\b)?/i.exec(pregunta)
  return m?.[1] ? `${m[1]}${m[2] ? `-${m[2].toUpperCase()}` : ''}` : undefined
}

export interface OpcionesBusqueda {
  // Filtro adicional (por ejemplo, la especialidad elegida en Consultas)
  filtroExtra?: Record<string, unknown>
  // Texto de búsqueda en lugar de la pregunta (seguimientos: "anterior + actual")
  consultaBase?: string
}

// =========================
// BÚSQUEDA C / D
// =========================
export async function recuperarMejorado(
  pinecone: Pinecone,
  idx: Indice,
  pregunta: string,
  decision: DecisionBusqueda | undefined,
  normas: NormaV2[],
  modo: 'C' | 'D' | 'E' = 'C',
  opciones: OpcionesBusqueda = {}
): Promise<HitV2[]> {
  if (decision?.buscar === false) return []
  const consultaBase = opciones.consultaBase ?? pregunta
  const extra = opciones.filtroExtra ?? {}
  const normaNombrada = normaV2EnPregunta(consultaBase, normas)
  const articulo = articuloConLetraEnPregunta(pregunta)
  const preguntaDerogados = /derogad/i.test(pregunta)
  const base: Record<string, unknown> = { esComentario: { $eq: false }, ...(preguntaDerogados ? {} : { vigencia: { $ne: 'derogado' } }), ...extra }
  const filtroNorma = normaNombrada ? { normaId: { $eq: normaNombrada.normaId } } : {}

  // 1. Artículo pedido por número (con letra): directo y primero. Sin norma
  // nombrada se busca ese número en todas (la similitud decide cuál).
  const exactos = articulo
    ? await buscarV2(idx, consultaBase, normaNombrada ? 10 : 6, { ...extra, ...filtroNorma, articulo: { $eq: articulo } })
    : []

  // 2. Varias consultas (pregunta + reformulaciones) y fusión por puesto (RRF)
  const consultas = [...new Set([consultaBase, ...(decision?.consultas ?? [])])].slice(0, 5)
  const codigo = decision?.codigo ? CODIGO_A_FILTRO[decision.codigo] : undefined
  const listas = await Promise.all([
    ...consultas.map(c => buscarV2(idx, c, CANDIDATOS_C, { ...base, ...filtroNorma })),
    // Preferencia suave por el código que sugiere Gemini (no excluye el resto)
    ...(codigo && !normaNombrada ? [buscarV2(idx, decision?.consultas?.[0] ?? consultaBase, CANDIDATOS_C, { ...base, ...codigo })] : [])
  ])
  const fusion = new Map<string, { hit: HitV2; rrf: number }>()
  for (const lista of listas) {
    lista.forEach((hit, i) => {
      const actual = fusion.get(hit.id) ?? { hit, rrf: 0 }
      actual.rrf += 1 / (60 + i + 1)
      fusion.set(hit.id, actual)
    })
  }
  const candidatos = [...fusion.values()].sort((a, b) => b.rrf - a.rrf).slice(0, 40).map(x => x.hit)

  // 3. Reranker contra la pregunta. Si falla (por ejemplo, se agotó la cuota
  // mensual del reranker), se sigue con el orden de la fusión: la búsqueda
  // nueva no se abandona por eso. El modo 'E' no usa reranker (para medirlo).
  // Tampoco se usa al llegar al tope mensual (cuotaPinecone.ts).
  let puntajes: Array<{ index: number; score: number }> | null = null
  if (candidatos.length > 1 && modo !== 'E' && await quedaRerank()) {
    try {
      const r = await pinecone.inference.rerank({
        model: MODELO_RERANK, query: consultaBase, documents: candidatos.map(c => c.texto),
        topN: modo === 'C' ? Math.min(20, candidatos.length) : candidatos.length,
        returnDocuments: false, parameters: { truncate: 'END' }
      })
      puntajes = r.data.map(d => ({ index: d.index, score: d.score }))
      contarRerank()
    } catch (err) {
      logger.warn(`⚠️ Reranker no disponible, se usa el orden de la fusión: ${(err as Error).message.slice(0, 200)}`)
    }
  }

  let ordenados = candidatos
  if (modo === 'C' && puntajes) {
    ordenados = puntajes.flatMap(d => {
      const c = candidatos[d.index]
      return c ? [{ ...c, rerank: d.score, score: d.score }] : []
    })
  } else if (candidatos.length > 1) {
    // D: combina reranker y fusión (el orden de la búsqueda sigue pesando).
    // Sin reranker (modo E o si falló): solo la fusión.
    const rrfMax = Math.max(...candidatos.map(c => fusion.get(c.id)?.rrf ?? 0)) || 1
    const rrfDe = (c: HitV2) => (fusion.get(c.id)?.rrf ?? 0) / rrfMax
    ordenados = puntajes
      ? puntajes.flatMap(d => {
        const c = candidatos[d.index]
        return c ? [{ ...c, rerank: d.score, score: PESO_RERANK_D * d.score + (1 - PESO_RERANK_D) * rrfDe(c) }] : []
      }).sort((a, b) => b.score - a.score)
      : candidatos.map(c => ({ ...c, score: rrfDe(c) }))
    // Varios temas: el mejor de cada subtema entra entre los primeros
    // (reemplaza a los últimos de ese tramo que no son de ningún subtema)
    const subtemas = (decision?.consultas ?? []).filter(c => c !== consultaBase)
    if (subtemas.length > 1) {
      const garantizados = subtemas
        .map(sub => listas[consultas.indexOf(sub)]?.[0])
        .filter((h): h is HitV2 => !!h)
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
  const vistos = new Set<string>()
  // Con la norma nombrada, o si ese número de artículo es de una sola norma,
  // el artículo exacto es seguro (cuenta como confianza plena). Si el número
  // aparece en varias normas, va primero, pero la confianza la da el
  // reranker del resto, no él.
  const exactoSeguro = !!normaNombrada || new Set(exactos.map(e => e.normaId)).size === 1
  return [...exactos.map(e => exactoSeguro ? { ...e, score: 1, rerank: 1 } : { ...e, score: 1 }), ...ordenados].filter(h => {
    if (vistos.has(h.id)) return false
    vistos.add(h.id)
    return true
  })
}

// =========================
// PARA CONSULTAS: fragmentos en el formato que ya usa consultarLexit
// =========================
const MAX_PARTES_JUNTAS = 4

// Etiqueta de una unidad que no es un artículo numerado (disposiciones, apéndices)
function etiquetaUnidad(h: HitV2): string {
  const linea = h.texto.split('\n')[0] ?? ''
  const partes = linea.split(' | ')
  return (partes[partes.length - 1] ?? h.articulo).replace(/\s*\[parte \d+ de \d+\]$/, '').replace(/^DEROGADO$/, h.articulo)
}

export interface ResultadoConsultaV2 {
  fragmentos: FragmentoResultado[]
  // Confianza del mejor resultado: puntaje del reranker (si hubo) y similitud de la búsqueda
  confianza: { rerank: number | null; denso: number }
}

export async function recuperarParaConsultaV2(
  pinecone: Pinecone,
  idx: Indice,
  namespace: string,
  indice: IndiceId,
  pregunta: string,
  decision: DecisionBusqueda | undefined,
  opciones: OpcionesBusqueda & { tope: number }
): Promise<ResultadoConsultaV2> {
  const normas = await cargarNormasV2(namespace, indice)
  const hits = await recuperarMejorado(pinecone, idx, pregunta, decision, normas, 'D', opciones)
  const conRerank = hits.filter(h => h.rerank !== undefined)
  const confianza = {
    rerank: conRerank.length ? Math.max(...conRerank.map(h => h.rerank ?? 0)) : null,
    denso: hits.length ? Math.max(...hits.map(h => h.denso)) : 0
  }

  // Un fragmento por artículo, en el orden del ranking
  const porArticulo = new Map<string, HitV2>()
  for (const h of hits) {
    const k = `${h.normaId}::${h.articulo}`
    if (!porArticulo.has(k)) porArticulo.set(k, h)
    if (porArticulo.size >= opciones.tope) break
  }

  // Artículos largos: se juntan sus partes (hasta MAX_PARTES_JUNTAS) para que la IA lea el artículo entero
  const elegidos = [...porArticulo.values()]
  const idsPartes = elegidos.flatMap(h => {
    if (h.totalPartes <= 1) return []
    const base = h.id.replace(/#p\d+$/, '')
    const desde = Math.max(1, Math.min(h.parte - 1, h.totalPartes - MAX_PARTES_JUNTAS + 1))
    return Array.from({ length: Math.min(MAX_PARTES_JUNTAS, h.totalPartes) }, (_, i) => `${base}#p${desde + i}`)
  })
  const textoPorId = new Map<string, string>()
  for (let i = 0; i < idsPartes.length; i += 100) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const r: any = await idx.fetch({ ids: idsPartes.slice(i, i + 100) })
    for (const [id, rec] of Object.entries(r.records ?? {})) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      textoPorId.set(id, txt((rec as any)?.metadata?.text))
    }
  }
  const sinEncabezado = (t: string) => t.split('\n').slice(1).join('\n').trim() || t

  const fragmentos: FragmentoResultado[] = elegidos.map(h => {
    let texto = sinEncabezado(h.texto)
    if (h.totalPartes > 1) {
      const base = h.id.replace(/#p\d+$/, '')
      const partes = [...textoPorId.entries()]
        .filter(([id]) => id.startsWith(`${base}#p`))
        .sort((a, b) => Number(a[0].split('#p').pop()) - Number(b[0].split('#p').pop()))
        .map(([, t]) => sinEncabezado(t))
      if (partes.length) texto = partes.join('\n')
    }
    const letra = /^\d+-([A-Z])$/.exec(h.articulo)?.[1]
    const esArticulo = h.numeroArticulo !== undefined && /^\d+(?:-[A-Z])?$/.test(h.articulo)
    // "Código Civil (D. Leg. 295)": norma y número de norma en la cita
    const norma = h.norma || h.nombreDocumento
    const conNumero = h.numeroNorma && !norma.includes(h.numeroNorma) ? `${norma} (${h.numeroNorma})` : norma
    const vigencia = h.vigenciaArticulo ? `${h.vigenciaArticulo}${h.vigenciaOrigen === 'detectada' ? ' (detectada)' : ''}` : ''
    return {
      texto,
      nombreDocumento: esArticulo ? conNumero : `${conNumero} · ${etiquetaUnidad(h)}`,
      ...(vigencia ? { vigencia } : {}),
      tipoDocumento: h.tipoDocumento,
      documentoId: h.normaId,
      indiceChunk: h.indiceChunk,
      score: h.score,
      ...(esArticulo && h.numeroArticulo !== undefined ? { numeroArticulo: h.numeroArticulo } : {}),
      ...(letra ? { sufijoArticulo: letra } : {}),
      esFuentePrimaria: true
    }
  })
  return { fragmentos, confianza }
}
