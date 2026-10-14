// =========================
// MATRIZ DE DESVIACIONES (Análisis de contratos)
// Exporta a Word (.docx) y Excel (.xlsx) los riesgos que el análisis ya
// generó: una fila por cláusula con riesgo, con su nivel, la modificación
// sugerida y el artículo que la sustenta. No llama a la IA: solo da forma
// a los datos que ya están en pantalla.
// =========================
import {
  AlignmentType,
  BorderStyle,
  Document,
  Footer,
  Header,
  Packer,
  PageNumber,
  PageOrientation,
  Paragraph,
  ShadingType,
  Table,
  TableCell,
  TableRow,
  TextRun,
  VerticalAlign,
  WidthType
} from 'docx'
import type { SugerenciaCambio } from '../services/geminiService'

export const AVISO_MATRIZ = 'Borrador de apoyo. Debe ser revisado por un abogado.'
export const SIN_SUSTENTO = 'Sin artículo identificado en la base jurídica'

type Nivel = 'alto' | 'medio' | 'bajo'

export interface FilaMatriz {
  numero: number
  clausula: string
  textoOriginal: string
  nivel: Nivel
  modificacion: string
  sustento: string
  aplicada: boolean
}

const ORDEN_NIVEL: Record<Nivel, number> = { alto: 0, medio: 1, bajo: 2 }
const ETIQUETA_NIVEL: Record<Nivel, string> = { alto: 'Alto', medio: 'Medio', bajo: 'Bajo' }

// Tintes apagados para la celda del nivel (fondo / texto)
const TINTE_NIVEL: Record<Nivel, { fondo: string; texto: string }> = {
  alto: { fondo: 'F3DCD8', texto: '8A2E24' },
  medio: { fondo: 'F6E9CC', texto: '7A5A12' },
  bajo: { fondo: 'DDEBDF', texto: '2F6B3A' }
}

const NAVY = '1B2632'
const BORDE = 'C9C1B1'

function sustentoDe(s: SugerenciaCambio): string {
  const base = s.baseLegal
  if (!base) return SIN_SUSTENTO
  if (base.articulo === undefined) return base.documento
  return `Artículo ${base.articulo}°${base.sufijo ? `-${base.sufijo}` : ''} — ${base.documento}`
}

/**
 * Filas de la matriz: solo los riesgos con nivel (los "cambios sugeridos"
 * sin nivel no entran), incluidos los que ya se aplicaron al documento.
 * Ordenadas de mayor a menor riesgo.
 */
export function filasMatriz(pendientes: SugerenciaCambio[], aplicadas: SugerenciaCambio[]): FilaMatriz[] {
  const conEstado = [
    ...pendientes.map(s => ({ s, aplicada: false })),
    ...aplicadas.map(s => ({ s, aplicada: true }))
  ].filter((x): x is { s: SugerenciaCambio & { nivel: Nivel }; aplicada: boolean } =>
    x.s.tipo === 'riesgo' && (x.s.nivel === 'alto' || x.s.nivel === 'medio' || x.s.nivel === 'bajo'))

  return conEstado
    .sort((a, b) => ORDEN_NIVEL[a.s.nivel] - ORDEN_NIVEL[b.s.nivel])
    .map(({ s, aplicada }, i) => ({
      numero: i + 1,
      clausula: s.clausula?.trim() || 'Cláusula',
      textoOriginal: s.textoOriginal?.trim() ?? '',
      nivel: s.nivel,
      modificacion: s.textoSugerido?.trim() || 'Sin redacción alternativa sugerida',
      sustento: sustentoDe(s),
      aplicada
    }))
}

function fechaLarga(fecha: Date): string {
  return fecha.toLocaleDateString('es-PE', { day: 'numeric', month: 'long', year: 'numeric' })
}

function nombreBase(nombreDocumento: string): string {
  return nombreDocumento.replace(/\.(docx?|pdf)$/i, '').trim() || 'contrato'
}

export function nombreArchivoMatriz(nombreDocumento: string, extension: 'docx' | 'xlsx'): string {
  return `Matriz de desviaciones - ${nombreBase(nombreDocumento)}.${extension}`
}

const ENCABEZADOS = [
  'N°',
  'Cláusula original de la contraparte',
  'Nivel de riesgo para el cliente',
  'Modificación sugerida',
  'Sustento legal peruano'
]

// =========================
// WORD
// =========================
// A4 horizontal con márgenes de 2 cm: 16 838 − 2 × 1 134 = 14 570 twips útiles
const ANCHOS_WORD = [620, 4550, 1400, 4500, 3500]

const bordeFino = { style: BorderStyle.SINGLE, size: 4, color: BORDE }
const bordesCelda = { top: bordeFino, bottom: bordeFino, left: bordeFino, right: bordeFino }

