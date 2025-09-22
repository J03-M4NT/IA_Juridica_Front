<template>
  <div class="pdf-analyzer">
    <q-card class="q-pa-md" :class="$q.dark.isActive ? 'bg-dark' : 'bg-white'">
      <q-card-section>
        <div class="text-h6 q-mb-md">
          <q-icon name="picture_as_pdf" class="q-mr-sm" />
          Analizador de Contratos PDF
        </div>

        <!-- File Upload Section -->
        <div class="q-mb-lg">
          <q-uploader
            ref="uploaderRef"
            :url="''"
            label="Seleccionar archivo PDF"
            accept=".pdf"
            :max-file-size="20971520"
            @added="(files) => onFileAdded(files as File[])"
            @rejected="onRejected"
            :disable="loading"
            flat
            bordered
            style="max-width: 100%"
          >
            <template v-slot:header="scope">
              <div class="row no-wrap items-center q-pa-sm q-gutter-xs">
                <q-btn
                  icon="attach_file"
                  :disable="scope.isUploading"
                  flat
                  dense
                  round
                />
                <div class="col">
                  <div class="q-uploader__title">
                    {{ scope.isUploading ? 'Subiendo...' : 'Seleccionar archivo PDF' }}
                  </div>
                  <div class="q-uploader__subtitle">
                    {{ scope.isUploading ? 'Procesando archivo...' : 'Arrastra y suelta o haz clic para seleccionar' }}
                  </div>
                </div>
                <q-btn
                  v-if="scope.canUpload"
                  icon="cloud_upload"
                  @click="scope.upload"
                  :loading="scope.isUploading"
                  color="primary"
                  round
                  flat
                />
              </div>
            </template>
          </q-uploader>
        </div>

        <!-- Loading State -->
        <div v-if="loading" class="text-center q-mb-lg">
          <q-linear-progress indeterminate color="primary" class="q-mb-sm" />
          <div class="text-body2 text-grey-6">
            <q-icon name="hourglass_empty" class="q-mr-sm" />
            {{ loadingMessage }}
          </div>
        </div>

        <!-- Error Notification -->
        <q-banner v-if="error" class="bg-negative text-white q-mb-md" rounded>
          <template v-slot:avatar>
            <q-icon name="error" />
          </template>
          {{ error }}
          <template v-slot:action>
            <q-btn flat label="Cerrar" @click="error = ''" />
          </template>
        </q-banner>

        <!-- Results Section -->
        <div v-if="analysisResult" class="analysis-results">
          <q-separator class="q-mb-md" />

          <div class="text-h6 q-mb-md">
            <q-icon name="analytics" class="q-mr-sm" />
            Resultados del Análisis
          </div>

          <!-- Summary -->
          <q-card
            class="q-mb-md"
            :class="$q.dark.isActive ? 'bg-grey-9' : 'bg-grey-1'"
            flat
            bordered
          >
            <q-card-section>
              <div class="text-subtitle1 text-weight-medium q-mb-sm">
                <q-icon name="summarize" class="q-mr-sm" />
                Resumen del Contrato
              </div>
              <div class="formatted-content" v-html="formatText(analysisResult.summary)"></div>
            </q-card-section>
          </q-card>

          <!-- Main Clauses -->
          <q-card
            class="q-mb-md"
            :class="$q.dark.isActive ? 'bg-grey-9' : 'bg-grey-1'"
            flat
            bordered
          >
            <q-card-section>
              <div class="text-subtitle1 text-weight-medium q-mb-sm">
                <q-icon name="list" class="q-mr-sm" />
                Cláusulas Principales
              </div>
              <q-list>
                <q-item
                  v-for="(clause, index) in analysisResult.mainClauses"
                  :key="index"
                  class="q-py-sm"
                >
                  <q-item-section avatar>
                    <q-icon name="article" color="primary" />
                  </q-item-section>
                  <q-item-section>
                    <q-item-label class="text-weight-medium">
                      Cláusula {{ index + 1 }}
                    </q-item-label>
                    <q-item-label caption class="formatted-content">
                      {{ clause }}
                    </q-item-label>
                  </q-item-section>
                </q-item>
              </q-list>
            </q-card-section>
          </q-card>

          <!-- Risks and Ambiguities -->
          <q-card
            v-if="analysisResult.risks.length > 0"
            class="q-mb-md"
            :class="$q.dark.isActive ? 'bg-orange-9' : 'bg-orange-1'"
            flat
            bordered
          >
            <q-card-section>
              <div class="text-subtitle1 text-weight-medium q-mb-sm text-negative">
                <q-icon name="warning" class="q-mr-sm" />
                Riesgos y Ambigüedades Detectadas
              </div>
              <q-list>
                <q-item
                  v-for="(risk, index) in analysisResult.risks"
                  :key="index"
                  class="q-py-sm"
                >
                  <q-item-section avatar>
                    <q-icon name="error_outline" color="negative" />
                  </q-item-section>
                  <q-item-section>
                    <q-item-label class="text-weight-medium">
                      Riesgo {{ index + 1 }}
                    </q-item-label>
                    <q-item-label caption>
                      {{ risk }}
                    </q-item-label>
                  </q-item-section>
                </q-item>
              </q-list>
            </q-card-section>
          </q-card>

          <!-- File Info -->
          <q-card
            class="q-mb-md"
            :class="$q.dark.isActive ? 'bg-grey-9' : 'bg-grey-1'"
            flat
            bordered
          >
            <q-card-section>
              <div class="text-subtitle2 text-weight-medium q-mb-sm">
                <q-icon name="info" class="q-mr-sm" />
                Información del Archivo
              </div>
              <div class="row q-gutter-sm">
                <q-chip
                  icon="picture_as_pdf"
                  color="primary"
                  text-color="white"
                  size="sm"
                >
                  {{ fileName }}
                </q-chip>
                <q-chip
                  icon="data_usage"
                  color="secondary"
                  text-color="white"
                  size="sm"
                >
                  {{ (fileSize / 1024).toFixed(1) }} KB
                </q-chip>
                <q-chip
                  icon="text_snippet"
                  color="positive"
                  text-color="white"
                  size="sm"
                >
                  {{ extractedText.length }} caracteres extraídos
                </q-chip>
              </div>
            </q-card-section>
          </q-card>
        </div>
      </q-card-section>
    </q-card>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useQuasar } from 'quasar';
