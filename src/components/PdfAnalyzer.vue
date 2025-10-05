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

            <!-- Action Buttons -->
            <div class="header-actions">
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
                ref="uploaderRef"
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
                  @click="analyzeContract(extractedText)"
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

              <!-- Summary -->
              <div class="result-item-card modern-card">
                <q-card-section>
                  <div class="result-header">
                    <q-icon name="summarize" class="result-icon q-mr-sm" />
                    <h4 class="result-title">RESUMEN DEL CONTRATO</h4>
                  </div>
                  <div class="formatted-content result-content" v-html="formatText(analysisResult.summary)"></div>
                </q-card-section>
              </div>

              <!-- Main Clauses -->
              <div class="result-item-card modern-card">
                <q-card-section>
                  <div class="result-header">
                    <q-icon name="list" class="result-icon q-mr-sm" />
                    <h4 class="result-title">CLÁUSULAS PRINCIPALES</h4>
                  </div>
                  <q-list class="clauses-list">
                    <q-item
                      v-for="(clause, index) in analysisResult.mainClauses"
                      :key="index"
                      class="clause-item"
                    >
                      <q-item-section avatar>
                        <q-icon name="article" color="primary" class="clause-icon" />
                      </q-item-section>
                      <q-item-section>
                        <q-item-label class="clause-number">
                          CLÁUSULA {{ index + 1 }}
                        </q-item-label>
                        <q-item-label caption class="formatted-content clause-content">
                          {{ clause }}
                        </q-item-label>
                      </q-item-section>
                    </q-item>
                  </q-list>
                </q-card-section>
              </div>

              <!-- Risks and Ambiguities -->
              <div v-if="analysisResult.risks.length > 0" class="result-item-card risk-card modern-card">
                <q-card-section>
                  <div class="result-header risk-header">
                    <q-icon name="warning" class="result-icon q-mr-sm" />
                    <h4 class="result-title">RIESGOS Y AMBIGÜEDADES DETECTADAS</h4>
                  </div>
                  <q-list class="risks-list">
                    <q-item
                      v-for="(risk, index) in analysisResult.risks"
                      :key="index"
                      class="risk-item"
                    >
                      <q-item-section avatar>
                        <q-icon name="error_outline" color="negative" class="risk-icon" />
                      </q-item-section>
                      <q-item-section>
                        <q-item-label class="risk-number">
                          RIESGO {{ index + 1 }}
                        </q-item-label>
                        <q-item-label caption class="risk-content">
                          {{ risk }}
                        </q-item-label>
                      </q-item-section>
                    </q-item>
                  </q-list>
                </q-card-section>
              </div>

              <!-- File Info -->
              <div class="result-item-card modern-card">
                <q-card-section>
                  <div class="result-header">
                    <q-icon name="info" class="result-icon q-mr-sm" />
                    <h4 class="result-title">INFORMACIÓN DEL ARCHIVO</h4>
                  </div>
                  <div class="file-info-chips">
                    <q-chip
                      icon="picture_as_pdf"
                      color="primary"
                      text-color="white"
                      class="info-chip"
                      size="sm"
                    >
                      {{ fileName }}
                    </q-chip>
                    <q-chip
                      icon="data_usage"
                      color="secondary"
                      text-color="white"
                      class="info-chip"
                      size="sm"
                    >
                      {{ (fileSize / 1024).toFixed(1) }} KB
                    </q-chip>
                    <q-chip
                      icon="text_snippet"
                      color="positive"
                      text-color="white"
                      class="info-chip"
                      size="sm"
                    >
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
import { ref } from 'vue';
import { useQuasar } from 'quasar';
import { GoogleGenerativeAI } from '@google/generative-ai';
import * as pdfjsLib from "pdfjs-dist";
import pdfjsWorker from "pdfjs-dist/build/pdf.worker.min.js?url";

// ✅ Configurar el worker de PDF.js con import ?url (método más estable en Vite)
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;
console.log('✅ Worker de PDF.js configurado con import ?url:', pdfjsWorker);

// Ensure $q is properly initialized
const $q = useQuasar();
if (!$q) {
  console.error('Quasar $q is not available');
}

// Fallback notification function
interface NotificationOptions {
  message: string;
  color?: 'positive' | 'negative' | 'warning' | 'info';
  position?: 'top' | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'bottom' | 'left' | 'right' | 'center';
  icon?: string;
}

const showNotification = (options: NotificationOptions) => {
  if ($q && $q.notify) {
    $q.notify(options);
  } else {
    // Fallback to console.log and alert
    console.log('Notification:', options);
    if (options.color === 'negative') {
      alert('❌ Error: ' + options.message);
    } else if (options.color === 'positive') {
      alert('✅ ' + options.message);
    } else {
      alert(options.message);
    }
  }
};


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

