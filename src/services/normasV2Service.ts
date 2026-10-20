import { postFuncion } from './functionsClient'
import type { RegistroV2 } from '../utils/normas/metadatosNorma'

// =========================
// NORMAS v2 (Cloud Functions normasV2 y buscarNormasV2)
// Carga incremental en un namespace de prueba: solo se suben los
// fragmentos nuevos o modificados (por hash) y se borran los que ya no
// existen. Producción (__default__) no se toca: el backend solo acepta los
// namespaces de su lista.
// =========================

export const NAMESPACE_PRUEBA = 'normas-v2-prueba'
export const NAMESPACE_PRODUCCION = 'normas-v2'

// Índices del esquema nuevo (ver functions/src/indicesPinecone.ts).
// lexit-e5 (multilingual-e5-large) admite textos más cortos: 1350 caracteres
// por fragmento, encabezado incluido.
export type IndiceV2 = 'lexit' | 'lexit-e5'
export const INDICES_V2: Array<{ id: IndiceV2; nombre: string; maxCaracteres: number | null }> = [
  { id: 'lexit', nombre: 'lexit (llama-text-embed-v2)', maxCaracteres: null },
  { id: 'lexit-e5', nombre: 'lexit-e5 (multilingual-e5-large)', maxCaracteres: 1350 }
]
export const maxCaracteresDe = (indice: IndiceV2) => INDICES_V2.find(i => i.id === indice)?.maxCaracteres ?? null

// Mismo cuidado que la carga actual con el límite de tokens/minuto del
// modelo de embeddings: pausa entre lotes y reintento con espera.
const LOTE = 50
const PAUSA_ENTRE_LOTES_MS = 4500
const MAX_REINTENTOS = 5
const ESPERA_BASE_MS = 20000

const esperar = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

async function llamar<T>(funcion: string, cuerpo: Record<string, unknown>): Promise<T> {
  const response = await postFuncion(funcion, cuerpo)
  const data = await response.json().catch(() => ({})) as T & { error?: string }
  if (!response.ok) throw new Error(data.error ?? `Error en ${funcion}`)
  return data
}

// Tokens aproximados que consumirá el embedding (español: ~3,5 caracteres por token)
export function estimarTokens(registros: Array<{ text: string }>): number {
  return Math.ceil(registros.reduce((s, r) => s + r.text.length, 0) / 3.5)
}

export interface PlanCarga {
  nuevos: RegistroV2[]
  modificados: RegistroV2[]
  iguales: number
  obsoletos: string[]
}

// Compara con lo que ya hay en el namespace (por hash del texto)
export async function planificarCarga(namespace: string, normaId: string, registros: RegistroV2[], indice: IndiceV2 = 'lexit'): Promise<PlanCarga> {
  const { ids, hashes } = await llamar<{ ids: string[]; hashes: Record<string, string> }>('normasV2', { accion: 'estado', namespace, normaId, indice })
  const existentes = new Set(ids)
  const nuevos = registros.filter(r => !existentes.has(r.id))
  const modificados = registros.filter(r => existentes.has(r.id) && hashes[r.id] !== r.hashTexto)
  const actuales = new Set(registros.map(r => r.id))
  return {
    nuevos,
    modificados,
    iguales: registros.length - nuevos.length - modificados.length,
    obsoletos: ids.filter(id => !actuales.has(id))
  }
}

async function subirLote(namespace: string, normaId: string, registros: RegistroV2[], indice: IndiceV2, intento = 1): Promise<void> {
  try {
    await llamar('normasV2', { accion: 'subir', namespace, normaId, registros, indice })
  } catch (err) {
    const mensaje = err instanceof Error ? err.message : ''
    if (mensaje.includes('RESOURCE_EXHAUSTED') && intento <= MAX_REINTENTOS) {
      await esperar(ESPERA_BASE_MS * intento)
      return subirLote(namespace, normaId, registros, indice, intento + 1)
    }
    throw err
  }
}

export async function ejecutarCarga(
  namespace: string,
  normaId: string,
  plan: PlanCarga,
  resumen: Record<string, unknown>,
  onProgreso?: (hechos: number, total: number) => void,
  indice: IndiceV2 = 'lexit'
): Promise<{ subidos: number; eliminados: number }> {
  const aSubir = [...plan.nuevos, ...plan.modificados]
  for (let i = 0; i < aSubir.length; i += LOTE) {
    await subirLote(namespace, normaId, aSubir.slice(i, i + LOTE), indice)
    onProgreso?.(Math.min(i + LOTE, aSubir.length), aSubir.length)
    if (i + LOTE < aSubir.length) await esperar(PAUSA_ENTRE_LOTES_MS)
  }
  if (plan.obsoletos.length) await llamar('normasV2', { accion: 'borrar', namespace, normaId, ids: plan.obsoletos, indice })
  await llamar('normasV2', { accion: 'registrar', namespace, normaId, resumen, indice })
  return { subidos: aSubir.length, eliminados: plan.obsoletos.length }
}

// Normas que hay en el namespace (y cuántos fragmentos tiene cada una)
export async function listarNormasV2(namespace: string, indice: IndiceV2 = 'lexit'): Promise<Array<{ normaId: string; fragmentos: number }>> {
  const data = await llamar<{ normas: Array<{ normaId: string; fragmentos: number }> }>('normasV2', { accion: 'listar', namespace, indice })
  return data.normas
}

// Quita todos los fragmentos de una norma del namespace de prueba
export async function vaciarNormaV2(namespace: string, normaId: string, indice: IndiceV2 = 'lexit'): Promise<number> {
  const data = await llamar<{ eliminados: number }>('normasV2', { accion: 'vaciar', namespace, normaId, indice })
  return data.eliminados
}

