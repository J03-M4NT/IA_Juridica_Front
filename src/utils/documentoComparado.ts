// =========================
// DOCUMENTO COMPARADO (tercer documento)
// El contrato completo, en orden, con los cambios de la otra parte
// resaltados dentro del propio texto: lo eliminado tachado y lo agregado
// subrayado, como el "Comparar" de Word. Se arma con lo que ya calculó
// utils/compararVersiones.ts (no vuelve a comparar ni llama a la IA).
//
// La descarga es un Word con CONTROL DE CAMBIOS reales (w:ins / w:del):
// el abogado puede aceptar o rechazar cada cambio en Word, y la
// explicación de riesgo de la IA va como comentario en cada cláusula.
// =========================
import { diffWordsWithSpace } from 'diff'
import {
  AlignmentType,
  BorderStyle,
  CommentRangeEnd,
  CommentRangeStart,
  CommentReference,
  DeletedTextRun,
  Document,
  Footer,
  Header,
  InsertedTextRun,
  Packer,
  PageNumber,
  Paragraph,
  TextRun,
  type ICommentOptions,
  type ParagraphChild
} from 'docx'
import type { CambioClausula, TramoDiff } from './compararVersiones'
import type { ExplicacionCambio } from '../services/compararVersionesService'

export interface LineaComparada {
  piezas: TramoDiff[]
  // Título de sección ("OBLIGACIONES DEL ARRENDATARIO"): va en negrita
  seccion: boolean
  // La línea entera es nueva o se quitó (para marcar el párrafo completo)
  completa: 'agregado' | 'eliminado' | null
}

function lineaSeccion(c: CambioClausula): TramoDiff[] {
  const antes = c.tipo === 'agregada' ? '' : c.seccionOriginal ?? ''
  const despues = c.tipo === 'eliminada' ? '' : c.seccionModificada ?? ''
  if (!antes && !despues) return []
  if (antes === despues) return [{ texto: antes, tipo: 'igual' }]
  if (!antes) return [{ texto: despues, tipo: 'agregado' }]
  if (!despues) return [{ texto: antes, tipo: 'eliminado' }]
  return diffWordsWithSpace(antes, despues).map(parte => ({
    texto: parte.value,
    tipo: parte.added ? 'agregado' : parte.removed ? 'eliminado' : 'igual'
  }))
}

function completa(piezas: TramoDiff[]): LineaComparada['completa'] {
  const conTexto = piezas.filter(p => p.texto.trim())
  if (conTexto.length === 0) return null
  if (conTexto.every(p => p.tipo === 'agregado')) return 'agregado'
  if (conTexto.every(p => p.tipo === 'eliminado')) return 'eliminado'
  return null
}

/** Párrafos de una cláusula con sus cambios marcados, en el orden del documento. */
export function lineasComparadas(c: CambioClausula): LineaComparada[] {
  const lineas: LineaComparada[] = []
  const seccion = lineaSeccion(c)
  if (seccion.length) lineas.push({ piezas: seccion, seccion: true, completa: completa(seccion) })

  let actual: TramoDiff[] = []
  const cerrar = () => {
    if (actual.some(p => p.texto.trim())) lineas.push({ piezas: actual, seccion: false, completa: completa(actual) })
    actual = []
  }
  for (const tramo of c.tramos) {
    tramo.texto.split('\n').forEach((parte, i) => {
      if (i > 0) cerrar()
      if (parte) actual.push({ texto: parte, tipo: tramo.tipo })
    })
  }
  cerrar()
  return lineas
}

// =========================
// DESCARGA EN WORD CON CONTROL DE CAMBIOS
// =========================
const TEXTO = '1F2A33'
const GRIS = '6B6B6B'
const BORDE = 'C9C1B1'
const CABECERA = '1B2632'
const FUENTE = 'Calibri'
const AUTOR_CAMBIOS = 'Versión modificada'
const AUTOR_COMENTARIOS = 'LexIT'

export const PIE_DOCUMENTO_COMPARADO = 'Generado por LexIT · Borrador de apoyo. Debe ser revisado por un abogado.'

const ETIQUETA_NIVEL: Record<ExplicacionCambio['nivel'], string> = { alto: 'Alto', medio: 'Medio', bajo: 'Bajo' }
const ETIQUETA_TIPO: Record<CambioClausula['tipo'], string> = {
  modificada: 'Cláusula modificada',
  agregada: 'Cláusula agregada',
  eliminada: 'Cláusula eliminada',
  sin_cambios: 'Sin cambios'
}

const sinExtension = (nombre: string) => nombre.replace(/\.docx?$/i, '')
const fechaLarga = (fecha: Date) => fecha.toLocaleDateString('es-PE', { day: 'numeric', month: 'long', year: 'numeric' })

export function nombreArchivoDocumentoComparado(nombreOriginal: string, nombreModificada: string): string {
  return `Documento comparado - ${sinExtension(nombreOriginal)} vs ${sinExtension(nombreModificada)}.docx`.slice(0, 180)
}

function textoFavorece(f: ExplicacionCambio['favorece'], partes: { a: string; b: string }): string {
  if (f === 'parte_a') return partes.a || 'Parte A'
  if (f === 'parte_b') return partes.b || 'Parte B'
  if (f === 'neutral') return 'Neutral'
  return 'No determinable'
}

const run = (texto: string, o: { negrita?: boolean; color?: string; tamano?: number; cursiva?: boolean } = {}) =>
  new TextRun({ text: texto, bold: o.negrita ?? false, italics: o.cursiva ?? false, color: o.color ?? TEXTO, size: o.tamano ?? 22, font: FUENTE })

