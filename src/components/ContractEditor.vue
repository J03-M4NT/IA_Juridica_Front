<template>
  <div class="contract-editor">
    <div class="row q-col-gutter-md">
      <!-- Panel lateral para variables -->
      <div class="col-12 col-md-4">
        <q-card class="variables-panel">
          <q-card-section>
            <div class="text-h6">Datos del Contrato</div>
          </q-card-section>

          <q-card-section class="q-pa-none">
            <q-list padding>
              <template v-for="variable in template.variables" :key="variable.key">
                <q-item>
                  <q-item-section>
                    <q-input
                      v-if="variable.type === 'text'"
                      v-model="formData[variable.key]"
                      :label="variable.label"
                      :required="variable.required"
                      outlined
                      dense
                      @update:model-value="updateContract"
                      class="q-mb-sm"
                    />
                    <q-input
                      v-else-if="variable.type === 'date'"
                      v-model="formData[variable.key]"
                      :label="variable.label"
                      :required="variable.required"
                      outlined
                      dense
                      type="date"
                      @update:model-value="updateContract"
                      class="q-mb-sm"
                    />
                    <q-input
                      v-else-if="variable.type === 'number'"
                      v-model="formData[variable.key]"
                      :label="variable.label"
                      :required="variable.required"
                      outlined
                      dense
                      type="number"
                      @update:model-value="updateContract"
                      class="q-mb-sm"
                    />
                  </q-item-section>
                </q-item>
              </template>
            </q-list>
          </q-card-section>
        </q-card>
      </div>

      <!-- Vista previa del contrato -->
      <div class="col-12 col-md-8">
        <q-card class="contract-preview">
          <q-card-section>
            <div class="text-h6">Vista Previa del Contrato</div>
          </q-card-section>

          <q-separator />

          <q-card-section>
            <div class="contract-content" v-html="contractContent"></div>
          </q-card-section>
        </q-card>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue';

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

interface ModifiedContract {
  templateId: string;
  variables: Record<string, string>;
  modifiedContent: string;
}

const props = defineProps<{
  template: ContractTemplate;
  modifiedContract?: ModifiedContract | undefined;
}>();

const emit = defineEmits<{
  'update:contract': [templateId: string, variables: Record<string, string>, content: string];
}>();

const formData = ref<Record<string, string>>({});
const contractContent = ref('');

// Initialize form data and content
onMounted(() => {
  if (props.modifiedContract) {
    formData.value = { ...props.modifiedContract.variables };
    contractContent.value = props.modifiedContract.modifiedContent;
  } else {
    // Initialize with empty values for each variable
    props.template.variables.forEach(variable => {
      formData.value[variable.key] = '';
    });
    contractContent.value = props.template.content;
  }
});

// Watch for template changes
watch(() => props.template, (newTemplate) => {
  if (!props.modifiedContract || newTemplate.id !== props.modifiedContract.templateId) {
    formData.value = {};
    props.template.variables.forEach(variable => {
      formData.value[variable.key] = '';
    });
    contractContent.value = newTemplate.content;
  }
}, { deep: true });

// Update contract when form data or content changes
const updateContract = () => {
  emit('update:contract', props.template.id, formData.value, contractContent.value);
};

// Process variables in content
const processContent = (content: string, variables: Record<string, string>) => {
  let processedContent = content;
  Object.entries(variables).forEach(([key, value]) => {
    processedContent = processedContent.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value);
  });
  return processedContent;
};

// Watch for form data changes to update content
watch(formData, (newData) => {
  contractContent.value = processContent(props.template.content, newData);
}, { deep: true });
</script>

<style>
.contract-editor {
  max-width: 100%;
}

.variables-panel {
  position: sticky;
  top: 20px;
  max-height: calc(100vh - 40px);
  overflow-y: auto;
}

.contract-preview {
  min-height: 800px;
}

.contract-content {
  font-family: 'Times New Roman', Times, serif;
  font-size: 12pt;
  line-height: 1.5;
  color: #000000;
  padding: 60px;
  max-width: 210mm; /* Tamaño A4 */
  margin: 0 auto;
  background-color: white;
  box-shadow: 0 0 10px rgba(0,0,0,0.1);
  min-height: 297mm; /* Altura mínima A4 */
  position: relative;
}

.contract-content h1 {
  font-size: 14pt;
  font-weight: bold;
  text-align: center;
  margin: 0 0 3em 0;
  text-transform: uppercase;
  letter-spacing: 1px;
}

.contract-content h2 {
  font-size: 12pt;
  font-weight: bold;
  margin: 2em 0 1em;
  text-transform: uppercase;
}

.contract-content h3 {
  font-size: 12pt;
  font-weight: bold;
  margin: 1.5em 0 1em;
}

.contract-content p {
  margin: 1em 0;
  text-align: justify;
  line-height: 2;
}

.contract-content p:first-of-type {
  margin-top: 2em;
}

/* Estilo para campos vacíos en el contrato */
.contract-content span:empty::before {
  content: '____________________';
  color: #999;
  border-bottom: 1px dotted #999;
}

/* Estilo para campos de fecha vacíos */
.contract-content span[data-type="date"]:empty::before {
  content: 'dd/mm/aaaa';
  color: #999;
  font-style: italic;
}

.contract-content table {
  width: 100%;
  border-collapse: collapse;
  margin: 1.5em 0;
}

.contract-content th,
.contract-content td {
  border: 1px solid #000;
  padding: 10px;
  text-align: left;
}

/* Estilos para listas */
.contract-content ul,
.contract-content ol {
  margin: 1.5em 0;
  padding-left: 0;
  list-style-type: none;
}

.contract-content ul li,
.contract-content ol li {
  margin-bottom: 1em;
  text-align: justify;
  line-height: 1.8;
  padding-left: 1.5em;
  position: relative;
}

.contract-content ul li:before {
  content: "•";
  position: absolute;
  left: 0;
}

.contract-content ol {
  counter-reset: item;
}

.contract-content ol li:before {
  content: counter(item) ".";
  counter-increment: item;
  position: absolute;
  left: 0;
}

/* Estilos para firmas */
.contract-content .signatures {
  margin-top: 6em;
  page-break-inside: avoid;
}

.contract-content .signature-block {
  margin: 3em 0;
  text-align: center;
}

.contract-content .signature-line {
  display: inline-block;
  width: 250px;
  border-top: 1px solid #000;
  margin: 1em 0 0.5em;
  text-align: center;
}

.contract-content .signature-name {
  font-weight: bold;
  margin: 0.5em 0;
}

.contract-content .signature-title {
  text-transform: uppercase;
  font-size: 10pt;
  margin-bottom: 0.5em;
}

.contract-content .signature-dni {
  font-size: 10pt;
}

/* Estilo para los campos no completados */
.contract-content .empty-field {
  display: inline-block;
  min-width: 150px;
  border-bottom: 1px dotted #999;
  color: #666;
  font-style: italic;
}

.contract-content *[class^="error-"] {
  color: #C10015;
  background-color: #FFE0E0;
  padding: 2px 4px;
  border-radius: 2px;
}

/* Estilos para impresión */
@media print {
  .contract-content {
    padding: 0;
    box-shadow: none;
    font-size: 12pt;
  }

  .contract-content h1 {
    margin: 0 0 2em 0;
  }
}

/* Estilos para impresión */
@media print {
  .contract-content {
    padding: 0;
    box-shadow: none;
  }
}
</style>
