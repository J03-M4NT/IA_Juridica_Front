<template>
  <q-page class="normas-page">

    <!-- Envuelve header + error + layout: mantiene la columna de lectura
         angosta y centrada, mientras la página (.normas-page) en sí usa
         todo el ancho para el fondo oscuro (ver .q-page.normas-page más
         abajo) — sin este wrapper, el fondo quedaría acotado al mismo
         ancho angosto y se vería el fondo claro del contenedor a los
         costados en pantallas anchas. -->
    <div class="normas-content" :class="{ 'normas-content--split': normaSeleccionada }">

    <!-- Section header: banda corporativa (navy) con cifras del día -->
    <div class="page-header normas-banner">
      <div class="section-icon-wrap icon-orange">
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
          <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
          <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
        </svg>
      </div>
      <div class="page-header-text">
        <span class="normas-eyebrow">Normas legales · Fuente oficial</span>
        <h1 class="page-title">Normas del Diario Oficial El Peruano</h1>
        <p class="page-subtitle">
          <span v-if="fechaEdicion">Edición del {{ formatFecha(fechaEdicion) }}</span>
          <span v-else>Actualizaciones normativas · fuente oficial</span>
        </p>
      </div>

      <!-- Cifras de la edición (solo lectura de lo ya cargado) -->
      <div v-if="normas.length" class="normas-cifras">
        <div class="normas-cifra">
          <span class="normas-cifra-num">{{ normas.length }}</span>
          <span class="normas-cifra-label">{{ normas.length === 1 ? 'norma' : 'normas' }}</span>
        </div>
        <div v-if="sectores.length" class="normas-cifra">
          <span class="normas-cifra-num">{{ sectores.length }}</span>
          <span class="normas-cifra-label">{{ sectores.length === 1 ? 'sector' : 'sectores' }}</span>
        </div>
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
          <span class="resumen-icon-wrap">
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
              <path d="M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M18.4 5.6l-2.8 2.8M8.4 15.6l-2.8 2.8"/>
            </svg>
          </span>
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
        <article
          v-for="(norma, ni) in normasFiltradas"
          :key="norma.id"
          class="norma-card"
          :class="{ 'norma-card--activa': normaSeleccionada?.id === norma.id }"
          :style="{ '--i': Math.min(ni, 12) }"
        >
          <div class="norma-card-head">
            <span class="norma-sector">{{ norma.sector }}</span>
            <span v-if="normaSeleccionada?.id === norma.id" class="norma-abierta">
              <span class="norma-abierta-punto" aria-hidden="true"></span>
              Abierta
            </span>
            <span v-else class="norma-fecha">{{ norma.fecha }}</span>
          </div>
          <button type="button" class="norma-titulo" @click="verPdf(norma)">
            <span>{{ norma.titulo }}</span>
            <svg class="norma-titulo-flecha" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M5 12h14M13 6l6 6-6 6"/>
            </svg>
          </button>
          <p v-if="norma.sumilla" class="norma-sumilla">{{ norma.sumilla }}</p>
          <!-- Toda la tarjeta abre el PDF (el botón del título se estira
               sobre ella con CSS); esta etiqueta solo lo indica. -->
          <span class="norma-cta" aria-hidden="true">
            Ver documento
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M5 12h14M13 6l6 6-6 6"/>
            </svg>
          </span>
        </article>
      </div>

    </template>

    </div>

    <!-- Panel del PDF, al costado — se resuelve la URL real del archivo
         (no la página visor de El Peruano) para mostrarlo embebido acá
         mismo, sin salir de la plataforma. -->
    <Transition name="panel-pdf">
    <div v-if="normaSeleccionada" class="pdf-panel">
      <div class="pdf-panel-header">
        <div class="pdf-panel-encabezado">
          <span class="pdf-panel-sector">{{ normaSeleccionada.sector }}</span>
          <span class="pdf-panel-titulo" :title="normaSeleccionada.titulo">{{ normaSeleccionada.titulo }}</span>
        </div>
        <div class="pdf-panel-acciones">
          <a
            v-if="urlPdfSeleccionada"
            :href="urlPdfSeleccionada"
            target="_blank"
            rel="noopener"
            class="pdf-panel-boton pdf-panel-boton--texto"
            title="Abrir en una pestaña nueva"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">
              <path d="M7 17L17 7M7 7h10v10"/>
            </svg>
            <span>Abrir</span>
          </a>
          <button type="button" class="pdf-panel-boton" title="Cerrar" @click="cerrarPdf">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">
              <path d="M18 6L6 18M6 6l12 12"/>
            </svg>
          </button>
        </div>
      </div>

      <!-- Resumen con IA del PDF de esta norma — plegable, para dejar
           todo el alto al PDF cuando ya se leyó. -->
      <div class="norma-resumen" :class="{ 'norma-resumen--plegado': !resumenNormaAbierto }">
        <button type="button" class="norma-resumen-toggle" @click="resumenNormaAbierto = !resumenNormaAbierto">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M18.4 5.6l-2.8 2.8M8.4 15.6l-2.8 2.8"/>
          </svg>
          <span>Resumen de la norma con IA</span>
          <svg
            class="norma-resumen-chevron" width="14" height="14" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
          >
            <path d="M6 9l6 6 6-6"/>
          </svg>
        </button>

        <div v-if="resumenNormaAbierto" class="norma-resumen-body">
          <div v-if="cargandoResumenNorma" class="resumen-loading">
            <div class="spinner spinner--small"></div>
            <span>Leyendo el PDF y generando el resumen…</span>
          </div>
          <div v-else-if="errorResumenNorma" class="norma-resumen-error">
            <span>{{ errorResumenNorma }}</span>
            <button type="button" class="norma-resumen-reintentar" @click="cargarResumenNorma(normaSeleccionada)">Reintentar</button>
          </div>
          <template v-else-if="resumenNorma">
            <p class="norma-resumen-texto">{{ resumenNorma.resumen }}</p>
            <ul v-if="resumenNorma.puntosClave.length" class="norma-resumen-puntos">
              <li v-for="(punto, idx) in resumenNorma.puntosClave" :key="idx">{{ punto }}</li>
            </ul>
            <p v-if="resumenNorma.aQuienAplica" class="norma-resumen-dato">
              <span class="norma-resumen-etiqueta">A quién aplica:</span> {{ resumenNorma.aQuienAplica }}
            </p>
            <p v-if="resumenNorma.vigencia" class="norma-resumen-dato">
              <span class="norma-resumen-etiqueta">Vigencia:</span> {{ resumenNorma.vigencia }}
            </p>
            <p class="norma-resumen-aviso">Generado con IA a partir del PDF oficial. Verifica en el texto de la norma.</p>
          </template>
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
    </Transition>

    </div>

    </div>

  </q-page>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { obtenerUltimasNormas, actualizarNormasDelDia, resolverUrlPdf, resumirNorma, type NormaDelDia, type ResumenNorma } from '../services/normasService'
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

