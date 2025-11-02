<template>
  <q-page class="consultas-page flex flex-center column">
    <!-- Background gradient -->
    <div class="page-background"></div>

    <!-- Centered Content -->
    <div class="content-wrapper flex flex-center column q-pa-lg">
      <!-- Title Section -->
      <div class="title-section text-center q-mb-xl">
        <h1 class="main-title text-h4 text-weight-bold q-mb-md">CONSULTAS JURÍDICAS</h1>
        <p class="subtitle text-body1 text-black-7">Haz preguntas sobre leyes y contratos</p>
      </div>

      <!-- Action Buttons Card (compact, transparent; button aligned to right of chat) -->
      <q-card class="actions-card modern-card q-pa-sm">
        <div class="actions-inner">
          <q-btn
            color="grey-8"
            icon="help"
            label="CENTRO DE AYUDA"
            @click="showHelp = true"
            class="action-button help-button"
            unelevated
            rounded
            size="md"
            style="min-width: 140px;"
          >
            <q-tooltip>Centro de ayuda</q-tooltip>
          </q-btn>
        </div>
      </q-card>

      <!-- Chat Section -->
      <div class="chat-section q-mt-xl">
        <q-card class="chat-card modern-card">
          <q-card-section class="chat-header">
            <h3 class="chat-title text-h6 text-weight-medium">Chat de Consultas</h3>
          </q-card-section>

          <!-- Messages Box -->
                  <q-card-section class="messages-container">
                    <div class="messages-box" ref="messagesBox">
                      <div v-for="(mensaje, index) in mensajes" :key="index" class="message-wrapper q-mb-lg">
                        <!-- AI Message -->
                        <div v-if="mensaje.esIA" class="ai-message">
                          <div class="avatar ai-avatar">
                            <img :src="aiLogo" alt="LEXIT AI" class="ai-logo" />
                          </div>
                          <div class="message-bubble ai-bubble">
                            <div class="message-meta">
                              <span class="sender">LEXIT AI</span>
                              <small class="timestamp">{{ formatTimestamp(mensaje.timestamp) }}</small>
                            </div>
                            <div class="message-content formatted-message" v-html="formatMessage(mensaje.contenido)"></div>
                            <div v-if="mensaje.referencias?.length" class="references text-caption text-black-6 q-mt-sm">
                              <strong>Referencias:</strong>
                              <div v-for="(ref, idx) in mensaje.referencias" :key="idx" class="q-mt-xs">{{ ref }}</div>
                            </div>
                          </div>
                        </div>
                        <!-- User Message -->
                        <div v-else class="user-message">
                          <div class="message-bubble user-bubble">
                            <div class="message-meta">
                              <small class="timestamp">{{ formatTimestamp(mensaje.timestamp) }}</small>
                            </div>
                            <div class="message-content">{{ mensaje.contenido }}</div>
                          </div>
                          <div class="avatar user-avatar">
                            <q-icon name="person" size="20px" />
                          </div>
                        </div>
                      </div>

                      <!-- Typing indicator when loading -->
                      <div v-if="store.loading" class="message-wrapper q-mb-lg typing-row">
                        <div class="ai-message">
                          <div class="avatar ai-avatar">
                            <img :src="aiLogo" alt="LEXIT AI" class="ai-logo" />
                          </div>
                          <div class="message-bubble ai-bubble typing-bubble">
                            <div class="typing-dots">
                              <span></span><span></span><span></span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <!-- Quick suggestions -->
                    <div class="quick-suggestions q-mt-sm">
                      <span class="hint">Sugerencias rápidas:</span>
                      <q-chip v-for="(s, i) in suggestions" :key="i" class="q-ml-sm" clickable @click="useSuggestion(s)">{{ s }}</q-chip>
                    </div>
                  </q-card-section>

          <!-- Input Area -->
          <q-card-section class="input-section">
            <q-form @submit.prevent="enviarConsulta" class="input-form">
              <q-input
                v-model="pregunta"
                placeholder="Escribe tu consulta legal aquí..."
                type="textarea"
                autogrow
                outlined
                :disable="store.loading"
                :max-height="120"
                class="chat-input"
                hide-bottom-space
              >
                <template v-slot:append>
                  <q-btn
                    round
                    flat
                    icon="send"
                    type="submit"
                    :loading="store.loading"
                    color="primary"
                    size="md"
                    @click="enviarConsulta"
                  />
                </template>
              </q-input>
            </q-form>
            <div v-if="store.error" class="error-message q-mt-md text-center">
              <q-icon name="error" color="negative" class="q-mr-xs" />
              <span class="text-negative text-body2">{{ store.error }}</span>
            </div>
          </q-card-section>
        </q-card>
      </div>
      <div class="input-area">
        <q-form @submit.prevent="enviarConsulta" class="input-form">
          <q-input
            v-model="pregunta"
            placeholder="Escribe tu consulta legal aquí..."
            type="textarea"
            autogrow
            outlined
            :disable="store.loading"
            class="input-textarea"
            hide-bottom-space
            no-error-icon
          >
            <template v-slot:append>
              <q-btn round icon="send" color="primary" size="md" class="send-btn" @click="enviarConsulta" :loading="store.loading" />
            </template>
          </q-input>
        </q-form>
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

