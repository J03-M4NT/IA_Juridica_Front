<template>
  <q-page class="contratos-page">

    <!-- Section header -->
    <div class="page-header">
      <div class="section-icon-wrap icon-purple">
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#3D473A" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
          <path d="M3 7h18"/><path d="M3 7l2-3h14l2 3"/><path d="M5 7v13a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V7"/><path d="M9 12h6"/>
        </svg>
      </div>
      <div>
        <h1 class="page-title">Gestión de Contratos</h1>
        <p class="page-subtitle">Biblioteca de plantillas · previsualiza, edita y descarga</p>
      </div>
    </div>

    <div class="row q-col-gutter-md">
      <!-- Columna Izquierda: Templates -->
      <div class="col-12 col-md-4">
        <div class="lx-card">
          <div class="lx-card-header">
            <div class="lx-card-header-title">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#3D473A" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <path d="M14 2v6h6"/>
              </svg>
              Plantillas
            </div>
            <q-btn flat round dense icon="refresh" color="grey-5" @click="store.fetchTemplates()" :loading="isLoading" size="sm" />
          </div>

          <div class="lx-card-body q-pa-none">
            <q-list class="templates-list">
              <q-item
                v-for="template in templates"
                :key="template.id"
                clickable v-ripple
                class="template-item"
                :active="currentTemplate?.id === template.id"
                @click="selectTemplate(template)"
              >
                <q-item-section avatar>
                  <div class="template-icon-wrap">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                      <path d="M14 2v6h6"/><path d="M8 13h8M8 17h5"/>
                    </svg>
                  </div>
                </q-item-section>
                <q-item-section>
                  <q-item-label class="text-weight-medium template-item-name">{{ template.name }}</q-item-label>
                  <q-item-label caption lines="2" class="template-item-desc">{{ template.description }}</q-item-label>
                </q-item-section>
                <q-item-section side>
                  <q-icon name="chevron_right" color="grey-6" />
                </q-item-section>
              </q-item>

              <q-item v-if="templates.length === 0 && !isLoading">
                <q-item-section class="text-center empty-state-text">
                  No hay plantillas disponibles
                </q-item-section>
              </q-item>
            </q-list>
          </div>
        </div>
      </div>

      <!-- Columna Derecha -->
      <div class="col-12 col-md-8">

        <!-- VISTA PREVIA DEL PDF -->
        <div class="lx-card" v-if="!modoEdicion">
          <div class="lx-card-header">
            <div class="lx-card-header-title">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#3D473A" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z"/><circle cx="12" cy="12" r="3"/>
              </svg>
              Vista Previa del Contrato
            </div>
            <q-btn
              v-if="currentTemplate"
              flat no-caps
              icon="auto_awesome"
              label="Buscar otro contrato"
              color="grey-7"
              class="q-ml-auto q-mr-sm"
              @click="volverAlAsistente"
            />
            <q-btn
              v-if="pdfDoc || (esWordTemplate && textoHtml)"
              color="accent"
              icon="edit"
              label="Editar Contrato"
              @click="abrirEditor"
              unelevated no-caps
              :loading="extrayendoTexto"
              class="lx-action-btn"
            />
          </div>

          <div class="lx-card-body editor-content">
            <!-- Asistente: el usuario describe con sus palabras el contrato
                 que necesita y se le ofrecen las plantillas que corresponden.
                 Al elegir una, sigue el flujo de siempre (vista previa →
                 Editar Contrato → manual o con IA). -->
            <div v-if="!currentTemplate" class="chat-edicion-panel asistente-contratos">
              <p class="chat-edicion-hint">
                <q-icon name="auto_awesome" class="q-mr-xs" />
                Asistente de contratos · también puedes elegir una plantilla de la lista
              </p>

              <div ref="asistenteMensajesRef" class="chat-edicion-mensajes q-mb-md">
                <div
                  v-for="(msg, idx) in asistenteMensajes"
                  :key="idx"
                  :class="['chat-edicion-fila', msg.esIA ? 'chat-edicion-fila--ia' : 'chat-edicion-fila--user']"
                >
                  <div v-if="msg.esIA" class="chat-edicion-avatar">
                    <q-icon name="auto_awesome" size="15px" />
                  </div>
                  <div class="asistente-bloque" :class="{ 'asistente-bloque--user': !msg.esIA }">
                    <div :class="['chat-edicion-burbuja', msg.esIA ? 'chat-edicion-burbuja--ia' : 'chat-edicion-burbuja--user']">
                      {{ msg.contenido }}
                    </div>
                    <div v-if="msg.plantillas?.length" class="asistente-plantillas">
                      <button
                        v-for="plantilla in msg.plantillas"
                        :key="plantilla.id"
                        type="button"
                        class="asistente-plantilla"
                        @click="selectTemplate(plantilla)"
                      >
                        <q-icon name="description" size="20px" class="asistente-plantilla-icono" />
                        <span class="asistente-plantilla-texto">
                          <span class="asistente-plantilla-nombre">{{ plantilla.name }}</span>
                          <span v-if="plantilla.description" class="asistente-plantilla-desc">{{ plantilla.description }}</span>
                        </span>
                        <span class="asistente-plantilla-accion">Usar esta plantilla</span>
                      </button>
                    </div>
                  </div>
                </div>

                <div v-if="asistenteCargando" class="row items-center q-gutter-sm">
                  <q-spinner-dots color="accent" size="26px" />
                  <span class="chat-edicion-hint-muted">Buscando el contrato adecuado...</span>
                </div>
              </div>

              <div class="row q-gutter-sm items-center">
                <q-input
                  v-model="asistenteRespuesta"
                  outlined
                  dense
                  class="col chat-edicion-input"
                  placeholder="Ej.: quiero alquilar mi departamento"
                  :disable="asistenteCargando"
                  maxlength="1000"
                  @keyup.enter="enviarAsistente"
                />
                <q-btn
                  color="accent"
                  icon="send"
                  round
                  @click="enviarAsistente"
                  :loading="asistenteCargando"
                  :disable="!asistenteRespuesta.trim()"
                />
              </div>
            </div>

            <div v-else-if="loadingPdf" class="pdf-loading row items-center justify-center">
              <q-spinner-dots color="accent" size="50px" />
              <p class="q-ml-md text-grey-7">Cargando plantilla...</p>
            </div>

            <div v-else-if="pdfError" class="pdf-error row items-center justify-center">
              <div class="text-center">
                <q-icon name="error_outline" size="48px" color="negative" />
                <p class="text-negative q-mt-md">{{ pdfError }}</p>
                <q-btn color="accent" label="Reintentar" @click="esWordTemplate ? loadWordPreview() : loadPDFPreview()" class="q-mt-md" unelevated no-caps />
              </div>
            </div>

            <!-- Word: vista fiel (docx-preview), tal como es la plantilla —
                 con las ediciones hechas en "Editar Contrato". -->
            <div v-else-if="modoWordFiel" class="contrato-vista-word">
              <VistaWord :html="htmlVistaWordEditado || htmlVistaWord" :estilos="estilosVistaWord" />
            </div>

            <!-- Word (respaldo): si la vista fiel no se pudo dibujar, o después
                 de "Completar con IA" — el HTML extraído, como hoja continua. -->
            <div v-else-if="esWordTemplate && textoHtml" class="word-preview-container">
              <div
                class="document-preview"
                :style="plantillaFuenteDetectada ? { fontFamily: `'${plantillaFuenteDetectada}', serif` } : undefined"
                v-html="textoHtml"
              ></div>
            </div>

            <div v-else-if="pdfDoc" class="pdf-canvas-container">
              <canvas ref="pdfCanvas" class="pdf-canvas" />
              <div class="row items-center q-mt-md q-gutter-sm">
                <q-btn round color="accent" icon="chevron_left"
                  :disable="currentPage <= 1 || isRendering" @click="prevPage" />
                <span class="text-body1 page-indicator-text">Página {{ currentPage }} de {{ numPages }}</span>
                <q-btn round color="accent" icon="chevron_right"
                  :disable="currentPage >= numPages || isRendering" @click="nextPage" />
              </div>
            </div>
          </div>
        </div>

        <!-- EDITOR DE CONTRATO -->
        <div class="lx-card" v-if="modoEdicion">
          <div class="lx-card-header">
            <div class="lx-card-header-title">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#3D473A" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                <path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4z"/>
              </svg>
              Editando: {{ currentTemplate?.name }}
            </div>
            <q-btn flat no-caps icon="arrow_back" label="Volver" color="grey-5" @click="modoEdicion = false" />
          </div>

          <!-- Tabs: Manual / Chat -->
          <q-tabs v-model="tabEdicion" color="grey-8" active-color="accent" class="lx-tabs q-px-md q-pt-sm" align="left" no-caps>
            <q-tab name="manual" icon="edit" label="Editar Manualmente" />
            <q-tab name="chat" icon="chat" label="Completar con IA" />
          </q-tabs>

          <div class="lx-card-body">

            <!-- TAB MANUAL -->
            <div v-if="tabEdicion === 'manual'">
              <!-- Plantilla Word: se edita sobre la vista fiel; la descarga
                   aplica los cambios al Word original conservando el formato. -->
              <template v-if="modoWordFiel">
                <p class="vista-word-ayuda">
                  <q-icon name="edit" class="q-mr-xs" />
                  Edita el texto directamente en el documento. Al descargar, tus cambios se aplican sobre el Word original y se conserva todo su formato.
                </p>
                <div class="contrato-vista-word">
                  <VistaWord editable :html="htmlVistaWordEditado" :estilos="estilosVistaWord" @editar="onEditarVistaWord" />
                </div>
              </template>
              <EditorContrato v-else :model-value="textoHtml" @update:model-value="onEditorHtmlUpdate" />
            </div>

            <!-- TAB CHAT: la IA analiza el contrato y pregunta un dato a la vez
                 hasta completarlo/modificarlo -->
            <div v-if="tabEdicion === 'chat'">
              <div class="chat-edicion-panel">
                <p class="chat-edicion-hint">
                  <q-icon name="chat" class="q-mr-xs" />
                  LexIT AI te va a preguntar los datos que faltan, uno a la vez.
                </p>

                <div v-if="chatEdicionMensajes.length" ref="chatEdicionMensajesRef" class="chat-edicion-mensajes q-mb-md">
                  <div
                    v-for="(msg, idx) in chatEdicionMensajes"
                    :key="idx"
                    :class="['chat-edicion-fila', msg.esIA ? 'chat-edicion-fila--ia' : 'chat-edicion-fila--user']"
                  >
                    <div v-if="msg.esIA" class="chat-edicion-avatar">
                      <q-icon name="auto_awesome" size="15px" />
                    </div>
                    <div :class="['chat-edicion-burbuja', msg.esIA ? 'chat-edicion-burbuja--ia' : 'chat-edicion-burbuja--user']">
                      {{ msg.contenido }}
                    </div>
                  </div>
                </div>

                <div v-if="chatEdicionCargando" class="row items-center q-gutter-sm q-mb-md">
                  <q-spinner-dots color="accent" size="26px" />
                  <span class="chat-edicion-hint-muted">LexIT AI está pensando...</span>
                </div>
                <!-- Punto final del chat: se mantiene a la vista mientras la IA responde -->
                <div ref="chatEdicionFinRef"></div>

                <q-btn
                  v-if="!chatEdicionIniciado"
                  color="accent"
                  icon="chat"
                  label="Empezar a completar el contrato con IA"
                  @click="iniciarChatEdicion"
                  :loading="chatEdicionCargando"
                  :disable="!textoEditado"
                  unelevated no-caps
                  class="full-width chat-edicion-start-btn"
                />

                <div v-else-if="!chatEdicionTerminado" class="row q-gutter-sm items-center">
                  <q-input
                    v-model="chatEdicionRespuesta"
                    outlined
                    dense
                    class="col chat-edicion-input"
                    placeholder="Escribe tu respuesta..."
                    :disable="chatEdicionCargando"
                    @keyup.enter="enviarRespuestaChatEdicion"
                  />
                  <q-btn
                    color="accent"
                    icon="send"
                    round
                    @click="enviarRespuestaChatEdicion"
                    :loading="chatEdicionCargando"
                    :disable="!chatEdicionRespuesta.trim()"
                  />
                </div>

                <q-banner v-else class="chat-edicion-banner rounded-borders">
                  <template #avatar>
                    <q-icon name="task_alt" color="positive" />
                  </template>
                  El contrato fue actualizado con tus respuestas. Revísalo en la pestaña "Editar Manualmente" o descárgalo abajo.
                </q-banner>

                <p v-if="avisoChatEdicion" class="download-aviso q-mt-sm q-mb-none">{{ avisoChatEdicion }}</p>
                <p v-if="errorChatEdicion" class="text-negative text-caption q-mt-sm q-mb-none">{{ errorChatEdicion }}</p>
              </div>
            </div>

          </div>

          <!-- Barra de descarga -->
          <div class="download-bar">
            <div class="download-bar-label">
              <q-icon name="file_download" size="18px" />
              Descargar contrato
            </div>
            <div class="download-bar-actions">
              <q-btn
                color="accent"
                icon="description"
                label="Word (.docx)"
                @click="descargarWord"
                :loading="descargandoWord"
                unelevated no-caps
                class="download-btn download-btn--primary"
              />
            </div>
            <p v-if="avisoDescargaWord" class="download-aviso q-mt-sm q-mb-none">{{ avisoDescargaWord }}</p>
          </div>
        </div>

      </div>
    </div>

    <!-- Dialog de Error -->
    <q-dialog v-model="showErrorDialog">
      <q-card style="min-width: 350px">
        <q-card-section class="bg-negative text-white">
          <div class="text-h6">Error</div>
        </q-card-section>
        <q-card-section>{{ error }}</q-card-section>
        <q-card-actions align="right">
          <q-btn flat label="Cerrar" color="primary" v-close-popup />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup lang="ts">
