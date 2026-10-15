// =========================
// CLÁUSULAS ADICIONALES EN EL WORD ORIGINAL (Gestión de contratos)
// Inserta las cláusulas adicionales que redactó la IA dentro del .docx de
// la plantilla, después de la última cláusula y antes del cierre ("Sírvase
// usted, señor Notario...", lugar y fecha, firmas). Cada párrafo nuevo
// copia el formato de la plantilla: el encabezado, el del último encabezado
// de cláusula ("CLÁUSULA DÉCIMA TERCERA.- DEFINICIONES"); el texto, el del
// párrafo que lo sigue. El resto del documento no se toca.
// =========================
import JSZip from 'jszip'
import { DOMParser, XMLSerializer, type Element as XmlElement } from '@xmldom/xmldom'

export interface ClausulaAdicionalDocx {
  encabezado: string
  texto: string
}

const RE_ENCABEZADO = /^\s*CL[ÁA]USULA\s+[A-ZÁÉÍÓÚÑ\s]+[.:-]/i
const RE_CIERRE = /^\s*(?:S[íi]rvase|En se[ñn]al|En fe de lo cual|Estando conformes|Firmado|Suscrito|[^\n]{0,40},\s*(?:_{2,}|\d{1,2})\s+de\s)/i

function textoParrafo(p: XmlElement): string {
  const ts = p.getElementsByTagName('w:t')
  let t = ''
  for (let i = 0; i < ts.length; i++) t += ts.item(i)?.textContent ?? ''
  return t.replace(/\s+/g, ' ').trim()
}

function hijosDirectos(el: XmlElement, nombre: string): XmlElement[] {
  const lista: XmlElement[] = []
  for (let n = el.firstChild; n; n = n.nextSibling) {
    if (n.nodeType === 1 && (n as XmlElement).nodeName === nombre) lista.push(n as XmlElement)
  }
  return lista
}

// Párrafo nuevo con el formato de "modelo" (pPr y el rPr del primer run)
function crearParrafo(modelo: XmlElement, texto: string, quitarNumeracion: boolean): XmlElement {
  const doc = modelo.ownerDocument
  if (!doc) throw new Error('Párrafo sin documento')
  const nuevo = doc.createElement('w:p')
  const pPr = hijosDirectos(modelo, 'w:pPr')[0]
  if (pPr) {
    const copia = pPr.cloneNode(true) as XmlElement
    if (quitarNumeracion) for (const num of hijosDirectos(copia, 'w:numPr')) copia.removeChild(num)
    nuevo.appendChild(copia)
  }
  const primerRun = hijosDirectos(modelo, 'w:r').find(r => r.getElementsByTagName('w:t').length > 0)
  const rPr = primerRun ? hijosDirectos(primerRun, 'w:rPr')[0] : undefined
  const run = doc.createElement('w:r')
  if (rPr) run.appendChild(rPr.cloneNode(true))
  const t = doc.createElement('w:t')
  t.setAttribute('xml:space', 'preserve')
  t.appendChild(doc.createTextNode(texto))
  run.appendChild(t)
  nuevo.appendChild(run)
  return nuevo
}

export async function insertarClausulasAdicionalesDocx(
  original: Buffer,
  clausulas: ClausulaAdicionalDocx[]
): Promise<{ buffer: Buffer; insertadas: number }> {
  if (clausulas.length === 0) return { buffer: original, insertadas: 0 }
  const zip = await JSZip.loadAsync(original)
  const archivo = zip.file('word/document.xml')
  if (!archivo) throw new Error('El archivo no parece ser un .docx válido.')
  const doc = new DOMParser().parseFromString(await archivo.async('text'), 'text/xml')
  const cuerpo = doc.getElementsByTagName('w:body').item(0)
  if (!cuerpo) throw new Error('El .docx no tiene cuerpo.')

  // Solo los párrafos de primer nivel del cuerpo (no los de tablas)
  const parrafos = hijosDirectos(cuerpo, 'w:p')
  const textos = parrafos.map(textoParrafo)

  const indiceEncabezado = textos.reduce((ultimo, t, i) => (RE_ENCABEZADO.test(t) ? i : ultimo), -1)
  if (indiceEncabezado === -1) throw new Error('No se encontraron las cláusulas del contrato.')
  const modeloEncabezado = parrafos[indiceEncabezado]
  if (!modeloEncabezado) throw new Error('No se encontraron las cláusulas del contrato.')
  const indiceModeloTexto = textos.findIndex((t, i) => i > indiceEncabezado && t.length > 30)
  const modeloTexto = parrafos[indiceModeloTexto] ?? modeloEncabezado

  // Antes del cierre; si no hay cierre reconocible, al final del cuerpo
  const indiceCierre = textos.findIndex((t, i) => i > indiceEncabezado && RE_CIERRE.test(t))
  const referencia: XmlElement | null = (indiceCierre !== -1 ? parrafos[indiceCierre] : undefined)
    ?? hijosDirectos(cuerpo, 'w:sectPr')[0]
    ?? null

  let insertadas = 0
  for (const c of clausulas) {
    cuerpo.insertBefore(crearParrafo(modeloEncabezado, c.encabezado, true), referencia)
    for (const linea of c.texto.split(/\n+/).map(l => l.trim()).filter(Boolean)) {
      cuerpo.insertBefore(crearParrafo(modeloTexto, linea, true), referencia)
    }
    insertadas++
  }

  zip.file('word/document.xml', new XMLSerializer().serializeToString(doc))
  return { buffer: await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' }), insertadas }
}
