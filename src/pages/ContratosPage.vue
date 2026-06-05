<template>
  <q-page class="q-pa-md">
    <div class="row q-col-gutter-md">
      <!-- Columna Izquierda: Templates -->
      <div class="col-12 col-md-4">
        <q-card class="templates-card">
          <q-card-section class="templates-header q-pa-md">
            <div class="text-h6 text-weight-bold text-dark">
              <q-icon name="description" size="sm" class="q-mr-sm" color="grey-9" />
              Plantillas de Contratos
            </div>
            <q-btn flat round dense icon="refresh" color="grey-9" @click="store.fetchTemplates()" :loading="isLoading" />
          </q-card-section>

          <q-separator />

          <q-card-section class="q-pa-none">
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
                  <q-avatar color="orange" text-color="white" icon="article" />
                </q-item-section>
                <q-item-section>
                  <q-item-label class="text-weight-medium text-dark">{{ template.name }}</q-item-label>
                  <q-item-label caption lines="2" class="text-grey-8">{{ template.description }}</q-item-label>
                </q-item-section>
                <q-item-section side>
                  <q-icon name="chevron_right" color="grey" />
                </q-item-section>
              </q-item>

              <q-item v-if="templates.length === 0 && !isLoading">
                <q-item-section class="text-center text-grey">
                  No hay plantillas disponibles
                </q-item-section>
              </q-item>
            </q-list>
          </q-card-section>
        </q-card>
      </div>

      <!-- Columna Derecha -->
      <div class="col-12 col-md-8">

        <!-- VISTA PREVIA DEL PDF -->
        <q-card class="editor-card" v-if="!modoEdicion">
          <q-card-section class="editor-header q-pa-md">
            <div class="row items-center justify-between">
              <div class="text-h6 text-weight-bold text-dark">
                <q-icon name="preview" size="sm" class="q-mr-sm" color="grey-9" />
                Vista Previa del Contrato
              </div>
              <q-btn
                v-if="pdfDoc"
                color="orange"
                icon="edit"
                label="Editar Contrato"
                @click="abrirEditor"
                unelevated
                :loading="extrayendoTexto"
              />
            </div>
          </q-card-section>

          <q-separator />

          <q-card-section class="editor-content">
            <div v-if="!currentTemplate" class="pdf-canvas-container">
              <q-icon name="touch_app" size="64px" color="grey-5" />
              <p class="text-grey-6 q-mt-md text-center">
                Selecciona una plantilla de la lista para ver su contenido
              </p>
            </div>

            <div v-else-if="loadingPdf" class="pdf-loading row items-center justify-center">
              <q-spinner-dots color="orange" size="50px" />
              <p class="q-ml-md text-grey-7">Cargando PDF...</p>
            </div>

            <div v-else-if="pdfError" class="pdf-error row items-center justify-center">
              <div class="text-center">
                <q-icon name="error_outline" size="48px" color="negative" />
                <p class="text-negative q-mt-md">{{ pdfError }}</p>
                <q-btn color="orange" label="Reintentar" @click="loadPDFPreview" class="q-mt-md" />
              </div>
            </div>

            <div v-else-if="pdfDoc" class="pdf-canvas-container">
              <canvas ref="pdfCanvas" class="pdf-canvas" />
              <div class="row items-center q-mt-md q-gutter-sm">
                <q-btn round color="orange" icon="chevron_left"
                  :disable="currentPage <= 1 || isRendering" @click="prevPage" />
                <span class="text-body1 text-dark">Página {{ currentPage }} de {{ numPages }}</span>
                <q-btn round color="orange" icon="chevron_right"
                  :disable="currentPage >= numPages || isRendering" @click="nextPage" />
              </div>
            </div>
          </q-card-section>
        </q-card>

        <!-- EDITOR DE CONTRATO -->
        <q-card class="editor-card" v-if="modoEdicion">
          <q-card-section class="editor-header q-pa-md">
            <div class="row items-center justify-between">
              <div class="text-h6 text-weight-bold text-dark">
                <q-icon name="edit_document" size="sm" class="q-mr-sm" color="grey-9" />
                Editando: {{ currentTemplate?.name }}
              </div>
              <q-btn flat icon="arrow_back" label="Volver" color="grey-9" @click="modoEdicion = false" />
            </div>
          </q-card-section>

          <q-separator />

          <!-- Tabs: Manual / IA -->
          <q-tabs v-model="tabEdicion" color="orange" active-color="orange" class="q-px-md q-pt-sm text-dark" align="left">
            <q-tab name="manual" icon="edit" label="Editar Manualmente" />
            <q-tab name="ia" icon="auto_awesome" label="Modificar con IA" />
          </q-tabs>

          <q-separator />

          <q-card-section>

            <!-- TAB MANUAL -->
            <div v-if="tabEdicion === 'manual'">
              <EditorContrato :model-value="textoHtml" @update:model-value="onEditorHtmlUpdate" />
            </div>

            <!-- TAB IA -->
            <div v-if="tabEdicion === 'ia'">
              <div class="ia-panel q-mb-md">
                <p class="text-grey-7 q-mb-sm text-weight-medium">
                  <q-icon name="auto_awesome" color="orange" class="q-mr-xs" />
                  Dile a Letsy AI qué cambios quieres:
                </p>

                <q-input
                  v-model="instruccionIA"
                  outlined
                  placeholder="Ej: Cambia el plazo a 2 años, el monto a S/. 1500 mensuales, y el nombre del arrendador a Juan Pérez..."
                  :rows="3"
                  type="textarea"
                  class="q-mb-md"
                />

                <q-btn
                  color="orange"
                  icon="auto_awesome"
                  label="Modificar con Letsy AI"
                  @click="modificarConIA"
                  :loading="cargandoIA"
                  unelevated
                  class="full-width"
                />

                <div v-if="cargandoIA" class="row items-center justify-center q-mt-md">
                  <q-spinner-dots color="orange" size="40px" />
                  <span class="q-ml-md text-grey-7">Letsy AI está modificando el contrato...</span>
                </div>
              </div>

              <!-- Preview del resultado de IA -->
              <div v-if="textoEditado && !cargandoIA">
                <q-separator class="q-mb-md" />
                <p class="text-grey-7 q-mb-sm text-weight-medium">Resultado (puedes seguir editando en la pestaña Manual):</p>
                <div class="document-container" style="max-height: 400px; overflow-y: auto;">
                  <div class="document-page">
                    <div class="document-preview" v-html="textoHtml" />
                  </div>
                </div>
              </div>
            </div>

          </q-card-section>

          <q-separator />

          <!-- Botones de descarga -->
          <q-card-section class="row q-gutter-sm items-center">
            <div class="text-grey-7 text-caption">Descargar como:</div>
            <q-btn
              color="blue-8"
              icon="description"
              label="Word (.docx)"
              @click="descargarWord"
              :loading="descargandoWord"
              unelevated
            />
            <q-btn
              color="red-8"
              icon="picture_as_pdf"
              label="PDF"
              @click="descargarPDF"
              :loading="descargandoPDF"
              unelevated
            />
          </q-card-section>
        </q-card>

        <!-- Sección Firebase Contratos -->
        <q-card class="firebase-section q-mt-md">
          <q-card-section>
            <div class="text-h6 text-weight-bold q-mb-md text-dark">
              <q-icon name="cloud" size="sm" class="q-mr-sm" color="grey-9" />
              Contratos Generados
            </div>

            <q-list bordered separator>
              <q-item
                v-for="contrato in store.firebaseContratos"
                :key="contrato.id"
                clickable v-ripple
                :active="store.selectedContrato?.id === contrato.id"
                @click="selectFirebaseContrato(contrato)"
              >
                <q-item-section avatar>
                  <q-avatar color="primary" text-color="white" icon="picture_as_pdf" />
                </q-item-section>
                <q-item-section>
                  <q-item-label class="text-dark">{{ contrato.name }}</q-item-label>
                  <q-item-label caption class="text-grey-8">{{ new Date(contrato.createdAt).toLocaleString('es-PE') }}</q-item-label>
                </q-item-section>
                <q-item-section side>
                  <q-btn flat round dense icon="download" color="orange"
                    @click.stop="downloadFirebaseContrato" :loading="fbDownloading" />
                </q-item-section>
              </q-item>

              <q-item v-if="store.firebaseContratos.length === 0">
                <q-item-section class="text-center text-grey">
                  No hay contratos generados aún
                </q-item-section>
              </q-item>
            </q-list>

            <div v-if="store.selectedContrato" class="q-mt-md">
              <q-separator class="q-mb-md" />
              <div v-if="fbLoadingPdf" class="pdf-loading row items-center justify-center">
                <q-spinner-dots color="orange" size="50px" />
                <p class="q-ml-md text-grey-7">Cargando contrato...</p>
              </div>
              <div v-else-if="fbPdfError" class="pdf-error row items-center justify-center">
                <div class="text-center">
                  <q-icon name="error_outline" size="48px" color="negative" />
                  <p class="text-negative q-mt-md">{{ fbPdfError }}</p>
                </div>
              </div>
              <div v-else-if="fbPdfDoc" class="pdf-canvas-container">
                <canvas ref="fbPdfCanvas" class="pdf-canvas" />
                <div class="row items-center q-mt-md q-gutter-sm">
                  <q-btn round color="orange" icon="chevron_left"
                    :disable="fbCurrentPage <= 1 || fbIsRendering" @click="fbPrevPage" />
                  <span class="text-body1 text-dark">Página {{ fbCurrentPage }} de {{ fbNumPages }}</span>
                  <q-btn round color="orange" icon="chevron_right"
                    :disable="fbCurrentPage >= fbNumPages || fbIsRendering" @click="fbNextPage" />
                </div>
              </div>
            </div>
          </q-card-section>
        </q-card>
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
import type { ContratoFirebase } from '../services/contratosService'
import type { ContractTemplate } from '../stores/contratos-store'
import { getDocument, GlobalWorkerOptions, type PDFDocumentProxy } from 'pdfjs-dist'
import { modificarPlantilla } from '../services/geminiService'
import { exportarWord, exportarPDF } from '../services/documentService'
import EditorContrato from '../components/EditorContrato.vue'

