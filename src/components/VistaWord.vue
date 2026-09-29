<template>
  <div ref="raizRef" class="vista-word">
    <div v-if="cargando" class="vista-word-cargando">
      <q-spinner-dots color="primary" size="34px" />
      <p>Cargando documento…</p>
    </div>
    <p v-if="aviso" class="vista-word-aviso">{{ aviso }}</p>
    <div class="vista-word-zoom" :style="{ zoom }">
      <div
        ref="documentoRef"
        class="vista-word-documento"
        :contenteditable="editable ? 'true' : 'false'"
        spellcheck="false"
        @beforeinput="onBeforeInput"
        @paste="onPaste"
        @drop.prevent
        @input="onInput"
        @blur="guardarPendiente"
      ></div>
    </div>
  </div>
</template>

<script setup lang="ts">
// =========================
// VISTA FIEL DE UN WORD (docx-preview), opcionalmente editable.
// Recibe el HTML y el CSS que genera utils/vistaWord.ts (renderizarWord) y
// lo muestra tal como es el documento: fuentes, tamaños, márgenes, tablas,
// encabezados, pies y logos. Con `editable`, solo se puede editar el TEXTO
// de cada párrafo (nada que cree, una o divida párrafos, ni que cambie
// formato), porque la descarga aplica los cambios sobre el .docx original
// párrafo por párrafo (utils/edicionWord.ts + Cloud Function
// descargarWordEditado). Emite `editar` con el HTML editado.
// Misma lógica que la vista del Word de AnalisisContratosPage.vue.
// =========================
import { ref, watch, onMounted, onUnmounted } from 'vue'

const props = withDefaults(defineProps<{
  html: string
  estilos: string
  editable?: boolean
}>(), { editable: false })

const emit = defineEmits<{ editar: [html: string] }>()

const raizRef = ref<HTMLElement | null>(null)
const documentoRef = ref<HTMLElement | null>(null)
const zoom = ref(1)
const cargando = ref(false)
const aviso = ref('')

// ---------- CSS del documento ----------
let estilo: HTMLStyleElement | null = null
watch(() => props.estilos, css => {
  if (!estilo) {
    estilo = document.createElement('style')
    estilo.setAttribute('data-vista-word', '')
    document.head.appendChild(estilo)
  }
  estilo.textContent = css
}, { immediate: true })

// ---------- Dibujar ----------
// HTML que el propio usuario acaba de escribir y se emitió: si vuelve por
// la prop, la pantalla ya lo muestra y no se redibuja (redibujar pierde el
// cursor y hace "saltar" la vista).
let htmlEmitido: string | null = null
let temporizadorEdicion: ReturnType<typeof setTimeout> | null = null

function esperarPintado(): Promise<void> {
  return new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())))
}

async function dibujar(html: string) {
  const el = documentoRef.value
  if (!el) return
  if (el.childNodes.length > 0 && html === htmlEmitido) return
  if (el.innerHTML === html) return
  // Insertar cientos de KB congela la pantalla un instante: primero se deja
  // pintar el aviso de carga.
  cargando.value = true
  const inicio = performance.now()
  await esperarPintado()
  const raiz = raizRef.value
  const scrollPrevio = raiz?.scrollTop ?? 0
  el.innerHTML = html
  if (raiz) raiz.scrollTop = scrollPrevio
  ajustarZoom()
  await esperarPintado()
  const restante = 400 - (performance.now() - inicio)
  if (restante > 0) await new Promise(resolve => setTimeout(resolve, restante))
  cargando.value = false
}

watch(() => props.html, html => { void dibujar(html) })

// ---------- Zoom: la hoja completa cabe en el ancho disponible ----------
function ajustarZoom() {
  const el = documentoRef.value
  const envoltorio = el?.parentElement
  const raiz = raizRef.value
  if (!el || !envoltorio || !raiz || !el.querySelector('section.docx')) return
  // Ancho real a tamaño natural, incluido lo que sobresale de la hoja.
  const zoomActual = zoom.value
  envoltorio.style.zoom = '1'
  const anchoContenido = el.scrollWidth
  envoltorio.style.zoom = String(zoomActual)
  const estiloRaiz = getComputedStyle(raiz)
  const disponible = raiz.clientWidth - parseFloat(estiloRaiz.paddingLeft) - parseFloat(estiloRaiz.paddingRight)
  if (anchoContenido <= 0 || disponible <= 0) return
  zoom.value = Math.min(1, Math.max(0.3, disponible / anchoContenido))
}

