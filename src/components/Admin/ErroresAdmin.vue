<template>
  <div class="section-block q-mb-lg er">
    <div class="actions-bar q-mb-sm">
      <span class="section-label">Errores de pantalla</span>
      <q-btn flat dense no-caps color="accent" icon="refresh" label="Actualizar" :loading="cargando" @click="leer" />
    </div>
    <p class="er-ayuda">
      Lo que falla en el navegador de los usuarios con sesión iniciada (botones que no responden, vistas que no cargan…).
      El mismo error se agrupa en una sola fila con cuántas veces y a cuántas personas les pasó.
      Solo se guarda el error técnico, nunca el texto de las consultas ni de los documentos.
      También aparecen en Google Cloud › Error Reporting, donde puedes activar avisos por correo.
    </p>

    <p v-if="error" class="er-error">{{ error }}</p>

    <template v-if="datos">
      <!-- 1. Resumen -->
      <div class="er-tiles q-mb-lg">
        <div class="er-tile">
          <span class="er-tile-etiqueta">Errores hoy</span>
          <span class="er-tile-valor">{{ hoy?.produccion ?? 0 }}</span>
          <span class="er-tile-nota">en la página publicada<template v-if="hoy?.local"> · {{ hoy.local }} en localhost</template></span>
        </div>
        <div class="er-tile">
          <span class="er-tile-etiqueta">Últimos 7 días</span>
          <span class="er-tile-valor">{{ semana }}</span>
          <span class="er-tile-nota">en la página publicada</span>
        </div>
        <div class="er-tile">
          <span class="er-tile-etiqueta">Sin resolver</span>
          <span class="er-tile-valor" :class="{ 'er-tile-valor--alerta': abiertos.length }">{{ abiertos.length }}</span>
          <span class="er-tile-nota">errores distintos</span>
        </div>
      </div>

      <!-- 2. Errores por día -->
      <h3 class="er-titulo">Errores por día (página publicada)</h3>
      <GraficoBarrasDia :puntos="puntosDias" unidad="errores" class="q-mb-lg" />

      <!-- 3. Lista agrupada -->
      <div class="er-barra-lista q-mb-sm">
        <h3 class="er-titulo q-mb-none">Errores</h3>
        <q-btn-toggle
          v-model="filtro"
          no-caps unelevated dense size="sm"
          toggle-color="accent" color="white" text-color="accent"
          class="er-filtro"
          :options="[
            { label: `Sin resolver (${abiertos.length})`, value: 'abierto' },
            { label: 'Resueltos', value: 'resuelto' },
            { label: 'Todos', value: 'todos' }
          ]"
        />
        <q-checkbox v-model="conLocal" dense size="sm" label="Incluir localhost" class="er-check" />
      </div>

      <p v-if="!visibles.length" class="er-vacio">
        <q-icon name="check_circle" size="20px" />
        {{ filtro === 'abierto' ? 'No hay errores sin resolver. 🎉' : 'No hay errores en esta lista.' }}
      </p>

      <div v-for="g in visibles" :key="g.id" class="er-item" :class="{ 'er-item--resuelto': g.estado === 'resuelto' }">
        <button class="er-item-cabeza" :aria-expanded="abierto === g.id" @click="abierto = abierto === g.id ? null : g.id">
          <q-icon :name="g.estado === 'resuelto' ? 'check_circle' : 'error_outline'" size="20px" :class="g.estado === 'resuelto' ? 'er-ok' : 'er-mal'" />
          <span class="er-item-cuerpo">
            <span class="er-item-mensaje">{{ g.mensaje }}</span>
            <span class="er-item-meta">
              <span>{{ paginaPrincipal(g) }}</span>
              <span v-if="g.componente">{{ g.componente }}</span>
              <span>{{ plural(g.veces, 'vez', 'veces') }} · {{ plural(g.personas, 'persona', 'personas') }}</span>
              <span>última: {{ hace(g.ultimaVez) }}</span>
            </span>
          </span>
          <span class="er-item-etiquetas">
            <span v-if="g.reabierto" class="er-chip er-chip--alerta">Volvió a pasar</span>
            <span v-if="soloLocal(g)" class="er-chip">Localhost</span>
          </span>
          <q-icon :name="abierto === g.id ? 'expand_less' : 'expand_more'" size="20px" class="er-flecha" />
        </button>

        <div v-if="abierto === g.id" class="er-detalle">
          <dl class="er-datos">
            <div><dt>Primera vez</dt><dd>{{ fechaHora(g.primeraVez) }}</dd></div>
            <div><dt>Última vez</dt><dd>{{ fechaHora(g.ultimaVez) }}</dd></div>
            <div><dt>Tipo</dt><dd>{{ TIPOS[g.tipo] }}</dd></div>
            <div><dt>Páginas</dt><dd>{{ lista(g.rutas, nombrePagina) }}</dd></div>
            <div><dt>Navegadores</dt><dd>{{ lista(g.navegadores) }}</dd></div>
          </dl>
          <template v-if="g.pila">
            <span class="er-detalle-etiqueta">Dónde falló en el código</span>
            <pre class="er-pila">{{ g.pila }}</pre>
          </template>
          <div class="row justify-end q-mt-sm">
            <q-btn
              v-if="g.estado === 'abierto'"
              unelevated no-caps color="accent" icon="check" label="Marcar como resuelto"
              :loading="cambiando === g.id" @click="cambiar(g, 'resuelto')"
            />
            <q-btn
              v-else
              outline no-caps color="accent" icon="undo" label="Reabrir"
              :loading="cambiando === g.id" @click="cambiar(g, 'abierto')"
            />
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
// =========================
// ERRORES DE PANTALLA (Admin): errores del navegador agrupados
// (Cloud Function erroresAdmin, ver functions/src/errores.ts)
// =========================
import { computed, onMounted, ref } from 'vue'
import { cambiarEstadoError, leerErrores, type GrupoError, type ResumenErrores } from '../../services/erroresService'
import GraficoBarrasDia from './GraficoBarrasDia.vue'

