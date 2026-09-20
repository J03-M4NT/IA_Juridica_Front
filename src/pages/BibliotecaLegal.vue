<template>
  <q-page class="normas-page" :class="{ 'normas-page--split': normaSeleccionada }">

    <!-- Section header -->
    <div class="page-header">
      <div class="section-icon-wrap icon-orange">
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#B5502E" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
          <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
          <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
        </svg>
      </div>
      <div class="page-header-text">
        <h1 class="page-title">Normas del Diario Oficial El Peruano</h1>
        <p class="page-subtitle">
          <span v-if="fechaEdicion">Edición del {{ formatFecha(fechaEdicion) }}</span>
          <span v-else>Actualizaciones normativas · fuente oficial</span>
        </p>
      </div>

      <button class="refresh-btn" :disabled="actualizando" @click="actualizarAhora">
        <svg
          width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
          stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"
          :class="{ 'refresh-icon--spinning': actualizando }"
        >
          <path d="M23 4v6h-6"/><path d="M1 20v-6h6"/>
          <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
        </svg>
        {{ actualizando ? 'Actualizando…' : 'Actualizar' }}
      </button>
    </div>

    <p v-if="actualizarError" class="refresh-error">{{ actualizarError }}</p>

    <div class="normas-layout" :class="{ 'normas-layout--split': normaSeleccionada }">
    <div class="normas-col">

    <!-- Loading -->
    <div v-if="cargando" class="estado-card">
      <div class="spinner"></div>
      <p>Cargando normas del día…</p>
    </div>

    <!-- Error / sin datos -->
    <div v-else-if="!normas.length" class="estado-card">
      <p class="estado-titulo">{{ error ? 'No se pudieron cargar las normas' : 'Aún no hay una edición guardada' }}</p>
      <p class="estado-texto">
        {{ error ?? 'El scraping diario corre automáticamente todos los días a las 7am. Vuelve a intentarlo más tarde.' }}
      </p>
      <a class="open-btn" :href="diarioUrl" target="_blank" rel="noopener">
        Abrir El Peruano
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">
          <path d="M7 17L17 7M7 7h10v10"/>
        </svg>
      </a>
    </div>

    <!-- Lista de normas -->
    <template v-else>

      <!-- Resumen con IA -->
      <div v-if="resumenCargando || resumen" class="resumen-card">
        <div class="resumen-header">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M18.4 5.6l-2.8 2.8M8.4 15.6l-2.8 2.8"/>
          </svg>
          <h2 class="resumen-title">Resumen del día con IA</h2>
        </div>

        <div v-if="resumenCargando" class="resumen-loading">
          <div class="spinner spinner--small"></div>
          <span>Generando resumen con IA…</span>
        </div>

        <template v-else-if="resumen">
          <p class="resumen-texto">{{ resumen.resumen }}</p>
          <div v-if="resumen.destacadas.length" class="resumen-destacadas">
            <p class="resumen-destacadas-label">Lo más relevante para tu práctica</p>
            <div v-for="(destacada, idx) in resumen.destacadas" :key="idx" class="destacada-item">
              <p class="destacada-titulo">{{ destacada.titulo }}</p>
              <p class="destacada-razon">{{ destacada.razon }}</p>
            </div>
          </div>
        </template>
      </div>

      <!-- Filtro por sector: solo se muestra si hay más de uno en la edición del día -->
      <div v-if="sectores.length > 1" class="sectores-filtro">
        <button
          type="button"
          class="sector-chip"
          :class="{ 'sector-chip--activo': sectorSeleccionado === null }"
          @click="sectorSeleccionado = null"
        >
          Todas ({{ normas.length }})
        </button>
        <button
          v-for="sector in sectores"
          :key="sector.nombre"
          type="button"
          class="sector-chip"
          :class="{ 'sector-chip--activo': sectorSeleccionado === sector.nombre }"
          @click="sectorSeleccionado = sector.nombre"
        >
          {{ sector.nombre }} ({{ sector.cantidad }})
        </button>
      </div>

      <div v-if="sectorSeleccionado && normasFiltradas.length === 0" class="estado-card estado-card--chica">
        <p class="estado-texto">No hay normas de "{{ sectorSeleccionado }}" en esta edición.</p>
      </div>

      <div class="normas-grid">
        <article v-for="norma in normasFiltradas" :key="norma.id" class="norma-card" :class="{ 'norma-card--activa': normaSeleccionada?.id === norma.id }">
          <div class="norma-card-head">
            <span class="norma-sector">{{ norma.sector }}</span>
            <span class="norma-fecha">{{ norma.fecha }}</span>
          </div>
          <button type="button" class="norma-titulo" @click="verPdf(norma)">
            {{ norma.titulo }}
          </button>
          <p v-if="norma.sumilla" class="norma-sumilla">{{ norma.sumilla }}</p>
        </article>
      </div>

    </template>

    </div>

    <!-- Panel del PDF, al costado — se resuelve la URL real del archivo
         (no la página visor de El Peruano) para mostrarlo embebido acá
         mismo, sin salir de la plataforma. -->
    <div v-if="normaSeleccionada" class="pdf-panel">
      <div class="pdf-panel-header">
        <span class="pdf-panel-titulo">{{ normaSeleccionada.titulo }}</span>
        <div class="pdf-panel-acciones">
          <a
            v-if="urlPdfSeleccionada"
            :href="urlPdfSeleccionada"
            target="_blank"
            rel="noopener"
            class="pdf-panel-boton"
            title="Abrir en una pestaña nueva"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">
              <path d="M7 17L17 7M7 7h10v10"/>
            </svg>
          </a>
          <button type="button" class="pdf-panel-boton" title="Cerrar" @click="cerrarPdf">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">
              <path d="M18 6L6 18M6 6l12 12"/>
            </svg>
          </button>
        </div>
      </div>
      <div class="pdf-panel-body">
        <div v-if="cargandoPdf" class="pdf-panel-status">
          <div class="spinner spinner--small"></div>
          <span>Cargando PDF…</span>
        </div>
        <div v-else-if="errorPdf" class="pdf-panel-status">
          <p>{{ errorPdf }}</p>
        </div>
        <iframe v-else-if="urlPdfSeleccionada" :src="urlPdfSeleccionada" class="pdf-panel-iframe" title="PDF de la norma"></iframe>
      </div>
    </div>

    </div>

  </q-page>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { obtenerUltimasNormas, actualizarNormasDelDia, resolverUrlPdf, type NormaDelDia } from '../services/normasService'
