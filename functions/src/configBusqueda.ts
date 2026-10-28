// =========================
// INTERRUPTOR DE LA BÚSQUEDA DE CONSULTAS
// Documento Firestore config/consultas:
//   busqueda: 'actual' | 'v2'   ('actual' = la de siempre sobre __default__)
//   indice:   'lexit' | 'lexit-e5'  (índice del esquema nuevo)
//   namespace: normalmente 'normas-v2'
//   umbralRerank / umbralDenso: confianza mínima para usar la base (0 = sin umbral)
// Cambiarlo no requiere deploy: volver atrás es cambiar estos valores. Se lee
// con caché de 60 segundos.
// =========================
import { getFirestore } from 'firebase-admin/firestore'
import { type IndiceId, INDICE_POR_DEFECTO, esIndiceId } from './indicesPinecone'

export type ModoBusqueda = 'actual' | 'v2'
export interface ConfigBusqueda {
  modo: ModoBusqueda
  indice: IndiceId
  namespace: string
  umbralRerank: number
  umbralDenso: number
}

export const NAMESPACE_PRODUCCION_V2 = 'normas-v2'
const POR_DEFECTO: ConfigBusqueda = { modo: 'actual', indice: INDICE_POR_DEFECTO, namespace: NAMESPACE_PRODUCCION_V2, umbralRerank: 0, umbralDenso: 0 }
const CACHE_MS = 60 * 1000

let enCache: { leidoEn: number; config: ConfigBusqueda } | null = null

const numero = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) && v >= 0 && v <= 1 ? v : 0)

export async function leerConfigBusqueda(): Promise<ConfigBusqueda> {
  if (enCache && Date.now() - enCache.leidoEn < CACHE_MS) return enCache.config
  try {
    const doc = await getFirestore().collection('config').doc('consultas').get()
    const datos = doc.data() ?? {}
    const config: ConfigBusqueda = {
      modo: datos.busqueda === 'v2' ? 'v2' : 'actual',
      indice: esIndiceId(datos.indice) ? datos.indice : INDICE_POR_DEFECTO,
      namespace: typeof datos.namespace === 'string' && datos.namespace ? datos.namespace : NAMESPACE_PRODUCCION_V2,
      umbralRerank: numero(datos.umbralRerank),
      umbralDenso: numero(datos.umbralDenso)
    }
    enCache = { leidoEn: Date.now(), config }
    return config
  } catch {
    // Ante cualquier problema, la búsqueda de siempre
    return POR_DEFECTO
  }
}

export async function guardarConfigBusqueda(cambios: Partial<Omit<ConfigBusqueda, 'modo'>> & { modo?: ModoBusqueda }, uid: string): Promise<void> {
  const datos: Record<string, unknown> = { actualizadoPor: uid, actualizadoEn: new Date().toISOString() }
  if (cambios.modo) datos.busqueda = cambios.modo
  if (cambios.indice) datos.indice = cambios.indice
  if (cambios.namespace) datos.namespace = cambios.namespace
  if (cambios.umbralRerank !== undefined) datos.umbralRerank = numero(cambios.umbralRerank)
  if (cambios.umbralDenso !== undefined) datos.umbralDenso = numero(cambios.umbralDenso)
  await getFirestore().collection('config').doc('consultas').set(datos, { merge: true })
  enCache = null
}
