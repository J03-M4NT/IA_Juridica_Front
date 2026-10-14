// =========================
// EXPORTAR LA COMPARACIÓN DE VERSIONES A WORD
// Tabla horizontal: cláusula, versión original, versión modificada,
// riesgo, explicación y recomendación. Las palabras eliminadas van
// tachadas en rojo y las agregadas subrayadas en verde, igual que en
// pantalla. Solo da forma a lo ya calculado; no llama a la IA.
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
import type { CambioClausula, TipoCambio } from './compararVersiones'
import type { ExplicacionCambio } from '../services/compararVersionesService'

export const PIE_COMPARACION = 'Generado por LexIT · Borrador de apoyo. Debe ser revisado por un abogado.'

const TEXTO = '1F2A33'
const GRIS = '6B6B6B'
const BORDE = 'C9C1B1'
const CABECERA = '1B2632'

const TINTE_NIVEL: Record<ExplicacionCambio['nivel'], { fondo: string; texto: string; etiqueta: string }> = {
  alto: { fondo: 'F3DCD8', texto: '8A2E24', etiqueta: 'Alto' },
  medio: { fondo: 'F6E9CC', texto: '7A5A12', etiqueta: 'Medio' },
  bajo: { fondo: 'DDEBDF', texto: '2F6B3A', etiqueta: 'Bajo' }
}

const ETIQUETA_TIPO: Record<TipoCambio, string> = {
  modificada: 'Modificada',
  agregada: 'Agregada',
  eliminada: 'Eliminada',
  sin_cambios: 'Sin cambios'
}

// A4 horizontal, márgenes de 1,5 cm: 16 838 − 2 × 850 = 15 138 twips útiles
const ANCHOS = [1900, 3600, 3600, 1100, 2988, 1950]
const ENCABEZADOS = ['Cláusula', 'Versión original', 'Versión modificada', 'Riesgo', 'Explicación', 'Recomendación']

const borde = { style: BorderStyle.SINGLE, size: 4, color: BORDE }
const bordes = { top: borde, bottom: borde, left: borde, right: borde }

function run(texto: string, o: { negrita?: boolean; cursiva?: boolean; color?: string; tamano?: number; tachado?: boolean; subrayado?: boolean; fondo?: string } = {}): TextRun {
  return new TextRun({
    text: texto,
    bold: o.negrita ?? false,
    italics: o.cursiva ?? false,
    color: o.color ?? TEXTO,
    size: o.tamano ?? 17,
    font: 'Calibri',
    ...(o.tachado ? { strike: true } : {}),
    ...(o.subrayado ? { underline: {} } : {}),
    ...(o.fondo ? { shading: { type: ShadingType.CLEAR, color: 'auto', fill: o.fondo } } : {})
  })
}

function celda(hijos: Paragraph[], ancho: number, o: { fondo?: string; centrado?: boolean } = {}): TableCell {
  return new TableCell({
    children: hijos,
    width: { size: ancho, type: WidthType.DXA },
    borders: bordes,
    margins: { top: 80, bottom: 80, left: 100, right: 100 },
    verticalAlign: o.centrado ? VerticalAlign.CENTER : VerticalAlign.TOP,
    ...(o.fondo ? { shading: { type: ShadingType.CLEAR, color: 'auto', fill: o.fondo } } : {})
  })
}

// Un párrafo por línea del texto, con las palabras cambiadas resaltadas
function parrafosResaltados(c: CambioClausula, lado: 'original' | 'modificada'): Paragraph[] {
  if ((lado === 'original' && c.tipo === 'agregada') || (lado === 'modificada' && c.tipo === 'eliminada')) {
    return [new Paragraph({ children: [run(lado === 'original' ? '(No existía)' : '(Se eliminó)', { cursiva: true, color: GRIS })] })]
  }
  const lineas: TextRun[][] = [[]]
  for (const tramo of c.tramos) {
    if (lado === 'original' && tramo.tipo === 'agregado') continue
    if (lado === 'modificada' && tramo.tipo === 'eliminado') continue
    const partes = tramo.texto.split('\n')
    partes.forEach((parte, i) => {
      if (i > 0) lineas.push([])
      if (!parte) return
      const actual = lineas[lineas.length - 1]!
      if (tramo.tipo === 'eliminado') actual.push(run(parte, { tachado: true, color: '8A2E24', fondo: 'F6E3E0' }))
      else if (tramo.tipo === 'agregado') actual.push(run(parte, { subrayado: true, color: '24552E', fondo: 'E2EFE4' }))
      else actual.push(run(parte))
    })
  }
  return lineas.map((runs, i) => new Paragraph({ spacing: { after: i < lineas.length - 1 ? 60 : 0 }, children: runs.length ? runs : [run('')] }))
}

function textoFavorece(f: ExplicacionCambio['favorece'], partes: { a: string; b: string }): string {
  if (f === 'parte_a') return partes.a || 'Parte A'
  if (f === 'parte_b') return partes.b || 'Parte B'
  if (f === 'neutral') return 'Neutral'
  return 'No determinable'
}