export async function documentoComparadoAWord(
  cambios: CambioClausula[],
  explicaciones: Map<string, ExplicacionCambio>,
  partes: { a: string; b: string },
  nombres: { original: string; modificada: string },
  fecha = new Date()
): Promise<Blob> {
  const fechaIso = fecha.toISOString().replace(/\.\d{3}Z$/, 'Z')
  // Los ids de revisión no deben repetir los de los comentarios (0, 1, 2…)
  let idRevision = 10_000
  const revision = () => ({ id: idRevision++, author: AUTOR_CAMBIOS, date: fechaIso })

  const comentarios: ICommentOptions[] = []
  const conCambios = cambios.filter(c => c.tipo !== 'sin_cambios').length

  const cuerpo: Paragraph[] = []
  for (const c of cambios) {
    const lineas = lineasComparadas(c)
    if (lineas.length === 0) continue

    // Comentario de la IA sobre toda la cláusula cambiada
    const e = c.tipo !== 'sin_cambios' ? explicaciones.get(c.id) : undefined
    let idComentario: number | null = null
    if (e) {
      idComentario = comentarios.length
      comentarios.push({
        id: idComentario,
        author: AUTOR_COMENTARIOS,
        initials: 'LX',
        date: fecha,
        children: [
          new Paragraph({ children: [new TextRun({ text: `Riesgo ${ETIQUETA_NIVEL[e.nivel].toLowerCase()} · ${ETIQUETA_TIPO[c.tipo]}`, bold: true })] }),
          new Paragraph({ children: [new TextRun(e.resumen)] }),
          ...(e.recomendacion ? [new Paragraph({ children: [new TextRun({ text: 'Recomendación: ', bold: true }), new TextRun(e.recomendacion)] })] : []),
          new Paragraph({ children: [new TextRun({ text: 'Favorece: ', bold: true }), new TextRun(textoFavorece(e.favorece, partes))] }),
          ...(e.norma ? [new Paragraph({ children: [new TextRun({ text: 'Norma: ', bold: true }), new TextRun(e.norma)] })] : [])
        ]
      })
    }

    lineas.forEach((linea, i) => {
      const hijos: ParagraphChild[] = []
      if (idComentario !== null && i === 0) hijos.push(new CommentRangeStart(idComentario))
      for (const p of linea.piezas) {
        const opciones = { text: p.texto, bold: linea.seccion, size: 22, font: FUENTE, color: TEXTO }
        if (p.tipo === 'agregado') hijos.push(new InsertedTextRun({ ...opciones, ...revision() }))
        else if (p.tipo === 'eliminado') hijos.push(new DeletedTextRun({ ...opciones, ...revision() }))
        else hijos.push(new TextRun(opciones))
      }
      if (idComentario !== null && i === lineas.length - 1) {
        hijos.push(new CommentRangeEnd(idComentario), new TextRun({ children: [new CommentReference(idComentario)] }))
      }
      cuerpo.push(new Paragraph({
        alignment: linea.seccion ? AlignmentType.LEFT : AlignmentType.JUSTIFIED,
        spacing: { after: 140, line: 276 },
        // Párrafo entero nuevo o quitado: también su marca de párrafo, para
        // que al aceptar/rechazar no quede un párrafo vacío
        ...(linea.completa === 'agregado' ? { run: { insertion: revision() } } : {}),
        ...(linea.completa === 'eliminado' ? { run: { deletion: revision() } } : {}),
        children: hijos
      }))
    })
  }

  const doc = new Document({
    creator: 'LexIT',
    title: 'Documento comparado',
    comments: { children: comentarios },
    sections: [{
      properties: { page: { margin: { top: 1418, bottom: 1418, left: 1418, right: 1418 } } },
      headers: {
        default: new Header({
          children: [new Paragraph({
            border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: BORDE, space: 4 } },
            children: [run('Documento comparado', { negrita: true, color: CABECERA, tamano: 17 }), run(`   ·   ${fechaLarga(fecha)}`, { color: GRIS, tamano: 17 })]
          })]
        })
      },
      footers: {
        default: new Footer({
          children: [new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              run(`${PIE_DOCUMENTO_COMPARADO}  ·  Página `, { color: GRIS, tamano: 15 }),
              new TextRun({ children: [PageNumber.CURRENT], size: 15, color: GRIS, font: FUENTE }),
              run(' de ', { color: GRIS, tamano: 15 }),
              new TextRun({ children: [PageNumber.TOTAL_PAGES], size: 15, color: GRIS, font: FUENTE })
            ]
          })]
        })
      },
      children: [
        new Paragraph({ spacing: { after: 40 }, children: [run('Versión original: ', { negrita: true, tamano: 18, color: GRIS }), run(nombres.original, { tamano: 18, color: GRIS })] }),
        new Paragraph({ spacing: { after: 40 }, children: [run('Versión modificada: ', { negrita: true, tamano: 18, color: GRIS }), run(nombres.modificada, { tamano: 18, color: GRIS })] }),
        new Paragraph({
          spacing: { after: 320 },
          border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: BORDE, space: 8 } },
          children: [run(
            `${conCambios} ${conCambios === 1 ? 'cláusula con cambios' : 'cláusulas con cambios'}. Los cambios están en control de cambios (Revisar › Aceptar o Rechazar) y el análisis de riesgo va como comentario.`,
            { tamano: 18, color: GRIS, cursiva: true }
          )]
        }),
        ...cuerpo
      ]
    }]
  })

  return Packer.toBlob(doc)
}
