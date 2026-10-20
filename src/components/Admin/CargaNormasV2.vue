<template>
  <div class="section-block q-mb-lg carga-v2">
    <div class="actions-bar q-mb-md">
      <div>
        <span class="section-label">Normas v2 · prueba</span>
        <q-btn-toggle
          v-model="destino" dense no-caps unelevated toggle-color="accent" color="grey-3" text-color="grey-9" class="q-ml-sm"
          :disable="ocupado"
          :options="[{ label: 'Prueba', value: NAMESPACE_PRUEBA }, { label: 'Producción (normas-v2)', value: NAMESPACE_PRODUCCION }]"
          @update:model-value="() => { cargadas = null; items.forEach(i => { i.plan = null }) }"
        />
        <q-btn-toggle
          v-model="indice" dense no-caps unelevated toggle-color="accent" color="grey-3" text-color="grey-9" class="q-ml-sm"
          :disable="ocupado"
          :options="INDICES_V2.map(i => ({ label: i.nombre, value: i.id }))"
          @update:model-value="() => { cargadas = null; items.forEach(i => { i.plan = null }) }"
        />
        <q-btn flat dense no-caps color="accent" icon="fact_check" label="Verificación (solo lectura)" class="q-ml-sm" :loading="verificando" :disable="ocupado" @click="verificar" />
      </div>
      <q-file :dark="false"
        v-model="archivos"
        multiple
        dense
        outlined
        accept=".pdf,.doc,.docx,.htm,.html"
        label="Elegir normas (PDF / Word / SPIJ)"
        class="carga-v2-selector"
        :disable="ocupado"
        @update:model-value="agregarArchivos"
      >
        <template #prepend><q-icon name="upload_file" /></template>
      </q-file>
    </div>

    <p class="carga-v2-ayuda">
      Esquema nuevo: un fragmento por artículo, sin jurisprudencia ni doctrina. Se sube a un espacio de prueba;
      la base que usa Consultas hoy no se modifica. Obligatorios: nombre, tipo, número y vigencia.
    </p>

    <div v-for="(item, i) in items" :key="item.id" class="carga-v2-item">
      <div class="row items-center no-wrap q-mb-sm">
        <q-icon :name="iconoEstado(item.estado)" :color="colorEstado(item.estado)" size="20px" class="q-mr-sm" />
        <div class="col ellipsis text-weight-medium">{{ item.archivo.name }}</div>
        <q-btn v-if="!ocupado" flat round dense color="grey-8" icon="close" size="sm" @click="items.splice(i, 1)" />
      </div>

      <div v-if="item.estado === 'leyendo'" class="text-grey-7">Leyendo y analizando…</div>
      <div v-else-if="item.estado === 'error'" class="text-negative">{{ item.mensaje }}</div>

      <template v-else>
        <q-banner v-for="aviso in avisosDe(item)" :key="aviso" dense rounded class="bg-orange-1 text-orange-10 q-mb-sm">
          <template #avatar><q-icon name="warning" color="orange-8" /></template>
          {{ aviso }}
        </q-banner>

        <div class="row q-col-gutter-sm">
          <q-input :dark="false" v-model="item.meta.norma" dense outlined label="Nombre para citar *" class="col-12 col-md-6" :disable="ocupado" />
          <q-select :dark="false" v-model="item.meta.tipoNorma" dense outlined emit-value map-options :options="opcionesTipo" label="Tipo *" class="col-6 col-md-3" :disable="ocupado" />
          <q-input :dark="false" v-model="item.meta.numeroNorma" dense outlined label="Número *" placeholder="Ley 29571, D. Leg. 295…" class="col-6 col-md-3" :disable="ocupado" />
          <q-select :dark="false" v-model="item.meta.vigencia" dense outlined emit-value map-options :options="opcionesVigencia" label="Vigencia de la norma *" class="col-6 col-md-3" :disable="ocupado" />
          <q-select :dark="false" v-model="item.meta.area" dense outlined emit-value map-options clearable :options="opcionesArea" label="Área" class="col-6 col-md-3" :disable="ocupado" />
          <q-input :dark="false" v-model="item.meta.fechaPublicacion" dense outlined label="Fecha de publicación" placeholder="AAAA-MM-DD" class="col-6 col-md-3" :disable="ocupado" />
          <q-input :dark="false" v-model="item.meta.fuenteUrl" dense outlined label="URL de la fuente" class="col-6 col-md-3" :disable="ocupado" />
        </div>

        <div class="carga-v2-datos">
          <span><strong>{{ item.resultado?.estadisticas.articulosDistintos ?? 0 }}</strong> artículos</span>
          <span><strong>{{ registrosDe(item).length }}</strong> fragmentos</span>
          <span>~<strong>{{ estimarTokens(registrosDe(item)).toLocaleString('es-PE') }}</strong> tokens</span>
          <span>{{ item.resultado?.estadisticas.derogados ?? 0 }} derogados · {{ item.resultado?.estadisticas.modificados ?? 0 }} modificados <em>(detectados)</em></span>
          <span>{{ item.resultado?.anotaciones.length ?? 0 }} anotaciones excluidas</span>
          <span class="text-grey-6">id: {{ normaIdDe(item) }}</span>
        </div>

        <div v-if="item.plan" class="carga-v2-plan">
          Plan: {{ item.plan.nuevos.length }} nuevos · {{ item.plan.modificados.length }} modificados ·
          {{ item.plan.iguales }} sin cambios · {{ item.plan.obsoletos.length }} a borrar
        </div>
        <div v-if="item.mensaje" :class="item.estado === 'subido' ? 'text-positive' : 'text-grey-8'">{{ item.mensaje }}</div>
      </template>
    </div>

    <div class="carga-v2-cargadas">
      <div class="row items-center q-mb-xs">
        <span class="text-weight-medium">En el espacio de prueba</span>
        <q-btn flat dense no-caps color="accent" icon="refresh" label="Actualizar" class="q-ml-sm" :loading="listando" @click="listarCargadas" />
      </div>
      <div v-if="cargadas === null" class="text-grey-7">Pulsa "Actualizar" para ver qué normas hay cargadas.</div>
      <div v-else-if="!cargadas.length" class="text-grey-7">Vacío.</div>
      <div v-for="n in cargadas" :key="n.normaId" class="row items-center no-wrap carga-v2-cargada">
        <span class="col">{{ n.normaId }} · {{ n.fragmentos }} fragmentos</span>
        <q-btn flat dense no-caps color="negative" icon="delete" label="Quitar" :disable="ocupado" @click="aQuitar = n.normaId" />
      </div>
    </div>

    <q-dialog :model-value="aQuitar !== ''" persistent @update:model-value="v => { if (!v) aQuitar = '' }">
      <q-card :dark="false" style="min-width: 340px">
        <q-card-section>
          ¿Quitar <strong>{{ aQuitar }}</strong> de {{ destino }}? Se borran todos sus fragmentos de ese espacio.
          La base de Consultas no se toca.
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat no-caps color="grey-8" label="Cancelar" @click="aQuitar = ''" />
          <q-btn unelevated no-caps color="negative" label="Quitar" :loading="quitando" @click="quitar" />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <q-banner v-if="pendientes.length" dense rounded class="bg-orange-1 text-orange-10 q-mt-sm">
      <template #avatar><q-icon name="info" color="orange-8" /></template>
      Para calcular el plan, todos los archivos deben estar listos:
      <ul class="q-my-xs">
        <li v-for="p in pendientes" :key="p.nombre"><strong>{{ p.nombre }}</strong>: {{ p.motivo }}</li>
      </ul>
    </q-banner>

    <div v-if="items.length" class="carga-v2-pie">
      <div>
        Total: <strong>{{ totalFragmentos }}</strong> fragmentos · ~<strong>{{ totalTokens.toLocaleString('es-PE') }}</strong> tokens de embedding
      </div>
      <div class="row q-gutter-sm">
        <q-btn outline color="accent" no-caps icon="fact_check" label="Calcular plan" :loading="planificando" :disable="!listas || ocupado" @click="calcularPlan" />
        <q-btn color="accent" unelevated no-caps icon="cloud_upload" :label="`Subir a ${destino}`" :disable="!listas || ocupado || !conPlan" @click="confirmar = true" />
      </div>
    </div>

    <q-dialog v-model="verVerificacion">
      <q-card :dark="false" style="width: 900px; max-width: 95vw">
        <q-card-section class="row items-center">
          <div class="text-h6 col">Verificación en {{ indice }} / {{ destino }}</div>
          <q-btn flat dense no-caps color="accent" icon="download" label="Descargar JSON" @click="descargarVerificacion" />
          <q-btn flat round dense color="grey-8" icon="close" v-close-popup />
        </q-card-section>
        <q-card-section class="q-pt-none" style="max-height: 70vh; overflow: auto">
          <div v-for="v in verificacion" :key="v.etiqueta" class="carga-v2-item">
            <div class="text-weight-bold">{{ v.etiqueta }} · {{ v.fragmentos.length }} fragmento(s)</div>
            <div v-if="!v.fragmentos.length" class="text-negative">No encontrado</div>
            <div v-for="f in v.fragmentos" :key="f.id" class="q-mt-sm">
              <div class="text-caption text-grey-7">
                {{ f.id }} · vigencia: {{ f.metadatos.vigencia }} ({{ f.metadatos.vigenciaOrigen }}) · norma: {{ f.metadatos.vigenciaNorma }}
              </div>
              <pre class="carga-v2-pre">{{ f.texto }}</pre>
              <pre class="carga-v2-pre carga-v2-meta">{{ JSON.stringify(f.metadatos, null, 2) }}</pre>
            </div>
          </div>
        </q-card-section>
      </q-card>
    </q-dialog>

    <q-dialog v-model="confirmar" persistent>
      <q-card :dark="false" style="min-width: 360px; max-width: 520px">
        <q-card-section class="text-h6">Subir a {{ indice }} / {{ destino }}</q-card-section>
        <q-card-section v-if="destino === NAMESPACE_PRODUCCION" class="q-pt-none">
          <q-banner dense rounded class="bg-orange-1 text-orange-10">
            Es el espacio de producción del esquema nuevo. Consultas solo lo usa cuando el interruptor de búsqueda está en "v2".
          </q-banner>
        </q-card-section>
        <q-card-section>
          Se subirán <strong>{{ porSubir }}</strong> fragmentos (~{{ tokensPorSubir.toLocaleString('es-PE') }} tokens)
          y se borrarán {{ porBorrar }} obsoletos, solo en {{ indice }} / {{ destino }}. La base actual de Consultas (__default__) no cambia.
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat no-caps color="grey-8" label="Cancelar" v-close-popup />
          <q-btn color="accent" unelevated no-caps label="Subir" v-close-popup @click="subir" />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </div>
