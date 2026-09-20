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
// sincronizarTextoDesdeHtml en consultas-store.ts).
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
