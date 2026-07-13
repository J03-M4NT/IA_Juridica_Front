<template>
  <div class="pdf-analyzer-container">
    <div class="analyzer-card-wrapper">
      <q-card class="analyzer-main-card modern-card">
        <q-card-section class="card-header-section">
          <div class="header-content">
            <div class="title-section">
              <q-icon name="gavel" size="32px" class="title-icon q-mr-md" />
              <div>
                <h1 class="main-title">ANALIZADOR DE CONTRATOS PDF</h1>
                <p class="subtitle-text">Herramienta inteligente de análisis legal</p>
              </div>
            </div>

            <!-- Botones de diagnostico: solo visibles para administradores -->
            <div v-if="isAdmin" class="header-actions">
              <q-btn
                color="primary"
                icon="verified"
                label="PROBAR API KEY"
                @click="probarAPIKey"
                :loading="loading"
                class="action-button q-mr-sm"
                size="sm"
                unelevated
                rounded
              />
              <q-btn
                color="secondary"
                icon="build"
                label="PROBAR PDF WORKER"
                @click="probarWorkerPDF"
                :loading="loading"
                class="action-button"
                size="sm"
                unelevated
                rounded
              />
            </div>
          </div>
        </q-card-section>

        <!-- File Upload Section -->
        <q-card-section class="upload-section">
          <div class="upload-card modern-card">
            <q-card-section>
              <div class="upload-header">
                <q-icon name="upload_file" size="24px" class="upload-icon q-mr-sm" />
                <h3 class="section-title">CARGA TU CONTRATO PDF</h3>
              </div>
              <p class="upload-description">Selecciona o arrastra un archivo PDF para comenzar el análisis inteligente</p>

              <q-uploader
                :url="''"
                label="Seleccionar archivo PDF"
                accept=".pdf"
                :max-file-size="20971520"
                @added="(files: readonly any[]) => onFileAdded(files as File[])"
                @rejected="onRejected"
                :disable="loading"
                flat
                bordered
                class="modern-uploader"
              >
                <template v-slot:header="scope">
                  <div class="uploader-header-content">
                    <q-icon name="attach_file" size="20px" class="uploader-icon q-mr-sm" />
                    <div class="uploader-text">
                      <div class="uploader-title">
                        {{ scope.isUploading ? 'Procesando archivo...' : 'Seleccionar archivo PDF' }}
                      </div>
                      <div class="uploader-subtitle">
                        {{ scope.isUploading ? 'Analizando documento...' : 'Arrastra y suelta o haz clic para seleccionar' }}
                      </div>
                    </div>
                    <q-btn
                      v-if="scope.canUpload"
                      icon="cloud_upload"
                      @click="scope.upload"
                      :loading="scope.isUploading"
                      color="primary"
                      round
                      unelevated
                      class="upload-btn"
                    />
                  </div>
                </template>
              </q-uploader>
            </q-card-section>
          </div>
        </q-card-section>

        <!-- Loading State -->
        <q-card-section v-if="loading" class="loading-section">
          <div class="loading-card modern-card">
            <q-card-section class="text-center">
              <q-icon name="hourglass_empty" size="48px" class="loading-icon q-mb-md" />
              <h3 class="loading-title">PROCESANDO DOCUMENTO</h3>
              <p class="loading-message">{{ loadingMessage }}</p>
              <q-linear-progress indeterminate color="primary" class="loading-progress q-mt-md" />
            </q-card-section>
          </div>
        </q-card-section>

        <!-- Error Notification -->
        <q-card-section v-if="error" class="error-section">
          <q-banner class="error-banner modern-banner" rounded>
            <template v-slot:avatar>
              <q-icon name="error" size="24px" />
            </template>
            <div class="error-content">
              <h4 class="error-title">ERROR DETECTADO</h4>
              <p class="error-message">{{ error }}</p>
            </div>
            <template v-slot:action>
              <q-btn flat label="Cerrar" @click="error = ''" class="error-close-btn" />
            </template>
          </q-banner>
        </q-card-section>

        <!-- Extracted Text Section -->
        <q-card-section v-if="extractedText" class="extracted-section">
          <div class="extracted-card modern-card">
            <q-card-section>
              <div class="section-header">
                <q-icon name="text_snippet" size="24px" class="section-icon q-mr-sm" />
                <h3 class="section-title">TEXTO EXTRAÍDO DEL PDF</h3>
              </div>

              <div class="text-content-card modern-card">
                <q-card-section>
                  <div class="content-header">
                    <q-icon name="description" class="content-icon q-mr-sm" />
                    <span class="content-title">CONTENIDO DEL DOCUMENTO</span>
                  </div>
                  <div class="extracted-text-container">
                    <pre class="extracted-text">{{ extractedText }}</pre>
                  </div>
                </q-card-section>
              </div>

              <!-- Analyze Contract Button -->
              <div class="analyze-button-container">
                <q-btn
                  color="primary"
                  icon="analytics"
                  label="ANALIZAR CONTRATO CON IA"
                  @click="runAnalysis(extractedText)"
                  :loading="loading"
                  :disable="!extractedText.trim()"
                  class="analyze-button"
                  size="lg"
                  unelevated
                  rounded
                >
                  <q-tooltip>Realizar análisis inteligente del contrato</q-tooltip>
                </q-btn>
              </div>
            </q-card-section>
          </div>
        </q-card-section>

        <!-- Results Section -->
        <q-card-section v-if="analysisResult" class="results-section">
          <div class="results-card modern-card">
            <q-card-section>
              <div class="section-header">
                <q-icon name="analytics" size="24px" class="section-icon q-mr-sm" />
                <h3 class="section-title">RESULTADOS DEL ANÁLISIS</h3>
              </div>

              <!-- Puntuacion -->
              <div class="result-item-card modern-card">
                <q-card-section>
                  <div class="result-header">
                    <q-icon name="speed" class="result-icon q-mr-sm" />
                    <h4 class="result-title">PUNTUACIÓN DEL CONTRATO</h4>
                  </div>
                  <div class="score-container">
                    <div class="score-number" :class="`text-${scoreColor}`">
                      {{ analysisResult.puntuacion }}<span class="score-max">/100</span>
                    </div>
                    <q-linear-progress
                      :value="analysisResult.puntuacion / 100"
                      :color="scoreColor"
                      class="score-bar q-mt-sm"
                      size="10px"
                      rounded
                    />
                  </div>
                </q-card-section>
              </div>

              <!-- Resumen -->
              <div class="result-item-card modern-card">
                <q-card-section>
                  <div class="result-header">
                    <q-icon name="summarize" class="result-icon q-mr-sm" />
                    <h4 class="result-title">RESUMEN DEL CONTRATO</h4>
                  </div>
                  <p class="result-content">{{ analysisResult.resumen }}</p>
                </q-card-section>
              </div>

              <!-- Partes -->
              <div v-if="Object.keys(analysisResult.partes).length > 0" class="result-item-card modern-card">
                <q-card-section>
                  <div class="result-header">
                    <q-icon name="people" class="result-icon q-mr-sm" />
                    <h4 class="result-title">PARTES DEL CONTRATO</h4>
                  </div>
                  <div class="partes-list">
                    <div v-for="(nombre, rol) in analysisResult.partes" :key="rol" class="parte-item">
                      <q-chip color="primary" text-color="white" size="sm" class="parte-chip">{{ rol }}</q-chip>
                      <span class="parte-nombre">{{ nombre }}</span>
                    </div>
                  </div>
                </q-card-section>
              </div>

              <!-- Fechas importantes -->
              <div v-if="analysisResult.fechas_importantes.length > 0" class="result-item-card modern-card">
                <q-card-section>
                  <div class="result-header">
                    <q-icon name="event" class="result-icon q-mr-sm" />
                    <h4 class="result-title">FECHAS IMPORTANTES</h4>
                  </div>
                  <div class="fechas-chips">
                    <q-chip
                      v-for="fecha in analysisResult.fechas_importantes"
                      :key="fecha"
                      color="secondary"
                      text-color="white"
                      icon="calendar_today"
                      size="sm"
                    >{{ fecha }}</q-chip>
                  </div>
                </q-card-section>
              </div>

              <!-- Obligaciones -->
              <div v-if="Object.keys(analysisResult.obligaciones).length > 0" class="result-item-card modern-card">
                <q-card-section>
                  <div class="result-header">
                    <q-icon name="assignment" class="result-icon q-mr-sm" />
                    <h4 class="result-title">OBLIGACIONES POR PARTE</h4>
                  </div>
                  <div v-for="(lista, parte) in analysisResult.obligaciones" :key="parte" class="obligaciones-grupo q-mb-md">
                    <div class="obligaciones-parte q-mb-xs">{{ parte }}</div>
                    <q-list dense>
                      <q-item v-for="(ob, i) in lista" :key="i" class="obligacion-item">
                        <q-item-section avatar>
                          <q-icon name="check_circle" color="positive" size="16px" />
                        </q-item-section>
                        <q-item-section>{{ ob }}</q-item-section>
                      </q-item>
                    </q-list>
                  </div>
                </q-card-section>
              </div>

              <!-- Riesgos -->
              <div v-if="analysisResult.riesgos.length > 0" class="result-item-card risk-card modern-card">
                <q-card-section>
                  <div class="result-header risk-header">
                    <q-icon name="warning" class="result-icon q-mr-sm" />
                    <h4 class="result-title">RIESGOS DETECTADOS</h4>
                  </div>
                  <q-list class="risks-list">
                    <q-item
                      v-for="(riesgo, index) in analysisResult.riesgos"
                      :key="index"
                      class="risk-item riesgo-detalle"
                    >
                      <q-item-section>
                        <div class="riesgo-header q-mb-xs">
                          <span class="riesgo-clausula">{{ riesgo.clausula }}</span>
                          <q-badge :color="nivelColor(riesgo.nivel)" class="riesgo-nivel q-ml-sm">
                            {{ riesgo.nivel.toUpperCase() }}
                          </q-badge>
                        </div>
                        <div class="riesgo-descripcion q-mb-xs">{{ riesgo.descripcion }}</div>
                        <div class="riesgo-sugerencia">
                          <q-icon name="lightbulb" size="14px" color="warning" class="q-mr-xs" />
                          {{ riesgo.sugerencia }}
                        </div>
                      </q-item-section>
                    </q-item>
                  </q-list>
                </q-card-section>
              </div>

              <!-- Mejoras -->
              <div v-if="analysisResult.mejoras.length > 0" class="result-item-card modern-card">
                <q-card-section>
                  <div class="result-header">
                    <q-icon name="auto_fix_high" class="result-icon q-mr-sm" />
                    <h4 class="result-title">MEJORAS SUGERIDAS</h4>
                  </div>
                  <q-list>
                    <q-item v-for="(mejora, i) in analysisResult.mejoras" :key="i" class="mejora-item">
                      <q-item-section avatar>
                        <q-icon name="tips_and_updates" color="primary" size="20px" />
                      </q-item-section>
                      <q-item-section>
                        <q-item-label class="mejora-titulo">{{ mejora.titulo }}</q-item-label>
                        <q-item-label caption>{{ mejora.descripcion }}</q-item-label>
                      </q-item-section>
                    </q-item>
                  </q-list>
                </q-card-section>
              </div>

              <!-- Informacion del archivo -->
              <div class="result-item-card modern-card">
                <q-card-section>
                  <div class="result-header">
                    <q-icon name="info" class="result-icon q-mr-sm" />
                    <h4 class="result-title">INFORMACIÓN DEL ARCHIVO</h4>
                  </div>
                  <div class="file-info-chips">
                    <q-chip icon="picture_as_pdf" color="primary" text-color="white" class="info-chip" size="sm">
                      {{ fileName }}
                    </q-chip>
                    <q-chip icon="data_usage" color="secondary" text-color="white" class="info-chip" size="sm">
                      {{ (fileSize / 1024).toFixed(1) }} KB
                    </q-chip>
                    <q-chip icon="text_snippet" color="positive" text-color="white" class="info-chip" size="sm">
                      {{ extractedText.length }} caracteres
                    </q-chip>
                  </div>
                </q-card-section>
              </div>
            </q-card-section>
          </div>
        </q-card-section>
      </q-card>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useQuasar } from 'quasar';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { GEMINI_MODEL_FAST } from '../constants/gemini';
