<template>
  <div class="section-block q-mb-lg paso-v2">
    <div class="actions-bar q-mb-sm">
      <span class="section-label">Paso a producción · búsqueda de Consultas</span>
      <q-btn flat dense no-caps color="accent" icon="refresh" label="Actualizar estado" :loading="cargando" @click="actualizar" />
    </div>

    <div class="paso-v2-fila">
      <div>
        <div class="text-weight-medium">1. Respaldo de la base actual (__default__)</div>
        <div class="paso-v2-ayuda">Guarda IDs, metadatos y texto de todos los registros en Storage. No modifica Pinecone.</div>
        <div v-if="respaldo" class="paso-v2-ok">
          {{ respaldo.registros.toLocaleString('es-PE') }} registros · {{ (respaldo.bytesGzip / 1024 / 1024).toFixed(1) }} MB · {{ respaldo.ruta }}
          · <a :href="respaldo.url" target="_blank" rel="noopener">descargar</a> (enlace válido 24 h)
        </div>
      </div>
      <q-btn outline no-caps color="accent" icon="backup" label="Hacer respaldo" :loading="respaldando" @click="respaldar" />
    </div>

    <div class="paso-v2-fila">
      <div>
        <div class="text-weight-medium">2. Búsqueda que usa Consultas</div>
        <div class="paso-v2-ayuda">
          "Actual" = la de siempre sobre __default__. "Nueva" = búsqueda D sobre el esquema nuevo ({{ NAMESPACE_PRODUCCION }}).
          Volver atrás es inmediato y no requiere deploy (tarda hasta 1 minuto en aplicarse).
        </div>
        <div v-if="config" class="q-mt-xs">
          Ahora: <q-badge :color="config.modo === 'v2' ? 'positive' : 'grey-7'" :label="config.modo === 'v2' ? `Nueva (${config.namespace})` : 'Actual (__default__)'" />
          <span v-if="normasProduccion !== null" class="paso-v2-ayuda q-ml-sm">· {{ normasProduccion }} normas cargadas en {{ NAMESPACE_PRODUCCION }}</span>
        </div>
      </div>
      <div class="column q-gutter-xs">
        <q-btn v-if="config?.modo !== 'v2'" unelevated no-caps color="accent" icon="bolt" label="Usar la búsqueda nueva" :disable="!config" @click="pedir('v2')" />
        <q-btn v-else outline no-caps color="negative" icon="undo" label="Volver a la búsqueda actual" @click="pedir('actual')" />
      </div>
    </div>

    <q-dialog :model-value="modoPedido !== null" persistent @update:model-value="v => { if (!v) modoPedido = null }">
      <q-card :dark="false" style="min-width: 360px; max-width: 540px">
        <q-card-section class="text-h6">{{ modoPedido === 'v2' ? 'Usar la búsqueda nueva en Consultas' : 'Volver a la búsqueda actual' }}</q-card-section>
        <q-card-section v-if="modoPedido === 'v2'">
          <q-banner v-if="!respaldo" dense rounded class="bg-orange-1 text-orange-10 q-mb-sm">Todavía no hiciste el respaldo en esta sesión.</q-banner>
          <q-banner v-if="!normasProduccion" dense rounded class="bg-orange-1 text-orange-10 q-mb-sm">No hay normas cargadas en {{ NAMESPACE_PRODUCCION }}: Consultas no encontraría artículos.</q-banner>
          Todos los usuarios de Consultas pasarán a la búsqueda nueva sobre {{ NAMESPACE_PRODUCCION }}. Análisis de contratos no cambia.
        </q-card-section>
        <q-card-section v-else>Consultas vuelve a la búsqueda de siempre sobre __default__.</q-card-section>
        <q-card-actions align="right">
          <q-btn flat no-caps color="grey-8" label="Cancelar" @click="modoPedido = null" />
          <q-btn unelevated no-caps :color="modoPedido === 'v2' ? 'accent' : 'negative'" label="Confirmar" :loading="cambiando" @click="confirmar" />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </div>
</template>

<script setup lang="ts">
// =========================
// PASO A PRODUCCIÓN (mejora de Consultas, fase 4)
// Respaldo de la base actual e interruptor de la búsqueda de Consultas
// (Firestore config/consultas). Ver functions/src/configBusqueda.ts.
// =========================
import { onMounted, ref } from 'vue'
import { useQuasar } from 'quasar'
import {
  NAMESPACE_PRODUCCION, leerConfigBusqueda, cambiarBusqueda, respaldarBaseActual, listarNormasV2,
  type ConfigBusqueda, type RespaldoBase
} from '../../services/normasV2Service'

const $q = useQuasar()
const config = ref<ConfigBusqueda | null>(null)
const normasProduccion = ref<number | null>(null)
const respaldo = ref<RespaldoBase | null>(null)
const cargando = ref(false)
const respaldando = ref(false)
const cambiando = ref(false)
const modoPedido = ref<'actual' | 'v2' | null>(null)

async function actualizar() {
  cargando.value = true
  try {
    const [c, normas] = await Promise.all([leerConfigBusqueda(), listarNormasV2(NAMESPACE_PRODUCCION)])
    config.value = c
    normasProduccion.value = normas.length
  } catch (err) {
    $q.notify({ type: 'negative', message: err instanceof Error ? err.message : 'No se pudo leer el estado' })
  } finally {
    cargando.value = false
  }
}

async function respaldar() {
  respaldando.value = true
  try {
    respaldo.value = await respaldarBaseActual()
    $q.notify({ type: 'positive', message: `Respaldo listo: ${respaldo.value.registros} registros` })
  } catch (err) {
    $q.notify({ type: 'negative', message: err instanceof Error ? err.message : 'No se pudo hacer el respaldo' })
  } finally {
    respaldando.value = false
  }
}

function pedir(modo: 'actual' | 'v2') {
  modoPedido.value = modo
}

async function confirmar() {
  if (!modoPedido.value) return
  cambiando.value = true
  try {
    config.value = await cambiarBusqueda(modoPedido.value)
    $q.notify({ type: 'positive', message: config.value.modo === 'v2' ? 'Consultas usa la búsqueda nueva' : 'Consultas volvió a la búsqueda actual' })
    modoPedido.value = null
  } catch (err) {
    $q.notify({ type: 'negative', message: err instanceof Error ? err.message : 'No se pudo cambiar' })
  } finally {
    cambiando.value = false
  }
}

onMounted(() => { void actualizar() })
</script>

<style scoped>
.paso-v2 { color: var(--ink, #1a1f2b); }
.paso-v2-fila { display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; padding: 12px 0; border-top: 1px solid #e4e7ec; }
.paso-v2-ayuda { font-size: 0.86rem; color: #5b6475; }
.paso-v2-ok { margin-top: 4px; font-size: 0.86rem; color: #1b7f3b; word-break: break-all; }
</style>
