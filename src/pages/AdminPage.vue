<template>
  <q-page class="admin-page">

    <!-- Section header -->
    <div class="page-header">
      <div class="section-icon-wrap icon-admin">
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
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
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
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
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
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
            color="accent"
            icon="cloud_upload"
            label="Subir normas (PDF / Word)"
            no-caps unelevated
            @click="pineconeDialog = true"
          />
          <q-btn
            outline
            color="accent"
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
          <q-icon name="info" color="accent" size="20px" />
          <span class="text-grey-7" style="font-size:0.9rem;">
            Las normas subidas aquí (PDF, Word .docx o .doc de SPIJ) se indexan en Pinecone y la IA las usa para responder consultas jurídicas. Elige su especialización para que aparezcan en la carpeta correcta y en el filtro de Consultas.
          </span>
        </div>

        <!-- Documentos indexados -->
        <div v-if="documentosIndexados.length > 0" class="q-mt-md">
          <div class="text-weight-bold text-grey-8 q-mb-sm" style="font-size:0.85rem;">
            DOCUMENTOS INDEXADOS ({{ documentosIndexados.length }})
          </div>
          <!-- Agrupados por especialización, como las carpetas del compartido. -->
          <div v-for="grupo in documentosPorArea" :key="grupo.area" class="normas-grupo">
            <div class="normas-grupo-titulo">
              <q-icon name="folder" size="18px" />
              {{ grupo.etiqueta }} <span class="normas-grupo-cuenta">({{ grupo.docs.length }})</span>
            </div>
            <div class="row q-gutter-sm">
              <q-chip
                v-for="doc in grupo.docs"
                :key="doc.id"
                color="accent"
                text-color="white"
                icon="description"
                removable
                @remove="eliminarDeIndexados(doc)"
              >
                {{ doc.nombre }}
                <span class="q-ml-xs" style="opacity:0.75;">· {{ doc.chunks }} frag.</span>
                <q-tooltip>{{ doc.tipo || 'sin tipo' }} — {{ doc.chunks }} fragmentos en Pinecone</q-tooltip>
              </q-chip>
            </div>
          </div>
        </div>

        <div v-else-if="cargandoStats" class="q-mt-sm text-grey-6" style="font-size:0.85rem;">
          Cargando documentos indexados…
        </div>

        <div v-else-if="errorDocumentos" class="q-mt-sm text-negative" style="font-size:0.85rem;">
          {{ errorDocumentos }}
        </div>

        <div v-else class="q-mt-sm text-grey-6" style="font-size:0.85rem;">
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
          <span class="lx-dialog-title">Subir normas a la base jurídica</span>
          <button class="lx-dialog-close" type="button" @click="pineconeDialog = false">✕</button>
        </div>
        <div class="lx-dialog-body">

          <!-- Especialización = la carpeta del compartido (Derecho Penal,
               Civil, Tributario, Comercial). Se elige una vez para todos los
               archivos del lote. -->
          <q-select
            v-model="cargaNormas.area"
            label="Especialización"
            outlined dense emit-value map-options clearable
            label-color="grey-8" color="accent"
            :options="opcionesEspecialidad"
            hint="Con especialización, cada norma con artículos se corta por artículo (para citarla exacto)."
            class="lx-input q-mb-md"
          />

          <q-select
            v-model="cargaNormas.tipo"
            label="Tipo de documento *"
            outlined dense
            label-color="grey-8" color="accent"
            :options="tiposDocumento"
            :rules="[v => !!v || 'Requerido']"
            class="lx-input q-mb-sm"
          />

          <q-file
            :model-value="cargaNormas.archivos"
            label="Archivos (PDF, Word .docx o .doc de SPIJ) *"
            outlined dense multiple append
            label-color="grey-8" color="accent"
            accept=".pdf,.docx,.doc"
            :max-file-size="MAX_BYTES_NORMA"
            :disable="subiendoPinecone"
            class="lx-input q-mb-sm"
            @update:model-value="onArchivosNormas"
            @rejected="onArchivosRechazados"
          >
            <template #prepend>
              <q-icon name="attach_file" color="grey-7" />
            </template>
          </q-file>

          <!-- Un nombre por archivo (es el que verá el usuario en la cita).
               Se sugiere a partir del título que trae el documento. -->
          <div v-if="cargaNormas.items.length" class="normas-lote-resumen">
            {{ normasPendientes.length }} lista(s) para indexar
            <template v-if="cargaNormas.items.some(i => i.estado === 'leyendo')"> · leyendo {{ cargaNormas.items.filter(i => i.estado === 'leyendo').length }}…</template>
            <template v-if="cargaNormas.items.some(i => i.estado === 'duplicado')"> · {{ cargaNormas.items.filter(i => i.estado === 'duplicado').length }} duplicada(s)</template>
            <template v-if="cargaNormas.items.some(i => i.estado === 'error')"> · {{ cargaNormas.items.filter(i => i.estado === 'error').length }} con error (no se subirán)</template>
          </div>
          <div v-if="cargaNormas.items.length" class="normas-lote q-mb-md">
            <div v-for="(item, idx) in cargaNormas.items" :key="item.clave" class="normas-lote-item">
              <q-input
                v-model="item.nombre"
                :label="item.archivo.name"
                outlined dense
                label-color="grey-8" color="accent" input-class="text-grey-9"
                :loading="item.estado === 'leyendo'"
                :disable="subiendoPinecone || item.estado === 'listo' || item.estado === 'duplicado'"
                :error="item.estado === 'error'"
                :error-message="item.mensaje"
                class="lx-input col"
              >
                <template #append>
                  <q-icon v-if="item.estado === 'listo'" name="check_circle" color="positive" size="20px" />
                  <q-btn v-else-if="!subiendoPinecone" flat round dense icon="close" size="sm" @click="quitarNorma(idx)" />
                </template>
              </q-input>
              <div v-if="item.mensaje && item.estado !== 'error'" class="normas-lote-nota" :class="{ 'normas-lote-nota--aviso': item.estado === 'duplicado' }">
                {{ item.mensaje }}
                <button v-if="item.estado === 'duplicado' && !subiendoPinecone" type="button" class="normas-lote-incluir" @click="incluirIgual(item)">Incluir igual</button>
              </div>
            </div>
          </div>

          <!-- Progress -->
          <div v-if="subiendoPinecone" class="q-mb-md">
            <div class="text-accent text-caption q-mb-xs">
              {{ progresoPinecone }}
            </div>
            <q-linear-progress
              :value="porcentajePinecone"
              color="accent"
              track-color="grey-3"
              rounded
              size="8px"
            />
          </div>

          <div class="lx-dialog-footer">
            <button class="lx-btn-ghost" type="button" @click="cerrarCargaNormas">
              {{ cargaNormas.items.some(i => i.estado === 'listo') ? 'Cerrar' : 'Cancelar' }}
            </button>
            <q-btn
              color="accent"
              :label="etiquetaBotonIndexar"
              icon="cloud_upload"
              no-caps unelevated
              :loading="subiendoPinecone"
              :disable="!puedeIndexarNormas"
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
            label-color="grey-8" color="accent" input-class="text-grey-9"
            :rules="[v => !!v || 'Requerido']"
            class="lx-input q-mb-sm"
          />
          <q-input
            v-model="newTemplate.type"
            label="Tipo de contrato *"
            outlined dense
            label-color="grey-8" color="accent" input-class="text-grey-9"
            hint="Ej: laboral, arrendamiento, compraventa"
            :rules="[v => !!v || 'Requerido']"
            class="lx-input q-mb-sm"
          />
          <q-input
            v-model="newTemplate.description"
            label="Descripción"
            outlined dense
            label-color="grey-8" color="accent" input-class="text-grey-9"
            type="textarea" autogrow
            class="lx-input q-mb-sm"
          />
          <q-file
            v-model="newTemplate.file"
            label="Archivo Word *"
            outlined dense
            label-color="grey-8" color="accent" input-class="text-grey-9"
            accept=".docx"
            :rules="[v => !!v || 'Selecciona un archivo Word (.docx)']"
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

    <!-- ✅ DIALOG ELIMINAR DOCUMENTO DE PINECONE -->
    <q-dialog v-model="eliminarDocumentoDialog" persistent>
      <div class="lx-dialog-card">
        <div class="lx-dialog-header">
          <span class="lx-dialog-title">Eliminar de la base jurídica</span>
          <button class="lx-dialog-close" type="button" @click="eliminarDocumentoDialog = false">✕</button>
        </div>
        <div class="lx-dialog-body">
          <p class="delete-warning-text">
            ¿Seguro que deseas eliminar <strong>{{ documentoAEliminar?.nombre }}</strong>
            ({{ documentoAEliminar?.chunks }} fragmentos) de Pinecone?
            La IA dejará de usarlo para responder. Esta acción no se puede deshacer.
          </p>
          <div class="lx-dialog-footer">
            <button class="lx-btn-ghost" type="button" @click="eliminarDocumentoDialog = false">Cancelar</button>
            <q-btn
              color="negative"
              label="Eliminar"
              no-caps unelevated
              :loading="eliminandoDocumento"
              @click="confirmarEliminarDocumento"
            />
          </div>
        </div>
      </div>
    </q-dialog>

  </q-page>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useQuasar } from 'quasar'