</template>

<script setup lang="ts">
// =========================
// CARGA DE NORMAS v2 (mejora de Consultas, fase 2)
// Lee la norma (con recuperación de márgenes en PDF), la corta con el parser
// v2, completa los datos con el catálogo y la sube al namespace de prueba
// de forma incremental. No toca la carga actual de Admin ni __default__.
// =========================
import { computed, ref } from 'vue'
import { useQuasar } from 'quasar'
import { extraerTextoNorma } from '../../utils/extraerTextoNorma'
import { parsearNormaV2, type ResultadoParserV2 } from '../../utils/normas/parserNormaV2'
import { construirRegistrosV2, sugerirMetadatosNorma, hashTexto, slug, TIPOS_NORMA, type MetaNorma, type RegistroV2 } from '../../utils/normas/metadatosNorma'
import { buscarEnCatalogo, NORMAS_EXCLUIDAS, AREAS_NORMAS } from '../../utils/normas/catalogoNormas'
import { NAMESPACE_PRUEBA, NAMESPACE_PRODUCCION, INDICES_V2, maxCaracteresDe, estimarTokens, planificarCarga, ejecutarCarga, buscarNormasV2, listarNormasV2, vaciarNormaV2, type PlanCarga, type IndiceV2 } from '../../services/normasV2Service'