// ✅ Worker local que ya funciona
GlobalWorkerOptions.workerSrc = `${import.meta.env.BASE_URL}pdf.worker.min.js`

// =========================
// STORE
// =========================
const store = useContratosStore()
const { templates, currentTemplate, isLoading, error } = storeToRefs(store)

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
// PDF FIREBASE
// =========================
const fbPdfCanvas = ref<HTMLCanvasElement | null>(null)
const fbPdfDoc = shallowRef<PDFDocumentProxy | null>(null)
const fbCurrentPage = ref(1)
const fbNumPages = ref(0)
const fbLoadingPdf = ref(false)
const fbPdfError = ref<string | null>(null)
const fbDownloading = ref(false)
const fbIsRendering = ref(false)

// =========================
// EDITOR
// =========================
const modoEdicion = ref(false)
const tabEdicion = ref('manual')
const textoEditado = ref('')
const textoHtml = ref('')
const instruccionIA = ref('')
const cargandoIA = ref(false)
const descargandoWord = ref(false)
const descargandoPDF = ref(false)
const extrayendoTexto = ref(false)
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
  store.startListeningFirebaseContratos()
})

onUnmounted(() => {
  store.stopListeningFirebaseContratos()
  if (pdfDoc.value) { void pdfDoc.value.destroy(); pdfDoc.value = null }
  if (fbPdfDoc.value) { void fbPdfDoc.value.destroy(); fbPdfDoc.value = null }
})