import * as pdfjsLib from "pdfjs-dist";
import { extractTextFromPDF, diagnosticarPDF } from '../services/pdfService';
import pdfjsWorker from "pdfjs-dist/build/pdf.worker.min.js?url";
import { analizarContrato } from '../services/geminiService';
import { useUserProfileStore } from '../stores/userProfile';
import { storeToRefs } from 'pinia';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

const $q = useQuasar();
const profileStore = useUserProfileStore();
const { isAdmin } = storeToRefs(profileStore);

interface NotificationOptions {
  message: string;
  color?: 'positive' | 'negative' | 'warning' | 'info';
  position?: 'top' | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'bottom' | 'left' | 'right' | 'center';
  icon?: string;
}

const showNotification = (options: NotificationOptions) => {
  $q.notify(options);
};

interface RejectedEntry {
  failedPropValidation: string;
  file?: File;
  message?: string;
}

interface ApiError {
  status?: number;
  message?: string;
}

interface RiesgoContrato {
  clausula: string;
  descripcion: string;
  nivel: 'alto' | 'medio' | 'bajo';
  sugerencia: string;
}

interface MejoraContrato {
  titulo: string;
  descripcion: string;
}

interface AnalisisContratoResult {
  resumen: string;
  puntuacion: number;
  riesgos: RiesgoContrato[];
  mejoras: MejoraContrato[];
  partes: Record<string, string>;
  fechas_importantes: string[];
  obligaciones: Record<string, string[]>;
}

