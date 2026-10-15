<template>
  <div class="gl" @pointerleave="indice = null">
    <svg
      class="gl-svg"
      :viewBox="`0 0 ${ANCHO} ${alto}`"
      preserveAspectRatio="none"
      :style="{ aspectRatio: `${ANCHO} / ${alto}` }"
      role="img"
      :aria-label="`Gráfico de línea: de ${prefijo}${formato(primero?.valor)} el ${fechaCorta(primero?.fecha)} a ${prefijo}${formato(ultimo?.valor)} el ${fechaCorta(ultimo?.fecha)}`"
      @pointermove="mover"
    >
      <!-- Grilla recesiva: 3 líneas con su valor -->
      <g class="gl-grilla">
        <line v-for="g in grilla" :key="g.y" :x1="MARGEN_IZQ" :x2="ANCHO - MARGEN_DER" :y1="g.y" :y2="g.y" />
      </g>
      <!-- Área suave bajo la línea -->
      <path :d="areaPath" class="gl-area" />
      <!-- Línea de 2px -->
      <path :d="lineaPath" class="gl-linea" vector-effect="non-scaling-stroke" />
      <!-- Punto del último dato -->
      <circle v-if="ultimo" :cx="x(puntos.length - 1)" :cy="y(ultimo.valor)" r="4.5" class="gl-ultimo" vector-effect="non-scaling-stroke" />
      <!-- Cruz de lectura al pasar el mouse -->
      <template v-if="indice !== null && puntoActivo">
        <line :x1="x(indice)" :x2="x(indice)" :y1="MARGEN_SUP" :y2="alto - MARGEN_INF" class="gl-cruz" vector-effect="non-scaling-stroke" />
        <circle :cx="x(indice)" :cy="y(puntoActivo.valor)" r="5" class="gl-activo" vector-effect="non-scaling-stroke" />
      </template>
    </svg>

    <!-- Valores de la grilla (HTML para que no se deformen) -->
    <span v-for="g in grilla" :key="`e${g.y}`" class="gl-eje" :style="{ top: `${(g.y / alto) * 100}%` }">{{ formato(g.valor) }}</span>
    <span class="gl-fecha gl-fecha--ini">{{ fechaCorta(primero?.fecha) }}</span>
    <span class="gl-fecha gl-fecha--fin">{{ fechaCorta(ultimo?.fecha) }}</span>

    <!-- Tooltip -->
    <div
      v-if="indice !== null && puntoActivo"
      class="gl-tooltip"
      :style="{ left: `${(x(indice) / ANCHO) * 100}%`, top: `${(y(puntoActivo.valor) / alto) * 100}%` }"
    >
      <span class="gl-tooltip-fecha">{{ fechaCorta(puntoActivo.fecha) }}</span>
      <strong>{{ prefijo }}{{ formato(puntoActivo.valor) }}</strong>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'

// Gráfico de una sola serie (sin leyenda: el título de la tarjeta la
// nombra). Línea de 2px, grilla recesiva, último punto marcado y lectura
// con cruz + tooltip al pasar el mouse o el dedo.

const props = withDefaults(defineProps<{
  puntos: { fecha: string; valor: number }[]
  decimales?: number
  prefijo?: string
  alto?: number
}>(), { decimales: 2, prefijo: '', alto: 170 })

const ANCHO = 600
const MARGEN_IZQ = 44
const MARGEN_DER = 8
const MARGEN_SUP = 10
const MARGEN_INF = 22

const valores = computed(() => props.puntos.map(p => p.valor))
const minimo = computed(() => Math.min(...valores.value))
const maximo = computed(() => Math.max(...valores.value))
const margenValor = computed(() => (maximo.value - minimo.value || maximo.value * 0.01 || 1) * 0.15)
const desde = computed(() => minimo.value - margenValor.value)
const hasta = computed(() => maximo.value + margenValor.value)

