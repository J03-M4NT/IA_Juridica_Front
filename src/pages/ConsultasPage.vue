<template>
  <q-page class="consultas-page" :class="{ 'consultas-page--with-pdf': store.archivoAdjunto }">

    <!-- Section header — se encoge y se atenúa al bajar en el chat, para
         devolverle espacio a la conversación sin perder el título del
         todo (ver onMessagesScroll). -->
    <div class="page-header" :class="{ 'page-header--compact': chatDesplazado }">
      <div class="section-icon-wrap icon-blue">
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#7EA2F2" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
        </svg>
      </div>
      <div>
        <h1 class="page-title">Consultas Jurídicas</h1>
        <p class="page-subtitle">Haz preguntas sobre leyes, o adjunta un contrato para analizarlo</p>
      </div>
    </div>

    <div class="consultas-layout" :class="{ 'consultas-layout--split': store.archivoAdjunto }">

    <!-- Chat wrapper -->
    <div
      class="chat-wrapper"
      @dragenter.prevent="onDragEnter"
      @dragover.prevent
      @dragleave.prevent="onDragLeave"
      @drop.prevent="onDrop"
    >

      <!-- Overlay al arrastrar un archivo -->
      <div v-if="isDraggingFile" class="drop-overlay">
        <div class="drop-overlay-content">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <path d="M17 8l-5-5-5 5"/>
            <path d="M12 3v12"/>
          </svg>
          <p>Suelta tu PDF o Word aquí</p>
        </div>
      </div>

      <!-- Messages area -->
      <div class="messages-area" ref="messagesBox" @scroll="onMessagesScroll">
        <div v-for="(mensaje, index) in mensajes" :key="index" class="message-wrapper">

          <!-- AI message: bloque de texto simple, sin avatar ni burbuja -->
          <div v-if="mensaje.esIA" class="msg-block msg-block--ai">
            <div class="msg-meta msg-meta--ai">LEXIT AI · {{ formatTimestamp(mensaje.timestamp) }}</div>

            <!-- Mientras llega el primer trozo del stream, puntos de "escribiendo" -->
            <div v-if="!mensaje.contenido && store.loading && index === mensajes.length - 1" class="typing-dots">
              <span></span><span></span><span></span>
            </div>
            <template v-else>
              <div class="msg-content formatted-message" v-html="formatMessage(mensaje.contenido)"></div>
              <div v-if="mensaje.referencias?.length" class="msg-refs">
                <strong>Referencias:</strong>
                <div v-for="(ref, idx) in mensaje.referencias" :key="idx" class="q-mt-xs">{{ ref }}</div>
              </div>

              <!-- Fuentes citadas de Pinecone (siempre visibles) -->
              <div v-if="mensaje.fuentes?.length" class="fuentes-block">
                <div class="fuentes-label">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                    <path d="M14 2v6h6"/>
                  </svg>
                  <span>Basado en {{ mensaje.fuentes.length }} fuente(s) de la base de datos jurídica</span>
                </div>

                <div class="fuentes-list">
                  <div v-for="(fuente, fi) in mensaje.fuentes" :key="fi" class="fuente-card">
                    <span class="fuente-doc-name">{{ fuente.nombreDocumento || 'Documento' }}</span>
                    <p class="fuente-texto">&ldquo;{{ fuente.texto }}&rdquo;</p>
                  </div>
                </div>
              </div>

              <div class="msg-actions">
                <button type="button" class="msg-action-btn" title="Copiar" @click="copiarMensaje(mensaje.contenido, index)">
                  <svg v-if="copiedIndex !== index" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                    <rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                  </svg>
                  <svg v-else width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M20 6L9 17l-5-5"/>
                  </svg>
                </button>
              </div>
            </template>
          </div>

          <!-- User message: burbuja alineada a la derecha -->
          <div v-else class="msg-block msg-block--user">
            <div class="msg-bubble-user">{{ mensaje.contenido }}</div>
          </div>

        </div>
      </div>

      <!-- Input area -->
      <div class="input-area">

        <!-- Archivo adjunto -->
        <div v-if="store.archivoAdjunto" class="composer-chip-row">
          <span class="composer-chip">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <path d="M14 2v6h6"/>
            </svg>
            {{ store.archivoAdjunto.nombre }}
            <button type="button" class="composer-chip-remove" aria-label="Quitar archivo adjunto" @click="quitarAdjunto">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M18 6L6 18M6 6l12 12"/>
              </svg>
            </button>
          </span>
          <button type="button" class="composer-reanalizar" :disabled="store.loading" @click="volverAAnalizar">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M23 4v6h-6"/><path d="M1 20v-6h6"/>
              <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
            </svg>
            Volver a analizar
          </button>
        </div>
        <p v-if="procesandoArchivo" class="adjunto-extrayendo">Leyendo documento…</p>
        <p v-if="errorAdjunto" class="adjunto-error">{{ errorAdjunto }}</p>

        <input
          ref="archivoInputRef"
          type="file"
          accept="application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,.docx"
          style="display:none"
          @change="onArchivoSeleccionado"
        />

        <div class="composer-pill">
          <button
            type="button"
            class="plus-btn"
            :disabled="store.loading || procesandoArchivo"
            title="Adjuntar PDF o Word"
            @click="abrirSelectorArchivo"
          >
            <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">
              <path d="M12 5v14M5 12h14"/>
            </svg>
          </button>

          <q-input
            v-model="pregunta"
            placeholder="Escribe tu consulta legal aquí..."
            type="textarea"
            autogrow
            borderless
            :disable="store.loading"
            :max-height="160"
            class="composer-textarea-pill"
            hide-bottom-space
            @keydown.enter.exact.prevent="enviarConsulta"
          />

          <button
            class="ask-btn-round"
            :disabled="store.loading || (!pregunta.trim() && !store.archivoAdjunto)"
            title="Preguntar"
            @click="enviarConsulta"
          >
            <svg v-if="!store.loading" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M12 19V5"/><path d="M5 12l7-7 7 7"/>
            </svg>
            <q-spinner v-else size="16px" color="white" />
          </button>
        </div>

        <div v-if="store.error" class="error-row">
          <q-icon name="error" color="negative" size="18px" />
          <span class="error-text">{{ store.error }}</span>
        </div>
      </div>

    </div>

    <!-- Documento: previsualización tipo Word, con cambios en amarillo y
         riesgos en rojo marcados directamente sobre el texto.
         DESHABILITADO a pedido del usuario: ya no se muestra automáticamente
         al adjuntar — el chat debe quedar a ancho completo hasta que se pida
         un análisis, momento en el que el panel de sugerencias (más abajo)
         es la única superficie lateral que aparece. Todo el marcado/lógica
         de este panel (pestañas, edición manual, "Descargar documento") se
         deja intacto sin usar, por si se vuelve a necesitar más adelante. -->
    <!-- El <template v-if="false"> exterior es lo que realmente lo
         deshabilita; el v-if="store.archivoAdjunto" del div interior se
         deja como estaba para que TypeScript lo siga infiriendo como no
         nulo dentro del bloque (si no, cada store.archivoAdjunto.* de acá
         abajo marcaría error de tipos). -->
    <template v-if="false">
    <div v-if="store.archivoAdjunto" class="documento-panel">
      <div class="documento-panel-header">
        <div class="documento-panel-titulo">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
            <path d="M14 2v6h6"/>
          </svg>
          {{ store.archivoAdjunto?.nombre }}
        </div>

        <div class="documento-panel-acciones">
          <!-- Solo para PDF: para Word no hace falta elegir vista — el
               documento ya se ve con su estructura real y se edita ahí
               mismo. "Vista original" (render pixel-exacto) solo tiene
               sentido para PDF, que sí pierde estructura al extraerse a
               texto plano. -->
          <div v-if="!esWordAdjunto" class="documento-tabs">
            <button
              type="button"
              class="documento-tab"
              :class="{ 'documento-tab--active': tabDocumento === 'original' }"
              @click="tabDocumento = 'original'"
            >
              Vista original
            </button>
            <button
              type="button"
              class="documento-tab"
              :class="{ 'documento-tab--active': tabDocumento === 'editando' }"
              @click="tabDocumento = 'editando'"
            >
              Editando
            </button>
            <button
              type="button"
              class="documento-tab"
              :class="{ 'documento-tab--active': tabDocumento === 'final' }"
              @click="tabDocumento = 'final'"
            >
              Documento final
            </button>
          </div>

          <button type="button" class="documento-descargar" :disabled="descargandoDocumento" @click="descargarDocumento">
            <q-spinner v-if="descargandoDocumento" size="14px" />
            <svg v-else width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <path d="M7 10l5 5 5-5"/>
              <path d="M12 15V3"/>
            </svg>
            Descargar documento
          </button>
        </div>
      </div>
      <div class="documento-panel-body">
        <!-- Word: panel único, sin pestañas — el documento ya se ve con su
             estructura real (mammoth conserva negritas/listas/tablas), con
             las marcas de sugerencia superpuestas, y es editable ahí mismo. -->
        <template v-if="esWordAdjunto">
          <div class="documento-page">
            <div
              ref="documentoEditableRef"
              class="documento-texto documento-texto--editable"
              contenteditable="true"
              @input="onDocumentoInput"
              @blur="onDocumentoBlur"
              @click="onDocumentoClick"
            ></div>
          </div>
        </template>

        <!-- PDF: mantiene las 3 pestañas — acá sí hace falta distinguir la
             vista pixel-exacta del original (canvas de pdf.js) de la vista
             editable, porque la extracción a texto plano sí pierde
             estructura. -->
        <template v-else>
          <div v-if="tabDocumento === 'original'" class="documento-original">
            <div v-if="cargandoOriginal" class="pdf-panel-status">
              <q-spinner-dots color="primary" size="36px" />
              <p>Cargando vista original…</p>
            </div>
            <div v-else-if="errorOriginal" class="pdf-panel-status">
              <p>{{ errorOriginal }}</p>
            </div>
            <template v-else>
              <div class="documento-original-canvas-wrap">
                <canvas ref="pdfCanvasRef"></canvas>
              </div>
              <div v-if="totalPaginasOriginal > 1" class="documento-original-nav">
                <button type="button" class="pdf-nav-btn" :disabled="paginaOriginal <= 1" @click="paginaOriginalAnterior">‹</button>
                <span>Página {{ paginaOriginal }} de {{ totalPaginasOriginal }}</span>
                <button type="button" class="pdf-nav-btn" :disabled="paginaOriginal >= totalPaginasOriginal" @click="paginaOriginalSiguiente">›</button>
              </div>
            </template>
          </div>

          <template v-else>
            <div class="documento-page">
              <!-- Editando: editable, con marcas de cambios/riesgos visibles -->
              <div
                v-show="tabDocumento === 'editando'"
                ref="documentoEditableRef"
                class="documento-texto documento-texto--editable"
                contenteditable="true"
                @input="onDocumentoInput"
                @blur="onDocumentoBlur"
                @click="onDocumentoClick"
              ></div>
              <!-- Documento final: solo lectura, sin marcas -->
              <div
                v-if="tabDocumento === 'final'"
                class="documento-texto"
                v-html="documentoFinalHtml"
              ></div>
            </div>
          </template>
        </template>
      </div>
    </div>
    </template>

    <!-- Sugerencias: solo lectura — el análisis de riesgos de la IA. Aplicar
         cambios reales ahora se hace en Word (ver el CTA arriba), no acá.
         La lógica de aplicar/descartar/deshacer sigue existiendo en el
         script (aplicarSugerencia, descartarSugerencia, deshacerSugerencia,
         reconsiderarSugerencia, sugerenciasAplicadas, sugerenciasDescartadas)
         por si se vuelve a necesitar — solo dejó de usarse desde esta vista. -->
    <div v-if="cargandoSugerencias || sugerencias.length || errorSugerencias" class="sugerencias-rail">

      <div v-if="store.archivoAdjunto?.storagePathDocx" class="sugerencias-cta">
        <button type="button" class="sugerencias-cta-btn" :disabled="abriendoEnWord" @click="abrirEnWord">
          <q-spinner v-if="abriendoEnWord" size="16px" color="white" />
          <svg v-else width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">
            <path d="M14 3v4a1 1 0 0 0 1 1h4"/>
            <path d="M17 21H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7l5 5v11a2 2 0 0 1-2 2Z"/>
            <path d="M9 13h6M9 17h6M9 9h1"/>
          </svg>
          Descargar y abrir en Word
        </button>
        <p class="sugerencias-cta-hint">Único camino para aplicar estos cambios — ábrelo en Word con control de cambios real.</p>
        <p v-if="errorAbrirWord" class="documento-abrir-word-error">{{ errorAbrirWord }}</p>
      </div>

      <div class="sugerencias-rail-header">Sugerencias</div>

      <div class="sugerencias-rail-body">
        <div v-if="cargandoSugerencias" class="sugerencias-cargando">
          <q-spinner-dots color="primary" size="28px" />
          <p class="sugerencias-cargando-titulo">Analizando el contrato</p>
          <p class="sugerencias-cargando-sub">LexIT está revisando las cláusulas y evaluando riesgos…</p>
        </div>
        <div v-else-if="errorSugerencias" class="sugerencias-error-state">
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          <p class="sugerencias-error-titulo">No se pudo generar el análisis</p>
          <p class="sugerencias-error-sub">{{ errorSugerencias }}</p>
          <button type="button" class="sugerencias-reintentar-btn" @click="generarSugerencias">Reintentar</button>
        </div>
        <template v-else>
          <div class="sugerencias-metricas">
            <div class="metrica-bloque">
              <span class="metrica-numero">{{ conteoSugerencias.total }}</span>
              <span class="metrica-label">Total</span>
            </div>
            <div class="metrica-bloque metrica-bloque--alto">
              <span class="metrica-numero">{{ conteoSugerencias.alto }}</span>
              <span class="metrica-label">Alto</span>
            </div>
            <div class="metrica-bloque metrica-bloque--medio">
              <span class="metrica-numero">{{ conteoSugerencias.medio }}</span>
              <span class="metrica-label">Medio</span>
            </div>
            <div class="metrica-bloque metrica-bloque--bajo">
              <span class="metrica-numero">{{ conteoSugerencias.bajo }}</span>
              <span class="metrica-label">Bajo</span>
            </div>
          </div>

          <div class="sugerencias-list">
            <div v-for="s in sugerencias" :id="`sugerencia-${s.id}`" :key="s.id" class="sugerencia-card">
              <div class="sugerencia-card-top">
                <div class="sugerencia-clausula">{{ s.clausula }}</div>
                <span class="riesgo-badge" :class="s.nivel ? `riesgo-badge--${s.nivel}` : 'riesgo-badge--cambio'">
                  {{ s.nivel ? `Riesgo ${s.nivel}` : 'Cambio sugerido' }}
                </span>
              </div>

              <p class="sugerencia-explicacion">
                <strong>{{ s.tipo === 'riesgo' ? 'Por qué es riesgosa:' : 'Por qué se sugiere:' }}</strong>
                {{ s.explicacion }}
              </p>

              <p v-if="s.textoSugerido" class="sugerencia-nuevo">
                <strong>Así se podría redactar mejor:</strong> {{ s.textoSugerido }}
              </p>

              <p class="sugerencia-original">
                <strong>Texto actual:</strong> &ldquo;{{ s.textoOriginal }}&rdquo;
              </p>
            </div>
          </div>
        </template>
      </div>
    </div>

    </div>

  </q-page>
