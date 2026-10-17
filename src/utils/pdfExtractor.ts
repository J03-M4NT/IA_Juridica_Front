import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist'
import { textoDeDocumentoPdf, type OpcionesTextoPdf } from './pdfTexto'

// BASE_URL sale de publicPath en quasar.config.ts ('/' en desarrollo,
// '/IA_Juridica_Front/' en GitHub Pages) — no escribir la ruta a mano.
GlobalWorkerOptions.workerSrc = new URL(`${import.meta.env.BASE_URL}pdf.worker.min.js`, window.location.origin).href

// La lógica de extracción vive en pdfTexto.ts (sin DOM, verificable en Node).
// Se reexportan las funciones que usan los scripts de verificación.
export { extraerItemsConLimitesDeParrafo, textoDePaginaConSaltos } from './pdfTexto'

// =========================
// EXTRAER TEXTO DEL PDF
// =========================
export async function extraerTextoPDF(
  archivo: File,
  onProgress?: (pagina: number, total: number) => void,
  opciones: OpcionesTextoPdf = {}
): Promise<string> {
  const arrayBuffer = await archivo.arrayBuffer()
  const pdf = await getDocument({ data: arrayBuffer }).promise
  return textoDeDocumentoPdf(pdf, onProgress, opciones)
}
