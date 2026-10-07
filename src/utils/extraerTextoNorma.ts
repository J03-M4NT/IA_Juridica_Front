import * as mammoth from 'mammoth'
import { extraerTextoPDF } from './pdfExtractor'

// =========================
// TEXTO DE UNA NORMA PARA LA BASE JURÍDICA (Admin → Pinecone)
// Acepta:
// - PDF (como siempre);
// - .doc de SPIJ: en realidad son páginas HTML guardadas con extensión
//   .doc ("Export HTML to Word Document"); se leen como HTML;
// - .docx (Word real), con mammoth.
// Un .doc binario antiguo (Word 97-2003) no se puede leer en el navegador:
// se pide guardarlo como .docx o PDF.
// =========================

// Texto visible de un HTML, con salto de línea entre bloques (párrafos,
// títulos, filas), como lo vería el usuario.
function textoDeHtml(html: string): string {
  const doc = new DOMParser().parseFromString(html, 'text/html')
  doc.querySelectorAll('script, style, head').forEach(n => n.remove())
  doc.querySelectorAll('br').forEach(n => n.replaceWith('\n'))
  doc.querySelectorAll('p, div, h1, h2, h3, h4, h5, h6, li, tr, table').forEach(n => n.append('\n'))
  return (doc.body?.textContent ?? '')
    .split(ESPACIO_DURO).join(' ')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n\s*\n+/g, '\n\n')
    .trim()
}

// Espacio duro (U+00A0) que SPIJ y Word usan entre palabras.
const ESPACIO_DURO = String.fromCharCode(0xa0)

const FIRMA_DOC_BINARIO = [0xd0, 0xcf, 0x11, 0xe0] // Word 97-2003 (OLE)

export async function extraerTextoNorma(
  archivo: File,
  onProgreso?: (actual: number, total: number) => void
): Promise<string> {
  const nombre = archivo.name.toLowerCase()

  if (nombre.endsWith('.pdf')) return extraerTextoPDF(archivo, onProgreso)

  if (nombre.endsWith('.docx')) {
    const { value } = await mammoth.extractRawText({ arrayBuffer: await archivo.arrayBuffer() })
    return value.split(ESPACIO_DURO).join(' ').replace(/\n{3,}/g, '\n\n').trim()
  }

  if (nombre.endsWith('.doc') || nombre.endsWith('.htm') || nombre.endsWith('.html')) {
    const bytes = new Uint8Array(await archivo.slice(0, 4).arrayBuffer())
    if (FIRMA_DOC_BINARIO.every((b, i) => bytes[i] === b)) {
      throw new Error(`"${archivo.name}" es un Word antiguo (.doc): ábrelo en Word y guárdalo como .docx o PDF.`)
    }
    return textoDeHtml(await archivo.text())
  }

  throw new Error(`"${archivo.name}": formato no soportado (usa PDF, .docx o .doc de SPIJ).`)
}

// =========================
// NOMBRE SUGERIDO PARA LA CITA
// SPIJ empieza el documento con el título y el número de la norma, ej.
// "Ley de Conciliación\n\nLEY N°26872" o "CÓDIGO DE PROTECCIÓN Y DEFENSA
// DEL CONSUMIDOR\n\nLEY Nº 29571" → "Ley de Conciliación (Ley N° 26872)".
// Es solo una sugerencia: el admin la puede corregir antes de subir.
// =========================
const MINUSCULAS = new Set(['de', 'del', 'la', 'las', 'los', 'el', 'y', 'e', 'o', 'u', 'en', 'para', 'por', 'a', 'al', 'con', 'sobre'])

function aTitulo(texto: string): string {
  const esMayusculas = texto === texto.toUpperCase()
  if (!esMayusculas) return texto
  return texto.toLowerCase().split(/\s+/).map((p, i) =>
    i > 0 && MINUSCULAS.has(p) ? p : p.charAt(0).toUpperCase() + p.slice(1)
  ).join(' ')
}

// Solo leyes y decretos: la resolución que aprueba un TUO (ej. el Código
// Procesal Civil) no es el número de la norma.
const NUMERO_NORMA_REGEX = /^(ley|decreto(?:\s+(?:legislativo|supremo|de\s+urgencia))?)\s*(?:n\s*[°º.]*|nro\.?)?\s*(\d[\d-]{2,}\d)\b/i

export function sugerirNombreNorma(texto: string, nombreArchivo: string): string {
  const lineas = texto.split('\n').map(l => l.trim()).filter(l => l.length > 0).slice(0, 8)
  const numero = lineas.map(l => NUMERO_NORMA_REGEX.exec(l)).find(Boolean)
  const titulo = lineas.find(l =>
    !NUMERO_NORMA_REGEX.test(l) && !/^\(|^\*|^nota|^promulgad|^publicad|^resoluci[oó]n|^concordancia|^enlace|^\d/i.test(l) && l.length >= 6 && l.length <= 250)
  const numeroTexto = numero ? `${aTitulo(numero[1] ?? 'Ley')} N° ${numero[2] ?? ''}` : ''
  if (titulo) {
    const tituloLimpio = aTitulo(titulo.replace(/^texto [úu]nico ordenado (?:de la |del )?/i, '').replace(/\s+/g, ' ').trim())
    return numeroTexto ? `${tituloLimpio} (${numeroTexto})` : tituloLimpio
  }
  if (numeroTexto) return numeroTexto
  return nombreArchivo.replace(/\.(pdf|docx?|html?)$/i, '').replace(/\s+/g, ' ').trim()
}