// usa el logo SVG que está en src/assets/templates/logo.svg
const aiLogo: string = new URL('../assets/templates/logo.svg', import.meta.url).href;

const { mensajes } = storeToRefs(store);
const messagesBox = ref<HTMLElement | null>(null);

// Quick suggestion chips
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
  // Simple markdown-like formatting
  return content
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/^# (.*$)/gm, '<h1>$1</h1>')
    .replace(/^## (.*$)/gm, '<h2>$1</h2>')
    .replace(/^### (.*$)/gm, '<h3>$1</h3>')
    .replace(/\n/g, '<br>');
}

async function enviarConsulta() {
  console.log('Enviando consulta:', pregunta.value); // Debug log
  if (pregunta.value.trim()) {
    try {
      await store.enviarConsulta(pregunta.value);
      pregunta.value = '';

      // Scroll al final
      await nextTick();
      // scroll bottom
      if (messagesBox.value) {
        messagesBox.value.scrollTop = messagesBox.value.scrollHeight;
      }
    } catch (error) {
      console.error('Error al enviar consulta:', error);
    }
  }
}

onMounted(() => {
  store.limpiar();
  // ensure scroll to bottom on mount
  void nextTick().then(() => {
    if (messagesBox.value) messagesBox.value.scrollTop = messagesBox.value.scrollHeight;
  });
});

// watch mensajes to auto scroll when new messages arrive
import { watch } from 'vue';
watch(mensajes, async () => {
  await nextTick();
  if (messagesBox.value) messagesBox.value.scrollTop = messagesBox.value.scrollHeight;
}, { deep: true });
</script>

<style scoped>
.consultas-page {
  min-height: 100vh;
  position: relative;
  overflow-x: hidden;
  /* ensure the q-page default dark background doesn't show through */
  background: transparent !important;
}

/* selection styling: highlighted text should show black letters */
.consultas-page ::selection {
  background: rgba(255, 235, 255, 0.6);
  color: #000;
}

.page-background {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(135deg, #6b5fe6 0%, #7b3fc1 100%);
  z-index: -1;
}

.chat-header {
  background: #ffffff !important;
  border-bottom: 1px solid #e5e7eb;
  padding: 1.5rem 0;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
}

.header-icon {
  color: #1e40af !important;
  margin-right: 0.75rem;
}

.chat-title {
  font-size: 1.75rem !important;
  font-weight: 700 !important;
  color: #1e40af !important;
  margin: 0;
  letter-spacing: -0.025em;
}

.messages-area {
  flex: 1;
  padding: 1.5rem 0;
  overflow-y: auto;
}


/* Action Buttons Card */
  .actions-card {
    border-radius: 12px;
    box-shadow: none;
    backdrop-filter: none;
    -webkit-backdrop-filter: none;
    /* transparente para integrar con el header; el botón controla el visual */
    background: transparent;
    border: none;
    width: auto;
    padding: 0.25rem 0.5rem;
    display: block;
    margin: 0 0 12px 0; /* space below the actions area */
    text-align: left;
    position: static;
    z-index: 999;
  }

  .help-button { z-index: 1000; }

  .actions-inner {
    max-width: 800px; /* match chat-card max-width */
    margin: 0 auto;
    display: flex;
    justify-content: flex-end; /* align the button to the right edge of the chat */
    align-items: center;
  }

.message-row {
  display: flex;
  gap: 1rem;
  margin-bottom: 1.5rem;
  align-items: flex-start;
}

.ai-row {
  justify-content: flex-start;
}

.user-row {
  justify-content: flex-end;
}

.avatar {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  margin-top: 0.25rem;
  font-size: 1.25rem;
}


.chat-card {
  border-radius: 16px;
  box-shadow: 0 14px 48px rgba(68, 36, 120, 0.08);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  background: rgba(247, 242, 255, 0.98);
  border: 1px solid rgba(110, 60, 150, 0.12);
  overflow: hidden;
  position: relative;
  z-index: 1;
  margin-top: 0.5rem; /* ensure space between button and chat card */
}

.chat-header {
  /* reforzar el contraste del header con un morado más intenso */
  background: linear-gradient(135deg, #6b5fe6 0%, #7b3fc1 100%);
  color: #fff;
  padding: 1rem 1.5rem;
}

.message-content-wrapper {
  max-width: calc(100% - 3.5rem);
  min-width: 250px;
}

.message-card {
  border-radius: 1rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  transition: box-shadow 0.2s ease;
  max-width: 100%;
}

.message-card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12);
}

.ai-card {
  background: transparent !important;
  border: none !important;
}


.avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: rgba(255,255,255,0.9);
  border: 1px solid rgba(0,0,0,0.06);
}

