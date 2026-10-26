<template>
  <q-page class="redaccion-page">
    <!-- ====================== 1. ¿QUÉ DOCUMENTO NECESITAS? ====================== -->
    <section v-if="etapa === 'pedir'" class="rd-inicio" aria-labelledby="rd-titulo">
      <h1 id="rd-titulo" class="page-title rd-titular">¿Qué documento necesitas?</h1>
      <p class="rd-bajada">
        Cartas, cargos, escritos, solicitudes, reclamos o descargos. Descríbelo con tus palabras y LexIT lo redacta;
        luego lo editas con un asistente que mejora la redacción y revisa las normas mientras escribes.
      </p>

      <!-- Cómo empezar: desde cero, sobre un escrito propio o respondiendo uno recibido -->
      <div class="rd-modos" role="tablist" aria-label="Cómo quieres empezar">
        <button
          v-for="m in MODOS"
          :key="m.valor"
          type="button"
          role="tab"
          class="rd-modo"
          :class="{ 'rd-modo--activo': modo === m.valor }"
          :aria-selected="modo === m.valor"
          :disabled="redactando"
          @click="cambiarModo(m.valor)"
        >
          <q-icon :name="m.icono" size="18px" aria-hidden="true" />
          <span>{{ m.etiqueta }}</span>
        </button>
      </div>

      <!-- Escrito subido (modos "trabajar" y "responder") -->
      <div v-if="modo !== 'nuevo'" class="rd-escrito">
        <input ref="selectorEscrito" type="file" accept=".pdf,.docx,.doc,.htm,.html" class="sr-only" @change="elegirEscrito">
        <button v-if="!escrito" type="button" class="rd-subir" :disabled="leyendoEscrito" @click="selectorEscrito?.click()">
          <q-spinner v-if="leyendoEscrito" size="18px" />
          <q-icon v-else name="upload_file" size="22px" aria-hidden="true" />
          <span>{{ leyendoEscrito ? 'Leyendo el escrito…' : (modo === 'responder' ? 'Sube el escrito que quieres responder' : 'Sube tu escrito') }}</span>
          <span class="rd-subir-formatos">PDF o Word (.docx)</span>
        </button>
        <div v-else class="rd-escrito-elegido">
          <q-icon name="description" size="20px" aria-hidden="true" />
          <span class="rd-escrito-nombre">{{ escrito.nombre }}</span>
          <span class="rd-escrito-tamano">{{ escrito.texto.length.toLocaleString('es-PE') }} caracteres</span>
          <button type="button" class="rd-boton-sec rd-boton--chico" :disabled="redactando" @click="quitarEscrito">Cambiar</button>
        </div>
      </div>

      <div class="rd-pedido">
        <label for="rd-pedido-texto" class="sr-only">Describe el documento que necesitas</label>
        <textarea
          id="rd-pedido-texto"
          v-model="pedido"
          class="rd-pedido-texto"
          rows="4"
          maxlength="2000"
          :placeholder="PLACEHOLDER[modo]"
          :disabled="redactando"
          @keydown.enter.exact.prevent="redactar"
        ></textarea>
        <div class="rd-pedido-pie">
          <span class="rd-contador">{{ pedido.length }} / 2000</span>
          <button type="button" class="rd-boton" :disabled="!puedeRedactar" @click="redactar">
            <q-spinner v-if="redactando" size="16px" />
            {{ redactando ? 'Redactando…' : textoBoton }}
          </button>
        </div>
      </div>

      <p v-if="errorRedaccion" class="rd-error" role="alert">{{ errorRedaccion }}</p>

      <router-link to="/app/contratos" class="rd-aviso">
        <q-icon name="info" size="18px" aria-hidden="true" />
        <span>Para <strong>contratos</strong>, no olvides que tenemos la sección especializada: <u>Gestión de contratos</u>.</span>
      </router-link>
    </section>

    <!-- ====================== 2. EDITOR + ASISTENTE EN VIVO ====================== -->
    <section v-else class="rd-trabajo">
      <header class="rd-cabecera">
        <div class="rd-cabecera-texto">
          <span class="rd-tipo">{{ tipoDocumento }}</span>
          <h1 class="rd-titulo-doc">{{ tituloDocumento }}</h1>
          <span v-if="escritoBase" class="rd-base">
            {{ escritoBase.modo === 'responder' ? 'Respuesta a' : 'Basado en' }}: {{ escritoBase.nombre }}
          </span>
        </div>
        <div class="rd-cabecera-acciones">
          <button type="button" class="rd-boton-sec" @click="nuevoDocumento">Nuevo documento</button>
          <button type="button" class="rd-boton" :disabled="descargando" @click="descargar">
            <q-spinner v-if="descargando" size="14px" />
            <q-icon v-else name="file_download" size="18px" />
            Descargar Word
          </button>
        </div>
      </header>

      <div class="rd-columnas">
        <EditorRedaccion ref="editorRef" v-model="html" class="rd-editor" @escribiendo="alEscribir" />

        <!-- Asistente en vivo -->
        <aside class="rd-asistente" aria-label="Asistente de redacción en vivo">
          <div class="rd-asistente-cabecera">
            <span class="rd-asistente-titulo">Asistente de redacción</span>
            <span class="rd-estado" :class="`rd-estado--${estadoVivo}`" role="status">
              <span class="rd-estado-punto" aria-hidden="true"></span>
              {{ TEXTO_ESTADO[estadoVivo] }}
            </span>
          </div>

          <!-- Sugerencia del párrafo en edición -->
          <div v-if="sugerenciaActual" class="rd-sugerencia">
            <span class="rd-etiqueta">Tu texto</span>
            <p class="rd-original">{{ recortar(sugerenciaActual.original, 220) }}</p>
            <span class="rd-etiqueta">Redacción sugerida</span>
            <p class="rd-propuesta">{{ sugerenciaActual.sugerencia }}</p>
            <p v-if="sugerenciaActual.motivo" class="rd-motivo">{{ sugerenciaActual.motivo }}</p>
            <p v-if="avisoAplicar" class="rd-aviso-aplicar">{{ avisoAplicar }}</p>
            <div class="rd-sugerencia-acciones">
              <button type="button" class="rd-boton rd-boton--chico" @click="aplicarSugerencia">Aplicar</button>
              <button type="button" class="rd-boton-sec rd-boton--chico" @click="descartarSugerencia">Descartar</button>
            </div>
          </div>
          <p v-else class="rd-vacio">
            {{ estadoVivo === 'limite' ? mensajeVivo : 'Escribe o edita un párrafo: al hacer una pausa, aquí verás una propuesta con redacción jurídica.' }}
          </p>

          <!-- Normas citadas en el documento -->
          <div class="rd-normas">
            <span class="rd-asistente-subtitulo">Normas citadas</span>
            <p v-if="normasLista.length === 0" class="rd-vacio">Aún no se detectan citas de normas en el documento.</p>
            <ul v-else class="rd-normas-lista">
              <li v-for="n in normasLista" :key="n.cita" class="rd-norma" :class="`rd-norma--${n.estado}`">
                <q-icon :name="n.estado === 'encontrada' ? 'verified' : 'help_outline'" size="18px" class="rd-norma-icono" />
                <div class="rd-norma-texto">
                  <span class="rd-norma-cita">{{ n.cita }}</span>
                  <span v-if="n.estado === 'encontrada'" class="rd-norma-detalle">Encontrada en la base jurídica<template v-if="n.documento"> · {{ n.documento }}</template></span>
                  <span v-else class="rd-norma-detalle">No está en nuestra base jurídica: verifícala en El Peruano o SPIJ antes de usarla.</span>
                  <details v-if="n.extracto" class="rd-norma-extracto">
                    <summary>Ver texto</summary>
                    <p>{{ n.extracto }}</p>
                  </details>
                </div>
              </li>
            </ul>
          </div>

          <details v-if="escritoBase?.modo === 'responder'" class="rd-recibido">
            <summary>Escrito recibido</summary>
            <p>{{ escritoBase.texto }}</p>
          </details>

          <p class="rd-nota">Borrador de apoyo. Debe ser revisado por un abogado.</p>
        </aside>
      </div>
    </section>
  </q-page>
