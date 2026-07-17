import * as pdfjsLib from 'pdfjs-dist'

export interface PDFDiagnosticResult {
  isValidPDF: boolean
  hasText: boolean
  pageCount?: number
  textItems?: number
  error?: string
  workerError: boolean
}

export async function extractTextFromPDF(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer()

  if (arrayBuffer.byteLength === 0) {
    throw new Error('El archivo PDF está vacío o corrupto')
  }

  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise

  if (pdf.numPages === 0) {
    throw new Error('El PDF no contiene páginas')
  }

  let fullText = ''

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i)
    const textContent = await page.getTextContent()
    const pageText = textContent.items
      .map(item => ('str' in item ? item.str : ''))
      .join(' ')
    fullText += pageText + '\n'
  }

  if (fullText.trim().length === 0) {
    throw new Error(
      'No se pudo extraer texto del PDF. El documento podría estar escaneado, ser una imagen, o estar protegido.'
    )
  }

  return fullText
}

export async function diagnosticarPDF(file: File): Promise<PDFDiagnosticResult> {
  try {
    const arrayBuffer = await file.arrayBuffer()

    const uint8Array = new Uint8Array(arrayBuffer)
    const headerString = String.fromCharCode(...uint8Array.slice(0, 8))

    if (!headerString.includes('%PDF-')) {
      throw new Error('El archivo no tiene el formato PDF válido')
    }

    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise

    let hasText = false
    let totalItems = 0

    for (let i = 1; i <= Math.min(pdf.numPages, 3); i++) {
      const page = await pdf.getPage(i)
      const textContent = await page.getTextContent()
      totalItems += textContent.items.length
      if (textContent.items.length > 0) {
        hasText = true
        break
      }
    }

    return {
      isValidPDF: true,
      hasText,
      pageCount: pdf.numPages,
      textItems: totalItems,
      workerError: false
    }
  } catch (err) {
    const isWorkerError = err instanceof Error && (
      err.message.includes('worker') ||
      err.message.includes('Worker') ||
      err.message.includes('Loading worker') ||
      err.message.includes('Failed to load') ||
      err.message.includes('Setting up fake worker failed') ||
      err.message.includes('Failed to fetch dynamically imported module') ||
      err.message.includes('pdf.worker')
    )

    return {
      isValidPDF: false,
      hasText: false,
      error: err instanceof Error ? err.message : 'Error desconocido',
      workerError: isWorkerError
    }
  }
}