let observador: ResizeObserver | null = null
onMounted(() => {
  if (raizRef.value) {
    observador = new ResizeObserver(() => ajustarZoom())
    observador.observe(raizRef.value)
  }
  void dibujar(props.html)
})

onUnmounted(() => {
  observador?.disconnect()
  if (temporizadorEdicion) clearTimeout(temporizadorEdicion)
  estilo?.remove()
  estilo = null
})

// ---------- Edición ----------
function guardarPendiente() {
  if (temporizadorEdicion === null) return
  clearTimeout(temporizadorEdicion)
  temporizadorEdicion = null
  const el = documentoRef.value
  if (!el) return
  htmlEmitido = el.innerHTML
  emit('editar', htmlEmitido)
}

function onInput(event: Event) {
  if (!props.editable || (event as InputEvent).isComposing) return
  if (temporizadorEdicion) clearTimeout(temporizadorEdicion)
  // Se guarda al hacer una pausa al escribir (o al salir del documento).
  temporizadorEdicion = setTimeout(guardarPendiente, 400)
}

const ENTRADAS_BLOQUEADAS = new Set(['insertParagraph', 'insertLineBreak', 'insertFromDrop', 'insertHorizontalRule', 'insertOrderedList', 'insertUnorderedList'])
let temporizadorAviso: ReturnType<typeof setTimeout> | null = null

function avisar(mensaje: string) {
  aviso.value = mensaje
  if (temporizadorAviso) clearTimeout(temporizadorAviso)
  temporizadorAviso = setTimeout(() => { aviso.value = '' }, 4000)
}

function parrafoDe(nodo: Node | null): Element | null {
  const el = nodo instanceof Element ? nodo : nodo?.parentElement ?? null
  return el?.closest('[data-p]') ?? null
}

function onBeforeInput(event: InputEvent) {
  if (!props.editable) return
  if (ENTRADAS_BLOQUEADAS.has(event.inputType) || event.inputType.startsWith('format')) {
    event.preventDefault()
    avisar('Aquí solo se edita el texto de cada párrafo. Para agregar párrafos o cambiar formato, descarga el Word.')
    return
  }
  // Una selección que abarca dos párrafos, o Retroceso/Suprimir en el borde
  // de un párrafo, los uniría.
  for (const rango of event.getTargetRanges()) {
    const inicio = parrafoDe(rango.startContainer)
    const fin = parrafoDe(rango.endContainer)
    if (!inicio || !fin || inicio !== fin) {
      event.preventDefault()
      avisar('No se pueden unir ni borrar párrafos completos desde aquí. Edita el texto dentro de cada párrafo.')
      return
    }
  }
}

// Lo pegado entra como texto simple y en una sola línea.
function onPaste(event: ClipboardEvent) {
  if (!props.editable) return
  event.preventDefault()
  const texto = (event.clipboardData?.getData('text/plain') ?? '').replace(/\s*[\r\n]+\s*/g, ' ')
  if (texto) document.execCommand('insertText', false, texto)
}
</script>

<style scoped>
.vista-word {
  position: relative;
  height: 100%;
  overflow: auto;
  padding: 8px;
  background: #cfd0d4;
  border-radius: var(--border-radius-small, 8px);
}

.vista-word-cargando {
  position: absolute;
  inset: 0;
  z-index: 2;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  background: #f3f1ec;
  font-family: 'Figtree', sans-serif;
  font-size: 0.9rem;
  color: #6a6a72;
}

.vista-word-cargando p { margin: 0; }

.vista-word-aviso {
  position: sticky;
  top: 0;
  z-index: 1;
  margin: 0 0 8px;
  padding: 8px 12px;
  border-radius: 6px;
  background: #fdf1e6;
  color: #7a3d14;
  font-family: 'Figtree', sans-serif;
  font-size: 0.8rem;
}

.vista-word-documento {
  outline: none;
}

.vista-word-documento[contenteditable='true'] { cursor: text; }

/* Crece hasta la hoja más ancha: si el contenedor la centra y la hoja es
   más ancha, lo que sobresale a la izquierda queda cortado. */
.vista-word-documento :deep(.docx-wrapper) {
  padding: 8px;
  background: transparent;
  width: max-content;
  min-width: 100%;
  box-sizing: border-box;
}

.vista-word-documento :deep(section.docx) {
  margin-bottom: 14px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
  /* docx-preview corta lo que sobresale de la hoja; Word lo muestra. */
  overflow: visible;
}

.vista-word-documento :deep(table) { max-width: none; }

.vista-word-documento :deep(header),
.vista-word-documento :deep(footer) { cursor: default; }
</style>
