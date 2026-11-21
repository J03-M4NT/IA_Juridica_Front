import { Document, Packer, Paragraph, TextRun } from 'docx'

// =========================
// OCR: convierte el texto ya revisado en un Word sencillo. Con ese .docx el
// contrato sigue el flujo normal de Análisis (vista, edición, descarga y
// matriz de desviaciones), sin ramas aparte. No conserva logos, sellos ni
// firmas: esos quedan como [SELLO] y [FIRMA] en el texto.
// =========================
export async function textoADocx(texto: string, nombreOriginal: string): Promise<File> {
  const parrafos = texto
    .split(/\r?\n/)
    .filter(linea => linea.trim() !== '')
    .map(linea => new Paragraph({
      spacing: { after: 160, line: 276 },
      children: [new TextRun({ text: linea, font: 'Times New Roman', size: 24 })]
    }))

  const doc = new Document({ sections: [{ children: parrafos }] })
  const blob = await Packer.toBlob(doc)
  const nombre = `${nombreOriginal.replace(/\.[^.]+$/, '') || 'contrato'}.docx`
  return new File([blob], nombre, { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' })
}