// Resumen con IA del PDF de la norma abierta. El servidor lo guarda para
// todos los usuarios; acá además se recuerda en la sesión para no volver
// a pedirlo al reabrir la misma norma.
const resumenNorma = ref<ResumenNorma | null>(null)
const cargandoResumenNorma = ref(false)
const errorResumenNorma = ref<string | null>(null)
const resumenNormaAbierto = ref(true)
const cacheResumenNorma = new Map<string, ResumenNorma>()

async function cargarResumenNorma(norma: NormaDelDia | null) {
  if (!norma) return
  const urlOrigen = norma.urlPdf || norma.urlDetalle
  errorResumenNorma.value = null

  const cacheado = cacheResumenNorma.get(urlOrigen)
  if (cacheado) {
    resumenNorma.value = cacheado
    cargandoResumenNorma.value = false
    return
  }

  resumenNorma.value = null
  cargandoResumenNorma.value = true
  try {
    const resultado = await resumirNorma(urlOrigen, norma.titulo)
    cacheResumenNorma.set(urlOrigen, resultado)
    if (normaSeleccionada.value?.id === norma.id) resumenNorma.value = resultado
  } catch (err) {
    if (normaSeleccionada.value?.id === norma.id) errorResumenNorma.value = getErrorMessage(err)
  } finally {
    if (normaSeleccionada.value?.id === norma.id) cargandoResumenNorma.value = false
  }
}