.ai-avatar { margin-right: 12px; }
.user-avatar { margin-left: 12px; }

.ai-logo {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  object-fit: cover;
  display: block;
}

.ai-message {
  display: flex;
  align-items: flex-start;
  justify-content: flex-start;
  margin-right: 18%;
}
.user-message {
  display: flex;
  align-items: flex-end;
  justify-content: flex-end;
  margin-left: 18%;
}

.ai-card .message-content {
  line-height: 1.6;
  font-size: 1rem;
  color: #000000 !important;
  font-weight: 500;
  min-height: 20px;
  background: #ffffff !important;
  padding: 1rem !important;
  border-radius: 0.75rem !important;
  margin: 0.5rem 0 !important;
  opacity: 1 !important;
  visibility: visible !important;
  border: 2px solid #1e40af !important;
  display: block !important;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1) !important;
}


.ai-bubble {
  background: rgba(250, 247, 255, 0.98);
  color: #262626;
  border: 1px solid rgba(150, 110, 210, 0.14);
  box-shadow: 0 8px 18px rgba(100, 70, 170, 0.06);
}

.message-meta {
  display:flex;
  align-items:center;
  gap:8px;
  margin-bottom:6px;
}
.sender{ font-weight:600; font-size:0.85rem; color:#555; }
.timestamp{ color:#9aa0a6; font-size:0.72rem; }

  
.user-bubble {
  background: linear-gradient(135deg, #7b5ff8 0%, #6b3fd1 100%);
  color: white;
  box-shadow: 0 6px 18px rgba(95, 65, 170, 0.18);
}

.typing-bubble{ padding:10px 14px; }
.typing-dots{ display:inline-flex; gap:6px; }
.typing-dots span{ width:8px; height:8px; background:#b8c1ff; border-radius:50%; display:inline-block; opacity:0.6; animation: blink 1s infinite; }
.typing-dots span:nth-child(2){ animation-delay: 0.15s; }
.typing-dots span:nth-child(3){ animation-delay: 0.3s; }
@keyframes blink{ 0%{ opacity:0.2; transform:translateY(0);} 50%{ opacity:1; transform:translateY(-3px);} 100%{ opacity:0.2; transform:translateY(0);} }

.message-content {
  line-height: 1.5;
  font-size: 15px;
}

.message-content {
  line-height: 1.6;
  font-size: 1rem;
  color: #0f172a !important;
  font-weight: 400;
  min-height: 20px;
}

.user-card .message-content {
  color: #ffffff;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
}

.user-card .message-content a {
  color: #bfdbfe;
}

.welcome-message {
  text-align: center;
  padding: 3rem 1rem;
  color: #6b7280;
  background: #ffffff;
  border-radius: 1rem;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
  max-width: 500px;
  margin: 0 auto;
}

.welcome-message p {
  font-size: 1.1rem;
  margin: 0;
}

.input-area {
  /* Oculta la segunda instancia del input (duplicado) sin tocar la lógica JS.
     Se mantiene el input dentro del chat-card (input-section) visible. */
  display: none !important;
  background: #ffffff;
  border-top: 1px solid #e5e7eb;
  padding: 1.5rem;
  box-shadow: 0 -4px 6px -1px rgba(0, 0, 0, 0.1);
}

.quick-suggestions{ display:flex; align-items:center; gap:8px; flex-wrap:wrap; }
.quick-suggestions .hint{ color:#6b5f7f; font-size:0.9rem; font-weight:500; }
.quick-suggestions q-chip{ background: rgba(123,80,200,0.12); border: 1px solid rgba(123,80,200,0.22); color: #2b104b; }


.input-form {
  max-width: 800px;
  margin: 0 auto;
  display: flex;
  gap: 0.75rem;
  align-items: flex-end;
}

:deep(.input-textarea .q-field__control) {
  border-radius: 1rem !important;
  background: #ffffff !important;
  border: 2px solid #e5e7eb !important;
  transition: all 0.2s ease !important;
}

:deep(.input-textarea .q-field__control:focus) {
  border-color: #1e40af !important;
  box-shadow: 0 0 0 3px rgba(30, 64, 175, 0.1) !important;
}

:deep(.input-textarea .q-field__native) {
  color: #0f172a !important;
  font-size: 1rem !important;
}

:deep(.input-textarea .q-field__label) {
  color: #475569 !important;
}

:deep(.send-btn) {
  background: linear-gradient(135deg, #1e40af 0%, #1d4ed8 100%) !important;
  color: white !important;
  width: 44px !important;
  height: 44px !important;
  border-radius: 50% !important;
  box-shadow: 0 4px 12px rgba(30, 64, 175, 0.3) !important;
  transition: all 0.2s ease !important;
  margin-left: 8px !important;
}

:deep(.send-btn:hover) {
  transform: scale(1.05) !important;
  box-shadow: 0 6px 16px rgba(30, 64, 175, 0.4) !important;
}

:deep(.send-btn .q-icon) {
  font-size: 20px !important;
}

/* Dark mode */
:deep(.q-dark) {
  .actions-card,
  .chat-card {
    /* glass morado en modo oscuro para integrarse con el fondo púrpura */
    background: linear-gradient(180deg, rgba(90,55,140,0.08), rgba(60,30,90,0.08));
    border: 1px solid rgba(118, 75, 162, 0.18);
    box-shadow: 0 10px 34px rgba(8,6,20,0.5);
  }

  .chat-header{ background: linear-gradient(135deg, rgba(96,71,230,0.9), rgba(111,77,184,0.9)); }

  .ai-bubble {
    background: rgba(48, 40, 60, 0.94);
    color: #e9e7ff;
    border-color: rgba(118,75,162,0.22);
    box-shadow: 0 6px 18px rgba(32,20,70,0.45);
  }

  .chat-input {
    background: rgba(28, 20, 40, 0.86);
    border-color: rgba(118,75,162,0.18);
  }

  .references {
    border-color: rgba(118,75,162,0.18);
    color: #cfc6ee;
  }

  .input-section {
    border-color: rgba(118,75,162,0.18);
  }

  :deep(.q-dark .ai-card .q-card) {
    background: #1f2937 !important;
    border: none !important;
  }

  :deep(.q-dark .ai-card .q-card-section) {
    background: transparent !important;
    padding: 0 !important;
    color: #ffffff !important;
  }

  :deep(.q-dark .ai-card .message-content) {
    color: #ffffff !important;
    background: #374151 !important;
  }

  :deep(.q-dark .message-content *) {
    color: #ffffff !important;
  }

  :deep(.ai-card) {
    color: #ffffff !important;
  }

  .ai-card .message-content {
    color: #f9fafb !important;
    background: #374151 !important;
    border: 1px solid #4b5563 !important;
  }

  .message-content {
    color: #f8fafc !important;
  }

  .welcome-message {
    background: #334155;
    color: #cbd5e1;
  }

  .input-area {
    background: #1e293b;
    border-color: #475569;
    box-shadow: 0 -4px 6px -1px rgba(0, 0, 0, 0.3);
  }

  :deep(.input-textarea .q-field__control) {
    background: #475569 !important;
    border-color: #64748b !important;
    color: #f8fafc !important;
  }

  :deep(.input-textarea .q-field__control:focus) {
    border-color: #60a5fa !important;
    box-shadow: 0 0 0 3px rgba(96, 165, 250, 0.2) !important;
  }

  :deep(.input-textarea .q-field__native) {
    color: #f8fafc !important;
  }

  :deep(.send-btn) {
    background: linear-gradient(135deg, #1e40af 0%, #1d4ed8 100%) !important;
  }
}

/* Responsive */
@media (max-width: 768px) {
  .chat-container {
    padding: 0 0.5rem;
  }

  .messages-wrapper {
    padding: 0 0.5rem;
  }

  .message-row {
    gap: 0.75rem;
  }

  .avatar {
    width: 36px;
    height: 36px;
    font-size: 1rem;
  }

  .message-content-wrapper {
    max-width: calc(100% - 3rem);
  }

  .q-card-section {
    padding: 0.875rem 1rem !important;
  }

  .message-content {
    font-size: 0.95rem;
  }

  .input-area {
    padding: 1rem 0.5rem;
  }

  .input-form {
    gap: 0.5rem;
  }

  :deep(.send-btn) {
    width: 40px !important;
    height: 40px !important;
  }

  .chat-title {
    font-size: 1.5rem;
  }

  .welcome-message {
    padding: 2rem 0.5rem;
  }
}

@media (max-width: 480px) {
  .message-row {
    gap: 0.5rem;
  }

  .message-content-wrapper {
    max-width: calc(100% - 2.5rem);
  }

  .chat-header {
    padding: 1rem 0;
  }
}
</style>
