<template>
  <q-page class="panorama-page">
    <!-- Encabezado -->
    <header class="pn-cabecera">
      <div>
        <h1 class="page-title pn-titulo">Panorama del día</h1>
        <p class="pn-subtitulo">
          {{ fechaLarga }}<template v-if="panorama"> · Actualizado a las {{ horaActualizacion }}</template>
        </p>
      </div>
      <button type="button" class="pn-boton-sec" :disabled="cargando" @click="cargar(true)">
        <q-icon name="refresh" size="18px" :class="{ 'pn-girando': cargando }" />
        {{ cargando ? 'Actualizando…' : 'Actualizar' }}
      </button>
    </header>

    <p v-if="error" class="pn-error" role="alert">{{ error }}</p>

    <!-- Carga: esqueleto con la forma del panel -->
    <div v-if="!panorama && cargando" class="pn-esqueleto" role="status" aria-label="Cargando el panorama del día">
      <div class="pn-esq pn-esq--cinta"></div>
      <div class="pn-esq-grid">
        <div v-for="n in 8" :key="n" class="pn-esq pn-esq--tarjeta"></div>
      </div>
    </div>

    <template v-if="panorama">
      <!-- Cinta con las cifras clave -->
      <div class="pn-cinta" aria-label="Cifras clave del día">
        <div class="pn-cinta-pista">
          <template v-for="copia in 2" :key="copia">
            <span v-for="item in cinta" :key="`${copia}-${item.etiqueta}`" class="pn-cinta-item" :aria-hidden="copia === 2">
              <span class="pn-cinta-etiqueta">{{ item.etiqueta }}</span>
              <strong>{{ item.valor }}</strong>
              <span v-if="item.cambio" class="pn-cinta-cambio">{{ item.cambio }}</span>
            </span>
          </template>
        </div>
      </div>

      <p v-if="panorama.fuentesConError.length" class="pn-aviso">
        No se pudo actualizar: {{ panorama.fuentesConError.join(', ') }}. Se muestran los últimos datos disponibles.
      </p>

      <!-- Destacado: dólar de los últimos 30 días + resumen -->
      <section class="pn-destacado">
        <button type="button" class="pn-grafico-tarjeta" @click="abrir('dolar')">
          <div class="pn-grafico-cabecera">
            <div>
              <span class="pn-etiqueta">Dólar · últimos 30 días (BCRP)</span>
              <span class="pn-cifra-grande">S/ {{ formatoNumero(panorama.bcrp?.dolarVenta?.valor, 3) }}</span>
            </div>
            <span v-if="variacionDolar" class="pn-variacion">
              <q-icon :name="variacionDolar.sube ? 'trending_up' : 'trending_down'" size="18px" />
              {{ variacionDolar.texto }} vs día anterior
            </span>
          </div>
          <GraficoLinea v-if="serieDolar.length > 1" :puntos="serieDolar" :decimales="3" prefijo="S/ " />
        </button>

        <div class="pn-resumen">
          <span class="pn-etiqueta">Hoy en cifras</span>
          <div class="pn-resumen-fila">
            <div><span class="pn-resumen-num">{{ panorama.elPeruano?.total ?? '—' }}</span><span class="pn-resumen-label">Normas en El Peruano</span></div>
            <div><span class="pn-resumen-num">{{ panorama.smv?.length ?? '—' }}</span><span class="pn-resumen-label">Hechos de importancia</span></div>
            <div><span class="pn-resumen-num">{{ proyectosHoy }}</span><span class="pn-resumen-label">Proyectos de ley hoy</span></div>
          </div>
          <p class="pn-resumen-texto">
            Toca cualquier tarjeta para ver el detalle del día: la lista completa, con enlace a la fuente oficial.
          </p>
        </div>
      </section>

      <!-- Tarjetas -->
      <section class="pn-tarjetas" aria-label="Indicadores del día">
        <button
          v-for="t in tarjetas"
          :key="t.id"
          type="button"
          class="pn-tarjeta"
          @click="abrir(t.id)"
        >
          <span class="pn-tarjeta-fuente">{{ t.fuente }}</span>
          <span class="pn-tarjeta-titulo">{{ t.titulo }}</span>
          <span class="pn-tarjeta-valor">{{ t.valor }}</span>
          <span class="pn-tarjeta-cambio">
            <q-icon v-if="t.icono" :name="t.icono" size="16px" />
            {{ t.cambio }}
          </span>
          <q-icon name="arrow_forward" size="18px" class="pn-tarjeta-flecha" />
        </button>
      </section>

      <p class="pn-fuentes">
        Fuentes oficiales: BCRP, SMV, BVL, Congreso de la República y Diario Oficial El Peruano (incluye las resoluciones de la SBS).
        Información de referencia; verifica en la fuente antes de usarla.
      </p>
    </template>

    <!-- ====================== DETALLE (panel lateral) ====================== -->
    <q-dialog v-model="detalleAbierto" position="right" class="pn-dialogo">
      <div class="pn-detalle" role="document">
        <header class="pn-detalle-cabecera">
          <div>
            <span class="pn-tarjeta-fuente">{{ detalle?.fuente }}</span>
            <h2 class="pn-detalle-titulo">{{ detalle?.titulo }}</h2>
          </div>
          <button type="button" class="pn-cerrar" aria-label="Cerrar" @click="detalleAbierto = false">
            <q-icon name="close" size="20px" />
          </button>
        </header>

        <div class="pn-detalle-cuerpo">
          <!-- Dólar / euro / tasa -->
          <template v-if="detalleId === 'dolar' || detalleId === 'euro' || detalleId === 'tasa'">
            <div class="pn-cifras-detalle">
              <div><span class="pn-etiqueta">Dólar compra</span><strong>S/ {{ formatoNumero(panorama?.bcrp?.dolarCompra?.valor, 3) }}</strong></div>
              <div><span class="pn-etiqueta">Dólar venta</span><strong>S/ {{ formatoNumero(panorama?.bcrp?.dolarVenta?.valor, 3) }}</strong></div>
              <div><span class="pn-etiqueta">Euro venta</span><strong>S/ {{ formatoNumero(panorama?.bcrp?.euroVenta?.valor, 3) }}</strong></div>
              <div><span class="pn-etiqueta">Tasa de referencia</span><strong>{{ formatoNumero(panorama?.bcrp?.tasaReferencia?.valor, 2) }}%</strong></div>
            </div>
            <p class="pn-nota">Tipo de cambio del sistema bancario (SBS), publicado por el BCRP. Datos al {{ formatoFecha(panorama?.bcrp?.dolarVenta?.fecha) }}.</p>
            <span class="pn-etiqueta">Dólar venta · últimos 30 días</span>
            <GraficoLinea v-if="serieDolar.length > 1" :puntos="serieDolar" :decimales="3" prefijo="S/ " :alto="200" />
            <details class="pn-tabla-detalle">
              <summary>Ver como tabla</summary>
              <table class="pn-tabla">
                <thead><tr><th>Fecha</th><th>Venta (S/)</th></tr></thead>
                <tbody>
                  <tr v-for="p in [...serieDolar].reverse()" :key="p.fecha"><td>{{ formatoFecha(p.fecha) }}</td><td>{{ formatoNumero(p.valor, 3) }}</td></tr>
                </tbody>
              </table>
            </details>
            <a class="pn-enlace" href="https://www.bcrp.gob.pe/" target="_blank" rel="noopener">Ir al BCRP <q-icon name="open_in_new" size="15px" /></a>
          </template>

          <!-- SMV -->
          <template v-else-if="detalleId === 'smv' || detalleId === 'emisores'">
            <p v-if="detalleId === 'emisores'" class="pn-nota">
              Comunicados que las empresas emisoras de valores presentaron hoy (los mismos que difunde la BVL en "Noticias emisores", tomados de la SMV).
            </p>
            <input v-model="filtroTexto" type="search" class="pn-buscar" placeholder="Buscar empresa o tipo de hecho…" aria-label="Buscar en los hechos de importancia" />
            <p v-if="hechosFiltrados.length === 0" class="pn-nota">No hay hechos que coincidan.</p>
            <article v-for="(h, i) in hechosFiltrados" :key="i" class="pn-item">
              <div class="pn-item-cabecera">
                <strong class="pn-item-titulo">{{ h.empresa }}</strong>
                <span class="pn-item-meta">{{ h.hora }}</span>
              </div>
              <span class="pn-item-etiqueta">{{ mayusculasYMinusculas(h.tipo) }}</span>
              <p class="pn-item-texto">{{ h.descripcion }}</p>
              <div class="pn-item-pie">
                <span class="pn-item-meta">{{ h.expediente }}<template v-if="h.sector"> · {{ mayusculasYMinusculas(h.sector) }}</template></span>
                <a v-for="(d, di) in h.documentos" :key="d" :href="d" target="_blank" rel="noopener" class="pn-enlace pn-enlace--chico">
                  Documento{{ h.documentos.length > 1 ? ` ${di + 1}` : '' }} <q-icon name="open_in_new" size="14px" />
                </a>
              </div>
            </article>
            <a class="pn-enlace" href="https://www.smv.gob.pe/simv/Frm_hechosdeImportanciaDia?data=38C2EC33FA106691BB5B5039DACFDF50795D8EC3AF" target="_blank" rel="noopener">Ver en la SMV <q-icon name="open_in_new" size="15px" /></a>
            <a v-if="detalleId === 'emisores'" class="pn-enlace" href="https://www.bvl.com.pe/emisores/noticias-emisores" target="_blank" rel="noopener">Ver Noticias emisores en la BVL <q-icon name="open_in_new" size="15px" /></a>
          </template>

          <!-- BVL -->
          <template v-else-if="detalleId === 'bvl'">
            <div class="pn-cifras-detalle">
              <div><span class="pn-etiqueta">Monto negociado</span><strong>S/ {{ formatoMillones(panorama?.bvl?.montoSoles) }}</strong></div>
              <div><span class="pn-etiqueta">En dólares</span><strong>US$ {{ formatoMillones(panorama?.bvl?.montoDolares) }}</strong></div>
              <div><span class="pn-etiqueta">Operaciones</span><strong>{{ panorama?.bvl?.operaciones?.toLocaleString('es-PE') ?? '—' }}</strong></div>
              <div><span class="pn-etiqueta">Solo acciones</span><strong>S/ {{ formatoMillones(panorama?.bvl?.montoAccionesSoles) }}</strong></div>
            </div>
            <span class="pn-etiqueta">Índices del día</span>
            <table class="pn-tabla">
              <thead><tr><th>Índice</th><th>Valor</th><th>Variación</th></tr></thead>
              <tbody>
                <tr v-for="i in panorama?.bvl?.indices ?? []" :key="i.nombre">
                  <td>{{ i.nombre }}</td>
                  <td>{{ formatoMiles(i.valor) }}</td>
                  <td class="pn-variacion-celda">
                    <q-icon :name="i.variacion > 0 ? 'trending_up' : i.variacion < 0 ? 'trending_down' : 'trending_flat'" size="15px" />
                    {{ i.variacion > 0 ? '+' : '' }}{{ i.variacion }}%
                  </td>
                </tr>
              </tbody>
            </table>
            <p class="pn-nota">Datos de cierre o al momento de la consulta, publicados por la Bolsa de Valores de Lima.</p>
            <a class="pn-enlace" href="https://www.bvl.com.pe/" target="_blank" rel="noopener">Ir a la BVL <q-icon name="open_in_new" size="15px" /></a>
            <a class="pn-enlace" href="https://www.bvl.com.pe/emisores/noticias-emisores" target="_blank" rel="noopener">Noticias emisores <q-icon name="open_in_new" size="15px" /></a>
          </template>

          <!-- Congreso -->
          <template v-else-if="detalleId === 'diputados' || detalleId === 'senado'">
            <div class="pn-segmento" role="group" aria-label="Periodo">
              <button v-for="o in OPCIONES_PERIODO" :key="o.valor" type="button" class="pn-segmento-opcion" :class="{ 'pn-segmento-opcion--activa': periodoProyectos === o.valor }" :aria-pressed="periodoProyectos === o.valor" @click="periodoProyectos = o.valor">{{ o.etiqueta }}</button>
            </div>
            <p v-if="proyectosFiltrados.length === 0" class="pn-nota">No se presentaron proyectos en este periodo.</p>
            <article v-for="p in proyectosFiltrados" :key="p.numero" class="pn-item">
              <div class="pn-item-cabecera">
                <strong class="pn-item-titulo">{{ p.numero }}</strong>
                <span class="pn-item-meta">{{ formatoFecha(p.fecha) }}</span>
              </div>
              <span class="pn-item-etiqueta">{{ mayusculasYMinusculas(p.estado) }}</span>
              <p class="pn-item-texto">{{ mayusculasYMinusculas(p.titulo) }}</p>
              <div class="pn-item-pie">
                <span class="pn-item-meta">{{ p.proponente }}</span>
                <a :href="p.enlace" target="_blank" rel="noopener" class="pn-enlace pn-enlace--chico">Expediente <q-icon name="open_in_new" size="14px" /></a>
              </div>
            </article>
            <a class="pn-enlace" :href="detalleId === 'senado' ? 'https://wb2server.congreso.gob.pe/spley-portal/#/senado/expediente/consulta' : 'https://wb2server.congreso.gob.pe/spley-portal/#/diputados/expediente/consulta'" target="_blank" rel="noopener">
              Ver en el portal del Congreso <q-icon name="open_in_new" size="15px" />
            </a>
            <a class="pn-enlace" href="https://wb2server.congreso.gob.pe/spley-portal/#/congreso/expediente/consulta" target="_blank" rel="noopener">
              Consultar el periodo 2021-2026 <q-icon name="open_in_new" size="15px" />
            </a>
          </template>

          <!-- SBS (desde El Peruano) -->
          <template v-else-if="detalleId === 'sbs'">
            <p class="pn-nota">Resoluciones de la Superintendencia de Banca, Seguros y AFP publicadas hoy en El Peruano.</p>
            <p v-if="!panorama?.elPeruano?.sbs.length" class="pn-nota">Hoy no se publicaron resoluciones de la SBS.</p>
            <article v-for="(n, i) in panorama?.elPeruano?.sbs ?? []" :key="i" class="pn-item">
              <strong class="pn-item-titulo">{{ mayusculasYMinusculas(n.titulo) }}</strong>
              <p class="pn-item-texto">{{ mayusculasYMinusculas(n.sumilla) }}</p>
              <a v-if="n.urlPdf" :href="n.urlPdf" target="_blank" rel="noopener" class="pn-enlace pn-enlace--chico">Ver norma <q-icon name="open_in_new" size="14px" /></a>
            </article>
            <a class="pn-enlace" href="https://www.sbs.gob.pe/app/pp/INT_CN/Paginas/Busqueda/BusquedaPortal.aspx" target="_blank" rel="noopener">Buscar en el portal de la SBS <q-icon name="open_in_new" size="15px" /></a>
          </template>

          <!-- Normas -->
          <template v-else-if="detalleId === 'normas'">
            <div class="pn-cifras-detalle">
              <div><span class="pn-etiqueta">Normas de la edición</span><strong>{{ panorama?.elPeruano?.total ?? '—' }}</strong></div>
              <div><span class="pn-etiqueta">Edición anterior</span><strong>{{ panorama?.elPeruano?.totalAnterior ?? '—' }}</strong></div>
            </div>
            <p class="pn-nota">Edición del {{ formatoFecha(panorama?.elPeruano?.fecha) }} del Diario Oficial El Peruano.</p>
            <router-link to="/app/normas" class="pn-boton">Ver las normas con resumen y PDF</router-link>
          </template>
        </div>
      </div>
    </q-dialog>
  </q-page>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import GraficoLinea from '../components/Panorama/GraficoLinea.vue'
