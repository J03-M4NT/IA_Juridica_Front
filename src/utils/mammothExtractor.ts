import * as mammoth from 'mammoth'
import JSZip from 'jszip'

// =========================
// ALINEACIÓN REAL DE PÁRRAFO (centrado / no justificado)
//
// mammoth SÍ lee la alineación real de cada párrafo del .docx (w:jc, ver
// node_modules/mammoth/lib/docx/body-reader.js) pero no la expone de
// ninguna forma en el HTML de salida — el DSL de styleMap solo puede
// matchear por styleId/styleName/nivel de lista (document-matchers.js),
// nunca por alineación. Se resuelve con options.transformDocument: se le
// asigna un styleId sintético a los párrafos "genéricos" (sin un
// styleName propio como Heading/List, que mammoth ya rutea solo con su
// style map por defecto) según su alineación real, y un styleMap propio
// rutea esos IDs a una clase CSS que documentExport.ts lee al reconstruir
// el .docx. mammoth aplica transformDocument una sola vez sobre el nodo
// raíz (ver lib/index.js: documentResult.map(options.transformDocument)),
// por eso hace falta recorrer children a mano.
// =========================

const ALINEACION_CENTRO_ID = 'MammothAlignCenter'
const ALINEACION_IZQUIERDA_ID = 'MammothAlignLeft'
const ALINEACION_JUSTIFICADA_ID = 'MammothAlignJustify'

// Exportado solo para poder verificar la lógica de alineación con el
// build de mammoth para Node (que espera {buffer}, no {arrayBuffer}) en
// scripts de verificación offline — la app real siempre usa
// extraerHtmlWord (build de navegador, {arrayBuffer}).
export const STYLE_MAP_ALINEACION = [
  `p.${ALINEACION_CENTRO_ID} => p.documento-align-center:fresh`,
  `p.${ALINEACION_IZQUIERDA_ID} => p.documento-align-left:fresh`,
  `p.${ALINEACION_JUSTIFICADA_ID} => p.documento-align-justify:fresh`
]

interface NodoMammoth {
  type: string
  styleName?: string | null
  styleId?: string | null
  alignment?: string | null
  numbering?: unknown
  children?: NodoMammoth[]
  [clave: string]: unknown
}

function tieneEstiloPropio(styleName: string | null | undefined): boolean {
  return !!styleName && styleName.trim().toLowerCase() !== 'normal'
}

// Marca la alineación real (o su ausencia) en un styleId sintético, SOLO
// para párrafos "genéricos": sin estilo nombrado propio (Heading/List/etc,
// que mammoth ya rutea con su style map por defecto) Y sin numbering
// (ítems de lista). Este segundo chequeo es crítico: un ítem de lista
// también es un "paragraph" y puede tener alineación explícita — si se le
// asigna un styleId acá, la regla de styleMap de arriba (que matchea SOLO
// por styleId, sin filtrar por lista) lo intercepta ANTES que la regla por
// defecto de mammoth para listas (p:ordered-list(1) => ol > li:fresh), y
// ese ítem se convierte en un <p> suelto en vez de <li> — rompiendo la
// lista (mammoth evalúa las reglas de styleMap en orden y usa la primera
// que matchea; las reglas propias van primero, antes que las de mammoth).
//
// Tampoco se asume que "sin alineación explícita" (w:jc ausente, el caso
// MÁS común en párrafos normales) sea "justificado" — es al revés: la
// alineación real de Word para un párrafo sin w:jc es izquierda. Por eso
// alignment === null NO se marca (documentExport.ts ya usa izquierda como
// default para lo no marcado) y alignment === 'both' (justificado
// explícito) SÍ se marca, para distinguirlo de "sin marcar".
function marcarAlineacionDeParrafo(nodo: NodoMammoth): NodoMammoth {
  if (nodo.type !== 'paragraph' || tieneEstiloPropio(nodo.styleName) || nodo.numbering) return nodo
  if (nodo.alignment === 'center') return { ...nodo, styleId: ALINEACION_CENTRO_ID }
  if (nodo.alignment === 'both') return { ...nodo, styleId: ALINEACION_JUSTIFICADA_ID }
  if (nodo.alignment) return { ...nodo, styleId: ALINEACION_IZQUIERDA_ID } // 'left' | 'right' | 'distribute' | ...
  return nodo
}