import { GoogleGenerativeAI } from '@google/generative-ai';
import * as pdfjsLib from 'pdfjs-dist';

// Configurar el worker de PDF.js
const pdfjsWorker = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/5.4.149/pdf.worker.min.js";
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

// Type definitions
interface RejectedEntry {
  failedPropValidation: string;
  file?: File;
  message?: string;
}

interface ApiError {
  status?: number;
  message?: string;
}

const $q = useQuasar();

// Reactive data
const uploaderRef = ref();
const loading = ref(false);
const loadingMessage = ref('');
const error = ref('');
const fileName = ref('');
const fileSize = ref(0);
const extractedText = ref('');
const analysisResult = ref<{
  summary: string;
  mainClauses: string[];
  risks: string[];
} | null>(null);

// Initialize Gemini AI with proper error handling
const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
if (!apiKey) {
  throw new Error('VITE_GEMINI_API_KEY is not defined in environment variables');
}

const genAI = new GoogleGenerativeAI(apiKey);

// Methods
const onFileAdded = async (files: File[]) => {
  const file = files[0];
  if (!file) return;

  // Validate file type
  if (file.type !== 'application/pdf') {
    showError('Por favor, selecciona un archivo PDF válido.');
    return;
  }

  // Reset previous results
  resetAnalysis();

  // Set file info
  fileName.value = file.name;
  fileSize.value = file.size;

  try {
    loading.value = true;
    loadingMessage.value = 'Extrayendo texto del PDF...';

    // Extract text from PDF
    const text = await extractTextFromPDF(file);
    extractedText.value = text;

    if (!text.trim()) {
      throw new Error('No se pudo extraer texto del PDF. El archivo podría estar escaneado o protegido.');
    }

    loadingMessage.value = 'Analizando contrato con IA...';

    // Analyze with Gemini
    const result = await analyzeContract(text);
    analysisResult.value = result;

    // Show success notification
    $q.notify({
      message: 'Análisis completado exitosamente',
      color: 'positive',
      position: 'top',
      icon: 'check_circle'
    });

  } catch (err) {
    console.error('Error processing PDF:', err);
    showError(err instanceof Error ? err.message : 'Error desconocido al procesar el PDF');
  } finally {
    loading.value = false;
    loadingMessage.value = '';
  }
};

const onRejected = (rejectedEntries: RejectedEntry[]) => {
  const entry = rejectedEntries[0];
  if (entry?.failedPropValidation === 'max-file-size') {
    showError('El archivo es demasiado grande. El límite es 20MB.');
  } else if (entry?.failedPropValidation === 'accept') {
    showError('Por favor, selecciona un archivo PDF válido.');
  } else {
    showError('Error al seleccionar el archivo.');
  }
};

