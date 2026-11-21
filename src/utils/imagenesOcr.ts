import { getDocument, GlobalWorkerOptions, OPS, type PDFPageProxy } from 'pdfjs-dist'
import { extraerTextoPDF } from './pdfExtractor'

// =========================
// OCR: prepara en el navegador lo que se manda a Gemini. Corrige la
// orientación, reduce a 2000 px por lado y comprime a JPEG, para que un
// contrato de 10 fotos de celular quepa en una llamada y cueste menos. Las
// imágenes quedan solo en memoria: no se suben a Storage.
// =========================

GlobalWorkerOptions.workerSrc = new URL(`${import.meta.env.BASE_URL}pdf.worker.min.js`, window.location.origin).toString()

const LADO_MAXIMO = 2000
const LADO_MINIMO = 600
const CALIDADES = [0.85, 0.7, 0.55]
// El servidor acepta hasta 2 MB por imagen
const MAX_BYTES_IMAGEN = 1.8 * 1024 * 1024
export const MAX_BYTES_ARCHIVO = 25 * 1024 * 1024

// Con menos texto que esto y alguna imagen, la página se considera escaneada
const MIN_CARACTERES_PAGINA = 50
const OPERACIONES_DE_IMAGEN: number[] = [
  OPS.paintImageXObject,
  OPS.paintImageXObjectRepeat,
  OPS.paintInlineImageXObject,
  OPS.paintImageMaskXObject,
  OPS.paintImageMaskXObjectRepeat,
  OPS.paintJpegXObject
]

export function esImagenOcr(archivo: File): boolean {
  return /^image\/(jpeg|png|heic|heif)$/.test(archivo.type) || /\.(jpe?g|png|heic|heif)$/i.test(archivo.name)
}

export function esPdfOcr(archivo: File): boolean {
  return archivo.type === 'application/pdf' || /\.pdf$/i.test(archivo.name)
}

function aBlob(canvas: HTMLCanvasElement, calidad: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(b => (b ? resolve(b) : reject(new Error('No se pudo comprimir la imagen'))), 'image/jpeg', calidad)
  })
}

function crearCanvas(ancho: number, alto: number): { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D } {
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(ancho)
  canvas.height = Math.round(alto)
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('El navegador no pudo procesar la imagen')
  ctx.fillStyle = '#FFFFFF'
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  return { canvas, ctx }
}

// Baja la calidad y, si no alcanza, el tamaño, hasta entrar en el límite
async function comprimir(canvas: HTMLCanvasElement): Promise<Blob> {
  let actual = canvas
  for (let vuelta = 0; vuelta < 3; vuelta++) {
    for (const calidad of CALIDADES) {
      const blob = await aBlob(actual, calidad)
      if (blob.size <= MAX_BYTES_IMAGEN) return blob
    }
    const { canvas: menor, ctx } = crearCanvas(actual.width * 0.75, actual.height * 0.75)
    ctx.drawImage(actual, 0, 0, menor.width, menor.height)
    actual = menor
  }
  throw new Error('La imagen es demasiado pesada. Prueba con otra foto.')
}

function cargarImagen(blob: Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob)
    const img = new Image()
    img.onload = () => { URL.revokeObjectURL(url); resolve(img) }
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('imagen')) }
    img.src = url
  })
}

// Dibujar un <img> en un canvas aplica la orientación EXIF de la foto
export async function prepararImagen(archivo: File): Promise<Blob> {
  if (archivo.size > MAX_BYTES_ARCHIVO) throw new Error(`"${archivo.name}" pesa más de 25 MB.`)
  let img: HTMLImageElement
  try {
    img = await cargarImagen(archivo)
  } catch {
    throw new Error(/\.hei[cf]$/i.test(archivo.name)
      ? `Este navegador no puede abrir "${archivo.name}" (HEIC). Conviértela a JPG o súbela desde el iPhone.`
      : `"${archivo.name}" no es una imagen válida.`)
  }
  if (Math.max(img.naturalWidth, img.naturalHeight) < LADO_MINIMO) {
    throw new Error(`"${archivo.name}" tiene muy poca resolución para leerla bien. Toma otra foto más cerca.`)
  }
  const escala = Math.min(1, LADO_MAXIMO / Math.max(img.naturalWidth, img.naturalHeight))
  const { canvas, ctx } = crearCanvas(img.naturalWidth * escala, img.naturalHeight * escala)
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
  return comprimir(canvas)
}