import { obtenerPanorama, type Panorama } from '../services/panoramaService'
import { mayusculasYMinusculas } from '../utils/formatoTexto'

// =========================
// PANORAMA DEL DÍA: información pública del día (BCRP, SMV, Congreso y
// El Peruano) en un panel; al tocar una tarjeta se abre el detalle.
// =========================

const panorama = ref<Panorama | null>(null)
const cargando = ref(false)
const error = ref('')

async function cargar(actualizar = false) {
  if (cargando.value) return
  cargando.value = true
  error.value = ''
  try {
    panorama.value = await obtenerPanorama(actualizar)
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'No se pudo cargar el panorama del día.'
  } finally {
    cargando.value = false
  }
}

onMounted(() => void cargar())

// ----- Formatos -----
const fechaLarga = computed(() => {
  const texto = new Date().toLocaleDateString('es-PE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'America/Lima' })
  return texto.charAt(0).toUpperCase() + texto.slice(1)
})

const horaActualizacion = computed(() =>
  panorama.value ? new Date(panorama.value.actualizadoEn).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Lima' }) : ''
)

function formatoNumero(valor: number | null | undefined, decimales: number): string {
  return typeof valor === 'number' ? valor.toFixed(decimales) : '—'
}

function formatoFecha(iso: string | null | undefined): string {
  if (!iso) return '—'
  const [a, m, d] = iso.split('-')
  return a && m && d ? `${d}/${m}/${a}` : iso
}

function variacionPorcentual(valor?: number | null, anterior?: number | null): { texto: string; sube: boolean } | null {
  if (typeof valor !== 'number' || typeof anterior !== 'number' || anterior === 0) return null
  const cambio = ((valor - anterior) / anterior) * 100
  const signo = cambio > 0 ? '+' : ''
  return { texto: `${signo}${cambio.toFixed(2)}%`, sube: cambio >= 0 }
}

function diferencia(valor?: number | null, anterior?: number | null, sufijo = ''): string {
  if (typeof valor !== 'number' || typeof anterior !== 'number') return ''
  const d = valor - anterior
  if (d === 0) return `Sin cambio ${sufijo}`.trim()
  return `${d > 0 ? '+' : ''}${d} ${sufijo}`.trim()
}

// ----- Datos derivados -----
const indicePrincipal = computed(() => panorama.value?.bvl?.indices[0] ?? null)

// Noticias de emisores: los comunicados del día de las empresas emisoras
// (la sección "Noticias emisores" de la BVL publica estos mismos hechos)
const comunicadosEmisores = computed(() => (panorama.value?.smv ?? []).filter(h => /emisor/i.test(h.sector)))

function formatoMiles(v: number | null | undefined): string {
  return typeof v === 'number' ? v.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '—'
}

function formatoMillones(v: number | null | undefined): string {
  return typeof v === 'number' ? `${(v / 1_000_000).toLocaleString('es-PE', { maximumFractionDigits: 1 })} M` : '—'
}

const serieDolar = computed(() => panorama.value?.bcrp?.historicoDolar ?? [])
const variacionDolar = computed(() => variacionPorcentual(panorama.value?.bcrp?.dolarVenta?.valor, panorama.value?.bcrp?.dolarVenta?.anterior))

const hoyIso = () => new Date().toLocaleDateString('en-CA', { timeZone: 'America/Lima' })
const haceDias = (n: number) => new Date(Date.now() - n * 24 * 3600 * 1000).toLocaleDateString('en-CA', { timeZone: 'America/Lima' })

const contarDesde = (proyectos: { fecha: string }[] | undefined, desde: string) => (proyectos ?? []).filter(p => p.fecha >= desde).length

const proyectosHoy = computed(() =>
  contarDesde(panorama.value?.diputados?.proyectos, hoyIso()) + contarDesde(panorama.value?.senado?.proyectos, hoyIso())
)

const tarjetas = computed(() => {
  const p = panorama.value
  if (!p) return []
  const dolar = variacionDolar.value
  const euro = variacionPorcentual(p.bcrp?.euroVenta?.valor, p.bcrp?.euroVenta?.anterior)
  const tasa = p.bcrp?.tasaReferencia
  const semana = haceDias(6)
  const icono = (t: string) => (t.startsWith('+') ? 'trending_up' : t.startsWith('-') ? 'trending_down' : t ? 'trending_flat' : '')
  const cambioNormas = diferencia(p.elPeruano?.total, p.elPeruano?.totalAnterior, 'vs edición anterior')
  const cambioSmv = diferencia(p.smv?.length, p.anterior?.smv, 'vs el día anterior')
  return [
    { id: 'dolar', fuente: 'BCRP', titulo: 'Tipo de cambio del dólar', valor: `S/ ${formatoNumero(p.bcrp?.dolarVenta?.valor, 3)}`, cambio: dolar ? `${dolar.texto} vs día anterior` : 'Venta, sistema bancario', icono: dolar ? (dolar.sube ? 'trending_up' : 'trending_down') : '' },
    { id: 'euro', fuente: 'BCRP', titulo: 'Tipo de cambio del euro', valor: `S/ ${formatoNumero(p.bcrp?.euroVenta?.valor, 3)}`, cambio: euro ? `${euro.texto} vs día anterior` : 'Venta, sistema bancario', icono: euro ? (euro.sube ? 'trending_up' : 'trending_down') : '' },
    { id: 'tasa', fuente: 'BCRP', titulo: 'Tasa de referencia', valor: `${formatoNumero(tasa?.valor, 2)}%`, cambio: tasa && tasa.anterior !== null && tasa.anterior !== tasa.valor ? `Antes ${formatoNumero(tasa.anterior, 2)}%` : 'Sin cambio', icono: 'trending_flat' },
    { id: 'normas', fuente: 'El Peruano', titulo: 'Normas publicadas', valor: String(p.elPeruano?.total ?? '—'), cambio: cambioNormas || `Edición del ${formatoFecha(p.elPeruano?.fecha)}`, icono: icono(cambioNormas) },
    { id: 'smv', fuente: 'SMV', titulo: 'Hechos de importancia', valor: String(p.smv?.length ?? '—'), cambio: cambioSmv || 'Comunicados del día', icono: icono(cambioSmv) },
    { id: 'diputados', fuente: 'Congreso', titulo: 'Proyectos · Diputados', valor: String(contarDesde(p.diputados?.proyectos, hoyIso())), cambio: `${contarDesde(p.diputados?.proyectos, semana)} esta semana · ${p.diputados?.total ?? '—'} en el periodo`, icono: '' },
    { id: 'senado', fuente: 'Congreso', titulo: 'Proyectos · Senado', valor: String(contarDesde(p.senado?.proyectos, hoyIso())), cambio: `${contarDesde(p.senado?.proyectos, semana)} esta semana · ${p.senado?.total ?? '—'} en el periodo`, icono: '' },
    { id: 'sbs', fuente: 'SBS · El Peruano', titulo: 'Resoluciones de la SBS', valor: String(p.elPeruano?.sbs.length ?? '—'), cambio: 'Publicadas en la edición del día', icono: '' },
    {
      id: 'bvl',
      fuente: 'BVL',
      titulo: indicePrincipal.value?.nombre ?? 'Bolsa de Valores de Lima',
      valor: indicePrincipal.value ? formatoMiles(indicePrincipal.value.valor) : '—',
      cambio: indicePrincipal.value ? `${indicePrincipal.value.variacion > 0 ? '+' : ''}${indicePrincipal.value.variacion}% hoy · S/ ${formatoMillones(p.bvl?.montoSoles)} negociados` : 'Índices y negociación del día',
      icono: indicePrincipal.value ? (indicePrincipal.value.variacion > 0 ? 'trending_up' : indicePrincipal.value.variacion < 0 ? 'trending_down' : 'trending_flat') : ''
    },
    { id: 'emisores', fuente: 'BVL · SMV', titulo: 'Noticias de emisores', valor: String(comunicadosEmisores.value.length), cambio: 'Comunicados de empresas emisoras hoy', icono: '' }
  ]
})

const cinta = computed(() => {
  const p = panorama.value
  if (!p) return []
  const dolar = variacionDolar.value
  return [
    { etiqueta: 'USD/PEN', valor: formatoNumero(p.bcrp?.dolarVenta?.valor, 3), cambio: dolar?.texto ?? '' },
    { etiqueta: 'EUR/PEN', valor: formatoNumero(p.bcrp?.euroVenta?.valor, 3), cambio: variacionPorcentual(p.bcrp?.euroVenta?.valor, p.bcrp?.euroVenta?.anterior)?.texto ?? '' },
    { etiqueta: 'Tasa de referencia', valor: `${formatoNumero(p.bcrp?.tasaReferencia?.valor, 2)}%`, cambio: '' },
    { etiqueta: 'Normas hoy', valor: String(p.elPeruano?.total ?? '—'), cambio: '' },
    { etiqueta: 'Hechos SMV', valor: String(p.smv?.length ?? '—'), cambio: '' },
    { etiqueta: 'Proyectos de ley hoy', valor: String(proyectosHoy.value), cambio: '' },
    { etiqueta: 'Resoluciones SBS', valor: String(p.elPeruano?.sbs.length ?? '—'), cambio: '' },
    ...(indicePrincipal.value
      ? [{ etiqueta: 'MSCI NUAM Perú', valor: formatoMiles(indicePrincipal.value.valor), cambio: `${indicePrincipal.value.variacion > 0 ? '+' : ''}${indicePrincipal.value.variacion}%` }]
      : []),
    { etiqueta: 'Negociado BVL', valor: `S/ ${formatoMillones(p.bvl?.montoSoles)}`, cambio: '' }
  ]
})

// ----- Detalle -----
type IdDetalle = 'dolar' | 'euro' | 'tasa' | 'normas' | 'smv' | 'diputados' | 'senado' | 'sbs' | 'bvl' | 'emisores'
const detalleAbierto = ref(false)
const detalleId = ref<IdDetalle | null>(null)
const filtroTexto = ref('')

const detalle = computed(() => tarjetas.value.find(t => t.id === detalleId.value) ?? null)

function abrir(id: string) {
  detalleId.value = id as IdDetalle
  filtroTexto.value = ''
  periodoProyectos.value = 'semana'
  detalleAbierto.value = true
}

const hechosFiltrados = computed(() => {
  const q = filtroTexto.value.trim().toLowerCase()
  const hechos = detalleId.value === 'emisores' ? comunicadosEmisores.value : panorama.value?.smv ?? []
  return q ? hechos.filter(h => `${h.empresa} ${h.tipo} ${h.descripcion}`.toLowerCase().includes(q)) : hechos
})

const OPCIONES_PERIODO = [
  { valor: 'hoy', etiqueta: 'Hoy' },
  { valor: 'semana', etiqueta: 'Últimos 7 días' },
  { valor: 'todos', etiqueta: 'Recientes' }
] as const
const periodoProyectos = ref<typeof OPCIONES_PERIODO[number]['valor']>('semana')

const proyectosFiltrados = computed(() => {
  const fuente = detalleId.value === 'senado' ? panorama.value?.senado : panorama.value?.diputados
  const lista = fuente?.proyectos ?? []
  if (periodoProyectos.value === 'hoy') return lista.filter(p => p.fecha === hoyIso())
  if (periodoProyectos.value === 'semana') return lista.filter(p => p.fecha >= haceDias(6))
  return lista
})
</script>

<style scoped>
.panorama-page {
  display: flex;
  flex-direction: column;
  gap: 20px;
  padding-bottom: 60px;
}

/* ----- Encabezado ----- */
.pn-cabecera {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  justify-content: space-between;
  gap: 12px;
}

.pn-titulo {
  margin: 0;
  font-size: clamp(2rem, 3.6vw, 2.8rem);
}

.pn-subtitulo {
  margin: 6px 0 0;
  font-size: 0.95rem;
  color: rgba(25, 28, 31, 0.6);
}

.pn-boton,
.pn-boton-sec {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: 44px;
  padding: 0 18px;
  font: inherit;
  font-size: 0.9rem;
  font-weight: 600;
  text-decoration: none;
  cursor: pointer;
  transition: background-color 0.2s ease, border-color 0.2s ease;
}

.pn-boton {
  border: none;
  background: #1D4E89;
  color: #FFFFFF;
}

.pn-boton:hover { background: #163E6E; }

.pn-boton-sec {
  border: 1px solid #E4E6EA;
  background: #FFFFFF;
  color: #191C1F;
}

.pn-boton-sec:hover:not(:disabled) { border-color: rgba(29, 78, 137, 0.4); }
.pn-boton-sec:disabled { opacity: 0.6; cursor: wait; }

.page-container.page-container.page-container.page-container :is(.pn-boton, .pn-boton-sec) {
  border-radius: 10px !important;
}

.pn-girando { animation: pnGirar 0.9s linear infinite; }
@keyframes pnGirar { to { transform: rotate(360deg); } }

.pn-error,
.pn-aviso {
  margin: 0;
  padding: 10px 14px;
  font-size: 0.88rem;
}

.pn-error { background: #F6E3E0; color: #7E2A21; }
.pn-aviso { background: #F6EBCF; color: #6B4E10; }

.page-container.page-container.page-container.page-container :is(.pn-error, .pn-aviso) {
  border-radius: 10px !important;
}

/* ----- Cinta ----- */
.pn-cinta {
  position: relative;
  overflow: hidden;
  padding: 12px 0;
  background: linear-gradient(90deg, #13294A, #1D3B63);
  color: #FFFFFF;
  -webkit-mask-image: linear-gradient(90deg, transparent, #000 4%, #000 96%, transparent);
  mask-image: linear-gradient(90deg, transparent, #000 4%, #000 96%, transparent);
}

.page-container.page-container.page-container.page-container .pn-cinta {
  border-radius: 14px !important;
}

.pn-cinta-pista {
  display: flex;
  width: max-content;
  animation: pnCinta 38s linear infinite;
}

.pn-cinta:hover .pn-cinta-pista { animation-play-state: paused; }

@keyframes pnCinta {
  from { transform: translateX(0); }
  to { transform: translateX(-50%); }
}

.pn-cinta-item {
  display: inline-flex;
  align-items: baseline;
  gap: 8px;
  padding: 0 28px;
  border-right: 1px solid rgba(255, 255, 255, 0.14);
  font-size: 0.9rem;
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
}

.pn-cinta-etiqueta { color: rgba(255, 255, 255, 0.65); }
.pn-cinta-item strong { font-weight: 600; }
.pn-cinta-cambio { color: #A9C2E2; font-size: 0.82rem; }

/* ----- Destacado ----- */
.pn-destacado {
  display: grid;
  grid-template-columns: minmax(0, 1.7fr) minmax(0, 1fr);
  gap: 16px;
}

.pn-grafico-tarjeta,
.pn-resumen,
.pn-tarjeta {
  background: #FFFFFF;
  border: 1px solid #E4E6EA;
}

.page-container.page-container.page-container.page-container :is(.pn-grafico-tarjeta, .pn-resumen, .pn-tarjeta) {
  border-radius: 18px !important;
}

.pn-grafico-tarjeta {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 20px 22px 12px;
  font: inherit;
  text-align: left;
  color: inherit;
  cursor: pointer;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

.pn-grafico-cabecera {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  justify-content: space-between;
  gap: 8px;
}

.pn-etiqueta {
  display: block;
  font-size: 0.8rem;
  font-weight: 600;
  color: rgba(25, 28, 31, 0.58);
}

.pn-cifra-grande {
  display: block;
  margin-top: 4px;
  font-size: 2.2rem;
  font-weight: 600;
  letter-spacing: -0.02em;
  color: #191C1F;
  font-variant-numeric: tabular-nums;
}

.pn-variacion {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 0.85rem;
  color: rgba(25, 28, 31, 0.68);
}

.pn-resumen {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 20px 22px;
  background: linear-gradient(160deg, #13294A 0%, #1D3B63 100%);
  border: none;
  color: #FFFFFF;
}

.pn-resumen .pn-etiqueta { color: rgba(255, 255, 255, 0.65); }

.pn-resumen-fila {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.pn-resumen-fila > div {
  display: flex;
  align-items: baseline;
  gap: 12px;
  padding-bottom: 12px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.12);
}

.pn-resumen-num {
  min-width: 56px;
  font-size: 2rem;
  font-weight: 600;
  line-height: 1;
  font-variant-numeric: tabular-nums;
}

.pn-resumen-label {
  font-size: 0.9rem;
  color: rgba(255, 255, 255, 0.82);
}

.pn-resumen-texto {
  margin: auto 0 0;
  font-size: 0.82rem;
  line-height: 1.5;
  color: rgba(255, 255, 255, 0.62);
}

/* ----- Tarjetas ----- */
.pn-tarjetas {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 14px;
}

.pn-tarjeta {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-height: 150px;
  padding: 18px 18px 16px;
  font: inherit;
  text-align: left;
  color: inherit;
  cursor: pointer;
  transition: border-color 0.2s ease, box-shadow 0.2s ease, transform 0.2s ease;
}

@media (hover: hover) {
  .pn-tarjeta:hover,
  .pn-grafico-tarjeta:hover {
    border-color: rgba(29, 78, 137, 0.35);
  }

  .page-container.page-container.page-container.page-container :is(.pn-tarjeta, .pn-grafico-tarjeta):hover {
    box-shadow: 0 10px 28px -18px rgba(19, 41, 74, 0.45) !important;
  }

  .pn-tarjeta:hover .pn-tarjeta-flecha {
    color: #1D4E89;
    transform: translateX(3px);
  }
}

.pn-tarjeta:focus-visible,
.pn-grafico-tarjeta:focus-visible,
.pn-boton:focus-visible,
.pn-boton-sec:focus-visible {
  outline: 2px solid #1D4E89;
  outline-offset: 2px;
}

.pn-tarjeta-fuente {
  font-size: 0.74rem;
  font-weight: 600;
  letter-spacing: 0.02em;
  color: #1D4E89;
}

.pn-tarjeta-titulo {
  font-size: 0.92rem;
  font-weight: 500;
  color: rgba(25, 28, 31, 0.75);
}

.pn-tarjeta-valor {
  margin-top: auto;
  font-size: 1.9rem;
  font-weight: 600;
  letter-spacing: -0.02em;
  line-height: 1.1;
  color: #191C1F;
  font-variant-numeric: tabular-nums;
}

.pn-tarjeta-cambio {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 0.8rem;
  color: rgba(25, 28, 31, 0.58);
}

.pn-tarjeta-flecha {
  position: absolute;
  top: 16px;
  right: 16px;
  color: rgba(25, 28, 31, 0.3);
  transition: transform 0.2s ease, color 0.2s ease;
}

.pn-fuentes {
  margin: 0;
  font-size: 0.8rem;
  line-height: 1.5;
  color: rgba(25, 28, 31, 0.5);
}

/* ----- Esqueleto ----- */
.pn-esqueleto { display: flex; flex-direction: column; gap: 16px; }
.pn-esq-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 14px; }
.pn-esq { background: #F0F1F4; animation: pnEsq 1.3s ease-in-out infinite alternate; }
.pn-esq--cinta { height: 46px; }
.pn-esq--tarjeta { height: 150px; }
.page-container.page-container.page-container.page-container .pn-esq { border-radius: 16px !important; }
@keyframes pnEsq { from { opacity: 1; } to { opacity: 0.5; } }

/* ----- Panel de detalle ----- */
.pn-detalle {
  display: flex;
  flex-direction: column;
  width: min(560px, 100vw);
  height: 100vh;
  max-height: 100vh;
  background: #FFFFFF;
  color: #191C1F;
}

.pn-detalle-cabecera {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  padding: 22px 24px 16px;
  border-bottom: 1px solid #E4E6EA;
}

.pn-detalle-titulo {
  margin: 4px 0 0;
  font-size: 1.4rem;
  font-weight: 600;
  color: #191C1F;
}

.pn-cerrar {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  border: none;
  background: #F4F5F7;
  color: #191C1F;
  cursor: pointer;
  border-radius: 50%;
}

.pn-cerrar:hover { background: #E9EBEF; }

.pn-detalle-cuerpo {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 18px 24px 32px;
  overflow-y: auto;
}

.pn-cifras-detalle {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.pn-cifras-detalle > div {
  padding: 12px 14px;
  background: #F4F5F7;
  border-radius: 12px;
}

.pn-cifras-detalle strong {
  display: block;
  margin-top: 2px;
  font-size: 1.3rem;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}

.pn-nota {
  margin: 0;
  font-size: 0.85rem;
  line-height: 1.5;
  color: rgba(25, 28, 31, 0.6);
}

.pn-buscar {
  width: 100%;
  min-height: 44px;
  padding: 0 14px;
  border: 1px solid #E4E6EA;
  border-radius: 10px;
  background: #FFFFFF;
  color: #191C1F;
  font: inherit;
  outline: none;
}

.pn-buscar:focus { border-color: #1D4E89; }

.pn-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 14px 0;
  border-bottom: 1px solid #EEF0F3;
}

.pn-item-cabecera {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 10px;
}

.pn-item-titulo {
  font-size: 0.95rem;
  font-weight: 600;
  color: #191C1F;
}

.pn-item-etiqueta {
  font-size: 0.78rem;
  font-weight: 600;
  color: #1D4E89;
}

.pn-item-texto {
  margin: 0;
  font-size: 0.88rem;
  line-height: 1.5;
  color: rgba(25, 28, 31, 0.78);
}

.pn-item-pie {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 6px 12px;
  margin-top: 2px;
}

.pn-item-meta {
  font-size: 0.78rem;
  color: rgba(25, 28, 31, 0.5);
  font-variant-numeric: tabular-nums;
}

.pn-enlace {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 0.88rem;
  font-weight: 600;
  color: #1D4E89;
  text-decoration: none;
}

.pn-enlace:hover { text-decoration: underline; text-underline-offset: 3px; }
.pn-enlace--chico { font-size: 0.8rem; }

.pn-segmento {
  display: inline-flex;
  gap: 2px;
  width: fit-content;
  padding: 3px;
  background: #F4F5F7;
  border-radius: 10px;
}

.pn-segmento-opcion {
  min-height: 36px;
  padding: 0 14px;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: rgba(25, 28, 31, 0.7);
  font: inherit;
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
}

.pn-segmento-opcion--activa {
  background: #1D4E89;
  color: #FFFFFF;
}

.pn-tabla-detalle summary {
  font-size: 0.85rem;
  font-weight: 600;
  color: #1D4E89;
  cursor: pointer;
}

.pn-tabla {
  width: 100%;
  margin-top: 8px;
  border-collapse: collapse;
  font-size: 0.85rem;
  font-variant-numeric: tabular-nums;
}

.pn-variacion-celda {
  white-space: nowrap;
}

.pn-tabla th,
.pn-tabla td {
  padding: 6px 8px;
  border-bottom: 1px solid #EEF0F3;
  text-align: left;
}

/* ----- Responsive ----- */
@media (min-width: 1440px) {
  .pn-tarjetas { grid-template-columns: repeat(5, minmax(0, 1fr)); }
}

@media (max-width: 1200px) {
  .pn-tarjetas,
  .pn-esq-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}

@media (max-width: 860px) {
  .pn-destacado { grid-template-columns: minmax(0, 1fr); }
}

@media (max-width: 520px) {
  .pn-tarjetas,
  .pn-esq-grid { grid-template-columns: minmax(0, 1fr); }
  .pn-cifras-detalle { grid-template-columns: minmax(0, 1fr); }
}

@media (prefers-reduced-motion: reduce) {
  .pn-cinta-pista { animation: none; }
  .pn-cinta { overflow-x: auto; }
  .pn-esq,
  .pn-girando { animation: none; }
}
</style>

<style>
/* El panel de detalle se monta fuera de la página (q-dialog): alto
   completo y la tipografía de la app (Urbanist; títulos en Baskervville) */
.q-dialog.pn-dialogo .q-dialog__inner--right > div {
  max-height: 100vh;
}

.q-dialog.pn-dialogo .pn-detalle,
.q-dialog.pn-dialogo .pn-detalle * {
  font-family: 'Urbanist', 'Figtree', -apple-system, 'Segoe UI', sans-serif;
}

.q-dialog.pn-dialogo .pn-detalle .pn-detalle-titulo {
  font-family: 'Baskervville', 'EB Garamond', Georgia, serif;
}

.q-dialog.pn-dialogo .pn-detalle .q-icon {
  font-family: 'Material Icons';
}
</style>