import { resumirNormasDelDia, type ResumenNormasDelDia } from '../services/geminiService'
import { getErrorMessage } from '../utils/errors'

const diarioUrl = 'https://diariooficial.elperuano.pe/Normas'

const normas = ref<NormaDelDia[]>([])
const fechaEdicion = ref<string | null>(null)
const cargando = ref(true)
const error = ref<string | null>(null)

// Segmentación por sector (Ambiental, Economía, Salud, etc.) — se arma a
// partir de lo que realmente trajo el scraping ese día, no de una lista
// fija, así siempre refleja los sectores que de verdad tuvieron normas.
const sectorSeleccionado = ref<string | null>(null)

const sectores = computed(() => {
  const conteo = new Map<string, number>()
  for (const norma of normas.value) {
    const nombre = norma.sector?.trim()
    if (!nombre) continue
    conteo.set(nombre, (conteo.get(nombre) ?? 0) + 1)
  }
  return [...conteo.entries()]
    .map(([nombre, cantidad]) => ({ nombre, cantidad }))
    .sort((a, b) => b.cantidad - a.cantidad)
})

const normasFiltradas = computed(() =>
  sectorSeleccionado.value
    ? normas.value.filter(norma => norma.sector?.trim() === sectorSeleccionado.value)
    : normas.value
)

