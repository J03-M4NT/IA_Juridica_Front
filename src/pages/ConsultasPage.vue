<template>
  <q-page class="consultas-page">

    <!-- Section header — se encoge y se atenúa al bajar en el chat, para
         devolverle espacio a la conversación sin perder el título del
         todo (ver onMessagesScroll). -->
    <div class="page-header" v-show="mensajes.length === 0" :class="{ 'page-header--compact': chatDesplazado }">
      <div class="section-icon-wrap icon-blue">
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#7EA2F2" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
        </svg>
      </div>
      <div>
        <h1 class="page-title">Consultas Jurídicas</h1>
        <p class="page-subtitle">Haz preguntas sobre leyes y normas peruanas</p>
      </div>
    </div>

    <div class="consultas-layout">

    <!-- Chat wrapper -->
    <div class="chat-wrapper">

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
              <div
                class="msg-content formatted-message"
                v-html="formatMessage(mensaje.contenido, mensaje.fuentes?.length ?? 0)"
                @click="onClickEnRespuesta($event, index)"
              ></div>
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

                <!-- Cada cita es un cuadro pequeño y cerrado; el texto solo se
                     muestra al hacer clic (en el cuadro o en su [n] dentro de
                     la respuesta), una cita abierta a la vez. -->
                <div class="fuentes-chips">
                  <button
                    v-for="(fuente, fi) in mensaje.fuentes"
                    :key="fi"
                    type="button"
                    class="fuente-chip"
                    :class="{ 'fuente-chip--abierta': citaAbierta[index] === fi }"
                    :aria-expanded="citaAbierta[index] === fi"
                    @click="alternarCita(index, fi)"
                  >
                    <span class="fuente-chip-num">{{ fi + 1 }}</span>
                    <span class="fuente-chip-nombre">
                      {{ fuente.nombreDocumento || 'Documento' }}<template v-if="fuente.numeroArticulo"> · Art. {{ fuente.numeroArticulo }}°{{ fuente.sufijoArticulo ? `-${fuente.sufijoArticulo}` : '' }}</template>
                    </span>
                  </button>
                </div>

                <Transition name="cita">
                  <div
                    v-if="citaAbierta[index] !== undefined && mensaje.fuentes[citaAbierta[index]!]"
                    :key="citaAbierta[index]"
                    class="fuente-detalle"
                  >
                    <div class="fuente-detalle-cabecera">
                      <span class="fuente-doc-name">
                        [{{ citaAbierta[index]! + 1 }}] {{ mensaje.fuentes[citaAbierta[index]!]!.nombreDocumento || 'Documento' }}<template v-if="mensaje.fuentes[citaAbierta[index]!]!.numeroArticulo"> · Artículo {{ mensaje.fuentes[citaAbierta[index]!]!.numeroArticulo }}°{{ mensaje.fuentes[citaAbierta[index]!]!.sufijoArticulo ? `-${mensaje.fuentes[citaAbierta[index]!]!.sufijoArticulo}` : '' }}</template>
                      </span>
                      <button type="button" class="fuente-detalle-cerrar" aria-label="Cerrar cita" @click="cerrarCita(index)">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                          <path d="M18 6L6 18M6 6l12 12"/>
                        </svg>
                      </button>
                    </div>
                    <p class="fuente-texto">&ldquo;{{ mensaje.fuentes[citaAbierta[index]!]!.texto }}&rdquo;</p>
                  </div>
                </Transition>
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
        <div class="composer-pill">
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
            :disabled="store.loading || !pregunta.trim()"
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

    </div>

  </q-page>
</template>

<script setup lang="ts">
import { ref, onMounted, nextTick, watch } from 'vue'
import { useConsultasStore } from '../stores/consultas-store'
import { storeToRefs } from 'pinia'

const store = useConsultasStore()
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

function formatTimestamp(ts: Date | string): string {
  try {
    const d = new Date(ts)
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  } catch {
    return ''
  }
}

// Cita abierta en cada mensaje (índice del mensaje → índice de la fuente).
// Las citas empiezan cerradas; se abre una a la vez por mensaje.
const citaAbierta = ref<Record<number, number>>({})

function alternarCita(indiceMensaje: number, indiceFuente: number) {
  if (citaAbierta.value[indiceMensaje] === indiceFuente) {
    cerrarCita(indiceMensaje)
  } else {
    citaAbierta.value = { ...citaAbierta.value, [indiceMensaje]: indiceFuente }
  }
}

function cerrarCita(indiceMensaje: number) {
  const copia = { ...citaAbierta.value }
  delete copia[indiceMensaje]
  citaAbierta.value = copia
}

// Clic en un [n] dentro del texto de la respuesta (ver formatMessage).
function onClickEnRespuesta(event: MouseEvent, indiceMensaje: number) {
  const boton = (event.target as HTMLElement).closest<HTMLElement>('[data-cita]')
  if (!boton) return
  alternarCita(indiceMensaje, Number(boton.dataset.cita) - 1)
}

// Al cambiar de conversación los índices de mensaje ya no corresponden.
watch(() => store.sesionActualId, () => { citaAbierta.value = {} })

