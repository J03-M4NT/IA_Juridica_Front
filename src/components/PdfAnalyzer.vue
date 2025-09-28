<template>
  <div class="pdf-analyzer">
    <q-card class="q-pa-md" :class="isDark ? 'bg-dark' : 'bg-white'">
      <q-card-section>
        <div class="text-h6 q-mb-md">
          <q-icon name="picture_as_pdf" class="q-mr-sm" />
          Analizador de Contratos PDF

          <!-- Botones para probar funcionalidades -->
          <div class="q-ml-md">
            <q-btn
              color="positive"
              icon="verified"
              label="Probar API Key"
              @click="probarAPIKey"
              :loading="loading"
              class="q-mr-sm"
              size="sm"
              flat
            />
            <q-btn
              color="info"
              icon="build"
              label="Probar PDF Worker"
              @click="probarWorkerPDF"
              :loading="loading"
              size="sm"
              flat
            />
          </div>
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

        <!-- Extracted Text Section -->
        <div v-if="extractedText" class="extracted-text-section">
          <q-separator class="q-mb-md" />

          <div class="text-h6 q-mb-md">
            <q-icon name="text_snippet" class="q-mr-sm" />
            Texto Extraído del PDF
          </div>

          <q-card
            class="q-mb-md"
            :class="isDark ? 'bg-grey-9' : 'bg-grey-1'"
            flat
            bordered
          >
            <q-card-section>
              <div class="text-subtitle2 text-weight-medium q-mb-sm">
                <q-icon name="description" class="q-mr-sm" />
                Contenido del Documento
              </div>
              <div class="extracted-text-container">
                <pre class="extracted-text">{{ extractedText }}</pre>
              </div>
            </q-card-section>
          </q-card>

          <!-- Analyze Contract Button -->
          <div class="text-center q-mb-md">
            <q-btn
              color="primary"
              icon="analytics"
              label="Analizar Contrato"
              @click="analyzeContract(extractedText)"
              :loading="loading"
              :disable="!extractedText.trim()"
              size="lg"
              unelevated
            />
          </div>
        </div>

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
            :class="isDark ? 'bg-grey-9' : 'bg-grey-1'"
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
            :class="isDark ? 'bg-grey-9' : 'bg-grey-1'"
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
            :class="isDark ? 'bg-orange-9' : 'bg-orange-1'"
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
            :class="isDark ? 'bg-grey-9' : 'bg-grey-1'"
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

// Create reactive dark mode variable
const isDark = ref($q?.dark?.isActive || false);

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
      model: "gemini-1.5-flash",
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

/* Estilos para el texto extraído */
.extracted-text-container {
  max-height: 400px;
  overflow-y: auto;
  border: 1px solid #ddd;
  border-radius: 4px;
  padding: 8px;
  background-color: #f9f9f9;
}

:deep(.q-dark) .extracted-text-container {
  border-color: #555;
  background-color: #2a2a2a;
}

.extracted-text {
  font-family: 'Courier New', monospace;
  font-size: 12px;
  line-height: 1.4;
  white-space: pre-wrap;
  word-wrap: break-word;
  margin: 0;
  color: #333;
}

:deep(.q-dark) .extracted-text {
  color: #e0e0e0;
}
</style>
