<template>
  <q-page class="chat-page">
    <div class="chat-container">
      <div class="chat-header">
        <q-icon name="gavel" size="28px" class="header-icon" />
        <h1 class="chat-title">Asistente Jurídico Virtual</h1>
      </div>
      <q-scroll-area class="messages-area" ref="scrollArea">
        <div class="messages-wrapper">
          <div v-if="mensajes.length === 0" class="welcome-message">
            <p>Bienvenido al Asistente Jurídico. Haz tus consultas legales aquí.</p>
          </div>
          <div v-for="(mensaje, index) in mensajes" :key="index" class="message-row" :class="{ 'ai-row': mensaje.esIA, 'user-row': !mensaje.esIA }">
            <div class="avatar" :class="{ 'ai-avatar': mensaje.esIA, 'user-avatar': !mensaje.esIA }">
              <q-icon :name="mensaje.esIA ? 'smart_toy' : 'person'" size="24px" />
            </div>
            <div class="message-content-wrapper">
              <q-card flat bordered class="message-card" :class="{ 'ai-card': mensaje.esIA, 'user-card': !mensaje.esIA }">
                <q-card-section>
                  <div class="message-content" v-html="mensaje.esIA ? formatMessage(mensaje.contenido) : mensaje.contenido"></div>
                </q-card-section>
              </q-card>
            </div>
          </div>
        </div>
      </q-scroll-area>
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

const { mensajes } = storeToRefs(store);

async function enviarConsulta() {
  if (!pregunta.value.trim()) return;
  try {
    await store.enviarConsulta(pregunta.value);
    pregunta.value = '';
    await nextTick();
  } catch (error) {
    console.error('Error al enviar consulta:', error);
  }
}

onMounted(async () => {
  store.limpiar();
  // Probar la API key al cargar la página
  await store.probarAPIKey();
});

const formatMessage = (text: string) => {
  return text
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/^# (.*$)/gm, '<h1>$1</h1>')
    .replace(/^## (.*$)/gm, '<h2>$1</h2>')
    .replace(/^### (.*$)/gm, '<h3>$1</h3>')
    .replace(/\n/g, '<br>');
};
</script>

<style scoped>
.chat-page {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

.chat-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  max-width: 1200px;
  margin: 0 auto;
  width: 100%;
  padding: 0 1rem;
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

.messages-wrapper {
  max-width: 800px;
  margin: 0 auto;
  padding: 0 1rem;
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

.ai-avatar {
  background: linear-gradient(135deg, #e0e7ff 0%, #c7d2fe 100%);
  color: #1e40af;
}

.user-avatar {
  background: linear-gradient(135deg, #1e40af 0%, #1d4ed8 100%);
  color: white;
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

.user-card {
  background: linear-gradient(135deg, #1e40af 0%, #1d4ed8 100%);
  border: none;
}

.q-card-section {
  padding: 1rem 1.25rem !important;
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

:deep(.ai-card .q-card) {
  background: #ffffff !important;
  border: none !important;
}

:deep(.ai-card .q-card-section) {
  background: transparent !important;
  padding: 0 !important;
  color: #000000 !important;
}

:deep(.ai-card .message-content) {
  color: #000000 !important;
  background: #f9fafb !important;
}

:deep(.message-content *) {
  color: #000000 !important;
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
  background: #ffffff;
  border-top: 1px solid #e5e7eb;
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
  .chat-page {
    background: linear-gradient(135deg, #1e293b 0%, #334155 100%);
  }

  .chat-header {
    background: #1e293b;
    border-color: #475569;
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.2);
  }

  .chat-title {
    color: #ffffff !important;
  }

  .ai-card .message-content {
    color: #ffffff !important;
    background: #374151 !important;
  }

  .ai-card {
    background: transparent !important;
    border: none !important;
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