function celda(
  hijos: Paragraph[],
  ancho: number,
  opciones: { fondo?: string; centrado?: boolean } = {}
): TableCell {
  return new TableCell({
    children: hijos,
    width: { size: ancho, type: WidthType.DXA },
    borders: bordesCelda,
    margins: { top: 90, bottom: 90, left: 110, right: 110 },
    verticalAlign: opciones.centrado ? VerticalAlign.CENTER : VerticalAlign.TOP,
    ...(opciones.fondo ? { shading: { type: ShadingType.CLEAR, color: 'auto', fill: opciones.fondo } } : {})
  })
}

function texto(contenido: string, opciones: { negrita?: boolean; color?: string; cursiva?: boolean; tamano?: number } = {}): TextRun {
  return new TextRun({
    text: contenido,
    bold: opciones.negrita ?? false,
    italics: opciones.cursiva ?? false,
    color: opciones.color ?? '2B2B2B',
    size: opciones.tamano ?? 18,
    font: 'Calibri'
  })
}

export async function matrizAWord(filas: FilaMatriz[], nombreDocumento: string, fecha = new Date()): Promise<Blob> {
  const filaEncabezado = new TableRow({
    tableHeader: true,
    children: ENCABEZADOS.map((titulo, i) => celda(
      [new Paragraph({ children: [texto(titulo, { negrita: true, color: 'FFFFFF' })] })],
      ANCHOS_WORD[i] ?? 1000,
      { fondo: NAVY }
    ))
  })

  const filasTabla = filas.map(f => new TableRow({
    cantSplit: true,
    children: [
      celda([new Paragraph({ alignment: AlignmentType.CENTER, children: [texto(String(f.numero))] })], ANCHOS_WORD[0] ?? 620),
      celda([
        new Paragraph({ spacing: { after: 60 }, children: [texto(f.clausula, { negrita: true, color: NAVY })] }),
        new Paragraph({ children: [texto(f.textoOriginal ? `“${f.textoOriginal}”` : '—')] })
      ], ANCHOS_WORD[1] ?? 4550),
      celda(
        [new Paragraph({ alignment: AlignmentType.CENTER, children: [texto(ETIQUETA_NIVEL[f.nivel], { negrita: true, color: TINTE_NIVEL[f.nivel].texto })] })],
        ANCHOS_WORD[2] ?? 1400,
        { fondo: TINTE_NIVEL[f.nivel].fondo, centrado: true }
      ),
      celda([
        new Paragraph({ children: [texto(f.modificacion)] }),
        ...(f.aplicada ? [new Paragraph({ spacing: { before: 60 }, children: [texto('Ya aplicada al documento', { cursiva: true, color: '6B6B6B', tamano: 16 })] })] : [])
      ], ANCHOS_WORD[3] ?? 4500),
      celda([new Paragraph({ children: [texto(f.sustento, { color: f.sustento === SIN_SUSTENTO ? '6B6B6B' : '2B2B2B', cursiva: f.sustento === SIN_SUSTENTO })] })], ANCHOS_WORD[4] ?? 3500)
    ]
  }))

  const doc = new Document({
    creator: 'LexIT',
    title: `Matriz de desviaciones - ${nombreBase(nombreDocumento)}`,
    sections: [{
      properties: {
        page: {
          size: { orientation: PageOrientation.LANDSCAPE },
          margin: { top: 1134, bottom: 1134, left: 1134, right: 1134 }
        }
      },
      headers: {
        default: new Header({
          children: [new Paragraph({
            border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: BORDE, space: 4 } },
            children: [
              texto(nombreBase(nombreDocumento), { negrita: true, color: NAVY }),
              texto(`   ·   ${fechaLarga(fecha)}`, { color: '6B6B6B' })
            ]
          })]
        })
      },
      footers: {
        default: new Footer({
          children: [new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              texto('Generado por LexIT  ·  Página ', { color: '6B6B6B', tamano: 16 }),
              new TextRun({ children: [PageNumber.CURRENT], size: 16, color: '6B6B6B', font: 'Calibri' }),
              texto(' de ', { color: '6B6B6B', tamano: 16 }),
              new TextRun({ children: [PageNumber.TOTAL_PAGES], size: 16, color: '6B6B6B', font: 'Calibri' })
            ]
          })]
        })
      },
      children: [
        new Paragraph({
          spacing: { after: 80 },
          children: [new TextRun({ text: 'Matriz de desviaciones', bold: true, size: 32, color: NAVY, font: 'Georgia' })]
        }),
        new Paragraph({
          spacing: { after: 240 },
          children: [texto(`Documento analizado: ${nombreDocumento}  ·  ${fechaLarga(fecha)}  ·  ${filas.length} ${filas.length === 1 ? 'cláusula con riesgo' : 'cláusulas con riesgo'}`, { color: '555555', tamano: 19 })]
        }),
        new Table({
          width: { size: ANCHOS_WORD.reduce((a, b) => a + b, 0), type: WidthType.DXA },
          columnWidths: ANCHOS_WORD,
          rows: [filaEncabezado, ...filasTabla]
        }),
        new Paragraph({
          spacing: { before: 280 },
          children: [texto(AVISO_MATRIZ, { cursiva: true, negrita: true, color: '8A2E24', tamano: 18 })]
        })
      ]
    }]
  })

  return Packer.toBlob(doc)
}

