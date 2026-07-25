<template>
  <q-page class="admin-page">

    <!-- Section header -->
    <div class="page-header">
      <div class="section-icon-wrap icon-admin">
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#d97a3e" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
        </svg>
      </div>
      <div>
        <h1 class="page-title">Panel de Administración</h1>
        <p class="page-subtitle">Gestión de plantillas de contratos</p>
      </div>
    </div>

    <!-- Stat cards -->
    <div class="stats-row q-mb-lg">
      <div class="stat-card">
        <div class="stat-icon-wrap icon-teal">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#1fa8bb" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
            <path d="M14 2v6h6"/>
          </svg>
        </div>
        <div>
          <div class="stat-number">{{ templates.length }}</div>
          <div class="stat-label">Plantillas activas</div>
        </div>
      </div>

      <!-- ✅ Stat card Pinecone -->
      <div class="stat-card">
        <div class="stat-icon-wrap icon-purple">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
            <ellipse cx="12" cy="5" rx="9" ry="3"/>
            <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/>
            <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/>
          </svg>
        </div>
        <div>
          <div class="stat-number">{{ vectoresTotales }}</div>
          <div class="stat-label">Vectores en Pinecone</div>
        </div>
      </div>
    </div>

    <!-- ✅ SECCIÓN PINECONE -->
    <div class="section-block q-mb-lg">
      <div class="actions-bar q-mb-md">
        <span class="section-label">Base de datos jurídica (Pinecone)</span>
        <div class="row q-gutter-sm">
          <q-btn
            color="purple"
            icon="cloud_upload"
            label="Subir PDF a Pinecone"
            no-caps unelevated
            @click="pineconeDialog = true"
          />
          <q-btn
            outline
            color="purple"
            icon="refresh"
            label="Actualizar stats"
            no-caps
            :loading="cargandoStats"
            @click="cargarStatsPinecone"
          />
        </div>
      </div>

      <!-- Info de Pinecone -->
      <div class="pinecone-info-card">
        <div class="row items-center q-gutter-md">
          <q-icon name="info" color="purple" size="20px" />
          <span class="text-grey-7" style="font-size:0.9rem;">
            Los PDFs subidos aquí se indexan en Pinecone y son usados por la IA para responder consultas jurídicas con información precisa y verificada.
          </span>
        </div>

        <!-- Documentos indexados -->
        <div v-if="documentosIndexados.length > 0" class="q-mt-md">
          <div class="text-weight-bold text-grey-8 q-mb-sm" style="font-size:0.85rem;">
            DOCUMENTOS INDEXADOS
          </div>
          <div class="row q-gutter-sm">
            <q-chip
              v-for="doc in documentosIndexados"
              :key="doc.id"
              color="purple"
              text-color="white"
              icon="description"
              removable
              @remove="eliminarDeIndexados(doc)"
            >
              {{ doc.nombre }}
            </q-chip>
          </div>
        </div>

        <div v-else class="q-mt-sm text-grey-5" style="font-size:0.85rem;">
          No hay documentos indexados aún. Sube un PDF jurídico para comenzar.
        </div>
      </div>
    </div>

    <!-- Actions bar plantillas -->
    <div class="actions-bar q-mb-md">
      <span class="section-label">Plantillas de contratos</span>
      <button class="add-btn" @click="uploadDialog = true">
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M12 5v14M5 12h14"/>
        </svg>
        Nueva plantilla
      </button>
    </div>

    <!-- Templates table card -->
    <div class="table-card">
      <q-table
        :rows="templates"
        :columns="columns"
        row-key="id"
        :loading="loadingTemplates"
        flat
        :pagination="{ rowsPerPage: 10 }"
        no-data-label="No hay plantillas cargadas"
        class="lx-table"
      >
        <template #body-cell-actions="props">
          <q-td :props="props">
            <div class="table-actions">
              <button class="icon-btn icon-btn--teal" @click="downloadTemplate(props.row)">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="M7 10l5 5 5-5"/><path d="M12 15V3"/>
                </svg>
              </button>
              <button class="icon-btn icon-btn--red" @click="confirmDelete(props.row)">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                </svg>
              </button>
            </div>
          </q-td>
        </template>

        <template #body-cell-type="props">
          <q-td :props="props">
            <span class="type-badge">{{ props.row.type || 'general' }}</span>
          </q-td>
        </template>
      </q-table>
    </div>

    <!-- ✅ DIALOG SUBIR PDF A PINECONE -->
    <q-dialog v-model="pineconeDialog" persistent>
      <div class="lx-dialog-card">
        <div class="lx-dialog-header">
          <span class="lx-dialog-title">Subir PDF a Pinecone</span>
          <button class="lx-dialog-close" type="button" @click="pineconeDialog = false">✕</button>
        </div>
        <div class="lx-dialog-body">

          <q-input
            v-model="pdfPinecone.nombre"
            label="Nombre del documento *"
            outlined dense
            label-color="grey-8" color="purple" input-class="text-grey-9"
            hint="Ej: Código Penal Peruano"
            :rules="[v => !!v || 'Requerido']"
            class="lx-input q-mb-sm"
          />

          <q-select
            v-model="pdfPinecone.tipo"
            label="Tipo de documento *"
            outlined dense
            label-color="grey-8" color="purple"
            :options="tiposDocumento"
            :rules="[v => !!v || 'Requerido']"
            class="lx-input q-mb-sm"
          />

          <q-file
            v-model="pdfPinecone.archivo"
            label="Archivo PDF *"
            outlined dense
            label-color="grey-8" color="purple"
            accept=".pdf"
            max-file-size="20971520"
            :rules="[v => !!v || 'Selecciona un PDF']"
            class="lx-input q-mb-md"
          >
            <template #prepend>
              <q-icon name="attach_file" color="grey-7" />
            </template>
          </q-file>

          <!-- Progress -->
          <div v-if="subiendoPinecone" class="q-mb-md">
            <div class="text-purple text-caption q-mb-xs">
              {{ progresoPinecone }}
            </div>
            <q-linear-progress
              :value="porcentajePinecone"
              color="purple"
              track-color="purple-1"
              rounded
              size="8px"
            />
          </div>

          <div class="lx-dialog-footer">
            <button class="lx-btn-ghost" type="button" @click="pineconeDialog = false">
              Cancelar
            </button>
            <q-btn
              color="purple"
              label="Indexar en Pinecone"
              icon="cloud_upload"
              no-caps unelevated
              :loading="subiendoPinecone"
              :disable="!pdfPinecone.nombre || !pdfPinecone.tipo || !pdfPinecone.archivo"
              @click="subirPDFaPinecone"
            />
          </div>
        </div>
      </div>
    </q-dialog>

    <!-- Upload dialog plantillas -->
    <q-dialog v-model="uploadDialog" persistent>
      <div class="lx-dialog-card">
        <div class="lx-dialog-header">
          <span class="lx-dialog-title">Subir nueva plantilla</span>
          <button class="lx-dialog-close" type="button" @click="uploadDialog = false">✕</button>
        </div>
        <div class="lx-dialog-body">
          <q-input
            v-model="newTemplate.name"
            label="Nombre de la plantilla *"
            outlined dense
            label-color="grey-8" color="purple" input-class="text-grey-9"
            :rules="[v => !!v || 'Requerido']"
            class="lx-input q-mb-sm"
          />
          <q-input
            v-model="newTemplate.type"
            label="Tipo de contrato *"
            outlined dense
            label-color="grey-8" color="purple" input-class="text-grey-9"
            hint="Ej: laboral, arrendamiento, compraventa"
            :rules="[v => !!v || 'Requerido']"
            class="lx-input q-mb-sm"
          />
          <q-input
            v-model="newTemplate.description"
            label="Descripción"
            outlined dense
            label-color="grey-8" color="purple" input-class="text-grey-9"
            type="textarea" autogrow
            class="lx-input q-mb-sm"
          />
          <q-file
            v-model="newTemplate.file"
            label="Archivo PDF *"
            outlined dense
            label-color="grey-8" color="purple" input-class="text-grey-9"
            accept=".pdf"
            :rules="[v => !!v || 'Selecciona un archivo PDF']"
            class="lx-input"
          >
            <template #prepend>
              <q-icon name="attach_file" color="grey-7" />
            </template>
          </q-file>

          <div class="lx-dialog-footer">
            <button class="lx-btn-ghost" type="button" @click="uploadDialog = false">Cancelar</button>
            <q-btn
              color="dark"
              label="Subir plantilla"
              no-caps unelevated
              :loading="uploading"
              :disable="!newTemplate.name || !newTemplate.type || !newTemplate.file"
              @click="submitUpload"
              class="lx-submit-btn"
            />
          </div>
        </div>
      </div>
    </q-dialog>

    <!-- Delete confirmation dialog -->
    <q-dialog v-model="deleteDialog" persistent>
      <div class="lx-dialog-card">
        <div class="lx-dialog-header">
          <span class="lx-dialog-title">Eliminar plantilla</span>
          <button class="lx-dialog-close" type="button" @click="deleteDialog = false">✕</button>
        </div>
        <div class="lx-dialog-body">
          <p class="delete-warning-text">
            ¿Seguro que deseas eliminar <strong>{{ templateToDelete?.name }}</strong>?
            Esta acción no se puede deshacer.
          </p>
          <div class="lx-dialog-footer">
            <button class="lx-btn-ghost" type="button" @click="deleteDialog = false">Cancelar</button>
            <q-btn
              color="negative"
              label="Eliminar"
              no-caps unelevated
              :loading="deleting"
              @click="submitDelete"
            />
          </div>
        </div>
      </div>
    </q-dialog>

  </q-page>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useQuasar } from 'quasar'