const loading = ref<boolean>(false);
const loadingMessage = ref<string>('');
const error = ref<string>('');
const fileName = ref<string>('');
const fileSize = ref<number>(0);
const extractedText = ref<string>('');
const analysisResult = ref<AnalisisContratoResult | null>(null);

const scoreColor = computed(() => {
  if (!analysisResult.value) return 'grey';
  const p = analysisResult.value.puntuacion;
  if (p >= 71) return 'positive';
  if (p >= 41) return 'warning';
  return 'negative';
});

const nivelColor = (nivel: string): string => {
  if (nivel === 'alto') return 'negative';
  if (nivel === 'medio') return 'warning';
  return 'positive';
};

const classifyGeminiError = (err: unknown): string => {
  const apiError = err as ApiError;
  if (apiError?.message?.includes('RATE_LIMIT_EXCEEDED') || apiError?.message?.includes('Quota exceeded')) {
    return 'Limite de cuota excedido. Espera unos minutos e intenta nuevamente.';
  }
  if (apiError?.message?.includes('API Key not found') || apiError?.message?.includes('API_KEY_INVALID')) {
    return 'API Key no valida. Verifica que la clave tenga permisos para Gemini.';
  }
  if (err instanceof SyntaxError || apiError?.message?.includes('JSON')) {
    return 'La IA devolvio un formato inesperado. Intenta nuevamente.';
  }
  if (apiError?.status === 403) return 'Acceso denegado: la API key no tiene permisos suficientes.';
  if (apiError?.status === 500) return 'Error interno del servidor de Google. Intenta en unos momentos.';
  return 'Error al analizar el contrato con la IA. Verifica tu conexion e intenta nuevamente.';
};