</template>

<script setup lang="ts">
import { computed, onUnmounted, ref } from 'vue'
import { useQuasar } from 'quasar'
import EditorRedaccion, { type ParrafoEnEdicion } from '../components/Redaccion/EditorRedaccion.vue'
import {
  ErrorLimiteSugerencias,
  redactarDocumento,
  sugerirRedaccion,
  type NormaVerificada
} from '../services/redaccionService'
import { bloquesAHtml, redaccionAWord } from '../utils/exportarRedaccion'
import { extraerTextoNorma } from '../utils/extraerTextoNorma'
import { extraerHtmlWord } from '../utils/mammothExtractor'

// =========================
// REDACCIÓN AVANZADA
// 1) El usuario describe el documento → la IA redacta el borrador.
// 2) Se edita en un editor tipo Word; al hacer una pausa al escribir, el
//    asistente propone una mejor redacción del párrafo y revisa las normas
//    citadas contra la base jurídica.
// =========================

const etapa = ref<'pedir' | 'editar'>('pedir')
const pedido = ref('')
const redactando = ref(false)
const errorRedaccion = ref('')

const html = ref('')
const tipoDocumento = ref('Documento')
const tituloDocumento = ref('Documento')

// ----- Cómo empezar -----
type Modo = 'nuevo' | 'trabajar' | 'responder'
const MODOS: Array<{ valor: Modo; etiqueta: string; icono: string }> = [
  { valor: 'nuevo', etiqueta: 'Redactar desde cero', icono: 'edit_note' },
  { valor: 'trabajar', etiqueta: 'Trabajar sobre un escrito', icono: 'upload_file' },
  { valor: 'responder', etiqueta: 'Responder un escrito', icono: 'reply' }
]
const PLACEHOLDER: Record<Modo, string> = {
  nuevo: 'Ej.: Quiero una carta a la Municipalidad de La Molina reclamando que mi predio se inunda por una tubería rota en la vía pública.',
  trabajar: 'Opcional. Ej.: mejora la redacción, agrega un fundamento sobre el plazo vencido, cámbialo a carta notarial... Si lo dejas vacío, el escrito se abre tal cual en el editor.',
  responder: 'Opcional. Tu posición y los datos que quieras incluir. Ej.: negamos la deuda porque ya se pagó el 10/09 con la transferencia N° 123; pedimos que se archive.'
}
const modo = ref<Modo>('nuevo')

