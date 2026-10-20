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
        <div class="text-weight-medium">2. Índices de Pinecone</div>
        <div class="paso-v2-ayuda">
          lexit-e5 (multilingual-e5-large) es un índice aparte para seguir buscando mientras la cuota de llama-text-embed-v2 está agotada.
          Crearlo no toca el índice lexit ni __default__.
        </div>
        <ul v-if="info" class="paso-v2-lista">
          <li v-for="i in info.indices" :key="i.nombre">
            <strong>{{ i.nombre }}</strong> · {{ i.modelo ?? 'sin modelo integrado' }} · dimensión {{ i.dimension ?? '—' }} · {{ i.metrica ?? '—' }} · {{ i.estado ?? '—' }}
            <span v-if="normasPorIndice[i.nombre] !== undefined"> · {{ normasPorIndice[i.nombre] }} normas en {{ NAMESPACE_PRODUCCION }}</span>
          </li>
          <li v-if="limiteE5">multilingual-e5-large: hasta {{ limiteE5 }} tokens por texto.</li>
        </ul>
      </div>
      <div class="column q-gutter-xs">
        <q-btn flat dense no-caps color="accent" icon="info" label="Ver índices" :loading="leyendoInfo" @click="leerInfo" />
        <q-btn v-if="info && !existeE5" outline no-caps color="accent" icon="add" label="Crear índice e5" @click="confirmarCrear = true" />
      </div>
    </div>

    <div class="paso-v2-fila">
      <div>
        <div class="text-weight-medium">3. Búsqueda que usa Consultas</div>
        <div class="paso-v2-ayuda">
          "Actual" = la de siempre sobre __default__. "Nueva" = búsqueda D sobre el esquema nuevo ({{ NAMESPACE_PRODUCCION }}) en el índice elegido.
          Volver atrás es inmediato y no requiere deploy (tarda hasta 1 minuto en aplicarse).
        </div>
        <div v-if="config" class="q-mt-xs">
          Ahora: <q-badge :color="config.modo === 'v2' ? 'positive' : 'grey-7'" :label="config.modo === 'v2' ? `Nueva (${config.indice} / ${config.namespace})` : 'Actual (__default__)'" />
          <span class="paso-v2-ayuda q-ml-sm">· umbral reranker {{ config.umbralRerank || 'sin umbral' }} · umbral denso {{ config.umbralDenso || 'sin umbral' }}</span>
        </div>
        <div v-if="config" class="row items-center q-gutter-sm q-mt-sm">
          <q-btn-toggle
            v-model="indiceElegido" dense no-caps unelevated toggle-color="accent" color="grey-3" text-color="grey-9"
            :options="INDICES_V2.map(i => ({ label: i.nombre, value: i.id }))"
          />
          <q-input v-model.number="umbralRerank" type="number" step="0.01" min="0" max="1" dense outlined label="Umbral reranker" style="width: 140px" :dark="false" />
          <q-input v-model.number="umbralDenso" type="number" step="0.01" min="0" max="1" dense outlined label="Umbral denso" style="width: 140px" :dark="false" />
          <q-btn flat dense no-caps color="accent" label="Guardar índice y umbrales" :loading="cambiando" @click="guardarAjustes" />
        </div>
        <div class="paso-v2-ayuda q-mt-xs">0 = sin umbral. Los valores recomendados salen de la evaluación (calibración con las preguntas "sin base").</div>
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
          <q-banner v-if="!normasPorIndice[indiceElegido]" dense rounded class="bg-orange-1 text-orange-10 q-mb-sm">
            No hay normas cargadas en {{ indiceElegido }} / {{ NAMESPACE_PRODUCCION }} (o no se pudo leer): Consultas no encontraría artículos.
          </q-banner>
          Todos los usuarios de Consultas pasarán a la búsqueda nueva sobre {{ indiceElegido }} / {{ NAMESPACE_PRODUCCION }}
          (umbral reranker {{ umbralRerank || 'sin umbral' }}, umbral denso {{ umbralDenso || 'sin umbral' }}). Análisis de contratos no cambia.
        </q-card-section>
        <q-card-section v-else>Consultas vuelve a la búsqueda de siempre sobre __default__.</q-card-section>
        <q-card-actions align="right">
          <q-btn flat no-caps color="grey-8" label="Cancelar" @click="modoPedido = null" />
          <q-btn unelevated no-caps :color="modoPedido === 'v2' ? 'accent' : 'negative'" label="Confirmar" :loading="cambiando" @click="confirmar" />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <q-dialog v-model="confirmarCrear" persistent>
      <q-card :dark="false" style="min-width: 360px; max-width: 520px">
        <q-card-section class="text-h6">Crear el índice lexit-e5</q-card-section>
        <q-card-section>
          Se crea un índice nuevo con multilingual-e5-large (dimensión 1024, coseno), en la misma nube y región que lexit.
          Queda vacío hasta cargar las normas. No modifica ningún otro índice.
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat no-caps color="grey-8" label="Cancelar" v-close-popup />
          <q-btn unelevated no-caps color="accent" label="Crear" :loading="creando" @click="crear" />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </div>
