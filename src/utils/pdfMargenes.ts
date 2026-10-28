// =========================
// MÁRGENES DE UN PDF: ¿encabezado/pie repetido o texto real?
// El extractor descarta la franja superior e inferior de cada página (9 % del
// alto), donde viven encabezados, pies y números de página. Pero a veces el
// encabezado de un artículo cae justo ahí y se pierde (13 artículos del
// Código Civil). Esto separa las líneas del margen que se REPITEN entre
// páginas (encabezados, pies, números) de las que aparecen una sola vez
// (texto real), para conservar solo estas últimas.
// Puro: sin DOM ni pdf.js.
// =========================

export interface PaginaConMargen {
  pagina: number
  alto: number
  items: Array<{ str: string; y: number }>
}

export const PROPORCION_MARGEN = 0.09
// Una línea que aparece en el margen de esta cantidad de páginas o más es
// un encabezado o pie de página
const MIN_PAGINAS_REPETIDA = 3
// Claves muy cortas ("347", "Pág.") no se pueden distinguir: se descartan
const MIN_LETRAS_CLAVE = 8

// Clave para comparar líneas entre páginas: sin números (cambian de página
// en página), sin tildes ni espacios (los pies del MINJUS salen con letras
// separadas: "Dec R et O Leg I s L at I v O").
function claveDeLinea(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-zñ]/g, '')
}

// Devuelve "página:y" de las líneas del margen que se conservan
export function lineasDeMargenQueSeConservan(paginas: PaginaConMargen[], proporcion = PROPORCION_MARGEN): Set<string> {
  const lineas: Array<{ id: string; clave: string }> = []
  const paginasPorClave = new Map<string, Set<number>>()

  for (const { pagina, alto, items } of paginas) {
    const margen = alto * proporcion
    const porY = new Map<number, string[]>()
    for (const { str, y } of items) {
      if (y > margen && y < alto - margen) continue
      const fila = Math.round(y)
      porY.set(fila, [...(porY.get(fila) ?? []), str])
    }
    for (const [y, textos] of porY) {
      const clave = claveDeLinea(textos.join(' '))
      lineas.push({ id: `${pagina}:${y}`, clave })
      if (clave.length >= MIN_LETRAS_CLAVE) {
        const conjunto = paginasPorClave.get(clave) ?? new Set<number>()
        conjunto.add(pagina)
        paginasPorClave.set(clave, conjunto)
      }
    }
  }

  const conservar = new Set<string>()
  for (const { id, clave } of lineas) {
    if (clave.length < MIN_LETRAS_CLAVE) continue
    if ((paginasPorClave.get(clave)?.size ?? 0) < MIN_PAGINAS_REPETIDA) conservar.add(id)
  }
  return conservar
}