type Estado = 'leyendo' | 'listo' | 'error' | 'subiendo' | 'subido'

interface ItemV2 {
  id: number
  archivo: File
  estado: Estado
  mensaje: string
  texto: string
  resultado: ResultadoParserV2 | null
  aviso: string
  porVerificar: boolean
  // Datos del catálogo para esta norma (para avisar si el formulario no coincide)
  catalogo: { tipoNorma: string; numeroNorma: string } | null
  meta: Omit<MetaNorma, 'normaId' | 'area' | 'fechaPublicacion' | 'fuenteUrl'> & { area: string | null; fechaPublicacion: string; fuenteUrl: string; normaId: string }
  plan: PlanCarga | null
}

const $q = useQuasar()
// Espacio donde se sube: prueba (por defecto) o producción del esquema nuevo
const destino = ref<string>(NAMESPACE_PRUEBA)
// Índice: lexit (el de siempre) o lexit-e5 (fragmentos más cortos)
const indice = ref<IndiceV2>('lexit')
const archivos = ref<File[] | null>(null)
const items = ref<ItemV2[]>([])
const planificando = ref(false)
const ocupado = ref(false)
const confirmar = ref(false)
let siguienteId = 1

const opcionesTipo = TIPOS_NORMA.map(t => ({ label: t.etiqueta, value: t.valor }))
const opcionesVigencia = [
  { label: 'Vigente', value: 'vigente' },
  { label: 'Vigente con modificaciones', value: 'modificado' },
  { label: 'Derogada', value: 'derogado' }
]
const opcionesArea = AREAS_NORMAS.map(e => ({ label: e.etiqueta, value: e.valor }))

