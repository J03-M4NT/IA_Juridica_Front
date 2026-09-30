// =========================
// BUSCAR/REEMPLAZAR/RESALTAR TEXTO DENTRO DE HTML REAL (documentos Word)
// Sin dependencias de Vue/Pinia — DOM estándar puro, así se puede testear
// también desde Node (jsdom). Es el equivalente, para HTML real, de lo que
// textoAHtmlConMarcas hace para texto plano en ConsultasPage.vue (ese sigue
// sin cambios — es el camino PDF).
// =========================

interface EntradaMapa { nodo: Text; inicioTexto: number; finTexto: number }
interface ResultadoWalk { texto: string; mapa: EntradaMapa[] }

const TAGS_BLOQUE = new Set(['p', 'li', 'tr', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'div', 'blockquote'])

// Recorre el árbol y construye, en una sola pasada, el texto plano visible
// Y un mapa que dice qué nodo de texto real (y qué offset dentro de él)
// corresponde a cada posición de ese texto plano. Reemplazo y resaltado
// SIEMPRE parten de este mismo mapa — dos implementaciones separadas que
// "deberían coincidir" podrían desincronizarse silenciosamente.
function walkTextoConMapa(root: Node): ResultadoWalk {
  let texto = ''
  const mapa: EntradaMapa[] = []

  function visitar(nodo: Node) {
    if (nodo instanceof Element) {
      const tag = nodo.tagName.toLowerCase()
      if (tag === 'style' || tag === 'script') return
      if (tag === 'br') { texto += '\n'; return }
      // Separador de párrafo ANTES de descender, solo si ya hay contenido
      // — nunca al principio, evita tener que hacer trim() de cabecera,
      // que desplazaría los offsets ya grabados en el mapa.
      if (TAGS_BLOQUE.has(tag) && texto.length > 0 && !texto.endsWith('\n\n')) {
        texto += '\n\n'
      }
      nodo.childNodes.forEach(visitar)
      return
    }
    if (nodo.nodeType === Node.TEXT_NODE) {
      const contenido = nodo.textContent ?? ''
      if (!contenido) return
      mapa.push({ nodo: nodo as Text, inicioTexto: texto.length, finTexto: texto.length + contenido.length })
      texto += contenido
    }
  }

  visitar(root)
  // Solo trim() de COLA es seguro (no desplaza offsets ya grabados).
  return { texto: texto.replace(/\s+$/, ''), mapa }
}

function crearContenedor(html: string): HTMLDivElement {
  const contenedor = document.createElement('div')
  contenedor.innerHTML = html
  return contenedor
}

interface Ubicacion {
  inicio: { nodo: Text; offset: number }
  fin: { nodo: Text; offset: number }
}

function ubicarRango(mapa: EntradaMapa[], texto: string, buscado: string): Ubicacion | null {
  const objetivo = buscado.trim()
  if (!objetivo) return null

  const idx = texto.indexOf(objetivo)
  if (idx === -1) return null
  const finIdx = idx + objetivo.length

  const entradaInicio = mapa.find(e => idx >= e.inicioTexto && idx < e.finTexto)
  // El fin puede caer justo en el límite de un nodo (finIdx === e.finTexto de
  // un nodo y también === inicioTexto del siguiente) — buscamos por el
  // último carácter incluido (finIdx - 1), no por finIdx en sí.
  const entradaFin = mapa.find(e => (finIdx - 1) >= e.inicioTexto && (finIdx - 1) < e.finTexto)

  // idx/finIdx pueden caer sobre un separador de párrafo sintético (sin
  // nodo de texto real detrás) — no localizable en ese caso.
  if (!entradaInicio || !entradaFin) return null

  return {
    inicio: { nodo: entradaInicio.nodo, offset: idx - entradaInicio.inicioTexto },
    fin: { nodo: entradaFin.nodo, offset: finIdx - entradaFin.inicioTexto }
  }
}

// Texto plano visible de un HTML — es la fuente que se usa como contexto
// para Gemini/Pinecone cuando el documento adjunto es un Word (ver
// sincronizarTextoDesdeHtml en analisis-contratos-store.ts).
export function extraerTextoVisibleDeHtml(html: string): string {
  return walkTextoConMapa(crearContenedor(html)).texto
}

export interface ResultadoReemplazo { html: string; ok: boolean }

