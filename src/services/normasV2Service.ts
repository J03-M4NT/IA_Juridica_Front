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
export async function planificarCarga(namespace: string, normaId: string, registros: RegistroV2[]): Promise<PlanCarga> {
  const { ids, hashes } = await llamar<{ ids: string[]; hashes: Record<string, string> }>('normasV2', { accion: 'estado', namespace, normaId })
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

async function subirLote(namespace: string, normaId: string, registros: RegistroV2[], intento = 1): Promise<void> {
  try {
    await llamar('normasV2', { accion: 'subir', namespace, normaId, registros })
  } catch (err) {
    const mensaje = err instanceof Error ? err.message : ''
    if (mensaje.includes('RESOURCE_EXHAUSTED') && intento <= MAX_REINTENTOS) {
      await esperar(ESPERA_BASE_MS * intento)
      return subirLote(namespace, normaId, registros, intento + 1)
    }
    throw err
  }
}

export async function ejecutarCarga(
  namespace: string,
  normaId: string,
  plan: PlanCarga,
  resumen: Record<string, unknown>,
  onProgreso?: (hechos: number, total: number) => void
): Promise<{ subidos: number; eliminados: number }> {
  const aSubir = [...plan.nuevos, ...plan.modificados]
  for (let i = 0; i < aSubir.length; i += LOTE) {
    await subirLote(namespace, normaId, aSubir.slice(i, i + LOTE))
    onProgreso?.(Math.min(i + LOTE, aSubir.length), aSubir.length)
    if (i + LOTE < aSubir.length) await esperar(PAUSA_ENTRE_LOTES_MS)
  }
  if (plan.obsoletos.length) await llamar('normasV2', { accion: 'borrar', namespace, normaId, ids: plan.obsoletos })
  await llamar('normasV2', { accion: 'registrar', namespace, normaId, resumen })
  return { subidos: aSubir.length, eliminados: plan.obsoletos.length }
}

// Normas que hay en el namespace (y cuántos fragmentos tiene cada una)
export async function listarNormasV2(namespace: string): Promise<Array<{ normaId: string; fragmentos: number }>> {
  const data = await llamar<{ normas: Array<{ normaId: string; fragmentos: number }> }>('normasV2', { accion: 'listar', namespace })
  return data.normas
}

// Quita todos los fragmentos de una norma del namespace de prueba
export async function vaciarNormaV2(namespace: string, normaId: string): Promise<number> {
  const data = await llamar<{ eliminados: number }>('normasV2', { accion: 'vaciar', namespace, normaId })
  return data.eliminados
}

export interface HitV2 { _id: string; _score: number; fields: Record<string, unknown> }

export async function buscarNormasV2(namespace: string, query: string, opciones: { topK?: number; filtro?: Record<string, unknown>; rerank?: boolean } = {}): Promise<HitV2[]> {
  const data = await llamar<{ hits: HitV2[] }>('buscarNormasV2', { namespace, query, ...opciones })
  return data.hits
}