// totalFuentes: los [n] que apuntan a una fuente existente se vuelven
// botoncitos que abren esa cita; el resto del texto no cambia.
function formatMessage(content: string, totalFuentes = 0): string {
  return content
    // Separadores (---, ***) y viñetas "* " de Gemini: se resuelven antes
    // que las negritas/cursivas, si no quedan asteriscos sueltos a la vista.
    .replace(/^\s*(?:-{3,}|\*{3,}|_{3,})\s*$/gm, '<hr>')
    .replace(/^(\s*)[*-]\s+/gm, '$1• ')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/^# (.*$)/gm, '<h1>$1</h1>')
    .replace(/^## (.*$)/gm, '<h2>$1</h2>')
    .replace(/^### (.*$)/gm, '<h3>$1</h3>')
    .replace(/^#{4,6} (.*$)/gm, '<h4>$1</h4>')
    .replace(/\[(\d+(?:\s*,\s*\d+)*)\]/g, (original: string, grupo: string) => {
      const numeros = grupo.split(',').map(s => Number(s.trim())).filter(n => n >= 1 && n <= totalFuentes)
      if (numeros.length === 0) return original
      return numeros
        .map(n => `<button type="button" class="cita-ref" data-cita="${n}" title="Ver cita ${n}">${n}</button>`)
        .join('')
    })
    .replace(/\n/g, '<br>')
}

async function enviarConsulta() {
  const mensaje = pregunta.value.trim()
  if (!mensaje) return

  try {
    await store.enviarConsulta(mensaje)
    pregunta.value = ''
    await nextTick()
    if (messagesBox.value) messagesBox.value.scrollTop = messagesBox.value.scrollHeight
  } catch (error) {
    console.error('Error al enviar consulta:', error)
  }
}

onMounted(() => {
  store.iniciarSesion()
  void nextTick().then(() => {
    if (messagesBox.value) messagesBox.value.scrollTop = messagesBox.value.scrollHeight
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


.consultas-layout {
  flex: 1;
  min-height: 0;
  display: flex;
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
.formatted-message :deep(h3),
.formatted-message :deep(h4) {
  font-family: 'EB Garamond', serif;
  font-weight: 600;
  margin: 8px 0 4px;
  color: var(--lc-text);
}

.formatted-message :deep(strong) { font-weight: 600; color: var(--lc-text); }
.formatted-message :deep(em)     { font-style: italic; }
.formatted-message :deep(hr)     { border: none; border-top: 1px solid var(--lc-border-strong); margin: 12px 0; }

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

/* Citas: cuadros pequeños y cerrados; el texto se abre al hacer clic. */
.fuentes-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 10px;
}

.fuente-chip {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  max-width: 100%;
  padding: 5px 10px 5px 5px;
  background: var(--lc-surface);
  border: 1px solid var(--lc-border-strong);
  border-radius: 8px;
  color: var(--lc-text-muted);
  font-family: 'Figtree', sans-serif;
  font-size: 0.78rem;
  font-weight: 600;
  cursor: pointer;
  transition: border-color 0.15s, background-color 0.15s, color 0.15s;
}

.fuente-chip:hover {
  border-color: var(--lc-accent);
  color: var(--lc-text);
}

.fuente-chip--abierta {
  border-color: var(--lc-accent);
  background: var(--lc-accent-soft);
  color: var(--lc-text);
}

.fuente-chip:focus-visible {
  outline: 2px solid var(--lc-accent);
  outline-offset: 2px;
}

.fuente-chip-num {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 20px;
  height: 20px;
  padding: 0 5px;
  border-radius: 5px;
  background: var(--lc-accent);
  color: #0d1220;
  font-size: 0.72rem;
  font-weight: 700;
  flex-shrink: 0;
}

.fuente-chip-nombre {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.fuente-detalle {
  margin-top: 8px;
  background: var(--lc-surface);
  border: 1px solid var(--lc-border);
  border-left: 3px solid var(--lc-accent);
  border-radius: 8px;
  padding: 10px 12px;
}

.fuente-detalle-cabecera {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 8px;
}

.fuente-detalle-cerrar {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  padding: 0;
  border: none;
  border-radius: 5px;
  background: none;
  color: var(--lc-text-faint);
  cursor: pointer;
}

.fuente-detalle-cerrar:hover {
  background: var(--lc-surface-alt);
  color: var(--lc-text);
}

/* Aparece suave en vez de "de golpe". */
.cita-enter-active,
.cita-leave-active {
  transition: opacity 0.18s ease, transform 0.18s ease;
}

.cita-enter-from,
.cita-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}

/* Los [n] dentro de la respuesta: botoncitos que abren su cita. */
.formatted-message :deep(.cita-ref) {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 18px;
  height: 18px;
  margin: 0 2px;
  padding: 0 4px;
  border: 1px solid var(--lc-accent-soft-strong);
  border-radius: 4px;
  background: var(--lc-accent-soft);
  color: var(--lc-accent);
  font-family: 'Figtree', sans-serif;
  font-size: 0.7rem;
  font-weight: 700;
  line-height: 1;
  vertical-align: 2px;
  cursor: pointer;
  transition: background-color 0.15s, color 0.15s;
}

.formatted-message :deep(.cita-ref:hover) {
  background: var(--lc-accent);
  color: #0d1220;
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

.composer-pill {
  display: flex;
  align-items: flex-end;
  gap: 6px;
  background: var(--lc-surface);
  border: 1px solid var(--lc-border-strong);
  border-radius: 26px;
  padding: 7px 7px 7px 20px;
  box-shadow: 0 4px 18px -6px rgba(0, 0, 0, 0.45);
  transition: border-color 0.18s, box-shadow 0.18s;
}

.composer-pill:focus-within {
  border-color: var(--lc-accent);
  box-shadow: 0 0 0 3px var(--lc-accent-soft);
}

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
