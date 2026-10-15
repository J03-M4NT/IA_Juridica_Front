// =========================
// REDACCIÓN AVANZADA: exportar el documento del editor a Word (.docx)
// Lee el HTML del editor (párrafos, títulos, listas, negrita, cursiva,
// subrayado y alineación, incluida la derecha para la fecha o la sumilla)
// y arma el .docx con la librería docx. Times New Roman 12, márgenes de
// 2,5 cm.
// =========================
import { AlignmentType, Document, Packer, Paragraph, TextRun } from 'docx'

type Alineacion = (typeof AlignmentType)[keyof typeof AlignmentType]

const ALINEACION: Record<string, Alineacion> = {
  left: AlignmentType.LEFT,
  right: AlignmentType.RIGHT,
  center: AlignmentType.CENTER,
  justify: AlignmentType.JUSTIFIED
}

const FUENTE = 'Times New Roman'

interface Formato { negrita: boolean; cursiva: boolean; subrayado: boolean }

function runsDe(nodo: Node, formato: Formato, runs: TextRun[]) {
  if (nodo.nodeType === Node.TEXT_NODE) {
    const texto = nodo.textContent ?? ''
    if (texto) {
      runs.push(new TextRun({
        text: texto,
        font: FUENTE,
        size: 24,
        bold: formato.negrita,
        italics: formato.cursiva,
        ...(formato.subrayado ? { underline: {} } : {})
      }))
    }
    return
  }
  if (!(nodo instanceof HTMLElement)) return
  if (nodo.tagName === 'BR') {
    runs.push(new TextRun({ text: '', break: 1, font: FUENTE, size: 24 }))
    return
  }
  const siguiente: Formato = {
    negrita: formato.negrita || nodo.tagName === 'STRONG' || nodo.tagName === 'B',
    cursiva: formato.cursiva || nodo.tagName === 'EM' || nodo.tagName === 'I',
    subrayado: formato.subrayado || nodo.tagName === 'U'
  }
  nodo.childNodes.forEach(hijo => runsDe(hijo, siguiente, runs))
}

function alineacionDe(el: HTMLElement, porDefecto: Alineacion): Alineacion {
  return ALINEACION[el.style.textAlign] ?? porDefecto
}

export async function redaccionAWord(html: string, titulo: string): Promise<Blob> {
  const contenedor = document.createElement('div')
  contenedor.innerHTML = html
  const parrafos: Paragraph[] = []

  const agregar = (el: HTMLElement, opciones: { negrita?: boolean; porDefecto: Alineacion; prefijo?: string }) => {
    const runs: TextRun[] = []
    if (opciones.prefijo) runs.push(new TextRun({ text: opciones.prefijo, font: FUENTE, size: 24 }))
    runsDe(el, { negrita: opciones.negrita ?? false, cursiva: false, subrayado: false }, runs)
    parrafos.push(new Paragraph({
      children: runs.length ? runs : [new TextRun({ text: '', font: FUENTE, size: 24 })],
      alignment: alineacionDe(el, opciones.porDefecto),
      spacing: { after: 160, line: 300 }
    }))
  }

  const recorrer = (padre: Element) => {
    for (const el of Array.from(padre.children) as HTMLElement[]) {
      if (el.tagName === 'P') agregar(el, { porDefecto: AlignmentType.JUSTIFIED })
      else if (/^H[1-6]$/.test(el.tagName)) agregar(el, { negrita: true, porDefecto: AlignmentType.CENTER })
      else if (el.tagName === 'UL' || el.tagName === 'OL') {
        Array.from(el.children).forEach((li, i) => {
          const parrafoLi = li.querySelector('p') ?? li
          agregar(parrafoLi as HTMLElement, { porDefecto: AlignmentType.JUSTIFIED, prefijo: el.tagName === 'OL' ? `${i + 1}. ` : '• ' })
        })
      } else if (el.tagName === 'BLOCKQUOTE' || el.tagName === 'DIV') recorrer(el)
    }
  }
  recorrer(contenedor)

  const doc = new Document({
    title: titulo,
    creator: 'LexIT',
    styles: { default: { document: { run: { font: FUENTE, size: 24 } } } },
    sections: [{
      properties: { page: { margin: { top: 1418, bottom: 1418, left: 1418, right: 1418 } } },
      children: parrafos
    }]
  })
  return Packer.toBlob(doc)
}

/** Convierte los bloques que devuelve la IA en el HTML del editor. */
export function bloquesAHtml(bloques: { texto: string; alineacion: string; negrita: boolean }[]): string {
  const escapar = (t: string) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  const css: Record<string, string> = { izquierda: 'left', derecha: 'right', centro: 'center', justificado: 'justify' }
  return bloques.map(b => {
    const contenido = escapar(b.texto).replace(/\n/g, '<br>')
    return `<p style="text-align: ${css[b.alineacion] ?? 'justify'}">${b.negrita ? `<strong>${contenido}</strong>` : contenido}</p>`
  }).join('')
}
