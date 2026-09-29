// =========================
// EDICIÓN FIEL DEL WORD EN ANÁLISIS DE CONTRATOS
// El documento se muestra con docx-preview (ver vistaWord.ts) y se edita en
// pantalla, pero la descarga NO reconstruye el Word: se mandan solo los
// cambios de texto por párrafo, y la Cloud Function descargarWordEditado
// los aplica sobre el .docx original (functions/src/editarDocx.ts).
//
// Cada párrafo del cuerpo tiene data-p = su posición en word/document.xml
// (la pone vistaWord.ts al dibujarlo). La edición en pantalla no puede
// crear ni unir párrafos (ver onBeforeInputDocumento en
// AnalisisContratosPage.vue), así que cada marca sigue apuntando a su
// párrafo original.
// =========================

export interface CambioParrafo {
  antes: string
  despues: string
  // Posición del párrafo en word/document.xml (data-p). El servidor la usa
  // si el texto original en esa posición coincide con "antes"; si no,
  // busca el párrafo por su texto.
  indice?: number
  ocurrencia?: number
}

function crearContenedor(html: string): HTMLDivElement {
  const div = document.createElement('div')
  div.innerHTML = html
  return div
}

// Texto del párrafo tal como está escrito en el .docx:
// - sin las llamadas a nota al pie/final (docx-preview las dibuja como un
//   superíndice anidado <sup><sup>1</sup></sup>; en el .docx no son texto),
// - con los saltos de línea como espacio (igual que el servidor),
// - sin el texto de párrafos anidados (tienen su propia marca).
function textoPropio(bloque: Element): string {
  const copia = bloque.cloneNode(true) as Element
  copia.querySelectorAll('[data-p]').forEach(n => n.remove())
  copia.querySelectorAll('sup > sup').forEach(n => n.parentElement?.remove())
  copia.querySelectorAll('br').forEach(n => n.replaceWith(' '))
  return (copia.textContent ?? '').replace(/\s+/g, ' ').trim()
}

function textosPorMarca(html: string): Map<string, string> {
  const mapa = new Map<string, string>()
  crearContenedor(html).querySelectorAll('[data-p]').forEach(el => {
    const id = el.getAttribute('data-p')
    if (id !== null) mapa.set(id, textoPropio(el))
  })
  return mapa
}

// Cambios de texto entre el documento original y el editado, por párrafo.
// "ocurrencia" distingue párrafos con el mismo texto (ej. dos "Firma: ___")
// por si el servidor tiene que buscarlos por texto.
export function calcularCambios(htmlOriginal: string, htmlEditado: string): CambioParrafo[] {
  const originales = textosPorMarca(htmlOriginal)
  const editados = textosPorMarca(htmlEditado)
  const vistos = new Map<string, number>()
  const cambios: CambioParrafo[] = []

  for (const [id, antes] of originales) {
    const ocurrencia = vistos.get(antes) ?? 0
    vistos.set(antes, ocurrencia + 1)
    const despues = editados.get(id)
    if (despues === undefined || despues === antes || !antes) continue
    const indice = Number(id)
    cambios.push({
      antes,
      despues,
      ...(Number.isInteger(indice) ? { indice } : {}),
      ...(ocurrencia > 0 ? { ocurrencia } : {})
    })
  }
  return cambios
}
