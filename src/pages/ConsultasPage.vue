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
                            <q-icon name="smart_toy" size="20px" />
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
                            <q-icon name="smart_toy" size="20px" />
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
    </div>



    <!-- Help Dialog -->
    <q-dialog v-model="showHelp">
      <q-card style="min-width: 400px">
        <q-card-section>
          <div class="text-h6">Centro de Ayuda</div>
        </q-card-section>
        <q-card-section class="q-pt-none">
          <div class="text-body2">
            <p><strong>💬 Consultas:</strong> Haz preguntas sobre leyes, contratos y temas jurídicos.</p>
            <p><strong>📄 Análisis de Contratos:</strong> Usa el botón "Analizar Contrato PDF" para subir y analizar contratos en formato PDF.</p>
            <p><strong>⚖️ Asesoramiento:</strong> Recuerda que esta herramienta es informativa y no sustituye el consejo de un abogado profesional.</p>
          </div>
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat label="Entendido" color="primary" v-close-popup />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup lang="ts">
import { ref, onMounted, nextTick } from 'vue';
import { useConsultasStore } from '../stores/consultas-store';
import { storeToRefs } from 'pinia';

const store = useConsultasStore();
const pregunta = ref('');
const showHelp = ref(false);

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

function formatMessage(text: string): string {
  // Simple markdown-like formatting to HTML
  const formatted = text
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>') // bold
    .replace(/\*(.+?)\*/g, '<em>$1</em>') // italic
    .replace(/^### (.+)$/gm, '<h3>$1</h3>') // h3
    .replace(/^## (.+)$/gm, '<h2>$1</h2>') // h2
    .replace(/^# (.+)$/gm, '<h1>$1</h1>') // h1
    .replace(/:\)/g, '😊') // emoji smile
    .replace(/:\(/g, '😞') // emoji sad
    .replace(/\n/g, '<br>'); // new lines to <br>
  return formatted;
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

// Limpiar mensajes al montar el componente
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

.content-wrapper {
  width: 100%;
  max-width: 1200px;
  min-height: 100vh;
  padding: 2rem;
}

/* Title Section */
.title-section {
  margin-bottom: 3rem;
}

.main-title {
  font-size: 2.5rem;
  font-weight: 700;
  letter-spacing: 1px;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  color: white;
  margin-bottom: 0.5rem;
}

.subtitle {
  font-size: 1.1rem;
  color: rgba(255, 255, 255, 0.9);
  font-weight: 400;
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

.buttons-container {
  flex-wrap: wrap;
  gap: 1rem;
}

.action-button {
  font-weight: 600;
  letter-spacing: 0.5px;
  text-transform: uppercase;
  font-size: 0.9rem;
  padding: 12px 24px;
  min-width: 200px;
  transition: all 0.3s ease;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
}

.action-button:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
}

/* Chat Section */
.chat-section {
  width: 100%;
  max-width: 800px;
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

.chat-title {
  margin: 0;
  font-weight: 600;
  letter-spacing: 0.5px;
}

.messages-container {
  padding: 0;
  max-height: 400px;
  overflow-y: auto;
}

.messages-box {
  padding: 1rem 1.5rem;
  min-height: 200px;
}

.message-wrapper {
  display: flex;
  flex-direction: column;
  margin-bottom: 1rem;
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

.message-bubble {
  max-width: 100%;
  padding: 12px 16px;
  border-radius: 18px;
  position: relative;
  word-wrap: break-word;
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

.formatted-message {
  line-height: 1.6;
}

.references {
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px solid rgba(102, 126, 234, 0.2);
  color: #666;
}

.input-section {
  border-top: 1px solid rgba(102, 126, 234, 0.2);
  padding: 1rem 1.5rem;
}

.quick-suggestions{ display:flex; align-items:center; gap:8px; flex-wrap:wrap; }
.quick-suggestions .hint{ color:#6b5f7f; font-size:0.9rem; font-weight:500; }
.quick-suggestions q-chip{ background: rgba(123,80,200,0.12); border: 1px solid rgba(123,80,200,0.22); color: #2b104b; }


.input-form {
  width: 100%;
}

.chat-input {
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.9);
  border: 1px solid rgba(102, 126, 234, 0.2);
}

.chat-input :deep(.q-field__control) {
  border-radius: 12px;
}

.error-message {
  margin-top: 1rem;
}

/* Dark mode adjustments */
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
}

/* Responsive Design */
@media (max-width: 1024px) {
  .content-wrapper {
    padding: 1.5rem;
  }

  .main-title {
    font-size: 2rem;
  }

  .buttons-container {
    justify-content: center;
  }

  .action-button {
    min-width: 180px;
  }
}

@media (max-width: 768px) {
  .content-wrapper {
    padding: 1rem;
  }

  .main-title {
    font-size: 1.8rem;
  }

  .subtitle {
    font-size: 1rem;
  }

  .buttons-container {
    flex-direction: column;
    align-items: stretch;
  }

  .action-button {
    min-width: auto;
    width: 100%;
    max-width: 300px;
    margin: 0 auto;
  }

  .chat-section {
    margin-top: 2rem;
  }

  .messages-box {
    padding: 1rem;
  }

  .input-section {
    padding: 1rem;
  }
}

@media (max-width: 480px) {
  .main-title {
    font-size: 1.5rem;
  }

  .actions-card,
  .chat-card {
    margin: 0 0.5rem;
  }

  .action-button {
    font-size: 0.8rem;
    padding: 10px 20px;
  }
}

/* Animations */
.action-button {
  animation: fadeInUp 0.6s ease-out;
}

.action-button:nth-child(1) { animation-delay: 0.1s; }
.action-button:nth-child(2) { animation-delay: 0.2s; }
.action-button:nth-child(3) { animation-delay: 0.3s; }

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.chat-card {
  animation: slideInUp 0.8s ease-out 0.4s both;
}

@keyframes slideInUp {
  from {
    opacity: 0;
    transform: translateY(40px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