</template>

<script setup lang="ts">
import { ref, shallowRef, computed, onMounted, onUnmounted, nextTick, watch } from 'vue'
import { useConsultasStore, esSolicitudDeAnalisisDeRiesgos } from '../stores/consultas-store'
import { useAuthStore } from '../stores/auth'
import { storeToRefs } from 'pinia'
import { extraerTextoPDF } from '../utils/pdfExtractor'
import { extraerHtmlWord } from '../utils/mammothExtractor'
import { sugerirCambiosContrato, type SugerenciaCambio } from '../services/geminiService'
import { exportToWord } from '../utils/documentExport'
import { resaltarEnHtml, quitarMarcasSugerencia } from '../utils/htmlTexto'
import { subirDocumentoTemporal, obtenerUrlFirmadaDocumento } from '../services/documentosTemporalesService'
import { getDocument, type PDFDocumentProxy } from 'pdfjs-dist'

const store = useConsultasStore()
const authStore = useAuthStore()
const pregunta = ref('')

const { mensajes } = storeToRefs(store)
const messagesBox = ref<HTMLElement | null>(null)

// Puramente visual: encoge/atenúa el encabezado mientras se baja en el
// chat, para devolverle espacio a la conversación (ver .page-header--compact).
const chatDesplazado = ref(false)

function onMessagesScroll(event: Event) {
  chatDesplazado.value = (event.target as HTMLElement).scrollTop > 16
}

const copiedIndex = ref<number | null>(null)

async function copiarMensaje(texto: string, index: number) {
  try {
    await navigator.clipboard.writeText(texto)
    copiedIndex.value = index
    setTimeout(() => {
      if (copiedIndex.value === index) copiedIndex.value = null
    }, 1500)
  } catch (err) {
    console.error('No se pudo copiar:', err)
  }
}

// ✅ Adjuntar PDF al chat (privado de esta conversación, nunca se indexa
// en Pinecone — ver consultas-store.ts)
const archivoInputRef = ref<HTMLInputElement | null>(null)
const procesandoArchivo = ref(false)
const errorAdjunto = ref('')

// Se incrementa en cada intento de extracción y al desmontar, para poder
// descartar el resultado de una extracción en curso si el usuario
// selecciona otro archivo antes de que termine, o si sale de la página.
let intentoExtraccion = 0

interface SugerenciaConError extends SugerenciaCambio {
  error?: string | undefined
  // Foto del contenido del documento (html si es Word, texto si es PDF)
  // justo antes y justo después de aplicar esta sugerencia — red de
  // seguridad para Deshacer cuando la búsqueda de textoSugerido falla
  // (ver deshacerSugerencia).
  contenidoAntesDeAplicar?: string | undefined
  contenidoDespuesDeAplicar?: string | undefined
}

const sugerencias = ref<SugerenciaConError[]>([])
const sugerenciasAplicadas = ref<SugerenciaConError[]>([])
const sugerenciasDescartadas = ref<SugerenciaConError[]>([])
const cargandoSugerencias = ref(false)
const errorSugerencias = ref('')

// El panel de documento (.documento-panel) está deshabilitado (v-if false)
// a pedido del usuario — este computed ya no tiene consumidor mientras
// siga así, se deja sin usar en vez de borrarlo por si se reactiva ese
// panel más adelante.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const mostrandoAnalisisRiesgos = computed(() =>
  cargandoSugerencias.value || sugerencias.value.length > 0 || !!errorSugerencias.value
)