import {
  onMounted,
  onUnmounted,
  ref,
  shallowRef,
  computed,
  watch,
  nextTick
} from 'vue'
import { storeToRefs } from 'pinia'
import { useContratosStore } from '../stores/contratos-store'
import { useAuthStore } from '../stores/auth'
import type { ContractTemplate } from '../stores/contratos-store'
import { getDocument, GlobalWorkerOptions, type PDFDocumentProxy } from 'pdfjs-dist'
import { chatEditarContratoIA, recomendarPlantilla, type MensajeChatEdicion, type ResultadoChatEdicion } from '../services/geminiService'
import { buscarPlantillasLocal } from '../utils/buscarPlantilla'
import { exportToWordConMarcaDeAgua } from '../utils/documentExport'
import { extraerHtmlWord } from '../utils/mammothExtractor'
import { subirDocumentoTemporal, descargarWordEditado } from '../services/documentosTemporalesService'
import { renderizarWord } from '../utils/vistaWord'
import { calcularCambios } from '../utils/edicionWord'
import { extraerTextoVisibleDeHtml, reemplazarEnHtmlFlexible } from '../utils/htmlTexto'
import EditorContrato from '../components/EditorContrato.vue'
import VistaWord from '../components/VistaWord.vue'

GlobalWorkerOptions.workerSrc = `${import.meta.env.BASE_URL}pdf.worker.min.js`

