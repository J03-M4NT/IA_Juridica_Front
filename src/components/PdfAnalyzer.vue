<template>
  <div class="pdf-analyzer">

    <!-- Herramientas de diagnostico: solo para administradores -->
    <div v-if="isAdmin" class="admin-tools">
      <button class="admin-btn" @click="probarAPIKey" :disabled="loading">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
        </svg>
        Probar API Key
      </button>
      <button class="admin-btn" @click="probarWorkerPDF" :disabled="loading">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="3"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M4.93 4.93a10 10 0 0 0 0 14.14"/>
        </svg>
        Probar PDF Worker
      </button>
    </div>

    <!-- Zona de carga -->
    <div class="lx-card upload-card">
      <!-- Input nativo oculto para el selector de archivos -->
      <input
        ref="fileInputRef"
        type="file"
        accept=".pdf"
        style="display:none"
        @change="onNativeFileChange"
      />

      <div
        class="upload-drop-area"
        :class="{ 'upload-drop-area--drag': isDragging }"
        @dragover.prevent="isDragging = true"
        @dragleave.prevent="isDragging = false"
        @drop.prevent="onDrop"
        @click.self="!loading && fileInputRef?.click()"
      >
        <div class="upload-icon-wrap">
          <svg width="38" height="38" viewBox="0 0 24 24" fill="none" stroke="#1fa8bb" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="17 8 12 3 7 8"/>
            <line x1="12" y1="3" x2="12" y2="15"/>
          </svg>
        </div>
        <div class="upload-text-wrap">
          <div class="upload-title">{{ isDragging ? 'Suelta aquí el PDF' : 'Selecciona o arrastra un PDF' }}</div>
          <div class="upload-subtitle">Archivos PDF · máximo 20 MB</div>
        </div>
        <button
          type="button"
          class="upload-pick-btn"
          :disabled="loading"
          @click.stop="fileInputRef?.click()"
        >
          Elegir archivo
        </button>
      </div>

      <!-- Fila con info del archivo seleccionado -->
      <div v-if="fileName" class="file-info-row">
        <div class="file-icon-wrap">
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#e05252" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
            <polyline points="14 2 14 8 20 8"/>
          </svg>
        </div>
        <span class="file-name text-grey-9">{{ fileName }}</span>
        <span class="file-status" v-if="analysisResult">Analizado</span>
        <span class="file-meta text-grey-6">{{ (fileSize / 1024).toFixed(1) }} KB</span>
        <button class="file-clear-btn" @click="clearFile" title="Quitar archivo">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>
    </div>

    <!-- Estado de carga -->
    <div v-if="loading" class="lx-card loading-state">
      <q-spinner color="teal" size="30px" />
      <span class="loading-msg text-grey-7">{{ loadingMessage || 'Procesando...' }}</span>
      <q-linear-progress indeterminate color="teal" class="loading-bar" />
    </div>

    <!-- Banner de error -->
    <div v-if="error" class="error-banner">
      <div class="error-banner-head">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
        </svg>
        <span>Error</span>
        <button class="error-close" @click="error = ''">×</button>
      </div>
      <pre class="error-body">{{ error }}</pre>
    </div>

    <!-- Texto extraido + boton de re-analisis -->
    <div v-if="extractedText && !analysisResult" class="lx-card extracted-card">
      <div class="lx-section-label">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#1fa8bb" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
          <path d="M14 2v6h6"/><path d="M8 13h8"/><path d="M8 17h5"/>
        </svg>
        Texto extraído del PDF
      </div>
      <div class="extracted-text-box">
        <pre class="extracted-pre text-grey-9">{{ extractedText }}</pre>
      </div>
      <div class="analyze-btn-wrap">
        <button
          class="analyze-btn"
          @click="runAnalysis(extractedText)"
          :disabled="loading || !extractedText.trim()"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          Analizar contrato con IA
        </button>
      </div>
    </div>

    <!-- Resultados del analisis -->
    <div v-if="analysisResult" class="results-section">
      <h2 class="results-heading">Resultados del análisis</h2>

      <!-- Puntuacion + Resumen en grid -->
      <div class="score-resumen-grid">

        <div class="lx-card score-card">
          <div class="score-label-top text-grey-6">Puntuación</div>
          <div
            class="score-big"
            :style="{
              color: scoreColor === 'positive' ? '#16a34a'
                   : scoreColor === 'warning'  ? '#d97706'
                   : scoreColor === 'negative' ? '#dc2626'
                   : '#9ca3af'
            }"
          >
            {{ analysisResult.puntuacion }}<span class="score-denom">/100</span>
          </div>
          <q-linear-progress
            :value="analysisResult.puntuacion / 100"
            :color="scoreColor"
            size="7px"
            rounded
            class="score-bar"
          />
        </div>

        <div class="lx-card resumen-card">
          <div class="result-card-label">Resumen</div>
          <p class="resumen-text text-grey-9">{{ analysisResult.resumen }}</p>
        </div>

      </div>

      <!-- Partes -->
      <div v-if="Object.keys(analysisResult.partes).length > 0" class="lx-card result-card">
        <div class="result-card-label">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#7c47e0" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
            <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
          </svg>
          Partes del contrato
        </div>
        <div class="partes-list">
          <div v-for="(nombre, rol) in analysisResult.partes" :key="rol" class="parte-row">
            <span class="parte-chip">{{ rol }}</span>
            <span class="parte-nombre text-grey-9">{{ nombre }}</span>
          </div>
        </div>
      </div>

      <!-- Fechas importantes -->
      <div v-if="analysisResult.fechas_importantes.length > 0" class="lx-card result-card">
        <div class="result-card-label">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#1fa8bb" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
            <line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/>
            <line x1="3" y1="10" x2="21" y2="10"/>
          </svg>
          Fechas importantes
        </div>
        <div class="fechas-chips">
          <span v-for="fecha in analysisResult.fechas_importantes" :key="fecha" class="fecha-chip">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="3" y1="10" x2="21" y2="10"/>
            </svg>
            {{ fecha }}
          </span>
        </div>
      </div>

      <!-- Obligaciones -->
      <div v-if="Object.keys(analysisResult.obligaciones).length > 0" class="lx-card result-card">
        <div class="result-card-label">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#3f6fc9" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
            <path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
          </svg>
          Obligaciones por parte
        </div>
        <div v-for="(lista, parte) in analysisResult.obligaciones" :key="parte" class="obligaciones-grupo">
          <div class="obligaciones-parte">{{ parte }}</div>
          <ul class="obligaciones-list">
            <li v-for="(ob, i) in lista" :key="i" class="obligacion-item text-grey-9">{{ ob }}</li>
          </ul>
        </div>
      </div>

      <!-- Riesgos detectados -->
      <div v-if="analysisResult.riesgos.length > 0" class="lx-card result-card risk-card">
        <div class="result-card-label risk-label">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#e05252" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
            <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
          </svg>
          Riesgos detectados
        </div>
        <div class="riesgos-list">
          <div v-for="(riesgo, index) in analysisResult.riesgos" :key="index" class="riesgo-item">
            <div class="riesgo-row">
              <span class="riesgo-clausula text-grey-9">{{ riesgo.clausula }}</span>
              <q-badge :color="nivelColor(riesgo.nivel)" class="nivel-badge">{{ riesgo.nivel }}</q-badge>
            </div>
            <p class="riesgo-desc text-grey-7">{{ riesgo.descripcion }}</p>
            <div class="riesgo-sug">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#b45309" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <line x1="9" y1="18" x2="15" y2="18"/><line x1="10" y1="22" x2="14" y2="22"/>
                <path d="M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0 0 18 8 6 6 0 0 0 6 8c0 1 .23 2.23 1.5 3.5A4.61 4.61 0 0 1 8.91 14"/>
              </svg>
              <span class="text-grey-7">{{ riesgo.sugerencia }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Boton corregir automaticamente -->
      <div v-if="analysisResult.riesgos.length > 0" class="corregir-wrap">
        <button class="corregir-btn" @click="runCorrection" :disabled="corrigiendo">
          <svg v-if="!corrigiendo" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
          </svg>
          <q-spinner v-else size="15px" color="white" />
          Corregir automáticamente
        </button>
      </div>

      <!-- Contrato corregido -->
      <div v-if="contratoCorregido" class="lx-card result-card corregido-card">
        <div class="result-card-label corregido-label">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#16a34a" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
          </svg>
          Contrato corregido por IA
          <div class="corregido-actions">
            <button class="icon-action-btn" @click="copiarCorregido" title="Copiar al portapapeles">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
              </svg>
            </button>
            <button class="icon-action-btn" @click="descargarCorregido" title="Descargar como .txt">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
              </svg>
            </button>
          </div>
        </div>
        <div class="corregido-text-box">
          <pre class="corregido-pre text-grey-9">{{ contratoCorregido }}</pre>
        </div>
      </div>

      <!-- Mejoras sugeridas -->
      <div v-if="analysisResult.mejoras.length > 0" class="lx-card result-card">
        <div class="result-card-label">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#1fa8bb" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
            <line x1="9" y1="18" x2="15" y2="18"/><line x1="10" y1="22" x2="14" y2="22"/>
            <path d="M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0 0 18 8 6 6 0 0 0 6 8c0 1 .23 2.23 1.5 3.5A4.61 4.61 0 0 1 8.91 14"/>
          </svg>
          Mejoras sugeridas
        </div>
        <div class="mejoras-list">
          <div v-for="(mejora, i) in analysisResult.mejoras" :key="i" class="mejora-item">
            <div class="mejora-icon-wrap">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#1fa8bb" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">
                <line x1="9" y1="18" x2="15" y2="18"/><line x1="10" y1="22" x2="14" y2="22"/>
                <path d="M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0 0 18 8 6 6 0 0 0 6 8c0 1 .23 2.23 1.5 3.5A4.61 4.61 0 0 1 8.91 14"/>
              </svg>
            </div>
            <div>
              <div class="mejora-titulo text-grey-9">{{ mejora.titulo }}</div>
              <div class="mejora-desc text-grey-7">{{ mejora.descripcion }}</div>
            </div>
          </div>
        </div>
      </div>

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
import { analizarContrato, corregirContrato } from '../services/geminiService';
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
const contratoCorregido = ref<string>('');
const corrigiendo = ref<boolean>(false);
const fileInputRef = ref<HTMLInputElement | null>(null);
const isDragging = ref<boolean>(false);

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

const copiarCorregido = async () => {
  if (!contratoCorregido.value) return;
  await navigator.clipboard.writeText(contratoCorregido.value);
  showNotification({ message: 'Copiado al portapapeles', color: 'positive', position: 'top', icon: 'check_circle' });
};

const descargarCorregido = () => {
  if (!contratoCorregido.value) return;
  const blob = new Blob([contratoCorregido.value], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${fileName.value.replace('.pdf', '')}_corregido.txt`;
  a.click();
  URL.revokeObjectURL(url);
};

const runCorrection = async () => {
  if (!analysisResult.value || !extractedText.value) return;
  corrigiendo.value = true;
  contratoCorregido.value = '';
  try {
    const riesgos = analysisResult.value.riesgos.map(r => `${r.clausula}: ${r.descripcion}`);
    contratoCorregido.value = await corregirContrato(extractedText.value, riesgos);
  } catch (err) {
    showError(classifyGeminiError(err));
  } finally {
    corrigiendo.value = false;
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
  contratoCorregido.value = '';
  error.value = '';
  extractedText.value = '';
};

const onNativeFileChange = (e: Event) => {
  const input = e.target as HTMLInputElement;
  if (input.files?.length) {
    void onFileAdded(Array.from(input.files));
  }
};

const onDrop = (e: DragEvent) => {
  isDragging.value = false;
  const files = e.dataTransfer?.files;
  if (files?.length) {
    void onFileAdded(Array.from(files));
  }
};

const clearFile = () => {
  resetAnalysis();
  fileName.value = '';
  fileSize.value = 0;
  if (fileInputRef.value) fileInputRef.value.value = '';
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
/* ==============================
   Contenedor raiz
   ============================== */
.pdf-analyzer {
  width: 100%;
  max-width: 860px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 18px;
}

/* ==============================
   Tarjeta base
   ============================== */
.lx-card {
  background: #fff;
  border: 1px solid rgba(27, 27, 30, 0.08);
  border-radius: 18px;
  box-shadow: 0 1px 3px rgba(27, 27, 30, 0.04);
}

/* ==============================
   Herramientas de admin
   ============================== */
.admin-tools {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.admin-btn {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  font-size: 0.82rem;
  font-weight: 600;
  color: #55555c;
  background: #fff;
  border: 1px solid rgba(27, 27, 30, 0.12);
  padding: 8px 14px;
  border-radius: 10px;
  cursor: pointer;
  font-family: 'Figtree', sans-serif;
  transition: background 0.18s;
}

.admin-btn:hover:not(:disabled) { background: #FAFAF7; }
.admin-btn:disabled { opacity: 0.5; cursor: not-allowed; }

/* ==============================
   Zona de carga
   ============================== */
.upload-card {
  overflow: hidden;
  padding: 0;
}

.upload-drop-area {
  display: flex;
  align-items: center;
  gap: 18px;
  padding: 28px 26px;
  border: 2px dashed rgba(31, 168, 187, 0.35);
  border-radius: 16px;
  background: rgba(57, 199, 216, 0.04);
  margin: 18px;
  cursor: pointer;
  transition: background 0.2s, border-color 0.2s;
}

.upload-drop-area:hover {
  background: rgba(57, 199, 216, 0.08);
  border-color: rgba(31, 168, 187, 0.55);
}

.upload-drop-area--drag {
  background: rgba(57, 199, 216, 0.13);
  border-color: #1fa8bb;
  border-style: solid;
}

.upload-icon-wrap {
  width: 56px;
  height: 56px;
  border-radius: 14px;
  background: rgba(57, 199, 216, 0.12);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.upload-text-wrap {
  flex: 1;
  min-width: 0;
}

.upload-title {
  font-family: 'Figtree', sans-serif;
  font-size: 0.98rem;
  font-weight: 600;
  color: #1b1b1e;
  margin-bottom: 3px;
}

.upload-subtitle {
  font-size: 0.85rem;
  color: #9a9aa2;
}

.upload-pick-btn {
  flex-shrink: 0;
  padding: 9px 18px;
  background: #1fa8bb;
  color: #fff;
  border: none;
  border-radius: 10px;
  font-family: 'Figtree', sans-serif;
  font-size: 0.88rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.18s, transform 0.15s;
}

.upload-pick-btn:hover:not(:disabled) {
  background: #178fa0;
  transform: translateY(-1px);
}

.upload-pick-btn:disabled { opacity: 0.5; cursor: not-allowed; }

/* Fila de info del archivo */
.file-info-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 13px 22px;
  border-top: 1px solid rgba(27, 27, 30, 0.07);
  background: #FAFAF7;
}

.file-icon-wrap {
  width: 30px;
  height: 30px;
  border-radius: 8px;
  background: rgba(224, 82, 82, 0.10);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.file-name {
  flex: 1;
  font-size: 0.9rem;
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.file-status {
  font-size: 0.78rem;
  font-weight: 600;
  color: #16a34a;
  background: rgba(22, 163, 74, 0.10);
  padding: 3px 10px;
  border-radius: 999px;
  flex-shrink: 0;
}

.file-meta {
  font-size: 0.82rem;
  flex-shrink: 0;
}

.file-clear-btn {
  width: 26px;
  height: 26px;
  border-radius: 50%;
  border: 1px solid rgba(27, 27, 30, 0.12);
  background: #FAFAF7;
  color: #9a9aa2;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  flex-shrink: 0;
  transition: background 0.15s, color 0.15s, border-color 0.15s;
  padding: 0;
}

.file-clear-btn:hover {
  background: rgba(224, 82, 82, 0.10);
  color: #e05252;
  border-color: rgba(224, 82, 82, 0.25);
}

/* ==============================
   Estado de carga
   ============================== */
.loading-state {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 20px 24px;
}

.loading-msg {
  flex: 1;
  font-size: 0.92rem;
}

.loading-bar {
  width: 100px;
  flex-shrink: 0;
}

/* ==============================
   Error
   ============================== */
.error-banner {
  background: #fff5f5;
  border: 1px solid rgba(224, 82, 82, 0.25);
  border-radius: 14px;
  overflow: hidden;
}

.error-banner-head {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 11px 16px;
  background: rgba(224, 82, 82, 0.08);
  color: #c0392b;
  font-weight: 600;
  font-size: 0.9rem;
}

.error-close {
  margin-left: auto;
  background: none;
  border: none;
  font-size: 1.2rem;
  color: #c0392b;
  cursor: pointer;
  line-height: 1;
  padding: 0 2px;
}

.error-body {
  font-size: 0.85rem;
  color: #7a3535;
  padding: 14px 16px;
  margin: 0;
  white-space: pre-wrap;
  word-wrap: break-word;
  line-height: 1.55;
  font-family: 'Figtree', sans-serif;
}

/* ==============================
   Texto extraido
   ============================== */
.extracted-card {
  padding: 22px;
}

.lx-section-label {
  display: flex;
  align-items: center;
  gap: 8px;
  font-family: 'EB Garamond', serif;
  font-size: 1.1rem;
  font-weight: 600;
  color: #16161a;
  margin-bottom: 14px;
}

.extracted-text-box {
  max-height: 340px;
  overflow-y: auto;
  border: 1px solid rgba(27, 27, 30, 0.08);
  border-radius: 10px;
  padding: 14px;
  background: #FAFAF7;
  scrollbar-width: thin;
  scrollbar-color: rgba(27,27,30,0.14) transparent;
}

.extracted-pre {
  font-family: 'JetBrains Mono', 'Fira Code', 'Courier New', monospace;
  font-size: 12.5px;
  line-height: 1.55;
  white-space: pre-wrap;
  word-wrap: break-word;
  margin: 0;
}

.analyze-btn-wrap {
  margin-top: 16px;
  text-align: center;
}

.analyze-btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 11px 26px;
  background: #1fa8bb;
  color: #fff;
  border: none;
  border-radius: 11px;
  font-family: 'Figtree', sans-serif;
  font-size: 0.92rem;
  font-weight: 600;
  cursor: pointer;
  box-shadow: 0 3px 12px rgba(31, 168, 187, 0.30);
  transition: background 0.18s, transform 0.15s;
}

.analyze-btn:hover:not(:disabled) {
  background: #178fa0;
  transform: translateY(-1px);
}

.analyze-btn:disabled { opacity: 0.5; cursor: not-allowed; }

/* ==============================
   Seccion de resultados
   ============================== */
.results-section {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.results-heading {
  font-family: 'EB Garamond', serif;
  font-size: 1.55rem;
  font-weight: 600;
  color: #16161a;
  margin: 0 0 4px;
}

/* Grid puntuacion + resumen */
.score-resumen-grid {
  display: grid;
  grid-template-columns: 200px 1fr;
  gap: 14px;
}

@media (max-width: 640px) {
  .score-resumen-grid { grid-template-columns: 1fr; }
}

.score-card {
  padding: 22px 20px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  align-items: flex-start;
}

.score-label-top {
  font-size: 0.82rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.score-big {
  font-family: 'EB Garamond', serif;
  font-size: 3.2rem;
  font-weight: 700;
  line-height: 1;
}

.score-denom {
  font-size: 1.3rem;
  font-weight: 400;
  opacity: 0.55;
}

.score-bar {
  width: 100%;
}

.resumen-card {
  padding: 22px;
}

/* Tarjetas de resultado individuales */
.result-card {
  padding: 20px 22px;
}

.result-card-label {
  display: flex;
  align-items: center;
  gap: 8px;
  font-family: 'EB Garamond', serif;
  font-size: 1.05rem;
  font-weight: 600;
  color: #16161a;
  margin-bottom: 14px;
}

/* Partes */
.partes-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.parte-row {
  display: flex;
  align-items: center;
  gap: 10px;
}

.parte-chip {
  font-size: 0.78rem;
  font-weight: 600;
  color: #7c47e0;
  background: rgba(139, 92, 246, 0.10);
  border: 1px solid rgba(139, 92, 246, 0.22);
  padding: 4px 10px;
  border-radius: 999px;
  white-space: nowrap;
  text-transform: capitalize;
}

.parte-nombre {
  font-size: 0.93rem;
}

/* Fechas */
.fechas-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.fecha-chip {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 0.82rem;
  font-weight: 500;
  color: #167f8e;
  background: rgba(57, 199, 216, 0.10);
  border: 1px solid rgba(31, 168, 187, 0.22);
  padding: 5px 11px;
  border-radius: 999px;
}

/* Obligaciones */
.obligaciones-grupo {
  margin-bottom: 14px;
}

.obligaciones-parte {
  font-size: 0.84rem;
  font-weight: 700;
  color: #3f6fc9;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  margin-bottom: 6px;
  padding-left: 10px;
  border-left: 3px solid rgba(79, 127, 214, 0.40);
}

.obligaciones-list {
  padding-left: 22px;
  margin: 0;
}

.obligacion-item {
  font-size: 0.9rem;
  line-height: 1.55;
  margin-bottom: 3px;
}

/* Riesgos */
.risk-card {
  border-left: 3px solid rgba(224, 82, 82, 0.50);
}

.risk-label {
  color: #c0392b;
}

.riesgos-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.riesgo-item {
  background: #FAFAF7;
  border: 1px solid rgba(27, 27, 30, 0.07);
  border-radius: 11px;
  padding: 13px 15px;
}

.riesgo-row {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 5px;
}

.riesgo-clausula {
  font-size: 0.9rem;
  font-weight: 600;
  flex: 1;
}

.nivel-badge {
  font-size: 0.72rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  flex-shrink: 0;
}

.riesgo-desc {
  font-size: 0.88rem;
  line-height: 1.5;
  margin: 0 0 8px;
}

.riesgo-sug {
  display: flex;
  align-items: flex-start;
  gap: 6px;
  background: rgba(255, 186, 73, 0.12);
  border: 1px solid rgba(180, 83, 9, 0.15);
  border-radius: 8px;
  padding: 8px 10px;
  font-size: 0.84rem;
  line-height: 1.45;
}

.riesgo-sug svg { flex-shrink: 0; margin-top: 1px; }

/* Boton corregir */
.corregir-wrap {
  text-align: center;
}

.corregir-btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 11px 26px;
  background: #ff9b6a;
  color: #fff;
  border: none;
  border-radius: 11px;
  font-family: 'Figtree', sans-serif;
  font-size: 0.92rem;
  font-weight: 600;
  cursor: pointer;
  box-shadow: 0 3px 12px rgba(255, 155, 106, 0.35);
  transition: background 0.18s, transform 0.15s;
}

.corregir-btn:hover:not(:disabled) {
  background: #f07d45;
  transform: translateY(-1px);
}

.corregir-btn:disabled { opacity: 0.55; cursor: not-allowed; }

/* Contrato corregido */
.corregido-card {
  border-left: 3px solid rgba(22, 163, 74, 0.50);
}

.corregido-label {
  color: #166534;
}

.corregido-actions {
  display: flex;
  gap: 4px;
  margin-left: auto;
}

.icon-action-btn {
  width: 30px;
  height: 30px;
  border-radius: 8px;
  border: 1px solid rgba(27, 27, 30, 0.10);
  background: #FAFAF7;
  color: #55555c;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: background 0.15s;
}

.icon-action-btn:hover { background: rgba(27, 27, 30, 0.07); }

.corregido-text-box {
  max-height: 500px;
  overflow-y: auto;
  border: 1px solid rgba(22, 163, 74, 0.18);
  border-radius: 10px;
  padding: 14px;
  background: #FAFAF7;
  scrollbar-width: thin;
  scrollbar-color: rgba(27,27,30,0.12) transparent;
}

.corregido-pre {
  font-family: 'JetBrains Mono', 'Fira Code', 'Courier New', monospace;
  font-size: 12.5px;
  line-height: 1.6;
  white-space: pre-wrap;
  word-wrap: break-word;
  margin: 0;
}

/* Mejoras */
.mejoras-list {
  display: flex;
  flex-direction: column;
  gap: 11px;
}

.mejora-item {
  display: flex;
  align-items: flex-start;
  gap: 11px;
}

.mejora-icon-wrap {
  width: 28px;
  height: 28px;
  border-radius: 8px;
  background: rgba(57, 199, 216, 0.12);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  margin-top: 1px;
}

.mejora-titulo {
  font-size: 0.9rem;
  font-weight: 600;
  margin-bottom: 2px;
}

.mejora-desc {
  font-size: 0.86rem;
  line-height: 1.5;
}

/* ==============================
   Responsive
   ============================== */
@media (max-width: 600px) {
  .upload-drop-area {
    flex-wrap: wrap;
    padding: 20px 16px;
    margin: 12px;
  }

  .upload-pick-btn {
    width: 100%;
    justify-content: center;
  }

  .file-info-row { flex-wrap: wrap; }
}
</style>