interface EscritoSubido { nombre: string; texto: string; html: string | null }
const escrito = ref<EscritoSubido | null>(null)
// El escrito con el que se armó el documento en edición (para la cabecera)
const escritoBase = ref<(EscritoSubido & { modo: Modo }) | null>(null)
const leyendoEscrito = ref(false)
const selectorEscrito = ref<HTMLInputElement | null>(null)

function cambiarModo(nuevo: Modo) {
  modo.value = nuevo
  errorRedaccion.value = ''
}

async function elegirEscrito(e: Event) {
  const archivo = (e.target as HTMLInputElement).files?.[0]
  if (selectorEscrito.value) selectorEscrito.value.value = ''
  if (!archivo) return
  leyendoEscrito.value = true
  errorRedaccion.value = ''
  try {
    const esPdf = archivo.name.toLowerCase().endsWith('.pdf')
    // En un PDF se conserva el membrete, la referencia y la firma (lo del
    // margen que no se repite en todas las páginas)
    let texto = (await extraerTextoNorma(archivo, undefined, esPdf ? { recuperarMargenes: true } : {})).trim()
    if (esPdf) {
      // El extractor cierra cada página con ". ": se quita donde sobra
      // (la página ya terminaba en punto, o la oración sigue en la siguiente)
      texto = texto
        .replace(/([.:;!?])\s*\.\s*\n\n/g, '$1\n\n')
        .replace(/([^.:;!?\s])\s*\.\s*\n\n(?=[a-záéíóúñü])/g, '$1 ')
    }
    if (texto.length < 50) throw new Error('No se pudo leer el texto del escrito. Si es un PDF escaneado, usa uno con texto seleccionable o un Word.')
    // En Word se conserva el formato (negritas, alineación, listas) para abrirlo tal cual
    let htmlWord: string | null = null
    if (archivo.name.toLowerCase().endsWith('.docx')) {
      htmlWord = (await extraerHtmlWord(archivo)).html
        .replace(/<p class="documento-align-(center|left|justify)">/g, (_m, a: string) => `<p style="text-align: ${a}">`)
    }
    escrito.value = { nombre: archivo.name, texto, html: htmlWord }
  } catch (err) {
    errorRedaccion.value = err instanceof Error ? err.message : 'No se pudo leer el escrito.'
  } finally {
    leyendoEscrito.value = false
  }
}

