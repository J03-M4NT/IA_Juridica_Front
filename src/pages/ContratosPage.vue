<template>
  <q-page class="contratos-page">

    <!-- Section header -->
    <div class="page-header">
      <div class="section-icon-wrap icon-purple">
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#D97A4D" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
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
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#D97A4D" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
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
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#D97A4D" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z"/><circle cx="12" cy="12" r="3"/>
              </svg>
              Vista Previa del Contrato
            </div>
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
            <div v-if="!currentTemplate" class="pdf-canvas-container">
              <q-icon name="touch_app" size="64px" color="grey-6" />
              <p class="text-grey-6 q-mt-md text-center">
                Selecciona una plantilla de la lista para ver su contenido
              </p>
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

            <!-- Word: sin "páginas" que paginar — se muestra el HTML extraído
                 directo, como una hoja continua. -->
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
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#D97A4D" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                <path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4z"/>
              </svg>
              Editando: {{ currentTemplate?.name }}
            </div>
            <q-btn flat no-caps icon="arrow_back" label="Volver" color="grey-5" @click="modoEdicion = false" />
          </div>

          <!-- Tabs: Manual / Chat -->
          <q-tabs v-model="tabEdicion" color="grey-5" active-color="accent" class="lx-tabs q-px-md q-pt-sm" align="left" no-caps>
            <q-tab name="manual" icon="edit" label="Editar Manualmente" />
            <q-tab name="chat" icon="chat" label="Completar con IA" />
          </q-tabs>

          <div class="lx-card-body">

            <!-- TAB MANUAL -->
            <div v-if="tabEdicion === 'manual'">
              <EditorContrato :model-value="textoHtml" @update:model-value="onEditorHtmlUpdate" />
            </div>

            <!-- TAB CHAT: la IA analiza el contrato y pregunta un dato a la vez
                 hasta completarlo/modificarlo -->
            <div v-if="tabEdicion === 'chat'">
              <div class="chat-edicion-panel">
                <p class="chat-edicion-hint">
                  <q-icon name="chat" class="q-mr-xs" />
                  LexIT AI te va a preguntar los datos que faltan, uno a la vez.
                </p>

                <div v-if="chatEdicionMensajes.length" class="chat-edicion-mensajes q-mb-md">
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
                    dark
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
              <q-btn
                outline
                color="grey-4"
                icon="picture_as_pdf"
                label="PDF"
                @click="descargarPDF"
                :loading="descargandoPDF"
                no-caps
                class="download-btn"
              />
              <q-btn
                outline
                color="grey-4"
                icon="edit_document"
                label="Descargar y abrir en Word"
                @click="abrirEnWord"
                :loading="abriendoEnWord"
                no-caps
                class="download-btn"
              />
            </div>
            <p v-if="errorAbrirWord" class="text-negative text-caption q-mt-sm q-mb-none">{{ errorAbrirWord }}</p>
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
  watch
} from 'vue'
import { storeToRefs } from 'pinia'
import { useContratosStore } from '../stores/contratos-store'
import { useAuthStore } from '../stores/auth'
import type { ContractTemplate } from '../stores/contratos-store'
import { getDocument, GlobalWorkerOptions, type PDFDocumentProxy } from 'pdfjs-dist'
import { chatEditarContratoIA, type MensajeChatEdicion } from '../services/geminiService'
import { exportToWord, exportToWordConMarcaDeAgua, exportToPDF } from '../utils/documentExport'
import { extraerHtmlWord } from '../utils/mammothExtractor'
import { subirDocumentoTemporal, obtenerUrlFirmadaDocumento } from '../services/documentosTemporalesService'
import EditorContrato from '../components/EditorContrato.vue'

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
const descargandoPDF = ref(false)
const extrayendoTexto = ref(false)
const abriendoEnWord = ref(false)
const errorAbrirWord = ref('')

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
  reiniciarChatEdicion()
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

  try {
    const blob = await store.downloadOriginalPDF(currentTemplate.value.id)
    const archivo = new File(
      [blob],
      currentTemplate.value.name || 'plantilla.docx',
      { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' }
    )
    const { html, fuenteDetectada } = await extraerHtmlWord(archivo)
    textoHtml.value = html
    textoEditado.value = stripHtml(html)
    plantillaFuenteDetectada.value = fuenteDetectada ?? undefined
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
}

const aplicarResultadoChatEdicion = (textoModificado: string) => {
  textoEditado.value = textoModificado
  textoHtml.value = textoAHtml(textoModificado)
  chatEdicionTerminado.value = true
}

const iniciarChatEdicion = async () => {
  if (!textoEditado.value) return
  chatEdicionCargando.value = true
  errorChatEdicion.value = ''
  try {
    const resultado = await chatEditarContratoIA(textoEditado.value, [])
    chatEdicionIniciado.value = true
    chatEdicionMensajes.value.push({ esIA: true, contenido: resultado.mensaje })
    chatEdicionHistorialIA.value.push({ esIA: false, contenido: MENSAJE_INICIAL_CHAT_EDICION })
    chatEdicionHistorialIA.value.push({ esIA: true, contenido: resultado.mensaje })
    if (resultado.tipo === 'documento_final' && resultado.textoModificado) {
      aplicarResultadoChatEdicion(resultado.textoModificado)
    }
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
    const resultado = await chatEditarContratoIA(textoEditado.value, historialPrevio, respuesta)
    chatEdicionMensajes.value.push({ esIA: true, contenido: resultado.mensaje })
    chatEdicionHistorialIA.value.push({ esIA: true, contenido: resultado.mensaje })
    if (resultado.tipo === 'documento_final' && resultado.textoModificado) {
      aplicarResultadoChatEdicion(resultado.textoModificado)
    }
  } catch (err) {
    console.error('Error al continuar chat de edición:', err)
    errorChatEdicion.value = err instanceof Error ? err.message : 'No se pudo continuar la conversación con la IA.'
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
// ABRIR EN WORD (mismo flujo que Consultas: documento LIMPIO, sin marca
// de agua, subido a Storage temporal y abierto vía URL firmada para
// seguir editando en Word de escritorio con el Add-in)
// =========================
const abrirEnWord = async () => {
  if (!textoHtml.value) return
  const uid = authStore.user?.uid
  if (!uid) {
    errorAbrirWord.value = 'No hay una sesión activa.'
    return
  }
  abriendoEnWord.value = true
  errorAbrirWord.value = ''
  try {
    const nombre = `${currentTemplate.value?.name || 'contrato'}.docx`
    const blob = await exportToWord(textoHtml.value, currentTemplate.value?.name || 'contrato', plantillaFuenteDetectada.value)
    const archivo = new File([blob], nombre, {
      type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    })
    const storagePath = await subirDocumentoTemporal(uid, archivo)
    const urlFirmada = await obtenerUrlFirmadaDocumento(storagePath)
    window.location.href = urlFirmada
  } catch (err) {
    console.error('Error al abrir en Word:', err)
    errorAbrirWord.value = err instanceof Error ? err.message : 'No se pudo abrir en Word.'
  } finally {
    abriendoEnWord.value = false
  }
}

// =========================
// DESCARGAR PDF
// =========================
const descargarPDF = async () => {
  if (!textoHtml.value) return
  descargandoPDF.value = true
  try {
    const blob = await exportToPDF(textoHtml.value, currentTemplate.value?.name || 'contrato')
    triggerDownload(blob, `${currentTemplate.value?.name || 'contrato'}.pdf`)
  } catch (err) {
    console.error('Error exportando PDF:', err)
  } finally {
    descargandoPDF.value = false
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
   Paleta oscura de esta página — variables propias, con prefijo lx-,
   definidas solo dentro de .contratos-page. No se tocan las variables
   globales (--surface, --bg, etc. en src/css/app.scss), así que el resto
   de la app (Consultas, Normas, Admin) sigue con el tema claro de siempre.
   ============================== */
.contratos-page {
  --lx-bg: #17140f;
  --lx-surface: #201b16;
  --lx-surface-alt: #1a1611;
  --lx-surface-sunken: #14110d;
  --lx-border: rgba(255, 255, 255, 0.08);
  --lx-border-strong: rgba(255, 255, 255, 0.14);
  --lx-text: #f2ece1;
  --lx-text-muted: #b7ab9a;
  --lx-text-faint: #8a8072;
  --lx-accent: #D97A4D;
  --lx-accent-soft: rgba(217, 122, 77, 0.14);
  --lx-accent-soft-strong: rgba(217, 122, 77, 0.24);

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
  font-family: 'EB Garamond', serif;
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
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.2), 0 12px 32px -14px rgba(0, 0, 0, 0.5);
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
  font-family: 'EB Garamond', serif;
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
  font-family: 'Figtree', sans-serif !important;
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

.template-item:hover { background: rgba(255, 255, 255, 0.04); }

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
  box-shadow: 0 12px 28px -10px rgba(0, 0, 0, 0.6);
  background: white !important;
}

canvas {
  max-width: 100%;
  border-radius: var(--border-radius-small);
  box-shadow: var(--shadow-light);
  background: white !important;
}

/* Plantilla Word: hoja continua (sin paginación como el PDF) — se deja en
   blanco a propósito, como el papel real de un documento, apoyada sobre
   la card oscura */
.word-preview-container {
  background: white;
  border-radius: var(--border-radius-small);
  box-shadow: 0 12px 28px -10px rgba(0, 0, 0, 0.6);
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
  font-family: 'Figtree', sans-serif;
  font-weight: 600;
  font-size: 0.88rem;
  min-height: 44px;
  padding: 0 6px;
  margin-right: 22px;
}

.lx-tabs :deep(.q-tab__indicator) {
  height: 3px;
  border-radius: 3px 3px 0 0;
}

/* ==============================
   Chat de edición con IA
   ============================== */
.chat-edicion-panel {
  background: linear-gradient(165deg, var(--lx-surface-alt), var(--lx-surface-sunken));
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
  color: var(--lx-text-faint);
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
  color: #1a1310;
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
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.25);
}

.chat-edicion-burbuja--ia {
  background: var(--lx-surface);
  border: 1px solid var(--lx-border);
  color: var(--lx-text);
  border-bottom-left-radius: 4px;
}

.chat-edicion-burbuja--user {
  background: var(--lx-accent);
  color: #1a1310;
  font-weight: 500;
  border-bottom-right-radius: 4px;
}

.chat-edicion-start-btn {
  border-radius: 12px !important;
  padding: 10px 0 !important;
  font-family: 'Figtree', sans-serif !important;
  font-weight: 600 !important;
}

.chat-edicion-input :deep(.q-field__control) {
  border-radius: 10px;
  background: var(--lx-surface-sunken);
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
  font-family: 'Figtree', sans-serif;
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
  font-family: 'Figtree', sans-serif !important;
  font-weight: 600 !important;
  padding: 0 18px !important;
}

.download-btn--primary {
  box-shadow: 0 4px 14px -4px rgba(217, 122, 77, 0.5);
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
