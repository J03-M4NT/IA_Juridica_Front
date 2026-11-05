<template>
  <div class="section-block q-mb-lg an">
    <div class="actions-bar q-mb-sm">
      <span class="section-label">Analítica · últimos 30 días</span>
      <q-btn flat dense no-caps color="accent" icon="refresh" label="Actualizar" :loading="cargando" @click="leer" />
    </div>
    <p class="an-ayuda">
      Cuántas personas usan LexIT, qué herramientas usan más y cuánto se consume de la IA.
      Solo se guardan conteos: nunca el texto de las consultas ni de los documentos.
      Las acciones de administración no se cuentan.
    </p>

    <p v-if="error" class="an-error">{{ error }}</p>

    <template v-if="datos">
      <div v-if="!datos.desde" class="an-aviso q-mb-md">
        <q-icon name="schedule" size="18px" />
        <span>Todavía no hay datos. El conteo empieza cuando se publica esta versión de las funciones; las primeras cifras aparecen con el primer uso.</span>
      </div>

      <!-- 1. Personas -->
      <h3 class="an-titulo">Personas</h3>
      <div class="an-tiles q-mb-lg">
        <div class="an-tile">
          <span class="an-tile-etiqueta">Activas hoy</span>
          <span class="an-tile-valor">{{ datos.activos.hoy }}</span>
          <span class="an-tile-nota">usaron al menos una herramienta</span>
        </div>
        <div class="an-tile">
          <span class="an-tile-etiqueta">Activas en 7 días</span>
          <span class="an-tile-valor">{{ datos.activos.semana }}</span>
          <span class="an-tile-nota">personas distintas</span>
        </div>
        <div class="an-tile">
          <span class="an-tile-etiqueta">Activas en 30 días</span>
          <span class="an-tile-valor">{{ datos.activos.mes }}</span>
          <span class="an-tile-nota">personas distintas</span>
        </div>
        <div class="an-tile">
          <span class="an-tile-etiqueta">Usuarios registrados</span>
          <span class="an-tile-valor">{{ datos.usuarios.total }}</span>
          <span class="an-tile-nota">+{{ datos.usuarios.nuevosSemana }} esta semana · +{{ datos.usuarios.nuevosMes }} en 30 días</span>
        </div>
        <div class="an-tile">
          <span class="an-tile-etiqueta">Vuelven a usar LexIT</span>
          <span class="an-tile-valor">{{ retencion === null ? '—' : `${retencion} %` }}</span>
          <span class="an-tile-nota">de las personas activas cada día ya lo habían usado otro día</span>
        </div>
      </div>

      <!-- 2. Actividad diaria -->
      <h3 class="an-titulo">Personas activas por día</h3>
      <p class="an-ayuda">Pasa el mouse sobre una barra para ver cuántas eran nuevas y cuántas volvieron.</p>
      <GraficoBarrasDia :puntos="puntosActivos" unidad="personas activas" class="q-mb-sm" />
      <div class="row justify-end q-mb-lg">
        <q-btn flat dense no-caps size="sm" color="accent" :icon="verTabla ? 'expand_less' : 'table_rows'" :label="verTabla ? 'Ocultar tabla' : 'Ver como tabla'" @click="verTabla = !verTabla" />
      </div>
      <div v-if="verTabla" class="an-tabla-wrap q-mb-lg">
        <table class="an-tabla">
          <thead><tr><th>Día</th><th>Activas</th><th>Nuevas</th><th>Volvieron</th><th>Acciones</th></tr></thead>
          <tbody>
            <tr v-for="d in [...datos.dias].reverse()" :key="d.fecha">
              <td>{{ d.fecha }}</td>
              <td>{{ d.activos }}</td>
              <td>{{ d.nuevos }}</td>
              <td>{{ d.recurrentes }}</td>
              <td>{{ d.llamadas }}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- 3. Uso por herramienta -->
      <h3 class="an-titulo">Uso por herramienta</h3>
      <p class="an-ayuda">Acciones de los últimos 30 días (cada pregunta, análisis, descarga… cuenta una).</p>
      <div v-if="herramientas.some(h => h.total)" class="an-herramientas q-mb-lg">
        <div v-for="h in herramientas" :key="h.nombre" class="an-herr">
          <div class="an-herr-cabeza">
            <q-icon :name="h.icono" size="18px" class="an-herr-icono" />
            <span class="an-herr-nombre">{{ h.nombre }}</span>
            <span class="an-herr-total">{{ h.total.toLocaleString('es-PE') }}</span>
          </div>
          <div class="an-herr-pista">
            <div class="an-herr-barra" :style="{ width: `${h.total ? Math.max(2, (h.total / maxHerramienta) * 100) : 0}%` }" />
          </div>
          <div v-if="h.acciones.length" class="an-herr-detalle">
            <span v-for="a in h.acciones" :key="a.nombre">{{ a.nombre }}: {{ a.total.toLocaleString('es-PE') }}</span>
          </div>
        </div>
      </div>
      <p v-else class="an-ayuda q-mb-lg">Todavía no hay acciones contadas.</p>

      <!-- 4. Consumo de hoy -->
      <h3 class="an-titulo">Consumo de IA</h3>
      <div class="an-consumo">
        <div class="an-tile">
          <span class="an-tile-etiqueta">Consultas a la IA hoy</span>
          <span class="an-tile-valor">{{ datos.consumoHoy.ia.usadas }}</span>
          <span class="an-tile-nota">
            de {{ datos.consumoHoy.ia.usuarios }} {{ datos.consumoHoy.ia.usuarios === 1 ? 'persona' : 'personas' }}
            · {{ datos.consumoHoy.ia.enLimite }} llegaron al límite de {{ datos.consumoHoy.ia.limite }}
          </span>
        </div>
        <div class="an-tile">
          <span class="an-tile-etiqueta">Sugerencias en vivo hoy</span>
          <span class="an-tile-valor">{{ datos.consumoHoy.sugerencias.usadas }}</span>
          <span class="an-tile-nota">de {{ datos.consumoHoy.sugerencias.usuarios }} {{ datos.consumoHoy.sugerencias.usuarios === 1 ? 'persona' : 'personas' }} (Redacción)</span>
        </div>
        <div class="an-tile">
          <span class="an-tile-etiqueta">Reordenador de Pinecone este mes</span>
          <span class="an-tile-valor">{{ datos.consumoHoy.rerank.usados }} <small>/ {{ datos.consumoHoy.rerank.limite }}</small></span>
          <div class="an-medidor" role="meter" :aria-valuenow="datos.consumoHoy.rerank.usados" aria-valuemin="0" :aria-valuemax="datos.consumoHoy.rerank.limite" aria-label="Uso del reordenador de Pinecone este mes">
            <div class="an-medidor-barra" :style="{ width: `${Math.min(100, (datos.consumoHoy.rerank.usados / datos.consumoHoy.rerank.limite) * 100)}%` }" />
          </div>
          <span class="an-tile-nota">quedan {{ Math.max(0, datos.consumoHoy.rerank.limite - datos.consumoHoy.rerank.usados) }}; al acabarse, las búsquedas siguen sin reordenar</span>
        </div>
      </div>

      <p v-if="datos.desde" class="an-pie">Datos contados desde el {{ datos.desde }} · hora de Perú · hoy es {{ datos.hoy }}</p>
    </template>
  </div>