import { collection, getDocs, orderBy, query } from 'firebase/firestore'
import { db } from '../firebase/firebaseConfig'
import { uploadTemplate, deleteTemplate, getTemplateDownloadURL } from '../services/contratosService'
import { guardarDocumentoEnPinecone, verificarConexionPinecone } from '../services/pineconeService'
import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist'

GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js'

const $q = useQuasar()

interface Template {
  id: string
  name: string
  type: string
  description?: string
  storage_path: string
}

interface DocumentoIndexado {
  id: string
  nombre: string
  tipo: string
  chunks: number
}

// =========================
// ESTADO PLANTILLAS
// =========================
const templates = ref<Template[]>([])
const loadingTemplates = ref(false)
const uploading = ref(false)
const deleting = ref(false)
const uploadDialog = ref(false)
const deleteDialog = ref(false)
const templateToDelete = ref<Template | null>(null)

const newTemplate = ref({
  name: '',
  type: '',
  description: '',
  file: null as File | null
})

// =========================
// ESTADO PINECONE
// =========================
const pineconeDialog = ref(false)
const subiendoPinecone = ref(false)
const cargandoStats = ref(false)
const vectoresTotales = ref(0)
const progresoPinecone = ref('')
const porcentajePinecone = ref(0)
const documentosIndexados = ref<DocumentoIndexado[]>([])

