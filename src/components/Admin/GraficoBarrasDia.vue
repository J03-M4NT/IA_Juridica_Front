<template>
  <div class="gb" @pointerleave="indice = null">
    <div class="gb-area" role="img" :aria-label="descripcion">
      <!-- Grilla recesiva: tope, mitad y cero, con su valor -->
      <div v-for="g in grilla" :key="g.valor" class="gb-grilla" :style="{ bottom: `${g.altura}%` }">
        <span class="gb-eje">{{ g.valor }}</span>
      </div>

      <!-- Una barra por día; la zona sensible es la columna entera -->
      <div class="gb-barras">
        <div
          v-for="(p, i) in puntos"
          :key="p.fecha"
          class="gb-col"
          :class="{ 'gb-col--activa': indice === i }"
          tabindex="0"
          :aria-label="`${fechaLarga(p.fecha)}: ${p.valor} ${unidad}`"
          @pointerenter="indice = i"
          @focus="indice = i"
          @blur="indice = null"
        >
          <div class="gb-barra" :class="{ 'gb-barra--cero': !p.valor }" :style="{ height: `${(p.valor / tope) * 100}%` }" />
        </div>
      </div>

      <!-- Tooltip -->
      <div
        v-if="activo"
        class="gb-tooltip"
        :class="{ 'gb-tooltip--izq': indice! > puntos.length * 0.7, 'gb-tooltip--der': indice! < puntos.length * 0.3 }"
        :style="{ left: `${((indice! + 0.5) / puntos.length) * 100}%` }"
      >
        <span class="gb-tooltip-fecha">{{ fechaLarga(activo.fecha) }}</span>
        <strong>{{ activo.valor }} {{ unidad }}</strong>
        <span v-for="d in activo.detalle ?? []" :key="d" class="gb-tooltip-detalle">{{ d }}</span>
      </div>
    </div>

    <!-- Fechas: primera, mitad y última -->
    <div class="gb-fechas">
      <span>{{ fechaCorta(puntos[0]?.fecha) }}</span>
      <span>{{ fechaCorta(puntos[Math.floor(puntos.length / 2)]?.fecha) }}</span>
      <span>{{ fechaCorta(puntos[puntos.length - 1]?.fecha) }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'

// Barras por día de una sola serie (sin leyenda: el título de la tarjeta
// la nombra). Mismo estilo que GraficoLinea de Panorama: azul de marca,
// grilla recesiva y tooltip al pasar el mouse, el dedo o el teclado.

const props = defineProps<{
  puntos: { fecha: string; valor: number; detalle?: string[] }[]
  unidad: string
}>()

// Tope "redondo" del eje para que la grilla muestre números limpios
const tope = computed(() => {
  const max = Math.max(0, ...props.puntos.map(p => p.valor))
  if (max <= 4) return 4
  const paso = 10 ** Math.floor(Math.log10(max))
  const redondo = Math.ceil(max / paso) * paso
  // Que la mitad también sea entera (7 → 8, para no mostrar "3.5 personas")
  return redondo % 2 ? redondo + paso : redondo
})

const grilla = computed(() => [tope.value, tope.value / 2, 0].map(valor => ({
  valor: Number.isInteger(valor) ? valor : valor.toFixed(1),
  altura: (valor / tope.value) * 100
})))

const indice = ref<number | null>(null)
const activo = computed(() => (indice.value !== null ? props.puntos[indice.value] : undefined))

const descripcion = computed(() => {
  const total = props.puntos.reduce((s, p) => s + p.valor, 0)
  const mayor = props.puntos.reduce((m, p) => (p.valor > (m?.valor ?? -1) ? p : m), props.puntos[0])
  return `Gráfico de barras por día. Día con más ${props.unidad}: ${fechaLarga(mayor?.fecha)} (${mayor?.valor ?? 0}). Total del periodo: ${total}.`
})

const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'set', 'oct', 'nov', 'dic']
const DIAS_SEMANA = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb']

function fechaCorta(iso: string | undefined): string {
  if (!iso) return ''
  const [, m, d] = iso.split('-')
  return m && d ? `${Number(d)} ${MESES[Number(m) - 1] ?? ''}` : iso
}

function fechaLarga(iso: string | undefined): string {
  if (!iso) return ''
  const dia = new Date(`${iso}T12:00:00`).getDay()
  return `${DIAS_SEMANA[dia] ?? ''} ${fechaCorta(iso)}`
}
</script>

<style scoped>
.gb {
  position: relative;
  width: 100%;
  font-family: 'Urbanist', 'Figtree', sans-serif;
}

.gb-area {
  position: relative;
  height: 180px;
  margin-left: 32px;
}

.gb-grilla {
  position: absolute;
  left: 0;
  right: 0;
  border-top: 1px solid #E9EBEF;
}

.gb-eje {
  position: absolute;
  right: calc(100% + 8px);
  top: 0;
  transform: translateY(-50%);
  font-size: 0.72rem;
  color: var(--text-muted, #6b7280);
  font-variant-numeric: tabular-nums;
}

.gb-barras {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: flex-end;
}

.gb-col {
  flex: 1 1 0;
  height: 100%;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  padding: 0 2px;
  cursor: default;
  outline: none;
  border-radius: 4px;
}

.gb-col--activa,
.gb-col:focus-visible {
  background: rgba(29, 78, 137, 0.06);
}

.gb-barra {
  width: 100%;
  max-width: 22px;
  background: #1D4E89;
  border-radius: 4px 4px 0 0;
  transition: height 0.3s ease;
}

/* Un día sin uso se ve como una línea fina, para que no parezca un hueco */
.gb-barra--cero {
  height: 2px !important;
  background: #D5DAE1;
}

.gb-col--activa .gb-barra:not(.gb-barra--cero) {
  background: #163D6C;
}

.gb-fechas {
  display: flex;
  justify-content: space-between;
  margin: 6px 0 0 32px;
  font-size: 0.72rem;
  color: var(--text-muted, #6b7280);
}

.gb-tooltip {
  position: absolute;
  top: 0;
  transform: translateX(-50%);
  z-index: 2;
  display: flex;
  flex-direction: column;
  gap: 1px;
  padding: 8px 10px;
  background: #FFFFFF;
  border: 1px solid #E4E7EC;
  border-radius: 8px;
  box-shadow: 0 6px 20px rgba(20, 18, 14, 0.10);
  font-size: 0.8rem;
  color: var(--ink, #1a1f2b);
  white-space: nowrap;
  pointer-events: none;
}

.gb-tooltip--izq {
  transform: translateX(-100%);
}

.gb-tooltip--der {
  transform: none;
}

.gb-tooltip-fecha,
.gb-tooltip-detalle {
  color: var(--text-secondary, #5b6475);
  font-size: 0.75rem;
}

.gb-tooltip strong {
  font-variant-numeric: tabular-nums;
}
</style>