</template>

<script setup lang="ts">
// =========================
// ANALÍTICA (Admin): personas activas, uso por herramienta y consumo de IA
// (Cloud Function analiticaAdmin, ver functions/src/analitica.ts)
// =========================
import { computed, onMounted, ref } from 'vue'
import { HERRAMIENTAS, leerAnalitica, type ResumenAnalitica } from '../../services/analiticaService'
import GraficoBarrasDia from './GraficoBarrasDia.vue'

const datos = ref<ResumenAnalitica | null>(null)
const cargando = ref(false)
const error = ref('')
const verTabla = ref(false)

const plural = (n: number, uno: string, varios: string) => `${n} ${n === 1 ? uno : varios}`

const puntosActivos = computed(() => (datos.value?.dias ?? []).map(d => ({
  fecha: d.fecha,
  valor: d.activos,
  detalle: [
    `${plural(d.nuevos, 'nueva', 'nuevas')} · ${d.recurrentes} volvieron`,
    plural(d.llamadas, 'acción', 'acciones')
  ]
})))

// Suma de los 30 días por función
const totalesPorFuncion = computed(() => {
  const totales: Record<string, number> = {}
  for (const d of datos.value?.dias ?? []) {
    for (const [f, n] of Object.entries(d.porFuncion)) totales[f] = (totales[f] ?? 0) + n
  }
  return totales
})

const herramientas = computed(() => {
  const totales = totalesPorFuncion.value
  const conocidas = new Set(HERRAMIENTAS.flatMap(h => Object.keys(h.acciones)))
  const lista = HERRAMIENTAS.map(h => {
    const acciones = Object.entries(h.acciones)
      .map(([f, nombre]) => ({ nombre, total: totales[f] ?? 0 }))
      .filter(a => a.total > 0)
      .sort((a, b) => b.total - a.total)
    return { nombre: h.nombre, icono: h.icono, total: acciones.reduce((s, a) => s + a.total, 0), acciones }
  })
  // Funciones que no están en la lista (por ejemplo, una nueva)
  const otras = Object.entries(totales).filter(([f]) => !conocidas.has(f))
  if (otras.length) {
    lista.push({
      nombre: 'Otras',
      icono: 'more_horiz',
      total: otras.reduce((s, [, n]) => s + n, 0),
      acciones: otras.map(([f, n]) => ({ nombre: f, total: n })).sort((a, b) => b.total - a.total)
    })
  }
  return lista.sort((a, b) => b.total - a.total)
})

