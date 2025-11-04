<template>
  <q-page class="contratos-page q-pa-md fade-in">
    <div class="page-header q-mb-lg">
      <div class="text-h5 text-weight-bold q-mb-sm header-gradient">
        <q-icon name="description" class="q-mr-sm" /> Contratos
      </div>
      <p class="text-body2 text-black">Genera contratos personalizados desde plantillas profesionales</p>
    </div>

    <div class="row q-col-gutter-lg">
      <!-- Template Selection Section -->
      <div class="col-12 col-md-4">
        <q-card class="templates-card">
          <q-card-section class="templates-header">
            <div class="text-h6 text-weight-medium">Plantillas de Contratos</div>
            <q-icon name="library_books" size="sm" color="primary" />
          </q-card-section>

          <q-card-section class="templates-list">
            <q-list separator class="rounded-borders">
              <q-item
                v-for="template in templates"
                :key="template.id"
                clickable
                :active="currentTemplate?.id === template.id"
                @click="selectTemplate(template)"
                v-ripple
                class="template-item"
              >
                <q-item-section avatar>
                  <q-icon name="article" color="primary" />
                </q-item-section>
                <q-item-section>
                  <q-item-label class="text-weight-medium">{{ template.name }}</q-item-label>
                  <q-item-label caption class="text-black-7">{{ template.type }}</q-item-label>
                </q-item-section>
                <q-item-section side v-if="currentTemplate?.id === template.id">
                  <q-icon name="check_circle" color="positive" />
                </q-item-section>
              </q-item>
            </q-list>
          </q-card-section>
        </q-card>
      </div>

      <!-- Contract Editor Section -->
      <div class="col-12 col-md-8">
        <template v-if="currentTemplate">
          <q-card class="editor-card">
            <q-card-section class="editor-header">
              <div class="row items-center justify-between">
                <div>
                  <h6 class="text-h6 text-weight-medium q-mb-xs">{{ currentTemplate.name }}</h6>
                  <p class="text-caption text-black-7">{{ currentTemplate.type }}</p>
                </div>
                <q-badge color="primary" label="Activo" />
              </div>
            </q-card-section>

            <q-card-section class="editor-content">
              <contract-editor
                :template="currentTemplate"
                :modified-contract="getModifiedContract(currentTemplate.id)"
                @update:contract="updateContract"
              />
            </q-card-section>
          </q-card>

          <!-- Export Actions -->
          <q-card class="export-card q-mt-md">
            <q-card-section>
              <div class="text-subtitle2 text-weight-medium q-mb-md">Exportar Contrato</div>
              <div class="row q-col-gutter-md justify-center">
                <div class="col-auto">
                  <q-btn
                    color="primary"
                    icon="file_download"
                    label="Exportar como Word"
                    @click="exportToWord"
                    :loading="exporting"
                    class="export-btn"
                    unelevated
                  >
                    <q-tooltip>Descargar en formato Word (.docx)</q-tooltip>
                  </q-btn>
                </div>
                <div class="col-auto">
                  <q-btn
                    color="secondary"
                    icon="picture_as_pdf"
                    label="Exportar como PDF"
                    @click="exportToPDF"
                    :loading="exporting"
                    class="export-btn"
                    unelevated
                  >
                    <q-tooltip>Descargar en formato PDF</q-tooltip>
                  </q-btn>
                </div>
              </div>
            </q-card-section>
          </q-card>
        </template>

        <div v-else class="empty-state text-center q-pa-xl">
          <q-icon name="description" size="4rem" color="grey-5" class="q-mb-md" />
          <div class="text-h6 text-grey-7 q-mb-sm">
            Selecciona una plantilla para comenzar
          </div>
          <p class="text-body2 text-grey-6">
            Elige una plantilla de contrato de la lista para empezar a personalizar tu documento
          </p>
        </div>
      </div>
    </div>

    <!-- Loading State -->
    <q-inner-loading :showing="isLoading">
      <q-spinner-dots size="50px" color="primary" />
    </q-inner-loading>

    <!-- Error Handling -->
    <q-dialog v-model="showError">
      <q-card class="error-dialog">
        <q-card-section class="row items-center">
          <q-avatar icon="error" color="negative" text-color="black" />
          <span class="q-ml-sm text-weight-medium">Debe rellenar los campos antes de exportar</span>
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat label="Cerrar" color="primary" v-close-popup />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup lang="ts">
import { onMounted, ref, computed } from 'vue';
import { useContratosStore } from 'src/stores/contratos-store';
import ContractEditor from 'src/components/ContractEditor.vue';

