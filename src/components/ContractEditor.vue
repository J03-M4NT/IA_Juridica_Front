<template>
  <div class="contract-editor">
    <div class="row q-col-gutter-md">
      <!-- Panel lateral para variables -->
      <div class="col-12 col-md-4">
        <q-card class="variables-panel">
          <q-card-section>
            <div class="text-h6">Datos del Contrato</div>
            <div class="q-mt-sm q-gutter-sm row items-center">
              <q-btn size="sm" label="Rellenar por defecto" color="primary" @click="fillDefaults" />
            </div>
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

          <q-card-section class="preview-card-section">
            <div class="preview-wrapper" ref="previewWrapper">
              <!-- previewStage actúa como contenedor de layout que recibe el tamaño escalado -->
              <div class="preview-stage" ref="previewStage">
                <!-- previewInner recibe el HTML con .page; se escala para encajar visualmente -->
                <div
                  class="preview-inner"
                  ref="previewInner"
                  :style="{ transform: `scale(${scale})`, transformOrigin: 'top left' }"
                  v-html="contractContent"
                />
              </div>
            </div>
          </q-card-section>
        </q-card>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch, onBeforeUnmount, nextTick } from 'vue';

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

// Formatting helpers
function formatDateForContract(value: string) {
  if (!value) return '';
  try {
    const d = new Date(value);
    if (isNaN(d.getTime())) return value; // return raw if not a date
    return d.toLocaleDateString('es-PE', { day: 'numeric', month: 'long', year: 'numeric' });
  } catch {
    return value;
  }
}

function numberToWordsES(n: number): string {
  // Simple converter for integer part (supports up to millions)
  const unidades = ['','uno','dos','tres','cuatro','cinco','seis','siete','ocho','nueve','diez','once','doce','trece','catorce','quince','dieciseis','diecisiete','dieciocho','diecinueve'];
  const decenas = ['','','veinte','treinta','cuarenta','cincuenta','sesenta','setenta','ochenta','noventa'];
  const centenas = ['','ciento','doscientos','trescientos','cuatrocientos','quinientos','seiscientos','setecientos','ochocientos','novecientos'];

  if (n === 0) return 'cero';
  if (n === 100) return 'cien';
  let words = '';
  if (n >= 1000000) {
    const millones = Math.floor(n / 1000000);
    words += (millones === 1 ? 'un millón' : numberToWordsES(millones) + ' millones');
    n = n % 1000000;
    if (n === 0) return words.trim();
    words += ' ';
  }
  if (n >= 1000) {
    const miles = Math.floor(n / 1000);
    if (miles === 1) words += 'mil'; else words += numberToWordsES(miles) + ' mil';
    n = n % 1000;
    if (n === 0) return words.trim();
    words += ' ';
  }
  if (n >= 100) {
    const c = Math.floor(n / 100);
    words += centenas[c] + ' ';
    n = n % 100;
  }
  if (n >= 20) {
    const d = Math.floor(n / 10);
    const r = n % 10;
    if (d === 2 && r > 0) {
      words += 'veinti' + unidades[r];
    } else {
      words += decenas[d];
      if (r > 0) words += ' y ' + unidades[r];
    }
  } else if (n > 0) {
    words += unidades[n];
  }
  return words.trim();
}

function amountToWords(value: string) {
  if (!value) return '';
  // remove currency symbols and spaces
  const cleaned = value.replace(/[^0-9.,]/g, '').replace(/,/g, '.');
  const num = parseFloat(cleaned);
  if (isNaN(num)) return value;
  const entero = Math.floor(num);
  const cent = Math.round((num - entero) * 100);
  const words = numberToWordsES(entero);
  return `${words} con ${cent.toString().padStart(2,'0')}/100`;
}

// Validation helpers
function fillDefaults() {
  // apply current defaults already present in formData; if empty, set a small example
  const examples: Record<string,string> = {
    nombreArrendador: 'Juan Perez',
    nombreArrendatario: 'Maria Gomez',
    direccionInmueble: 'Av. Siempre Viva 123',
  };
  Object.entries(examples).forEach(([k,v]) => { if (!formData.value[k]) formData.value[k] = v; });
}

// Preview scaling refs
const previewWrapper = ref<HTMLElement | null>(null);
const previewStage = ref<HTMLElement | null>(null);
const previewInner = ref<HTMLElement | null>(null);
const scale = ref(1);
let ro: ResizeObserver | null = null;