const tiposDocumento = [
  'codigo-penal',
  'codigo-civil',
  'codigo-laboral',
  'codigo-tributario',
  'constitucion',
  'ley-general',
  'jurisprudencia',
  'contrato',
  'reglamento',
  'otro'
]

const pdfPinecone = ref({
  nombre: '',
  tipo: '',
  archivo: null as File | null
})

const columns = [
  { name: 'name', label: 'Nombre', field: 'name', align: 'left' as const, sortable: true },
  { name: 'type', label: 'Tipo', field: 'type', align: 'left' as const, sortable: true },
  { name: 'description', label: 'Descripción', field: 'description', align: 'left' as const },
  { name: 'actions', label: 'Acciones', field: 'actions', align: 'center' as const }
]

// =========================
// CARGAR STATS PINECONE
// =========================
const cargarStatsPinecone = async () => {
  cargandoStats.value = true
  try {
    await verificarConexionPinecone()
    // Cargar documentos indexados del localStorage
    const guardados = localStorage.getItem('pinecone_documentos')
    if (guardados) {
      documentosIndexados.value = JSON.parse(guardados) as DocumentoIndexado[]
    }
  } catch (err) {
    console.error('Error stats Pinecone:', err)
  } finally {
    cargandoStats.value = false
  }
}