// Panel de PDF al costado — se resuelve la URL real del archivo (no la
// página visor de El Peruano) la primera vez que se abre cada norma; si
// ya se resolvió antes en esta sesión, no se vuelve a pedir.
const normaSeleccionada = ref<NormaDelDia | null>(null)
const urlPdfSeleccionada = ref<string | null>(null)
const cargandoPdf = ref(false)
const errorPdf = ref<string | null>(null)
const cachePdf = new Map<string, string>()

async function verPdf(norma: NormaDelDia) {
  normaSeleccionada.value = norma
  errorPdf.value = null

  const urlOrigen = norma.urlPdf || norma.urlDetalle
  const cacheada = cachePdf.get(urlOrigen)
  if (cacheada) {
    urlPdfSeleccionada.value = cacheada
    return
  }

  urlPdfSeleccionada.value = null
  cargandoPdf.value = true
  try {
    const urlResuelta = await resolverUrlPdf(urlOrigen)
    cachePdf.set(urlOrigen, urlResuelta)
    // El usuario pudo haber cerrado el panel o abierto otra norma
    // mientras se resolvía esta — no pisar la selección actual.
    if (normaSeleccionada.value?.id === norma.id) {
      urlPdfSeleccionada.value = urlResuelta
    }
  } catch (err) {
    if (normaSeleccionada.value?.id === norma.id) {
      errorPdf.value = getErrorMessage(err)
    }
  } finally {
    if (normaSeleccionada.value?.id === norma.id) {
      cargandoPdf.value = false
    }
  }
}

function cerrarPdf() {
  normaSeleccionada.value = null
  urlPdfSeleccionada.value = null
  errorPdf.value = null
}

const resumen = ref<ResumenNormasDelDia | null>(null)
const resumenCargando = ref(false)

const actualizando = ref(false)
const actualizarError = ref<string | null>(null)

function formatFecha(fechaIso: string): string {
  const [anio, mes, dia] = fechaIso.split('-')
  if (!anio || !mes || !dia) return fechaIso
  return `${dia}/${mes}/${anio}`
}

async function cargarResumen() {
  resumenCargando.value = true
  try {
    resumen.value = await resumirNormasDelDia(
      normas.value.map(norma => ({ titulo: norma.titulo, sumilla: norma.sumilla }))
    )
  } catch {
    // Si Gemini falla o la respuesta no viene en el formato esperado, la
    // pantalla sigue funcionando normal mostrando solo la lista de normas.
    resumen.value = null
  } finally {
    resumenCargando.value = false
  }
}

async function cargarNormas() {
  try {
    const resultado = await obtenerUltimasNormas()
    if (resultado) {
      fechaEdicion.value = resultado.fecha
      normas.value = resultado.normas
      sectorSeleccionado.value = null
      cerrarPdf()
    }
  } catch (err) {
    error.value = getErrorMessage(err)
  } finally {
    cargando.value = false
  }

  if (normas.value.length > 0) {
    void cargarResumen()
  }
}

async function actualizarAhora() {
  actualizando.value = true
  actualizarError.value = null
  try {
    await actualizarNormasDelDia()
    error.value = null
    resumen.value = null
    await cargarNormas()
  } catch (err) {
    actualizarError.value = getErrorMessage(err)
  } finally {
    actualizando.value = false
  }
}

onMounted(() => {
  void cargarNormas()
})
</script>

<style scoped>
.normas-page {
  max-width: 920px;
  margin: 0 auto;
  animation: floatUp 0.5s ease-out both;
  transition: max-width 0.25s ease;
}

.normas-page--split {
  max-width: 1360px;
}

@keyframes floatUp {
  from { opacity: 0; transform: translateY(14px); }
  to   { opacity: 1; transform: translateY(0); }
}

/* Layout dividido: lista + panel del PDF al costado */
.normas-layout {
  display: flex;
  gap: 24px;
  align-items: flex-start;
}

.normas-col {
  flex: 1;
  min-width: 0;
}

.normas-layout--split .normas-col {
  max-width: 560px;
}

.pdf-panel {
  flex: 1;
  min-width: 0;
  position: sticky;
  top: 16px;
  height: calc(100vh - 140px);
  display: flex;
  flex-direction: column;
  background: var(--surface);
  border: 1px solid var(--border-color);
  border-radius: var(--border-radius);
  box-shadow: var(--shadow-medium);
  overflow: hidden;
}