// =========================
// STORE
// =========================
const store = useContratosStore()
const { templates, currentTemplate, isLoading, error } = storeToRefs(store)
const authStore = useAuthStore()

// =========================
// PDF NORMAL
// =========================
const pdfCanvas = ref<HTMLCanvasElement | null>(null)
const pdfDoc = shallowRef<PDFDocumentProxy | null>(null)
const currentPage = ref(1)
const numPages = ref(0)
const loadingPdf = ref(false)
const pdfError = ref<string | null>(null)
const isRendering = ref(false)

// =========================
// EDITOR
// =========================
const modoEdicion = ref(false)
const tabEdicion = ref('manual')
const textoEditado = ref('')
const textoHtml = ref('')
const descargandoWord = ref(false)
const extrayendoTexto = ref(false)

// =========================
// CHAT DE EDICIÓN CON IA (tab "Completar con IA")
// =========================
const chatEdicionMensajes = ref<MensajeChatEdicion[]>([])
// Historial real enviado/recibido de la IA — arranca con el mensaje
// disparador (ver MENSAJE_INICIAL_CHAT_EDICION) como turno 'user', porque
// la API de Gemini exige que el primer turno del historial sea 'user'.
// chatEdicionMensajes es solo para mostrar en pantalla (no incluye ese
// disparador, que el usuario nunca escribió) — sin este historial aparte,
// el segundo mensaje del usuario mandaba un historial que empezaba en
// 'model' y la API lo rechazaba.
const chatEdicionHistorialIA = ref<MensajeChatEdicion[]>([])
const chatEdicionIniciado = ref(false)
const chatEdicionTerminado = ref(false)
const chatEdicionCargando = ref(false)
const chatEdicionRespuesta = ref('')
const errorChatEdicion = ref('')
// Resultado de aplicar los cambios de la IA sobre el Word (si alguno no se
// pudo ubicar en el documento).
const avisoChatEdicion = ref('')

// El chat baja solo al último mensaje (y al "está pensando...") cada vez
// que llega un mensaje o la IA empieza a responder, para que el usuario no
// tenga que desplazarse a mano.
const chatEdicionMensajesRef = ref<HTMLElement | null>(null)
const chatEdicionFinRef = ref<HTMLElement | null>(null)

function bajarChatEdicion() {
  void nextTick(() => {
    const lista = chatEdicionMensajesRef.value
    if (lista) lista.scrollTo({ top: lista.scrollHeight, behavior: 'smooth' })
    chatEdicionFinRef.value?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  })
}

watch(() => [chatEdicionMensajes.value.length, chatEdicionCargando.value], bajarChatEdicion)
const stripHtml = (html: string): string => {
  const tmp = document.createElement('div')
  tmp.innerHTML = html
  return tmp.textContent || tmp.innerText || ''
}

const onEditorHtmlUpdate = (html: string) => {
  textoHtml.value = html
  textoEditado.value = stripHtml(html)
}

// =========================
// DIALOG ERROR
// =========================
const showErrorDialog = computed({
  get: () => !!error.value,
  set: (val: boolean) => { if (!val) error.value = null }
})

// =========================
// MOUNT / UNMOUNT
// =========================
onMounted(async () => {
  await store.fetchTemplates()
})

onUnmounted(() => {
  if (pdfDoc.value) { void pdfDoc.value.destroy(); pdfDoc.value = null }
})

// =========================
// SELECCIONAR TEMPLATE
// =========================
const selectTemplate = (template: ContractTemplate) => {
  store.setCurrentTemplate(template)
  modoEdicion.value = false
  textoEditado.value = ''
  textoHtml.value = ''
  plantillaFuenteDetectada.value = undefined
  reiniciarVistaWord()
  reiniciarChatEdicion()
}

// =========================
// ASISTENTE DE CONTRATOS
// El usuario describe el contrato con sus palabras ("alquilar mi depa") y
// la IA (Cloud Function recomendarPlantillaIA) ofrece las plantillas que
// corresponden. Si la IA no responde, se busca por palabras clave
// (utils/buscarPlantilla.ts) para no dejar al usuario sin opciones.
// =========================
interface MensajeAsistente {
  esIA: boolean
  contenido: string
  plantillas?: ContractTemplate[]
}

const SALUDO_ASISTENTE = '¿Qué tipo de contrato necesitas? Descríbelo con tus palabras, por ejemplo: "alquilar un local", "vender mi auto" o "prestarle algo a un amigo".'

const asistenteMensajes = ref<MensajeAsistente[]>([{ esIA: true, contenido: SALUDO_ASISTENTE }])
const asistenteRespuesta = ref('')
const asistenteCargando = ref(false)
const asistenteMensajesRef = ref<HTMLElement | null>(null)

function bajarAsistente() {
  void nextTick(() => {
    const el = asistenteMensajesRef.value
    if (el) el.scrollTop = el.scrollHeight
  })
}