async function verPdf(norma: NormaDelDia) {
  normaSeleccionada.value = norma
  errorPdf.value = null
  void cargarResumenNorma(norma)

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
  resumenNorma.value = null
  errorResumenNorma.value = null
  cargandoResumenNorma.value = false
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
/* ==============================
   Paleta clara verde-bosque/beige (misma familia que LandingPage.vue,
   Contratos, Consultas y Análisis), variables propias con prefijo ln-,
   definidas solo dentro de .normas-page. No se tocan las variables
   globales (--surface, --bg, etc. en src/css/app.scss). Acento en verde
   bosque profundo — el tono más oscuro de la paleta — para transmitir la
   seriedad de "normas oficiales", distinto del resto de secciones.
   ============================== */
.normas-page {
  --ln-bg: var(--lexit-blanco);
  --ln-surface: var(--lexit-blanco);
  --ln-surface-alt: var(--lexit-marfil);
  --ln-surface-sunken: var(--lexit-marfil-suave);
  --ln-border: var(--lexit-marfil);
  --ln-border-strong: rgba(var(--lexit-verde-rgb), 0.18);
  --ln-text: var(--lexit-verde);
  --ln-text-muted: var(--lexit-texto-secundario);
  --ln-text-faint: var(--lexit-texto-tenue);
  --ln-accent: var(--lexit-verde);
  --ln-accent-hover: rgba(var(--lexit-verde-rgb), 0.85);
  --ln-accent-soft: var(--lexit-marfil-suave);
  --ln-accent-soft-strong: var(--lexit-marfil);
  --ln-ink: var(--lexit-blanco-calido);

  animation: floatUp 0.5s ease-out both;
}

/* .q-page trae max-width:1400px + margin:0 auto de MainLayout.vue (regla
   compartida por toda la app) — sin anularla acá, en pantallas anchas se
   ve el fondo claro de .page-container detrás del área oscura (mismo bug
   ya resuelto en ContratosPage.vue/ConsultasPage.vue). La columna de
   lectura angosta (antes en .normas-page) se movió a .normas-content
   (ver más abajo), así el fondo oscuro llega de borde a borde mientras el
   contenido se mantiene legible y centrado. */
.q-page.normas-page {
  background: var(--ln-bg);
  max-width: none;
  margin: 0;
}

.normas-content {
  max-width: 920px;
  margin: 0 auto;
  transition: max-width 0.25s ease;
}

.normas-content--split {
  max-width: 1600px;
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
  flex: 0 0 400px;
  max-width: 400px;
}

.pdf-panel {
  flex: 1;
  min-width: 0;
  position: sticky;
  top: 16px;
  height: calc(100vh - 108px);
  display: flex;
  flex-direction: column;
  background: var(--ln-surface);
  border: 1px solid var(--ln-border);
  border-radius: var(--border-radius);
  box-shadow: 0 16px 40px -18px rgba(var(--lexit-verde-rgb), 0.22), 0 0 0 1px rgba(var(--lexit-verde-rgb), 0.05);
  overflow: hidden;
  transition: box-shadow 0.25s ease;
}

.pdf-panel:hover {
  box-shadow: 0 20px 48px -18px rgba(var(--lexit-verde-rgb), 0.26), 0 0 0 1px rgba(var(--lexit-verde-rgb), 0.08);
}

.pdf-panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 14px 18px;
  background: linear-gradient(180deg, var(--ln-surface-alt), var(--ln-surface));
  border-bottom: 1px solid var(--ln-border-strong);
  flex-shrink: 0;
}

.pdf-panel-titulo {
  font-family: 'Baskervville', 'Figtree', sans-serif;
  font-size: 0.86rem;
  font-weight: 600;
  color: var(--ln-text);
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
  color: var(--ln-text-muted);
  cursor: pointer;
  transition: background-color 0.18s, color 0.18s, transform 0.18s;
}

.pdf-panel-boton:hover {
  background: var(--ln-accent-soft);
  color: var(--ln-accent);
  transform: scale(1.08);
}

/* Resumen de la norma, entre la cabecera y el PDF. Alto acotado con
   scroll propio para que el PDF siempre quede visible debajo. */
.norma-resumen {
  flex-shrink: 0;
  border-bottom: 1px solid var(--ln-border);
  background: var(--ln-surface-alt);
}

.norma-resumen-toggle {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 10px 16px;
  background: none;
  border: none;
  cursor: pointer;
  color: var(--ln-accent);
  font-family: 'Baskervville', 'Figtree', sans-serif;
  font-size: 0.8rem;
  font-weight: 600;
  letter-spacing: 0.03em;
  text-transform: uppercase;
  text-align: left;
  transition: background-color 0.18s;
}

.norma-resumen-toggle:hover {
  background: var(--ln-accent-soft);
}

.norma-resumen-toggle span {
  flex: 1;
}

.norma-resumen-chevron {
  transform: rotate(180deg);
  transition: transform 0.2s;
}

.norma-resumen--plegado .norma-resumen-chevron {
  transform: none;
}

.norma-resumen-body {
  max-height: 38vh;
  overflow-y: auto;
  padding: 0 16px 14px;
}

.norma-resumen-texto {
  font-size: 0.9rem;
  line-height: 1.6;
  color: var(--ln-text);
  margin: 0 0 10px;
}

