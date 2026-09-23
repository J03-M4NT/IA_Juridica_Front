import { db } from '../firebase/firebaseConfig'
import { collection, query, orderBy, limit, getDocs } from 'firebase/firestore'
import { postFuncion } from './functionsClient'

/**
 * Norma legal publicada en el Diario Oficial El Peruano, obtenida por el
 * scraping automático (Cloud Function `scrapearNormasDiarias`).
 */
export interface NormaDelDia {
  id: string
  sector: string
  titulo: string
  fecha: string
  sumilla: string
  urlDetalle: string
  urlPdf: string
}

export interface NormasDelDiaResult {
  fecha: string
  normas: NormaDelDia[]
}

/**
 * Trae la edición de normas más reciente guardada en Firestore por el
 * scraping (colección `normas_diarias`, un documento por día). Devuelve
 * null si todavía no hay ninguna edición guardada.
 */
export async function obtenerUltimasNormas(): Promise<NormasDelDiaResult | null> {
  const normasRef = collection(db, 'normas_diarias')
  // Se piden las últimas ediciones y se usa la primera CON normas: antes
  // del fix en scrapearNormasDiarias, de madrugada se guardaban ediciones
  // vacías (El Peruano aún no publicaba) que dejaban la página sin normas.
  const q = query(normasRef, orderBy('fecha', 'desc'), limit(5))

  const snapshot = await getDocs(q)
  const ediciones = snapshot.docs.map(d => d.data() as { fecha: string; normas?: NormaDelDia[] })
  const edicion = ediciones.find(e => (e.normas?.length ?? 0) > 0)
  if (!edicion) return null

  return { fecha: edicion.fecha, normas: edicion.normas ?? [] }
}

/**
 * Dispara el scraping de El Peruano ahora mismo (en vez de esperar a la
 * próxima corrida automática) y devuelve el total de normas guardadas
 * para el día. Lanza si el scraping falla.
 */
export async function actualizarNormasDelDia(): Promise<number> {
  const response = await postFuncion('scrapearNormasDiariasManual', {})

  const data = await response.json() as { success?: boolean; total?: number; error?: string }
  if (!data.success) throw new Error(data.error ?? 'No se pudo actualizar las normas')

  return data.total ?? 0
}

/**
 * El link que guardamos por norma (urlPdf/urlDetalle) apunta a la página
 * visor de El Peruano, no al archivo en sí — esta función resuelve, en el
 * servidor (para evitar CORS), la URL real del PDF embebible, para
 * mostrarlo en un iframe dentro de la plataforma sin redirigir a su sitio.
 */
export async function resolverUrlPdf(urlWrapper: string): Promise<string> {
  const response = await postFuncion('resolverUrlPdfNorma', { urlWrapper })

  const data = await response.json() as { urlPdf?: string; error?: string }
  if (!data.urlPdf) throw new Error(data.error ?? 'No se pudo obtener el PDF de esta norma')

  return data.urlPdf
}