// Franja de métricas del panel de sugerencias (solo lectura) — cuenta por
// nivel de riesgo; las de tipo "cambio" (sin nivel) solo suman al total.
const conteoSugerencias = computed(() => {
  let alto = 0
  let medio = 0
  let bajo = 0
  for (const s of sugerencias.value) {
    if (s.nivel === 'alto') alto++
    else if (s.nivel === 'medio') medio++
    else if (s.nivel === 'bajo') bajo++
  }
  return { total: sugerencias.value.length, alto, medio, bajo }
})

function limpiarSugerencias() {
  sugerencias.value = []
  sugerenciasAplicadas.value = []
  sugerenciasDescartadas.value = []
  errorSugerencias.value = ''
}

// Se llama al adjuntar un documento nuevo o al quitar el actual, para que
// una edición sin guardar de un documento anterior no quede "colgada"
// bloqueando el refresco del panel (ver watch(documentoHtml) más abajo).
function reiniciarEdicion() {
  if (debounceEdicionId !== null) {
    clearTimeout(debounceEdicionId)
    debounceEdicionId = null
  }
  editandoActivamente = false
  tabDocumento.value = 'original'
  limpiarVistaOriginal()
  archivoWordOriginalRef.value = null
}

async function generarSugerencias() {
  if (!store.archivoAdjunto) return
  flushEdicionPendiente()
  cargandoSugerencias.value = true
  errorSugerencias.value = ''
  try {
    sugerencias.value = await sugerirCambiosContrato(store.archivoAdjunto.texto)
  } catch (err) {
    errorSugerencias.value = 'No se pudieron generar las sugerencias. Intenta de nuevo.'
    console.error('Error generando sugerencias:', err)
  } finally {
    cargandoSugerencias.value = false
  }
}

// descartarSugerencia/reconsiderarSugerencia/aplicarSugerencia/
// deshacerSugerencia: el panel de Sugerencias pasó a ser de solo lectura
// (ver la vista en el template) — esta lógica de aplicar/descartar en el
// navegador se deja intacta y sin usar, no se borra, por si se vuelve a
// necesitar más adelante.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function descartarSugerencia(id: string) {
  const s = sugerencias.value.find(item => item.id === id)
  if (!s) return
  sugerencias.value = sugerencias.value.filter(item => item.id !== id)
  sugerenciasDescartadas.value = [...sugerenciasDescartadas.value, s]
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function reconsiderarSugerencia(id: string) {
  const s = sugerenciasDescartadas.value.find(item => item.id === id)
  if (!s) return
  sugerenciasDescartadas.value = sugerenciasDescartadas.value.filter(item => item.id !== id)
  s.error = undefined
  sugerencias.value = [...sugerencias.value, s]
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function aplicarSugerencia(s: SugerenciaConError) {
  flushEdicionPendiente()
  const adjuntoAntes = store.archivoAdjunto
  const contenidoAntes = adjuntoAntes ? (adjuntoAntes.html ?? adjuntoAntes.texto) : undefined
  const aplicado = store.aplicarCambioEnAdjunto(s.textoOriginal, s.textoSugerido)
  if (aplicado) {
    s.error = undefined
    const adjuntoDespues = store.archivoAdjunto
    s.contenidoAntesDeAplicar = contenidoAntes
    s.contenidoDespuesDeAplicar = adjuntoDespues ? (adjuntoDespues.html ?? adjuntoDespues.texto) : undefined
    sugerencias.value = sugerencias.value.filter(item => item.id !== s.id)
    sugerenciasAplicadas.value = [...sugerenciasAplicadas.value, s]
  } else {
    s.error = 'No se pudo ubicar este texto exacto en el documento (puede que ya haya cambiado).'
  }
}

// Reusa aplicarCambioEnAdjunto con los argumentos invertidos: busca el
// texto que quedó aplicado (textoSugerido) y lo vuelve al original — es
// la misma operación, en sentido contrario, sin necesitar una acción
// nueva en el store (sirve igual para el camino Word/HTML y PDF/texto
// plano, que aplicarCambioEnAdjunto ya bifurca internamente).
//
// Red de seguridad: si esa búsqueda por texto no encuentra nada (por
// ejemplo, porque el HTML pasó por una normalización del navegador que
// alteró algún detalle invisible entre aplicar y deshacer), pero el
// documento sigue exactamente como quedó justo después de aplicar ESTA
// sugerencia (nada más lo tocó desde entonces), se restaura directamente
// la foto guardada en aplicarSugerencia — sin depender de encontrar el
// fragmento como string.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function deshacerSugerencia(s: SugerenciaConError) {
  flushEdicionPendiente()

  function marcarComoDeshecha() {
    s.error = undefined
    sugerenciasAplicadas.value = sugerenciasAplicadas.value.filter(item => item.id !== s.id)
    sugerencias.value = [...sugerencias.value, s]
  }

  if (store.aplicarCambioEnAdjunto(s.textoSugerido, s.textoOriginal)) {
    marcarComoDeshecha()
    return
  }

  const adjunto = store.archivoAdjunto
  const contenidoActual = adjunto ? (adjunto.html ?? adjunto.texto) : undefined
  const puedeRestaurar = adjunto && s.contenidoAntesDeAplicar !== undefined && contenidoActual === s.contenidoDespuesDeAplicar
  if (puedeRestaurar) {
    if (adjunto.html) {
      store.actualizarHtmlAdjunto(s.contenidoAntesDeAplicar!)
    } else {
      store.actualizarTextoAdjunto(s.contenidoAntesDeAplicar!)
    }
    marcarComoDeshecha()
    return
  }

  s.error = 'No se pudo deshacer: el texto aplicado ya no está tal cual en el documento (puede que lo hayas editado después).'
}