// Initialize form data and content
onMounted(async () => {
  if (props.modifiedContract) {
    formData.value = { ...props.modifiedContract.variables };
    contractContent.value = props.modifiedContract.modifiedContent;
  } else {
    // Initialize with empty values for each variable
    props.template.variables.forEach(variable => {
      formData.value[variable.key] = '';
    });
    // sensible defaults to make preview clearer
    const defaults: Record<string, string> = {
      montoRenta: 'S/ 1,000.00',
      montoRentaLetras: 'Un mil con 00/100 soles',
      montoGarantia: 'S/ 1,000.00',
      montoGarantiaLetras: 'Un mil con 00/100 soles',
      diasPago: '5',
      renewalNoticeDays: '30',
      ciudadFirma: 'Lima',
      plazoContrato: '12 meses'
    };
    Object.entries(defaults).forEach(([k, v]) => {
      if (k in formData.value && !formData.value[k]) formData.value[k] = v;
    });
    contractContent.value = props.template.content;
  }

  // Setup ResizeObserver to compute scale after DOM update
  await nextTick();
  // compute function (scale by width only so vertical scroll can show full document)
  const compute = () => {
    if (!previewWrapper.value || !previewInner.value) return;
    const wrapperRect = previewWrapper.value.getBoundingClientRect();
    const innerRect = previewInner.value.getBoundingClientRect();
    // compute scale to fit width only. Allow scaling up to fill empty space (preview only)
    const sx = (wrapperRect.width) / innerRect.width;
    const maxScale = 1.25; // maximum upscale in preview
    const s = Math.max(Math.min(sx, maxScale), 0.5); // clamp between 0.5 and maxScale
    scale.value = s;
    // Set the staged container size to the scaled dimensions so scrollbars match visual area
    if (previewStage.value) {
      previewStage.value.style.width = `${innerRect.width * s}px`;
      previewStage.value.style.height = `${innerRect.height * s}px`;
    }
    // After sizing, decide whether to anchor signatures to bottom when content fits one page
    try {
      const pageEl = previewInner.value.querySelector('.page');
      if (pageEl) {
        // unscaled page height (pageEl.clientHeight is in px and reflects CSS cm height)
        const fitsOnePage = pageEl.scrollHeight <= pageEl.clientHeight + 1;
        const sig = pageEl.querySelector('.signatures');
        if (sig) {
          if (fitsOnePage) sig.classList.add('signature-anchored');
          else sig.classList.remove('signature-anchored');
        }
      }
    } catch {
      // non-fatal: ignore measurement errors
    }
  };

  if (previewWrapper.value && previewInner.value) {
    ro = new ResizeObserver(compute);
    ro.observe(previewWrapper.value);
    ro.observe(previewInner.value);
    // also observe stage if available
    if (previewStage.value) ro.observe(previewStage.value);
    compute();
  }
});

onBeforeUnmount(() => {
  if (ro && previewWrapper.value) {
    ro.disconnect();
    ro = null;
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
    let out = value ?? '';
    // format dates
    if (/fecha/i.test(key) && out) {
      out = formatDateForContract(out);
    }
    // numeric/amount conversions to words
    if (/monto.*letras/i.test(key) && (!out || out.trim() === '')) {
      // try to derive from montoRenta or montoGarantia
      const baseKey = key.includes('Renta') || key.toLowerCase().includes('renta') ? 'montoRenta' : 'montoGarantia';
      out = amountToWords(variables[baseKey] || '');
    }
    // if field is a plain amount key and user provided numeric, keep formatting
    if (/^monto|garantia/i.test(key) && out) {
      // keep as-is; user may include currency symbol
    }

    processedContent = processedContent.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), out);
  });
  return processedContent;
};

// Watch for form data changes to update content
watch(formData, (newData) => {
  contractContent.value = processContent(props.template.content, newData);
}, { deep: true });

// Recompute scale when contractContent changes (after DOM updates)
watch(contractContent, async () => {
  await nextTick();
  if (previewWrapper.value && previewInner.value) {
    const wrapperRect = previewWrapper.value.getBoundingClientRect();
    const innerRect = previewInner.value.getBoundingClientRect();
    const sx = (wrapperRect.width) / innerRect.width;
    const maxScale = 1.25;
    const s = Math.max(Math.min(sx, maxScale), 0.5);
    scale.value = s;
    // update staged size
    if (previewStage.value) {
      previewStage.value.style.width = `${innerRect.width * s}px`;
      previewStage.value.style.height = `${innerRect.height * s}px`;
    }
  }
});
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

.preview-card-section {
  padding: 0;
}

.preview-wrapper {
  width: 100%;
  height: 720px; /* espacio disponible para preview */
  display: block;
  align-items: flex-start;
  justify-content: flex-start;
  overflow-x: auto; /* allow horizontal scroll */
  overflow-y: auto; /* enable vertical scroll */
  background: #111; /* dark background to mimic earlier UI */
  padding: 8px; /* reduce padding to use more space */
}

.preview-stage {
  /* este contenedor tiene el tamaño visual (scaled) de la página; los scrollbars se aplican sobre él */
  display: inline-block;
  position: relative;
}

.preview-inner {
  display: inline-block;
  transform-origin: top left;
  background: #fff; /* ensure page background */
  overflow: visible; /* importante: no recortar firmas o elementos absolutos */
}

.contract-content {
  font-family: 'Times New Roman', Times, serif;
  font-size: 12pt;
  line-height: 1.5;
  color: #000000;
  /* remove aggressive padding here: the template defines its own A4 padding/margins
     keeping a small margin so the preview shows the white sheet nicely */
  padding: 16px;
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
