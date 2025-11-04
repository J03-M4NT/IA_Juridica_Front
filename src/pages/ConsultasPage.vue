<template>
  <q-page class="consultas-page flex flex-center column fade-in">
    <!-- Background gradient -->
    <div class="page-background"></div>

    <!-- Centered Content -->
    <div class="content-wrapper flex flex-center column q-pa-lg">
      <!-- Title Section -->
      <div class="title-section text-center q-mb-xl">
        <h1 class="main-title text-h4 text-weight-bold q-mb-md">CONSULTAS JURÍDICAS</h1>
        <p class="subtitle text-body1 text-grey-7">Haz preguntas sobre leyes y contratos</p>
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
              <div v-for="(mensaje, index) in mensajes" :key="index" class="message-wrapper q-mb-lg fade-in">
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
                    <div v-if="mensaje.referencias?.length" class="references text-caption text-grey-7 q-mt-sm">
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
              <q-chip v-for="(s, i) in suggestions" :key="i" class="q-ml-sm suggestion-chip" clickable @click="useSuggestion(s)">{{ s }}</q-chip>
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
                    class="send-btn"
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
  background: var(--background-color) !important;
}

/* selection styling: highlighted text should show black letters */
.consultas-page ::selection {
  background: rgba(0, 123, 255, 0.2);
  color: var(--text-color);
}

.page-background {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  z-index: -1;
}

.chat-header {
  background: var(--card-background) !important;
  border-bottom: 1px solid var(--border-color);
  padding: 1.5rem 0;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: var(--shadow-light);
}

.chat-title {
  font-size: 1.75rem !important;
  font-weight: 700 !important;
  color: var(--primary-color) !important;
  margin: 0;
  letter-spacing: -0.025em;
}

/* Action Buttons Card */
.actions-card {
  border-radius: var(--border-radius);
  box-shadow: none;
  backdrop-filter: none;
  -webkit-backdrop-filter: none;
  background: transparent;
  border: none;
  width: auto;
  padding: 0.25rem 0.5rem;
  display: block;
  margin: 0 0 12px 0;
  text-align: left;
  position: static;
  z-index: 999;
}

.help-button {
  z-index: 1000;
  border-radius: var(--border-radius-small) !important;
  transition: all 0.3s ease;
}

.help-button:hover {
  background: rgba(0, 123, 255, 0.1) !important;
  transform: translateY(-1px);
  box-shadow: var(--shadow-light) !important;
}

.actions-inner {
  max-width: 800px;
  margin: 0 auto;
  display: flex;
  justify-content: flex-end;
  align-items: center;
}

.chat-card {
  border-radius: var(--border-radius);
  box-shadow: var(--shadow-medium);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  background: var(--card-background);
  border: 1px solid var(--border-color);
  overflow: hidden;
  position: relative;
  z-index: 1;
  margin-top: 0.5rem;
  transition: all 0.3s ease;
}

.chat-card:hover {
  box-shadow: var(--shadow-heavy);
}

.chat-header {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: #fff;
  padding: 1rem 1.5rem;
}

.avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: var(--card-background);
  border: 1px solid var(--border-color);
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

.ai-bubble {
  background: #f8f9fa !important;
  color: #212529 !important;
  border: 1px solid #e9ecef !important;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08) !important;
  border-radius: var(--border-radius-small);
  padding: 1rem;
  margin: 0.5rem 0;
  transition: all 0.3s ease;
}

.ai-bubble:hover {
  box-shadow: var(--shadow-medium);
}

.message-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 6px;
}

.sender {
  font-weight: 600;
  font-size: 0.85rem;
  color: var(--secondary-color);
}

.timestamp {
  color: var(--secondary-color);
  font-size: 0.72rem;
}

.user-bubble {
  background: var(--primary-color);
  color: white;
  box-shadow: var(--shadow-medium);
  border-radius: var(--border-radius-small);
  padding: 1rem;
  margin: 0.5rem 0;
}