// Marca sobre el texto del documento: cada sugerencia pendiente se resalta
// en su posición real dentro de store.archivoAdjunto.texto — amarillo para
// "cambio", rojo (por nivel) para "riesgo". Sin solapes: si dos anotaciones
// caen sobre el mismo tramo, se queda la primera.
function escapeHtml(texto: string): string {
  return texto.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

interface Tramo { inicio: number; fin: number; sugerencia: SugerenciaConError }

// Convierte el texto plano del documento en el HTML que se muestra —
// opcionalmente con marcas de cambio/riesgo resaltadas — con párrafos
// reales (como un documento de Word) en vez de un bloque corrido. La usan
// tanto la vista "Editando" (con marcas) como "Documento final" y la
// exportación a Word (ambas sin marcas, tramos: []), así las tres siempre
// muestran/exportan exactamente lo mismo.
function textoAHtmlConMarcas(texto: string, tramosSugerencias: SugerenciaConError[]): string {
  if (!texto) return ''

  const tramos: Tramo[] = []
  for (const s of tramosSugerencias) {
    if (!s.textoOriginal) continue
    const inicio = texto.indexOf(s.textoOriginal)
    if (inicio === -1) continue
    const fin = inicio + s.textoOriginal.length
    const solapa = tramos.some(t => inicio < t.fin && fin > t.inicio)
    if (!solapa) tramos.push({ inicio, fin, sugerencia: s })
  }
  tramos.sort((a, b) => a.inicio - b.inicio)

  let html = ''
  let cursor = 0
  for (const tramo of tramos) {
    html += escapeHtml(texto.slice(cursor, tramo.inicio))
    const clase = tramo.sugerencia.tipo === 'riesgo'
      ? `hl-riesgo hl-riesgo--${tramo.sugerencia.nivel ?? 'medio'}`
      : 'hl-cambio'
    html += `<mark class="${clase}" data-sugerencia-id="${tramo.sugerencia.id}">${escapeHtml(texto.slice(tramo.inicio, tramo.fin))}</mark>`
    cursor = tramo.fin
  }
  html += escapeHtml(texto.slice(cursor))

  // La extracción del PDF junta todo el texto de una página en un solo
  // bloque corrido (no hay salto de línea entre cláusulas) — para que se
  // vea "como el documento real" en vez de todo pegado, se inserta un
  // corte de párrafo antes de cada encabezado de cláusula/artículo que
  // aparece en mayúsculas (o "Artículo N°" en los códigos legales).
  const conCortes = html.replace(
    /(\S)(\s+)(CL[ÁA]USULA\s+[A-ZÁÉÍÓÚÑ]+|ART[IÍ]CULO\s+\d+°?|Art[íi]culo\s+\d+°?)/g,
    '$1\n\n$3'
  )

  // Párrafos reales (como un documento de Word) en vez de un solo bloque
  // con <br> — se parte por los saltos de línea dobles (los que ya traía
  // la extracción entre páginas, más los que se acaban de insertar arriba).
  return conCortes
    .split(/\n{2,}/)
    .map(p => p.trim())
    .filter(Boolean)
    .map(p => `<p>${p.replace(/\n/g, '<br>')}</p>`)
    .join('')
}

// true si el documento adjunto es un Word (mammoth) en vez de un PDF —
// bifurca entre HTML real (Word) y texto plano con heurísticas de párrafo
// (PDF, sin cambios) en los computeds de abajo.
const esWordAdjunto = computed(() => !!store.archivoAdjunto?.html)

const documentoHtml = computed(() => {
  const adjunto = store.archivoAdjunto
  if (!adjunto) return ''
  return adjunto.html
    ? resaltarEnHtml(adjunto.html, sugerencias.value)
    : textoAHtmlConMarcas(adjunto.texto, sugerencias.value)
})

// Vista limpia (sin marcas) — es tanto la pestaña "Documento final" como
// el HTML que se manda a convertir a .docx, así preview y descarga son
// literalmente el mismo contenido.
const documentoFinalHtml = computed(() => {
  const adjunto = store.archivoAdjunto
  if (!adjunto) return ''
  return adjunto.html ?? textoAHtmlConMarcas(adjunto.texto, [])
})

// =========================
// EDICIÓN MANUAL DEL DOCUMENTO (pestaña "Editando")
// =========================
type TabDocumento = 'original' | 'editando' | 'final'
const tabDocumento = ref<TabDocumento>('original')
const documentoEditableRef = ref<HTMLDivElement | null>(null)
const descargandoDocumento = ref(false)

// No es un ref reactivo a propósito: solo se lee de forma síncrona dentro
// del watcher de documentoHtml, no necesita disparar re-renders.
let editandoActivamente = false
let debounceEdicionId: ReturnType<typeof setTimeout> | null = null

// Único punto que lee el DOM y lo manda al store. Se llama como mucho una
// vez por pausa al tipear, nunca en cada tecla (leer el DOM fuerza reflow).
// Camino PDF: innerText (no textContent, que pegaría párrafos sin
// espacio). Camino Word: innerHTML, pero antes hay que desenvolver los
// <mark data-sugerencia-id> que el watcher de documentoHtml pintó para
// preview — si no, esas marcas quedarían persistidas en el documento real
// (para PDF esto nunca fue un problema porque innerText ya las descarta).
function comitarEdicion() {
  const el = documentoEditableRef.value
  if (el && store.archivoAdjunto) {
    if (store.archivoAdjunto.html) {
      store.actualizarHtmlAdjunto(quitarMarcasSugerencia(el.innerHTML))
    } else {
      store.actualizarTextoAdjunto(el.innerText)
    }
  }
  editandoActivamente = false
}

// Fuerza el commit de cualquier edición pendiente AHORA MISMO, en vez de
// esperar al debounce. Se llama antes de cualquier otra acción que lea o
// reemplace archivoAdjunto.texto (Aplicar, Generar sugerencias, Volver a
// analizar, Descargar, cambiar de pestaña) — si no, una de esas acciones
// podría pisar el texto recién tipeado con una foto vieja, o al revés.
function flushEdicionPendiente() {
  if (debounceEdicionId !== null) {
    clearTimeout(debounceEdicionId)
    debounceEdicionId = null
    comitarEdicion()
  }
}

function onDocumentoInput(event: Event) {
  if ((event as InputEvent).isComposing) return
  editandoActivamente = true
  if (debounceEdicionId !== null) clearTimeout(debounceEdicionId)
  debounceEdicionId = setTimeout(() => {
    debounceEdicionId = null
    comitarEdicion()
  }, 400)
}

function onDocumentoBlur() {
  flushEdicionPendiente()
}

// Reemplaza el HTML del panel editable a mano en vez de bindear v-html
// reactivo — así Vue nunca le "pisa" el cursor al usuario mientras
// escribe. Solo se refresca cuando NO hay una edición en curso (aplicar,
// descartar, generar sugerencias, o adjuntar un documento nuevo sí deben
// verse reflejados al toque).
// Único punto que escribe el innerHTML del panel editable — lo llaman
// tanto el watcher de documentoHtml como cualquier momento en que el div
// pueda haber quedado sin sincronizar por no haber existido en el DOM
// cuando documentoHtml cambió (ver watch(tabDocumento) más abajo: para
// PDF, el div de "Editando" vive detrás de un v-else de tabDocumento —
// mientras la pestaña activa es "Vista original" ni siquiera está
// montado, así que un watch normal no alcanza para llenarlo la primera
// vez que se lo muestra).
function sincronizarPanelEditable(html: string) {
  const el = documentoEditableRef.value
  if (!el || editandoActivamente) return
  if (el.innerHTML === html) return

  // Reemplazar el innerHTML resetea el scroll del contenedor a 0 por
  // default — sin esto, aplicar/descartar una sugerencia hace que la
  // vista "salte" al principio del documento en vez de quedarse donde
  // el usuario estaba mirando/editando.
  const contenedor = el.closest<HTMLElement>('.documento-panel-body')
  const scrollPrevio = contenedor?.scrollTop ?? 0

  el.innerHTML = html

  if (contenedor) contenedor.scrollTop = scrollPrevio
}

watch(documentoHtml, (html) => sincronizarPanelEditable(html), { immediate: true })

watch(tabDocumento, (nuevo, anterior) => {
  if (anterior === 'editando') flushEdicionPendiente()
  if (nuevo === 'original') void cargarVistaOriginal()
  // El div de "Editando" (para PDF) no existe en el DOM mientras la
  // pestaña activa es "Vista original" (ver comentario en
  // sincronizarPanelEditable) — al entrar a "Editando" recién ahí se
  // monta, así que hay que sincronizarlo a mano en vez de esperar a que
  // documentoHtml cambie de valor (puede que no vuelva a cambiar nunca).
  if (nuevo === 'editando') {
    void nextTick().then(() => sincronizarPanelEditable(documentoHtml.value))
  }
})

// =========================
// VISTA ORIGINAL: render pixel-exacto del PDF real vía pdf.js, sin pasar
// por la extracción de texto — así la previsualización puede ser una
// copia visual exacta del PDF que el usuario subió, sin depender de
// ninguna heurística de párrafos/cláusulas.
// =========================
const archivoOriginalRef = ref<File | null>(null)
// Archivo Word crudo tal como se subió — se guarda para poder devolverlo
// bit a bit en la descarga cuando no hubo ningún cambio (ver
// descargarDocumento), en vez de reconstruirlo siempre con la librería docx.
const archivoWordOriginalRef = ref<File | null>(null)
const abriendoEnWord = ref(false)
const errorAbrirWord = ref('')
const pdfCanvasRef = ref<HTMLCanvasElement | null>(null)
const pdfDocOriginal = shallowRef<PDFDocumentProxy | null>(null)
const paginaOriginal = ref(1)
const totalPaginasOriginal = ref(0)
const cargandoOriginal = ref(false)
const errorOriginal = ref('')
let renderizandoOriginal = false

async function renderizarPaginaOriginal(numeroPagina: number) {
  const pdf = pdfDocOriginal.value
  const canvas = pdfCanvasRef.value
  if (!pdf || !canvas) return

  renderizandoOriginal = true
  try {
    const page = await pdf.getPage(numeroPagina)
    const viewport = page.getViewport({ scale: 1.3 })
    canvas.width = viewport.width
    canvas.height = viewport.height

    const contexto = canvas.getContext('2d')
    if (!contexto) return
    await page.render({ canvasContext: contexto, viewport }).promise
  } catch (err) {
    errorOriginal.value = 'No se pudo mostrar esta página del PDF.'
    console.error('Error renderizando página original:', err)
  } finally {
    renderizandoOriginal = false
  }
}

// Se carga una sola vez por documento adjunto (guardado por limpiarVistaOriginal
// al quitar/reemplazar el adjunto) — cambiar de pestaña de ida y vuelta no
// vuelve a parsear el PDF entero cada vez.
async function cargarVistaOriginal() {
  if (pdfDocOriginal.value || cargandoOriginal.value) {
    // Ya cargado (o cargando): solo hace falta pintar la página actual si
    // el canvas todavía no tiene nada (ej. se acaba de montar la pestaña).
    if (pdfDocOriginal.value) await nextTick().then(() => renderizarPaginaOriginal(paginaOriginal.value))
    return
  }
  const archivo = archivoOriginalRef.value
  if (!archivo) return

  cargandoOriginal.value = true
  errorOriginal.value = ''
  try {
    const arrayBuffer = await archivo.arrayBuffer()
    const pdf = await getDocument({ data: arrayBuffer }).promise
    pdfDocOriginal.value = pdf
    totalPaginasOriginal.value = pdf.numPages
    paginaOriginal.value = 1
    cargandoOriginal.value = false
    await nextTick()
    await renderizarPaginaOriginal(1)
  } catch (err) {
    errorOriginal.value = 'No se pudo cargar la vista original de este PDF.'
    console.error('Error cargando vista original:', err)
    cargandoOriginal.value = false
  }
}

function paginaOriginalAnterior() {
  if (paginaOriginal.value <= 1 || renderizandoOriginal) return
  paginaOriginal.value--
  void renderizarPaginaOriginal(paginaOriginal.value)
}

function paginaOriginalSiguiente() {
  if (paginaOriginal.value >= totalPaginasOriginal.value || renderizandoOriginal) return
  paginaOriginal.value++
  void renderizarPaginaOriginal(paginaOriginal.value)
}

function limpiarVistaOriginal() {
  archivoOriginalRef.value = null
  pdfDocOriginal.value = null
  paginaOriginal.value = 1
  totalPaginasOriginal.value = 0
  cargandoOriginal.value = false
  errorOriginal.value = ''
}

const PIE_LEXIT = 'Generado con asistencia de LexIT AI — no reemplaza asesoría legal profesional'

// Estilos inline, no clase CSS scoped: exportToWord solo lee el HTML tal
// cual (no conoce los estilos compilados de Vue) para decidir negrita/
// encabezados/párrafos. Se agrega solo en el momento de exportar (no se
// persiste en el store), así no contamina la vista en pantalla ni se
// acumula si se descarga dos veces. No es un footer real de Word (que se
// repite por página) — es un párrafo final visible, una sola vez, al pie
// del documento.
function conPieDePagina(html: string): string {
  return `${html}<p style="margin-top:2.5em;padding-top:0.8em;border-top:1px solid #999;font-size:0.8rem;color:#666;font-style:italic;">${escapeHtml(PIE_LEXIT)}</p>`
}

function descargarBlob(blob: Blob, nombreArchivo: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = nombreArchivo
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

async function descargarDocumento() {
  if (!store.archivoAdjunto) return
  flushEdicionPendiente()
  descargandoDocumento.value = true
  try {
    const nombre = store.archivoAdjunto.nombre.replace(/\.(pdf|docx?)$/i, '') || 'documento'

    // Sin cambios (ni sugerencias aplicadas ni edición manual): se
    // devuelve el archivo Word original tal cual se subió, bit a bit, en
    // vez de reconstruirlo con la librería docx — ninguna reconstrucción,
    // por fiel que sea, es 100% idéntica al original.
    if (esWordAdjunto.value && !store.archivoAdjunto.modificado && archivoWordOriginalRef.value) {
      descargarBlob(archivoWordOriginalRef.value, store.archivoAdjunto.nombre)
      return
    }

    const blob = await exportToWord(conPieDePagina(documentoFinalHtml.value), nombre, store.archivoAdjunto.fuenteDetectada)
    descargarBlob(blob, `${nombre}.docx`)
  } catch (err) {
    console.error('Error exportando el documento:', err)
    errorAdjunto.value = err instanceof Error ? err.message : 'No se pudo generar el documento.'
  } finally {
    descargandoDocumento.value = false
  }
}

// Sube el .docx original a Storage en segundo plano, sin bloquear la
// extracción de texto que ya se ve al instante — si falla, el botón "Abrir
// en Word" simplemente no aparece (no rompe el resto del flujo).
async function subirParaAbrirEnWord(archivo: File) {
  const uid = authStore.user?.uid
  if (!uid) return
  try {
    const storagePath = await subirDocumentoTemporal(uid, archivo)
    store.marcarStoragePathDocx(archivo.name, storagePath)
  } catch (err) {
    console.error('No se pudo subir el documento para abrir en Word:', err)
  }
}

async function abrirEnWord() {
  const storagePath = store.archivoAdjunto?.storagePathDocx
  if (!storagePath) return
  abriendoEnWord.value = true
  errorAbrirWord.value = ''
  try {
    // ms-word:ofe|u|<url> requeriría que el archivo esté en un host WOPI
    // (SharePoint/OneDrive) para abrirse editable — con Firebase Storage
    // Word solo lo abriría en modo lectura. Se descarga en su lugar; el
    // usuario lo abre desde su carpeta de Descargas con Word normal.
    const urlFirmada = await obtenerUrlFirmadaDocumento(storagePath)
    window.location.href = urlFirmada
  } catch (err) {
    errorAbrirWord.value = err instanceof Error ? err.message : 'No se pudo abrir en Word.'
  } finally {
    abriendoEnWord.value = false
  }
}

function onDocumentoClick(event: MouseEvent) {
  const target = (event.target as HTMLElement).closest<HTMLElement>('[data-sugerencia-id]')
  const id = target?.dataset.sugerenciaId
  if (!id) return
  document.getElementById(`sugerencia-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
}

function abrirSelectorArchivo() {
  archivoInputRef.value?.click()
}

// file.type puede llegar vacío para .docx en Windows si el sistema no
// tiene la asociación registrada — no hay que confiar solo en el MIME,
// hace falta el fallback por extensión.
const MIME_WORD = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'

function esWord(archivo: File): boolean {
  return archivo.type === MIME_WORD || /\.docx$/i.test(archivo.name)
}

function esPdf(archivo: File): boolean {
  return archivo.type === 'application/pdf' || /\.pdf$/i.test(archivo.name)
}

async function procesarArchivo(archivo: File) {
  if (!esPdf(archivo) && !esWord(archivo)) {
    errorAdjunto.value = 'Solo se pueden adjuntar archivos PDF o Word (.docx).'
    return
  }

  const intentoActual = ++intentoExtraccion
  errorAdjunto.value = ''
  procesandoArchivo.value = true
  limpiarSugerencias()
  reiniciarEdicion()

  try {
    if (esWord(archivo)) {
      const { html, fuenteDetectada } = await extraerHtmlWord(archivo)
      if (intentoActual !== intentoExtraccion) return

      if (!html || html.trim().length < 20) {
        errorAdjunto.value = 'No se pudo extraer contenido de este documento Word.'
        return
      }

      store.adjuntarWord(archivo.name, html, fuenteDetectada ?? undefined)
      archivoWordOriginalRef.value = archivo
      void subirParaAbrirEnWord(archivo)
      return
    }

    const texto = await extraerTextoPDF(archivo)
    if (intentoActual !== intentoExtraccion) return

    if (!texto || texto.trim().length < 20) {
      errorAdjunto.value = 'No se pudo extraer texto de este PDF (puede ser un escaneo sin texto).'
      return
    }

    store.adjuntarPdf(archivo.name, texto)
    archivoOriginalRef.value = archivo
    void cargarVistaOriginal()
  } catch (err) {
    if (intentoActual !== intentoExtraccion) return
    errorAdjunto.value = 'No se pudo leer el archivo. Intenta con otro.'
    console.error('Error extrayendo archivo:', err)
  } finally {
    if (intentoActual === intentoExtraccion) {
      procesandoArchivo.value = false
    }
  }
}

async function onArchivoSeleccionado(event: Event) {
  const input = event.target as HTMLInputElement
  const archivo = input.files?.[0]
  input.value = ''
  if (!archivo) return
  await procesarArchivo(archivo)
}

// Arrastrar y soltar un PDF sobre el chat (aparte del botón "Adjuntar").
// El contador evita el parpadeo del overlay al pasar sobre elementos hijos
// (dragleave se dispara también al entrar a un hijo, no solo al salir).
const isDraggingFile = ref(false)
let dragDepth = 0

function onDragEnter(event: DragEvent) {
  if (!event.dataTransfer?.types.includes('Files')) return
  dragDepth++
  isDraggingFile.value = true
}

function onDragLeave() {
  dragDepth = Math.max(0, dragDepth - 1)
  if (dragDepth === 0) isDraggingFile.value = false
}

async function onDrop(event: DragEvent) {
  dragDepth = 0
  isDraggingFile.value = false
  const archivo = event.dataTransfer?.files?.[0]
  if (!archivo) return
  await procesarArchivo(archivo)
}

function quitarAdjunto() {
  store.quitarAdjunto()
  limpiarSugerencias()
  reiniciarEdicion()
}

onUnmounted(() => {
  intentoExtraccion++
  if (debounceEdicionId !== null) clearTimeout(debounceEdicionId)
  // El documento adjunto es de esta sesión de Consultas — si el usuario
  // navega a otra pestaña (Contratos, Normas) y vuelve, no debe seguir
  // apareciendo (store.archivoAdjunto es estado de Pinia, sobrevive a la
  // navegación por sí solo si no se limpia acá).
  quitarAdjunto()
})

function formatTimestamp(ts: Date | string): string {
  try {
    const d = new Date(ts)
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  } catch {
    return ''
  }
}

function formatMessage(content: string): string {
  return content
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/^# (.*$)/gm, '<h1>$1</h1>')
    .replace(/^## (.*$)/gm, '<h2>$1</h2>')
    .replace(/^### (.*$)/gm, '<h3>$1</h3>')
    .replace(/\n/g, '<br>')
}

async function enviarConsulta() {
  const mensaje = pregunta.value.trim() ||
    (store.archivoAdjunto ? 'Analiza este contrato y sus riesgos.' : '')

  if (mensaje) {
    // Misma intención, un solo disparo: si este mensaje pide análisis de
    // riesgos, se genera el panel de sugerencias estructurado junto con la
    // respuesta del chat — en paralelo, no como un segundo paso manual.
    // Se evalúa ANTES de llamar a store.enviarConsulta porque esa llamada
    // consume/limpia analisisPendiente al terminar.
    const pideAnalisisDeRiesgos = !!store.archivoAdjunto &&
      (store.analisisPendiente || esSolicitudDeAnalisisDeRiesgos(mensaje))

    try {
      const tareas: Promise<unknown>[] = [store.enviarConsulta(mensaje)]
      if (pideAnalisisDeRiesgos) tareas.push(generarSugerencias())
      await Promise.all(tareas)
      pregunta.value = ''
      await nextTick()
      if (messagesBox.value) messagesBox.value.scrollTop = messagesBox.value.scrollHeight
    } catch (error) {
      console.error('Error al enviar consulta:', error)
    }
  }
}

async function volverAAnalizar() {
  flushEdicionPendiente()
  store.volverAAnalizar()
  if (!pregunta.value.trim()) {
    pregunta.value = 'Analiza este contrato de nuevo.'
  }
  await enviarConsulta()
}

onMounted(() => {
  store.iniciarSesion()
  void nextTick().then(() => {
    if (messagesBox.value) messagesBox.value.scrollTop = messagesBox.value.scrollHeight
    // El watch(documentoHtml, ..., { immediate: true }) corre durante el
    // setup del componente, antes de que el ref del template exista —
    // si ya había un documento adjunto al montar la página (ej. se
    // navegó de vuelta a Consultas), el panel editable se queda vacío
    // sin esta sincronización explícita post-mount.
    sincronizarPanelEditable(documentoHtml.value)
  })
})

watch(mensajes, async () => {
  await nextTick()
  if (messagesBox.value) messagesBox.value.scrollTop = messagesBox.value.scrollHeight
}, { deep: true })
</script>

<style scoped>
/* ==============================
   Paleta oscura azul de esta página — variables propias, con prefijo lc-,
   definidas solo dentro de .consultas-page. No se tocan las variables
   globales (--surface, --bg, etc. en src/css/app.scss), así que el resto
   de la app sigue con el tema claro de siempre. Distinta de la paleta
   cálida/terracota de Contratos a propósito — un azul noche elegante,
   con la terracota de marca como acento cálido puntual (ver
   --lc-accent-warm, usado en detalles chicos, no como color base).
   ============================== */
.consultas-page {
  --lc-bg: #10151f;
  --lc-surface: #182234;
  --lc-surface-alt: #131b29;
  --lc-surface-sunken: #0c111a;
  --lc-border: rgba(255, 255, 255, 0.08);
  --lc-border-strong: rgba(255, 255, 255, 0.16);
  --lc-text: #eef1f7;
  --lc-text-muted: #a9b4c7;
  --lc-text-faint: #78839c;
  --lc-accent: #5B8DEF;
  --lc-accent-hover: #4874D1;
  --lc-accent-soft: rgba(91, 141, 239, 0.14);
  --lc-accent-soft-strong: rgba(91, 141, 239, 0.26);
  --lc-accent-warm: #D97A4D;
  --lc-accent-warm-soft: rgba(217, 122, 77, 0.16);

  /* El max-width:none real vive en ".q-page.consultas-page" más abajo —
     acá no alcanza, empata en especificidad con la regla global ".q-page"
     de MainLayout.vue (max-width:1400px) y puede perder según el orden de
     carga de cada archivo. */
  animation: floatUp 0.5s ease-out both;
  display: flex;
  flex-direction: column;
  /* 94px = el padding vertical de .q-page en MainLayout.vue (34px arriba +
     60px abajo). Sin fijar esta altura, el encabezado + el chat empujan el
     contenido más allá del viewport y es la PÁGINA la que hace scroll,
     arrastrando el composer con ella — en vez de quedarse quieto abajo
     mientras solo se desplazan los mensajes. */
  height: calc(100vh - 94px);
  min-height: 560px;
  overflow: hidden;
}

/* .q-page trae max-width:1400px + margin:0 auto de MainLayout.vue (regla
   compartida por toda la app) — sin anularla acá, en pantallas anchas se
   ve el fondo claro de .page-container detrás del área oscura (mismo bug
   ya resuelto en ContratosPage.vue). Mayor especificidad que ".q-page"
   (dos clases contra una) para que gane sin tocar esa regla compartida. */
.q-page.consultas-page {
  background: var(--lc-bg);
  max-width: none;
  margin: 0;
}

@keyframes floatUp {
  from { opacity: 0; transform: translateY(14px); }
  to   { opacity: 1; transform: translateY(0); }
}

@keyframes blink {
  0%   { opacity: 0.2; transform: translateY(0); }
  50%  { opacity: 1;   transform: translateY(-3px); }
  100% { opacity: 0.2; transform: translateY(0); }
}

.page-header {
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  margin-bottom: 16px;
  padding-bottom: 14px;
  border-bottom: 1px solid var(--lc-border);
  text-align: center;
  transition: opacity 0.25s ease, transform 0.25s ease, margin-bottom 0.25s ease, padding-bottom 0.25s ease;
}

/* Al bajar en el chat, el encabezado se encoge y atenúa en vez de ocupar
   su espacio completo todo el tiempo (ver onMessagesScroll). */
.page-header--compact {
  opacity: 0.4;
  transform: scale(0.92);
  margin-bottom: 6px;
  padding-bottom: 8px;
}

.page-header--compact:hover {
  opacity: 0.9;
}

.section-icon-wrap {
  width: 44px;
  height: 44px;
  border-radius: 13px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  box-shadow: inset 0 0 0 1px var(--lc-accent-soft-strong);
  transition: width 0.25s ease, height 0.25s ease;
}

.section-icon-wrap svg {
  width: 22px;
  height: 22px;
}

.icon-blue { background: var(--lc-accent-soft); }

.page-title {
  font-family: 'Fraunces', 'EB Garamond', serif;
  font-optical-sizing: auto;
  font-size: 1.7rem;
  font-weight: 600;
  letter-spacing: -0.01em;
  margin: 0;
  color: var(--lc-text);
}

.page-subtitle {
  margin: 4px 0 0;
  color: var(--lc-text-muted);
  font-size: 1rem;
}

/* Ya no hace falta un tope de ancho especial acá — la base
   (.consultas-page) ya no tiene max-width, así que este modificador
   quedaría de más (o peor, constreñiría el ancho justo cuando hay más
   contenido al costado). Se deja la clase declarada (el template sigue
   agregándola) sin reglas, por si vuelve a necesitarse. */

.consultas-layout {
  flex: 1;
  min-height: 0;
  display: flex;
}

.consultas-layout--split {
  gap: 20px;
}

.consultas-layout--split .chat-wrapper {
  min-width: 360px;
}

/* Sin card: sin fondo propio, borde ni sombra — el chat vive directo
   sobre el fondo de la página (misma paleta), en vez de sentirse
   "encerrado" dentro de un recuadro aparte. Un padding lateral generoso
   (en vez del borde de una tarjeta) es lo que le da aire. */
.chat-wrapper {
  flex: 1;
  display: flex;
  flex-direction: column;
  position: relative;
  height: 100%;
  min-height: 0;
  padding: 8px 4vw 0;
}

/* Overlay al arrastrar un archivo sobre el chat */
.drop-overlay {
  position: absolute;
  inset: 0;
  z-index: 5;
  background: rgba(16, 21, 31, 0.92);
  border: 2px dashed var(--lc-accent);
  border-radius: var(--border-radius);
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: none;
}

.drop-overlay-content {
  text-align: center;
  color: var(--lc-accent);
  font-family: 'Figtree', sans-serif;
  font-weight: 600;
}

.drop-overlay-content svg { margin-bottom: 8px; }

/* Documento: la pieza grande, protagonista — previsualización tipo Word. */
.documento-panel {
  flex: 1.7;
  min-width: 520px;
  max-width: 800px;
  background: var(--surface-alt);
  border: 1px solid rgba(27, 27, 30, 0.08);
  border-radius: var(--border-radius);
  box-shadow: var(--shadow-light);
  overflow: hidden;
  display: flex;
  flex-direction: column;
  height: 100%;
}

.documento-panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 10px;
  padding: 12px 20px;
  border-bottom: 1px solid rgba(27, 27, 30, 0.08);
  font-family: 'Figtree', sans-serif;
  background: #fff;
  flex-shrink: 0;
}

.documento-panel-titulo {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
  font-size: 0.9rem;
  color: var(--ink);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.documento-panel-acciones {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-shrink: 0;
}

.documento-tabs {
  display: flex;
  background: var(--surface-alt);
  border-radius: var(--border-radius-small);
  padding: 3px;
  gap: 2px;
}

.documento-tab {
  background: none;
  border: none;
  padding: 6px 12px;
  border-radius: 6px;
  font-family: inherit;
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--text-secondary);
  cursor: pointer;
  transition: background-color 0.18s, color 0.18s;
}

.documento-tab:hover { color: var(--ink); }

.documento-tab--active {
  background: #fff;
  color: var(--accent);
  box-shadow: var(--shadow-light);
}

.documento-descargar {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: var(--ink);
  color: #fff;
  border: none;
  border-radius: var(--border-radius-small);
  padding: 8px 14px;
  font-family: inherit;
  font-size: 0.8rem;
  font-weight: 600;
  cursor: pointer;
  transition: background-color 0.18s;
}

.documento-descargar:hover:not(:disabled) { background: var(--ink-soft); }
.documento-descargar:disabled { opacity: 0.6; cursor: not-allowed; }

.documento-abrir-word-wrap {
  display: flex;
  align-items: center;
  gap: 8px;
}

.documento-abrir-word {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: #fff;
  color: var(--ink);
  border: 1px solid var(--border-color, #d8d8d8);
  border-radius: var(--border-radius-small);
  padding: 8px 14px;
  font-family: inherit;
  font-size: 0.8rem;
  font-weight: 600;
  cursor: pointer;
  transition: background-color 0.18s;
}

.documento-abrir-word:hover:not(:disabled) { background: #f4f4f4; }
.documento-abrir-word:disabled { opacity: 0.6; cursor: not-allowed; }

.documento-abrir-word-hint {
  font-size: 0.72rem;
  color: var(--text-secondary, #888);
}

.documento-abrir-word-error {
  font-size: 0.72rem;
  color: var(--negative, #c0392b);
}

.documento-panel-body {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 26px 30px 40px;
}

.documento-hint {
  font-family: 'Figtree', sans-serif;
  font-size: 0.85rem;
  color: var(--text-secondary);
  background: #fff;
  border: 1px solid rgba(27, 27, 30, 0.08);
  border-radius: var(--border-radius-small);
  padding: 10px 14px;
  margin-bottom: 18px;
}

.documento-hint-link {
  background: none;
  border: none;
  padding: 0;
  color: var(--accent);
  font-weight: 600;
  font-family: inherit;
  font-size: inherit;
  cursor: pointer;
  text-decoration: underline;
}

.documento-original {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 14px;
}

.documento-original-canvas-wrap {
  background: #fff;
  border: 1px solid rgba(27, 27, 30, 0.08);
  border-radius: var(--border-radius-small);
  box-shadow: var(--shadow-medium);
  padding: 10px;
  max-width: 100%;
  overflow: auto;
}

.documento-original-canvas-wrap canvas {
  display: block;
  max-width: 100%;
}

.documento-original-nav {
  display: flex;
  align-items: center;
  gap: 12px;
  font-family: 'Figtree', sans-serif;
  font-size: 0.85rem;
  color: var(--text-secondary);
}

.pdf-nav-btn {
  background: var(--surface-alt);
  border: none;
  border-radius: 6px;
  width: 28px;
  height: 28px;
  font-size: 1rem;
  line-height: 1;
  cursor: pointer;
  color: var(--ink);
  transition: background-color 0.18s;
}

.pdf-nav-btn:hover:not(:disabled) { background: rgba(27, 27, 30, 0.1); }
.pdf-nav-btn:disabled { opacity: 0.4; cursor: not-allowed; }

/* La "hoja" blanca, como un documento de Word */
.documento-page {
  background: #fff;
  border: 1px solid rgba(27, 27, 30, 0.08);
  border-radius: var(--border-radius-small);
  box-shadow: var(--shadow-medium);
  padding: 44px 48px;
}

.documento-texto {
  font-family: 'EB Garamond', serif;
  font-size: 1.08rem;
  line-height: 1.8;
  color: var(--ink);
}

.documento-texto :deep(p) {
  margin: 0 0 1.1em;
  text-align: justify;
}

.documento-texto :deep(p:last-child) { margin-bottom: 0; }

.documento-texto :deep(mark) {
  border-radius: 3px;
  padding: 1px 2px;
  cursor: pointer;
  font-family: inherit;
}

.documento-texto :deep(.hl-cambio) {
  background: #FDE68A;
  color: #4a3800;
}

.documento-texto :deep(.hl-riesgo) {
  text-decoration: underline wavy #C23B2E;
  text-decoration-thickness: 1.5px;
}

.documento-texto :deep(.hl-riesgo--alto) { background: #FBD5D0; color: #7a1d14; }
.documento-texto :deep(.hl-riesgo--medio) { background: #FCE3D6; color: #7a3d14; }
.documento-texto :deep(.hl-riesgo--bajo) { background: #FDEFD6; color: #6b4d14; }

.documento-texto--editable {
  outline: none;
  cursor: text;
  border-radius: 4px;
  transition: box-shadow 0.15s;
}

.documento-texto--editable:focus {
  box-shadow: 0 0 0 3px var(--accent-soft);
}

/* Sugerencias: riel angosto al costado del documento, sin pestañas */
.sugerencias-rail {
  width: 300px;
  flex-shrink: 0;
  background: var(--lc-surface);
  border: 1px solid var(--lc-border);
  border-radius: var(--border-radius);
  box-shadow: 0 8px 26px -12px rgba(0, 0, 0, 0.5);
  overflow: hidden;
  display: flex;
  flex-direction: column;
  height: 100%;
}

.sugerencias-rail-header {
  padding: 14px 16px;
  border-bottom: 1px solid var(--lc-border);
  font-family: 'Figtree', sans-serif;
  font-weight: 600;
  font-size: 0.86rem;
  color: var(--lc-text);
  flex-shrink: 0;
}

.sugerencias-rail-body {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 16px;
  background: var(--lc-surface-alt);
}

/* CTA "Descargar y abrir en Word" — único camino para editar, por eso va
   primero y con más peso visual que cualquier otra cosa del panel. */
.sugerencias-cta {
  flex-shrink: 0;
  padding: 16px;
  border-bottom: 1px solid var(--lc-border);
  background: var(--lc-surface-sunken);
}

.sugerencias-cta-btn {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  background: var(--lc-accent);
  color: #0d1220;
  border: none;
  border-radius: var(--border-radius-small);
  padding: 11px 14px;
  font-family: 'Figtree', sans-serif;
  font-size: 0.88rem;
  font-weight: 600;
  cursor: pointer;
  transition: background-color 0.18s;
}

.sugerencias-cta-btn:hover:not(:disabled) { background: var(--lc-accent-hover); color: #fff; }
.sugerencias-cta-btn:disabled { opacity: 0.6; cursor: not-allowed; }

.sugerencias-cta-hint {
  margin: 8px 0 0;
  font-size: 0.74rem;
  line-height: 1.4;
  color: var(--lc-text-faint);
}

/* Franja de métricas */
.sugerencias-metricas {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
  margin-bottom: 16px;
}

.metrica-bloque {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: 10px 4px;
  background: var(--lc-surface);
  border: 1px solid var(--lc-border);
  border-radius: var(--border-radius-small);
}

.metrica-numero {
  font-family: 'EB Garamond', serif;
  font-size: 1.5rem;
  font-weight: 600;
  line-height: 1;
  color: var(--lc-text);
}

.metrica-label {
  font-family: 'Figtree', sans-serif;
  font-size: 0.68rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  color: var(--lc-text-muted);
}

.metrica-bloque--alto .metrica-numero { color: #e2685a; }
.metrica-bloque--medio .metrica-numero { color: #dba24d; }
.metrica-bloque--bajo .metrica-numero { color: #5fb98a; }

.sugerencias-cargando {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 6px;
  padding: 36px 16px;
}

.sugerencias-cargando-titulo {
  font-family: 'EB Garamond', serif;
  font-size: 1.15rem;
  font-weight: 600;
  color: var(--lc-text);
  margin: 10px 0 0;
}

.sugerencias-cargando-sub {
  font-family: 'Figtree', sans-serif;
  font-size: 0.82rem;
  color: var(--lc-text-muted);
  margin: 0;
  max-width: 220px;
}

.sugerencias-error-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 6px;
  padding: 32px 16px;
  color: #e2685a;
}

.sugerencias-error-titulo {
  font-family: 'EB Garamond', serif;
  font-size: 1.1rem;
  font-weight: 600;
  color: var(--lc-text);
  margin: 8px 0 0;
}

.sugerencias-error-sub {
  font-family: 'Figtree', sans-serif;
  font-size: 0.82rem;
  color: var(--lc-text-muted);
  margin: 0;
  max-width: 220px;
}

.sugerencias-reintentar-btn {
  margin-top: 10px;
  background: var(--lc-accent);
  color: #0d1220;
  border: none;
  border-radius: var(--border-radius-small);
  padding: 8px 16px;
  font-family: 'Figtree', sans-serif;
  font-size: 0.82rem;
  font-weight: 600;
  cursor: pointer;
  transition: background-color 0.18s;
}

.sugerencias-reintentar-btn:hover { background: var(--lc-accent-hover); color: #fff; }

.pdf-panel-status {
  text-align: center;
  color: var(--text-secondary);
  font-family: 'Figtree', sans-serif;
  font-size: 0.88rem;
}

.pdf-panel-error { color: #C23B2E; }

@media (max-width: 1240px) {
  /* Con el documento y las sugerencias apilados debajo del chat (en vez de
     al costado), tres paneles a pantalla completa no caben en un solo
     viewport — se vuelve al scroll normal de la página en vez de forzar
     todo dentro de una altura fija. */
  .consultas-page {
    height: auto;
    min-height: 0;
    overflow: visible;
  }

  .consultas-layout--split {
    flex-direction: column;
  }

  .chat-wrapper {
    flex: none;
    height: 78vh;
    min-height: 560px;
  }

  .documento-panel {
    width: 100%;
    min-width: 0;
    max-width: none;
    height: 60vh;
  }

  .sugerencias-rail {
    width: 100%;
    height: 340px;
  }
}

/* Chat sin tarjeta ni header propio — el título de la página ya cumple ese
   rol, como en Claude/ChatGPT donde el panel de chat no lleva su propio
   marco. */
.messages-area {
  flex: 1;
  overflow-y: auto;
  padding: 4px 4px 16px;
  display: flex;
  flex-direction: column;
  gap: 22px;
  scrollbar-width: thin;
  scrollbar-color: var(--lc-border-strong) transparent;
}

/* Sin tarjeta blanca — solo una franja de acento a la izquierda, texto
   flotando directo sobre el fondo de la página. Bloque de texto simple,
   como dice el comentario del template, ahora sí sin caja alrededor. */
.msg-block--ai {
  max-width: 100%;
  border-left: 3px solid var(--lc-accent);
  padding: 4px 0 4px 18px;
}

.msg-block--user {
  display: flex;
  justify-content: flex-end;
}

.msg-bubble-user {
  max-width: 74%;
  background: var(--lc-accent);
  color: #0d1220;
  padding: 12px 16px;
  border-radius: 16px 16px 4px 16px;
  font-size: 0.95rem;
  font-weight: 500;
  line-height: 1.55;
  white-space: pre-wrap;
}

.msg-meta {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-family: 'Fraunces', 'EB Garamond', serif;
  font-size: 0.74rem;
  font-weight: 600;
  letter-spacing: 0.02em;
  margin-bottom: 9px;
}

.msg-meta--ai { color: var(--lc-accent); }

.msg-content {
  font-size: 1rem;
  line-height: 1.7;
  color: var(--lc-text);
}

.msg-refs {
  font-size: 0.8rem;
  color: var(--lc-text-faint);
  margin-top: 8px;
}

.formatted-message :deep(h1),
.formatted-message :deep(h2),
.formatted-message :deep(h3) {
  font-family: 'EB Garamond', serif;
  font-weight: 600;
  margin: 8px 0 4px;
  color: var(--lc-text);
}

.formatted-message :deep(strong) { font-weight: 600; color: var(--lc-text); }
.formatted-message :deep(em)     { font-style: italic; }

.msg-actions {
  display: flex;
  gap: 4px;
  margin-top: 8px;
}

.msg-action-btn {
  width: 28px;
  height: 28px;
  border-radius: var(--border-radius-small);
  background: none;
  border: none;
  color: var(--lc-text-faint);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background-color 0.18s, color 0.18s;
}

.msg-action-btn:hover {
  background: var(--lc-surface);
  color: var(--lc-text);
}

.typing-dots {
  display: inline-flex;
  gap: 6px;
  padding: 4px 0;
}

.typing-dots span {
  width: 8px;
  height: 8px;
  background: var(--lc-accent);
  border-radius: 50%;
  display: inline-block;
  opacity: 0.6;
  animation: blink 1s infinite;
}

.typing-dots span:nth-child(2) { animation-delay: 0.15s; }
.typing-dots span:nth-child(3) { animation-delay: 0.30s; }

/* Fuentes citadas */
.fuentes-block {
  margin-top: 10px;
  padding-top: 10px;
  border-top: 1px dashed var(--lc-border-strong);
}

.fuentes-label {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--lc-accent);
  background: var(--lc-accent-soft);
  border: 1px solid var(--lc-accent-soft-strong);
  padding: 6px 11px;
  border-radius: var(--border-radius-small);
  font-family: 'Figtree', sans-serif;
}

.fuentes-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 10px;
}

.fuente-card {
  background: var(--lc-surface);
  border: 1px solid var(--lc-border);
  border-left: 3px solid var(--lc-accent);
  border-radius: 8px;
  padding: 10px 12px;
}

.fuente-doc-name {
  display: block;
  font-size: 0.75rem;
  font-weight: 700;
  color: var(--lc-text);
  text-transform: uppercase;
  letter-spacing: 0.02em;
  margin-bottom: 5px;
}

.fuente-texto {
  font-size: 0.86rem;
  line-height: 1.55;
  color: var(--lc-text-muted);
  font-style: italic;
  margin: 0;
}

.input-area {
  padding: 8px 2px 0;
  flex-shrink: 0;
}

/* Composer tipo píldora, como Claude: todo en una sola fila redondeada. */
.composer-chip-row {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 8px;
}

.composer-reanalizar {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  background: none;
  border: none;
  color: var(--lc-accent);
  font-family: 'Figtree', sans-serif;
  font-size: 0.82rem;
  font-weight: 600;
  cursor: pointer;
  padding: 3px 4px;
  flex-shrink: 0;
}

.composer-reanalizar:hover:not(:disabled) { text-decoration: underline; }
.composer-reanalizar:disabled { opacity: 0.5; cursor: not-allowed; }

.composer-chip {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  background: var(--lc-accent-soft);
  color: var(--lc-accent);
  border-radius: var(--border-radius-small);
  padding: 6px 8px 6px 10px;
  font-family: 'Figtree', sans-serif;
  font-size: 0.82rem;
  font-weight: 600;
  max-width: 100%;
}

.composer-chip-remove {
  background: none;
  border: none;
  color: inherit;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2px;
  opacity: 0.75;
}

.composer-chip-remove:hover { opacity: 1; }

.adjunto-extrayendo {
  font-size: 0.85rem;
  color: var(--lc-text-muted);
  margin: 0 0 8px;
}

.adjunto-error {
  font-size: 0.85rem;
  color: var(--q-negative);
  margin: 0 0 8px;
}

.composer-pill {
  display: flex;
  align-items: flex-end;
  gap: 6px;
  background: var(--lc-surface);
  border: 1px solid var(--lc-border-strong);
  border-radius: 26px;
  padding: 7px 7px 7px 8px;
  box-shadow: 0 4px 18px -6px rgba(0, 0, 0, 0.45);
  transition: border-color 0.18s, box-shadow 0.18s;
}

.composer-pill:focus-within {
  border-color: var(--lc-accent);
  box-shadow: 0 0 0 3px var(--lc-accent-soft);
}

.plus-btn {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: var(--lc-surface-alt);
  color: var(--lc-text);
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: background-color 0.18s;
}

.plus-btn:hover:not(:disabled) { background: var(--lc-accent-soft); color: var(--lc-accent); }
.plus-btn:disabled { opacity: 0.5; cursor: not-allowed; }

.composer-textarea-pill { flex: 1; }

:deep(.composer-textarea-pill .q-field__control) {
  background: transparent !important;
  padding: 0 !important;
  min-height: unset !important;
}

:deep(.composer-textarea-pill .q-field__native) {
  color: var(--lc-text) !important;
  font-family: 'Figtree', sans-serif !important;
  font-size: 1rem !important;
  padding: 7px 0 !important;
  line-height: 1.45 !important;
  resize: none !important;
}

:deep(.composer-textarea-pill .q-field__native::placeholder) {
  color: var(--lc-text-faint) !important;
  opacity: 1 !important;
}

:deep(.composer-textarea-pill .q-field__bottom) { display: none !important; }

.ask-btn-round {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: var(--lc-accent);
  color: #0d1220;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: background-color 0.18s, transform 0.18s;
}

.ask-btn-round:hover:not(:disabled) { background: var(--lc-accent-hover); color: #fff; transform: scale(1.05); }
.ask-btn-round:disabled { opacity: 0.4; cursor: not-allowed; }

.toolbar-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: transparent;
  color: var(--lc-text-muted);
  border: none;
  border-radius: var(--border-radius-small);
  padding: 6px 9px;
  font-family: 'Figtree', sans-serif;
  font-size: 0.82rem;
  font-weight: 600;
  cursor: pointer;
  transition: background-color 0.18s, color 0.18s;
}

.toolbar-btn:hover:not(:disabled) {
  background: var(--surface-alt);
  color: var(--ink);
}

.toolbar-btn:disabled { opacity: 0.5; cursor: not-allowed; }

.ask-btn {
  background: var(--ink);
  color: #fff;
  border: none;
  border-radius: 999px;
  padding: 9px 20px;
  font-family: 'Figtree', sans-serif;
  font-size: 0.88rem;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  flex-shrink: 0;
  transition: background-color 0.18s, transform 0.18s;
}

.ask-btn:hover:not(:disabled) { background: var(--ink-soft); transform: scale(1.03); }
.ask-btn:disabled { opacity: 0.5; cursor: not-allowed; }

.sugerencias-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.sugerencia-card {
  background: var(--lc-surface);
  border: 1px solid var(--lc-border);
  border-radius: var(--border-radius-small);
  padding: 12px 14px;
}

.sugerencia-card--aplicada {
  background: var(--accent-soft);
  border-color: var(--accent-soft-strong);
}

.sugerencia-card-top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 8px;
}

.sugerencia-clausula {
  font-family: 'Figtree', sans-serif;
  font-size: 0.72rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  color: var(--lc-text-muted);
}

.riesgo-badge {
  flex-shrink: 0;
  font-family: 'Figtree', sans-serif;
  font-size: 0.68rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.02em;
  padding: 3px 8px;
  border-radius: 999px;
  white-space: nowrap;
}

.riesgo-badge--alto { background: rgba(226, 104, 90, 0.18); color: #f3a99e; }
.riesgo-badge--medio { background: rgba(219, 162, 77, 0.18); color: #e8c48c; }
.riesgo-badge--bajo { background: rgba(95, 185, 138, 0.18); color: #9adcb9; }
.riesgo-badge--cambio { background: var(--lc-accent-soft); color: var(--lc-accent); }

.sugerencia-explicacion {
  font-size: 0.85rem;
  line-height: 1.5;
  color: var(--lc-text);
  margin: 0 0 10px;
}

.sugerencia-explicacion strong {
  font-weight: 700;
}

.sugerencia-nuevo {
  font-size: 0.85rem;
  line-height: 1.5;
  color: var(--lc-text);
  background: var(--lc-accent-soft);
  border-left: 3px solid var(--lc-accent);
  border-radius: 4px;
  padding: 8px 10px;
  margin: 0 0 10px;
}

.sugerencia-original {
  font-size: 0.8rem;
  line-height: 1.5;
  font-style: italic;
  color: var(--lc-text-muted);
  margin: 0;
}

.sugerencia-error {
  font-size: 0.8rem;
  color: #C23B2E;
  margin: 0 0 8px;
}

.sugerencia-acciones {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

.sugerencia-descartar {
  background: none;
  border: 1px solid rgba(27, 27, 30, 0.14);
  color: var(--text-secondary);
  border-radius: var(--border-radius-small);
  padding: 6px 12px;
  font-family: 'Figtree', sans-serif;
  font-size: 0.8rem;
  font-weight: 600;
  cursor: pointer;
}

.sugerencia-descartar:hover { background: var(--surface-alt); }

.sugerencia-aplicar {
  background: var(--ink);
  color: #fff;
  border: none;
  border-radius: var(--border-radius-small);
  padding: 6px 12px;
  font-family: 'Figtree', sans-serif;
  font-size: 0.8rem;
  font-weight: 600;
  cursor: pointer;
}

.sugerencia-aplicar:hover { background: var(--ink-soft); }

.sugerencia-deshacer,
.sugerencia-reconsiderar {
  background: none;
  border: 1px solid rgba(27, 27, 30, 0.14);
  color: var(--text-secondary);
  border-radius: var(--border-radius-small);
  padding: 6px 12px;
  font-family: 'Figtree', sans-serif;
  font-size: 0.8rem;
  font-weight: 600;
  cursor: pointer;
}

.sugerencia-deshacer:hover,
.sugerencia-reconsiderar:hover { background: var(--surface-alt); }

.sugerencia-card--descartada {
  opacity: 0.55;
}

.sugerencia-descartada-label {
  font-size: 0.82rem;
  color: var(--text-secondary);
  margin: 0 0 10px;
}

.sugerencia-aplicada-label {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--accent);
  margin: 0;
}

.error-row {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 8px;
  justify-content: center;
}

.error-text {
  font-size: 0.88rem;
  color: var(--q-negative);
}

@media (max-width: 600px) {
  .chat-wrapper {
    height: 70vh;
    min-height: 420px;
  }

  .msg-bubble-user { max-width: 88%; }
}
</style>