// =========================
// EXTRAER TEXTO DEL PDF
// =========================
const extraerTextoPDF = async (archivo: File): Promise<string> => {
  const arrayBuffer = await archivo.arrayBuffer()
  const pdf = await getDocument({ data: arrayBuffer }).promise
  let textoCompleto = ''

  for (let i = 1; i <= pdf.numPages; i++) {
    progresoPinecone.value = `Extrayendo texto: página ${i} de ${pdf.numPages}...`
    porcentajePinecone.value = (i / pdf.numPages) * 0.3 // 30% del progreso

    const page = await pdf.getPage(i)
    const content = await page.getTextContent()
    const texto = content.items
      .map((item) => ('str' in item ? item.str : ''))
      .join(' ')
    textoCompleto += texto + '\n\n'
  }

  return textoCompleto.trim()
}

// =========================
// SUBIR PDF A PINECONE
// =========================
const subirPDFaPinecone = async () => {
  if (!pdfPinecone.value.archivo) return

  subiendoPinecone.value = true
  porcentajePinecone.value = 0
  progresoPinecone.value = 'Iniciando...'

  try {
    // 1. Extraer texto del PDF
    progresoPinecone.value = 'Extrayendo texto del PDF...'
    const texto = await extraerTextoPDF(pdfPinecone.value.archivo)

    if (!texto || texto.length < 50) {
      throw new Error('No se pudo extraer texto del PDF. Verifica que no esté escaneado.')
    }

    // 2. Guardar en Pinecone
    progresoPinecone.value = 'Indexando en Pinecone...'
    porcentajePinecone.value = 0.4

    const documentoId = `${pdfPinecone.value.tipo}_${Date.now()}`

    const resultado = await guardarDocumentoEnPinecone(
      documentoId,
      pdfPinecone.value.nombre,
      texto,
      pdfPinecone.value.tipo
    )

    porcentajePinecone.value = 1

    // 3. Guardar registro local
    const nuevoDoc: DocumentoIndexado = {
      id: documentoId,
      nombre: pdfPinecone.value.nombre,
      tipo: pdfPinecone.value.tipo,
      chunks: resultado.chunksGuardados
    }

    documentosIndexados.value.push(nuevoDoc)
    localStorage.setItem('pinecone_documentos', JSON.stringify(documentosIndexados.value))

    // 4. Actualizar contador
    vectoresTotales.value += resultado.chunksGuardados

    $q.notify({
      type: 'positive',
      message: `✅ "${pdfPinecone.value.nombre}" indexado correctamente (${resultado.chunksGuardados} fragmentos)`,
      timeout: 5000
    })

    pineconeDialog.value = false
    pdfPinecone.value = { nombre: '', tipo: '', archivo: null }

  } catch (err) {
    const error = err as Error
    console.error('❌ Error subiendo a Pinecone:', error)
    $q.notify({
      type: 'negative',
      message: `Error: ${error.message}`,
      timeout: 6000
    })
  } finally {
    subiendoPinecone.value = false
    progresoPinecone.value = ''
    porcentajePinecone.value = 0
  }
}

// =========================
// ELIMINAR DE INDEXADOS
// =========================
const eliminarDeIndexados = (doc: DocumentoIndexado) => {
  documentosIndexados.value = documentosIndexados.value.filter(d => d.id !== doc.id)
  localStorage.setItem('pinecone_documentos', JSON.stringify(documentosIndexados.value))
  $q.notify({ type: 'info', message: `"${doc.nombre}" eliminado de la lista local` })
}