.typing-bubble {
  padding: 10px 14px;
}

.typing-dots {
  display: inline-flex;
  gap: 6px;
}

.typing-dots span {
  width: 8px;
  height: 8px;
  background: var(--primary-color);
  border-radius: 50%;
  display: inline-block;
  opacity: 0.6;
  animation: blink 1s infinite;
}

.typing-dots span:nth-child(2) {
  animation-delay: 0.15s;
}

.typing-dots span:nth-child(3) {
  animation-delay: 0.3s;
}

@keyframes blink {
  0% { opacity: 0.2; transform: translateY(0); }
  50% { opacity: 1; transform: translateY(-3px); }
  100% { opacity: 0.2; transform: translateY(0); }
}

.message-content {
  line-height: 1.6;
  font-size: 1rem;
  color: var(--text-color) !important;
  font-weight: 400;
  min-height: 20px;
}

.quick-suggestions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.quick-suggestions .hint {
  color: var(--secondary-color);
  font-size: 0.9rem;
  font-weight: 500;
}

.suggestion-chip {
  background: rgba(0, 123, 255, 0.1);
  border: 1px solid rgba(0, 123, 255, 0.2);
  color: var(--primary-color);
  transition: all 0.3s ease;
}

.suggestion-chip:hover {
  background: var(--primary-color) !important;
  color: white !important;
  transform: translateY(-1px);
  box-shadow: var(--shadow-light);
}

.input-section {
  background: var(--card-background);
  border-top: 1px solid var(--border-color);
  padding: 1.5rem;
  box-shadow: 0 -4px 6px -1px rgba(0, 0, 0, 0.1);
}

.input-form {
  max-width: 800px;
  margin: 0 auto;
  display: flex;
  gap: 0.75rem;
  align-items: flex-end;
}

.chat-input {
  flex: 1;
  background: var(--card-background) !important;
  border-color: var(--border-color) !important;
  color: var(--text-color) !important;
}

.chat-input :deep(.q-field__control) {
  background: var(--card-background) !important;
  border-color: var(--border-color) !important;
  color: var(--text-color) !important;
}

.chat-input :deep(.q-field__native) {
  color: var(--text-color) !important;
  background: transparent !important;
}

.chat-input :deep(.q-field__label) {
  color: var(--secondary-color) !important;
}

.chat-input :deep(.q-field__control:focus) {
  border-color: var(--primary-color) !important;
  box-shadow: 0 0 0 2px rgba(0, 123, 255, 0.1) !important;
}

.send-btn {
  background: var(--primary-color) !important;
  color: white !important;
  width: 44px !important;
  height: 44px !important;
  border-radius: 50% !important;
  box-shadow: var(--shadow-medium) !important;
  transition: all 0.3s ease !important;
  margin-left: 8px !important;
}

.send-btn:hover {
  transform: scale(1.05) !important;
  box-shadow: var(--shadow-heavy) !important;
  background: var(--hover-color) !important;
}

.send-btn .q-icon {
  font-size: 20px !important;
}

/* Dark mode adjustments */
:deep(.q-dark) {
  .actions-card,
  .chat-card {
    background: linear-gradient(180deg, rgba(90,55,140,0.08), rgba(60,30,90,0.08));
    border: 1px solid rgba(118, 75, 162, 0.18);
    box-shadow: 0 10px 34px rgba(8,6,20,0.5);
  }

  .chat-header {
    background: linear-gradient(135deg, rgba(96,71,230,0.9), rgba(111,77,184,0.9));
  }

  .ai-bubble {
    background: rgba(48, 40, 60, 0.94);
    color: #e9e7ff;
    border-color: rgba(118,75,162,0.22);
    box-shadow: 0 6px 18px rgba(32,20,70,0.45);
  }

  .references {
    border-color: rgba(118,75,162,0.18);
    color: #cfc6ee;
  }

  .input-section {
    border-color: rgba(118,75,162,0.18);
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

  .send-btn {
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