// Reemplaza la primera ocurrencia de textoOriginal por textoNuevo dentro
// del HTML, buscando por el texto visible (ignorando tags) y mutando solo
// esa porción — el texto buscado puede estar repartido entre etiquetas
// (ej. una palabra en <strong> a mitad de frase). Se usa deleteContents +
// insertNode, NO surroundContents (ver resaltarEnHtml para la razón).
export function reemplazarEnHtml(html: string, textoOriginal: string, textoNuevo: string): ResultadoReemplazo {
  const contenedor = crearContenedor(html)
  const { texto, mapa } = walkTextoConMapa(contenedor)
  const ubicacion = ubicarRango(mapa, texto, textoOriginal)
  if (!ubicacion) return { html, ok: false }

  const range = document.createRange()
  range.setStart(ubicacion.inicio.nodo, ubicacion.inicio.offset)
  range.setEnd(ubicacion.fin.nodo, ubicacion.fin.offset)
  range.deleteContents()
  range.insertNode(document.createTextNode(textoNuevo))

  return { html: contenedor.innerHTML, ok: true }
}

// Posición en el texto plano → nodos reales (como ubicarRango, pero con la
// posición ya calculada).
function ubicarPorPosicion(mapa: EntradaMapa[], idx: number, finIdx: number): Ubicacion | null {
  const entradaInicio = mapa.find(e => idx >= e.inicioTexto && idx < e.finTexto)
  const entradaFin = mapa.find(e => (finIdx - 1) >= e.inicioTexto && (finIdx - 1) < e.finTexto)
  if (!entradaInicio || !entradaFin) return null
  return {
    inicio: { nodo: entradaInicio.nodo, offset: idx - entradaInicio.inicioTexto },
    fin: { nodo: entradaFin.nodo, offset: finIdx - entradaFin.inicioTexto }
  }
}

// Patrón tolerante: cualquier espacio en blanco equivale a cualquier otro,
// y una línea para completar ("……", "_____", "-----") equivale a otra de
// distinto largo — la IA a veces no copia exacto la cantidad de puntos.
function fuenteFlexible(texto: string): string {
  return texto
    .split(/([.…_\-–]{3,}|\s+)/)
    .filter(p => p !== '')
    .map(p => {
      if (/^\s+$/.test(p)) return '\\s+'
      if (/^[.…_\-–]{3,}$/.test(p)) return '[.…_\\-–]{2,}'
      return p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    })
    .join('')
}

// Para cambios propuestos por la IA ("Completar con IA" en Contratos):
// - busca el texto exacto y, si no aparece, con el patrón tolerante (la IA
//   no siempre copia exacto cada espacio o punto);
// - reemplaza SOLO el tramo que cambia (sin el prefijo y sufijo comunes),
//   así el contexto que la IA copia alrededor (tabulaciones, negritas,
//   otras líneas) queda intacto y el texto nuevo toma el formato del lugar
//   exacto donde va.
export function reemplazarEnHtmlFlexible(html: string, textoOriginal: string, textoNuevo: string): ResultadoReemplazo {
  const buscado = textoOriginal.trim()
  const nuevo = textoNuevo.trim()
  if (!buscado) return { html, ok: false }
  if (buscado === nuevo) return { html, ok: true }

  // Qué cambia, según el propio "antes"/"después" de la IA.
  let prefijo = 0
  while (prefijo < buscado.length && prefijo < nuevo.length && buscado[prefijo] === nuevo[prefijo]) prefijo++
  let sufijo = 0
  while (
    sufijo < buscado.length - prefijo &&
    sufijo < nuevo.length - prefijo &&
    buscado[buscado.length - 1 - sufijo] === nuevo[nuevo.length - 1 - sufijo]
  ) sufijo++
  // Si solo se inserta texto (tramo vacío), se toma un carácter vecino para
  // tener dónde ubicarlo.
  if (prefijo + sufijo >= buscado.length) {
    if (prefijo > 0) prefijo--
    else sufijo--
  }
  const antesDelCambio = buscado.slice(0, prefijo)
  const tramo = buscado.slice(prefijo, buscado.length - sufijo)
  const despuesDelCambio = buscado.slice(buscado.length - sufijo)

  // Dónde está ese tramo en el documento: exacto, o con el patrón tolerante.
  const contenedor = crearContenedor(html)
  const { texto, mapa } = walkTextoConMapa(contenedor)
  let inicioTramo: number
  let finTramo: number
  let encontrado: string
  const exacto = texto.indexOf(buscado)
  if (exacto !== -1) {
    inicioTramo = exacto + prefijo
    finTramo = exacto + buscado.length - sufijo
    encontrado = buscado
  } else {
    const flexible = new RegExp(
      `(${fuenteFlexible(antesDelCambio)})(${fuenteFlexible(tramo)})(${fuenteFlexible(despuesDelCambio)})`
    ).exec(texto)
    if (!flexible) return { html, ok: false }
    inicioTramo = flexible.index + (flexible[1] ?? '').length
    finTramo = inicioTramo + (flexible[2] ?? '').length
    encontrado = flexible[0]
  }
  // Nunca a través de dos párrafos: unirlos rompería la correspondencia
  // con el Word original (data-p).
  if (encontrado.includes('\n\n') || finTramo <= inicioTramo) return { html, ok: false }

  const ubicacion = ubicarPorPosicion(mapa, inicioTramo, finTramo)
  if (!ubicacion) return { html, ok: false }

  const range = document.createRange()
  range.setStart(ubicacion.inicio.nodo, ubicacion.inicio.offset)
  range.setEnd(ubicacion.fin.nodo, ubicacion.fin.offset)
  range.deleteContents()
  range.insertNode(document.createTextNode(nuevo.slice(prefijo, nuevo.length - sufijo)))
  return { html: contenedor.innerHTML, ok: true }
}