function quitarEscrito() {
  escrito.value = null
  selectorEscrito.value?.click()
}

// Texto plano a párrafos del editor. Si el texto separa los párrafos con
// una línea en blanco (lo habitual), las líneas de un mismo párrafo se
// unen; si no, cada línea es un párrafo.
function textoAHtml(texto: string): string {
  const lineas = texto.split('\n').length
  const separados = (texto.match(/\n\s*\n/g) ?? []).length
  const parrafos = separados >= lineas / 12
    ? texto.split(/\n\s*\n/).map(p => p.replace(/\s*\n\s*/g, ' '))
    : texto.split('\n')
  return bloquesAHtml(parrafos.map(p => p.trim()).filter(Boolean)
    .map(t => ({ texto: t, alineacion: 'justificado', negrita: false })))
}

const puedeRedactar = computed(() => {
  if (redactando.value || leyendoEscrito.value) return false
  return modo.value === 'nuevo' ? pedido.value.trim().length >= 8 : !!escrito.value
})

const textoBoton = computed(() => {
  if (modo.value === 'responder') return 'Redactar respuesta'
  if (modo.value === 'trabajar') return pedido.value.trim() ? 'Aplicar indicación' : 'Abrir en el editor'
  return 'Redactar documento'
})

async function redactar() {
  if (!puedeRedactar.value) return
  const texto = pedido.value.trim()

  // Trabajar sobre el escrito sin indicación: se abre tal cual (sin IA)
  if (modo.value === 'trabajar' && escrito.value && !texto) {
    tipoDocumento.value = 'Escrito'
    tituloDocumento.value = escrito.value.nombre.replace(/\.[^.]+$/, '')
    html.value = escrito.value.html ?? textoAHtml(escrito.value.texto)
    escritoBase.value = { ...escrito.value, modo: modo.value }
    etapa.value = 'editar'
    return
  }

  redactando.value = true
  errorRedaccion.value = ''
  try {
    const conEscrito = modo.value !== 'nuevo' && escrito.value
      ? { modo: modo.value, documentoBase: escrito.value.texto, nombreDocumentoBase: escrito.value.nombre }
      : undefined
    const doc = await redactarDocumento(texto, conEscrito)
    escritoBase.value = conEscrito && escrito.value ? { ...escrito.value, modo: modo.value } : null
    tipoDocumento.value = doc.tipo
    tituloDocumento.value = doc.titulo
    html.value = bloquesAHtml(doc.bloques)
    registrarNormas(doc.normas)
    // Los párrafos del borrador ya vienen con redacción jurídica: no se revisan de nuevo
    for (const b of doc.bloques) revisados.set(normalizar(b.texto), { sugerencia: '', motivo: '' })
    etapa.value = 'editar'
  } catch (err) {
    errorRedaccion.value = err instanceof Error ? err.message : 'No se pudo redactar el documento. Intenta de nuevo.'
  } finally {
    redactando.value = false
  }
}

const $q = useQuasar()

function nuevoDocumento() {
  $q.dialog({
    title: 'Nuevo documento',
    message: 'Se perderán los cambios que no hayas descargado. ¿Quieres empezar un documento nuevo?',
    cancel: { label: 'Cancelar', flat: true, noCaps: true },
    ok: { label: 'Empezar de nuevo', unelevated: true, noCaps: true },
    persistent: false,
    class: 'rd-dialogo'
  }).onOk(reiniciar)
}

function reiniciar() {
  etapa.value = 'pedir'
  html.value = ''
  escritoBase.value = null
  sugerenciaActual.value = null
  normas.value = new Map()
  revisados.clear()
  estadoVivo.value = 'inactivo'
}

// ----- Descarga -----
const descargando = ref(false)

async function descargar() {
  if (descargando.value) return
  descargando.value = true
  try {
    const blob = await redaccionAWord(html.value, tituloDocumento.value)
    const url = URL.createObjectURL(blob)
    const enlace = document.createElement('a')
    enlace.href = url
    enlace.download = `${tituloDocumento.value.replace(/[\\/:*?"<>|]+/g, ' ').trim() || 'Documento'}.docx`
    document.body.appendChild(enlace)
    enlace.click()
    enlace.remove()
    URL.revokeObjectURL(url)
  } finally {
    descargando.value = false
  }
}

