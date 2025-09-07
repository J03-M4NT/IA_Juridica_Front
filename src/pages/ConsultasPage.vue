<template>
  <q-page class="q-pa-md">
    <div class="text-h5 q-mb-md">
      <q-icon name="question_answer" class="q-mr-sm" /> Consultas Jurídicas
    </div>

    <!-- Chat Container -->
    <div class="chat-container q-mb-md">
      <q-scroll-area style="height: 400px; width: 100%">
        <div v-for="(mensaje, index) in store.mensajes" :key="index" class="q-mb-md">
          <q-chat-message
            v-if="mensaje.esIA"
            :sent="false"
            :bg-color="isDark ? 'blue-9' : 'light-blue-1'"
            :text-color="isDark ? 'white' : 'black'"
            name="Asistente Legal"
            avatar="/ia-avatar.png"
            class="formatted-message"
          >
            <template v-if="mensaje.referencias?.length" #stamp>
              <div class="text-caption">
                Referencias:
                <div v-for="(ref, idx) in mensaje.referencias" :key="idx">
                  {{ ref }}
                </div>
              </div>
            </template>
            <div v-html="formatMessage(mensaje.contenido)"></div>
          </q-chat-message>
          <q-chat-message
            v-else
            :text="[mensaje.contenido]"
            :sent="true"
            bg-color="primary"
            text-color="white"
            name="Tú"
            avatar=""
          />
        </div>
      </q-scroll-area>
    </div>

    <!-- Input Form -->
    <q-form @submit.prevent="enviarConsulta" class="chat-input q-mt-md">
      <q-input
        v-model="pregunta"
        label="Escribe tu consulta legal"
        type="textarea"
        autogrow
        outlined
        :disable="store.loading"
        required
        class="q-mb-sm consulta-input"
        :rows="2"
        :dark="isDark"
      >
        <template v-slot:append>
          <q-btn
            round
            dense
            flat
            icon="send"
            type="submit"
            :loading="store.loading"
            color="primary"
            @click="enviarConsulta"
          />
        </template>
      </q-input>
    </q-form>

    <q-banner v-if="store.error" class="bg-red-1 text-red q-mt-md">
      {{ store.error }}
    </q-banner>
  </q-page>
</template>

<script setup lang="ts">
import { ref, onMounted, nextTick, computed } from 'vue';
import { useConsultasStore } from '../stores/consultas-store';
import { useQuasar } from 'quasar';

const $q = useQuasar();
const store = useConsultasStore();
const pregunta = ref('');
const isDark = computed(() => $q.dark.isActive);

function formatMessage(text: string): string {
  // Simple markdown-like formatting to HTML
  let formatted = text
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
      const scrollArea = document.querySelector('.q-scroll-area');
      if (scrollArea) {
        scrollArea.scrollTop = scrollArea.scrollHeight;
      }
    } catch (error) {
      console.error('Error al enviar consulta:', error);
    }
  }
}


//Commit de seguridad: .env agregado al gitignore
// Limpiar mensajes al montar el componente
onMounted(() => {
  store.limpiar();
});
</script>

<style scoped>
.chat-container {
  border: 1px solid var(--q-primary);
  border-radius: 8px;
  background: var(--q-dark);
}

.chat-input {
  position: sticky;
  bottom: 0;
  padding: 1rem;
  border-top: 1px solid var(--q-primary);
}

.consulta-input {
  background: var(--q-dark);
}

:deep(.q-field__native),
:deep(.q-field__label) {
  color: currentColor !important;
}

:deep(.q-message-text) {
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
}

:deep(.q-message-text--received) {
  background: var(--q-primary);
}

.q-chat-message {
  margin: 8px 0;
}

/* Dark mode adjustments */
:deep(.q-dark) {
  .chat-container {
    background: var(--q-dark);
    border-color: var(--q-primary);
  }
  
  .consulta-input {
    color: white;
  }
}
</style>
