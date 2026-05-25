import { Document, Packer, Paragraph, TextRun, AlignmentType } from 'docx'
import jsPDF from 'jspdf'

// ================================
// PROCESAR TEXTO EN LÍNEAS
// ================================
function procesarLineas(texto: string): string[] {
  const resultado: string[] = []
  const lineasCrudas = texto.split('\n').map(l => l.trim()).filter(l => l.length > 0)

  for (const linea of lineasCrudas) {
    // Si la línea contiene CLÁUSULA en medio, separar
    if (linea.includes('CLÁUSULA') && !linea.startsWith('CLÁUSULA')) {
      const partes = linea.split(/(CLÁUSULA [A-ZÁÉÍÓÚÑ]+\.-)/)
      for (const parte of partes) {
        if (parte.trim()) resultado.push(parte.trim())
      }
    } else {
      resultado.push(linea)
    }
  }

  return resultado
}

// ================================
// EXPORTAR A WORD
// ================================
export async function exportarWord(
  texto: string,
  nombreArchivo: string
): Promise<void> {

  // Pre-procesar: insertar saltos antes de CLÁUSULA
  const textoPreparado = texto
    .replace(/\s+(CLÁUSULA [IVXLCDMA-ZÁÉÍÓÚÑ]+\.-)/g, '\n$1')
    .replace(/(CONTRATO DE [A-ZÁÉÍÓÚÑ\s]+)/g, '\n$1\n')
    .replace(/\s+Definiciones/g, '\nDefiniciones')
    .replace(/ {2,}/g, ' ')
    .trim()

  const lineas = textoPreparado
    .split('\n')
    .map(l => l.trim())
    .filter(l => l.length > 0)

  const parrafos: Paragraph[] = []

  for (const linea of lineas) {

    // Título principal del contrato
    if (/^CONTRATO DE/.test(linea)) {
      parrafos.push(new Paragraph({
        children: [new TextRun({
          text: linea,
          bold: true,
          size: 28,
          font: 'Times New Roman'
        })],
        alignment: AlignmentType.CENTER,
        spacing: { before: 0, after: 400 }
      }))
      continue
    }

    // Título de cláusula (solo el encabezado hasta el primer punto seguido de mayúscula)
    if (/^CLÁUSULA/.test(linea)) {
      // Separar "CLÁUSULA X.- TITULO" del "contenido"
      const matchTitulo = linea.match(/^(CLÁUSULA [^.]+\.-\s*[A-ZÁÉÍÓÚÑ\s]+)(.*)/)

      if (matchTitulo) {
        const tituloClausa = matchTitulo[1]?.trim() ?? linea
        const contenidoClausa = matchTitulo[2]?.trim() ?? ''

        // Párrafo del título
        parrafos.push(new Paragraph({
          children: [new TextRun({
            text: tituloClausa,
            bold: true,
            size: 22,
            font: 'Times New Roman'
          })],
          alignment: AlignmentType.JUSTIFIED,
          spacing: { before: 280, after: 80 }
        }))

        // Párrafo del contenido si existe
        if (contenidoClausa) {
          parrafos.push(new Paragraph({
            children: [new TextRun({
              text: contenidoClausa,
              size: 22,
              font: 'Times New Roman'
            })],
            alignment: AlignmentType.JUSTIFIED,
            spacing: { before: 0, after: 120 }
          }))
        }
      } else {
        parrafos.push(new Paragraph({
          children: [new TextRun({
            text: linea,
            bold: true,
            size: 22,
            font: 'Times New Roman'
          })],
          alignment: AlignmentType.JUSTIFIED,
          spacing: { before: 280, after: 80 }
        }))
      }
      continue
    }

    // Sección Definiciones
    if (linea === 'Definiciones') {
      parrafos.push(new Paragraph({
        children: [new TextRun({
          text: linea,
          bold: true,
          size: 24,
          font: 'Times New Roman'
        })],
        alignment: AlignmentType.LEFT,
        spacing: { before: 400, after: 160 }
      }))
      continue
    }

    // Firmas
    if (linea.includes('Firma:') || linea.includes('Nombre:') ||
      (linea.includes('ARRENDADOR') && linea.includes('ARRENDATARIO') && linea.length < 60)) {
      parrafos.push(new Paragraph({
        children: [new TextRun({
          text: linea,
          size: 22,
          font: 'Times New Roman'
        })],
        alignment: AlignmentType.CENTER,
        spacing: { before: 160, after: 80 }
      }))
      continue
    }

    // Texto normal
    parrafos.push(new Paragraph({
      children: [new TextRun({
        text: linea,
        size: 22,
        font: 'Times New Roman'
      })],
      alignment: AlignmentType.JUSTIFIED,
      spacing: { before: 0, after: 120 }
    }))
  }

  const doc = new Document({
    sections: [{
      properties: {
        page: {
          margin: { top: 1440, bottom: 1440, left: 1440, right: 1440 }
        }
      },
      children: parrafos
    }]
  })

  const blob = await Packer.toBlob(doc)
  descargarArchivo(blob, `${nombreArchivo}.docx`)
}