export interface HitV2 { _id: string; _score: number; fields: Record<string, unknown> }

export async function buscarNormasV2(namespace: string, query: string, opciones: { topK?: number; filtro?: Record<string, unknown>; rerank?: boolean; indice?: IndiceV2 } = {}): Promise<HitV2[]> {
  const data = await llamar<{ hits: HitV2[] }>('buscarNormasV2', { namespace, query, ...opciones })
  return data.hits
}

// =========================
// EVALUACIÓN A/B/C (Cloud Function evaluarRecuperacion, solo lectura)
// =========================
export interface ResultadoVariante {
  articulos: Array<{ normaId: string | null; norma: string; articulo: string | null; score: number }>
  puestos: Array<number | null>
  hit1: boolean
  recall5: number
  recall8: number
  rr: number
  ms: number
  error?: string
}

export interface InformeEvaluacion {
  generadoEn: string
  segundos: number
  namespace: string
  indice?: IndiceV2
  normasEnNamespace: string[]
  calibracion?: {
    rerank: { positivos: number[]; negativos: number[]; recomendado: number | null; aciertos: string | null }
    denso: { positivos: number[]; negativos: number[]; recomendado: number | null; aciertos: string | null }
  } | null
  variantes: Record<string, string>
  resumen: Array<{ variante: string; acierto1: number; cobertura5: number; cobertura8: number; mrr: number; sinResultados: number; errores: number; msPromedio: number }>
  cPeorQueA: Array<{ id: string; pregunta: string; A: { puestos: Array<number | null>; cobertura8: number }; C: { puestos: Array<number | null>; cobertura8: number } }>
  dPeorQueA?: Array<{ id: string; pregunta: string; A: { puestos: Array<number | null>; cobertura8: number }; D: { puestos: Array<number | null>; cobertura8: number } }>
  resultados: Array<{
    id: string; pregunta: string; tipo: string
    esperados: Array<{ normaId: string; norma: string; numeroNorma: string; articulo: string }>
    reformulacion: { buscar: boolean; consultas: string[]; codigo: string | null } | null
    A: ResultadoVariante; B: ResultadoVariante; C: ResultadoVariante; D?: ResultadoVariante; E?: ResultadoVariante
    confianzaD?: { rerank: number | null; denso: number } | null
    confianzaE?: { denso: number } | null
  }>
}

export async function evaluarRecuperacion(preguntas: unknown[], namespace = NAMESPACE_PRUEBA, indice: IndiceV2 = 'lexit', variantes?: string[]): Promise<InformeEvaluacion> {
  return llamar<InformeEvaluacion>('evaluarRecuperacion', { preguntas, namespace, indice, ...(variantes ? { variantes } : {}) })
}

// Precisión de citas: respuestas completas de Consultas con el índice elegido
// (cada pregunta usa una consulta del cupo diario del admin)
export interface InformeCitas {
  generadoEn: string
  segundos: number
  indice: IndiceV2
  namespace: string
  resumenCitas: {
    precisionCitas: number | null
    preguntasQueCitanUnEsperado: string
    mencionesNoVerificadas: number
    sinBaseReconocidas: string
    errores: number
    msPromedio: number
  }
  resultadosCitas: Array<{
    id: string; pregunta: string; tipo?: string; esperados?: string[]; citas?: string[]
    citasCorrectas?: number; citasTotales?: number; citaAlgunEsperado?: boolean
    noVerificadas?: number; avisoSinBase?: boolean; ms?: number; respuesta?: string; error?: string
  }>
}

export async function evaluarCitas(preguntas: unknown[], namespace: string, indice: IndiceV2): Promise<InformeCitas> {
  return llamar<InformeCitas>('evaluarRecuperacion', { preguntas, namespace, indice, modo: 'citas' })
}

// =========================
// PASO A PRODUCCIÓN (fase 4)
// =========================
export interface ConfigBusqueda { modo: 'actual' | 'v2'; indice: IndiceV2; namespace: string; umbralRerank: number; umbralDenso: number }

export async function leerConfigBusqueda(): Promise<ConfigBusqueda> {
  return llamar<ConfigBusqueda>('normasV2', { accion: 'config' })
}

export async function cambiarBusqueda(
  modo: 'actual' | 'v2',
  namespace = NAMESPACE_PRODUCCION,
  extra: { indice?: IndiceV2; umbralRerank?: number; umbralDenso?: number } = {}
): Promise<ConfigBusqueda> {
  return llamar<ConfigBusqueda>('normasV2', { accion: 'config', modo, namespace, ...extra })
}

// Índices de la cuenta de Pinecone y datos del modelo e5
export interface InfoIndices {
  indices: Array<{ nombre: string; dimension?: number; metrica?: string; estado?: string; modelo: string | null; nube: string | null; region: string | null }>
  modeloE5: Record<string, unknown>
}

export async function infoIndices(): Promise<InfoIndices> {
  return llamar<InfoIndices>('normasV2', { accion: 'infoIndices' })
}

export async function crearIndiceE5(): Promise<{ creado: boolean; mensaje?: string; nombre?: string; dimension?: number; metrica?: string; estado?: string }> {
  return llamar('normasV2', { accion: 'crearIndiceE5' })
}

export interface RespaldoBase { ruta: string; url: string; registros: number; bytesJson: number; bytesGzip: number; sha256: string }

// Respaldo de la base actual (__default__) en Storage, solo lectura de Pinecone
export async function respaldarBaseActual(): Promise<RespaldoBase> {
  return llamar<RespaldoBase>('auditarPinecone', { modo: 'respaldo' })
}