async function enviarAsistente() {
  const mensaje = asistenteRespuesta.value.trim()
  if (!mensaje || asistenteCargando.value) return

  const historial = asistenteMensajes.value.map(m => ({ esIA: m.esIA, contenido: m.contenido }))
  asistenteMensajes.value.push({ esIA: false, contenido: mensaje })
  asistenteRespuesta.value = ''
  asistenteCargando.value = true
  bajarAsistente()

  try {
    if (templates.value.length === 0) await store.fetchTemplates()
    const resultado = await recomendarPlantilla(mensaje, historial)
    // El servidor lee las plantillas de Firestore en cada mensaje: si
    // recomienda una que esta página aún no tiene (el admin la subió
    // después de abrirla), se vuelve a cargar la lista.
    if (resultado.plantillas.some(id => !templates.value.some(t => t.id === id))) {
      await store.fetchTemplates()
    }
    const plantillas = resultado.plantillas
      .map(id => templates.value.find(t => t.id === id))
      .filter((t): t is ContractTemplate => !!t)
    asistenteMensajes.value.push({ esIA: true, contenido: resultado.mensaje, plantillas })
  } catch (err) {
    console.error('Error en el asistente de contratos:', err)
    // Respaldo con la lista más reciente de plantillas.
    await store.fetchTemplates()
    const encontradas = buscarPlantillasLocal(mensaje, templates.value)
    asistenteMensajes.value.push(encontradas.length
      ? { esIA: true, contenido: 'No pude consultar a la IA en este momento, pero estas plantillas coinciden con lo que escribiste:', plantillas: encontradas }
      : { esIA: true, contenido: 'No pude consultar a la IA en este momento. Puedes elegir una plantilla de la lista o intentarlo de nuevo en unos segundos.' })
  } finally {
    asistenteCargando.value = false
    bajarAsistente()
  }
}

// Vuelve al asistente para buscar otro contrato (la conversación se conserva).
function volverAlAsistente() {
  store.setCurrentTemplate(null)
  modoEdicion.value = false
  textoEditado.value = ''
  textoHtml.value = ''
  pdfError.value = null
  plantillaFuenteDetectada.value = undefined
  reiniciarVistaWord()
  reiniciarChatEdicion()
  bajarAsistente()
}

// =========================
// EXTRAER TEXTO DEL PDF
// =========================
const extraerTextoPDF = async (pdf: PDFDocumentProxy): Promise<string> => {
  let textoCompleto = ''
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i)
    const content = await page.getTextContent()
    const textoPagina = content.items
      .map((item) => ('str' in item ? item.str : ''))
      .join(' ')
    textoCompleto += textoPagina + '\n\n'
  }
  return textoCompleto.trim()
}

// =========================
// TEXTO A HTML
// =========================
// Distintas plantillas traen distintos estilos de encabezado de cláusula
// ("CLÁUSULA PRIMERA", "ARTÍCULO 1°", "PRIMERA.-"/"DÉCIMO SEGUNDA.-",
// "1.-", "I.-") — este patrón cubre los formatos comunes en contratos en
// español, no solo el de una plantilla en particular.
const PATRON_ENCABEZADO =
  'CL[ÁA]USULA\\s+[A-ZÁÉÍÓÚÑ0-9]+' +
  '|ART[IÍ]CULO\\s+\\d+°?' +
  '|[A-ZÁÉÍÓÚÑ]{4,}(?:\\s+[A-ZÁÉÍÓÚÑ]{4,}){0,2}\\.-' +
  '|[IVXLCDM]{1,4}\\.-' +
  '|\\d{1,2}\\.-'

const REGEX_SALTO_ANTES_DE_ENCABEZADO = new RegExp(
  `(\\S)(\\s+)(${PATRON_ENCABEZADO}|CONTRATO DE|Definiciones)`,
  'g'
)
const REGEX_LINEA_ES_ENCABEZADO = new RegExp(`^(?:${PATRON_ENCABEZADO})`)

const textoAHtml = (texto: string): string => {
  const procesado = texto
    .replace(REGEX_SALTO_ANTES_DE_ENCABEZADO, '$1\n\n$3')
    .replace(/ {2,}/g, ' ')
    .trim()

  return procesado
    .split('\n')
    .map(linea => {
      linea = linea.trim()
      if (!linea) return '<p style="margin:4px 0;"><br></p>'

      if (linea.startsWith('CONTRATO DE')) {
        return `<p style="text-align:center; font-weight:bold; font-size:14pt; font-family:Times New Roman; margin:16px 0 12px 0;">${linea}</p>`
      }

      if (linea === 'Definiciones') {
        return `<p style="font-weight:bold; font-size:12pt; font-family:Times New Roman; margin:12px 0 6px 0;">${linea}</p>`
      }

      if (REGEX_LINEA_ES_ENCABEZADO.test(linea)) {
        return `<p style="font-weight:bold; font-size:11pt; font-family:Times New Roman; margin:12px 0 4px 0;">${linea}</p>`
      }

      return `<p style="text-align:justify; font-size:11pt; font-family:Times New Roman; margin:2px 0;">${linea}</p>`
    })
    .join('')
}

// =========================
// TIPO DE ARCHIVO DE LA PLANTILLA ACTUAL
// (no hay un campo aparte en Firestore para esto — se infiere de la
// extensión del storage_path, así no hace falta migrar datos existentes)
// =========================
const esWordTemplate = computed(() =>
  /\.docx$/i.test(currentTemplate.value?.storage_path ?? '')
)

// Fuente real del documento (ej. "Aptos", "Calibri") — extraerHtmlWord la
// detecta leyendo word/theme/theme1.xml del .docx, pero antes se
// descartaba: el preview se mostraba SIEMPRE en Times New Roman (fijo en
// el CSS de .document-preview) sin importar la fuente real del original,
// por eso se veía distinto a simple vista. Se guarda para aplicarla tanto
// en la vista previa como al reconstruir la descarga.
const plantillaFuenteDetectada = ref<string | undefined>(undefined)

// =========================
// VISTA Y EDICIÓN FIEL DEL WORD (plantillas .docx subidas en Admin)
// La plantilla se muestra con docx-preview (utils/vistaWord.ts), tal como es
// el Word: fuentes, tamaños, márgenes, tablas, encabezados, pies y logos. Se
// edita sobre esa misma vista y la descarga aplica solo los cambios de texto
// sobre el .docx ORIGINAL (Cloud Function descargarWordEditado), más el
// membrete LEXIT. El HTML de mammoth (textoHtml/textoEditado) se sigue
// generando para "Completar con IA" y el PDF, que no cambian.
//
// Si se usa "Completar con IA", ese resultado viene como texto reescrito y
// se sigue mostrando/descargando como hasta ahora (usandoResultadoIA).
// =========================
const htmlVistaWord = ref('')          // la plantilla tal como se cargó
const htmlVistaWordEditado = ref('')   // con las ediciones del usuario
const estilosVistaWord = ref('')
const archivoPlantillaWord = shallowRef<File | null>(null)
const usandoResultadoIA = ref(false)
const avisoDescargaWord = ref('')
// Copia del .docx original en la carpeta privada del usuario (Storage),
// que es de donde la Cloud Function lo toma para aplicar los cambios.
let storagePathPlantillaTemporal: string | null = null

const modoWordFiel = computed(() => esWordTemplate.value && !!htmlVistaWord.value && !usandoResultadoIA.value)

function reiniciarVistaWord() {
  htmlVistaWord.value = ''
  htmlVistaWordEditado.value = ''
  estilosVistaWord.value = ''
  archivoPlantillaWord.value = null
  usandoResultadoIA.value = false
  avisoDescargaWord.value = ''
  storagePathPlantillaTemporal = null
}