import { collection, getDocs, orderBy, query } from 'firebase/firestore'
import { db } from '../firebase/firebaseConfig'
import { uploadTemplate, deleteTemplate, getTemplateDownloadURL } from '../services/contratosService'
import {
  guardarDocumentoEnPinecone,
  verificarConexionPinecone,
  listarDocumentosPinecone,
  eliminarDocumentoPinecone,
  type DocumentoIndexado
} from '../services/pineconeService'
import { extraerTextoNorma, sugerirNombreNorma } from '../utils/extraerTextoNorma'
import { ESPECIALIDADES, etiquetaEspecialidad } from '../constants/especialidades'
const $q = useQuasar()

interface Template {
  id: string
  name: string
  type: string
  description?: string
  storage_path: string
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
const errorDocumentos = ref('')
const documentoAEliminar = ref<DocumentoIndexado | null>(null)
const eliminarDocumentoDialog = ref(false)
const eliminandoDocumento = ref(false)

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

// Carga en lote: varios archivos (PDF, .docx o .doc de SPIJ) de una misma
// especialización. Cada archivo se lee al elegirlo, para sugerir su nombre
// (el título que trae el documento) y detectar errores antes de subir.
interface NormaACargar {
  clave: string
  archivo: File
  nombre: string
  texto: string
  estado: 'leyendo' | 'pendiente' | 'duplicado' | 'subiendo' | 'listo' | 'error'
  mensaje: string
}

const cargaNormas = ref({
  area: null as string | null,
  tipo: 'ley-general',
  archivos: [] as File[],
  items: [] as NormaACargar[]
})

// Los PDF oficiales de los códigos pesan bastante (el Código Procesal Penal
// de SPIJ, 75 MB). El texto se extrae en el navegador, así que el tope es
// solo para no colgar la pestaña con archivos desproporcionados.
const MAX_BYTES_NORMA = 150 * 1024 * 1024

// Quasar descarta en silencio los archivos que no cumplen accept/tamaño:
// se avisa cuáles y por qué.
function onArchivosRechazados(rechazos: { failedPropValidation: string; file: File }[]) {
  for (const { failedPropValidation, file } of rechazos) {
    $q.notify({
      type: 'warning',
      message: failedPropValidation === 'max-file-size'
        ? `"${file.name}" pesa ${(file.size / 1048576).toFixed(0)} MB: el máximo es 150 MB.`
        : `"${file.name}": formato no soportado (usa PDF, .docx o .doc de SPIJ).`,
      timeout: 6000
    })
  }
}

const opcionesEspecialidad = ESPECIALIDADES.map(e => ({ label: e.etiqueta, value: e.valor }))

const normasPendientes = computed(() => cargaNormas.value.items.filter(i => i.estado === 'pendiente'))
const puedeIndexarNormas = computed(() =>
  !!cargaNormas.value.tipo &&
  normasPendientes.value.length > 0 &&
  !cargaNormas.value.items.some(i => i.estado === 'leyendo' || i.estado === 'subiendo') &&
  normasPendientes.value.every(i => i.nombre.trim() && i.texto)
)

// Menos texto que esto no es una norma: suele ser una página de enlace de
// SPIJ ("Hacer click para ir al contenido...") o una nota.
const MIN_CARACTERES_NORMA = 500

// Clave para reconocer la misma norma con nombres distintos: su número
// ("Ley N° 29571" → "29571") o, si no tiene, el nombre normalizado.
function claveDeNorma(nombre: string): string {
  // El último número del nombre es el de la propia norma: "...a la Decisión
  // 486... (Decreto Legislativo N° 1075)" es la 1075, no la 486.
  const numeros = [...nombre.matchAll(/\b(?:ley|decreto(?:\s+legislativo)?|decisi[oó]n)\b[^\d]{0,12}(\d{2,6}(?:-\d{2,4})?)/gi)]
  const numero = numeros[numeros.length - 1]?.[1]
  if (numero) return numero
  return nombre.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, ' ').trim()
}