const extractTextFromPDF = async (file: File): Promise<string> => {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

    let fullText = '';

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();

      const pageText = textContent.items
        .map((item) => {
          // Handle both TextItem and TextMarkedContent types
          if ('str' in item) {
            return item.str || '';
          }
          return '';
        })
        .join(' ');

      fullText += pageText + '\n';
    }

    return fullText;
  } catch (error) {
    console.error('Error extracting text from PDF:', error);
    throw new Error('Error al extraer texto del PDF');
  }
};

const analyzeContract = async (text: string) => {
  try {
    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-flash",
      generationConfig: {
        temperature: 0.3,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 4096,
      },
    });

    const prompt = `
Analiza el siguiente contrato y proporciona un análisis estructurado:

CONTRATO:
${text}

INSTRUCCIONES:
1. Haz un resumen claro y conciso del contrato en lenguaje simple.
2. Lista las cláusulas principales del contrato (máximo 10).
3. Identifica riesgos, ambigüedades o cláusulas problemáticas.

FORMATO DE RESPUESTA:
## RESUMEN
[Resumen en lenguaje simple]

## CLÁUSULAS PRINCIPALES
1. [Cláusula 1]
2. [Cláusula 2]
...

## RIESGOS Y AMBIGÜEDADES
- [Riesgo 1]
- [Riesgo 2]
...

IMPORTANTE:
- Sé específico y detallado
- Usa lenguaje claro y profesional
- Identifica claramente cualquier riesgo potencial
    `.trim();

    const result = await model.generateContent(prompt);
    const response = result.response.text();

    // Parse the response
    const summary = extractSection(response, '## RESUMEN');
    const mainClauses = extractSection(response, '## CLÁUSULAS PRINCIPALES')
      .split('\n')
      .map(line => line.replace(/^\d+\.\s*/, '').trim())
      .filter(line => line.length > 0);
    const risks = extractSection(response, '## RIESGOS Y AMBIGÜEDADES')
      .split('\n')
      .map(line => line.replace(/^-\s*/, '').trim())
      .filter(line => line.length > 0);

    return {
      summary,
      mainClauses,
      risks
    };
  } catch (error: unknown) {
    console.error('Error analyzing contract:', error);

    // Type guard to check if error has the expected properties
    const apiError = error as ApiError;

    // Handle specific API errors
    if (apiError?.status === 429 || apiError?.message?.includes('RATE_LIMIT_EXCEEDED') || apiError?.message?.includes('Quota exceeded')) {
      throw new Error('Límite de consultas excedido. Has alcanzado el límite de solicitudes por minuto de la API de Google. Por favor, espera unos minutos antes de intentar nuevamente.');
    } else if (apiError?.status === 400) {
      throw new Error('Error en la solicitud. El texto del contrato podría ser demasiado largo o tener formato inválido.');
    } else if (apiError?.status === 403) {
      throw new Error('Acceso denegado a la API. Verifica que tu clave API sea válida y tenga los permisos necesarios.');
    } else if (apiError?.status === 500) {
      throw new Error('Error interno del servidor de Google. Por favor, intenta nuevamente en unos momentos.');
    } else {
      throw new Error('Error al analizar el contrato con la IA. Por favor, verifica tu conexión a internet e intenta nuevamente.');
    }
  }
};

const extractSection = (text: string, sectionHeader: string): string => {
  const regex = new RegExp(`${sectionHeader}\\s*\\n([^#]*)`, 'i');
  const match = text.match(regex);
  return match && match[1] ? match[1].trim() : '';
};

const formatText = (text: string): string => {
  return text
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/\n/g, '<br>');
};

const showError = (message: string) => {
  error.value = message;
  $q.notify({
    message,
    color: 'negative',
    position: 'top',
    icon: 'error'
  });
};

const resetAnalysis = () => {
  analysisResult.value = null;
  error.value = '';
  extractedText.value = '';
};
</script>

<style scoped>
.pdf-analyzer {
  max-width: 800px;
  margin: 0 auto;
}

.formatted-content {
  line-height: 1.6;
}

.formatted-content :deep(strong) {
  font-weight: 600;
}

.formatted-content :deep(em) {
  font-style: italic;
}

.formatted-content :deep(br) {
  margin-bottom: 0.5em;
}

:deep(.q-dark) .formatted-content {
  color: #e0e0e0;
}

:deep(.q-dark) .formatted-content strong {
  color: #ffffff;
}

:deep(.q-dark) .formatted-content em {
  color: #b0b0b0;
}
</style>
