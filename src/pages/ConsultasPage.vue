<template>
  <q-page class="flex" :class="$q.dark.isActive ? 'bg-dark' : 'bg-light'" style="height: 100vh; position: relative;">
    <!-- Header -->
    <div class="q-pa-md q-pb-none" style="position: absolute; top: 0; left: 0; width: 100%; z-index: 10; background: var(--q-page-container-bg);">
      <h1 class="text-h5 text-weight-medium text-dark q-ma-none">Consultas Jurídicas</h1>
      <p class="text-body2 text-grey-6 q-mt-xs">Haz preguntas sobre leyes y contratos</p>

      <!-- Botón para ir a analizar contratos -->
      <div class="q-mt-md">
        <q-btn
          color="primary"
          icon="picture_as_pdf"
          label="Analizar Contrato PDF"
          @click="$router.push('/subir-contrato')"
          class="q-mr-sm"
        />
        <q-btn
          color="secondary"
          icon="help"
          label="Centro de Ayuda"
          flat
          @click="showHelp = true"
        />
      </div>
    </div>

    <!-- Chat Container -->
    <div style="position: absolute; top: 50%; transform: translateY(-50%); right: 0; left: 0; margin: auto; max-width: 600px; height: 80vh; display: flex; flex-direction: column; border: 1px solid var(--q-border-color); border-radius: 12px; background: var(--q-page-container-bg); box-shadow: 0 4px 12px rgba(0,0,0,0.1);">
      <!-- Messages Box -->
      <div style="flex-grow: 1; overflow-y: auto; padding: 16px; background: var(--q-page-container-bg);">
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

      <!-- Input Area -->
      <div class="q-pa-md q-pt-sm" style="border-top: 1px solid var(--q-border-color);">
        <q-form @submit.prevent="enviarConsulta" class="input-form" style="display: flex; align-items: center;">
          <q-input
            v-model="pregunta"
            placeholder="Escribe tu consulta legal aquí..."
            type="textarea"
            autogrow
            outlined
            :disable="store.loading"
            :max-height="120"
            class="chat-input"
            :bg-color="$q.dark.isActive ? '#2a2a2a' : 'white'"
            hide-bottom-space
            style="flex-grow: 1; margin-right: 8px; color: inherit;"
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
        <div v-if="store.error" class="error-message q-mt-sm text-center">
          <q-icon name="error" color="negative" class="q-mr-xs" />
          <span class="text-negative text-body2">{{ store.error }}</span>
        </div>
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
.chat-messages {
  background: transparent;
}

.message-wrapper {
  display: flex;
  flex-direction: column;
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
  background: white;
  color: #333;
  border: 1px solid #e5e5e5;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
}

:deep(.q-dark) .ai-bubble {
  background: #2a2a2a;
  color: #e0e0e0;
  border-color: #404040;
  box-shadow: 0 1px 2px rgba(255, 255, 255, 0.1);
}

.user-bubble {
  background: #007AFF;
  color: white;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
}

.message-content {
  line-height: 1.4;
  font-size: 15px;
}

.references {
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px solid #e5e5e5;
}

.typing-indicator {
  display: flex;
  gap: 4px;
  align-items: center;
}

.typing-indicator span {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #007AFF;
  animation: typing 1.4s infinite ease-in-out;
}

.typing-indicator span:nth-child(1) { animation-delay: -0.32s; }
.typing-indicator span:nth-child(2) { animation-delay: -0.16s; }

@keyframes typing {
  0%, 80%, 100% {
    opacity: 0.3;
    transform: scale(0.8);
  }
  40% {
    opacity: 1;
    transform: scale(1);
  }
}

.chat-input {
  background: white;
  border-radius: 22px;
  border: 1px solid #e5e5e5;
}

.chat-input :deep(.q-field__control) {
  border-radius: 22px;
}

.input-form {
  max-width: 800px;
  margin: 0 auto;
}

.error-message {
  max-width: 800px;
  margin: 0 auto;
}

/* Dark mode */
:deep(.q-dark) {
  .ai-bubble {
    background: #2a2a2a;
    color: white;
    border-color: #404040;
  }

  .user-bubble {
    background: #007AFF;
  }

  .references {
    border-color: #404040;
  }

  .chat-input {
    background: #2a2a2a;
    border-color: #404040;
  }
}
</style>
