<template>
  <q-page class="consultas-page flex flex-center column" :class="$q.dark.isActive ? 'bg-dark' : 'bg-light'">
    <!-- Background gradient -->
    <div class="page-background"></div>

    <!-- Centered Content -->
    <div class="content-wrapper flex flex-center column q-pa-lg">
      <!-- Title Section -->
      <div class="title-section text-center q-mb-xl">
        <h1 class="main-title text-h4 text-weight-bold q-mb-md">CONSULTAS JURÍDICAS</h1>
        <p class="subtitle text-body1 text-grey-7">Haz preguntas sobre leyes y contratos</p>
      </div>

      <!-- Action Buttons Card -->
      <q-card class="actions-card modern-card q-pa-xl" style="position: relative;">
        <q-btn
          color="grey-6"
          icon="help"
          label="CENTRO DE AYUDA"
          @click="showHelp = true"
          class="action-button help-button"
          unelevated
          rounded
          size="md"
          style="position: absolute; top: 16px; right: 16px; min-width: 140px;"
        >
          <q-tooltip>Centro de ayuda</q-tooltip>
        </q-btn>
      </q-card>

      <!-- Chat Section -->
      <div class="chat-section q-mt-xl">
        <q-card class="chat-card modern-card">
          <q-card-section class="chat-header">
            <h3 class="chat-title text-h6 text-weight-medium">Chat de Consultas</h3>
          </q-card-section>

          <!-- Messages Box -->
          <q-card-section class="messages-container">
            <div class="messages-box">
              <div v-for="(mensaje, index) in mensajes" :key="index" class="message-wrapper q-mb-lg">
                <!-- AI Message -->
                <div v-if="mensaje.esIA" class="ai-message">
                  <div class="message-bubble ai-bubble">
                    <div class="message-content formatted-message" v-html="formatMessage(mensaje.contenido)"></div>
                    <div v-if="mensaje.referencias?.length" class="references text-caption text-grey-6 q-mt-sm">
                      <strong>Referencias:</strong>
                      <div v-for="(ref, idx) in mensaje.referencias" :key="idx" class="q-mt-xs">{{ ref }}</div>
                    </div>
                  </div>
                </div>
                <!-- User Message -->
                <div v-else class="user-message">
                  <div class="message-bubble user-bubble">
                    <div class="message-content">{{ mensaje.contenido }}</div>
                  </div>
                </div>
              </div>
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
import { useQuasar } from 'quasar';

const $q = useQuasar();

const store = useConsultasStore();
const pregunta = ref('');
const showHelp = ref(false);

const { mensajes } = storeToRefs(store);

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
    } catch (error) {
      console.error('Error al enviar consulta:', error);
    }
  }
}

// Limpiar mensajes al montar el componente
onMounted(() => {
  store.limpiar();
});
</script>

<style scoped>
.consultas-page {
  min-height: 100vh;
  position: relative;
  overflow-x: hidden;
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
  border-radius: 16px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.15);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  background: rgba(255, 255, 255, 0.95);
  border: 1px solid rgba(255, 255, 255, 0.2);
  max-width: 800px;
  width: 100%;
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
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.15);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  background: rgba(255, 255, 255, 0.95);
  border: 1px solid rgba(255, 255, 255, 0.2);
  overflow: hidden;
}

.chat-header {
  background: linear-gradient(135deg, #667eea, #764ba2);
  color: white;
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

.ai-message {
  display: flex;
  justify-content: flex-start;
  margin-right: 20%;
}

.user-message {
  display: flex;
  justify-content: flex-end;
  margin-left: 20%;
}

.message-bubble {
  max-width: 100%;
  padding: 12px 16px;
  border-radius: 18px;
  position: relative;
  word-wrap: break-word;
}

.ai-bubble {
  background: rgba(255, 255, 255, 0.9);
  color: #333;
  border: 1px solid rgba(102, 126, 234, 0.2);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.user-bubble {
  background: linear-gradient(135deg, #667eea, #764ba2);
  color: white;
  box-shadow: 0 2px 8px rgba(102, 126, 234, 0.3);
}

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
    background: rgba(30, 30, 30, 0.95);
    border: 1px solid rgba(255, 255, 255, 0.1);
  }

  .ai-bubble {
    background: rgba(45, 45, 45, 0.9);
    color: #e0e0e0;
    border-color: rgba(102, 126, 234, 0.3);
  }

  .chat-input {
    background: rgba(45, 45, 45, 0.9);
    border-color: rgba(102, 126, 234, 0.3);
  }

  .references {
    border-color: rgba(102, 126, 234, 0.3);
    color: #ccc;
  }

  .input-section {
    border-color: rgba(102, 126, 234, 0.3);
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