// ================================
// EXPORTAR A PDF
// ================================
export function exportarPDF(texto: string, nombreArchivo: string): void {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  })

  const margenIzq = 25
  const anchoTexto = 160
  let posY = 30

  const textoPreparado = texto
    .replace(/\s+(CLÁUSULA [IVXLCDMA-ZÁÉÍÓÚÑ]+\.-)/g, '\n$1')
    .replace(/(CONTRATO DE [A-ZÁÉÍÓÚÑ\s]+)/g, '\n$1\n')
    .replace(/\s+Definiciones/g, '\nDefiniciones')
    .replace(/ {2,}/g, ' ')
    .trim()

  const lineas = textoPreparado
    .split('\n')
    .map(l => l.trim())
    .filter(l => l.length > 0)

  for (const linea of lineas) {

    if (posY > 270) {
      doc.addPage()
      posY = 25
    }

    // Título principal
    if (/^CONTRATO DE/.test(linea)) {
      doc.setFont('times', 'bold')
      doc.setFontSize(14)
      const divididas = doc.splitTextToSize(linea, anchoTexto) as string[]
      doc.text(divididas, 105, posY, { align: 'center' })
      posY += divididas.length * 8 + 8
      continue
    }

    // Cláusula
    if (/^CLÁUSULA/.test(linea)) {
      posY += 5
      const matchTitulo = linea.match(/^(CLÁUSULA [^.]+\.-\s*[A-ZÁÉÍÓÚÑ\s]+)(.*)/)

      if (matchTitulo) {
        const tituloClausa = matchTitulo[1]?.trim() ?? linea
        const contenidoClausa = matchTitulo[2]?.trim() ?? ''

        doc.setFont('times', 'bold')
        doc.setFontSize(11)
        const divTitulo = doc.splitTextToSize(tituloClausa, anchoTexto) as string[]
        doc.text(divTitulo, margenIzq, posY)
        posY += divTitulo.length * 6 + 2

        if (contenidoClausa) {
          doc.setFont('times', 'normal')
          const divContenido = doc.splitTextToSize(contenidoClausa, anchoTexto) as string[]
          doc.text(divContenido, margenIzq, posY)
          posY += divContenido.length * 6 + 3
        }
      } else {
        doc.setFont('times', 'bold')
        doc.setFontSize(11)
        const divididas = doc.splitTextToSize(linea, anchoTexto) as string[]
        doc.text(divididas, margenIzq, posY)
        posY += divididas.length * 6 + 3
      }
      continue
    }

    // Definiciones
    if (linea === 'Definiciones') {
      posY += 6
      doc.setFont('times', 'bold')
      doc.setFontSize(12)
      doc.text(linea, margenIzq, posY)
      posY += 8
      continue
    }

    // Firmas
    if (linea.includes('Firma:') || linea.includes('Nombre:') ||
      (linea.includes('ARRENDADOR') && linea.includes('ARRENDATARIO') && linea.length < 60)) {
      posY += 4
      doc.setFont('times', 'normal')
      doc.setFontSize(11)
      doc.text(linea, 105, posY, { align: 'center' })
      posY += 6
      continue
    }

    // Texto normal
    doc.setFont('times', 'normal')
    doc.setFontSize(11)
    const divididas = doc.splitTextToSize(linea, anchoTexto) as string[]
    doc.text(divididas, margenIzq, posY)
    posY += divididas.length * 6 + 2
  }

  doc.save(`${nombreArchivo}.pdf`)
}

// ================================
// HELPER DESCARGA
// ================================
function descargarArchivo(blob: Blob, nombre: string): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = nombre
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