// ----- Asistente en vivo -----
// Se consulta cuando el usuario hace una pausa de 1,5 s en un párrafo que
// cambió de verdad (mínimo 12 caracteres); los párrafos ya revisados no
// se vuelven a pedir. Si llega una respuesta vieja (el usuario siguió
// escribiendo), se descarta.
const PAUSA_MS = 1500
const MIN_CARACTERES = 12

type EstadoVivo = 'inactivo' | 'escribiendo' | 'revisando' | 'al_dia' | 'error' | 'limite'
const TEXTO_ESTADO: Record<EstadoVivo, string> = {
  inactivo: 'Listo',
  escribiendo: 'Escribiendo…',
  revisando: 'Revisando…',
  al_dia: 'Al día',
  error: 'Sin conexión con la IA',
  limite: 'Límite diario alcanzado'
}
const estadoVivo = ref<EstadoVivo>('inactivo')
const mensajeVivo = ref('')

interface SugerenciaVisible { original: string; sugerencia: string; motivo: string }
const sugerenciaActual = ref<SugerenciaVisible | null>(null)
const avisoAplicar = ref('')

const revisados = new Map<string, { sugerencia: string; motivo: string }>()
const normalizar = (t: string) => t.replace(/\s+/g, ' ').trim()

let temporizador: ReturnType<typeof setTimeout> | null = null
let ultimaConsulta = 0

function alEscribir(parrafo: ParrafoEnEdicion) {
  if (estadoVivo.value === 'limite') return
  if (temporizador) clearTimeout(temporizador)
  estadoVivo.value = 'escribiendo'
  temporizador = setTimeout(() => void revisarParrafo(parrafo), PAUSA_MS)
}

async function revisarParrafo(parrafo: ParrafoEnEdicion) {
  const clave = normalizar(parrafo.texto)
  if (clave.length < MIN_CARACTERES) {
    estadoVivo.value = 'al_dia'
    return
  }
  const yaRevisado = revisados.get(clave)
  if (yaRevisado) {
    mostrarSugerencia(parrafo.texto, yaRevisado)
    estadoVivo.value = 'al_dia'
    return
  }

  const consulta = ++ultimaConsulta
  estadoVivo.value = 'revisando'
  try {
    const r = await sugerirRedaccion({
      parrafo: parrafo.texto.slice(0, 3000),
      anterior: parrafo.anterior.slice(0, 1500),
      siguiente: parrafo.siguiente.slice(0, 1500),
      tipoDocumento: tipoDocumento.value
    })
    revisados.set(clave, { sugerencia: r.sugerencia, motivo: r.motivo })
    registrarNormas(r.normas)
    if (consulta !== ultimaConsulta) return
    mostrarSugerencia(parrafo.texto, r)
    estadoVivo.value = 'al_dia'
  } catch (err) {
    if (consulta !== ultimaConsulta) return
    if (err instanceof ErrorLimiteSugerencias) {
      estadoVivo.value = 'limite'
      mensajeVivo.value = err.message
    } else {
      estadoVivo.value = 'error'
    }
  }
}

function mostrarSugerencia(original: string, r: { sugerencia: string; motivo: string }) {
  avisoAplicar.value = ''
  sugerenciaActual.value = r.sugerencia ? { original, sugerencia: r.sugerencia, motivo: r.motivo } : null
}

const editorRef = ref<{ reemplazarParrafo: (original: string, nuevo: string) => boolean } | null>(null)

function aplicarSugerencia() {
  const s = sugerenciaActual.value
  if (!s || !editorRef.value) return
  // El texto aplicado ya es la versión jurídica: no se vuelve a revisar
  revisados.set(normalizar(s.sugerencia), { sugerencia: '', motivo: '' })
  if (temporizador) clearTimeout(temporizador)
  if (editorRef.value.reemplazarParrafo(s.original, s.sugerencia)) {
    sugerenciaActual.value = null
    estadoVivo.value = 'al_dia'
  } else {
    avisoAplicar.value = 'Ese párrafo cambió desde la sugerencia. Sigue escribiendo y llegará una nueva.'
  }
}