// Marca como duplicada una norma que ya está en la base o que se repite en
// el lote (subirla dos veces duplica sus fragmentos). Se puede incluir igual.
function revisarDuplicado(item: NormaACargar) {
  const clave = claveDeNorma(item.nombre)
  const yaIndexada = documentosIndexados.value.find(d => claveDeNorma(d.nombre) === clave)
  const repetida = cargaNormas.value.items.find(i => i !== item && i.estado !== 'error' && i.texto && claveDeNorma(i.nombre) === clave && cargaNormas.value.items.indexOf(i) < cargaNormas.value.items.indexOf(item))
  if (yaIndexada) {
    item.estado = 'duplicado'
    item.mensaje = `Ya está en la base: "${yaIndexada.nombre}"${yaIndexada.area ? ` (${etiquetaEspecialidad(yaIndexada.area)})` : ''}. No se subirá.`
  } else if (repetida) {
    item.estado = 'duplicado'
    item.mensaje = `Repetida en este lote ("${repetida.archivo.name}"). No se subirá.`
  }
}

function incluirIgual(item: NormaACargar) {
  item.estado = 'pendiente'
  item.mensaje = ''
}
const etiquetaBotonIndexar = computed(() =>
  normasPendientes.value.length > 1 ? `Indexar ${normasPendientes.value.length} normas` : 'Indexar en Pinecone'
)