.norma-resumen-puntos {
  margin: 0 0 10px;
  padding-left: 18px;
  color: var(--ln-text);
  font-size: 0.86rem;
  line-height: 1.55;
}

.norma-resumen-puntos li {
  margin-bottom: 4px;
}

.norma-resumen-dato {
  font-size: 0.85rem;
  line-height: 1.5;
  color: var(--ln-text-muted);
  margin: 0 0 6px;
}

.norma-resumen-etiqueta {
  font-weight: 600;
  color: var(--ln-text);
}

.norma-resumen-aviso {
  font-size: 0.75rem;
  color: var(--ln-text-faint);
  margin: 8px 0 0;
}

.norma-resumen-error {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  font-size: 0.86rem;
  color: #C23B2E;
}

.norma-resumen-reintentar {
  flex-shrink: 0;
  background: none;
  border: 1px solid var(--ln-border-strong);
  border-radius: var(--border-radius-small);
  color: var(--ln-text);
  padding: 4px 10px;
  font-size: 0.8rem;
  cursor: pointer;
}

.norma-resumen-reintentar:hover {
  background: var(--ln-surface);
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
  color: var(--ln-text-muted);
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
    height: 85vh;
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
  background: var(--ln-surface);
  color: var(--ln-text);
  border: 1px solid var(--ln-border);
  border-radius: var(--border-radius-small);
  font-family: 'Baskervville', 'Figtree', sans-serif;
  font-size: 0.86rem;
  font-weight: 600;
  cursor: pointer;
  flex-shrink: 0;
  transition: border-color 0.18s, background-color 0.18s;
}

.refresh-btn:hover:not(:disabled) {
  border-color: var(--ln-border-strong);
  background: var(--ln-surface-alt);
}

.refresh-btn:disabled {
  cursor: default;
  color: var(--ln-text-faint);
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
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  box-shadow: 0 0 0 1px rgba(var(--lexit-verde-rgb), 0.12), 0 8px 20px -10px rgba(var(--lexit-verde-rgb), 0.28);
}

.icon-orange { background: var(--ln-accent-soft); color: var(--lexit-verde); }

.page-title {
  font-family: 'Baskervville', 'EB Garamond', serif;
  font-size: 2rem;
  font-weight: 600;
  margin: 0;
  color: var(--ln-text);
}

.page-subtitle {
  margin: 2px 0 0;
  color: var(--ln-text-muted);
  font-size: 1rem;
}

/* Loading / empty / error state */
.estado-card {
  background: var(--ln-surface);
  border: 1px solid var(--ln-border);
  border-radius: var(--border-radius);
  box-shadow: 0 8px 24px -14px rgba(var(--lexit-verde-rgb), 0.18);
  padding: 40px 28px;
  text-align: center;
  color: var(--ln-text-muted);
}

.estado-card--chica {
  padding: 18px 20px;
  margin-bottom: 14px;
}

.estado-card--chica .estado-texto {
  margin: 0;
}

/* Filtro por sector — chips chicos: con hasta 16 sectores en un día,
   el tamaño anterior (padding 7px/14px, 0.82rem) ocupaba varias filas
   completas antes de llegar a la lista de normas. */
.sectores-filtro {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
  margin-bottom: 14px;
}

.sector-chip {
  background: var(--ln-surface);
  border: 1px solid var(--ln-border);
  color: var(--ln-text-muted);
  border-radius: 999px;
  padding: 4px 10px;
  font-family: 'Baskervville', 'Figtree', sans-serif;
  font-size: 0.7rem;
  font-weight: 600;
  cursor: pointer;
  transition: border-color 0.18s, background-color 0.18s, color 0.18s, transform 0.18s;
}

.sector-chip:hover {
  border-color: var(--ln-border-strong);
  background: var(--ln-surface-alt);
  transform: translateY(-1px);
}

.sector-chip--activo {
  background: var(--ln-accent);
  border-color: var(--ln-accent);
  color: var(--ln-ink);
  box-shadow: 0 4px 14px -4px rgba(var(--lexit-verde-rgb), 0.35);
}

.sector-chip--activo:hover {
  transform: none;
}

.estado-titulo {
  font-family: 'Baskervville', 'EB Garamond', serif;
  font-size: 1.2rem;
  font-weight: 600;
  color: var(--ln-text);
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
  border: 3px solid var(--ln-border);
  border-top-color: var(--ln-accent);
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
  background: var(--ln-accent);
  color: var(--ln-ink);
  border-radius: var(--border-radius-small);
  font-family: 'Baskervville', 'Figtree', sans-serif;
  font-size: 0.92rem;
  font-weight: 600;
  cursor: pointer;
  box-shadow: 0 4px 14px -4px rgba(var(--lexit-verde-rgb), 0.32);
  text-decoration: none;
  transition: background-color 0.18s, box-shadow 0.18s;
}

