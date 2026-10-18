<template>
  <div class="section-block q-mb-lg eval-v2">
    <div class="actions-bar q-mb-sm">
      <div>
        <span class="section-label">Evaluación A/B/C · solo lectura</span>
        <q-badge outline color="orange-9" class="q-ml-sm" :label="juego.estado" />
      </div>
      <div class="row q-gutter-sm">
        <q-btn flat dense no-caps color="accent" icon="download" label="Descargar preguntas" @click="descargar(juego, 'preguntas-evaluacion')" />
        <q-btn flat dense no-caps color="accent" icon="upload_file" label="Cargar preguntas (JSON)" @click="selector?.click()" />
        <input ref="selector" type="file" accept=".json,application/json" class="hidden" @change="cargarJuego">
        <q-btn unelevated no-caps color="accent" icon="science" label="Ejecutar evaluación" :loading="evaluando" @click="evaluar" />
      </div>
    </div>

    <p class="eval-v2-ayuda">
      {{ juego.nombre }} · {{ juego.preguntas.length }} preguntas. Compara la base actual (A), el esquema nuevo con la búsqueda de hoy (B)
      y el esquema nuevo con la búsqueda mejorada (C). No modifica nada. Tarda unos minutos.
    </p>

    <template v-if="informe">
      <div class="eval-v2-tabla-wrap">
        <table class="eval-v2-tabla">
          <thead>
            <tr><th>Variante</th><th>Acierto en el 1.º</th><th>Cobertura en 5</th><th>Cobertura en 8</th><th>MRR</th><th>Sin resultados</th><th>Errores</th><th>Tiempo prom.</th></tr>
          </thead>
          <tbody>
            <tr v-for="r in informe.resumen" :key="r.variante">
              <td><strong>{{ r.variante }}</strong></td>
              <td>{{ pct(r.acierto1) }}</td><td>{{ pct(r.cobertura5) }}</td><td>{{ pct(r.cobertura8) }}</td>
              <td>{{ r.mrr.toFixed(2) }}</td><td>{{ r.sinResultados }}</td><td>{{ r.errores }}</td><td>{{ r.msPromedio }} ms</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="q-mt-md">
        <strong>Preguntas donde C empeora respecto de A: {{ informe.cPeorQueA.length }}</strong>
        <ul v-if="informe.cPeorQueA.length" class="q-my-xs">
          <li v-for="c in informe.cPeorQueA" :key="c.id">{{ c.id }} · {{ c.pregunta }} — A: {{ puestos(c.A.puestos) }} · C: {{ puestos(c.C.puestos) }}</li>
        </ul>
      </div>

      <div class="eval-v2-tabla-wrap q-mt-md">
        <table class="eval-v2-tabla">
          <thead><tr><th>#</th><th>Pregunta</th><th>Esperado</th><th>A</th><th>B</th><th>C</th></tr></thead>
          <tbody>
            <tr v-for="r in informe.resultados" :key="r.id">
              <td>{{ r.id }}</td>
              <td>{{ r.pregunta }}</td>
              <td>{{ r.esperados.map(e => `${e.norma} ${e.articulo}`).join(' · ') }}</td>
              <td :class="clase(r.A)">{{ puestos(r.A.puestos) }}</td>
              <td :class="clase(r.B)">{{ puestos(r.B.puestos) }}</td>
              <td :class="clase(r.C)">{{ puestos(r.C.puestos) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <div class="q-mt-sm row items-center justify-between">
        <span class="text-grey-7">Puesto del artículo esperado entre los resultados (— = no aparece). {{ informe.segundos }} s.</span>
        <q-btn flat dense no-caps color="accent" icon="download" label="Descargar informe (JSON)" @click="descargar(informe, 'evaluacion-normas-v2')" />
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
// =========================
// EVALUACIÓN A/B/C (mejora de Consultas, fase 3) — SOLO LECTURA
// Corre el juego de preguntas en la Cloud Function evaluarRecuperacion y
// muestra el resumen. El juego por defecto es el borrador de 20 preguntas;
// se puede cargar otro en JSON (mismo formato) para evaluar otras áreas.
// =========================
import { ref } from 'vue'
import { useQuasar } from 'quasar'
import { PREGUNTAS_BASE, type JuegoPreguntas } from '../../utils/normas/evaluacion/preguntasBase'
import { evaluarRecuperacion, type InformeEvaluacion, type ResultadoVariante } from '../../services/normasV2Service'

const $q = useQuasar()
const juego = ref<JuegoPreguntas>(PREGUNTAS_BASE)
const informe = ref<InformeEvaluacion | null>(null)
const evaluando = ref(false)
const selector = ref<HTMLInputElement | null>(null)

const pct = (x: number) => `${Math.round(x * 100)} %`
const puestos = (p: Array<number | null>) => p.map(x => (x === null ? '—' : `${x}.º`)).join(' / ')
const clase = (r: ResultadoVariante) => (r.error ? 'eval-v2-error' : r.hit1 ? 'eval-v2-bien' : r.recall8 > 0 ? 'eval-v2-medio' : 'eval-v2-mal')

async function evaluar() {
  evaluando.value = true
  try {
    informe.value = await evaluarRecuperacion(juego.value.preguntas)
    $q.notify({ type: 'positive', message: 'Evaluación terminada' })
  } catch (err) {
    $q.notify({ type: 'negative', message: err instanceof Error ? err.message : 'No se pudo evaluar' })
  } finally {
    evaluando.value = false
  }
}

async function cargarJuego(e: Event) {
  const archivo = (e.target as HTMLInputElement).files?.[0]
  if (!archivo) return
  try {
    const datos = JSON.parse(await archivo.text()) as Partial<JuegoPreguntas>
    if (!Array.isArray(datos.preguntas) || datos.preguntas.length === 0) throw new Error('El archivo no tiene "preguntas"')
    juego.value = {
      nombre: datos.nombre ?? archivo.name,
      estado: datos.estado ?? 'borrador, pendiente de validación legal',
      version: datos.version ?? 1,
      preguntas: datos.preguntas
    }
    informe.value = null
    $q.notify({ type: 'positive', message: `${datos.preguntas.length} preguntas cargadas` })
  } catch (err) {
    $q.notify({ type: 'negative', message: err instanceof Error ? err.message : 'Archivo inválido' })
  } finally {
    if (selector.value) selector.value.value = ''
  }
}

function descargar(datos: unknown, nombre: string) {
  const blob = new Blob([JSON.stringify(datos, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const enlace = document.createElement('a')
  enlace.href = url
  enlace.download = `${nombre}-${new Date().toISOString().slice(0, 10)}.json`
  enlace.click()
  URL.revokeObjectURL(url)
}
</script>

<style scoped>
.eval-v2 { color: var(--ink, #1a1f2b); }
.eval-v2-ayuda { margin: 0 0 12px; font-size: 0.88rem; color: #5b6475; }
.eval-v2-tabla-wrap { overflow-x: auto; }
.eval-v2-tabla { width: 100%; border-collapse: collapse; font-size: 0.85rem; }
.eval-v2-tabla th { text-align: left; padding: 6px 8px; border-bottom: 1px solid #1a1f2b; color: #5b6475; font-weight: 600; white-space: nowrap; }
.eval-v2-tabla td { padding: 6px 8px; border-bottom: 1px solid #e4e7ec; vertical-align: top; }
.eval-v2-bien { color: #1b7f3b; font-weight: 600; }
.eval-v2-medio { color: #9a6a12; font-weight: 600; }
.eval-v2-mal { color: #b42318; font-weight: 600; }
.eval-v2-error { color: #b42318; font-style: italic; }
</style>