const x = (i: number) => MARGEN_IZQ + (i / Math.max(1, props.puntos.length - 1)) * (ANCHO - MARGEN_IZQ - MARGEN_DER)
const y = (v: number) => MARGEN_SUP + (1 - (v - desde.value) / (hasta.value - desde.value)) * (props.alto - MARGEN_SUP - MARGEN_INF)

const lineaPath = computed(() => props.puntos.map((p, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(p.valor).toFixed(1)}`).join(' '))
const areaPath = computed(() =>
  props.puntos.length
    ? `${lineaPath.value} L${x(props.puntos.length - 1).toFixed(1)},${props.alto - MARGEN_INF} L${x(0).toFixed(1)},${props.alto - MARGEN_INF} Z`
    : ''
)

const grilla = computed(() => [maximo.value, (maximo.value + minimo.value) / 2, minimo.value].map(valor => ({ valor, y: y(valor) })))

const primero = computed(() => props.puntos[0])
const ultimo = computed(() => props.puntos[props.puntos.length - 1])

const indice = ref<number | null>(null)
const puntoActivo = computed(() => (indice.value !== null ? props.puntos[indice.value] : undefined))

function mover(e: PointerEvent) {
  const svg = e.currentTarget as SVGSVGElement
  const caja = svg.getBoundingClientRect()
  const xVista = ((e.clientX - caja.left) / caja.width) * ANCHO
  const proporcion = (xVista - MARGEN_IZQ) / (ANCHO - MARGEN_IZQ - MARGEN_DER)
  const i = Math.round(proporcion * (props.puntos.length - 1))
  indice.value = Math.min(props.puntos.length - 1, Math.max(0, i))
}

const formato = (v: number | undefined) => (typeof v === 'number' ? v.toFixed(props.decimales) : '—')

function fechaCorta(iso: string | undefined): string {
  if (!iso) return ''
  const [, m, d] = iso.split('-')
  const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'set', 'oct', 'nov', 'dic']
  return m && d ? `${Number(d)} ${MESES[Number(m) - 1] ?? ''}` : iso
}
</script>

<style scoped>
.gl {
  position: relative;
  width: 100%;
  font-family: 'Urbanist', 'Figtree', sans-serif;
}

.gl-svg {
  display: block;
  width: 100%;
  height: auto;
  overflow: visible;
  touch-action: pan-y;
}

.gl-grilla line {
  stroke: #E9EBEF;
  stroke-width: 1;
}

.gl-area {
  fill: rgba(29, 78, 137, 0.07);
}

.gl-linea {
  fill: none;
  stroke: #1D4E89;
  stroke-width: 2;
  stroke-linejoin: round;
  stroke-linecap: round;
}

.gl-ultimo,
.gl-activo {
  fill: #1D4E89;
  stroke: #FFFFFF;
  stroke-width: 2;
}

.gl-cruz {
  stroke: rgba(25, 28, 31, 0.3);
  stroke-width: 1;
  stroke-dasharray: 3 3;
}

.gl-eje {
  position: absolute;
  left: 0;
  transform: translateY(-50%);
  font-size: 0.72rem;
  color: rgba(25, 28, 31, 0.5);
  font-variant-numeric: tabular-nums;
  pointer-events: none;
}

.gl-fecha {
  position: absolute;
  bottom: 0;
  font-size: 0.72rem;
  color: rgba(25, 28, 31, 0.5);
  pointer-events: none;
}

.gl-fecha--ini { left: calc(44 / 600 * 100%); }
.gl-fecha--fin { right: 0; }

.gl-tooltip {
  position: absolute;
  z-index: 2;
  display: flex;
  flex-direction: column;
  gap: 1px;
  padding: 6px 10px;
  background: #13294A;
  color: #FFFFFF;
  font-size: 0.8rem;
  white-space: nowrap;
  transform: translate(-50%, calc(-100% - 12px));
  pointer-events: none;
  border-radius: 8px;
  font-variant-numeric: tabular-nums;
}

.gl-tooltip-fecha {
  font-size: 0.72rem;
  color: rgba(255, 255, 255, 0.7);
}
</style>