.open-btn:hover {
  background: var(--ln-accent-hover);
  color: #fff;
}

/* Resumen con IA */
.resumen-card {
  background: linear-gradient(165deg, var(--ln-surface) 0%, var(--ln-surface-alt) 130%);
  border: 1px solid var(--ln-accent-soft-strong);
  border-radius: var(--border-radius);
  box-shadow: 0 8px 24px -14px rgba(var(--lexit-verde-rgb), 0.20), 0 0 0 1px rgba(var(--lexit-verde-rgb), 0.04);
  padding: 24px 26px;
  margin-bottom: 20px;
}

.resumen-header {
  display: flex;
  align-items: center;
  gap: 11px;
  color: var(--ln-accent);
  margin-bottom: 14px;
}

.resumen-icon-wrap {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  flex-shrink: 0;
  border-radius: 50%;
  background: var(--ln-accent-soft);
  color: var(--ln-accent);
}

.resumen-title {
  font-family: 'Baskervville', 'EB Garamond', serif;
  font-size: 1.2rem;
  font-weight: 600;
  color: var(--ln-text);
  margin: 0;
}

.resumen-loading {
  display: flex;
  align-items: center;
  gap: 10px;
  color: var(--ln-text-muted);
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
  color: var(--ln-text);
  margin: 0 0 16px;
}

.resumen-destacadas-label {
  font-size: 0.75rem;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--ln-accent);
  margin: 0 0 10px;
}

.destacada-item {
  padding: 10px 14px;
  background: var(--ln-accent-soft);
  border-radius: var(--border-radius-small);
  margin-bottom: 8px;
  border-left: 2px solid transparent;
  transition: border-color 0.18s, background-color 0.18s;
}

.destacada-item:hover {
  border-left-color: var(--ln-accent);
  background: var(--ln-accent-soft-strong);
}

.destacada-item:last-child {
  margin-bottom: 0;
}

.destacada-titulo {
  font-weight: 600;
  color: var(--ln-text);
  margin: 0 0 3px;
  font-size: 0.92rem;
}

.destacada-razon {
  color: var(--ln-text-muted);
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
  position: relative;
  background: var(--ln-surface);
  border: 1px solid var(--ln-border);
  border-radius: var(--border-radius);
  box-shadow: 0 6px 18px -12px rgba(var(--lexit-verde-rgb), 0.16);
  padding: 18px 22px 18px 25px;
  transition: border-color 0.2s, box-shadow 0.2s, transform 0.2s;
  overflow: hidden;
}

.norma-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  bottom: 0;
  width: 3px;
  background: var(--ln-accent);
  transform: scaleY(0);
  transform-origin: center;
  transition: transform 0.22s ease;
}

.norma-card:hover {
  border-color: var(--ln-border-strong);
  box-shadow: 0 14px 30px -16px rgba(var(--lexit-verde-rgb), 0.22);
  transform: translateY(-2px);
}

.norma-card:hover::before {
  transform: scaleY(1);
}

.norma-card--activa {
  border-color: var(--ln-accent);
  background: var(--ln-accent-soft);
  box-shadow: 0 14px 30px -16px rgba(var(--lexit-verde-rgb), 0.22);
}

.norma-card--activa::before {
  transform: scaleY(1);
}

.norma-card-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 8px;
}

.norma-sector {
  font-family: 'Baskervville', 'Figtree', sans-serif;
  font-size: 0.75rem;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--ln-accent);
  background: var(--ln-accent-soft);
  padding: 3px 10px;
  border-radius: var(--border-radius-small);
}

.norma-fecha {
  font-size: 0.82rem;
  color: var(--ln-text-faint);
  flex-shrink: 0;
}

.norma-titulo {
  display: flex;
  align-items: baseline;
  gap: 8px;
  width: 100%;
  text-align: left;
  background: none;
  border: none;
  padding: 0;
  cursor: pointer;
  font-family: 'Baskervville', 'EB Garamond', serif;
  font-size: 1.15rem;
  font-weight: 600;
  color: var(--ln-text);
  text-decoration: none;
  margin-bottom: 6px;
}

.norma-titulo span {
  flex: 1;
}

