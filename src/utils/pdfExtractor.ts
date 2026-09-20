import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist'
import type { TextItem, TextMarkedContent } from 'pdfjs-dist/types/src/display/api'

GlobalWorkerOptions.workerSrc = new URL('/IA_Juridica_Front/pdf.worker.min.js', window.location.origin).href

// =========================
// LIMPIAR ARTEFACTOS TÍPICOS DE EXTRACCIÓN DE PDF
// Quita residuos que sobreviven al filtro de márgenes (números de página
// sueltos en su propia línea), sin tocar números que son parte real del
// texto legal (ej. "artículo 186", años, montos).
// =========================
function limpiarTextoPDF(texto: string): string {
  return texto
    // Encabezados/pies de página repetidos que se colaron pese al filtro
    // de posición (a veces quedan un poco más cerca del cuerpo del texto
    // de lo que cubre el margen). Se detectan porque se repiten en cada
    // página con un número de página pegado justo antes.
    .replace(/\d{0,4}\s*DECRETO LEGISLATIVO N[°º]\s*\d+\s*C[ÓO]DIGO PENAL/gi, '')
    .replace(/\d{0,4}\s*MINISTERIO DE JUSTICIA Y DERECHOS HUMANOS/gi, '')
    // Colapsa espacios y saltos de línea repetidos
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    // Números que quedan solos en su propia línea (residuo de numeración
    // de página que el filtro de márgenes no alcanzó a descartar)
    .replace(/(^|\n)[ \t]*\d{1,4}[ \t]*(?=\n|$)/g, '$1')
    .trim()
}

// =========================
// LÍMITES DE PÁRRAFO SEGÚN LA ESTRUCTURA ETIQUETADA (Tagged PDF)
// Algunos PDF (típicamente los exportados desde Word con accesibilidad
// activada) traen marcado explícitamente dónde empieza cada párrafo
// (<P> de la estructura), no solo texto suelto — una señal mucho más
// confiable que adivinar por la posición. pdf.js la expone intercalada en
// la propia lista de items cuando se pide includeMarkedContent: true,
// como eventos 'beginMarkedContentProps'/'endMarkedContent' entre los
// TextItem reales (no en un árbol aparte). Si el PDF no está etiquetado,
// ningún evento aparece y esInicioDeParrafo queda en false para todos los
// items — se sigue dependiendo enteramente de la heurística de posición
// de abajo, sin cambiar nada para esos documentos.
// =========================
interface ItemConLimite { item: TextItem; esInicioDeParrafo: boolean }

function esItemDeTexto(valor: TextItem | TextMarkedContent): valor is TextItem {
  return 'str' in valor && 'transform' in valor
}

// Exportada solo para poder verificar la lógica de límites de párrafo con
// el build de pdf.js para Node en scripts de verificación offline — la
// app real siempre usa extraerTextoPDF (build de navegador).
export function extraerItemsConLimitesDeParrafo(items: Array<TextItem | TextMarkedContent>): ItemConLimite[] {
  const resultado: ItemConLimite[] = []
  let pendienteNuevoParrafo = false

  for (const valor of items) {
    if (!esItemDeTexto(valor)) {
      // El tipo publicado de TextMarkedContent no declara "tag", pero el
      // objeto real sí lo trae para 'beginMarkedContentProps' (ver
      // node_modules/pdfjs-dist/types/src/display/api.d.ts) — se lee con
      // un cast puntual en vez de ampliar el tipo importado.
      const marcador = valor as TextMarkedContent & { tag?: string }
      if (marcador.type === 'beginMarkedContentProps' && marcador.tag === 'P') {
        pendienteNuevoParrafo = true
      }
      continue
    }
    resultado.push({ item: valor, esInicioDeParrafo: pendienteNuevoParrafo })
    pendienteNuevoParrafo = false
  }

  return resultado
}

