<template>
  <q-page class="admin-page">

    <!-- Header -->
    <div class="admin-header q-mb-lg">
      <div class="row items-center q-gutter-sm">
        <q-icon name="admin_panel_settings" size="2rem" color="deep-orange" />
        <div>
          <h4 class="q-ma-none text-weight-bold text-grey-9">Panel de Administración</h4>
          <p class="q-ma-none text-grey-7 text-caption">Gestión de plantillas de contratos</p>
        </div>
      </div>
    </div>

    <!-- Stats -->
    <div class="row q-col-gutter-md q-mb-lg">
      <div class="col-12 col-sm-4">
        <q-card flat bordered class="stat-card">
          <q-card-section class="row items-center q-gutter-md">
            <q-icon name="description" size="2rem" color="primary" />
            <div>
              <div class="text-h5 text-weight-bold text-grey-9">{{ templates.length }}</div>
              <div class="text-caption text-grey-7">Plantillas activas</div>
            </div>
          </q-card-section>
        </q-card>
      </div>
    </div>

    <!-- Actions bar -->
    <div class="row items-center justify-between q-mb-md">
      <span class="text-subtitle1 text-weight-medium text-grey-9">Plantillas de contratos</span>
      <q-btn
        color="primary"
        icon="add"
        label="Nueva plantilla"
        no-caps
        @click="uploadDialog = true"
      />
    </div>

    <!-- XDDDDDDDDD  -->
    <!-- Templates table -->
    <q-card flat bordered>
      <q-table
        :rows="templates"
        :columns="columns"
        row-key="id"
        :loading="loadingTemplates"
        flat
        :pagination="{ rowsPerPage: 10 }"
        no-data-label="No hay plantillas cargadas"
      >
        <template #body-cell-actions="props">
          <q-td :props="props" class="q-gutter-xs">
            <q-btn
              flat
              dense
              round
              icon="download"
              color="primary"
              @click="downloadTemplate(props.row)"
            >
              <q-tooltip>Descargar PDF</q-tooltip>
            </q-btn>
            <q-btn
              flat
              dense
              round
              icon="delete"
              color="negative"
              @click="confirmDelete(props.row)"
            >
              <q-tooltip>Eliminar plantilla</q-tooltip>
            </q-btn>
          </q-td>
        </template>

        <template #body-cell-type="props">
          <q-td :props="props">
            <q-badge color="blue-grey" :label="props.row.type || 'general'" />
          </q-td>
        </template>
      </q-table>
    </q-card>

    <!-- Upload dialog -->
    <q-dialog v-model="uploadDialog" persistent>
      <q-card style="min-width: 420px; max-width: 560px; background: white">
        <q-card-section class="row items-center q-pb-none">
          <div class="text-h6 text-grey-9">Subir nueva plantilla</div>
          <q-space />
          <q-btn icon="close" flat round dense color="grey-7" v-close-popup />
        </q-card-section>

        <q-card-section class="q-gutter-md">
          <q-input
            v-model="newTemplate.name"
            label="Nombre de la plantilla *"
            outlined
            dense
            label-color="grey-8"
            color="primary"
            input-class="text-grey-9"
            :rules="[v => !!v || 'Requerido']"
          />
          <q-input
            v-model="newTemplate.type"
            label="Tipo de contrato *"
            outlined
            dense
            label-color="grey-8"
            color="primary"
            input-class="text-grey-9"
            hint="Ej: laboral, arrendamiento, compraventa"
            :rules="[v => !!v || 'Requerido']"
          />
          <q-input
            v-model="newTemplate.description"
            label="Descripción"
            outlined
            dense
            label-color="grey-8"
            color="primary"
            input-class="text-grey-9"
            type="textarea"
            autogrow
          />
          <q-file
            v-model="newTemplate.file"
            label="Archivo PDF *"
            outlined
            dense
            label-color="grey-8"
            color="primary"
            input-class="text-grey-9"
            accept=".pdf"
            :rules="[v => !!v || 'Selecciona un archivo PDF']"
          >
            <template #prepend>
              <q-icon name="attach_file" color="grey-7" />
            </template>
          </q-file>
        </q-card-section>

        <q-card-actions align="right" class="q-px-md q-pb-md">
          <q-btn flat label="Cancelar" no-caps color="grey-7" v-close-popup />
          <q-btn
            color="primary"
            label="Subir plantilla"
            no-caps
            :loading="uploading"
            :disable="!newTemplate.name || !newTemplate.type || !newTemplate.file"
            @click="submitUpload"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- Delete confirmation dialog -->
    <q-dialog v-model="deleteDialog" persistent>
      <q-card style="min-width: 360px; background: white">
        <q-card-section class="row items-center q-gutter-sm">
          <q-avatar icon="warning" color="negative" text-color="white" />
          <div>
            <div class="text-h6 text-grey-9">Eliminar plantilla</div>
            <div class="text-body2 text-grey-7">
              ¿Seguro que deseas eliminar <strong class="text-grey-9">{{ templateToDelete?.name }}</strong>?
              Esta acción no se puede deshacer.
            </div>
          </div>
        </q-card-section>

        <q-card-actions align="right">
          <q-btn flat label="Cancelar" no-caps color="grey-7" v-close-popup />
          <q-btn
            color="negative"
            label="Eliminar"
            no-caps
            :loading="deleting"
            @click="submitDelete"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>

  </q-page>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useQuasar } from 'quasar'
import { collection, getDocs, orderBy, query } from 'firebase/firestore'
import { db } from '../firebase/firebaseConfig'
import { uploadTemplate, deleteTemplate, getTemplateDownloadURL } from '../services/contratosService'

const $q = useQuasar()

interface Template {
  id: string
  name: string
  type: string
  description?: string
  storage_path: string
}

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

const columns = [
  { name: 'name', label: 'Nombre', field: 'name', align: 'left' as const, sortable: true },
  { name: 'type', label: 'Tipo', field: 'type', align: 'left' as const, sortable: true },
  { name: 'description', label: 'Descripción', field: 'description', align: 'left' as const },
  { name: 'actions', label: 'Acciones', field: 'actions', align: 'center' as const }
]

async function loadTemplates() {
  loadingTemplates.value = true
  try {
    const q = query(collection(db, 'contract_templates'), orderBy('name'))
    const snapshot = await getDocs(q)
    templates.value = snapshot.docs.map(d => ({
      id: d.id,
      ...(d.data() as Omit<Template, 'id'>)
    }))
  } catch (err) {
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

onMounted(loadTemplates)
</script>

<style scoped>
.admin-page {
  max-width: 1100px;
  margin: 0 auto;
}

.admin-header {
  border-bottom: 2px solid var(--border-color, #e0e0e0);
  padding-bottom: 16px;
}

.stat-card {
  background: var(--card-background, #fff);
  border-radius: var(--border-radius, 8px);
}
</style>