const datos = ref<ResumenErrores | null>(null)
const cargando = ref(false)
const cambiando = ref<string | null>(null)
const error = ref('')
const filtro = ref<'abierto' | 'resuelto' | 'todos'>('abierto')
const conLocal = ref(true)
const abierto = ref<string | null>(null)

const TIPOS: Record<GrupoError['tipo'], string> = {
  vue: 'Error de un componente (Vue)',
  ventana: 'Error de la página',
  promesa: 'Operación que falló sin aviso (promesa)'
}

const PAGINAS: Array<[string, string]> = [
  ['/app/consultas', 'Consultas'],
  ['/app/analisis', 'Análisis de contratos'],
  ['/app/contratos', 'Gestión de contratos'],
  ['/app/redaccion', 'Redacción'],
  ['/app/panorama', 'Panorama'],
  ['/app/normas', 'Biblioteca legal'],
  ['/app/admin', 'Admin'],
  ['/legal', 'Términos y privacidad']
]

const nombrePagina = (ruta: string) => PAGINAS.find(([p]) => ruta.startsWith(p))?.[1] ?? (ruta === '/' ? 'Inicio' : ruta)
const plural = (n: number, uno: string, varios: string) => `${n} ${n === 1 ? uno : varios}`
const soloLocal = (g: GrupoError) => !g.entornos.produccion && !!g.entornos.local

function paginaPrincipal(g: GrupoError): string {
  const [ruta] = Object.entries(g.rutas).sort((a, b) => b[1] - a[1])[0] ?? ['/']
  return nombrePagina(ruta)
}

function lista(conteos: Record<string, number>, nombre: (k: string) => string = k => k): string {
  return Object.entries(conteos).sort((a, b) => b[1] - a[1]).map(([k, n]) => `${nombre(k)} (${n})`).join(', ') || '—'
}

function hace(ms: number | null): string {
  if (!ms) return '—'
  const minutos = Math.round((Date.now() - ms) / 60_000)
  if (minutos < 1) return 'hace un momento'
  if (minutos < 60) return `hace ${plural(minutos, 'minuto', 'minutos')}`
  const horas = Math.round(minutos / 60)
  if (horas < 24) return `hace ${plural(horas, 'hora', 'horas')}`
  return `hace ${plural(Math.round(horas / 24), 'día', 'días')}`
}

const fechaHora = (ms: number | null) => (ms ? new Date(ms).toLocaleString('es-PE', { dateStyle: 'medium', timeStyle: 'short' }) : '—')

const hoy = computed(() => datos.value?.dias[datos.value.dias.length - 1])
const semana = computed(() => (datos.value?.dias ?? []).slice(-7).reduce((s, d) => s + d.produccion, 0))

const puntosDias = computed(() => (datos.value?.dias ?? []).map(d => ({
  fecha: d.fecha,
  valor: d.produccion,
  detalle: d.local ? [`${d.local} en localhost (no se suman)`] : []
})))

const conEntorno = computed(() => (datos.value?.grupos ?? []).filter(g => conLocal.value || !soloLocal(g)))
const abiertos = computed(() => conEntorno.value.filter(g => g.estado === 'abierto'))
const visibles = computed(() => (filtro.value === 'todos' ? conEntorno.value : conEntorno.value.filter(g => g.estado === filtro.value)))

async function leer() {
  cargando.value = true
  error.value = ''
  try {
    datos.value = await leerErrores()
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'No se pudieron leer los errores'
  } finally {
    cargando.value = false
  }
}