// mammoth.transforms.paragraph() haría este recorrido recursivo, pero no
// está en los tipos publicados de mammoth (solo en runtime) — se
// reimplementa a mano para no depender de una API no tipada. Exportado
// por la misma razón que STYLE_MAP_ALINEACION (ver arriba).
export function transformarConAlineacion(nodo: NodoMammoth): NodoMammoth {
  const conHijosTransformados: NodoMammoth = nodo.children
    ? { ...nodo, children: nodo.children.map(transformarConAlineacion) }
    : nodo
  return marcarAlineacionDeParrafo(conHijosTransformados)
}

// =========================
// FUENTE REAL DEL TEMA DEL DOCUMENTO
//
// A diferencia de la alineación, la fuente casi nunca viene como
// <w:rFonts> explícito en cada run — normalmente el texto hereda la
// fuente del TEMA del documento: word/styles.xml define un default
// (<w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:asciiTheme="minorHAnsi".../>)
// que se resuelve en word/theme/theme1.xml (<a:minorFont><a:latin
// typeface="..."/>). mammoth no expone esta cadena en absoluto — no es
// una propiedad de párrafo/run que su parser lea — así que hay que abrir
// el .docx como zip aparte y leerlo directo, con el DOMParser nativo del
// navegador (no hace falta ninguna librería de XML para esto).
// =========================

async function leerTextoDeZip(zip: JSZip, ruta: string): Promise<string | null> {
  const archivo = zip.file(ruta)
  return archivo ? archivo.async('text') : null
}

function resolverFuenteDeTema(temaXml: string, referencia: string): string | null {
  const tag = referencia === 'majorHAnsi' ? 'a:majorFont' : 'a:minorFont'
  const doc = new DOMParser().parseFromString(temaXml, 'text/xml')
  const latin = doc.getElementsByTagName(tag).item(0)?.getElementsByTagName('a:latin').item(0)
  return latin?.getAttribute('typeface') || null
}

// Devuelve la fuente real del documento (ej. "Aptos"), o null si no se
// pudo determinar (documento sin tema legible, muy viejo, o algo falla al
// leerlo) — en ese caso el llamador debe usar su propia fuente de respaldo.
export async function detectarFuenteDelTema(archivo: File): Promise<string | null> {
  try {
    const zip = await JSZip.loadAsync(await archivo.arrayBuffer())
    const stylesXml = await leerTextoDeZip(zip, 'word/styles.xml')
    if (!stylesXml) return null

    const stylesDoc = new DOMParser().parseFromString(stylesXml, 'text/xml')
    const rFontsPorDefecto = stylesDoc.getElementsByTagName('w:docDefaults').item(0)
      ?.getElementsByTagName('w:rPrDefault').item(0)
      ?.getElementsByTagName('w:rFonts').item(0)
    if (!rFontsPorDefecto) return null

    // w:ascii explícito (sin tema) es poco común pero, si está, es la
    // fuente real directamente, sin necesitar resolver el tema.
    const asciiDirecto = rFontsPorDefecto.getAttribute('w:ascii')
    if (asciiDirecto) return asciiDirecto

    const temaRef = rFontsPorDefecto.getAttribute('w:asciiTheme')
    if (temaRef !== 'minorHAnsi' && temaRef !== 'majorHAnsi') return null

    const temaXml = await leerTextoDeZip(zip, 'word/theme/theme1.xml')
    return temaXml ? resolverFuenteDeTema(temaXml, temaRef) : null
  } catch (err) {
    console.warn('No se pudo detectar la fuente del tema (se usará la de respaldo):', err)
    return null
  }
}

export interface DocumentoWordExtraido {
  html: string
  fuenteDetectada: string | null
}

// Extrae el HTML real de un .docx (listas, tablas, negritas, alineación de
// párrafo, etc. preservadas) más la fuente real del documento — corre
// 100% en el navegador, igual que pdfExtractor.ts corre pdf.js
// client-side para los PDF.
export async function extraerHtmlWord(archivo: File): Promise<DocumentoWordExtraido> {
  const arrayBuffer = await archivo.arrayBuffer()
  const [{ value: html, messages }, fuenteDetectada] = await Promise.all([
    mammoth.convertToHtml(
      { arrayBuffer },
      {
        styleMap: STYLE_MAP_ALINEACION,
        transformDocument: (elemento) => transformarConAlineacion(elemento as NodoMammoth)
      }
    ),
    detectarFuenteDelTema(archivo)
  ])
  if (messages.length) console.warn('Avisos de mammoth (no fatales):', messages)
  return { html, fuenteDetectada }
}