// =========================
// PLANTILLAS
// =========================
async function loadTemplates() {
  loadingTemplates.value = true
  try {
    const q = query(collection(db, 'contract_templates'), orderBy('name'))
    const snapshot = await getDocs(q)
    templates.value = snapshot.docs.map(d => ({
      id: d.id,
      ...(d.data() as Omit<Template, 'id'>)
    }))
  } catch {
    $q.notify({ type: 'negative', message: 'Error al cargar las plantillas' })
  } finally {
    loadingTemplates.value = false
  }
}

async function downloadTemplate(template: Template) {
  try {
    const url = await getTemplateDownloadURL(template.storage_path)
    const a = document.createElement('a')
    a.href = url
    a.target = '_blank'
    a.download = `${template.name}.pdf`
    a.click()
  } catch {
    $q.notify({ type: 'negative', message: 'No se pudo descargar el archivo' })
  }
}

function confirmDelete(template: Template) {
  templateToDelete.value = template
  deleteDialog.value = true
}

async function submitDelete() {
  if (!templateToDelete.value) return
  deleting.value = true
  try {
    await deleteTemplate(templateToDelete.value.id, templateToDelete.value.storage_path)
    templates.value = templates.value.filter(t => t.id !== templateToDelete.value!.id)
    $q.notify({ type: 'positive', message: 'Plantilla eliminada correctamente' })
    deleteDialog.value = false
    templateToDelete.value = null
  } catch {
    $q.notify({ type: 'negative', message: 'Error al eliminar la plantilla' })
  } finally {
    deleting.value = false
  }
}

async function submitUpload() {
  if (!newTemplate.value.file) return
  uploading.value = true
  try {
    await uploadTemplate(
      newTemplate.value.file,
      newTemplate.value.name,
      newTemplate.value.type,
      newTemplate.value.description
    )
    $q.notify({ type: 'positive', message: 'Plantilla subida correctamente' })
    uploadDialog.value = false
    newTemplate.value = { name: '', type: '', description: '', file: null }
    await loadTemplates()
  } catch (err) {
    console.error('Error al subir plantilla:', err)
    $q.notify({ type: 'negative', message: 'Error al subir la plantilla' })
  } finally {
    uploading.value = false
  }
}

onMounted(async () => {
  await loadTemplates()
  await cargarStatsPinecone()
})
</script>

<style scoped>
.admin-page {
  max-width: 1080px;
  margin: 0 auto;
  animation: floatUp 0.5s ease-out both;
}

@keyframes floatUp {
  from { opacity: 0; transform: translateY(14px); }
  to   { opacity: 1; transform: translateY(0); }
}

.page-header {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 26px;
  padding-bottom: 20px;
  border-bottom: 1px solid rgba(27, 27, 30, 0.08);
}

.section-icon-wrap {
  width: 52px;
  height: 52px;
  border-radius: 15px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.icon-admin  { background: rgba(224, 123, 62, 0.14); }
.icon-teal   { background: rgba(57, 199, 216, 0.14); }
.icon-purple { background: rgba(124, 58, 237, 0.14); }

.page-title {
  font-family: 'EB Garamond', serif;
  font-size: 2rem;
  font-weight: 600;
  margin: 0;
  color: #16161a;
}

.page-subtitle {
  margin: 2px 0 0;
  color: #6a6a72;
  font-size: 1rem;
}

.stats-row {
  display: flex;
  gap: 16px;
  flex-wrap: wrap;
}

.stat-card {
  background: #fff;
  border: 1px solid rgba(27, 27, 30, 0.08);
  border-radius: 16px;
  box-shadow: 0 1px 3px rgba(27, 27, 30, 0.04);
  padding: 20px 24px;
  display: flex;
  align-items: center;
  gap: 16px;
  min-width: 200px;
}

.stat-icon-wrap {
  width: 48px;
  height: 48px;
  border-radius: 13px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.stat-number {
  font-family: 'EB Garamond', serif;
  font-size: 1.9rem;
  font-weight: 600;
  color: #16161a;
  line-height: 1;
}

.stat-label {
  font-size: 0.85rem;
  color: #8a8a92;
  margin-top: 2px;
}

.section-block {
  background: #fff;
  border: 1px solid rgba(27, 27, 30, 0.08);
  border-radius: 18px;
  padding: 20px 24px;
}

.actions-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 12px;
}

.section-label {
  font-size: 1.05rem;
  font-weight: 600;
  color: #16161a;
  font-family: 'Figtree', sans-serif;
}

.add-btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 18px;
  background: #1b1b1e;
  color: #fff;
  border: none;
  border-radius: 11px;
  font-family: 'Figtree', sans-serif;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  box-shadow: 0 3px 12px rgba(27, 27, 30, 0.20);
  transition: transform 0.18s, box-shadow 0.18s;
}