</template>

<script setup lang="ts">
// =========================
// PASO A PRODUCCIÓN (mejora de Consultas, fase 4)
// Respaldo de la base actual, índices de Pinecone (crear lexit-e5) e
// interruptor de la búsqueda de Consultas (Firestore config/consultas:
// modo, índice y umbrales). Ver functions/src/configBusqueda.ts.
// =========================
import { computed, onMounted, ref } from 'vue'
import { useQuasar } from 'quasar'
import {
  NAMESPACE_PRODUCCION, INDICES_V2, leerConfigBusqueda, cambiarBusqueda, respaldarBaseActual, listarNormasV2, infoIndices, crearIndiceE5,
  type ConfigBusqueda, type RespaldoBase, type IndiceV2, type InfoIndices
} from '../../services/normasV2Service'

const $q = useQuasar()
const config = ref<ConfigBusqueda | null>(null)
// Normas cargadas en normas-v2 de cada índice (si se pudo leer)
const normasPorIndice = ref<Record<string, number>>({})
const respaldo = ref<RespaldoBase | null>(null)
const cargando = ref(false)
const respaldando = ref(false)
const cambiando = ref(false)
const modoPedido = ref<'actual' | 'v2' | null>(null)
const indiceElegido = ref<IndiceV2>('lexit')
const umbralRerank = ref(0)
const umbralDenso = ref(0)

const info = ref<InfoIndices | null>(null)
const leyendoInfo = ref(false)
const confirmarCrear = ref(false)
const creando = ref(false)
const existeE5 = computed(() => info.value?.indices.some(i => i.nombre === 'lexit-e5') ?? false)
const limiteE5 = computed(() => {
  const m = info.value?.modeloE5 as { maxSequenceLength?: number; max_sequence_length?: number } | undefined
  return m?.maxSequenceLength ?? m?.max_sequence_length ?? null
})

function aplicarConfig(c: ConfigBusqueda) {
  config.value = c
  indiceElegido.value = c.indice
  umbralRerank.value = c.umbralRerank
  umbralDenso.value = c.umbralDenso
}

async function actualizar() {
  cargando.value = true
  try {
    aplicarConfig(await leerConfigBusqueda())
    const conteos: Record<string, number> = {}
    await Promise.all(INDICES_V2.map(async i => {
      try {
        conteos[i.id] = (await listarNormasV2(NAMESPACE_PRODUCCION, i.id)).length
      } catch {
        // El índice todavía no existe o no responde
      }
    }))
    normasPorIndice.value = conteos
  } catch (err) {
    $q.notify({ type: 'negative', message: err instanceof Error ? err.message : 'No se pudo leer el estado' })
  } finally {
    cargando.value = false
  }
}

async function leerInfo() {
  leyendoInfo.value = true
  try {
    info.value = await infoIndices()
  } catch (err) {
    $q.notify({ type: 'negative', message: err instanceof Error ? err.message : 'No se pudo leer los índices' })
  } finally {
    leyendoInfo.value = false
  }
}

async function crear() {
  creando.value = true
  try {
    const r = await crearIndiceE5()
    $q.notify({ type: r.creado ? 'positive' : 'info', message: r.creado ? `Índice ${r.nombre} creado (dimensión ${r.dimension}, ${r.metrica})` : (r.mensaje ?? 'Sin cambios') })
    confirmarCrear.value = false
    await leerInfo()
    await actualizar()
  } catch (err) {
    $q.notify({ type: 'negative', message: err instanceof Error ? err.message : 'No se pudo crear el índice' })
  } finally {
    creando.value = false
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

const umbral = (x: number) => (Number.isFinite(x) ? Math.min(1, Math.max(0, x)) : 0)

async function guardarAjustes() {
  if (!config.value) return
  cambiando.value = true
  try {
    aplicarConfig(await cambiarBusqueda(config.value.modo, NAMESPACE_PRODUCCION, {
      indice: indiceElegido.value, umbralRerank: umbral(umbralRerank.value), umbralDenso: umbral(umbralDenso.value)
    }))
    $q.notify({ type: 'positive', message: 'Índice y umbrales guardados' })
  } catch (err) {
    $q.notify({ type: 'negative', message: err instanceof Error ? err.message : 'No se pudo guardar' })
  } finally {
    cambiando.value = false
  }
}

async function confirmar() {
  if (!modoPedido.value) return
  cambiando.value = true
  try {
    aplicarConfig(await cambiarBusqueda(modoPedido.value, NAMESPACE_PRODUCCION, modoPedido.value === 'v2'
      ? { indice: indiceElegido.value, umbralRerank: umbral(umbralRerank.value), umbralDenso: umbral(umbralDenso.value) }
      : {}))
    $q.notify({ type: 'positive', message: config.value?.modo === 'v2' ? `Consultas usa la búsqueda nueva (${config.value.indice})` : 'Consultas volvió a la búsqueda actual' })
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
.paso-v2-lista { margin: 6px 0 0; padding-left: 18px; font-size: 0.86rem; }
</style>
