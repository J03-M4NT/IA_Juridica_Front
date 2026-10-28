<template>
  <div class="section-block q-mb-lg meta-admin">
    <div class="actions-bar q-mb-sm">
      <span class="section-label">Meta búsqueda · directorio de fuentes</span>
      <q-btn flat dense no-caps color="accent" icon="refresh" label="Leer directorio" :loading="leyendo" @click="leer" />
    </div>
    <p class="meta-admin-ayuda">
      Solo se muestran frases respaldadas por páginas cuyo dominio sea uno de los permitidos o termine en ".dominio" (por ejemplo, gob.pe acepta sunat.gob.pe).
      Los sitios prioritarios y las palabras clave orientan la búsqueda. Un dominio o palabra por línea. Los cambios se aplican sin deploy.
    </p>

    <div v-if="directorio" class="row q-col-gutter-md">
      <div class="col-12 col-md-4">
        <q-input v-model="dominios" type="textarea" autogrow outlined dense label="Dominios permitidos *" :dark="false" />
      </div>
      <div class="col-12 col-md-4">
        <q-input v-model="sitios" type="textarea" autogrow outlined dense label="Sitios prioritarios" :dark="false" />
      </div>
      <div class="col-12 col-md-4">
        <q-input v-model="palabras" type="textarea" autogrow outlined dense label="Palabras clave" :dark="false" />
      </div>
      <div class="col-12 row justify-end">
        <q-btn unelevated no-caps color="accent" icon="save" label="Guardar directorio" :loading="guardando" @click="guardar" />
      </div>
    </div>

    <div class="meta-admin-prueba q-mt-md">
      <div class="text-weight-medium q-mb-xs">Prueba (diagnóstico, solo admins)</div>
      <p class="meta-admin-ayuda">
        Corre la meta búsqueda con las preguntas "sin base" de la evaluación y muestra qué dominios aparecieron y cuáles se descartaron.
        Usa {{ PREGUNTAS_PRUEBA.length }} de tus meta búsquedas del día.
      </p>
      <q-btn outline no-caps color="accent" icon="travel_explore" label="Probar meta búsqueda" :loading="probando" @click="probar" />
      <div v-if="pruebas.length" class="meta-admin-tabla-wrap q-mt-sm">
        <table class="meta-admin-tabla">
          <thead><tr><th>Pregunta</th><th>Frases</th><th>Fuentes oficiales</th><th>Descartadas</th><th>Tiempo</th></tr></thead>
          <tbody>
            <tr v-for="p in pruebas" :key="p.pregunta">
              <td>{{ p.pregunta }}</td>
              <template v-if="p.resultado">
                <td>{{ p.resultado.resumen.length }}</td>
                <td>{{ p.resultado.fuentes.map(f => f.dominio).join(', ') || '—' }}</td>
                <td>{{ p.resultado.diagnostico?.dominiosDescartados.join(', ') || '—' }}</td>
                <td>{{ p.resultado.diagnostico ? `${(p.resultado.diagnostico.ms / 1000).toFixed(1)} s` : '' }}</td>
              </template>
              <td v-else colspan="4" class="meta-admin-error">{{ p.error }}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <div v-if="pruebas.length" class="row justify-end q-mt-xs">
        <q-btn flat dense no-caps color="accent" icon="download" label="Descargar prueba (JSON)" @click="descargar" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
// =========================
// META BÚSQUEDA (Admin): directorio de fuentes permitidas y prueba
// Ver functions/src/metaBusqueda.ts.
// =========================
import { onMounted, ref } from 'vue'
import { useQuasar } from 'quasar'
import { leerDirectorio, guardarDirectorio, metaBuscar, type DirectorioMetaBusqueda, type ResultadoMetaBusqueda } from '../../services/metaBusquedaService'
import { PREGUNTAS_BASE } from '../../utils/normas/evaluacion/preguntasBase'

const $q = useQuasar()
const directorio = ref<DirectorioMetaBusqueda | null>(null)
const dominios = ref('')
const sitios = ref('')
const palabras = ref('')
const leyendo = ref(false)
const guardando = ref(false)
const probando = ref(false)
const pruebas = ref<Array<{ pregunta: string; resultado?: ResultadoMetaBusqueda; error?: string }>>([])

const PREGUNTAS_PRUEBA = PREGUNTAS_BASE.preguntas.filter(p => p.tipo === 'sin-base').map(p => p.pregunta)
const lineas = (t: string) => t.split('\n').map(x => x.trim()).filter(Boolean)

function aplicar(d: DirectorioMetaBusqueda) {
  directorio.value = d
  dominios.value = d.dominios.join('\n')
  sitios.value = d.sitiosPrioritarios.join('\n')
  palabras.value = d.palabrasClave.join('\n')
}

async function leer() {
  leyendo.value = true
  try {
    aplicar(await leerDirectorio())
  } catch (err) {
    $q.notify({ type: 'negative', message: err instanceof Error ? err.message : 'No se pudo leer el directorio' })
  } finally {
    leyendo.value = false
  }
}

async function guardar() {
  guardando.value = true
  try {
    aplicar(await guardarDirectorio({ dominios: lineas(dominios.value), sitiosPrioritarios: lineas(sitios.value), palabrasClave: lineas(palabras.value) }))
    $q.notify({ type: 'positive', message: 'Directorio guardado' })
  } catch (err) {
    $q.notify({ type: 'negative', message: err instanceof Error ? err.message : 'No se pudo guardar' })
  } finally {
    guardando.value = false
  }
}

async function probar() {
  probando.value = true
  pruebas.value = []
  for (const pregunta of PREGUNTAS_PRUEBA) {
    try {
      pruebas.value.push({ pregunta, resultado: await metaBuscar(pregunta, { diagnostico: true }) })
    } catch (err) {
      pruebas.value.push({ pregunta, error: err instanceof Error ? err.message : 'Error' })
    }
  }
  probando.value = false
}

function descargar() {
  const blob = new Blob([JSON.stringify({ generadoEn: new Date().toISOString(), directorio: directorio.value, pruebas: pruebas.value }, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const enlace = document.createElement('a')
  enlace.href = url
  enlace.download = `meta-busqueda-prueba-${new Date().toISOString().slice(0, 10)}.json`
  enlace.click()
  URL.revokeObjectURL(url)
}

onMounted(() => { void leer() })
</script>

<style scoped>
.meta-admin { color: var(--ink, #1a1f2b); }
.meta-admin-ayuda { margin: 0 0 10px; font-size: 0.86rem; color: #5b6475; }
.meta-admin-prueba { padding-top: 12px; border-top: 1px solid #e4e7ec; }
.meta-admin-tabla-wrap { overflow-x: auto; }
.meta-admin-tabla { width: 100%; border-collapse: collapse; font-size: 0.85rem; }
.meta-admin-tabla th { text-align: left; padding: 6px 8px; border-bottom: 1px solid #1a1f2b; color: #5b6475; font-weight: 600; white-space: nowrap; }
.meta-admin-tabla td { padding: 6px 8px; border-bottom: 1px solid #e4e7ec; vertical-align: top; }
.meta-admin-error { color: #b42318; font-style: italic; }
</style>