// Giro manual, para las fotos que llegan de lado
export async function rotarImagen(blob: Blob): Promise<Blob> {
  const img = await cargarImagen(blob)
  const { canvas, ctx } = crearCanvas(img.naturalHeight, img.naturalWidth)
  ctx.translate(canvas.width / 2, canvas.height / 2)
  ctx.rotate(Math.PI / 2)
  ctx.drawImage(img, -img.naturalWidth / 2, -img.naturalHeight / 2)
  return comprimir(canvas)
}

export type LecturaPdf =
  | { tipo: 'texto'; texto: string }
  | { tipo: 'escaneado'; paginas: Blob[] }

async function clasificarPagina(pagina: PDFPageProxy): Promise<'texto' | 'escaneada' | 'blanco'> {
  const contenido = await pagina.getTextContent()
  const caracteres = contenido.items.reduce((s, item) => s + ('str' in item ? item.str.trim().length : 0), 0)
  if (caracteres >= MIN_CARACTERES_PAGINA) return 'texto'
  const { fnArray } = await pagina.getOperatorList()
  if (fnArray.some(op => OPERACIONES_DE_IMAGEN.includes(op))) return 'escaneada'
  return caracteres > 0 ? 'texto' : 'blanco'
}

// Un PDF con texto seleccionable no necesita Gemini: se extrae gratis. Si
// tiene alguna página escaneada (por ejemplo, un anexo), pasa completo por
// OCR: extraer solo el texto perdería esa página sin avisar. Las páginas en
// blanco se ignoran.
export async function leerPdf(archivo: File, maxPaginas: number): Promise<LecturaPdf> {
  if (archivo.size > MAX_BYTES_ARCHIVO) throw new Error(`"${archivo.name}" pesa más de 25 MB.`)
  const pdf = await getDocument({ data: await archivo.arrayBuffer() }).promise
  const utiles: PDFPageProxy[] = []
  let hayEscaneadas = false
  for (let n = 1; n <= pdf.numPages; n++) {
    const pagina = await pdf.getPage(n)
    const clase = await clasificarPagina(pagina)
    if (clase === 'blanco') continue
    if (clase === 'escaneada') hayEscaneadas = true
    utiles.push(pagina)
  }
  if (!utiles.length) throw new Error(`"${archivo.name}" no tiene contenido: todas sus páginas están en blanco.`)
  if (!hayEscaneadas) return { tipo: 'texto', texto: await extraerTextoPDF(archivo, undefined, { recuperarMargenes: true }) }
  if (utiles.length > maxPaginas) {
    throw new Error(`"${archivo.name}" tiene ${utiles.length} páginas con contenido y se pueden leer hasta ${maxPaginas} por vez.`)
  }
  const paginas: Blob[] = []
  for (const pagina of utiles) {
    const base = pagina.getViewport({ scale: 1 })
    const viewport = pagina.getViewport({ scale: Math.min(LADO_MAXIMO / Math.max(base.width, base.height), 3) })
    const { canvas, ctx } = crearCanvas(viewport.width, viewport.height)
    await pagina.render({ canvasContext: ctx, viewport }).promise
    paginas.push(await comprimir(canvas))
  }
  return { tipo: 'escaneado', paginas }
}

export function blobABase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const lector = new FileReader()
    lector.onload = () => resolve((lector.result as string).split(',')[1] ?? '')
    lector.onerror = () => reject(new Error('No se pudo leer la imagen'))
    lector.readAsDataURL(blob)
  })
}