// =========================
// SELECCIONAR TEMPLATE
// =========================
const selectTemplate = (template: ContractTemplate) => {
  store.setCurrentTemplate(template)
  modoEdicion.value = false
  textoEditado.value = ''
  textoHtml.value = ''
  instruccionIA.value = ''
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
const textoAHtml = (texto: string): string => {
  const procesado = texto
    .replace(/CLÁUSULA/g, '\n\nCLÁUSULA')
    .replace(/CONTRATO DE/g, '\n\nCONTRATO DE')
    .replace(/Definiciones/g, '\n\nDefiniciones')
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

      if (linea.startsWith('CLÁUSULA')) {
        return `<p style="font-weight:bold; font-size:11pt; font-family:Times New Roman; margin:12px 0 4px 0;">${linea}</p>`
      }

      if (linea === 'Definiciones') {
        return `<p style="font-weight:bold; font-size:12pt; font-family:Times New Roman; margin:12px 0 6px 0;">${linea}</p>`
      }

      return `<p style="text-align:justify; font-size:11pt; font-family:Times New Roman; margin:2px 0;">${linea}</p>`
    })
    .join('')
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
    console.error('❌ Error cargando PDF:', err)
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
// MODIFICAR CON IA
// =========================
const modificarConIA = async () => {
  if (!instruccionIA.value.trim() || !textoEditado.value) return

  cargandoIA.value = true
  try {
    const resultado = await modificarPlantilla(textoEditado.value, instruccionIA.value)
    textoEditado.value = resultado
    textoHtml.value = textoAHtml(resultado)
    instruccionIA.value = ''
  } catch (err) {
    console.error('❌ Error IA:', err)
  } finally {
    cargandoIA.value = false
  }
}

// =========================
// DESCARGAR WORD
// =========================
const descargarWord = async () => {
  if (!textoEditado.value) return
  descargandoWord.value = true
  try {
    await exportarWord(textoEditado.value, currentTemplate.value?.name || 'contrato')
  } catch (err) {
    console.error('❌ Error exportando Word:', err)
  } finally {
    descargandoWord.value = false
  }
}

// =========================
// DESCARGAR PDF
// =========================
const descargarPDF = () => {
  if (!textoEditado.value) return
  descargandoPDF.value = true
  try {
    exportarPDF(textoEditado.value, currentTemplate.value?.name || 'contrato')
  } catch (err) {
    console.error('❌ Error exportando PDF:', err)
  } finally {
    descargandoPDF.value = false
  }
}

