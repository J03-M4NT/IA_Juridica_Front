import { Pinecone } from '@pinecone-database/pinecone'
import * as logger from 'firebase-functions/logger'
import {
  PINECONE_API_KEY,
  PINECONE_HOST,
  PINECONE_INDEX,
  buscarEnPineconeInterno,
  tieneEncabezadoDeArticulo,
  tipoDocumentoEnPregunta
} from './consultarLexit'
import { normaEnPregunta } from './especialidades'

// =========================
// VERIFICAR LAS NORMAS CITADAS EN UN TEXTO (Redacción avanzada)
// Se detectan las citas con expresiones regulares ("artículo 1969 del
// Código Civil", "Ley N° 27444", "D.S. 004-2019-JUS") y se buscan en la
// base jurídica de LexIT (catálogo normas_indexadas + Pinecone). El
// resultado es "encontrada" o "no_encontrada en la base": nunca se afirma
// que una norma no existe, solo que no está en la base (puede existir y
// no haberse subido).
// =========================

export interface NormaVerificada {
  cita: string
  estado: 'encontrada' | 'no_encontrada'
  // Nombre de la norma en la base y extracto del artículo, si se encontró
  documento?: string
  extracto?: string
}

const MAX_CITAS = 6
const MAX_EXTRACTO = 320

// "artículo 1969 del Código Civil", "art. 2 inciso 20 de la Constitución",
// "artículo 106 de la Ley N° 27444"
const RE_ARTICULO = /\bart(?:[íi]culo|\.)\s*(\d{1,4})\s*[°º]?(?:\s*-\s*[A-Z])?(?:\s*,?\s*(?:inciso|inc\.|numeral)\s*[\d.]+)?\s+(?:del?|de la)\s+((?:C[óo]digo\s+(?:Civil|Penal|Tributario|Procesal\s+Civil|Procesal\s+Penal|de\s+Trabajo|Laboral)|Constituci[óo]n(?:\s+Pol[íi]tica(?:\s+del\s+Per[úu])?)?|(?:Ley|Decreto\s+Legislativo|Decreto\s+Supremo|Decreto\s+de\s+Urgencia|D\.\s*Leg\.|D\.\s*S\.|D\.\s*U\.)\s*(?:N[°º.]?\s*)?[\d-]+[A-Z-]*))/gi

// "Ley N° 27444", "Decreto Legislativo 1057", "D.S. N° 004-2019-JUS"
const RE_NORMA = /\b(?:Ley|Decreto\s+Legislativo|Decreto\s+Supremo|Decreto\s+de\s+Urgencia|D\.\s*Leg\.|D\.\s*S\.|D\.\s*U\.)\s*(?:N[°º.]?\s*|Nro\.?\s*)?\d{3,6}(?:-\d{4}-[A-Z]{2,10})?/gi

interface CitaDetectada {
  texto: string
  articulo?: number
  norma: string
}

export function detectarCitas(texto: string): CitaDetectada[] {
  const citas: CitaDetectada[] = []
  const vistas = new Set<string>()
  const agregar = (c: CitaDetectada) => {
    const clave = `${c.articulo ?? ''}|${c.norma.toLowerCase().replace(/\s+/g, ' ')}`
    if (vistas.has(clave)) return
    vistas.add(clave)
    citas.push(c)
  }
  const tramosArticulo: [number, number][] = []
  for (const m of texto.matchAll(RE_ARTICULO)) {
    if (m.index === undefined || !m[1] || !m[2]) continue
    tramosArticulo.push([m.index, m.index + m[0].length])
    agregar({ texto: m[0].trim(), articulo: Number(m[1]), norma: m[2].trim() })
  }
  for (const m of texto.matchAll(RE_NORMA)) {
    const inicio = m.index
    if (inicio === undefined) continue
    // Ya contada como parte de "artículo X de la Ley N°..."
    if (tramosArticulo.some(([ini, fin]) => inicio >= ini && inicio < fin)) continue
    agregar({ texto: m[0].trim(), norma: m[0].trim() })
  }
  return citas.slice(0, MAX_CITAS)
}

const recortar = (t: string) => (t.length > MAX_EXTRACTO ? `${t.slice(0, MAX_EXTRACTO).trimEnd()}…` : t)

async function verificarCita(idx: ReturnType<Pinecone['index']>, cita: CitaDetectada): Promise<NormaVerificada> {
  const noEncontrada: NormaVerificada = { cita: cita.texto, estado: 'no_encontrada' }
  const codigo = tipoDocumentoEnPregunta(cita.norma)
  const normaCatalogo = codigo ? undefined : await normaEnPregunta(cita.norma)

  if (cita.articulo !== undefined) {
    // Un artículo: tiene que estar en la norma indicada (código o ley del catálogo)
    if (!codigo && !normaCatalogo) return noEncontrada
    const fragmentos = await buscarEnPineconeInterno(
      idx,
      `Artículo ${cita.articulo}`,
      3,
      cita.articulo,
      codigo,
      normaCatalogo ? { documentoId: normaCatalogo.documentoId } : {}
    )
    const articulo = fragmentos.find(f =>
      f.numeroArticulo === cita.articulo &&
      tieneEncabezadoDeArticulo(f) &&
      (!codigo || f.tipoDocumento === codigo) &&
      (!normaCatalogo || f.documentoId === normaCatalogo.documentoId))
    return articulo
      ? { cita: cita.texto, estado: 'encontrada', documento: articulo.nombreDocumento, extracto: recortar(articulo.texto) }
      : noEncontrada
  }

  // Una norma sin artículo: basta con que esté en el catálogo de la base
  return normaCatalogo ? { cita: cita.texto, estado: 'encontrada', documento: normaCatalogo.nombre } : noEncontrada
}

/** Verifica las citas de uno o más textos (sin repetir). Si la base no responde, devuelve lista vacía. */
export async function verificarNormasCitadas(...textos: string[]): Promise<NormaVerificada[]> {
  const citas = detectarCitas(textos.filter(Boolean).join('\n'))
  if (citas.length === 0) return []
  try {
    const idx = new Pinecone({ apiKey: PINECONE_API_KEY.value() }).index(PINECONE_INDEX, PINECONE_HOST)
    return await Promise.all(citas.map(c => verificarCita(idx, c).catch(() => ({ cita: c.texto, estado: 'no_encontrada' as const }))))
  } catch (err) {
    logger.warn('⚠️ No se pudieron verificar las normas citadas:', (err as Error).message)
    return []
  }
}