function normaIdDe(item: ItemV2): string {
  return item.meta.normaId || slug(item.meta.numeroNorma || item.meta.norma) || 'norma'
}

function metaDe(item: ItemV2): MetaNorma {
  const m = item.meta
  return {
    normaId: normaIdDe(item),
    norma: m.norma.trim(),
    tipoNorma: m.tipoNorma,
    numeroNorma: m.numeroNorma.trim(),
    vigencia: m.vigencia,
    ...(m.area ? { area: m.area } : {}),
    ...(/^\d{4}-\d{2}-\d{2}$/.test(m.fechaPublicacion) ? { fechaPublicacion: m.fechaPublicacion } : {}),
    ...(m.fuenteUrl.trim() ? { fuenteUrl: m.fuenteUrl.trim() } : {})
  }
}

// Doctrina, jurisprudencia, créditos y presentación quedan fuera (incluirAnotaciones: false)
const registrosCache = new WeakMap<ItemV2, { clave: string; registros: RegistroV2[] }>()
function registrosDe(item: ItemV2): RegistroV2[] {
  if (!item.resultado) return []
  const meta = metaDe(item)
  const maxCaracteres = maxCaracteresDe(indice.value)
  const clave = JSON.stringify({ meta, maxCaracteres })
  const cache = registrosCache.get(item)
  if (cache?.clave === clave) return cache.registros
  const registros = construirRegistrosV2(meta, item.resultado, { maxCaracteres })
  registrosCache.set(item, { clave, registros })
  return registros
}