.add-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 6px 18px rgba(27, 27, 30, 0.28);
}

.pinecone-info-card {
  background: rgba(124, 58, 237, 0.04);
  border: 1px solid rgba(124, 58, 237, 0.15);
  border-radius: 12px;
  padding: 16px 20px;
}

.table-card {
  background: #fff;
  border: 1px solid rgba(27, 27, 30, 0.08);
  border-radius: 18px;
  box-shadow: 0 1px 3px rgba(27, 27, 30, 0.04);
  overflow: hidden;
}

.table-actions {
  display: flex;
  gap: 8px;
  justify-content: center;
}

.icon-btn {
  width: 34px;
  height: 34px;
  border-radius: 9px;
  border: 1px solid rgba(27, 27, 30, 0.10);
  background: #fff;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.2s;
}

.icon-btn--teal { color: #39c7d8; }
.icon-btn--teal:hover { background: rgba(57, 199, 216, 0.10); }
.icon-btn--red { color: #d93a30; }
.icon-btn--red:hover { background: rgba(217, 58, 48, 0.09); }

.type-badge {
  font-size: 0.76rem;
  font-weight: 600;
  color: #55636a;
  background: #eef1f3;
  padding: 4px 10px;
  border-radius: 7px;
}

:deep(.lx-table) { background: transparent !important; }
:deep(.lx-table .q-table__top),
:deep(.lx-table thead tr th) {
  font-size: 0.76rem;
  font-weight: 600;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: #8a8a92;
  background: transparent;
}
:deep(.lx-table tbody tr:hover) { background: #FAFAF7 !important; }

:deep(.q-dialog__backdrop) {
  background: rgba(22, 22, 26, 0.45);
  backdrop-filter: blur(4px);
}

.lx-dialog-card {
  width: 480px;
  max-width: 95vw;
  background: #fff;
  border-radius: 22px;
  box-shadow: 0 30px 80px rgba(22, 22, 26, 0.28);
  overflow: hidden;
  font-family: 'Figtree', sans-serif;
}

.lx-dialog-header {
  padding: 24px 28px 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.lx-dialog-title {
  font-family: 'EB Garamond', serif;
  font-size: 1.4rem;
  font-weight: 600;
  color: #16161a;
}

.lx-dialog-close {
  width: 34px;
  height: 34px;
  border-radius: 10px;
  border: none;
  background: rgba(27, 27, 30, 0.05);
color: #55555c;
  font-size: 1rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.2s;
}

.lx-dialog-close:hover { background: rgba(27, 27, 30, 0.10); }

.lx-dialog-body { padding: 20px 28px 28px; }

.lx-dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 22px;
}

.lx-btn-ghost {
  padding: 11px 18px;
  background: transparent;
  border: none;
  color: #7a7a82;
  font-family: 'Figtree', sans-serif;
  font-size: 0.92rem;
  font-weight: 600;
  cursor: pointer;
  border-radius: 10px;
  transition: background 0.2s;
}

.lx-btn-ghost:hover { background: rgba(27, 27, 30, 0.05); }

.delete-warning-text {
  font-size: 0.98rem;
  color: #55555c;
  line-height: 1.6;
  margin: 0;
}

:deep(.q-table tbody td) { color: #3a3a40; }
:deep(.q-table thead th) { color: #6a6a72; }
</style>