function descartarSugerencia() {
  sugerenciaActual.value = null
}

// ----- Normas citadas (de todo lo revisado en la sesión) -----
const normas = ref<Map<string, NormaVerificada>>(new Map())

function registrarNormas(lista: NormaVerificada[]) {
  if (!lista.length) return
  const copia = new Map(normas.value)
  for (const n of lista) {
    const previa = copia.get(n.cita)
    // Una vez encontrada, se mantiene como encontrada
    if (!previa || previa.estado !== 'encontrada') copia.set(n.cita, n)
  }
  normas.value = copia
}

// Solo las citas que siguen en el documento
const normasLista = computed(() => {
  const texto = normalizar(html.value.replace(/<[^>]+>/g, ' '))
  return [...normas.value.values()].filter(n => texto.includes(normalizar(n.cita)))
})

const recortar = (t: string, max: number) => (t.length > max ? `${t.slice(0, max).trimEnd()}…` : t)

onUnmounted(() => {
  if (temporizador) clearTimeout(temporizador)
})
</script>

<style scoped>
.redaccion-page {
  padding-bottom: 60px;
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
  white-space: nowrap;
}

/* ======================= 1. Cómo empezar ======================= */
.rd-modos {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 8px;
}

.rd-modo {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-height: 40px;
  padding: 0 16px;
  border: 1px solid #E4E6EA;
  background: #FFFFFF;
  color: rgba(25, 28, 31, 0.7);
  font: inherit;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  transition: background-color 0.2s ease, border-color 0.2s ease, color 0.2s ease;
}