function avisosDe(item: ItemV2): string[] {
  const avisos: string[] = []
  if (item.aviso) avisos.push(item.aviso)
  if (item.porVerificar) avisos.push('Tipo y número pendientes de verificar contra el texto oficial.')
  if (item.catalogo && item.meta.tipoNorma !== item.catalogo.tipoNorma) {
    avisos.push(`El tipo elegido no coincide con el catálogo (${TIPOS_NORMA.find(t => t.valor === item.catalogo?.tipoNorma)?.etiqueta ?? item.catalogo.tipoNorma}).`)
  }
  if (item.catalogo && item.meta.numeroNorma.trim() !== item.catalogo.numeroNorma) avisos.push(`El número no coincide con el catálogo (${item.catalogo.numeroNorma}).`)
  if (NORMAS_EXCLUIDAS.some(n => n.replace(/\s/g, '') === item.meta.numeroNorma.replace(/\s/g, ''))) avisos.push('Esta norma está excluida de la base: no se subirá.')
  if (item.resultado && item.resultado.estadisticas.articulosDistintos === 0) avisos.push('No se reconoció ningún artículo.')
  return avisos
}

// Por qué un archivo todavía no se puede subir (vacío = listo)
function motivoPendiente(item: ItemV2): string {
  const m = item.meta
  if (item.estado === 'leyendo') return 'todavía se está leyendo'
  if (item.estado === 'error') return `error al leer: ${item.mensaje}`
  if (NORMAS_EXCLUIDAS.some(n => n.replace(/\s/g, '') === m.numeroNorma.replace(/\s/g, ''))) return 'norma excluida: quítala de la lista'
  if (registrosDe(item).length === 0) return 'no se reconoció ningún artículo: quítala de la lista'
  const faltan = [!m.norma.trim() && 'nombre', !m.tipoNorma && 'tipo', !m.numeroNorma.trim() && 'número', !m.vigencia && 'vigencia'].filter(Boolean)
  return faltan.length ? `falta: ${faltan.join(', ')}` : ''
}

function completo(item: ItemV2): boolean {
  return motivoPendiente(item) === ''
}

const pendientes = computed(() => items.value.map(i => ({ nombre: i.archivo.name, motivo: motivoPendiente(i) })).filter(p => p.motivo))

const listas = computed(() => items.value.length > 0 && items.value.every(completo))
const conPlan = computed(() => items.value.every(i => i.plan))
const totalFragmentos = computed(() => items.value.reduce((s, i) => s + registrosDe(i).length, 0))
const totalTokens = computed(() => items.value.reduce((s, i) => s + estimarTokens(registrosDe(i)), 0))
const porSubir = computed(() => items.value.reduce((s, i) => s + (i.plan ? i.plan.nuevos.length + i.plan.modificados.length : 0), 0))
const tokensPorSubir = computed(() => items.value.reduce((s, i) => s + (i.plan ? estimarTokens([...i.plan.nuevos, ...i.plan.modificados]) : 0), 0))
const porBorrar = computed(() => items.value.reduce((s, i) => s + (i.plan?.obsoletos.length ?? 0), 0))

async function leer(item: ItemV2) {
  try {
    item.texto = await extraerTextoNorma(item.archivo, undefined, { recuperarMargenes: true, marcarLetraPequena: true })
    item.resultado = parsearNormaV2(item.texto)
    const nombreArchivo = item.archivo.name.replace(/\.(pdf|docx?|html?)$/i, '')
    const sugerencia = sugerirMetadatosNorma(item.texto, nombreArchivo)
    const catalogo = buscarEnCatalogo(sugerencia.numeroNorma, sugerencia.tipoNorma, nombreArchivo)
    item.aviso = sugerencia.aviso ?? ''
    item.porVerificar = catalogo?.porVerificar ?? false
    item.catalogo = catalogo ? { tipoNorma: catalogo.tipoNorma, numeroNorma: catalogo.numeroNorma } : null
    item.meta = {
      normaId: catalogo?.normaId ?? '',
      norma: catalogo?.norma ?? '',
      tipoNorma: catalogo?.tipoNorma ?? sugerencia.tipoNorma,
      numeroNorma: catalogo?.numeroNorma ?? sugerencia.numeroNorma,
      vigencia: 'vigente',
      area: catalogo?.area ?? null,
      fechaPublicacion: sugerencia.fechaPublicacion ?? '',
      fuenteUrl: ''
    }
    item.estado = 'listo'
  } catch (err) {
    item.estado = 'error'
    item.mensaje = err instanceof Error ? err.message : 'No se pudo leer el archivo'
  }
}