// =========================
// RECONSTRUIR SALTOS DE LÍNEA/PÁRRAFO DE UNA PÁGINA
// pdf.js entrega el texto como una lista plana de bloques con su posición;
// no hay saltos de línea reales ahí. Se reconstruyen combinando tres
// señales: el aviso hasEOL que trae cada bloque (pdf.js ya detecta el
// final de línea internamente, más confiable que adivinar solo por
// posición), cuánto "cae" verticalmente el siguiente bloque respecto a la
// altura de línea típica de la página (la mediana de las alturas de los
// propios bloques, para no depender de un valor fijo que no sirva igual
// en un documento con letra grande que en uno con letra chica), y — si el
// PDF está etiquetado — el límite de párrafo real de la estructura
// (esInicioDeParrafo), que nunca REEMPLAZA a las otras dos, solo se suma
// como una razón más para cortar. Entre las heurísticas de posición se
// prefiere ser más agresivo separando en vez de menos — un párrafo de más
// partido en dos molesta menos que dos párrafos distintos pegados en uno.
// =========================
// Exportada por la misma razón que extraerItemsConLimitesDeParrafo (ver arriba).
export function textoDePaginaConSaltos(itemsConLimites: ItemConLimite[]): string {
  const conTexto = itemsConLimites.filter(({ item }) => item.str.length > 0)
  if (conTexto.length === 0) return ''

  const alturas = conTexto.map(({ item }) => item.height).filter(h => h > 0).sort((a, b) => a - b)
  const alturaLinea = alturas.length > 0 ? alturas[Math.floor(alturas.length / 2)]! : 12

  let resultado = ''
  let yAnterior: number | null = null
  let finDeLineaAnterior = false

  for (const { item, esInicioDeParrafo } of conTexto) {
    const y = item.transform[5]

    if (yAnterior === null) {
      resultado += item.str
    } else {
      const salto = yAnterior - y
      const esNuevaLinea = finDeLineaAnterior || salto > alturaLinea * 0.4
      const esNuevoParrafo = esInicioDeParrafo || salto > alturaLinea * 1.3

      if (esNuevoParrafo) {
        resultado += '\n\n' + item.str
      } else if (esNuevaLinea) {
        resultado += '\n' + item.str
      } else {
        const necesitaEspacio = !resultado.endsWith(' ') && !resultado.endsWith('\n') && !item.str.startsWith(' ')
        resultado += (necesitaEspacio ? ' ' : '') + item.str
      }
    }

    yAnterior = y
    finDeLineaAnterior = item.hasEOL
  }

  return resultado
}

// =========================
// EXTRAER TEXTO DEL PDF
// Descarta el texto que cae en la franja superior/inferior de cada página
// (donde normalmente viven encabezados y pies de página, como números de
// página o el título repetido de la norma), usando la posición real del
// texto en vez de intentar adivinar por contenido.
// =========================
export async function extraerTextoPDF(
  archivo: File,
  onProgress?: (pagina: number, total: number) => void
): Promise<string> {
  const arrayBuffer = await archivo.arrayBuffer()
  const pdf = await getDocument({ data: arrayBuffer }).promise
  let textoCompleto = ''

  for (let i = 1; i <= pdf.numPages; i++) {
    onProgress?.(i, pdf.numPages)

    const page = await pdf.getPage(i)
    const viewport = page.getViewport({ scale: 1 })
    // includeMarkedContent: true trae, intercalados con los TextItem de
    // siempre, los límites de párrafo reales si el PDF está etiquetado
    // (ver extraerItemsConLimitesDeParrafo) — no cambia nada del texto en
    // sí, solo agrega esa señal extra cuando existe.
    const content = await page.getTextContent({ includeMarkedContent: true, disableCombineTextItems: false })

    // Margen (9% del alto de página) donde se descarta el texto: ahí es
    // donde casi siempre están los encabezados y pies de página.
    const MARGEN = viewport.height * 0.09

    const items = extraerItemsConLimitesDeParrafo(content.items)
      .filter(({ item }) => {
        const y = item.transform[5]
        return y > MARGEN && y < (viewport.height - MARGEN)
      })

    const textoPagina = textoDePaginaConSaltos(items)

    // Cada página termina en punto: evita que dividirEnChunks fusione el
    // final de una página con el encabezado/inicio de la siguiente en un
    // solo bloque, ya que el chunking corta por oraciones (. ! ?). La
    // reconstrucción de saltos de arriba es por página — no hay forma de
    // comparar la posición del último bloque de una página con el primero
    // de la siguiente — así que el límite entre páginas sigue marcándose
    // así, a propósito.
    textoCompleto += textoPagina.trim() + '. \n\n'
  }

  return limpiarTextoPDF(textoCompleto.trim())
}