async function leerNorma(item: NormaACargar) {
  try {
    const texto = await extraerTextoNorma(item.archivo)
    if (!texto || texto.length < 50) throw new Error('No se pudo extraer texto. Si es un PDF escaneado, no sirve.')
    if (texto.length < MIN_CARACTERES_NORMA) {
      throw new Error(`Casi vacío (${texto.length} caracteres): parece un enlace o una nota, no el texto de la norma.`)
    }
    item.texto = texto
    item.nombre = sugerirNombreNorma(texto, item.archivo.name)
    item.estado = 'pendiente'
    item.mensaje = ''
    revisarDuplicado(item)
  } catch (err) {
    item.estado = 'error'
    item.mensaje = err instanceof Error ? err.message : 'No se pudo leer el archivo'
  }
}

function onArchivosNormas(valor: File[] | File | null) {
  const archivos = Array.isArray(valor) ? valor : valor ? [valor] : []
  cargaNormas.value.archivos = archivos
  const yaEstan = new Set(cargaNormas.value.items.map(i => i.clave))
  for (const archivo of archivos) {
    const clave = `${archivo.name}:${archivo.size}:${archivo.lastModified}`
    if (yaEstan.has(clave)) continue
    cargaNormas.value.items.push({ clave, archivo, nombre: archivo.name, texto: '', estado: 'leyendo', mensaje: '' })
    // Se lee desde el array reactivo, para que la pantalla vea los cambios.
    void leerNorma(cargaNormas.value.items[cargaNormas.value.items.length - 1]!)
  }
}

