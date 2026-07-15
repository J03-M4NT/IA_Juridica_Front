<template>
  <q-page class="consultas-page">

    <!-- Section header -->
    <div class="page-header">
      <div class="section-icon-wrap icon-blue">
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#3f6fc9" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
        </svg>
      </div>
      <div>
        <h1 class="page-title">Consultas Jurídicas</h1>
        <p class="page-subtitle">Haz preguntas sobre leyes y contratos</p>
      </div>
    </div>

    <!-- Chat wrapper -->
    <div class="chat-wrapper">

      <!-- Chat card -->
      <div class="chat-card">

        <!-- Chat header -->
        <div class="chat-header">
          <span class="chat-header-title">Chat de Consultas</span>
          <button class="help-btn" @click="showHelp = true">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><path d="M12 17h.01"/>
            </svg>
            Centro de ayuda
          </button>
        </div>

        <!-- Messages area -->
        <div class="messages-area" ref="messagesBox">
          <div v-for="(mensaje, index) in mensajes" :key="index" class="message-wrapper">

            <!-- AI message -->
            <div v-if="mensaje.esIA" class="msg-row msg-row--ai">
              <img :src="aiLogo" alt="LEXIT AI" class="msg-avatar" />
              <div class="msg-bubble msg-bubble--ai">
                <div class="msg-meta msg-meta--ai">LEXIT AI · {{ formatTimestamp(mensaje.timestamp) }}</div>
                <div class="msg-content formatted-message" v-html="formatMessage(mensaje.contenido)"></div>
                <div v-if="mensaje.referencias?.length" class="msg-refs">
                  <strong>Referencias:</strong>
                  <div v-for="(ref, idx) in mensaje.referencias" :key="idx" class="q-mt-xs">{{ ref }}</div>
                </div>
              </div>
            </div>

            <!-- User message -->
            <div v-else class="msg-row msg-row--user">
              <div class="msg-bubble msg-bubble--user">
                <div class="msg-meta msg-meta--user">{{ formatTimestamp(mensaje.timestamp) }}</div>
                <div class="msg-content">{{ mensaje.contenido }}</div>
              </div>
            </div>

          </div>

          <!-- Typing indicator -->
          <div v-if="store.loading" class="msg-row msg-row--ai">
            <img :src="aiLogo" alt="LEXIT AI" class="msg-avatar" />
            <div class="msg-bubble msg-bubble--ai typing-bubble">
              <div class="typing-dots">
                <span></span><span></span><span></span>
              </div>
            </div>
          </div>
        </div>

        <!-- Suggestions -->
        <div class="suggestions-row">
          <span class="suggestions-label">Sugerencias:</span>
          <button
            v-for="(s, i) in suggestions"
            :key="i"
            class="suggestion-chip"
            @click="useSuggestion(s)"
          >{{ s }}</button>
        </div>

        <!-- Input area -->
        <div class="input-area">
          <div class="input-wrap">
            <q-input
              v-model="pregunta"
              placeholder="Escribe tu consulta legal aquí..."
              type="textarea"
              autogrow
              borderless
              :disable="store.loading"
              :max-height="120"
              class="chat-input"
              hide-bottom-space
              @keydown.enter.exact.prevent="enviarConsulta"
            />
            <button
              class="send-btn"
              :disabled="store.loading || !pregunta.trim()"
              @click="enviarConsulta"
            >
              <svg v-if="!store.loading" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">
                <path d="M22 2L11 13"/><path d="M22 2l-7 20-4-9-9-4 20-7z"/>
              </svg>
              <q-spinner v-else size="18px" color="white" />
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
import { ref, onMounted, nextTick } from 'vue';
import { useConsultasStore } from '../stores/consultas-store';
import { storeToRefs } from 'pinia';

const store = useConsultasStore();
const pregunta = ref('');
const showHelp = ref(false);

const aiLogo: string = new URL('../assets/logo.svg', import.meta.url).href;

const { mensajes } = storeToRefs(store);
const messagesBox = ref<HTMLElement | null>(null);

const suggestions = [
  '¿Cuáles son mis obligaciones en este contrato?',
  '¿Qué cláusulas representan mayor riesgo?',
  '¿Cómo puedo terminar este contrato anticipadamente?'
];