.rd-modo:hover:not(:disabled) { border-color: rgba(29, 78, 137, 0.4); color: #191C1F; }
.rd-modo:disabled { opacity: 0.5; cursor: not-allowed; }

.rd-modo--activo {
  border-color: #1D4E89;
  background: #EEF3F9;
  color: #1D4E89;
}

.rd-modo:focus-visible,
.rd-subir:focus-visible {
  outline: 2px solid #1D4E89;
  outline-offset: 2px;
}

.page-container.page-container.page-container.page-container :is(.rd-modo, .rd-subir, .rd-escrito-elegido) {
  border-radius: 12px !important;
}

.rd-escrito {
  width: 100%;
}

.rd-subir {
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 22px 16px;
  border: 1.5px dashed rgba(29, 78, 137, 0.35);
  background: #FFFFFF;
  color: #1D4E89;
  font: inherit;
  font-size: 0.95rem;
  font-weight: 600;
  cursor: pointer;
  transition: background-color 0.2s ease, border-color 0.2s ease;
}

.rd-subir:hover:not(:disabled) { background: #EEF3F9; border-color: #1D4E89; }

.rd-subir-formatos {
  font-size: 0.8rem;
  font-weight: 400;
  color: rgba(25, 28, 31, 0.5);
}

.rd-escrito-elegido {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px 10px 16px;
  border: 1px solid #E4E6EA;
  background: #FFFFFF;
  color: #191C1F;
  text-align: left;
}

.rd-escrito-nombre {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-weight: 600;
}

.rd-escrito-tamano {
  font-size: 0.8rem;
  color: rgba(25, 28, 31, 0.5);
  white-space: nowrap;
}

.rd-base {
  display: block;
  margin-top: 2px;
  font-size: 0.82rem;
  color: rgba(25, 28, 31, 0.55);
}

.rd-recibido {
  margin-top: 14px;
  font-size: 0.85rem;
}

.rd-recibido summary {
  cursor: pointer;
  font-weight: 600;
  color: #1D4E89;
}

.rd-recibido p {
  max-height: 320px;
  overflow-y: auto;
  margin: 8px 0 0;
  white-space: pre-wrap;
  color: rgba(25, 28, 31, 0.75);
}

@media (max-width: 600px) {
  .rd-escrito-tamano { display: none; }
}

/* ======================= 1. Pedido ======================= */
.rd-inicio {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 18px;
  max-width: 780px;
  margin: 6vh auto 0;
  text-align: center;
}

.rd-titular {
  margin: 0;
  font-size: clamp(2rem, 4vw, 2.8rem);
}

.rd-bajada {
  max-width: 62ch;
  margin: 0;
  font-size: 1rem;
  line-height: 1.6;
  color: rgba(25, 28, 31, 0.66);
}

.rd-pedido {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 18px 18px 14px 22px;
  background: #F4F5F7;
  border: 1px solid #E4E6EA;
  text-align: left;
}

.page-container.page-container.page-container.page-container .rd-pedido {
  border-radius: 20px !important;
}

.rd-pedido-texto {
  width: 100%;
  min-height: 110px;
  border: none;
  background: transparent;
  color: #191C1F;
  font: inherit;
  font-size: 1.02rem;
  line-height: 1.55;
  resize: vertical;
  outline: none;
}

.rd-pedido-pie {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.rd-contador {
  font-size: 0.78rem;
  color: rgba(25, 28, 31, 0.45);
  font-variant-numeric: tabular-nums;
}

.rd-boton,
.rd-boton-sec {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: 44px;
  padding: 0 20px;
  font: inherit;
  font-size: 0.92rem;
  font-weight: 600;
  cursor: pointer;
  transition: background-color 0.2s ease, border-color 0.2s ease, opacity 0.2s ease;
}

.rd-boton {
  border: none;
  background: #1D4E89;
  color: #FFFFFF;
}

.rd-boton:hover:not(:disabled) {
  background: #163E6E;
}

.rd-boton:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.rd-boton-sec {
  border: 1px solid #E4E6EA;
  background: #FFFFFF;
  color: #191C1F;
}

.rd-boton-sec:hover {
  border-color: rgba(29, 78, 137, 0.4);
}

.page-container.page-container.page-container.page-container :is(.rd-boton, .rd-boton-sec) {
  border-radius: 10px !important;
}

.rd-boton--chico {
  min-height: 36px;
  padding: 0 14px;
  font-size: 0.85rem;
}

.rd-error {
  margin: 0;
  color: #8E2F25;
  font-size: 0.9rem;
}

.rd-aviso {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  background: #EEF3F9;
  color: #1D4E89;
  font-size: 0.9rem;
  text-align: left;
  text-decoration: none;
}

.page-container.page-container.page-container.page-container .rd-aviso {
  border-radius: 10px !important;
}

.rd-aviso:hover u {
  text-decoration-thickness: 2px;
}

/* ======================= 2. Trabajo ======================= */
.rd-trabajo {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.rd-cabecera {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  justify-content: space-between;
  gap: 12px;
}

.rd-cabecera-texto {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}

.rd-tipo {
  font-size: 0.82rem;
  font-weight: 600;
  color: #1D4E89;
}

.rd-titulo-doc {
  margin: 0;
  font-size: clamp(1.3rem, 2.4vw, 1.7rem);
  font-weight: 600;
  color: #191C1F;
}

.rd-cabecera-acciones {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.rd-columnas {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 360px;
  gap: 18px;
  align-items: start;
}

/* Asistente: fijo a la vista mientras se baja por el documento */
.rd-asistente {
  position: sticky;
  top: calc(var(--lx-barra, 65px) + 16px);
  display: flex;
  flex-direction: column;
  gap: 14px;
  max-height: calc(100vh - var(--lx-barra, 65px) - 32px);
  padding: 18px;
  overflow-y: auto;
  background: #FFFFFF;
  border: 1px solid #E4E6EA;
}

.page-container.page-container.page-container.page-container .rd-asistente {
  border-radius: 14px !important;
}

.rd-asistente-cabecera {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.rd-asistente-titulo {
  font-size: 1rem;
  font-weight: 600;
  color: #191C1F;
}

.rd-asistente-subtitulo {
  display: block;
  margin-bottom: 8px;
  font-size: 0.85rem;
  font-weight: 600;
  color: #191C1F;
}

.rd-estado {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 0.78rem;
  color: rgba(25, 28, 31, 0.6);
}

.rd-estado-punto {
  width: 7px;
  height: 7px;
  background: rgba(25, 28, 31, 0.3);
}

.page-container.page-container.page-container.page-container .rd-estado-punto {
  border-radius: 50% !important;
}

.rd-estado--revisando .rd-estado-punto { background: #1D4E89; animation: rdLatido 1.1s ease-in-out infinite; }
.rd-estado--al_dia .rd-estado-punto { background: #2F8F5B; }
.rd-estado--error .rd-estado-punto,
.rd-estado--limite .rd-estado-punto { background: #B03A2E; }

@keyframes rdLatido {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.3; }
}

.rd-sugerencia {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 14px;
  background: #EEF3F9;
  border-left: 3px solid #1D4E89;
  animation: rdEntrar 0.3s ease-out;
}

.page-container.page-container.page-container.page-container .rd-sugerencia {
  border-radius: 0 12px 12px 0 !important;
}

@keyframes rdEntrar {
  from { opacity: 0; transform: translateY(4px); }
  to { opacity: 1; transform: none; }
}

.rd-etiqueta {
  font-size: 0.74rem;
  font-weight: 600;
  color: rgba(25, 28, 31, 0.55);
}

.rd-original {
  margin: 0 0 4px;
  font-size: 0.86rem;
  line-height: 1.5;
  color: rgba(25, 28, 31, 0.6);
  text-decoration: line-through;
  text-decoration-color: rgba(25, 28, 31, 0.25);
}

.rd-propuesta {
  margin: 0;
  font-family: 'Times New Roman', Georgia, serif;
  font-size: 0.98rem;
  line-height: 1.55;
  color: #191C1F;
}

.rd-motivo,
.rd-aviso-aplicar {
  margin: 2px 0 0;
  font-size: 0.8rem;
  line-height: 1.45;
  color: rgba(25, 28, 31, 0.62);
}

.rd-aviso-aplicar {
  color: #8E2F25;
}

.rd-sugerencia-acciones {
  display: flex;
  gap: 8px;
  margin-top: 6px;
}

.rd-vacio {
  margin: 0;
  font-size: 0.86rem;
  line-height: 1.5;
  color: rgba(25, 28, 31, 0.55);
}

.rd-normas {
  padding-top: 12px;
  border-top: 1px solid #E4E6EA;
}

.rd-normas-lista {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.rd-norma {
  display: flex;
  gap: 8px;
}

.rd-norma--encontrada .rd-norma-icono { color: #2F6B3A; }
.rd-norma--no_encontrada .rd-norma-icono { color: #7A5A12; }

.rd-norma-texto {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.rd-norma-cita {
  font-size: 0.86rem;
  font-weight: 600;
  color: #191C1F;
}

.rd-norma-detalle {
  font-size: 0.78rem;
  line-height: 1.4;
  color: rgba(25, 28, 31, 0.6);
}

.rd-norma-extracto summary {
  font-size: 0.78rem;
  font-weight: 600;
  color: #1D4E89;
  cursor: pointer;
}

.rd-norma-extracto p {
  margin: 4px 0 0;
  font-size: 0.8rem;
  line-height: 1.5;
  color: rgba(25, 28, 31, 0.75);
}

.rd-nota {
  margin: 0;
  font-size: 0.76rem;
  font-style: italic;
  color: rgba(25, 28, 31, 0.5);
}

.rd-boton:focus-visible,
.rd-boton-sec:focus-visible,
.rd-aviso:focus-visible {
  outline: 2px solid #1D4E89;
  outline-offset: 2px;
}

@media (max-width: 1100px) {
  .rd-columnas {
    grid-template-columns: minmax(0, 1fr);
  }

  .rd-asistente {
    position: static;
    max-height: none;
  }
}

@media (prefers-reduced-motion: reduce) {
  .rd-sugerencia,
  .rd-estado--revisando .rd-estado-punto { animation: none; }
}
</style>

<style>
/* Diálogo "Nuevo documento" (Quasar lo monta en <body>, fuera del scope):
   texto negro legible sobre el fondo blanco */
.q-dialog .rd-dialogo,
.q-dialog .rd-dialogo .q-dialog__title,
.q-dialog .rd-dialogo .q-dialog__message {
  color: #111111 !important;
}

.q-dialog .rd-dialogo {
  background: #FFFFFF !important;
}

.q-dialog .rd-dialogo .q-dialog__title {
  font-weight: 600;
}

.q-dialog .rd-dialogo .q-dialog__message {
  opacity: 1;
}

.q-dialog .rd-dialogo .q-btn {
  color: #1D4E89 !important;
}

.q-dialog .rd-dialogo .q-card__actions .q-btn:last-child {
  background: #1D4E89 !important;
  color: #FFFFFF !important;
}
</style>
