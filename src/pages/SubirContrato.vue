<template>
  <q-page class="q-pa-md">
    <div class="text-h5 text-primary q-mb-md">
      <q-icon name="upload_file" class="q-mr-sm" /> Subir Contrato PDF
    </div>
    <q-form @submit.prevent="subirContrato">
      <q-file
        v-model="archivo"
        label="Selecciona el contrato en PDF"
        accept=".pdf"
        outlined
        class="q-mb-md"
        :disable="loading"
        required
      />
      <q-btn
        label="Analizar contrato"
        color="primary"
        icon="search"
        type="submit"
        :loading="loading"
      />
    </q-form>

    <div v-if="analisis" class="q-mt-lg">
      <q-card class="q-pa-md">
        <div class="text-h6 text-primary">Resumen del análisis</div>
        <div class="q-mt-sm">{{ analisis.resumen }}</div>
        <div class="q-mt-md">
          <div class="text-subtitle2">Cláusulas detectadas:</div>
          <q-list bordered>
            <q-item v-for="(clausula, idx) in analisis.clausulas" :key="idx">
              <q-item-section>
                <b>Cláusula {{ clausula.numero }}:</b> {{ clausula.texto }}
                <div v-if="clausula.riesgo" class="text-negative">
                  ⚠️ Riesgo: {{ clausula.riesgo }}
                </div>
              </q-item-section>
            </q-item>
          </q-list>
        </div>
      </q-card>
    </div>
    <q-banner v-if="error" class="bg-red-1 text-red q-mt-md">
      {{ error }}
    </q-banner>
  </q-page>
</template>

<script setup lang="ts">

import { ref } from 'vue';
import axios from 'axios';

interface Clausula {
  numero: number;
  texto: string;
  riesgo?: string;
}

interface AnalisisContrato {
  resumen: string;
  clausulas: Clausula[];
}

const archivo = ref<File | null>(null);
const analisis = ref<AnalisisContrato | null>(null);
const loading = ref(false);
const error = ref('');

async function subirContrato() {
  error.value = '';
  analisis.value = null;
  if (!archivo.value) return;
  loading.value = true;
  try {
    const formData = new FormData();
    formData.append('file', archivo.value);
    const res = await axios.post('https://localhost:5001/api/contratos/analizar', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    analisis.value = res.data;
  } catch {
    error.value = 'Error al analizar el contrato';
  } finally {
    loading.value = false;
  }
}
</script>

<style scoped>
.text-primary {
  color: #0a2342 !important;
}
.text-negative {
  color: #c62828 !important;
}
</style>