function quitarNorma(idx: number) {
  const [quitado] = cargaNormas.value.items.splice(idx, 1)
  if (quitado) cargaNormas.value.archivos = cargaNormas.value.archivos.filter(a => a !== quitado.archivo)
}

function cerrarCargaNormas() {
  pineconeDialog.value = false
  cargaNormas.value = { area: null, tipo: 'ley-general', archivos: [], items: [] }
}

// Documentos indexados agrupados por especialización (como las carpetas).
const documentosPorArea = computed(() => {
  const grupos = new Map<string, DocumentoIndexado[]>()
  for (const doc of documentosIndexados.value) {
    const clave = doc.area ?? ''
    grupos.set(clave, [...(grupos.get(clave) ?? []), doc])
  }
  const orden = [...ESPECIALIDADES.map(e => e.valor as string), '']
  return [...grupos.entries()]
    .sort((a, b) => orden.indexOf(a[0]) - orden.indexOf(b[0]))
    .map(([area, docs]) => ({ area, etiqueta: etiquetaEspecialidad(area) || 'Sin especialización', docs }))
})

const columns = [
  { name: 'name', label: 'Nombre', field: 'name', align: 'left' as const, sortable: true },
  { name: 'type', label: 'Tipo', field: 'type', align: 'left' as const, sortable: true },
  { name: 'description', label: 'Descripción', field: 'description', align: 'left' as const },
  { name: 'actions', label: 'Acciones', field: 'actions', align: 'center' as const }
]

// =========================
// DOCUMENTOS INDEXADOS (desde Pinecone, compartido entre todos los admins)
// =========================
const cargarDocumentosIndexados = async () => {
  errorDocumentos.value = ''
  try {
    documentosIndexados.value = await listarDocumentosPinecone()
  } catch (err) {
    console.error('Error listando documentos de Pinecone:', err)
    errorDocumentos.value = err instanceof Error ? err.message : 'No se pudo cargar la lista de documentos'
  }
}

// =========================
// CARGAR STATS PINECONE
// =========================
const cargarStatsPinecone = async () => {
  cargandoStats.value = true
  try {
    const [{ totalVectores }] = await Promise.all([
      verificarConexionPinecone(),
      cargarDocumentosIndexados()
    ])
    vectoresTotales.value = totalVectores
  } catch (err) {
    console.error('Error stats Pinecone:', err)
  } finally {
    cargandoStats.value = false
  }
}

// =========================
// SUBIR NORMAS A PINECONE (una o varias, en orden)
// =========================
const subirPDFaPinecone = async () => {
  const lote = normasPendientes.value
  if (lote.length === 0) return

  subiendoPinecone.value = true
  porcentajePinecone.value = 0
  let subidas = 0

  for (const [n, item] of lote.entries()) {
    item.estado = 'subiendo'
    item.mensaje = ''
    const prefijo = lote.length > 1 ? `(${n + 1}/${lote.length}) ` : ''
    progresoPinecone.value = `${prefijo}Indexando "${item.nombre}"...`
    try {
      const documentoId = `${cargaNormas.value.tipo}_${Date.now()}`
      const resultado = await guardarDocumentoEnPinecone(
        documentoId,
        item.nombre.trim(),
        item.texto,
        cargaNormas.value.tipo,
        (loteActual, totalLotes) => {
          progresoPinecone.value = `${prefijo}"${item.nombre}": lote ${loteActual} de ${totalLotes}...`
          porcentajePinecone.value = (n + loteActual / totalLotes) / lote.length
        },
        cargaNormas.value.area ? { area: cargaNormas.value.area } : {}
      )
      item.estado = 'listo'
      item.mensaje = resultado.articulos > 0
        ? `${resultado.chunksGuardados} fragmentos · ${resultado.articulos} artículos`
        : `${resultado.chunksGuardados} fragmentos (sin artículos: corte por longitud)`
      vectoresTotales.value += resultado.chunksGuardados
      subidas++
    } catch (err) {
      const error = err as Error
      console.error('❌ Error subiendo a Pinecone:', error)
      item.estado = 'error'
      item.mensaje = error.message
    }
  }

  subiendoPinecone.value = false
  progresoPinecone.value = ''
  porcentajePinecone.value = 0
  void cargarDocumentosIndexados()

  const fallidas = lote.length - subidas
  $q.notify({
    type: fallidas === 0 ? 'positive' : 'warning',
    message: fallidas === 0
      ? (subidas === 1 ? '✅ 1 norma indexada correctamente' : `✅ ${subidas} normas indexadas correctamente`)
      : `Se indexaron ${subidas} de ${lote.length}. Revisa las que quedaron con error.`,
    timeout: 6000
  })
}