// Texto del cuerpo (sin encabezados/pies) para "Completar con IA".
function textoDelCuerpo(html: string): string {
  return extraerTextoVisibleDeHtml(html.replace(/<(header|footer)\b[\s\S]*?<\/\1>/gi, ''))
}

function onEditarVistaWord(html: string) {
  htmlVistaWordEditado.value = html
  textoEditado.value = textoDelCuerpo(html)
}

async function prepararPlantillaEnStorage(): Promise<string> {
  if (storagePathPlantillaTemporal) return storagePathPlantillaTemporal
  const uid = authStore.user?.uid
  if (!uid) throw new Error('No hay una sesión activa.')
  const original = archivoPlantillaWord.value
  if (!original) throw new Error('No se encontró la plantilla original. Vuelve a seleccionarla.')
  // La Cloud Function exige extensión .docx en la ruta.
  const nombre = /\.docx$/i.test(original.name) ? original.name : `${original.name}.docx`
  const archivo = new File([original], nombre, { type: original.type })
  storagePathPlantillaTemporal = await subirDocumentoTemporal(uid, archivo)
  return storagePathPlantillaTemporal
}

function cambiosDeLaVistaWord() {
  return calcularCambios(htmlVistaWord.value, htmlVistaWordEditado.value || htmlVistaWord.value)
}

// Descarga fiel: Word original + cambios (+ membrete LEXIT si se pide).
async function descargarWordFiel(marcaLexit: boolean) {
  avisoDescargaWord.value = ''
  const cambios = cambiosDeLaVistaWord()
  const storagePath = await prepararPlantillaEnStorage()
  const resultado = await descargarWordEditado(storagePath, cambios, currentTemplate.value?.name || 'contrato', { marcaLexit })
  window.location.href = resultado.url
  if (resultado.fallidos.length > 0) {
    avisoDescargaWord.value = `Se aplicaron ${resultado.aplicados} de ${cambios.length} cambios; ` +
      `${resultado.fallidos.length} no se pudieron aplicar sin alterar el formato. Hazlos directamente en Word.`
  }
}