// Reactive data with proper typing
const uploaderRef = ref<HTMLElement | null>(null);
const loading = ref<boolean>(false);
const loadingMessage = ref<string>('');
const error = ref<string>('');
const fileName = ref<string>('');
const fileSize = ref<number>(0);
const extractedText = ref<string>('');
const analysisResult = ref<{
  summary: string;
  mainClauses: string[];
  risks: string[];
} | null>(null);

// Initialize Gemini AI with proper error handling
const apiKey = import.meta.env.VITE_GEMINI_API_KEY || 'AIzaSyD29u6VTcZz93zuALe5k1Ri7u4l__5eUHI';
console.log('PdfAnalyzer - API Key presente:', !!apiKey);
console.log('PdfAnalyzer - API Key (primeros 10 caracteres):', apiKey.substring(0, 10) + '...');

if (!apiKey) {
  throw new Error('API Key no definida. Configura VITE_GEMINI_API_KEY en tus variables de entorno.');
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
    loadingMessage.value = 'Analizando el PDF...';

    // Diagnosticar el PDF primero
    const diagnostico = await diagnosticarPDF(file);
    console.log('📋 Resultado del diagnóstico:', diagnostico);

    if (!diagnostico.isValidPDF) {
      throw new Error(`El archivo no es un PDF válido: ${diagnostico.error}`);
    }

    // Verificar si el PDF tiene texto extraíble
    if (!diagnostico.hasText) {
      throw new Error(`❌ El PDF no contiene texto extraíble

🔍 **Posibles causas:**
• El PDF está escaneado o es una imagen
• El PDF está compuesto solo de imágenes
• El PDF tiene texto como imagen (OCR)

📋 **Solución:**
Para analizar contratos, necesitas un PDF con texto real (no escaneado) que se pueda seleccionar y copiar.

💡 **Alternativas:**
• Convierte el PDF escaneado usando OCR (Optical Character Recognition)
• Solicita una versión digital del contrato en formato PDF con texto
• Usa herramientas como Adobe Acrobat para reconocer texto en PDFs escaneados`);
    }

    // Verificar si hay problemas con el worker de PDF.js
    if (diagnostico.workerError) {
      throw new Error(`❌ Error con el procesador de PDF

🔧 **Problema detectado:**
• No se pudo cargar el worker de PDF.js
• Error específico: ${diagnostico.error}

🔍 **Posibles causas:**
• Error en la configuración del worker
• Problemas con el bundler de Vite
• Configuración del navegador o servidor de desarrollo

📋 **Soluciones:**
• Verifica que el worker se esté importando correctamente
• Asegúrate de que Vite esté configurado para manejar imports ?url
• Intenta recargar la página
• Si persiste, contacta al administrador del sistema

💡 **Nota:** Se está usando import ?url para el worker (método más estable en Vite)`);
    }

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
    showNotification({
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
    console.log('🔍 Iniciando extracción de texto del PDF:', file.name);
    console.log('📊 Tamaño del archivo:', file.size, 'bytes');

    const arrayBuffer = await file.arrayBuffer();
    console.log('📋 ArrayBuffer creado, tamaño:', arrayBuffer.byteLength);

    // Verificar si el archivo está corrupto o vacío
    if (arrayBuffer.byteLength === 0) {
      throw new Error('El archivo PDF está vacío o corrupto');
    }

    console.log('📖 Cargando documento PDF...');
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    console.log('✅ PDF cargado exitosamente, número de páginas:', pdf.numPages);

    // Verificar si el PDF tiene páginas
    if (pdf.numPages === 0) {
      throw new Error('El PDF no contiene páginas');
    }

    let fullText = '';
    let totalItems = 0;

    for (let i = 1; i <= pdf.numPages; i++) {
      console.log(`📄 Procesando página ${i}/${pdf.numPages}`);
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();

      console.log(`📝 Página ${i}: ${textContent.items.length} elementos de texto encontrados`);

      const pageText = textContent.items
        .map((item, index) => {
          // Handle both TextItem and TextMarkedContent types
          if ('str' in item) {
            const text = item.str || '';
            if (text.trim()) {
              console.log(`  Item ${index}: "${text.substring(0, 50)}${text.length > 50 ? '...' : ''}"`);
            }
            return text;
          }
          return '';
        })
        .join(' ');

      fullText += pageText + '\n';
      totalItems += textContent.items.length;
    }

    console.log('📊 Total de elementos de texto procesados:', totalItems);
    console.log('📝 Longitud del texto extraído:', fullText.length);

    // Verificar si se extrajo texto
    if (fullText.trim().length === 0) {
      throw new Error('No se pudo extraer texto del PDF. El documento podría estar escaneado, ser una imagen, o estar protegido.');
    }

    console.log('✅ Texto extraído exitosamente');
    return fullText;
  } catch (error) {
    console.error('❌ Error al extraer texto del PDF:', error);

    // Proporcionar mensajes de error más específicos
    if (error instanceof Error) {
      if (error.message.includes('Invalid PDF')) {
        throw new Error('El archivo no es un PDF válido o está corrupto');
      } else if (error.message.includes('Password')) {
        throw new Error('El PDF está protegido con contraseña');
      } else if (error.message.includes('encrypted')) {
        throw new Error('El PDF está encriptado y no se puede procesar');
      } else {
        throw new Error(`Error al extraer texto del PDF: ${error.message}`);
      }
    } else {
      throw new Error('Error desconocido al procesar el PDF');
    }
  }
};

const analyzeContract = async (text: string) => {
  try {
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash-lite",
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
      throw new Error('⚠️ Límite de cuota excedido: Has alcanzado el límite de uso de la API.\n\n🔧 Soluciones:\n1. Espera unos minutos antes de intentar nuevamente\n2. Verifica tu plan de facturación en Google Cloud Console\n3. Considera actualizar tu plan si necesitas más uso');
    } else if (apiError?.status === 400 || apiError?.message?.includes('API Key not found') || apiError?.message?.includes('API_KEY_INVALID')) {
      throw new Error(`❌ Error de API Key: La clave API no es válida para Google Generative AI.

🔧 Soluciones:
1. Verifica que tienes habilitada la API de Generative Language en Google Cloud Console
2. Asegúrate de que la API key tenga permisos para usar Gemini
3. Si usas una API key de Google Maps, necesitas una específica para AI

📋 Tu API key actual: ${apiKey.substring(0, 10)}...

💡 Para obtener una API key válida:
- Ve a https://makersuite.google.com/app/apikey
- Crea una nueva API key
- Asegúrate de que tenga habilitada la facturación (necesario para usar Gemini)`);
    } else if (apiError?.status === 403) {
      throw new Error('🚫 Acceso denegado: La API key no tiene permisos suficientes o está restringida.');
    } else if (apiError?.status === 500) {
      throw new Error('🔧 Error interno del servidor de Google. Por favor, intenta nuevamente en unos momentos.');
    } else {
      throw new Error('❌ Error al analizar el contrato con la IA. Por favor, verifica tu conexión a internet e intenta nuevamente.');
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

// Función para diagnosticar el PDF
const diagnosticarPDF = async (file: File) => {
  console.log('🔍 Diagnóstico del PDF:', file.name);
  console.log('📊 Tamaño:', file.size, 'bytes');
  console.log('📋 Tipo MIME:', file.type);

  try {
    const arrayBuffer = await file.arrayBuffer();

    // Verificar si es un PDF válido
    const uint8Array = new Uint8Array(arrayBuffer);
    const header = uint8Array.slice(0, 8);

    // PDF header should be %PDF-
    const headerString = String.fromCharCode(...header);
    console.log('📄 Header del archivo:', headerString);

    if (!headerString.includes('%PDF-')) {
      throw new Error('El archivo no tiene el formato PDF válido');
    }

    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    console.log('📖 Número de páginas:', pdf.numPages);

    // Verificar si tiene texto
    let hasText = false;
    let totalItems = 0;

    for (let i = 1; i <= Math.min(pdf.numPages, 3); i++) { // Solo verificar primeras 3 páginas
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      totalItems += textContent.items.length;

      if (textContent.items.length > 0) {
        hasText = true;
        break;
      }
    }

    console.log('📝 Tiene texto extraíble:', hasText);
    console.log('📊 Total de elementos de texto en primeras páginas:', totalItems);

    return {
      isValidPDF: true,
      hasText: hasText,
      pageCount: pdf.numPages,
      header: headerString,
      textItems: totalItems,
      workerError: false
    };

  } catch (error) {
    console.error('❌ Error en diagnóstico:', error);

    // Detectar si es un error relacionado con el worker de PDF.js
    const isWorkerError = error instanceof Error && (
      error.message.includes('worker') ||
      error.message.includes('Worker') ||
      error.message.includes('Loading worker') ||
      error.message.includes('Failed to load') ||
      error.message.includes('Setting up fake worker failed') ||
      error.message.includes('Failed to fetch dynamically imported module') ||
      error.message.includes('dynamically imported') ||
      error.message.includes('pdf.worker') ||
      error.message.includes('module not found') ||
      error.message.includes('import') ||
      error.message.includes('url')
    );

    return {
      isValidPDF: false,
      hasText: false,
      error: error instanceof Error ? error.message : 'Error desconocido',
      workerError: isWorkerError
    };
  }
};

const probarAPIKey = async () => {
  try {
    loading.value = true;
    loadingMessage.value = 'Probando API key...';
    error.value = '';

    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash-lite",
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
      const respuesta = result.response.text();
      console.log('✅ API Key funciona correctamente en PdfAnalyzer. Respuesta:', respuesta);

      showNotification({
        message: '✅ API Key válida - Puedes analizar PDFs',
        color: 'positive',
        position: 'top',
        icon: 'check_circle'
      });
    } else {
      throw new Error('No se recibió respuesta de la API');
    }

  } catch (err) {
    console.error('❌ Error al probar API key en PdfAnalyzer:', err);
    const errorMessage = err instanceof Error ? err.message : 'Error desconocido';

    showNotification({
      message: `❌ Error de API Key: ${errorMessage}`,
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

    console.log('🔍 Probando configuración del worker de PDF.js...');
    console.log('📋 Worker actual:', pdfjsLib.GlobalWorkerOptions.workerSrc);
    console.log('📋 Método de importación: import ?url');

    // Verificar que el worker esté configurado correctamente
    if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
      throw new Error('Worker de PDF.js no está configurado');
    }

    // Crear un PDF de prueba simple
    const testPdfData = await fetch('data:application/pdf;base64,JVBERi0xLjMKJeLjz9MKCjEgMCBvYmoKPDwKL1R5cGUgL0NhdGFsb2cKL091dGxpbmVzIDIgMCBSCi9QYWdlcyAzIDAgUgo+PgplbmRvYmoKCjIgMCBvYmoKPDwKL1R5cGUgL091dGxpbmVzCi9Db3VudCAwCj4+CmVuZG9iagoKMyAwIG9iago8PAovVHlwZSAvUGFnZXMKL0NvdW50IDEKL0tpZHMgWzQgMCBSXQo+PgplbmRvYmoKCjQgMCBvYmoKPDwKL1R5cGUgL1BhZ2UKL1BhcmVudCAzIDAgUgovTWVkaWFCb3ggWzAgMCA2MTIgNzkyXQovQ29udGVudHMgNSAwIFIKL1Jlc291cmNlcyA8PAovUHJvY1NldCBbL1BERiAvVGV4dF0KL0ZvbnQgPDwKL0YxIDYgMCBSCj4+Cj4+Cj4+CmVuZG9iagoKNSAwIG9iago8PAovTGVuZ3RoIDQ0Cj4+CnN0cmVhbQpCVAovRjEgMTIgVGYKMCAwIFRkCihUZXN0IFBERikgVGoKRVQKZW5kc3RyZWFtCmVuZG9iagoKNiAwIG9iago8PAovVHlwZSAvRm9udAovU3VidHlwZSAvVHlwZTEKL0Jhc2VGb250IC9IZWx2ZXRpY2EKL0VuY29kaW5nIC9XaW5BbnNpRW5jb2RpbmcKPj4KZW5kb2JqCgp4cmVmCjAgNwowMDAwMDAwMDAwIDY1NTM1IGYgCjAwMDAwMDAwMTAgMDAwMDAgbiAKMDAwMDAwMDA3NCAwMDAwMCBuIAowMDAwMDAwMTQ3IDAwMDAwIG4gCjAwMDAwMDAyMTAgMDAwMDAgbiAKMDAwMDAwMDI4MCAwMDAwMCBuIAowMDAwMDAwMzQ5IDAwMDAwIG4gCnRyYWlsZXIKPDwKL1NpemUgNwowL1Jvb3QgMSAwIFIKPj4Kc3RhcnR4cmVmCjM4OQolJUVPRgo=');
    const testPdfBlob = await testPdfData.blob();
    const testFile = new File([testPdfBlob], 'test.pdf', { type: 'application/pdf' });

    // Intentar cargar el PDF de prueba
    const arrayBuffer = await testFile.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

    console.log('✅ Worker de PDF.js funciona correctamente con import ?url');
    console.log('📖 PDF de prueba cargado:', pdf.numPages, 'páginas');

    showNotification({
      message: '✅ Worker de PDF.js funciona correctamente',
      color: 'positive',
      position: 'top',
      icon: 'check_circle'
    });

  } catch (err) {
    console.error('❌ Error al probar worker de PDF.js:', err);
    const errorMessage = err instanceof Error ? err.message : 'Error desconocido';

    showNotification({
      message: `❌ Error con worker de PDF.js: ${errorMessage}`,
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
  max-height: 400px;
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

/* Formatted Content */
.formatted-content {
  line-height: 1.6;
  font-size: 0.95rem;
}

.formatted-content :deep(strong) {
  font-weight: 700;
  color: #667eea;
}

.formatted-content :deep(em) {
  font-style: italic;
  color: #764ba2;
}

.formatted-content :deep(br) {
  margin-bottom: 0.5em;
}

:deep(.q-dark) .formatted-content {
  color: #e0e0e0;
}

:deep(.q-dark) .formatted-content strong {
  color: #90caf9;
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