const fechaLarga = (fecha: Date) => fecha.toLocaleDateString('es-PE', { day: 'numeric', month: 'long', year: 'numeric' })
const sinExtension = (nombre: string) => nombre.replace(/\.docx?$/i, '')

export function nombreArchivoComparacion(nombreOriginal: string, nombreModificada: string): string {
  return `Comparación - ${sinExtension(nombreOriginal)} vs ${sinExtension(nombreModificada)}.docx`.slice(0, 180)
}

export async function comparacionAWord(
  cambios: CambioClausula[],
  explicaciones: Map<string, ExplicacionCambio>,
  partes: { a: string; b: string },
  nombres: { original: string; modificada: string },
  fecha = new Date()
): Promise<Blob> {
  const conCambios = cambios.filter(c => c.tipo !== 'sin_cambios')

  const cabecera = new TableRow({
    tableHeader: true,
    children: ENCABEZADOS.map((t, i) => celda([new Paragraph({ children: [run(t, { negrita: true, color: 'FFFFFF' })] })], ANCHOS[i]!, { fondo: CABECERA }))
  })

  const filas = conCambios.map(c => {
    const e = explicaciones.get(c.id)
    const tinte = e ? TINTE_NIVEL[e.nivel] : null
    const explicacion: Paragraph[] = e
      ? [
          new Paragraph({ spacing: { after: 60 }, children: [run(e.resumen)] }),
          new Paragraph({ spacing: { after: e.norma ? 60 : 0 }, children: [run('Favorece: ', { negrita: true }), run(textoFavorece(e.favorece, partes))] }),
          ...(e.norma ? [new Paragraph({ children: [run('Norma: ', { negrita: true }), run(e.norma)] })] : [])
        ]
      : [new Paragraph({ children: [run('Explicación no disponible', { cursiva: true, color: GRIS })] })]

    return new TableRow({
      cantSplit: false,
      children: [
        celda([
          new Paragraph({ spacing: { after: 40 }, children: [run(c.titulo, { negrita: true, color: CABECERA })] }),
          new Paragraph({ children: [run(ETIQUETA_TIPO[c.tipo], { color: GRIS, tamano: 15 })] })
        ], ANCHOS[0]!),
        celda(parrafosResaltados(c, 'original'), ANCHOS[1]!),
        celda(parrafosResaltados(c, 'modificada'), ANCHOS[2]!),
        celda(
          [new Paragraph({ alignment: AlignmentType.CENTER, children: [run(tinte ? tinte.etiqueta : '—', { negrita: true, color: tinte?.texto ?? GRIS })] })],
          ANCHOS[3]!,
          { centrado: true, ...(tinte ? { fondo: tinte.fondo } : {}) }
        ),
        celda(explicacion, ANCHOS[4]!),
        celda([new Paragraph({ children: [run(e?.recomendacion || '—', { color: e?.recomendacion ? TEXTO : GRIS })] })], ANCHOS[5]!)
      ]
    })
  })

  const doc = new Document({
    creator: 'LexIT',
    title: 'Comparación de versiones',
    sections: [{
      properties: {
        page: {
          size: { orientation: PageOrientation.LANDSCAPE },
          margin: { top: 850, bottom: 850, left: 850, right: 850 }
        }
      },
      headers: {
        default: new Header({
          children: [new Paragraph({
            border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: BORDE, space: 4 } },
            children: [run('Comparación de versiones', { negrita: true, color: CABECERA }), run(`   ·   ${fechaLarga(fecha)}`, { color: GRIS })]
          })]
        })
      },
      footers: {
        default: new Footer({
          children: [new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              run(`${PIE_COMPARACION}  ·  Página `, { color: GRIS, tamano: 15 }),
              new TextRun({ children: [PageNumber.CURRENT], size: 15, color: GRIS, font: 'Calibri' }),
              run(' de ', { color: GRIS, tamano: 15 }),
              new TextRun({ children: [PageNumber.TOTAL_PAGES], size: 15, color: GRIS, font: 'Calibri' })
            ]
          })]
        })
      },
      children: [
        new Paragraph({ spacing: { after: 80 }, children: [new TextRun({ text: 'Comparación de versiones', bold: true, size: 32, color: CABECERA, font: 'Georgia' })] }),
        new Paragraph({ spacing: { after: 40 }, children: [run('Versión original: ', { negrita: true, tamano: 19 }), run(nombres.original, { tamano: 19 })] }),
        new Paragraph({ spacing: { after: 40 }, children: [run('Versión modificada: ', { negrita: true, tamano: 19 }), run(nombres.modificada, { tamano: 19 })] }),
        new Paragraph({
          spacing: { after: 220 },
          children: [run(`${conCambios.length} ${conCambios.length === 1 ? 'cláusula con cambios' : 'cláusulas con cambios'} · Texto eliminado tachado, texto agregado subrayado`, { color: GRIS, tamano: 18 })]
        }),
        new Table({
          width: { size: ANCHOS.reduce((a, b) => a + b, 0), type: WidthType.DXA },
          columnWidths: ANCHOS,
          rows: [cabecera, ...filas]
        })
      ]
    }]
  })

  return Packer.toBlob(doc)
}