// =========================
// CARGAR PLANTILLA WORD (mismo rol que loadPDFPreview, pero para .docx —
// no hay "páginas" que renderizar en canvas, se muestra el HTML extraído
// directo, igual que en Consultas)
// =========================
const loadWordPreview = async () => {
  if (!currentTemplate.value?.storage_path) return

  loadingPdf.value = true
  pdfError.value = null
  textoEditado.value = ''
  textoHtml.value = ''
  pdfDoc.value = null
  reiniciarVistaWord()

  try {
    const blob = await store.downloadOriginalPDF(currentTemplate.value.id)
    const archivo = new File(
      [blob],
      currentTemplate.value.name || 'plantilla.docx',
      { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' }
    )
    // HTML de mammoth (para "Completar con IA" y el PDF, como siempre) y la
    // vista fiel del Word. Si la vista fiel fallara, se sigue mostrando la
    // de siempre.
    const [{ html, fuenteDetectada }, vistaFiel] = await Promise.all([
      extraerHtmlWord(archivo),
      renderizarWord(archivo).catch(err => {
        console.error('No se pudo dibujar la vista fiel del Word:', err)
        return null
      })
    ])
    textoHtml.value = html
    textoEditado.value = stripHtml(html)
    plantillaFuenteDetectada.value = fuenteDetectada ?? undefined
    if (vistaFiel) {
      htmlVistaWord.value = vistaFiel.html
      htmlVistaWordEditado.value = vistaFiel.html
      estilosVistaWord.value = vistaFiel.estilos
      archivoPlantillaWord.value = archivo
    }
    loadingPdf.value = false
  } catch (err) {
    console.error('Error cargando plantilla Word:', err)
    pdfError.value = 'No se pudo cargar la plantilla Word'
    loadingPdf.value = false
  }
}

// =========================
// CARGAR PDF NORMAL
// =========================
const loadPDFPreview = async () => {
  if (!currentTemplate.value?.storage_path) return

  loadingPdf.value = true
  pdfError.value = null
  textoEditado.value = ''
  textoHtml.value = ''

  try {
    const blob = await store.downloadOriginalPDF(currentTemplate.value.id)
    const arrayBuffer = await blob.arrayBuffer()
    const pdf = await getDocument({ data: arrayBuffer }).promise

    pdfDoc.value = pdf
    numPages.value = pdf.numPages
    currentPage.value = 1
    loadingPdf.value = false

    setTimeout(() => { void renderPage(1) }, 300)

    // Extraer texto en segundo plano
    const texto = await extraerTextoPDF(pdf)
    textoEditado.value = texto
    textoHtml.value = textoAHtml(texto)

  } catch (err) {
    console.error('Error cargando PDF:', err)
    pdfError.value = 'No se pudo cargar el PDF'
    loadingPdf.value = false
  }
}

// =========================
// ABRIR EDITOR
// =========================
const abrirEditor = async () => {
  if (!textoEditado.value) {
    extrayendoTexto.value = true
    if (pdfDoc.value) {
      const texto = await extraerTextoPDF(pdfDoc.value)
      textoEditado.value = texto
      textoHtml.value = textoAHtml(texto)
    }
    extrayendoTexto.value = false
  }
  modoEdicion.value = true
  tabEdicion.value = 'manual'
}
// =========================
// RENDER PDF NORMAL
// =========================
const renderPage = async (pageNum: number) => {
  if (!pdfDoc.value || !pdfCanvas.value || isRendering.value) return
  isRendering.value = true
  try {
    const page = await pdfDoc.value.getPage(pageNum)
    const viewport = page.getViewport({ scale: 1.5 })
    const canvas = pdfCanvas.value
    const context = canvas.getContext('2d')
    if (!context) return
    canvas.height = viewport.height
    canvas.width = viewport.width
    context.clearRect(0, 0, canvas.width, canvas.height)
    await page.render({ canvasContext: context, viewport }).promise
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  } catch (err) {
    pdfError.value = 'Error al renderizar PDF'
  } finally {
    isRendering.value = false
  }
}

const prevPage = async () => {
  if (currentPage.value <= 1) return
  currentPage.value--
  await renderPage(currentPage.value)
}

const nextPage = async () => {
  if (currentPage.value >= numPages.value) return
  currentPage.value++
  await renderPage(currentPage.value)
}

// =========================
// CHAT DE EDICIÓN CON IA (tab "Completar con IA")
// =========================
// Debe coincidir con el texto disparador por defecto del lado del
// servidor (functions/src/geminiTools.ts, chatEdicionContratoIA) — no
// afecta la respuesta si difiere, pero mantenerlo igual evita que el
// historial le muestre a la IA dos frases distintas para la misma acción.
const MENSAJE_INICIAL_CHAT_EDICION = 'Analiza el contrato y hazme la primera pregunta para completarlo o modificarlo.'

const reiniciarChatEdicion = () => {
  chatEdicionMensajes.value = []
  chatEdicionHistorialIA.value = []
  chatEdicionIniciado.value = false
  chatEdicionTerminado.value = false
  chatEdicionCargando.value = false
  chatEdicionRespuesta.value = ''
  errorChatEdicion.value = ''
  avisoChatEdicion.value = ''
}

const aplicarResultadoChatEdicion = (textoModificado: string) => {
  textoEditado.value = textoModificado
  textoHtml.value = textoAHtml(textoModificado)
  chatEdicionTerminado.value = true
  // El resultado de la IA es texto reescrito: desde aquí se muestra y
  // descarga como hasta ahora (no con la vista/descarga fiel del Word).
  usandoResultadoIA.value = true
}

// Plantilla Word con vista fiel: la IA ve el texto de esa misma vista y al
// final devuelve reemplazos puntuales ("cambios"), que se aplican sobre el
// Word mostrado — igual que "Aplicar al documento" en Análisis. Así el
// contrato se sigue viendo y descargando idéntico al original (con el
// membrete), solo con los datos completados. PDF: como siempre.
const textoParaChatIA = (): string =>
  modoWordFiel.value ? textoDelCuerpo(htmlVistaWordEditado.value || htmlVistaWord.value) : textoEditado.value

const opcionesChatIA = (): { formato?: 'cambios' } =>
  modoWordFiel.value ? { formato: 'cambios' } : {}

const aplicarCambiosIAEnWord = (cambios: { antes: string; despues: string }[]) => {
  let html = htmlVistaWordEditado.value || htmlVistaWord.value
  const fallidos: string[] = []
  for (const cambio of cambios) {
    // Un cambio nunca debe abarcar dos párrafos (rompería la
    // correspondencia con el Word original).
    const resultado = cambio.antes.includes('\n')
      ? { html, ok: false }
      : reemplazarEnHtmlFlexible(html, cambio.antes, cambio.despues)
    if (resultado.ok) html = resultado.html
    else fallidos.push(cambio.antes)
  }
  htmlVistaWordEditado.value = html
  textoEditado.value = textoDelCuerpo(html)
  chatEdicionTerminado.value = true

  const aplicados = cambios.length - fallidos.length
  if (cambios.length === 0) {
    avisoChatEdicion.value = 'La IA no propuso cambios al documento.'
  } else if (fallidos.length > 0) {
    const ejemplos = fallidos.slice(0, 3).map(t => `"${t.length > 60 ? `${t.slice(0, 60)}…` : t}"`).join(', ')
    avisoChatEdicion.value = `Se aplicaron ${aplicados} de ${cambios.length} cambios. ` +
      `${fallidos.length} no se encontraron en el documento (${ejemplos}); complétalos en "Editar Manualmente".`
  } else {
    avisoChatEdicion.value = ''
  }
}

const procesarResultadoChatEdicion = (resultado: ResultadoChatEdicion) => {
  if (resultado.tipo !== 'documento_final') return
  if (resultado.cambios && modoWordFiel.value) {
    aplicarCambiosIAEnWord(resultado.cambios)
  } else if (resultado.textoModificado) {
    aplicarResultadoChatEdicion(resultado.textoModificado)
  }
}

const iniciarChatEdicion = async () => {
  if (!textoEditado.value) return
  chatEdicionCargando.value = true
  errorChatEdicion.value = ''
  try {
    const resultado = await chatEditarContratoIA(textoParaChatIA(), [], undefined, opcionesChatIA())
    chatEdicionIniciado.value = true
    chatEdicionMensajes.value.push({ esIA: true, contenido: resultado.mensaje })
    chatEdicionHistorialIA.value.push({ esIA: false, contenido: MENSAJE_INICIAL_CHAT_EDICION })
    chatEdicionHistorialIA.value.push({ esIA: true, contenido: resultado.mensaje })
    procesarResultadoChatEdicion(resultado)
  } catch (err) {
    console.error('Error al iniciar chat de edición:', err)
    errorChatEdicion.value = err instanceof Error ? err.message : 'No se pudo iniciar la conversación con la IA.'
  } finally {
    chatEdicionCargando.value = false
  }
}

const enviarRespuestaChatEdicion = async () => {
  const respuesta = chatEdicionRespuesta.value.trim()
  if (!respuesta || !textoEditado.value) return

  const historialPrevio = [...chatEdicionHistorialIA.value]
  chatEdicionMensajes.value.push({ esIA: false, contenido: respuesta })
  chatEdicionHistorialIA.value.push({ esIA: false, contenido: respuesta })
  chatEdicionRespuesta.value = ''
  chatEdicionCargando.value = true
  errorChatEdicion.value = ''
  try {
    const resultado = await chatEditarContratoIA(textoParaChatIA(), historialPrevio, respuesta, opcionesChatIA())
    chatEdicionMensajes.value.push({ esIA: true, contenido: resultado.mensaje })
    chatEdicionHistorialIA.value.push({ esIA: true, contenido: resultado.mensaje })
    procesarResultadoChatEdicion(resultado)
  } catch (err) {
    console.error('Error al continuar chat de edición:', err)
    errorChatEdicion.value = err instanceof Error ? err.message : 'No se pudo continuar la conversación con la IA.'
    // El mensaje no tuvo respuesta: se saca del historial (si quedara,
    // los siguientes envíos lo mandarían sin su respuesta) y se devuelve
    // al campo de texto para reenviarlo.
    chatEdicionHistorialIA.value = historialPrevio
    chatEdicionMensajes.value.pop()
    chatEdicionRespuesta.value = respuesta
  } finally {
    chatEdicionCargando.value = false
  }
}

// =========================
// HELPER DESCARGA
// =========================
const triggerDownload = (blob: Blob, fileName: string) => {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = fileName
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

// =========================
// DESCARGAR WORD (con marca de agua "LEXIT" y pie de página "Generado
// por LexIT" — descarga final del contrato, no para seguir editando)
// =========================
const descargarWord = async () => {
  // Plantilla Word: el Word original con los cambios y el membrete LEXIT,
  // sin reconstruirlo (mismo formato que la plantilla).
  if (modoWordFiel.value) {
    descargandoWord.value = true
    try {
      await descargarWordFiel(true)
    } catch (err) {
      console.error('Error descargando el Word:', err)
      avisoDescargaWord.value = err instanceof Error ? err.message : 'No se pudo descargar el Word.'
    } finally {
      descargandoWord.value = false
    }
    return
  }
  if (!textoHtml.value) return
  descargandoWord.value = true
  try {
    const blob = await exportToWordConMarcaDeAgua(textoHtml.value, currentTemplate.value?.name || 'contrato', plantillaFuenteDetectada.value)
    triggerDownload(blob, `${currentTemplate.value?.name || 'contrato'}.docx`)
  } catch (err) {
    console.error('Error exportando Word:', err)
  } finally {
    descargandoWord.value = false
  }
}

// =========================
// WATCH TEMPLATE
// =========================
watch(currentTemplate, async (newTemplate) => {
  if (!newTemplate?.storage_path) return
  if (esWordTemplate.value) {
    await loadWordPreview()
  } else {
    await loadPDFPreview()
  }
})
</script>

<style scoped>
/* ==============================
   Paleta clara verde-bosque/beige (misma familia que LandingPage.vue),
   variables propias con prefijo lx-, definidas solo dentro de
   .contratos-page. No se tocan las variables globales (--surface, --bg,
   etc. en src/css/app.scss).
   ============================== */
.contratos-page {
  --lx-bg: #FFFFFF;
  --lx-surface: #FFFFFF;
  --lx-surface-alt: #D9D4C6;
  --lx-surface-sunken: #BDB59B;
  --lx-border: rgba(23, 33, 27, 0.10);
  --lx-border-strong: rgba(23, 33, 27, 0.18);
  --lx-text: #17211B;
  --lx-text-muted: #3D473A;
  --lx-text-faint: #686A57;
  --lx-accent: #3D473A;
  --lx-accent-hover: #17211B;
  --lx-accent-soft: rgba(61, 71, 58, 0.10);
  --lx-accent-soft-strong: rgba(61, 71, 58, 0.20);
  --lx-ink: #F8F7F2;

  animation: floatUp 0.5s ease-out both;
}

/* .q-page trae max-width:1400px + margin:0 auto de MainLayout.vue (regla
   compartida por toda la app) — eso centra una columna angosta dejando ver
   el fondo claro de .page-container a los costados en pantallas anchas.
   (Un intento anterior con un ::before de position:fixed no funcionaba: al
   no crear .contratos-page su propio contexto de apilamiento, ese
   pseudo-elemento con z-index:-1 quedaba pintado DETRÁS del fondo de
   .page-container, no encima). La solución real es anular el ancho máximo
   y el centrado solo para esta página — mayor especificidad que ".q-page"
   (dos clases contra una) para que gane sin tocar esa regla compartida. */
.q-page.contratos-page {
  background: var(--lx-bg);
  max-width: none;
  margin: 0;
}

@keyframes floatUp {
  from { opacity: 0; transform: translateY(14px); }
  to   { opacity: 1; transform: translateY(0); }
}

/* ==============================
   Section header
   ============================== */
.page-header {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 24px;
}

.section-icon-wrap {
  width: 52px;
  height: 52px;
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  box-shadow: inset 0 0 0 1px var(--lx-accent-soft-strong);
}

.icon-purple { background: var(--lx-accent-soft); }

.page-title {
  font-family: 'Baskervville', 'EB Garamond', serif;
  font-size: 2rem;
  font-weight: 600;
  margin: 0;
  color: var(--lx-text);
}

.page-subtitle {
  margin: 2px 0 0;
  color: var(--lx-text-muted);
  font-size: 1rem;
}

/* ==============================
   Card system
   ============================== */
.lx-card {
  background: var(--lx-surface);
  border: 1px solid var(--lx-border);
  border-radius: 16px;
  box-shadow: 0 1px 2px rgba(23, 33, 27, 0.06), 0 12px 32px -16px rgba(23, 33, 27, 0.18);
  overflow: hidden;
}

.lx-card--mt { margin-top: 18px; }

.lx-card-header {
  padding: 18px 22px;
  background: linear-gradient(180deg, var(--lx-accent-soft), rgba(217, 122, 77, 0));
  border-bottom: 1px solid var(--lx-border);
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.lx-card-header-title {
  font-family: 'Baskervville', 'EB Garamond', serif;
  font-size: 1.15rem;
  font-weight: 600;
  letter-spacing: 0.01em;
  color: var(--lx-text);
  display: flex;
  align-items: center;
  gap: 10px;
}

.lx-card-body {
  padding: 22px;
}

.lx-action-btn {
  font-family: 'Baskervville', 'Figtree', sans-serif !important;
  border-radius: 10px !important;
}

/* ==============================
   Templates list
   ============================== */
.templates-list {
  max-height: 600px;
  overflow-y: auto;
}

.template-icon-wrap {
  width: 38px;
  height: 38px;
  border-radius: 10px;
  background: var(--lx-accent-soft);
  color: var(--lx-accent);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.2s, color 0.2s;
}

.template-item {
  border-radius: 10px;
  border-left: 3px solid transparent;
  padding-left: 13px;
  transition: background 0.2s, border-color 0.2s;
  margin: 3px 8px;
}

.template-item-name {
  color: var(--lx-text);
}

.template-item-desc {
  color: var(--lx-text-faint);
}

.empty-state-text {
  color: var(--lx-text-faint);
}

.template-item:hover { background: rgba(23, 33, 27, 0.05); }

.template-item.q-item--active {
  background: var(--lx-accent-soft);
  border-left-color: var(--lx-accent);
}

.template-item.q-item--active .template-icon-wrap {
  background: var(--lx-accent);
  color: #fff;
}

.template-item.q-item--active .template-item-name {
  color: #fff;
}

/* ==============================
   PDF viewer
   ============================== */
.editor-content { padding: 2rem 1.5rem; }

.pdf-canvas-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: var(--lx-surface-sunken);
  border: 1px solid var(--lx-border);
  border-radius: var(--border-radius);
  padding: 2rem 1rem;
  min-height: 500px;
}

.page-indicator-text {
  color: var(--lx-text);
}

.pdf-canvas {
  max-width: 100%;
  max-height: 600px;
  border-radius: var(--border-radius-small);
  border: 1px solid var(--lx-border);
  box-shadow: 0 12px 28px -10px rgba(23, 33, 27, 0.35);
  background: white !important;
}

canvas {
  max-width: 100%;
  border-radius: var(--border-radius-small);
  border: 1px solid var(--lx-border);
  box-shadow: var(--shadow-light);
  background: white !important;
}

/* Plantilla Word: hoja continua (sin paginación como el PDF) — se deja en
   blanco a propósito, como el papel real de un documento, apoyada sobre
   la card oscura */
/* Vista fiel del Word (componente VistaWord): alto generoso para ver el
   documento cómodo; la hoja se ajusta sola al ancho. */
.contrato-vista-word {
  height: 75vh;
  min-height: 480px;
}

.vista-word-ayuda {
  margin: 0 0 10px;
  font-size: 0.85rem;
  color: var(--lx-text-muted);
}

.download-aviso {
  font-size: 0.8rem;
  color: var(--lx-text-muted);
}

.word-preview-container {
  background: white;
  border: 1px solid var(--lx-border);
  border-radius: var(--border-radius-small);
  box-shadow: 0 12px 28px -10px rgba(23, 33, 27, 0.35);
  padding: 2.5rem 3rem;
  max-height: 640px;
  overflow-y: auto;
}

.pdf-loading, .pdf-error {
  min-height: 400px;
  background: var(--lx-surface-sunken);
  border-radius: var(--border-radius-small);
  border: 1px solid var(--lx-border);
}

/* ==============================
   Tabs (Editar Manualmente / Completar con IA)
   ============================== */
.lx-tabs {
  border-bottom: 1px solid var(--lx-border);
}

.lx-tabs :deep(.q-tab) {
  font-family: 'Baskervville', 'Figtree', sans-serif;
  font-weight: 600;
  font-size: 0.88rem;
  min-height: 44px;
  padding: 0 6px;
  margin-right: 22px;
}

/* Colores fijos (no los de Quasar): la pestaña activa se veía sin contraste. */
.lx-tabs :deep(.q-tab) {
  color: var(--lx-text-muted) !important;
  border-radius: 8px 8px 0 0;
}

.lx-tabs :deep(.q-tab--active) {
  color: var(--lx-text) !important;
  background: var(--lx-accent-soft);
}

.lx-tabs :deep(.q-tab__indicator) {
  color: var(--lx-accent);
}

.lx-tabs :deep(.q-tab__indicator) {
  height: 3px;
  border-radius: 3px 3px 0 0;
}

/* ==============================
   Chat de edición con IA
   ============================== */
.chat-edicion-panel {
  /* Beige claro (no el #BDB59B de --lx-surface-sunken): sobre ese fondo
     oscuro los textos del chat casi no se leían. */
  background: linear-gradient(165deg, #F8F7F2, var(--lx-surface-alt));
  border: 1px solid var(--lx-border);
  border-radius: 16px;
  padding: 1.6rem;
}

.chat-edicion-hint {
  display: flex;
  align-items: center;
  color: var(--lx-text-muted);
  font-weight: 500;
  font-size: 0.9rem;
  margin: 0 0 14px;
}

.chat-edicion-hint :deep(.q-icon) {
  color: var(--lx-accent);
}

.chat-edicion-hint-muted {
  color: var(--lx-text-muted);
  font-size: 0.85rem;
}

.chat-edicion-mensajes {
  display: flex;
  flex-direction: column;
  gap: 12px;
  max-height: 360px;
  overflow-y: auto;
  padding: 2px 4px 2px 2px;
}

.chat-edicion-fila {
  display: flex;
  align-items: flex-end;
  gap: 8px;
}

.chat-edicion-fila--ia { justify-content: flex-start; }
.chat-edicion-fila--user { justify-content: flex-end; }

.chat-edicion-avatar {
  flex-shrink: 0;
  width: 26px;
  height: 26px;
  border-radius: 50%;
  background: var(--lx-accent);
  color: var(--lx-ink);
  display: flex;
  align-items: center;
  justify-content: center;
}

.chat-edicion-burbuja {
  padding: 11px 15px;
  border-radius: 16px;
  font-size: 0.92rem;
  line-height: 1.55;
  max-width: 78%;
  white-space: pre-wrap;
  box-shadow: 0 2px 8px rgba(23, 33, 27, 0.10);
}

.chat-edicion-burbuja--ia {
  background: var(--lx-surface);
  border: 1px solid var(--lx-border);
  color: var(--lx-text);
  border-bottom-left-radius: 4px;
}

.chat-edicion-burbuja--user {
  background: var(--lx-accent);
  color: var(--lx-ink);
  font-weight: 500;
  border-bottom-right-radius: 4px;
}

.chat-edicion-start-btn {
  border-radius: 12px !important;
  padding: 10px 0 !important;
  font-family: 'Baskervville', 'Figtree', sans-serif !important;
  font-weight: 600 !important;
}

.chat-edicion-input :deep(.q-field__control) {
  border-radius: 10px;
  background: var(--lx-surface);
}

.chat-edicion-input :deep(.q-field__native) {
  color: var(--lx-text);
}

.chat-edicion-banner {
  background: rgba(47, 143, 91, 0.14) !important;
  color: var(--lx-text) !important;
  border: 1px solid rgba(47, 143, 91, 0.35);
}

/* ==============================
   Asistente de contratos (vista sin plantilla elegida)
   ============================== */
.asistente-contratos .chat-edicion-mensajes {
  max-height: 440px;
}

.asistente-bloque {
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-width: 85%;
}

.asistente-bloque--user {
  align-items: flex-end;
}

.asistente-bloque .chat-edicion-burbuja {
  max-width: 100%;
}

.asistente-plantillas {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.asistente-plantilla {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 10px 12px;
  background: var(--lx-surface);
  border: 1px solid var(--lx-border-strong);
  border-radius: 12px;
  font: inherit;
  color: var(--lx-text);
  text-align: left;
  cursor: pointer;
  transition: border-color 0.18s, box-shadow 0.18s, transform 0.18s;
}

.asistente-plantilla:hover,
.asistente-plantilla:focus-visible {
  border-color: var(--lx-accent);
  box-shadow: 0 6px 16px -8px rgba(23, 33, 27, 0.35);
  transform: translateY(-1px);
}

.asistente-plantilla-icono {
  color: var(--lx-accent);
  flex-shrink: 0;
}

.asistente-plantilla-texto {
  display: flex;
  flex-direction: column;
  min-width: 0;
  flex: 1;
}

.asistente-plantilla-nombre {
  font-weight: 600;
  font-size: 0.9rem;
}

.asistente-plantilla-desc {
  font-size: 0.8rem;
  color: var(--lx-text-muted);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.asistente-plantilla-accion {
  flex-shrink: 0;
  font-size: 0.78rem;
  font-weight: 600;
  color: var(--lx-accent);
}

@media (max-width: 600px) {
  .asistente-bloque { max-width: 100%; }
  .asistente-plantilla-accion { display: none; }
}

/* ==============================
   Barra de descarga
   ============================== */
.download-bar {
  padding: 18px 22px;
  background: var(--lx-surface-alt);
  border-top: 1px solid var(--lx-border);
}

.download-bar-label {
  display: flex;
  align-items: center;
  gap: 6px;
  font-family: 'Baskervville', 'Figtree', sans-serif;
  font-size: 0.82rem;
  font-weight: 600;
  letter-spacing: 0.02em;
  text-transform: uppercase;
  color: var(--lx-text-faint);
  margin-bottom: 12px;
}

.download-bar-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.download-btn {
  border-radius: 10px !important;
  font-family: 'Baskervville', 'Figtree', sans-serif !important;
  font-weight: 600 !important;
  padding: 0 18px !important;
}

.download-btn--primary {
  box-shadow: 0 4px 14px -4px rgba(61, 71, 58, 0.45);
}

/* ==============================
   Document preview
   ============================== */
.document-preview {
  font-family: 'Times New Roman', Times, serif;
  font-size: 12pt;
  line-height: 1.8;
  color: #1a1a1a;
}

.document-preview p {
  margin: 0 0 6px 0;
  text-align: justify;
}

/* ==============================
   Textos utilitarios de Quasar (text-grey-6/7) — se sobreescriben solo
   dentro de esta página para que se lean sobre el fondo oscuro; el resto
   de la app sigue usando los tonos por defecto de Quasar.
   ============================== */
.contratos-page :deep(.text-grey-6),
.contratos-page :deep(.text-grey-7) {
  color: var(--lx-text-muted) !important;
}
</style>