const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

if (!apiKey) {
  throw new Error('API Key no definida. Configura VITE_GEMINI_API_KEY en tus variables de entorno.');
}

const genAI = new GoogleGenerativeAI(apiKey);

const onFileAdded = async (files: File[]) => {
  const file = files[0];
  if (!file) return;

  if (file.type !== 'application/pdf') {
    showError('Por favor, selecciona un archivo PDF válido.');
    return;
  }

  resetAnalysis();
  fileName.value = file.name;
  fileSize.value = file.size;

  try {
    loading.value = true;
    loadingMessage.value = 'Analizando el PDF...';

    const diagnostico = await diagnosticarPDF(file);

    if (!diagnostico.isValidPDF) {
      throw new Error(`El archivo no es un PDF válido: ${diagnostico.error}`);
    }

    if (!diagnostico.hasText) {
      throw new Error(`El PDF no contiene texto extraíble.

**Posibles causas:**
- El PDF está escaneado o es una imagen
- El PDF está compuesto solo de imágenes
- El PDF tiene texto como imagen (OCR)

**Solucion:**
Para analizar contratos, necesitas un PDF con texto real (no escaneado) que se pueda seleccionar y copiar.

**Alternativas:**
- Convierte el PDF escaneado usando OCR (Optical Character Recognition)
- Solicita una versión digital del contrato en formato PDF con texto
- Usa herramientas como Adobe Acrobat para reconocer texto en PDFs escaneados`);
    }

    if (diagnostico.workerError) {
      throw new Error(`Error con el procesador de PDF.

**Problema detectado:**
- No se pudo cargar el worker de PDF.js
- Error especifico: ${diagnostico.error}

**Posibles causas:**
- Error en la configuracion del worker
- Problemas con el bundler de Vite
- Configuracion del navegador o servidor de desarrollo

**Soluciones:**
- Verifica que el worker se este importando correctamente
- Asegurate de que Vite este configurado para manejar imports ?url
- Intenta recargar la pagina
- Si persiste, contacta al administrador del sistema`);
    }

    loadingMessage.value = 'Extrayendo texto del PDF...';
    const text = await extractTextFromPDF(file);
    extractedText.value = text;

    if (!text.trim()) {
      throw new Error('No se pudo extraer texto del PDF. El archivo podría estar escaneado o protegido.');
    }

    loadingMessage.value = 'Analizando contrato con IA...';

    try {
      const result = await analizarContrato(text);
      analysisResult.value = result as AnalisisContratoResult;
      showNotification({
        message: 'Análisis completado exitosamente',
        color: 'positive',
        position: 'top',
        icon: 'check_circle'
      });
    } catch (geminiErr: unknown) {
      throw new Error(classifyGeminiError(geminiErr));
    }

  } catch (err) {
    console.error('Error procesando PDF:', err);
    showError(err instanceof Error ? err.message : 'Error desconocido al procesar el PDF');
  } finally {
    loading.value = false;
    loadingMessage.value = '';
  }
};