function useSuggestion(s: string) {
  pregunta.value = s;
  void enviarConsulta();
}

function formatTimestamp(ts: Date | string): string {
  try {
    const d = new Date(ts);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
}

function formatMessage(content: string): string {
  return content
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/^# (.*$)/gm, '<h1>$1</h1>')
    .replace(/^## (.*$)/gm, '<h2>$1</h2>')
    .replace(/^### (.*$)/gm, '<h3>$1</h3>')
    .replace(/\n/g, '<br>');
}

async function enviarConsulta() {
  if (pregunta.value.trim()) {
    try {
      await store.enviarConsulta(pregunta.value);
      pregunta.value = '';
      await nextTick();
      if (messagesBox.value) messagesBox.value.scrollTop = messagesBox.value.scrollHeight;
    } catch (error) {
      console.error('Error al enviar consulta:', error);
    }
  }
}

onMounted(() => {
  store.iniciarSesion();
  void nextTick().then(() => {
    if (messagesBox.value) messagesBox.value.scrollTop = messagesBox.value.scrollHeight;
  });
});

import { watch } from 'vue';
watch(mensajes, async () => {
  await nextTick();
  if (messagesBox.value) messagesBox.value.scrollTop = messagesBox.value.scrollHeight;
}, { deep: true });
</script>

<style scoped>
.consultas-page {
  max-width: 860px;
  margin: 0 auto;
  animation: floatUp 0.5s ease-out both;
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

/* ==============================
   Section header
   ============================== */
.page-header {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 22px;
  text-align: left;
}

.section-icon-wrap {
  width: 52px;
  height: 52px;
  border-radius: 15px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.icon-blue { background: rgba(79, 127, 214, 0.13); }

.page-title {
  font-family: 'EB Garamond', serif;
  font-size: 2rem;
  font-weight: 600;
  margin: 0;
  color: #16161a;
}

.page-subtitle {
  margin: 2px 0 0;
  color: #6a6a72;
  font-size: 1rem;
}

/* ==============================
   Chat card
   ============================== */
.chat-wrapper {
  display: flex;
  flex-direction: column;
}

.chat-card {
  background: #fff;
  border: 1px solid rgba(27, 27, 30, 0.08);
  border-radius: 20px;
  box-shadow: 0 4px 18px rgba(27, 27, 30, 0.06);
  overflow: hidden;
  display: flex;
  flex-direction: column;
  height: 580px;
}

/* ==============================
   Chat header
   ============================== */
.chat-header {
  padding: 16px 22px;
  border-bottom: 1px solid rgba(27, 27, 30, 0.07);
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-shrink: 0;
}

.chat-header-title {
  font-family: 'EB Garamond', serif;
  font-size: 1.2rem;
  font-weight: 600;
  color: #16161a;
}

.help-btn {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  font-size: 0.85rem;
  font-weight: 500;
  color: #55555c;
  background: #FAFAF7;
  border: 1px solid rgba(27, 27, 30, 0.08);
  padding: 7px 13px;
  border-radius: 9px;
  cursor: pointer;
  font-family: 'Figtree', sans-serif;
  transition: background 0.2s;
}

.help-btn:hover { background: rgba(27, 27, 30, 0.05); }

/* ==============================
   Messages area
   ============================== */
.messages-area {
  flex: 1;
  overflow-y: auto;
  padding: 22px;
  display: flex;
  flex-direction: column;
  gap: 18px;
  scrollbar-width: thin;
  scrollbar-color: rgba(27,27,30,0.14) transparent;
}

.msg-row {
  display: flex;
  align-items: flex-start;
  gap: 11px;
}

.msg-row--ai  { max-width: 82%; margin-right: auto; }
.msg-row--user { max-width: 78%; margin-left: auto; flex-direction: row-reverse; }

.msg-avatar {
  width: 38px;
  height: 38px;
  border-radius: 50%;
  border: 1px solid rgba(27, 27, 30, 0.08);
  padding: 3px;
  background: #fff;
  flex-shrink: 0;
  object-fit: cover;
}

.msg-bubble {
  padding: 13px 16px;
  border-radius: 4px 16px 16px 16px;
}

.msg-bubble--ai {
  background: #FAFAF7;
  border: 1px solid rgba(27, 27, 30, 0.07);
}

.msg-bubble--user {
  background: #4f7fd6;
  border-radius: 16px 4px 16px 16px;
}

.msg-meta {
  font-size: 0.72rem;
  font-weight: 600;
  margin-bottom: 4px;
}

.msg-meta--ai   { color: #9a9aa2; }
.msg-meta--user { color: rgba(255, 255, 255, 0.85); }

.msg-content {
  font-size: 0.95rem;
  line-height: 1.6;
  color: #3a3a40;
}

.msg-bubble--user .msg-content { color: #fff; }

.msg-refs {
  font-size: 0.8rem;
  color: #9a9aa2;
  margin-top: 8px;
}

/* Formatted markdown */
.formatted-message :deep(h1),
.formatted-message :deep(h2),
.formatted-message :deep(h3) {
  font-family: 'EB Garamond', serif;
  font-weight: 600;
  margin: 8px 0 4px;
  color: #16161a;
}

.formatted-message :deep(strong) { font-weight: 600; }
.formatted-message :deep(em)     { font-style: italic; }

/* Typing dots */
.typing-bubble { padding: 13px 16px; }

.typing-dots {
  display: inline-flex;
  gap: 6px;
}

.typing-dots span {
  width: 8px;
  height: 8px;
  background: #4f7fd6;
  border-radius: 50%;
  display: inline-block;
  opacity: 0.6;
  animation: blink 1s infinite;
}

.typing-dots span:nth-child(2) { animation-delay: 0.15s; }
.typing-dots span:nth-child(3) { animation-delay: 0.30s; }

/* ==============================
   Suggestions
   ============================== */
.suggestions-row {
  padding: 12px 22px 6px;
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  flex-shrink: 0;
}

.suggestions-label {
  font-size: 0.82rem;
  color: #9a9aa2;
  font-weight: 500;
}

.suggestion-chip {
  font-size: 0.82rem;
  color: #3f6fc9;
  background: rgba(79, 127, 214, 0.10);
  border: 1px solid rgba(79, 127, 214, 0.24);
  padding: 6px 12px;
  border-radius: 999px;
  cursor: pointer;
  font-family: 'Figtree', sans-serif;
  transition: background 0.2s, color 0.2s;
}

.suggestion-chip:hover {
  background: #4f7fd6;
  color: #fff;
}

/* ==============================
   Input area
   ============================== */
.input-area {
  padding: 14px 22px 18px;
  border-top: 1px solid rgba(27, 27, 30, 0.07);
  flex-shrink: 0;
}

.input-wrap {
  display: flex;
  align-items: flex-end;
  gap: 10px;
  background: #FAFAF7;
  border: 1px solid rgba(27, 27, 30, 0.12);
  border-radius: 14px;
  padding: 8px 8px 8px 15px;
}

.chat-input {
  flex: 1;
}

:deep(.chat-input .q-field__control) {
  background: transparent !important;
  padding: 0 !important;
  min-height: unset !important;
}

:deep(.chat-input .q-field__native) {
  color: #1b1b1e !important;
  font-family: 'Figtree', sans-serif !important;
  font-size: 0.98rem !important;
  padding: 7px 0 !important;
  line-height: 1.4 !important;
  resize: none !important;
}

:deep(.chat-input .q-field__bottom) { display: none !important; }

.send-btn {
  width: 42px;
  height: 42px;
  border-radius: 11px;
  background: #4f7fd6;
  color: #fff;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  box-shadow: 0 3px 10px rgba(79, 127, 214, 0.40);
  transition: transform 0.18s;
}

.send-btn:hover:not(:disabled) { transform: scale(1.05); }
.send-btn:disabled { opacity: 0.5; cursor: not-allowed; }

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

/* ==============================
   Responsive
   ============================== */
@media (max-width: 600px) {
  .chat-card {
    height: 520px;
    border-radius: 16px;
  }

  .msg-row--ai  { max-width: 92%; }
  .msg-row--user { max-width: 88%; }
}
</style>
