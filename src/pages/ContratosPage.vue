<template>
  <q-page class="q-pa-md">
    <div class="text-h5 text-primary q-mb-md">
      <q-icon name="description" class="q-mr-sm" /> Contratos
    </div>

    <div class="row q-col-gutter-md">
      <!-- Template Selection Section -->
      <div class="col-12 col-md-3">
        <q-card>
          <q-card-section>
            <div class="text-h6">Plantillas de Contratos</div>
          </q-card-section>

          <q-card-section>
            <q-list separator>
              <q-item
                v-for="template in templates"
                :key="template.id"
                clickable
                :active="currentTemplate?.id === template.id"
                @click="selectTemplate(template)"
                v-ripple
              >
                <q-item-section>
                  <q-item-label>{{ template.name }}</q-item-label>
                  <q-item-label caption>{{ template.type }}</q-item-label>
                </q-item-section>
              </q-item>
            </q-list>
          </q-card-section>
        </q-card>
      </div>

      <!-- Contract Editor Section -->
      <div class="col-12 col-md-9">
        <template v-if="currentTemplate">
          <contract-editor
            :template="currentTemplate"
            :modified-contract="getModifiedContract(currentTemplate.id)"
            @update:contract="updateContract"
          />

          <!-- Export Actions -->
          <div class="q-mt-md row q-col-gutter-sm justify-end">
            <div class="col-auto">
              <q-btn
                color="primary"
                icon="file_download"
                label="Exportar como Word"
                @click="exportToWord"
                :loading="exporting"
              />
            </div>
            <div class="col-auto">
              <q-btn
                color="secondary"
                icon="picture_as_pdf"
                label="Exportar como PDF"
                @click="exportToPDF"
                :loading="exporting"
              />
            </div>
          </div>
        </template>

        <div v-else class="text-center q-pa-xl">
          <q-icon name="description" size="4rem" color="grey-5" />
          <div class="text-h6 text-grey-7 q-mt-md">
            Seleccione una plantilla para comenzar
          </div>
        </div>
      </div>
    </div>

    <!-- Loading State -->
    <q-inner-loading :showing="isLoading">
      <q-spinner-dots size="50px" color="primary" />
    </q-inner-loading>

    <!-- Error Handling -->
    <q-dialog v-model="showError">
      <q-card>
        <q-card-section class="row items-center">
          <q-avatar icon="error" color="negative" text-color="white" />
          <span class="q-ml-sm">{{ error }}</span>
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
const showError = computed(() => !!store.error);

// Computed properties
const templates = computed(() => store.templates);
const currentTemplate = computed(() => store.currentTemplate);
const isLoading = computed(() => store.isLoading);
const error = computed(() => store.error);
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
    // Handle error
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
    // Handle error
    console.error('Error exporting to PDF:', err);
    store.error = err instanceof Error ? err.message : 'Error al exportar a PDF';
  } finally {
    exporting.value = false;
  }
};
</script>

<style scoped>
.text-primary {
  color: #4d46e3 !important;
}
</style>