const runAnalysis = async (text: string) => {
  loading.value = true;
  loadingMessage.value = 'Analizando contrato con IA...';
  error.value = '';
  try {
    const result = await analizarContrato(text);
    analysisResult.value = result as AnalisisContratoResult;
    showNotification({
      message: 'Análisis completado exitosamente',
      color: 'positive',
      position: 'top',
      icon: 'check_circle'
    });
  } catch (err: unknown) {
    showError(classifyGeminiError(err));
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

const showError = (message: string) => {
  error.value = message;
  showNotification({
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

const probarAPIKey = async () => {
  try {
    loading.value = true;
    loadingMessage.value = 'Probando API key...';
    error.value = '';

    const model = genAI.getGenerativeModel({
      model: GEMINI_MODEL_FAST,
      generationConfig: {
        temperature: 0.1,
        topK: 1,
        topP: 0.1,
        maxOutputTokens: 50,
      },
    });

    const result = await model.generateContent({
      contents: [{
        role: "user",
        parts: [{ text: "Responde solo con 'OK' si puedes leer este mensaje." }]
      }]
    });

    if (result.response) {
      showNotification({
        message: 'API Key valida - Puedes analizar PDFs',
        color: 'positive',
        position: 'top',
        icon: 'check_circle'
      });
    } else {
      throw new Error('No se recibio respuesta de la API');
    }

  } catch (err) {
    console.error('Error al probar API key:', err);
    const errorMessage = err instanceof Error ? err.message : 'Error desconocido';

    showNotification({
      message: `Error de API Key: ${errorMessage}`,
      color: 'negative',
      position: 'top',
      icon: 'error'
    });

    showError(errorMessage);
  } finally {
    loading.value = false;
    loadingMessage.value = '';
  }
};

const probarWorkerPDF = async () => {
  try {
    loading.value = true;
    loadingMessage.value = 'Probando worker de PDF.js...';
    error.value = '';

    if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
      throw new Error('Worker de PDF.js no está configurado');
    }

    // Crear un PDF de prueba simple
    const testPdfData = await fetch('data:application/pdf;base64,JVBERi0xLjMKJeLjz9MKCjEgMCBvYmoKPDwKL1R5cGUgL0NhdGFsb2cKL091dGxpbmVzIDIgMCBSCi9QYWdlcyAzIDAgUgo+PgplbmRvYmoKCjIgMCBvYmoKPDwKL1R5cGUgL091dGxpbmVzCi9Db3VudCAwCj4+CmVuZG9iagoKMyAwIG9iago8PAovVHlwZSAvUGFnZXMKL0NvdW50IDEKL0tpZHMgWzQgMCBSXQo+PgplbmRvYmoKCjQgMCBvYmoKPDwKL1R5cGUgL1BhZ2UKL1BhcmVudCAzIDAgUgovTWVkaWFCb3ggWzAgMCA2MTIgNzkyXQovQ29udGVudHMgNSAwIFIKL1Jlc291cmNlcyA8PAovUHJvY1NldCBbL1BERiAvVGV4dF0KL0ZvbnQgPDwKL0YxIDYgMCBSCj4+Cj4+Cj4+CmVuZG9iagoKNSAwIG9iago8PAovTGVuZ3RoIDQ0Cj4+CnN0cmVhbQpCVAovRjEgMTIgVGYKMCAwIFRkCihUZXN0IFBERikgVGoKRVQKZW5kc3RyZWFtCmVuZG9iagoKNiAwIG9iago8PAovVHlwZSAvRm9udAovU3VidHlwZSAvVHlwZTEKL0Jhc2VGb250IC9IZWx2ZXRpY2EKL0VuY29kaW5nIC9XaW5BbnNpRW5jb2RpbmcKPj4KZW5kb2JqCgp4cmVmCjAgNwowMDAwMDAwMDAwIDY1NTM1IGYgCjAwMDAwMDAwMTAgMDAwMDAgbiAKMDAwMDAwMDA3NCAwMDAwMCBuIAowMDAwMDAwMTQ3IDAwMDAwIG4gCjAwMDAwMDAyMTAgMDAwMDAgbiAKMDAwMDAwMDI4MCAwMDAwMCBuIAowMDAwMDAwMzQ5IDAwMDAwIG4gCnRyYWlsZXIKPDwKL1NpemUgNwowL1Jvb3QgMSAwIFIKPj4Kc3RhcnR4cmVmCjM4OQolJUVPRgo=');
    const testPdfBlob = await testPdfData.blob();
    const testFile = new File([testPdfBlob], 'test.pdf', { type: 'application/pdf' });

    // Intentar cargar el PDF de prueba
    const arrayBuffer = await testFile.arrayBuffer();
    await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

    showNotification({
      message: 'Worker de PDF.js funciona correctamente',
      color: 'positive',
      position: 'top',
      icon: 'check_circle'
    });

  } catch (err) {
    console.error('Error al probar worker de PDF.js:', err);
    const errorMessage = err instanceof Error ? err.message : 'Error desconocido';

    showNotification({
      message: `Error con worker de PDF.js: ${errorMessage}`,
      color: 'negative',
      position: 'top',
      icon: 'error'
    });

    showError(errorMessage);
  } finally {
    loading.value = false;
    loadingMessage.value = '';
  }
};
</script>

<style scoped>
.pdf-analyzer-container {
  width: 100%;
  max-width: 900px;
  margin: 0 auto;
  padding: 0 16px;
}

.analyzer-card-wrapper {
  width: 100%;
}

.analyzer-main-card {
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  background: rgba(255, 255, 255, 0.95);
  border: 1px solid rgba(255, 255, 255, 0.2);
}

:deep(.q-dark) .analyzer-main-card {
  background: rgba(18, 18, 18, 0.95);
  border: 1px solid rgba(255, 255, 255, 0.1);
}

/* Header Section */
.card-header-section {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 32px;
}

.header-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
}

.title-section {
  display: flex;
  align-items: center;
  flex: 1;
}

.title-icon {
  color: #ffffff;
  filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.2));
}

.main-title {
  font-size: 2rem;
  font-weight: 700;
  margin: 0 0 4px 0;
  letter-spacing: 1px;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

.subtitle-text {
  font-size: 0.9rem;
  opacity: 0.9;
  font-weight: 400;
  margin: 0;
}

.header-actions {
  display: flex;
  gap: 12px;
}

.action-button {
  font-weight: 600;
  letter-spacing: 0.5px;
  text-transform: uppercase;
  font-size: 0.75rem;
  padding: 8px 16px;
  border-radius: 25px;
  transition: all 0.3s ease;
}

.action-button:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(102, 126, 234, 0.4);
}

/* Modern Cards */
.modern-card {
  border-radius: 12px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  background: rgba(255, 255, 255, 0.9);
  border: 1px solid rgba(255, 255, 255, 0.2);
  transition: all 0.3s ease;
}

.modern-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
}