.pdf-panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 12px 16px;
  border-bottom: 1px solid var(--border-color);
  flex-shrink: 0;
}

.pdf-panel-titulo {
  font-family: 'Figtree', sans-serif;
  font-size: 0.86rem;
  font-weight: 600;
  color: var(--ink);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pdf-panel-acciones {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
}

.pdf-panel-boton {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  border-radius: var(--border-radius-small);
  border: none;
  background: none;
  color: var(--text-secondary);
  cursor: pointer;
  transition: background-color 0.18s, color 0.18s;
}

.pdf-panel-boton:hover {
  background: var(--surface-alt);
  color: var(--ink);
}

.pdf-panel-body {
  flex: 1;
  min-height: 0;
  position: relative;
}

.pdf-panel-status {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  color: var(--text-secondary);
  font-size: 0.9rem;
  text-align: center;
  padding: 20px;
}

.pdf-panel-iframe {
  width: 100%;
  height: 100%;
  border: none;
}

@media (max-width: 900px) {
  .normas-layout--split {
    flex-direction: column;
  }
  .normas-layout--split .normas-col {
    max-width: none;
  }
  .pdf-panel {
    position: static;
    height: 80vh;
    width: 100%;
  }
}

/* Header */
.page-header {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 26px;
}

.page-header-text {
  flex: 1;
}

.refresh-btn {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 9px 16px;
  background: var(--surface);
  color: var(--ink);
  border: 1px solid var(--border-color);
  border-radius: var(--border-radius-small);
  font-family: 'Figtree', sans-serif;
  font-size: 0.86rem;
  font-weight: 600;
  cursor: pointer;
  flex-shrink: 0;
  transition: border-color 0.18s, background-color 0.18s;
}

.refresh-btn:hover:not(:disabled) {
  border-color: var(--border-color-strong);
  background: var(--surface-alt);
}

.refresh-btn:disabled {
  cursor: default;
  color: var(--text-muted);
}

.refresh-icon--spinning {
  animation: spin 0.8s linear infinite;
}

.refresh-error {
  color: #C23B2E;
  font-size: 0.86rem;
  margin: -14px 0 20px;
}

.section-icon-wrap {
  width: 52px;
  height: 52px;
  border-radius: var(--border-radius-small);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.icon-orange { background: var(--accent-soft); }

.page-title {
  font-family: 'EB Garamond', serif;
  font-size: 2rem;
  font-weight: 600;
  margin: 0;
  color: var(--ink);
}

.page-subtitle {
  margin: 2px 0 0;
  color: var(--text-secondary);
  font-size: 1rem;
}

/* Loading / empty / error state */
.estado-card {
  background: var(--surface);
  border: 1px solid var(--border-color);
  border-radius: var(--border-radius);
  box-shadow: var(--shadow-light);
  padding: 40px 28px;
  text-align: center;
  color: var(--text-secondary);
}

.estado-card--chica {
  padding: 18px 20px;
  margin-bottom: 14px;
}

.estado-card--chica .estado-texto {
  margin: 0;
}

/* Filtro por sector */
.sectores-filtro {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 18px;
}

.sector-chip {
  background: var(--surface);
  border: 1px solid var(--border-color);
  color: var(--text-secondary);
  border-radius: 999px;
  padding: 7px 14px;
  font-family: 'Figtree', sans-serif;
  font-size: 0.82rem;
  font-weight: 600;
  cursor: pointer;
  transition: border-color 0.18s, background-color 0.18s, color 0.18s;
}

.sector-chip:hover {
  border-color: var(--border-color-strong);
  background: var(--surface-alt);
}

.sector-chip--activo {
  background: var(--accent);
  border-color: var(--accent);
  color: #fff;
}

.estado-titulo {
  font-family: 'EB Garamond', serif;
  font-size: 1.2rem;
  font-weight: 600;
  color: var(--ink);
  margin: 0 0 6px;
}

.estado-texto {
  font-size: 0.92rem;
  margin: 0 0 20px;
}

.spinner {
  width: 28px;
  height: 28px;
  margin: 0 auto 14px;
  border: 3px solid var(--border-color);
  border-top-color: var(--accent);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.open-btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 11px 20px;
  background: var(--ink);
  color: var(--surface);
  border-radius: var(--border-radius-small);
  font-family: 'Figtree', sans-serif;
  font-size: 0.92rem;
  font-weight: 600;
  cursor: pointer;
  box-shadow: var(--shadow-light);
  text-decoration: none;
  transition: background-color 0.18s, box-shadow 0.18s;
}

.open-btn:hover {
  background: var(--ink-soft);
  box-shadow: var(--shadow-medium);
}

/* Resumen con IA */
.resumen-card {
  background: var(--surface);
  border: 1px solid var(--accent-soft-strong);
  border-radius: var(--border-radius);
  box-shadow: var(--shadow-light);
  padding: 22px 24px;
  margin-bottom: 18px;
}

.resumen-header {
  display: flex;
  align-items: center;
  gap: 9px;
  color: var(--accent);
  margin-bottom: 12px;
}

.resumen-title {
  font-family: 'EB Garamond', serif;
  font-size: 1.2rem;
  font-weight: 600;
  color: var(--ink);
  margin: 0;
}

.resumen-loading {
  display: flex;
  align-items: center;
  gap: 10px;
  color: var(--text-secondary);
  font-size: 0.92rem;
}

.spinner--small {
  width: 18px;
  height: 18px;
  margin: 0;
  border-width: 2px;
  flex-shrink: 0;
}

.resumen-texto {
  font-size: 0.95rem;
  line-height: 1.6;
  color: var(--ink-soft);
  margin: 0 0 16px;
}

.resumen-destacadas-label {
  font-size: 0.75rem;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--accent);
  margin: 0 0 10px;
}

.destacada-item {
  padding: 10px 14px;
  background: var(--accent-soft);
  border-radius: var(--border-radius-small);
  margin-bottom: 8px;
}

.destacada-item:last-child {
  margin-bottom: 0;
}

.destacada-titulo {
  font-weight: 600;
  color: var(--ink);
  margin: 0 0 3px;
  font-size: 0.92rem;
}

.destacada-razon {
  color: var(--text-secondary);
  font-size: 0.88rem;
  margin: 0;
}

/* Lista de normas */
.normas-grid {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.norma-card {
  background: var(--surface);
  border: 1px solid var(--border-color);
  border-radius: var(--border-radius);
  box-shadow: var(--shadow-light);
  padding: 18px 22px;
  transition: border-color 0.2s, box-shadow 0.2s;
}

.norma-card:hover {
  border-color: var(--border-color-strong);
  box-shadow: var(--shadow-medium);
}

.norma-card--activa {
  border-color: var(--accent);
  box-shadow: var(--shadow-medium);
}

.norma-card-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 8px;
}

.norma-sector {
  font-family: 'Figtree', sans-serif;
  font-size: 0.75rem;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--accent);
  background: var(--accent-soft);
  padding: 3px 10px;
  border-radius: var(--border-radius-small);
}

.norma-fecha {
  font-size: 0.82rem;
  color: var(--text-muted);
  flex-shrink: 0;
}

.norma-titulo {
  display: block;
  width: 100%;
  text-align: left;
  background: none;
  border: none;
  padding: 0;
  cursor: pointer;
  font-family: 'EB Garamond', serif;
  font-size: 1.15rem;
  font-weight: 600;
  color: var(--ink);
  text-decoration: none;
  margin-bottom: 6px;
}

.norma-titulo:hover {
  color: var(--accent);
  text-decoration: underline;
}

.norma-sumilla {
  font-size: 0.92rem;
  line-height: 1.55;
  color: var(--text-secondary);
  margin: 0;
}

/* Responsive */
@media (max-width: 480px) {
  .norma-card-head {
    flex-direction: column;
    align-items: flex-start;
    gap: 4px;
  }
}
</style>
