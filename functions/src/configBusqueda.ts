// =========================
// INTERRUPTOR DE LA BÚSQUEDA DE CONSULTAS (mejora de Consultas, fase 4)
// Documento Firestore config/consultas: { busqueda: 'actual' | 'v2', namespace }
// - 'actual' (o sin documento): la búsqueda de siempre sobre __default__.
// - 'v2': la búsqueda D sobre el namespace del esquema nuevo.
// Cambiarlo no requiere deploy: volver atrás es poner 'actual'. Se lee con
// caché de 60 segundos.
// =========================
import { getFirestore } from 'firebase-admin/firestore'

export type ModoBusqueda = 'actual' | 'v2'
export interface ConfigBusqueda { modo: ModoBusqueda; namespace: string }

export const NAMESPACE_PRODUCCION_V2 = 'normas-v2'
const POR_DEFECTO: ConfigBusqueda = { modo: 'actual', namespace: NAMESPACE_PRODUCCION_V2 }
const CACHE_MS = 60 * 1000

let enCache: { leidoEn: number; config: ConfigBusqueda } | null = null

export async function leerConfigBusqueda(): Promise<ConfigBusqueda> {
  if (enCache && Date.now() - enCache.leidoEn < CACHE_MS) return enCache.config
  try {
    const doc = await getFirestore().collection('config').doc('consultas').get()
    const datos = doc.data() ?? {}
    const config: ConfigBusqueda = {
      modo: datos.busqueda === 'v2' ? 'v2' : 'actual',
      namespace: typeof datos.namespace === 'string' && datos.namespace ? datos.namespace : NAMESPACE_PRODUCCION_V2
    }
    enCache = { leidoEn: Date.now(), config }
    return config
  } catch {
    // Ante cualquier problema, la búsqueda de siempre
    return POR_DEFECTO
  }
}

export async function guardarConfigBusqueda(modo: ModoBusqueda, namespace: string, uid: string): Promise<void> {
  await getFirestore().collection('config').doc('consultas').set({ busqueda: modo, namespace, actualizadoPor: uid, actualizadoEn: new Date().toISOString() }, { merge: true })
  enCache = null
}
