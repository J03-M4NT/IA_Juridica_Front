<template>
  <q-page class="normas-page">

    <!-- Section header -->
    <div class="page-header">
      <div class="section-icon-wrap icon-orange">
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#d97a3e" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
          <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
          <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
        </svg>
      </div>
      <div>
        <h1 class="page-title">Normas del Diario Oficial El Peruano</h1>
        <p class="page-subtitle">Actualizaciones normativas · fuente oficial</p>
      </div>
    </div>

    <span class="dev-badge">
      <span class="dev-dot"></span> En desarrollo
    </span>

    <!-- Preview card -->
    <div class="preview-card">
      <h2 class="preview-card-title">Vista previa del Diario Oficial</h2>
      <p class="preview-card-subtitle">
        Consulta las normas legales publicadas directamente en la fuente oficial.
        Haz clic dentro del recuadro para abrir el sitio.
      </p>

      <div v-if="mostrarPreview" class="iframe-wrapper">
        <iframe
          :src="diarioUrl"
          style="width:100%; height:100%; border:none; pointer-events: none;"
          sandbox="allow-scripts allow-same-origin allow-popups"
        ></iframe>
        <div class="iframe-overlay" @click="abrirEnPestaniaDirecta"></div>
      </div>

      <div class="preview-actions">
        <a class="open-btn" @click="abrirEnPestaniaDirecta">
          Abrir El Peruano
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">
            <path d="M7 17L17 7M7 7h10v10"/>
          </svg>
        </a>
      </div>
    </div>

  </q-page>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const diarioUrl = 'https://diariooficial.elperuano.pe/Normas'
const mostrarPreview = ref(true)

function abrirEnPestaniaDirecta() {
  window.open(diarioUrl, '_blank')
}
</script>

<style scoped>
.normas-page {
  max-width: 920px;
  margin: 0 auto;
  animation: floatUp 0.5s ease-out both;
}

@keyframes floatUp {
  from { opacity: 0; transform: translateY(14px); }
  to   { opacity: 1; transform: translateY(0); }
}

/* Header */
.page-header {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 8px;
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

.icon-orange { background: rgba(255, 155, 106, 0.15); }

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

/* Dev badge */
.dev-badge {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  background: rgba(255, 149, 0, 0.10);
  color: #c9760a;
  font-size: 0.8rem;
  font-weight: 600;
  padding: 6px 13px;
  border-radius: 999px;
  margin: 0 0 22px 68px;
}

.dev-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #c9760a;
  display: inline-block;
}

/* Preview card */
.preview-card {
  background: #fff;
  border: 1px solid rgba(27, 27, 30, 0.08);
  border-radius: 20px;
  box-shadow: 0 1px 3px rgba(27, 27, 30, 0.04);
  padding: 28px;
  text-align: center;
}

.preview-card-title {
  font-family: 'EB Garamond', serif;
  font-size: 1.3rem;
  font-weight: 600;
  color: #16161a;
  margin: 0 0 8px;
}

.preview-card-subtitle {
  font-size: 0.92rem;
  color: #7a7a82;
  margin: 0 0 20px;
}

.iframe-wrapper {
  position: relative;
  height: 65vh;
  border-radius: 14px;
  border: 1px solid rgba(27, 27, 30, 0.08);
  overflow: hidden;
  cursor: pointer;
}

.iframe-overlay {
  position: absolute;
  inset: 0;
  cursor: pointer;
}

.preview-actions {
  margin-top: 20px;
}

.open-btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 11px 20px;
  background: #1b1b1e;
  color: #fff;
  border-radius: 11px;
  font-family: 'Figtree', sans-serif;
  font-size: 0.92rem;
  font-weight: 600;
  cursor: pointer;
  box-shadow: 0 3px 12px rgba(27, 27, 30, 0.20);
  text-decoration: none;
  transition: transform 0.18s, box-shadow 0.18s;
}

.open-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 6px 18px rgba(27, 27, 30, 0.28);
}
</style>