:deep(.q-dark) .modern-card {
  background: rgba(30, 30, 30, 0.9);
  border: 1px solid rgba(255, 255, 255, 0.1);
}

/* Upload Section */
.upload-card {
  margin-bottom: 24px;
  padding: 12px 16px;
}

.upload-header {
  display: flex;
  align-items: center;
  margin-bottom: 8px;
}

.upload-icon {
  color: #667eea;
}

.section-title {
  font-size: 1.1rem;
  font-weight: 600;
  margin: 0;
  letter-spacing: 0.5px;
  text-transform: uppercase;
}

.upload-description {
  color: #666;
  font-size: 0.9rem;
  margin-bottom: 16px;
}

:deep(.q-dark) .upload-description {
  color: #ccc;
}

.modern-uploader {
  border-radius: 12px;
  border: 2px dashed rgba(102, 126, 234, 0.3);
  background: rgba(102, 126, 234, 0.05);
}

.uploader-header-content {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
}

.uploader-icon {
  color: #667eea;
}

.uploader-text {
  flex: 1;
}

.uploader-title {
  font-weight: 600;
  font-size: 0.95rem;
  margin-bottom: 2px;
}

.uploader-subtitle {
  font-size: 0.85rem;
  color: #666;
}

:deep(.q-dark) .uploader-subtitle {
  color: #ccc;
}