// =========================
// ELIMINAR DOCUMENTO DE PINECONE (con confirmación — es irreversible)
// =========================
const eliminarDeIndexados = (doc: DocumentoIndexado) => {
  documentoAEliminar.value = doc
  eliminarDocumentoDialog.value = true
}

const confirmarEliminarDocumento = async () => {
  const doc = documentoAEliminar.value
  if (!doc) return
  eliminandoDocumento.value = true
  try {
    const eliminados = await eliminarDocumentoPinecone(doc.id)
    documentosIndexados.value = documentosIndexados.value.filter(d => d.id !== doc.id)
    vectoresTotales.value = Math.max(0, vectoresTotales.value - eliminados)
    eliminarDocumentoDialog.value = false
    $q.notify({ type: 'positive', message: `"${doc.nombre}" eliminado de la base jurídica (${eliminados} fragmentos)` })
  } catch (err) {
    console.error('Error eliminando documento de Pinecone:', err)
    $q.notify({ type: 'negative', message: err instanceof Error ? err.message : 'No se pudo eliminar el documento' })
  } finally {
    eliminandoDocumento.value = false
  }
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

/* Fondo blanco puro (no el #FAFAF7 cálido por defecto de .q-page en
   MainLayout.vue) a pedido explícito — mismo truco de especificidad que
   las demás páginas: selector combinado para ganarle a la regla
   compartida sin tocarla. */
.q-page.admin-page {
  background: var(--lexit-blanco);
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
  border-bottom: 1px solid var(--border-color);
}

.section-icon-wrap {
  width: 52px;
  height: 52px;
  border-radius: var(--border-radius);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.icon-admin  { background: var(--accent-soft); }
.icon-teal   { background: var(--accent-soft); color: var(--lexit-verde); }
.icon-purple { background: var(--accent-soft); color: var(--lexit-verde); }

.page-title {
  font-family: 'Baskervville', 'EB Garamond', serif;
  font-size: 2rem;
  font-weight: 600;
  margin: 0;
  color: var(--ink);
}

.page-subtitle {
  margin: 2px 0 0;
  color: var(--text-secondary);
  font-size: 1rem;
}

.stats-row {
  display: flex;
  gap: 16px;
  flex-wrap: wrap;
}

.stat-card {
  background: var(--surface);
  border: 1px solid var(--border-color);
  border-radius: var(--border-radius);
  box-shadow: var(--shadow-light);
  padding: 20px 24px;
  display: flex;
  align-items: center;
  gap: 16px;
  min-width: 200px;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.stat-card:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-medium);
}

.stat-icon-wrap {
  width: 48px;
  height: 48px;
  border-radius: var(--border-radius-small);
  display: flex;
  align-items: center;
  justify-content: center;
}

.stat-number {
  font-family: 'Baskervville', 'EB Garamond', serif;
  font-size: 1.9rem;
  font-weight: 600;
  color: var(--ink);
  line-height: 1;
}

.stat-label {
  font-size: 0.85rem;
  color: var(--text-muted);
  margin-top: 2px;
}

.section-block {
  background: var(--surface);
  border: 1px solid var(--border-color);
  border-radius: var(--border-radius);
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
  color: var(--ink);
  font-family: 'Baskervville', 'Figtree', sans-serif;
}

.add-btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 18px;
  background: var(--ink);
  color: var(--surface);
  border: none;
  border-radius: var(--border-radius-small);
  font-family: 'Baskervville', 'Figtree', sans-serif;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  box-shadow: var(--shadow-light);
  transition: background 0.18s, box-shadow 0.18s;
}

