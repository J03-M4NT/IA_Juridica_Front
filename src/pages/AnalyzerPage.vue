<template>
  <q-page class="analyzer-page">
    <div class="page-header">
      <div class="section-icon-wrap icon-teal">
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#1fa8bb" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
          <path d="M14 2v6h6"/><path d="M8 13h8"/><path d="M8 17h5"/>
        </svg>
      </div>
      <div>
        <h1 class="page-title">Analizador de Contratos PDF</h1>
        <p class="page-subtitle">Herramienta inteligente de análisis legal</p>
      </div>
    </div>

    <PdfAnalyzer />
  </q-page>
</template>

<script setup lang="ts">
import PdfAnalyzer from '../components/PdfAnalyzer.vue';
</script>

<style scoped>
.analyzer-page {
  animation: floatUp 0.5s ease-out both;
}

@keyframes floatUp {
  from { opacity: 0; transform: translateY(14px); }
  to   { opacity: 1; transform: translateY(0); }
}

.page-header {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 26px;
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

.icon-teal { background: rgba(57, 199, 216, 0.14); }

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
</style>