.upload-btn {
  transition: all 0.3s ease;
}

.upload-btn:hover {
  transform: scale(1.05);
}

/* Loading Section */
.loading-card {
  text-align: center;
  padding: 32px;
}

.loading-icon {
  color: #667eea;
  animation: pulse 2s infinite;
}

.loading-title {
  font-size: 1.2rem;
  font-weight: 600;
  margin: 16px 0 8px 0;
  letter-spacing: 0.5px;
}

.loading-message {
  color: #666;
  font-size: 0.9rem;
  margin-bottom: 16px;
}

:deep(.q-dark) .loading-message {
  color: #ccc;
}

.loading-progress {
  max-width: 300px;
  margin: 0 auto;
}

/* Error Section */
.error-banner {
  background: linear-gradient(135deg, #ff6b6b, #ee5a52);
  color: white;
  border-radius: 12px;
  box-shadow: 0 4px 16px rgba(255, 107, 107, 0.3);
}

.error-content {
  flex: 1;
}

.error-title {
  font-size: 1rem;
  font-weight: 600;
  margin: 0 0 4px 0;
  letter-spacing: 0.5px;
}

.error-message {
  font-size: 0.9rem;
  opacity: 0.9;
  line-height: 1.4;
}

.error-close-btn {
  color: white;
  opacity: 0.8;
}

.error-close-btn:hover {
  opacity: 1;
}

/* Extracted Text Section */
.extracted-card {
  margin-bottom: 24px;
}

.section-header {
  display: flex;
  align-items: center;
  margin-bottom: 16px;
}

.section-icon {
  color: #667eea;
}

.text-content-card {
  margin-bottom: 20px;
}

.content-header {
  display: flex;
  align-items: center;
  margin-bottom: 12px;
}

.content-icon {
  color: #764ba2;
}

.content-title {
  font-weight: 600;
  font-size: 0.9rem;
  letter-spacing: 0.5px;
  text-transform: uppercase;
}

.extracted-text-container {
  max-height: 500px;
  overflow-y: auto;
  border: 1px solid rgba(102, 126, 234, 0.2);
  border-radius: 8px;
  padding: 16px;
  background: rgba(102, 126, 234, 0.02);
}

.extracted-text {
  font-family: 'JetBrains Mono', 'Fira Code', 'Courier New', monospace;
  font-size: 13px;
  line-height: 1.5;
  white-space: pre-wrap;
  word-wrap: break-word;
  margin: 0;
  color: #2c3e50;
}

:deep(.q-dark) .extracted-text {
  color: #ecf0f1;
}

:deep(.q-dark) .extracted-text-container {
  border-color: rgba(102, 126, 234, 0.3);
  background: rgba(102, 126, 234, 0.05);
}

.analyze-button-container {
  text-align: center;
}

.analyze-button {
  font-weight: 600;
  letter-spacing: 0.5px;
  text-transform: uppercase;
  font-size: 0.9rem;
  padding: 12px 32px;
  border-radius: 25px;
  transition: all 0.3s ease;
  box-shadow: 0 4px 16px rgba(102, 126, 234, 0.3);
}

.analyze-button:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(102, 126, 234, 0.4);
}

/* Results Section */
.results-card {
  margin-top: 24px;
}

.result-item-card {
  margin-bottom: 20px;
}

.result-header {
  display: flex;
  align-items: center;
  margin-bottom: 16px;
}

.result-icon {
  color: #667eea;
}

.result-title {
  font-size: 1rem;
  font-weight: 600;
  margin: 0;
  letter-spacing: 0.5px;
  text-transform: uppercase;
}

.result-content {
  line-height: 1.6;
  font-size: 0.95rem;
}

/* Risk Card */
.risk-card {
  border-left: 4px solid #ff6b6b;
}

.risk-header .result-icon {
  color: #ff6b6b;
}

