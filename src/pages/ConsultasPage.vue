<template>
  <q-page class="q-pa-md">
    <div class="text-h5 text-primary q-mb-md">
      <q-icon name="question_answer" class="q-mr-sm" /> Consultas Jurídicas
    </div>
    <q-form @submit.prevent="enviarConsulta">
      <q-input
        v-model="pregunta"
        label="Escribe tu pregunta legal"
        type="textarea"
        autogrow
        outlined
        class="q-mb-md"
        :disable="store.loading"
        required
      />
      <q-btn
        label="Enviar a IA"
        color="primary"
        icon="send"
        type="submit"
        :loading="store.loading"
        class="q-mb-lg"
      />
    </q-form>

    <div v-if="store.respuesta" class="q-mt-lg">
      <q-card class="bg-light-blue-1 q-pa-md">
        <div class="text-h6 text-primary">Respuesta de la IA</div>
        <div class="q-mt-sm">{{ store.respuesta }}</div>
      </q-card>
      <div v-if="store.referencias && store.referencias.length" class="q-mt-md">
        <div class="text-subtitle2 text-gold">Referencias citadas:</div>
        <q-list bordered>
          <q-item v-for="(ref, idx) in store.referencias" :key="idx">
            <q-item-section>
              <q-icon name="gavel" class="q-mr-sm text-gold" />
              {{ ref }}
            </q-item-section>
          </q-item>
        </q-list>
      </div>
    </div>
    <q-spinner v-if="store.loading" color="primary" size="2em" class="q-mt-lg" />
    <q-banner v-if="store.error" class="bg-red-1 text-red q-mt-md">
      {{ store.error }}
    </q-banner>
  </q-page>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useConsultasStore } from 'stores/consultas-store';

const store = useConsultasStore();
const pregunta = ref('');

async function enviarConsulta() {
  await store.enviarConsulta(pregunta.value);
}
</script>

<style scoped>
.text-primary {
  color: #4d46e3 !important;
}
.text-gold {
  color: #ffd700 !important;
}
.bg-light-blue-1 {
  background: #e3f2fd !important;
}
</style>