const maxHerramienta = computed(() => Math.max(1, ...herramientas.value.map(h => h.total)))

// De las personas activas cada día, qué porcentaje ya había usado LexIT
// otro día (suma de los 30 días)
const retencion = computed(() => {
  const dias = datos.value?.dias ?? []
  const activos = dias.reduce((s, d) => s + d.activos, 0)
  const recurrentes = dias.reduce((s, d) => s + d.recurrentes, 0)
  return activos ? Math.round((recurrentes / activos) * 100) : null
})

async function leer() {
  cargando.value = true
  error.value = ''
  try {
    datos.value = await leerAnalitica()
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'No se pudo leer la analítica'
  } finally {
    cargando.value = false
  }
}

onMounted(() => { void leer() })
</script>

<style scoped>
.an { color: var(--ink, #1a1f2b); font-family: 'Urbanist', 'Figtree', sans-serif; }
.an-ayuda { margin: 0 0 10px; font-size: 0.86rem; color: #5b6475; }
.an-error { margin: 0 0 10px; font-size: 0.86rem; color: #b42318; }
.an-pie { margin: 16px 0 0; font-size: 0.78rem; color: #5b6475; text-align: right; }

.an-aviso {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 10px 12px;
  border-radius: 8px;
  background: rgba(29, 78, 137, 0.06);
  color: #1D4E89;
  font-size: 0.86rem;
}

.an-titulo {
  margin: 0 0 8px;
  font-family: 'Baskervville', 'EB Garamond', serif;
  font-size: 1.05rem;
  font-weight: 600;
  line-height: 1.3;
  color: var(--ink, #1a1f2b);
}

/* Tarjetas de números */
.an-tiles,
.an-consumo {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 12px;
}

.an-tile {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 14px 16px;
  border: 1px solid #E4E7EC;
  border-radius: 10px;
  background: #FFFFFF;
}

.an-tile-etiqueta { font-size: 0.8rem; font-weight: 600; color: #5b6475; }
.an-tile-valor {
  font-family: 'Baskervville', 'EB Garamond', serif;
  font-size: 1.9rem;
  font-weight: 600;
  line-height: 1.15;
  color: var(--ink, #1a1f2b);
  font-variant-numeric: tabular-nums;
}
.an-tile-valor small { font-size: 1rem; color: #5b6475; }
.an-tile-nota { font-size: 0.76rem; color: #5b6475; line-height: 1.35; }

/* Uso por herramienta: barras horizontales de un solo color */
.an-herramientas { display: flex; flex-direction: column; gap: 14px; }
.an-herr-cabeza { display: flex; align-items: center; gap: 8px; margin-bottom: 4px; font-size: 0.9rem; }
.an-herr-icono { color: #1D4E89; }
.an-herr-nombre { font-weight: 600; }
.an-herr-total { margin-left: auto; font-variant-numeric: tabular-nums; font-weight: 600; }
.an-herr-pista { height: 10px; border-radius: 4px; background: #F1F3F6; overflow: hidden; }
.an-herr-barra { height: 100%; border-radius: 0 4px 4px 0; background: #1D4E89; transition: width 0.3s ease; }
.an-herr-detalle { display: flex; flex-wrap: wrap; gap: 2px 14px; margin-top: 4px; font-size: 0.76rem; color: #5b6475; }

/* Medidor del reordenador */
.an-medidor { height: 6px; margin: 6px 0 4px; border-radius: 3px; background: #F1F3F6; overflow: hidden; }
.an-medidor-barra { height: 100%; border-radius: 3px; background: #1D4E89; }

/* Tabla (alternativa accesible al gráfico) */
.an-tabla-wrap { overflow-x: auto; max-height: 320px; overflow-y: auto; }
.an-tabla { width: 100%; border-collapse: collapse; font-size: 0.85rem; }
.an-tabla th { position: sticky; top: 0; background: #FFFFFF; text-align: left; padding: 6px 8px; border-bottom: 1px solid #1a1f2b; color: #5b6475; font-weight: 600; white-space: nowrap; }
.an-tabla td { padding: 6px 8px; border-bottom: 1px solid #e4e7ec; font-variant-numeric: tabular-nums; }
</style>