// =========================
// FIREBASE CONTRATOS
// =========================
const selectFirebaseContrato = async (contrato: ContratoFirebase) => {
  store.selectFirebaseContrato(contrato)
  fbLoadingPdf.value = true
  fbPdfError.value = null
  try {
    const blob = await store.downloadFirebaseContrato(contrato.storagePath)
    const arrayBuffer = await blob.arrayBuffer()
    const pdf = await getDocument({ data: arrayBuffer }).promise
    fbPdfDoc.value = pdf
    fbNumPages.value = pdf.numPages
    fbCurrentPage.value = 1
    fbLoadingPdf.value = false
    setTimeout(() => { void renderFbPage(1) }, 300)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  } catch (err) {
    fbPdfError.value = 'Error al cargar PDF'
    fbLoadingPdf.value = false
  }
}

const renderFbPage = async (pageNum: number) => {
  if (!fbPdfDoc.value || !fbPdfCanvas.value || fbIsRendering.value) return
  fbIsRendering.value = true
  try {
    const page = await fbPdfDoc.value.getPage(pageNum)
    const viewport = page.getViewport({ scale: 1.5 })
    const canvas = fbPdfCanvas.value
    const context = canvas.getContext('2d')
    if (!context) return
    canvas.height = viewport.height
    canvas.width = viewport.width
    context.clearRect(0, 0, canvas.width, canvas.height)
    await page.render({ canvasContext: context, viewport }).promise
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  } catch (err) {
    fbPdfError.value = 'Error al renderizar PDF'
  } finally {
    fbIsRendering.value = false
  }
}

const fbPrevPage = async () => {
  if (fbCurrentPage.value <= 1) return
  fbCurrentPage.value--
  await renderFbPage(fbCurrentPage.value)
}

const fbNextPage = async () => {
  if (fbCurrentPage.value >= fbNumPages.value) return
  fbCurrentPage.value++
  await renderFbPage(fbCurrentPage.value)
}

const downloadFirebaseContrato = async () => {
  const contrato = store.selectedContrato
  if (!contrato) return
  fbDownloading.value = true
  try {
    const blob = await store.downloadFirebaseContrato(contrato.storagePath)
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = contrato.name + '.pdf'
    a.click()
    URL.revokeObjectURL(url)
  } catch (err) {
    console.error('❌ Error descargando:', err)
  } finally {
    fbDownloading.value = false
  }
}

// =========================
// WATCH TEMPLATE
// =========================
watch(currentTemplate, async (newTemplate) => {
  if (newTemplate?.storage_path) await loadPDFPreview()
})
</script>

<style scoped>
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

.ia-panel {
  background: rgba(255, 152, 0, 0.05);
  border: 1px solid rgba(255, 152, 0, 0.2);
  border-radius: 12px;
  padding: 1.5rem;
}

canvas {
  max-width: 100%;
  border-radius: 8px;
  box-shadow: 0 4px 10px rgba(0,0,0,0.15);
  background: white !important;
}

.pdf-canvas-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #f5f5f5 0%, #ffffff 100%);
  border: 2px solid #e0e0e0;
  border-radius: 12px;
  padding: 2rem 1rem;
  min-height: 500px;
}

.pdf-canvas {
  max-height: 600px;
  box-shadow: 0 8px 20px rgba(0,0,0,0.2);
  border-radius: 8px;
}

.pdf-loading, .pdf-error {
  min-height: 400px;
  background: #fafafa;
  border-radius: 8px;
  border: 2px solid #e0e0e0;
}

.editor-card {
  border: 1px solid rgba(255, 152, 0, 0.2);
  border-radius: 12px;
  background: rgba(255, 152, 0, 0.02);
}

.editor-header {
  border-bottom: 1px solid rgba(255, 152, 0, 0.15);
  background: rgba(255, 152, 0, 0.05);
  border-radius: 12px 12px 0 0;
}

.editor-content { padding: 2rem 1.5rem; }

.firebase-section {
  padding: 1rem;
  background: rgba(255, 152, 0, 0.03);
  border-radius: 12px;
  border: 1px solid rgba(255, 152, 0, 0.15);
}

.templates-card {
  border: 1px solid rgba(0, 0, 0, 0.1);
  border-radius: 12px;
}

.templates-header {
  background: linear-gradient(135deg, rgba(255, 152, 0, 0.1) 0%, rgba(255, 152, 0, 0.05) 100%);
  border-bottom: 2px solid rgba(255, 152, 0, 0.2);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.templates-list { max-height: 600px; overflow-y: auto; }

.template-item { border-radius: 8px; transition: all 0.3s ease; }
.template-item:hover { background: rgba(255, 152, 0, 0.05); }
.template-item.q-item--active {
  background: rgba(255, 152, 0, 0.15);
  border-left: 3px solid #ff9800;
}

.templates-header,
.editor-header,
.firebase-section {
  color: #212529;
}

.templates-list .q-item,
.firebase-section .q-list .q-item {
  color: #212529;
}
</style>