const store = useContratosStore();
const exporting = ref(false);
const showError = computed<boolean>({
  get: () => !!store.error,
  set: (val: boolean) => {
    if (!val) {
      store.error = null;
    }
  }
});

// Computed properties
const templates = computed(() => store.templates);
const currentTemplate = computed(() => store.currentTemplate);
const isLoading = computed(() => store.isLoading);
const getModifiedContract = store.getModifiedContract;

onMounted(async () => {
  await store.fetchTemplates();
});

interface ContractTemplate {
  id: string;
  name: string;
  type: string;
  content: string;
  variables: Array<{
    key: string;
    label: string;
    type: 'text' | 'date' | 'number';
    required: boolean;
  }>;
}

const selectTemplate = (template: ContractTemplate) => {
  store.setCurrentTemplate(template);
};

const updateContract = (templateId: string, variables: Record<string, string>, content: string) => {
  store.updateModifiedContract(templateId, variables, content);
};

const exportToWord = async () => {
  if (!currentTemplate.value) return;

  exporting.value = true;
  try {
    const blob = await store.exportToWord(currentTemplate.value.id);
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${currentTemplate.value.name}.docx`;
    a.click();
    window.URL.revokeObjectURL(url);
  } catch (err: unknown) {
    console.error('Error exporting to Word:', err);
    store.error = err instanceof Error ? err.message : 'Error al exportar a Word';
  } finally {
    exporting.value = false;
  }
};

const exportToPDF = async () => {
  if (!currentTemplate.value) return;

  exporting.value = true;
  try {
    const blob = await store.exportToPDF(currentTemplate.value.id);
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${currentTemplate.value.name}.pdf`;
    a.click();
    window.URL.revokeObjectURL(url);
  } catch (err: unknown) {
    console.error('Error exporting to PDF:', err);
    store.error = err instanceof Error ? err.message : 'Error al exportar a PDF';
  } finally {
    exporting.value = false;
  }
};
</script>

<style scoped>
.contratos-page {
  background: var(--background-color);
}

.page-header {
  text-align: center;
  margin-bottom: 2rem;
}

.header-gradient {
  color: black;
  display: inline-block;
}

.templates-card {
  height: fit-content;
  border-radius: var(--border-radius);
  box-shadow: var(--shadow-light);
  border: 1px solid var(--border-color);
  transition: all 0.3s ease;
}

.templates-card:hover {
  box-shadow: var(--shadow-medium);
  transform: translateY(-2px);
}

.templates-header {
  background: linear-gradient(135deg, #a7019e, var(--card-background));
  border-bottom: 1px solid var(--border-color);
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.templates-list {
  padding: 0;
}

.template-item {
  border-radius: var(--border-radius-small);
  margin: 4px 8px;
  transition: all 0.3s ease;
}

.template-item:hover {
  background: rgba(0, 123, 255, 0.05);
}

.template-item--active {
  background: rgba(0, 123, 255, 0.1);
  border-left: 3px solid var(--primary-color);
}

.editor-card {
  border-radius: var(--border-radius);
  box-shadow: var(--shadow-light);
  border: 1px solid var(--border-color);
  overflow: hidden;
  transition: all 0.3s ease;
}

.editor-card:hover {
  box-shadow: var(--shadow-medium);
}

.editor-header {
  background: var(--card-background);
  border-bottom: 1px solid var(--border-color);
  padding: 1.5rem;
}

.editor-content {
  padding: 0;
  min-height: 400px;
}

.export-card {
  border-radius: var(--border-radius);
  box-shadow: var(--shadow-light);
  border: 1px solid var(--border-color);
  transition: all 0.3s ease;
}

.export-card:hover {
  box-shadow: var(--shadow-medium);
}

.export-btn {
  border-radius: var(--border-radius-small);
  padding: 12px 24px;
  font-weight: 500;
  transition: all 0.3s ease;
  min-width: 160px;
}

.export-btn:hover {
  transform: translateY(-1px);
  box-shadow: var(--shadow-medium);
}

.empty-state {
  background: var(--card-background);
  border-radius: var(--border-radius);
  border: 2px dashed var(--border-color);
  margin: 2rem 0;
}

.error-dialog {
  border-radius: var(--border-radius);
}

/* Responsive */
@media (max-width: 768px) {
  .contratos-page {
    padding: 1rem;
  }

  .row {
    margin: 0;
  }

  .col-12 {
    padding: 0;
  }

  .templates-card,
  .editor-card,
  .export-card {
    margin-bottom: 1rem;
  }

  .export-btn {
    min-width: 140px;
    padding: 10px 20px;
  }
}
</style>