async function cambiar(g: GrupoError, estado: GrupoError['estado']) {
  cambiando.value = g.id
  error.value = ''
  try {
    datos.value = await cambiarEstadoError(g.id, estado)
    abierto.value = null
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'No se pudo cambiar el estado'
  } finally {
    cambiando.value = null
  }
}

onMounted(() => { void leer() })
</script>

<style scoped>
.er { color: var(--ink, #1a1f2b); font-family: 'Urbanist', 'Figtree', sans-serif; }
.er-ayuda { margin: 0 0 10px; font-size: 0.86rem; color: #5b6475; }
.er-error { margin: 0 0 10px; font-size: 0.86rem; color: #b42318; }

.er-titulo {
  margin: 0 0 8px;
  font-family: 'Baskervville', 'EB Garamond', serif;
  font-size: 1.05rem;
  font-weight: 600;
  line-height: 1.3;
  color: var(--ink, #1a1f2b);
}

/* Tarjetas de números (mismo estilo que Analítica) */
.er-tiles { display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 12px; }
.er-tile { display: flex; flex-direction: column; gap: 2px; padding: 14px 16px; border: 1px solid #E4E7EC; border-radius: 10px; background: #FFFFFF; }
.er-tile-etiqueta { font-size: 0.8rem; font-weight: 600; color: #5b6475; }
.er-tile-valor { font-family: 'Baskervville', 'EB Garamond', serif; font-size: 1.9rem; font-weight: 600; line-height: 1.15; font-variant-numeric: tabular-nums; }
.er-tile-valor--alerta { color: #b42318; }
.er-tile-nota { font-size: 0.76rem; color: #5b6475; line-height: 1.35; }

/* Filtros de la lista */
.er-barra-lista { display: flex; flex-wrap: wrap; align-items: center; gap: 8px 16px; }
.er-filtro { border: 1px solid #D5DAE1; border-radius: 8px; overflow: hidden; }
.er-check { font-size: 0.82rem; color: #5b6475; margin-left: auto; }
.er-vacio { display: flex; align-items: center; gap: 8px; margin: 12px 0 0; font-size: 0.9rem; color: #2f6b3a; }

/* Cada error */
.er-item { border: 1px solid #E4E7EC; border-radius: 10px; margin-top: 8px; background: #FFFFFF; }
.er-item--resuelto { background: #FAFBFC; }
.er-item-cabeza {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  width: 100%;
  padding: 12px 14px;
  border: 0;
  background: none;
  text-align: left;
  font: inherit;
  color: inherit;
  cursor: pointer;
  border-radius: 10px;
}
.er-item-cabeza:hover { background: rgba(29, 78, 137, 0.04); }
.er-item-cabeza:focus-visible { outline: 2px solid #1D4E89; outline-offset: -2px; }
.er-ok { color: #2f6b3a; margin-top: 1px; }
.er-mal { color: #b42318; margin-top: 1px; }
.er-item-cuerpo { display: flex; flex-direction: column; gap: 4px; min-width: 0; flex: 1; }
.er-item-mensaje {
  font-family: ui-monospace, 'Cascadia Mono', Consolas, monospace;
  font-size: 0.82rem;
  line-height: 1.4;
  overflow-wrap: anywhere;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.er-item-meta { display: flex; flex-wrap: wrap; gap: 2px 14px; font-size: 0.76rem; color: #5b6475; }
.er-item-etiquetas { display: flex; gap: 6px; flex-shrink: 0; }
.er-chip { padding: 2px 8px; border-radius: 999px; background: #F1F3F6; font-size: 0.72rem; font-weight: 600; color: #5b6475; white-space: nowrap; }
.er-chip--alerta { background: #FEF3F2; color: #b42318; }
.er-flecha { color: #5b6475; flex-shrink: 0; margin-top: 1px; }

/* Detalle desplegado */
.er-detalle { padding: 0 14px 14px 44px; }
.er-datos { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 8px 16px; margin: 0 0 10px; }
.er-datos dt { font-size: 0.74rem; font-weight: 600; color: #5b6475; }
.er-datos dd { margin: 0; font-size: 0.82rem; overflow-wrap: anywhere; }
.er-detalle-etiqueta { display: block; font-size: 0.74rem; font-weight: 600; color: #5b6475; margin-bottom: 4px; }
.er-pila {
  margin: 0;
  max-height: 220px;
  overflow: auto;
  padding: 10px 12px;
  border-radius: 8px;
  background: #F6F7F9;
  font-family: ui-monospace, 'Cascadia Mono', Consolas, monospace;
  font-size: 0.74rem;
  line-height: 1.5;
  white-space: pre;
}

@media (max-width: 600px) {
  .er-detalle { padding-left: 14px; }
  .er-check { margin-left: 0; }
}
</style>