function agregarArchivos(valor: File[] | File | null) {
  const lista = Array.isArray(valor) ? valor : valor ? [valor] : []
  for (const archivo of lista) {
    const item: ItemV2 = {
      id: siguienteId++, archivo, estado: 'leyendo', mensaje: '', texto: '', resultado: null, aviso: '', porVerificar: false, catalogo: null, plan: null,
      meta: { normaId: '', norma: '', tipoNorma: 'otra', numeroNorma: '', vigencia: 'vigente', area: null, fechaPublicacion: '', fuenteUrl: '' }
    }
    items.value.push(item)
    void leer(items.value[items.value.length - 1]!)
  }
  archivos.value = null
}

async function calcularPlan() {
  planificando.value = true
  try {
    for (const item of items.value) item.plan = await planificarCarga(destino.value, normaIdDe(item), registrosDe(item), indice.value)
  } catch (err) {
    $q.notify({ type: 'negative', message: err instanceof Error ? err.message : 'No se pudo calcular el plan' })
  } finally {
    planificando.value = false
  }
}

async function subir() {
  ocupado.value = true
  for (const item of items.value) {
    if (!item.plan) continue
    item.estado = 'subiendo'
    try {
      const meta = metaDe(item)
      const { subidos, eliminados } = await ejecutarCarga(destino.value, meta.normaId, item.plan, {
        ...meta,
        archivo: item.archivo.name,
        hashDocumento: hashTexto(item.texto),
        fragmentos: registrosDe(item).length,
        articulos: item.resultado?.estadisticas.articulosDistintos ?? 0
      }, (hechos, total) => { item.mensaje = `Subiendo ${hechos} de ${total}…` }, indice.value)
      item.estado = 'subido'
      item.mensaje = `Listo: ${subidos} subidos, ${eliminados} borrados, ${item.plan.iguales} sin cambios.`
      item.plan = null
    } catch (err) {
      item.estado = 'error'
      item.mensaje = err instanceof Error ? err.message : 'No se pudo subir'
    }
  }
  ocupado.value = false
}

// =========================
// VERIFICACIÓN (solo lectura): trae artículos concretos por norma y número
// con un filtro exacto; no escribe nada.
// =========================
const VERIFICACIONES = [
  { etiqueta: 'Código Civil, art. 1', normaId: 'codigo-civil', articulo: '1', consulta: 'la persona humana es sujeto de derecho desde su nacimiento' },
  { etiqueta: 'Código Civil, art. 140', normaId: 'codigo-civil', articulo: '140', consulta: 'acto jurídico requisitos de validez' },
  { etiqueta: 'Código Penal, art. 108-C', normaId: 'codigo-penal', articulo: '108-C', consulta: 'sicariato' },
  { etiqueta: 'TUO Ley del IR, art. 1', normaId: 'tuo-ley-impuesto-renta', articulo: '1', consulta: 'el impuesto a la renta grava' },
  { etiqueta: 'Constitución, art. 2', normaId: 'constitucion-1993', articulo: '2', consulta: 'toda persona tiene derecho' }
]

interface FragmentoVerificado { id: string; texto: string; metadatos: Record<string, unknown> }
// =========================
// NORMAS YA CARGADAS en el espacio de prueba (y quitar una)
// =========================
const cargadas = ref<Array<{ normaId: string; fragmentos: number }> | null>(null)
const listando = ref(false)
const aQuitar = ref('')
const quitando = ref(false)

async function listarCargadas() {
  listando.value = true
  try {
    cargadas.value = await listarNormasV2(destino.value, indice.value)
  } catch (err) {
    $q.notify({ type: 'negative', message: err instanceof Error ? err.message : 'No se pudo listar' })
  } finally {
    listando.value = false
  }
}