.add-btn:hover {
  background: var(--ink-soft);
  box-shadow: var(--shadow-medium);
}

.pinecone-info-card {
  background: var(--accent-soft);
  border: 1px solid var(--accent-soft-strong);
  border-radius: var(--border-radius);
  padding: 16px 20px;
}

.table-card {
  background: var(--surface);
  border: 1px solid var(--border-color);
  border-radius: var(--border-radius);
  box-shadow: var(--shadow-light);
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
  border-radius: var(--border-radius-small);
  border: 1px solid var(--border-color);
  background: var(--surface);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.2s;
}

.icon-btn--teal { color: var(--ink-soft); }
.icon-btn--teal:hover { background: var(--accent-soft); }
.icon-btn--red { color: #C23B2E; }
.icon-btn--red:hover { background: rgba(194, 59, 46, 0.09); }

.type-badge {
  font-size: 0.76rem;
  font-weight: 600;
  color: var(--text-secondary);
  background: var(--surface-sunken);
  padding: 4px 10px;
  border-radius: var(--border-radius-small);
}

:deep(.lx-table) { background: transparent !important; }
:deep(.lx-table .q-table__top),
:deep(.lx-table thead tr th) {
  font-size: 0.76rem;
  font-weight: 600;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: var(--text-muted);
  background: transparent;
}
:deep(.lx-table tbody tr:hover) { background: var(--bg) !important; }

:deep(.q-dialog__backdrop) {
  background: rgba(22, 22, 26, 0.45);
  backdrop-filter: blur(4px);
}

.lx-dialog-card {
  width: 480px;
  max-width: 95vw;
  background: var(--surface);
  border-radius: var(--border-radius);
  box-shadow: var(--shadow-heavy);
  overflow: hidden;
  font-family: 'Baskervville', 'Figtree', sans-serif;
}

.lx-dialog-header {
  padding: 24px 28px 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.lx-dialog-title {
  font-family: 'Baskervville', 'EB Garamond', serif;
  font-size: 1.4rem;
  font-weight: 600;
  color: var(--ink);
}

.lx-dialog-close {
  width: 34px;
  height: 34px;
  border-radius: var(--border-radius-small);
  border: none;
  background: var(--surface-alt);
color: var(--text-secondary);
  font-size: 1rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.2s;
}

.lx-dialog-close:hover { background: var(--lexit-marfil-suave); }

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
  color: var(--text-secondary);
  font-family: 'Baskervville', 'Figtree', sans-serif;
  font-size: 0.92rem;
  font-weight: 600;
  cursor: pointer;
  border-radius: var(--border-radius-small);
  transition: background 0.2s;
}

.lx-btn-ghost:hover { background: var(--surface-alt); }

.delete-warning-text {
  font-size: 0.98rem;
  color: var(--ink-soft);
  line-height: 1.6;
  margin: 0;
}

:deep(.q-table tbody td) { color: var(--ink-soft); }
:deep(.q-table thead th) { color: var(--text-secondary); }

/* Carga de normas en lote */
.normas-lote {
  display: flex;
  flex-direction: column;
  gap: 6px;
  max-height: 280px;
  overflow-y: auto;
  padding-right: 2px;
}

.normas-lote-nota {
  font-size: 0.78rem;
  color: var(--lexit-texto-secundario);
  margin: -2px 0 2px 4px;
}

.normas-lote-nota--aviso {
  color: #9A6A12;
}

.normas-lote-incluir {
  margin-left: 6px;
  padding: 0;
  border: none;
  background: none;
  font: inherit;
  font-weight: 600;
  color: var(--lexit-verde);
  text-decoration: underline;
  cursor: pointer;
}

.normas-lote-resumen {
  font-size: 0.82rem;
  color: var(--lexit-texto-secundario);
  margin: 0 0 6px 2px;
}

/* Documentos indexados por especialización */
.normas-grupo {
  margin-bottom: 12px;
}

.normas-grupo-titulo {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--lexit-verde);
  margin-bottom: 6px;
}

.normas-grupo-cuenta {
  font-weight: 400;
  color: var(--lexit-texto-secundario);
}
</style>