// =========================
// EXCEL (exceljs se carga solo al exportar)
// =========================
export async function matrizAExcel(filas: FilaMatriz[], nombreDocumento: string, fecha = new Date()): Promise<Blob> {
  const { default: ExcelJS } = await import('exceljs')
  const libro = new ExcelJS.Workbook()
  libro.creator = 'LexIT'
  libro.created = fecha

  const FILA_ENCABEZADO = 4
  const hoja = libro.addWorksheet('Matriz de desviaciones', {
    views: [{ state: 'frozen', ySplit: FILA_ENCABEZADO }],
    pageSetup: { orientation: 'landscape', paperSize: 9, fitToPage: true, fitToWidth: 1, fitToHeight: 0 }
  })
  hoja.pageSetup.printTitlesRow = `${FILA_ENCABEZADO}:${FILA_ENCABEZADO}`
  hoja.headerFooter.oddFooter = '&CGenerado por LexIT · Página &P de &N'

  hoja.columns = [
    { width: 6 },
    { width: 60 },
    { width: 16 },
    { width: 60 },
    { width: 42 }
  ]

  const bordeFinoXl = { style: 'thin' as const, color: { argb: `FF${BORDE}` } }
  const bordesXl = { top: bordeFinoXl, bottom: bordeFinoXl, left: bordeFinoXl, right: bordeFinoXl }

  const titulo = hoja.getCell('A1')
  titulo.value = 'Matriz de desviaciones'
  titulo.font = { name: 'Calibri', size: 16, bold: true, color: { argb: `FF${NAVY}` } }
  hoja.mergeCells('A1:E1')

  const sub = hoja.getCell('A2')
  sub.value = `Documento analizado: ${nombreDocumento}  ·  ${fechaLarga(fecha)}  ·  Generado por LexIT`
  sub.font = { name: 'Calibri', size: 10, color: { argb: 'FF555555' } }
  hoja.mergeCells('A2:E2')

  const encabezado = hoja.getRow(FILA_ENCABEZADO)
  encabezado.values = ENCABEZADOS
  encabezado.height = 30
  encabezado.eachCell(c => {
    c.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FFFFFFFF' } }
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: `FF${NAVY}` } }
    c.alignment = { vertical: 'middle', horizontal: 'left', wrapText: true }
    c.border = bordesXl
  })

  filas.forEach((f, i) => {
    const fila = hoja.getRow(FILA_ENCABEZADO + 1 + i)
    fila.values = [
      f.numero,
      f.textoOriginal ? `${f.clausula}\n“${f.textoOriginal}”` : f.clausula,
      ETIQUETA_NIVEL[f.nivel],
      f.aplicada ? `${f.modificacion}\n(Ya aplicada al documento)` : f.modificacion,
      f.sustento
    ]
    fila.eachCell({ includeEmpty: true }, (c, col) => {
      c.font = { name: 'Calibri', size: 10, color: { argb: 'FF2B2B2B' } }
      c.alignment = { vertical: 'top', horizontal: col === 1 || col === 3 ? 'center' : 'left', wrapText: true }
      c.border = bordesXl
    })
    const nivel = fila.getCell(3)
    nivel.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: `FF${TINTE_NIVEL[f.nivel].fondo}` } }
    nivel.font = { name: 'Calibri', size: 10, bold: true, color: { argb: `FF${TINTE_NIVEL[f.nivel].texto}` } }
    nivel.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true }
    if (f.sustento === SIN_SUSTENTO) {
      fila.getCell(5).font = { name: 'Calibri', size: 10, italic: true, color: { argb: 'FF6B6B6B' } }
    }
  })

  const filaAviso = hoja.getRow(FILA_ENCABEZADO + filas.length + 2)
  filaAviso.getCell(1).value = AVISO_MATRIZ
  filaAviso.getCell(1).font = { name: 'Calibri', size: 10, bold: true, italic: true, color: { argb: 'FF8A2E24' } }
  hoja.mergeCells(filaAviso.number, 1, filaAviso.number, 5)

  const buffer = await libro.xlsx.writeBuffer()
  return new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
}