export interface SugerenciaParaResaltar {
  id: string
  textoOriginal: string
  tipo: 'cambio' | 'riesgo'
  nivel?: string
}

// Envuelve en <mark> los tramos de sugerencias pendientes, análogo a lo
// que textoAHtmlConMarcas hace para texto plano — pero operando sobre el
// DOM real del documento Word en vez de reconstruir el HTML desde cero.
export function resaltarEnHtml(html: string, sugerencias: SugerenciaParaResaltar[]): string {
  const contenedor = crearContenedor(html)
  const { texto, mapa } = walkTextoConMapa(contenedor)

  // Mismo criterio de no-solape que textoAHtmlConMarcas: si dos tramos se
  // pisan, se queda el primero.
  const tramos: { inicio: number; fin: number; sugerencia: SugerenciaParaResaltar }[] = []
  for (const s of sugerencias) {
    if (!s.textoOriginal) continue
    const objetivo = s.textoOriginal.trim()
    const inicio = texto.indexOf(objetivo)
    if (inicio === -1) continue
    const fin = inicio + objetivo.length
    const solapa = tramos.some(t => inicio < t.fin && fin > t.inicio)
    if (!solapa) tramos.push({ inicio, fin, sugerencia: s })
  }

  // DESCENDENTE por posición — crítico. Todos los rangos se calcularon
  // arriba sobre UN solo walkTextoConMapa inicial, antes de mutar nada. Si
  // dos tramos comparten un mismo Text node en offsets consecutivos, mutar
  // el de más a la izquierda primero truncaría ese nodo y desplazaría los
  // offsets absolutos que el otro tramo ya calculó sobre el nodo original.
  // Mutando de derecha a izquierda, nada ANTES del punto ya mutado cambia,
  // así que los rangos pendientes siguen siendo válidos.
  tramos.sort((a, b) => b.inicio - a.inicio)

  for (const tramo of tramos) {
    const ubicacion = ubicarRango(mapa, texto, tramo.sugerencia.textoOriginal)
    if (!ubicacion) continue

    const range = document.createRange()
    range.setStart(ubicacion.inicio.nodo, ubicacion.inicio.offset)
    range.setEnd(ubicacion.fin.nodo, ubicacion.fin.offset)

    // extractContents() en vez de surroundContents(): si el rango cruza
    // parcialmente un nodo no-Text (ej. <strong> a mitad de frase),
    // surroundContents() lanza InvalidStateError. extractContents() clona
    // el ancestro parcialmente incluido para preservar la estructura, sin
    // esa restricción.
    const frag = range.extractContents()
    const mark = document.createElement('mark')
    mark.className = tramo.sugerencia.tipo === 'riesgo'
      ? `hl-riesgo hl-riesgo--${tramo.sugerencia.nivel ?? 'medio'}`
      : 'hl-cambio'
    mark.dataset.sugerenciaId = tramo.sugerencia.id
    mark.appendChild(frag)
    range.insertNode(mark)
  }

  return contenedor.innerHTML
}

// Desenvuelve las marcas de sugerencia (<mark data-sugerencia-id>) sin
// tocar el resto del markup — se usa antes de comitar una edición manual,
// para no persistir las marcas de preview como si fueran parte real del
// documento.
export function quitarMarcasSugerencia(html: string): string {
  const contenedor = crearContenedor(html)
  contenedor.querySelectorAll('mark[data-sugerencia-id]').forEach(mark => {
    mark.replaceWith(...Array.from(mark.childNodes))
  })
  return contenedor.innerHTML
}