async function quitar() {
  quitando.value = true
  try {
    const eliminados = await vaciarNormaV2(destino.value, aQuitar.value, indice.value)
    $q.notify({ type: 'positive', message: `${aQuitar.value}: ${eliminados} fragmentos quitados de ${destino.value}` })
    aQuitar.value = ''
    await listarCargadas()
  } catch (err) {
    $q.notify({ type: 'negative', message: err instanceof Error ? err.message : 'No se pudo quitar' })
  } finally {
    quitando.value = false
  }
}

const verificando = ref(false)
const verVerificacion = ref(false)
const verificacion = ref<Array<{ etiqueta: string; fragmentos: FragmentoVerificado[] }>>([])

async function verificar() {
  verificando.value = true
  try {
    const resultados = []
    for (const v of VERIFICACIONES) {
      const hits = await buscarNormasV2(destino.value, v.consulta, {
        topK: 10,
        filtro: { normaId: { $eq: v.normaId }, articulo: { $eq: v.articulo } },
        indice: indice.value
      })
      const fragmentos = hits
        .map(h => {
          const { text, ...metadatos } = h.fields
          return { id: h._id, texto: typeof text === 'string' ? text : '', metadatos }
        })
        .sort((a, b) => Number(a.metadatos.parte ?? 0) - Number(b.metadatos.parte ?? 0))
      resultados.push({ etiqueta: v.etiqueta, fragmentos })
    }
    verificacion.value = resultados
    verVerificacion.value = true
  } catch (err) {
    $q.notify({ type: 'negative', message: err instanceof Error ? err.message : 'No se pudo verificar' })
  } finally {
    verificando.value = false
  }
}

function descargarVerificacion() {
  const blob = new Blob([JSON.stringify({ indice: indice.value, namespace: destino.value, generadoEn: new Date().toISOString(), resultados: verificacion.value }, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const enlace = document.createElement('a')
  enlace.href = url
  enlace.download = `verificacion-normas-v2-${new Date().toISOString().slice(0, 10)}.json`
  enlace.click()
  URL.revokeObjectURL(url)
}

function iconoEstado(e: Estado) {
  return { leyendo: 'hourglass_top', listo: 'description', error: 'error', subiendo: 'cloud_sync', subido: 'cloud_done' }[e]
}
function colorEstado(e: Estado) {
  return { leyendo: 'grey-6', listo: 'accent', error: 'negative', subiendo: 'accent', subido: 'positive' }[e]
}
</script>

<style scoped>
/* La app usa el modo oscuro de Quasar con fondos blancos: texto oscuro explícito */
.carga-v2 { color: var(--ink, #1a1f2b); }
.carga-v2 :deep(.q-field__native),
.carga-v2 :deep(.q-field__input),
.carga-v2 :deep(.q-field__prefix),
.carga-v2 :deep(.q-field__suffix) { color: #1a1f2b; }
.carga-v2 :deep(.q-field__label) { color: #5b6475; }
.carga-v2-selector { min-width: 280px; }
.carga-v2-ayuda { margin: 0 0 12px; font-size: 0.88rem; color: #5b6475; }
.carga-v2-item { padding: 14px 0; border-top: 1px solid #e4e7ec; }
.carga-v2-datos { display: flex; flex-wrap: wrap; gap: 6px 18px; margin-top: 10px; font-size: 0.88rem; color: #2b3240; }
.carga-v2-plan { margin-top: 6px; font-size: 0.88rem; color: #1d4e89; }
.carga-v2-pre { margin: 4px 0 0; padding: 10px 12px; background: #f6f7f9; border-radius: 4px; font-size: 0.8rem; white-space: pre-wrap; word-break: break-word; }
.carga-v2-meta { color: #5b6475; }
.carga-v2-cargadas { margin: 4px 0 8px; padding: 10px 0; border-top: 1px solid #e4e7ec; font-size: 0.9rem; }
.carga-v2-cargada { padding: 2px 0; }
.carga-v2-pie { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 12px; padding-top: 14px; border-top: 1px solid #e4e7ec; }
</style>