.norma-titulo-flecha {
  flex-shrink: 0;
  color: var(--ln-accent);
  opacity: 0;
  transform: translateX(-4px);
  transition: opacity 0.2s, transform 0.2s;
}

.norma-titulo:hover {
  color: var(--ln-accent);
}

.norma-titulo:hover .norma-titulo-flecha {
  opacity: 1;
  transform: translateX(0);
}

.norma-sumilla {
  font-size: 0.92rem;
  line-height: 1.55;
  color: var(--ln-text-muted);
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

/* ==========================================================================
   DISEÑO CORPORATIVO DE NORMAS (paleta de funciones)
   Navy #1B2632 (--lexit-verde dentro de la app), Blue Fantastic #2C3B4D,
   Palladian #EEE9DF, Oatmeal (bordes), Burning Flame #FFB162 y Truffle
   Trouble #A35139 como acentos. El contenido sigue sobre blanco.
   Solo estilos: mismas clases y comportamiento de siempre.
   ========================================================================== */
.normas-page {
  --ln-navy: var(--lexit-verde);
  --ln-azul: var(--lexit-azul, #2C3B4D);
  --ln-naranja: var(--lexit-piedra);
  --ln-terracota: var(--lexit-terracota, #A35139);
  --ln-palladian: var(--lexit-blanco-calido);
  --ln-palladian-suave: rgba(238, 233, 223, 0.55);
}

/* ---- Banda del encabezado ---- */
.normas-banner {
  position: relative;
  overflow: hidden;
  gap: 20px;
  padding: 26px 28px;
  margin-bottom: 22px;
  background: var(--ln-navy);
  color: var(--ln-palladian);
  border-bottom: 3px solid var(--ln-naranja);
}

/* Líneas finas en diagonal, muy sutiles, a la derecha de la banda */
.normas-banner::after {
  content: '';
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  width: 45%;
  background: repeating-linear-gradient(-45deg, rgba(238, 233, 223, 0.05) 0 1px, transparent 1px 14px);
  -webkit-mask-image: linear-gradient(90deg, transparent, #000 60%);
  mask-image: linear-gradient(90deg, transparent, #000 60%);
  pointer-events: none;
}

.normas-banner > * {
  position: relative;
  z-index: 1;
}

.normas-banner .section-icon-wrap {
  width: 54px;
  height: 54px;
  background: var(--ln-naranja);
  color: var(--ln-navy);
}

.normas-eyebrow {
  display: block;
  margin-bottom: 4px;
  font-size: 0.7rem;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--ln-naranja);
}

.normas-banner .page-title {
  font-size: clamp(1.5rem, 2.6vw, 2.05rem);
  line-height: 1.2;
  color: #FFFFFF;
}

.normas-banner .page-subtitle {
  margin-top: 4px;
  color: rgba(238, 233, 223, 0.78);
  font-size: 0.95rem;
}

/* Cifras del día */
.normas-cifras {
  display: flex;
  flex-shrink: 0;
  border-left: 1px solid rgba(238, 233, 223, 0.18);
}

.normas-cifra {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 2px 20px;
  border-right: 1px solid rgba(238, 233, 223, 0.18);
}

.normas-cifra-num {
  font-size: 1.7rem;
  font-weight: 700;
  line-height: 1.1;
  color: #FFFFFF;
  font-variant-numeric: tabular-nums;
}

.normas-cifra-label {
  font-size: 0.68rem;
  font-weight: 600;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: rgba(238, 233, 223, 0.7);
}

/* Botón Actualizar sobre la banda */
.normas-banner .refresh-btn {
  background: transparent;
  color: var(--ln-palladian);
  border-color: rgba(238, 233, 223, 0.4);
}

.normas-banner .refresh-btn:hover:not(:disabled) {
  background: var(--ln-naranja);
  border-color: var(--ln-naranja);
  color: var(--ln-navy);
}

.normas-banner .refresh-btn:disabled {
  color: rgba(238, 233, 223, 0.6);
}

.refresh-error {
  margin: -10px 0 18px;
}

@media (max-width: 760px) {
  .normas-banner {
    flex-wrap: wrap;
    padding: 20px;
  }
  .normas-cifras {
    order: 3;
    width: 100%;
    border-left: none;
    border-top: 1px solid rgba(238, 233, 223, 0.18);
    padding-top: 12px;
  }
  .normas-cifra:first-child { padding-left: 0; }
}

/* ---- Resumen del día con IA ---- */
.resumen-card {
  background: var(--ln-palladian-suave);
  border: 1px solid var(--ln-border);
  border-left: 4px solid var(--ln-terracota);
}

.resumen-icon-wrap {
  background: var(--ln-navy);
  color: var(--ln-naranja);
}

.resumen-title {
  color: var(--ln-navy);
}

.resumen-destacadas-label {
  color: var(--ln-terracota);
  letter-spacing: 0.1em;
}

.destacada-item {
  background: #FFFFFF;
  border: 1px solid var(--ln-border);
  border-left: 3px solid var(--ln-border);
}

.destacada-item:hover {
  background: #FFFFFF;
  border-left-color: var(--ln-naranja);
}

/* ---- Filtro por sector: etiquetas rectas ---- */
.sector-chip {
  padding: 5px 11px;
  letter-spacing: 0.02em;
  color: var(--ln-navy);
}

.sector-chip:hover {
  background: var(--ln-palladian-suave);
  border-color: var(--ln-azul);
  transform: none;
}

.sector-chip--activo,
.sector-chip--activo:hover {
  background: var(--ln-navy);
  border-color: var(--ln-navy);
  color: #FFFFFF;
}

/* ---- Tarjetas de normas ---- */
.norma-card {
  padding: 18px 22px 18px 24px;
}

.norma-card::before {
  width: 4px;
  background: var(--ln-azul);
}

.norma-card:hover {
  border-color: var(--ln-azul);
  transform: none;
}

.norma-card--activa {
  background: var(--ln-palladian-suave);
  border-color: var(--ln-terracota);
}

.norma-card--activa::before {
  background: var(--ln-terracota);
}

.norma-sector {
  color: var(--ln-navy);
  background: var(--ln-palladian);
  font-size: 0.68rem;
  font-weight: 700;
  letter-spacing: 0.08em;
}

.norma-fecha {
  font-variant-numeric: tabular-nums;
}

.norma-titulo {
  color: var(--ln-navy);
  transition: color 0.18s;
}

.norma-titulo:hover {
  color: var(--ln-terracota);
}

.norma-titulo-flecha {
  color: var(--ln-terracota);
}

/* ---- Estados ---- */
.spinner {
  border-color: var(--ln-palladian);
  border-top-color: var(--ln-terracota);
}

.open-btn {
  background: var(--ln-navy);
  color: #FFFFFF;
}

.open-btn:hover {
  background: var(--ln-azul);
}

/* ---- Panel del PDF ---- */
.pdf-panel {
  border-color: var(--ln-border);
  border-top: 3px solid var(--ln-naranja);
}

.pdf-panel-header {
  background: var(--ln-navy);
  border-bottom: none;
}

.pdf-panel-titulo {
  color: #FFFFFF;
}

.pdf-panel-boton {
  color: rgba(238, 233, 223, 0.8);
}

.pdf-panel-boton:hover {
  background: rgba(238, 233, 223, 0.12);
  color: var(--ln-naranja);
  transform: none;
}

.norma-resumen {
  background: var(--ln-palladian-suave);
}

.norma-resumen-toggle {
  color: var(--ln-terracota);
  letter-spacing: 0.08em;
}

.norma-resumen-toggle:hover {
  background: var(--ln-palladian);
}

.norma-resumen-etiqueta {
  color: var(--ln-navy);
}

.norma-resumen-puntos li::marker {
  color: var(--ln-terracota);
}

/* ==========================================================================
   NORMAS — ANCHO COMPLETO, PANEL DEL PDF A PANTALLA COMPLETA Y MÁS
   INTERACCIÓN (solo estilos y marcado; misma funcionalidad)
   ========================================================================== */

/* Sin "transform" persistente: la animación de entrada deja la página
   transformada y eso impedía que el panel del PDF se fije a la ventana. */
.normas-page {
  animation-fill-mode: backwards;
}

/* Todo el ancho disponible (antes una columna angosta y centrada) */
.normas-content,
.normas-content--split {
  max-width: none;
}

/* ---- Lista: dos columnas cuando no hay PDF abierto ---- */
.normas-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(380px, 1fr));
  gap: 14px;
}

.normas-layout--split .normas-grid {
  grid-template-columns: minmax(0, 1fr);
}

/* ---- Panel del PDF: fijo a la derecha, alto completo de la ventana ---- */
.normas-page {
  --ln-panel-ancho: min(58vw, 1040px);
}

.normas-layout--split .normas-col {
  flex: 1 1 auto;
  max-width: none;
  margin-right: calc(var(--ln-panel-ancho) - 8px);
}

.pdf-panel {
  position: fixed;
  top: 0;
  right: 0;
  bottom: 0;
  z-index: 1500;
  width: var(--ln-panel-ancho);
  height: auto;
  border-top: none;
  border-right: none;
  border-bottom: none;
  border-left: 1px solid var(--ln-border);
  background: #FFFFFF;
}

.pdf-panel-header {
  padding: 14px 16px 14px 20px;
  border-bottom: 3px solid var(--ln-naranja);
}

.pdf-panel-encabezado {
  display: flex;
  flex-direction: column;
  min-width: 0;
  gap: 2px;
}

.pdf-panel-sector {
  font-size: 0.66rem;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--ln-naranja);
}

.pdf-panel-titulo {
  font-size: 0.95rem;
}

.pdf-panel-boton--texto {
  width: auto;
  gap: 6px;
  padding: 0 12px;
  border: 1px solid rgba(238, 233, 223, 0.35);
  font-size: 0.8rem;
  font-weight: 600;
  text-decoration: none;
}

.pdf-panel-boton--texto:hover {
  border-color: var(--ln-naranja);
}

/* El resumen deja casi todo el alto al PDF */
.norma-resumen-body {
  max-height: 26vh;
}

.pdf-panel-body {
  background: #525659; /* gris del visor de PDF, sin "saltos" de color al cargar */
}

.pdf-panel-status {
  color: rgba(238, 233, 223, 0.85);
}

.panel-pdf-enter-active,
.panel-pdf-leave-active {
  transition: transform 0.32s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.25s ease;
}

.panel-pdf-enter-from,
.panel-pdf-leave-to {
  transform: translateX(40px);
  opacity: 0;
}

@media (max-width: 900px) {
  /* En pantallas chicas el PDF ocupa toda la pantalla */
  .pdf-panel {
    position: fixed;
    inset: 0;
    width: 100%;
    height: auto;
    border-left: none;
  }
  .normas-layout--split .normas-col {
    margin-right: 0;
  }
  /* Espacio para el botón fijo que abre/cierra la barra lateral */
  .pdf-panel-header {
    padding-left: 60px;
  }
}

/* ---- Filtro de sectores fijo arriba al desplazarse ---- */
.sectores-filtro {
  position: sticky;
  top: 0;
  z-index: 5;
  margin: 0 -4px 14px;
  padding: 10px 4px;
  background: rgba(255, 255, 255, 0.94);
  -webkit-backdrop-filter: blur(6px);
  backdrop-filter: blur(6px);
  border-bottom: 1px solid var(--ln-border);
}

/* ---- Tarjetas interactivas ---- */
.norma-card {
  display: flex;
  flex-direction: column;
  cursor: pointer;
  animation: normaEntrada 0.45s ease-out both;
  animation-delay: calc(var(--i, 0) * 40ms);
}

@keyframes normaEntrada {
  from { opacity: 0; transform: translateY(10px); }
  to   { opacity: 1; transform: none; }
}

/* El botón del título cubre toda la tarjeta: clic en cualquier parte */
.norma-titulo::after {
  content: '';
  position: absolute;
  inset: 0;
  z-index: 1;
}

.norma-titulo:focus-visible {
  outline: none;
}

.norma-card:has(.norma-titulo:focus-visible) {
  outline: 2px solid var(--ln-naranja);
  outline-offset: 2px;
}

.norma-card:hover .norma-titulo {
  color: var(--ln-terracota);
}

.norma-card:hover .norma-titulo-flecha {
  opacity: 1;
  transform: none;
}

.norma-sumilla {
  display: -webkit-box;
  -webkit-line-clamp: 3;
  line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.norma-cta {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  align-self: flex-start;
  margin-top: 12px;
  padding: 5px 12px;
  border: 1px solid var(--ln-border);
  font-size: 0.74rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--ln-navy);
  background: #FFFFFF;
  transition: background-color 0.2s, color 0.2s, border-color 0.2s, gap 0.2s;
}

.norma-card:hover .norma-cta {
  background: var(--ln-navy);
  border-color: var(--ln-navy);
  color: #FFFFFF;
  gap: 10px;
}

.norma-card--activa .norma-cta {
  background: var(--ln-terracota);
  border-color: var(--ln-terracota);
  color: #FFFFFF;
}

.norma-abierta {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--ln-terracota);
}

.norma-abierta-punto {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--ln-terracota);
  animation: abiertaPulso 1.6s ease-in-out infinite;
}

@keyframes abiertaPulso {
  0%, 100% { opacity: 1; }
  50%      { opacity: 0.35; }
}

@media (prefers-reduced-motion: reduce) {
  .norma-card,
  .norma-abierta-punto { animation: none; }
}
</style>