.risk-header .result-title {
  color: #ff6b6b;
}

/* Clauses and Risks Lists */
.clauses-list,
.risks-list {
  padding: 0;
  background: transparent;
}

.clause-item,
.risk-item {
  border-radius: 8px;
  margin-bottom: 8px;
  background: rgba(102, 126, 234, 0.05);
  border: 1px solid rgba(102, 126, 234, 0.1);
  transition: all 0.3s ease;
}

.clause-item:hover,
.risk-item:hover {
  background: rgba(102, 126, 234, 0.08);
  transform: translateX(4px);
}

.clause-icon,
.risk-icon {
  background: rgba(102, 126, 234, 0.1);
  border-radius: 50%;
  padding: 8px;
}

.risk-icon {
  background: rgba(255, 107, 107, 0.1);
}

.clause-number,
.risk-number {
  font-weight: 600;
  font-size: 0.85rem;
  letter-spacing: 0.5px;
  text-transform: uppercase;
}

.clause-content,
.risk-content {
  line-height: 1.5;
  margin-top: 4px;
}

/* File Info */
.file-info-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.info-chip {
  font-weight: 500;
  letter-spacing: 0.3px;
}

/* Score */
.score-container {
  padding: 8px 0;
}

.score-number {
  font-size: 2.5rem;
  font-weight: 700;
  line-height: 1;
}

.score-max {
  font-size: 1.2rem;
  font-weight: 400;
  opacity: 0.6;
}

.score-bar {
  max-width: 400px;
}

/* Partes */
.partes-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.parte-item {
  display: flex;
  align-items: center;
  gap: 8px;
}

.parte-chip {
  flex-shrink: 0;
  text-transform: capitalize;
}

.parte-nombre {
  font-size: 0.95rem;
}

/* Fechas */
.fechas-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

/* Obligaciones */
.obligaciones-grupo {
  border-left: 3px solid rgba(102, 126, 234, 0.4);
  padding-left: 12px;
}

.obligaciones-parte {
  font-weight: 600;
  font-size: 0.9rem;
  text-transform: uppercase;
  letter-spacing: 0.4px;
  color: #667eea;
}

:deep(.q-dark) .obligaciones-parte {
  color: #90caf9;
}

.obligacion-item {
  padding: 2px 0;
  min-height: 0;
}

/* Riesgos detallados */
.riesgo-detalle {
  border-radius: 8px;
  margin-bottom: 10px;
  background: rgba(102, 126, 234, 0.04);
  border: 1px solid rgba(102, 126, 234, 0.1);
  padding: 12px;
}

.riesgo-header {
  display: flex;
  align-items: center;
}

.riesgo-clausula {
  font-weight: 600;
  font-size: 0.9rem;
}

.riesgo-nivel {
  font-size: 0.7rem;
  font-weight: 700;
  letter-spacing: 0.5px;
}

.riesgo-descripcion {
  font-size: 0.9rem;
  line-height: 1.5;
  color: #555;
}

:deep(.q-dark) .riesgo-descripcion {
  color: #ccc;
}

.riesgo-sugerencia {
  font-size: 0.85rem;
  color: #666;
  font-style: italic;
}

:deep(.q-dark) .riesgo-sugerencia {
  color: #bbb;
}

/* Mejoras */
.mejora-item {
  border-radius: 6px;
  margin-bottom: 4px;
}

.mejora-titulo {
  font-weight: 600;
  font-size: 0.9rem;
}

:deep(.q-dark) .formatted-content em {
  color: #ce93d8;
}

/* Animations */
@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}

/* Responsive Design */
@media (max-width: 768px) {
  .pdf-analyzer-container {
    padding: 0 8px;
  }

  .card-header-section {
    padding: 24px 16px;
  }

  .header-content {
    flex-direction: column;
    align-items: flex-start;
    gap: 16px;
  }

  .main-title {
    font-size: 1.5rem;
  }

  .header-actions {
    width: 100%;
    justify-content: center;
  }

  .uploader-header-content {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }

  .file-info-chips {
    justify-content: center;
  }

  .analyze-button {
    width: 100%;
    max-width: 300px;
  }
}

@media (max-width: 480px) {
  .main-title {
    font-size: 1.3rem;
  }

  .section-title {
    font-size: 1rem;
  }

  .result-title {
    font-size: 0.9rem;
  }

  .action-button {
    font-size: 0.7rem;
    padding: 6px 12px;
  }
}
</style>
