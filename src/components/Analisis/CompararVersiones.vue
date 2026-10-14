<template>
  <section class="cv" aria-label="Comparar versiones de un contrato">
    <!-- Carga de las dos versiones (se oculta al ver el resultado) -->
    <div v-show="!resultado" class="cv-cargas">
      <div
        v-for="lado in LADOS"
        :key="lado.id"
        class="cv-zona"
        :class="{
          'cv-zona--arrastrando': arrastrando === lado.id,
          'cv-zona--lista': cargas[lado.id].estado === 'listo',
          'cv-zona--error': cargas[lado.id].estado === 'error'
        }"
        role="button"
        tabindex="0"
        :aria-label="`${lado.titulo}: elegir archivo Word`"
        @click="abrirSelector(lado.id)"
        @keydown.enter.prevent="abrirSelector(lado.id)"
        @keydown.space.prevent="abrirSelector(lado.id)"
        @dragenter.prevent="arrastrando = lado.id"
        @dragover.prevent
        @dragleave.prevent="arrastrando = null"
        @drop.prevent="onDrop(lado.id, $event)"
      >
        <span class="cv-zona-etiqueta">{{ lado.titulo }}</span>

        <template v-if="cargas[lado.id].estado === 'leyendo'">
          <q-spinner size="26px" class="cv-zona-icono" />
          <p class="cv-zona-texto">Leyendo el documento…</p>
        </template>

        <template v-else-if="cargas[lado.id].estado === 'listo' && cargas[lado.id].documento">
          <q-icon name="description" size="28px" class="cv-zona-icono" />
          <p class="cv-zona-archivo">{{ cargas[lado.id].documento!.nombre }}</p>
          <p class="cv-zona-texto">{{ cargas[lado.id].documento!.parrafos.length }} párrafos leídos</p>
          <span class="cv-zona-accion">Cambiar archivo</span>
        </template>

        <template v-else>
          <q-icon name="upload_file" size="28px" class="cv-zona-icono" />
          <p class="cv-zona-texto">{{ lado.ayuda }}</p>
          <span class="cv-zona-accion">Elegir archivo</span>
          <p class="cv-zona-nota">Solo Word (.docx), hasta 10 MB</p>
        </template>

        <p v-if="cargas[lado.id].estado === 'error'" class="cv-zona-error" role="alert">{{ cargas[lado.id].mensaje }}</p>
      </div>
    </div>

    <div v-if="ambasListas && !resultado" class="cv-acciones">
      <button type="button" class="cv-comparar" @click="comparar">
        Comparar versiones
      </button>
    </div>

    <!-- ====================== RESULTADO ====================== -->
    <div v-if="resultado" class="cv-resultado">
      <div class="cv-cabecera">
        <div class="cv-cabecera-archivos">
          <span>{{ cargas.original.documento?.nombre }}</span>
          <q-icon name="arrow_forward" size="16px" aria-hidden="true" />
          <span>{{ cargas.modificada.documento?.nombre }}</span>
        </div>
        <div class="cv-cabecera-acciones">
          <button
            v-if="totalCambios > 0"
            type="button"
            class="cv-comparar cv-exportar"
            :disabled="exportando || estadoIA === 'cargando'"
            :title="estadoIA === 'cargando' ? 'Espera a que termine el análisis de la IA' : 'Descargar la comparación en Word'"
            @click="exportar"
          >
            <q-spinner v-if="exportando" size="14px" />
            <q-icon v-else name="file_download" size="18px" />
            Exportar comparación
          </button>
          <button type="button" class="cv-boton-sec" @click="nuevaComparacion">Nueva comparación</button>
        </div>
      </div>

      <!-- Resumen -->
      <div class="cv-resumen">
        <div class="cv-resumen-grupo">
          <span class="cv-resumen-titulo">Cambios</span>
          <div class="cv-cifras">
            <div class="cv-cifra"><span class="cv-cifra-num">{{ resultado.totales.modificada }}</span><span class="cv-cifra-label">Modificadas</span></div>
            <div class="cv-cifra"><span class="cv-cifra-num">{{ resultado.totales.agregada }}</span><span class="cv-cifra-label">Agregadas</span></div>
            <div class="cv-cifra"><span class="cv-cifra-num">{{ resultado.totales.eliminada }}</span><span class="cv-cifra-label">Eliminadas</span></div>
            <div class="cv-cifra cv-cifra--suave"><span class="cv-cifra-num">{{ resultado.totales.sin_cambios }}</span><span class="cv-cifra-label">Sin cambios</span></div>
          </div>
        </div>
        <div class="cv-resumen-grupo">
          <span class="cv-resumen-titulo">Riesgo</span>
          <div v-if="estadoIA === 'cargando'" class="cv-ia-cargando" role="status">
            <q-spinner size="16px" /> Analizando los cambios con IA…
          </div>
          <div v-else class="cv-cifras">
            <div v-for="nivel in NIVELES" :key="nivel.valor" class="cv-cifra" :class="`cv-cifra--${nivel.valor}`">
              <span class="cv-cifra-num">{{ estadoIA === 'listo' ? conteoRiesgo[nivel.valor] : '—' }}</span>
              <span class="cv-cifra-label">{{ nivel.etiqueta }}</span>
            </div>
          </div>
        </div>
      </div>

      <p v-if="errorExportar" class="cv-aviso" role="alert">{{ errorExportar }}</p>

      <!-- Aviso si la IA no pudo explicar: el diff se muestra igual -->
      <div v-if="estadoIA === 'error'" class="cv-aviso" role="alert">
        <span>La explicación de la IA no está disponible: {{ errorIA }}</span>
        <button type="button" class="cv-boton-sec" @click="pedirExplicaciones">Reintentar</button>
      </div>

      <p v-if="totalCambios === 0" class="cv-vacio">Las dos versiones tienen el mismo contenido: no se encontraron cambios.</p>

      <template v-else>
        <!-- Filtros -->
        <div class="cv-filtros">
          <div class="cv-filtro" role="group" aria-label="Filtrar por tipo de cambio">
            <button
              v-for="t in FILTROS_TIPO"
              :key="t.valor"
              type="button"
              class="cv-chip"
              :class="{ 'cv-chip--activo': filtroTipo === t.valor }"
              :aria-pressed="filtroTipo === t.valor"
              @click="filtroTipo = t.valor"
            >
              {{ t.etiqueta }}
            </button>
          </div>
          <div class="cv-filtro" role="group" aria-label="Filtrar por nivel de riesgo">
            <button
              v-for="n in FILTROS_NIVEL"
              :key="n.valor"
              type="button"
              class="cv-chip"
              :class="{ 'cv-chip--activo': filtroNivel === n.valor }"
              :aria-pressed="filtroNivel === n.valor"
              :disabled="n.valor !== 'todos' && estadoIA !== 'listo'"
              @click="filtroNivel = n.valor"
            >
              {{ n.etiqueta }}
            </button>
          </div>
        </div>

        <p v-if="cambiosVisibles.length === 0" class="cv-vacio">Ningún cambio coincide con los filtros elegidos.</p>

        <!-- Lista de cambios en el orden del documento: compacta. Cada fila
             muestra solo el fragmento que cambió (con unas palabras de
             contexto); "Ver cláusula completa" despliega ambas versiones. -->
        <div class="cv-lista">
          <article
            v-for="(c, ci) in cambiosVisibles"
            :key="c.id"
            class="cv-fila"
            :class="{ 'cv-fila--abierta': abiertos.has(c.id) }"
          >
            <div class="cv-fila-cabecera">
              <span class="cv-fila-numero">{{ ci + 1 }}</span>
              <h3 class="cv-fila-titulo">{{ c.titulo }}</h3>
              <span class="cv-insignia" :class="`cv-insignia--${c.tipo}`">{{ ETIQUETA_TIPO[c.tipo] }}</span>
              <span v-if="explicacionDe(c.id)" class="cv-insignia" :class="`cv-insignia--${explicacionDe(c.id)!.nivel}`">
                Riesgo {{ explicacionDe(c.id)!.nivel }}
              </span>
            </div>

            <div class="cv-fila-cuerpo">
              <!-- Qué cambió en el texto (fragmento) -->
              <div class="cv-fragmento">
                <span class="cv-texto-etiqueta">Cambio en el texto</span>
                <p class="cv-texto-cuerpo">
                  <template v-for="(t, ti) in fragmento(c)" :key="ti">
                    <del v-if="t.tipo === 'eliminado'" class="cv-eliminado">{{ t.texto }}</del>
                    <ins v-else-if="t.tipo === 'agregado'" class="cv-agregado">{{ t.texto }}</ins>
                    <span v-else-if="t.tipo === 'corte'" class="cv-corte">{{ t.texto }}</span>
                    <span v-else>{{ t.texto }}</span>
                  </template>
                </p>
              </div>

              <!-- Interpretación de la IA -->
              <div class="cv-ia">
                <template v-if="explicacionDe(c.id)">
                  <p class="cv-ia-resumen">{{ explicacionDe(c.id)!.resumen }}</p>
                  <p v-if="explicacionDe(c.id)!.recomendacion" class="cv-ia-dato">
                    <strong>Recomendación:</strong> {{ explicacionDe(c.id)!.recomendacion }}
                  </p>
                  <p class="cv-ia-meta">
                    Favorece: {{ textoFavorece(explicacionDe(c.id)!.favorece) }}<template v-if="explicacionDe(c.id)!.norma"> · {{ explicacionDe(c.id)!.norma }}</template>
                  </p>
                </template>
                <p v-else-if="estadoIA === 'cargando'" class="cv-ia-pendiente">Analizando este cambio…</p>
                <p v-else class="cv-ia-pendiente">Explicación no disponible.</p>
              </div>
            </div>

            <button
              type="button"
              class="cv-fila-ver"
              :aria-expanded="abiertos.has(c.id)"
              @click="alternar(c.id)"
            >
              {{ abiertos.has(c.id) ? 'Ocultar cláusula completa' : 'Ver cláusula completa' }}
              <q-icon :name="abiertos.has(c.id) ? 'expand_less' : 'expand_more'" size="18px" />
            </button>

            <!-- Texto completo de ambas versiones -->
            <div v-if="abiertos.has(c.id)" class="cv-textos" :class="{ 'cv-textos--uno': c.tipo !== 'modificada' }">
              <div v-if="c.tipo !== 'agregada'" class="cv-texto">
                <span class="cv-texto-etiqueta">Versión original</span>
                <p class="cv-texto-cuerpo">
                  <template v-for="(t, ti) in c.tramos" :key="ti">
                    <del v-if="t.tipo === 'eliminado'" class="cv-eliminado">{{ t.texto }}</del>
                    <span v-else-if="t.tipo === 'igual'">{{ t.texto }}</span>
                  </template>
                </p>
              </div>
              <div v-if="c.tipo !== 'eliminada'" class="cv-texto">
                <span class="cv-texto-etiqueta">Versión modificada</span>
                <p class="cv-texto-cuerpo">
                  <template v-for="(t, ti) in c.tramos" :key="ti">
                    <ins v-if="t.tipo === 'agregado'" class="cv-agregado">{{ t.texto }}</ins>
                    <span v-else-if="t.tipo === 'igual'">{{ t.texto }}</span>
                  </template>
                </p>
              </div>
            </div>
          </article>
        </div>

        <p class="cv-nota">Borrador de apoyo. Debe ser revisado por un abogado.</p>
      </template>
    </div>

    <input
      ref="inputArchivo"
      type="file"
      accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
      class="cv-input-oculto"
      @change="onArchivoElegido"
    />
  </section>
</template>

<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { explicarCambios, type ExplicacionCambio } from '../../services/compararVersionesService'
import { comparacionAWord, nombreArchivoComparacion } from '../../utils/exportarComparacion'
import {
  ErrorArchivoWord,
  compararDocumentos,
  leerDocumentoComparable,
  validarArchivoWord,
  type DocumentoComparable,
  type CambioClausula,
  type ResultadoComparacion,
  type TipoCambio
} from '../../utils/compararVersiones'

type Lado = 'original' | 'modificada'

const LADOS: { id: Lado; titulo: string; ayuda: string }[] = [
  { id: 'original', titulo: 'Versión original', ayuda: 'Arrastra aquí la versión original o haz clic para elegirla' },
  { id: 'modificada', titulo: 'Versión modificada', ayuda: 'Arrastra aquí la versión con cambios o haz clic para elegirla' }
]

interface EstadoCarga {
  estado: 'vacio' | 'leyendo' | 'listo' | 'error'
  mensaje: string
  documento: DocumentoComparable | null
}

const cargas = reactive<Record<Lado, EstadoCarga>>({
  original: { estado: 'vacio', mensaje: '', documento: null },
  modificada: { estado: 'vacio', mensaje: '', documento: null }
})

const ambasListas = computed(() => cargas.original.estado === 'listo' && cargas.modificada.estado === 'listo')

const inputArchivo = ref<HTMLInputElement | null>(null)
const ladoPendiente = ref<Lado>('original')
const arrastrando = ref<Lado | null>(null)

function abrirSelector(lado: Lado) {
  if (cargas[lado].estado === 'leyendo') return
  ladoPendiente.value = lado
  inputArchivo.value?.click()
}

function onArchivoElegido(e: Event) {
  const input = e.target as HTMLInputElement
  const archivo = input.files?.[0]
  input.value = ''
  if (archivo) void cargarArchivo(ladoPendiente.value, archivo)
}

function onDrop(lado: Lado, e: DragEvent) {
  arrastrando.value = null
  const archivo = e.dataTransfer?.files?.[0]
  if (archivo) void cargarArchivo(lado, archivo)
}

// Paso determinístico: cláusulas, emparejamiento y diff por palabras (sin IA)
const resultado = ref<ResultadoComparacion | null>(null)

// Explicación con IA (solo de las cláusulas con cambios)
const explicaciones = ref<Map<string, ExplicacionCambio>>(new Map())
const partes = ref({ a: '', b: '' })
const estadoIA = ref<'inactivo' | 'cargando' | 'listo' | 'error'>('inactivo')
const errorIA = ref('')

const totalCambios = computed(() =>
  resultado.value ? resultado.value.totales.modificada + resultado.value.totales.agregada + resultado.value.totales.eliminada : 0
)

function comparar() {
  const original = cargas.original.documento
  const modificada = cargas.modificada.documento
  if (!original || !modificada) return
  resultado.value = compararDocumentos(original.parrafos, modificada.parrafos)
  filtroTipo.value = 'todos'
  filtroNivel.value = 'todos'
  if (totalCambios.value > 0) void pedirExplicaciones()
}

async function pedirExplicaciones() {
  if (!resultado.value || estadoIA.value === 'cargando') return
  estadoIA.value = 'cargando'
  errorIA.value = ''
  try {
    const r = await explicarCambios(resultado.value.cambios)
    explicaciones.value = new Map(r.explicaciones.map(e => [e.id, e]))
    partes.value = r.partes
    estadoIA.value = 'listo'
  } catch (err) {
    estadoIA.value = 'error'
    errorIA.value = err instanceof Error ? err.message : 'Inténtalo de nuevo.'
  }
}

function nuevaComparacion() {
  abiertos.value = new Set()
  resultado.value = null
  explicaciones.value = new Map()
  estadoIA.value = 'inactivo'
  errorIA.value = ''
}

const explicacionDe = (id: string) => explicaciones.value.get(id)

// ----- Resumen y filtros -----
const NIVELES = [
  { valor: 'alto', etiqueta: 'Alto' },
  { valor: 'medio', etiqueta: 'Medio' },
  { valor: 'bajo', etiqueta: 'Bajo' }
] as const

const ETIQUETA_TIPO: Record<TipoCambio, string> = {
  modificada: 'Modificada',
  agregada: 'Agregada',
  eliminada: 'Eliminada',
  sin_cambios: 'Sin cambios'
}

const FILTROS_TIPO = [
  { valor: 'todos', etiqueta: 'Todos los cambios' },
  { valor: 'modificada', etiqueta: 'Modificadas' },
  { valor: 'agregada', etiqueta: 'Agregadas' },
  { valor: 'eliminada', etiqueta: 'Eliminadas' }
] as const

const FILTROS_NIVEL = [
  { valor: 'todos', etiqueta: 'Cualquier riesgo' },
  { valor: 'alto', etiqueta: 'Alto' },
  { valor: 'medio', etiqueta: 'Medio' },
  { valor: 'bajo', etiqueta: 'Bajo' }
] as const

const filtroTipo = ref<typeof FILTROS_TIPO[number]['valor']>('todos')
const filtroNivel = ref<typeof FILTROS_NIVEL[number]['valor']>('todos')

const conteoRiesgo = computed(() => {
  const conteo = { alto: 0, medio: 0, bajo: 0 }
  for (const e of explicaciones.value.values()) conteo[e.nivel]++
  return conteo
})

const cambiosVisibles = computed(() =>
  (resultado.value?.cambios ?? []).filter(c =>
    c.tipo !== 'sin_cambios' &&
    (filtroTipo.value === 'todos' || c.tipo === filtroTipo.value) &&
    (filtroNivel.value === 'todos' || explicacionDe(c.id)?.nivel === filtroNivel.value)
  )
)

// ----- Vista compacta -----
// Fragmento del cambio: lo eliminado y lo agregado juntos, con unas pocas
// palabras de contexto alrededor; el texto igual largo se acorta con "…".
// Las cláusulas agregadas o eliminadas se resumen a su comienzo.
const PALABRAS_CONTEXTO = 10
const PALABRAS_MAX_NUEVA = 45

type Pieza = { texto: string; tipo: 'igual' | 'agregado' | 'eliminado' | 'corte' }

function recortarPalabras(texto: string, max: number, desde: 'inicio' | 'fin'): string {
  const palabras = texto.split(/(\s+)/)
  const soloPalabras = palabras.filter(p => p.trim()).length
  if (soloPalabras <= max) return texto
  let cuenta = 0
  if (desde === 'inicio') {
    const salida: string[] = []
    for (const p of palabras) {
      if (p.trim()) cuenta++
      if (cuenta > max) break
      salida.push(p)
    }
    return salida.join('')
  }
  const salida: string[] = []
  for (let i = palabras.length - 1; i >= 0; i--) {
    const p = palabras[i]!
    if (p.trim()) cuenta++
    if (cuenta > max) break
    salida.unshift(p)
  }
  return salida.join('')
}

function fragmento(c: CambioClausula): Pieza[] {
  if (c.tipo === 'agregada' || c.tipo === 'eliminada') {
    const tipo = c.tipo === 'agregada' ? 'agregado' : 'eliminado'
    const completo = (c.tipo === 'agregada' ? c.textoModificado : c.textoOriginal).replace(/\s+/g, ' ').trim()
    const corto = recortarPalabras(completo, PALABRAS_MAX_NUEVA, 'inicio')
    return corto.length < completo.length ? [{ texto: corto, tipo }, { texto: ' …', tipo: 'corte' }] : [{ texto: completo, tipo }]
  }
  const piezas: Pieza[] = []
  const tramos = c.tramos.map(t => ({ ...t, texto: t.texto.replace(/\s+/g, ' ') }))
  tramos.forEach((t, i) => {
    if (t.tipo !== 'igual') {
      piezas.push({ texto: t.texto, tipo: t.tipo })
      return
    }
    const primero = i === 0
    const ultimo = i === tramos.length - 1
    const palabras = t.texto.trim().split(/\s+/).filter(Boolean).length
    if (primero && !ultimo) {
      const fin = recortarPalabras(t.texto, PALABRAS_CONTEXTO, 'fin')
      const recortado = fin.length < t.texto.length
      if (recortado) piezas.push({ texto: '… ', tipo: 'corte' })
      piezas.push({ texto: recortado ? fin.trimStart() : fin, tipo: 'igual' })
    } else if (ultimo && !primero) {
      const inicioTexto = recortarPalabras(t.texto, PALABRAS_CONTEXTO, 'inicio')
      const recortado = inicioTexto.length < t.texto.length
      piezas.push({ texto: recortado ? inicioTexto.trimEnd() : inicioTexto, tipo: 'igual' })
      if (recortado) piezas.push({ texto: ' …', tipo: 'corte' })
    } else if (palabras > PALABRAS_CONTEXTO * 2) {
      piezas.push({ texto: recortarPalabras(t.texto, PALABRAS_CONTEXTO, 'inicio'), tipo: 'igual' })
      piezas.push({ texto: ' … ', tipo: 'corte' })
      piezas.push({ texto: recortarPalabras(t.texto, PALABRAS_CONTEXTO, 'fin'), tipo: 'igual' })
    } else {
      piezas.push({ texto: t.texto, tipo: 'igual' })
    }
  })
  return piezas
}

// Cláusulas desplegadas (texto completo)
const abiertos = ref<Set<string>>(new Set())
function alternar(id: string) {
  const nuevo = new Set(abiertos.value)
  if (nuevo.has(id)) nuevo.delete(id)
  else nuevo.add(id)
  abiertos.value = nuevo
}

function textoFavorece(f: ExplicacionCambio['favorece']): string {
  if (f === 'parte_a') return partes.value.a || 'Parte A'
  if (f === 'parte_b') return partes.value.b || 'Parte B'
  if (f === 'neutral') return 'Neutral, no favorece a ninguna parte'
  return 'No se puede determinar con el texto'
}

// ----- Exportación a Word -----
const exportando = ref(false)
const errorExportar = ref('')

async function exportar() {
  if (!resultado.value || exportando.value) return
  exportando.value = true
  errorExportar.value = ''
  try {
    const nombres = {
      original: cargas.original.documento?.nombre ?? 'Versión original',
      modificada: cargas.modificada.documento?.nombre ?? 'Versión modificada'
    }
    const blob = await comparacionAWord(resultado.value.cambios, explicaciones.value, partes.value, nombres)
    const url = URL.createObjectURL(blob)
    const enlace = document.createElement('a')
    enlace.href = url
    enlace.download = nombreArchivoComparacion(nombres.original, nombres.modificada)
    document.body.appendChild(enlace)
    enlace.click()
    enlace.remove()
    URL.revokeObjectURL(url)
  } catch (err) {
    console.error('Error al exportar la comparación:', err)
    errorExportar.value = 'No se pudo exportar la comparación. Intenta de nuevo.'
  } finally {
    exportando.value = false
  }
}

async function cargarArchivo(lado: Lado, archivo: File) {
  resultado.value = null
  const carga = cargas[lado]
  carga.estado = 'leyendo'
  carga.mensaje = ''
  carga.documento = null
  try {
    const error = await validarArchivoWord(archivo)
    if (error) throw new ErrorArchivoWord(error)
    carga.documento = await leerDocumentoComparable(archivo)
    carga.estado = 'listo'
  } catch (err) {
    carga.estado = 'error'
    carga.mensaje = err instanceof ErrorArchivoWord ? err.message : 'No se pudo leer el archivo. Inténtalo de nuevo.'
  }
}
</script>

<style scoped>
/* Colores: las mismas variables que el resto de Análisis (sin naranja ni
   marrón). El selector repetido le gana a la regla plana global de la app
   (4px y sin sombras) donde este modo usa sus propias esquinas. */
.cv {
  width: 100%;
  max-width: 920px;
  margin: 0 auto;
  padding: 4px 0 40px;
}

.cv-cargas {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
}

.cv-zona {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: 250px;
  padding: 44px 24px 28px;
  border: 1.5px dashed var(--lexit-marfil);
  background: #FFFFFF;
  color: var(--lexit-verde);
  text-align: center;
  cursor: pointer;
  transition: border-color 0.25s ease, background-color 0.25s ease;
}

.page-container.page-container.page-container.page-container .cv-zona {
  border-radius: 20px !important;
}

.cv-zona:hover,
.cv-zona--arrastrando {
  border-color: rgba(var(--lexit-verde-rgb), 0.5);
  background: var(--lexit-blanco-calido);
}

.cv-zona:focus-visible {
  outline: 2px solid var(--lexit-verde);
  outline-offset: 3px;
}

.cv-zona--lista {
  border-style: solid;
  border-color: rgba(var(--lexit-verde-rgb), 0.22);
  background: var(--lexit-blanco-calido);
}

.cv-zona--error {
  border-color: rgba(176, 58, 46, 0.45);
}

.cv-zona-etiqueta {
  position: absolute;
  top: 16px;
  left: 20px;
  font-size: 0.8rem;
  font-weight: 600;
  color: rgba(var(--lexit-verde-rgb), 0.7);
}

.cv-zona-icono {
  color: rgba(var(--lexit-verde-rgb), 0.75);
}

.cv-zona-texto {
  max-width: 30ch;
  margin: 0;
  font-size: 0.92rem;
  line-height: 1.45;
  color: rgba(var(--lexit-verde-rgb), 0.72);
}

.cv-zona-archivo {
  max-width: 100%;
  margin: 0;
  overflow: hidden;
  font-weight: 600;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.cv-zona-accion {
  display: inline-flex;
  align-items: center;
  min-height: 44px;
  margin-top: 6px;
  padding: 0 20px;
  background: var(--lexit-verde);
  color: #FFFFFF;
  font-size: 0.9rem;
  font-weight: 600;
  transition: opacity 0.2s ease;
}

.page-container.page-container.page-container.page-container .cv-zona-accion {
  border-radius: 10px !important;
}

.cv-zona--lista .cv-zona-accion {
  background: transparent;
  color: var(--lexit-verde);
  box-shadow: inset 0 0 0 1px rgba(var(--lexit-verde-rgb), 0.25);
}

.cv-zona:hover .cv-zona-accion {
  opacity: 0.9;
}

.cv-zona-nota {
  margin: 4px 0 0;
  font-size: 0.78rem;
  color: rgba(var(--lexit-verde-rgb), 0.5);
}

.cv-zona-error {
  margin: 6px 0 0;
  font-size: 0.85rem;
  line-height: 1.4;
  color: #9A3A2E;
}

.cv-listo {
  margin: 18px 0 0;
  text-align: center;
  font-size: 0.9rem;
  color: rgba(var(--lexit-verde-rgb), 0.7);
}

.cv-input-oculto {
  display: none;
}

@media (max-width: 700px) {
  .cv-cargas {
    grid-template-columns: minmax(0, 1fr);
  }

  .cv-zona {
    min-height: 200px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .cv-zona,
  .cv-zona-accion {
    transition: none;
  }
}

.cv-acciones {
  display: flex;
  justify-content: center;
  margin-top: 22px;
}

.cv-comparar {
  min-height: 44px;
  padding: 0 28px;
  border: none;
  background: var(--lexit-verde);
  color: #FFFFFF;
  font: inherit;
  font-weight: 600;
  cursor: pointer;
  transition: opacity 0.2s ease;
}

.page-container.page-container.page-container.page-container .cv-comparar {
  border-radius: 10px !important;
}

.cv-comparar:hover { opacity: 0.9; }

.cv-comparar:focus-visible {
  outline: 2px solid var(--lexit-verde);
  outline-offset: 3px;
}

/* ======================== RESULTADO ======================== */
.cv-resultado {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.cv-cabecera {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.cv-cabecera-archivos {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  min-width: 0;
  font-size: 0.88rem;
  font-weight: 600;
  color: rgba(var(--lexit-verde-rgb), 0.8);
}

.cv-cabecera-acciones {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.cv-boton-sec {
  min-height: 44px;
  padding: 0 18px;
  border: 1px solid rgba(var(--lexit-verde-rgb), 0.18);
  background: #FFFFFF;
  color: var(--lexit-verde);
  font: inherit;
  font-size: 0.88rem;
  font-weight: 600;
  cursor: pointer;
  transition: background-color 0.2s ease, border-color 0.2s ease;
}

.page-container.page-container.page-container.page-container .cv-boton-sec {
  border-radius: 10px !important;
}

.cv-boton-sec:hover {
  background: var(--lexit-blanco-calido);
  border-color: rgba(var(--lexit-verde-rgb), 0.3);
}

.cv-boton-sec:focus-visible,
.cv-chip:focus-visible {
  outline: 2px solid var(--lexit-verde);
  outline-offset: 2px;
}

/* Resumen */
.cv-resumen {
  display: grid;
  grid-template-columns: minmax(0, 4fr) minmax(0, 3fr);
  gap: 14px;
}

.cv-resumen-grupo {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 16px 18px;
  background: #FFFFFF;
  border: 1px solid rgba(var(--lexit-verde-rgb), 0.08);
}

.page-container.page-container.page-container.page-container .cv-resumen-grupo {
  border-radius: 14px !important;
  box-shadow: 0 1px 2px rgba(var(--lexit-verde-rgb), 0.04), 0 6px 18px -10px rgba(var(--lexit-verde-rgb), 0.12) !important;
}

.cv-resumen-titulo {
  font-size: 0.8rem;
  font-weight: 600;
  color: rgba(var(--lexit-verde-rgb), 0.6);
}

.cv-cifras {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 22px;
}

.cv-cifra {
  display: flex;
  flex-direction: column;
}

.cv-cifra-num {
  font-size: 1.6rem;
  font-weight: 600;
  line-height: 1.1;
  color: var(--lexit-verde);
  font-variant-numeric: tabular-nums;
}

.cv-cifra-label {
  font-size: 0.78rem;
  color: rgba(var(--lexit-verde-rgb), 0.6);
}

.cv-cifra--suave .cv-cifra-num { color: rgba(var(--lexit-verde-rgb), 0.45); }
.cv-cifra--alto .cv-cifra-num { color: #8E2F25; }
.cv-cifra--medio .cv-cifra-num { color: #7A5A12; }
.cv-cifra--bajo .cv-cifra-num { color: #2F6B3A; }

.cv-ia-cargando {
  display: flex;
  align-items: center;
  gap: 8px;
  min-height: 44px;
  font-size: 0.88rem;
  color: rgba(var(--lexit-verde-rgb), 0.7);
}

.cv-aviso {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 12px 16px;
  background: #F6E9E6;
  color: #7E2A21;
  font-size: 0.88rem;
}

.page-container.page-container.page-container.page-container .cv-aviso {
  border-radius: 10px !important;
}

.cv-vacio {
  margin: 8px 0;
  text-align: center;
  color: rgba(var(--lexit-verde-rgb), 0.65);
}

/* Filtros */
.cv-filtros {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: 10px 18px;
}

.cv-filtro {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.cv-chip {
  min-height: 36px;
  padding: 0 14px;
  border: 1px solid rgba(var(--lexit-verde-rgb), 0.12);
  background: #FFFFFF;
  color: rgba(var(--lexit-verde-rgb), 0.8);
  font: inherit;
  font-size: 0.84rem;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.2s ease, color 0.2s ease, border-color 0.2s ease;
}

.page-container.page-container.page-container.page-container .cv-chip {
  border-radius: 10px !important;
}

.cv-chip:hover:not(:disabled) {
  border-color: rgba(var(--lexit-verde-rgb), 0.3);
}

.cv-chip--activo,
.cv-chip--activo:hover:not(:disabled) {
  background: var(--lexit-verde);
  border-color: var(--lexit-verde);
  color: #FFFFFF;
}

.cv-chip:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

/* Cada cambio */
.cv-cambio {
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 20px 22px;
  background: #FFFFFF;
  border: 1px solid rgba(var(--lexit-verde-rgb), 0.08);
}

.page-container.page-container.page-container.page-container .cv-cambio {
  border-radius: 20px !important;
  box-shadow: 0 1px 2px rgba(var(--lexit-verde-rgb), 0.04), 0 8px 24px -14px rgba(var(--lexit-verde-rgb), 0.14) !important;
}

.cv-cambio-cabecera {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 8px 12px;
}

.cv-cambio-titulo {
  margin: 0;
  font-size: 1.08rem;
  font-weight: 600;
  color: var(--lexit-verde);
}

.cv-cambio-insignias {
  display: flex;
  gap: 6px;
}

.cv-insignia {
  padding: 4px 10px;
  font-size: 0.76rem;
  font-weight: 600;
  text-transform: none;
}

.page-container.page-container.page-container.page-container .cv-insignia {
  border-radius: 6px !important;
}

.cv-insignia--modificada { background: rgba(var(--lexit-verde-rgb), 0.07); color: var(--lexit-verde); }
.cv-insignia--agregada { background: #E2EFE4; color: #2F6B3A; }
.cv-insignia--eliminada { background: #F6E3E0; color: #8E2F25; }
.cv-insignia--alto { background: #F6E1DE; color: #8E2F25; }
.cv-insignia--medio { background: #F6EBCF; color: #7A5A12; }
.cv-insignia--bajo { background: #DDEBDF; color: #2F6B3A; }

.cv-textos {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.cv-textos--uno {
  grid-template-columns: minmax(0, 1fr);
}

.cv-texto {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 14px 16px;
  background: var(--lexit-blanco-calido);
}

.page-container.page-container.page-container.page-container .cv-texto {
  border-radius: 14px !important;
}

.cv-texto-etiqueta {
  font-size: 0.76rem;
  font-weight: 600;
  color: rgba(var(--lexit-verde-rgb), 0.55);
}

.cv-texto-cuerpo {
  margin: 0;
  font-size: 0.9rem;
  line-height: 1.6;
  color: rgba(var(--lexit-verde-rgb), 0.88);
  white-space: pre-line;
  overflow-wrap: anywhere;
}

.cv-eliminado {
  background: rgba(176, 58, 46, 0.12);
  color: #8E2F25;
  text-decoration: line-through;
  text-decoration-thickness: 1px;
}

.cv-agregado {
  background: rgba(47, 107, 58, 0.14);
  color: #24552E;
  text-decoration: underline;
  text-decoration-thickness: 1px;
  text-underline-offset: 3px;
}

.cv-ia {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding-top: 12px;
  border-top: 1px solid rgba(var(--lexit-verde-rgb), 0.08);
}

.cv-ia p {
  margin: 0;
  font-size: 0.9rem;
  line-height: 1.55;
  color: rgba(var(--lexit-verde-rgb), 0.85);
}

.cv-ia strong {
  font-weight: 600;
  color: var(--lexit-verde);
}

.cv-ia-pendiente {
  font-style: italic;
  color: rgba(var(--lexit-verde-rgb), 0.55) !important;
}

.cv-nota {
  margin: 4px 0 0;
  text-align: center;
  font-size: 0.82rem;
  font-style: italic;
  color: rgba(var(--lexit-verde-rgb), 0.6);
}

@media (max-width: 760px) {
  .cv-resumen,
  .cv-textos {
    grid-template-columns: minmax(0, 1fr);
  }

  .cv-cambio {
    padding: 16px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .cv-boton-sec,
  .cv-chip { transition: none; }
}

.cv-exportar {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 0 18px;
}

.cv-comparar:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* ==========================================================================
   VISTA COMPACTA Y CORPORATIVA DE LOS CAMBIOS
   Una sola lista con separadores finos (no una tarjeta grande por cambio),
   el fragmento cambiado con contexto y la explicación lado a lado.
   ========================================================================== */
.cv-lista {
  display: flex;
  flex-direction: column;
  background: #FFFFFF;
  border: 1px solid rgba(var(--lexit-verde-rgb), 0.1);
}

.page-container.page-container.page-container.page-container .cv-lista {
  border-radius: 14px !important;
  overflow: hidden;
}

.cv-fila {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 16px 20px 12px;
  border-top: 1px solid rgba(var(--lexit-verde-rgb), 0.08);
  transition: background-color 0.2s ease;
}

.cv-fila:first-child {
  border-top: none;
}

.cv-fila--abierta {
  background: rgba(var(--lexit-verde-rgb), 0.015);
}

.cv-fila-cabecera {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px 10px;
}

.cv-fila-numero {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 24px;
  height: 24px;
  padding: 0 6px;
  background: rgba(var(--lexit-verde-rgb), 0.07);
  color: rgba(var(--lexit-verde-rgb), 0.75);
  font-size: 0.75rem;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}

.page-container.page-container.page-container.page-container .cv-fila-numero {
  border-radius: 6px !important;
}

.cv-fila-titulo {
  flex: 1 1 auto;
  min-width: 0;
  margin: 0;
  font-size: 1rem;
  font-weight: 600;
  color: var(--lexit-verde);
}

.cv-fila-cuerpo {
  display: grid;
  grid-template-columns: minmax(0, 1.15fr) minmax(0, 1fr);
  gap: 16px;
}

.cv-fragmento {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 12px 14px;
  background: var(--lexit-blanco-calido);
  border-left: 2px solid rgba(var(--lexit-verde-rgb), 0.18);
}

.page-container.page-container.page-container.page-container .cv-fragmento {
  border-radius: 0 10px 10px 0 !important;
}

.cv-fragmento .cv-texto-cuerpo {
  white-space: normal;
}

.cv-corte {
  color: rgba(var(--lexit-verde-rgb), 0.4);
}

/* Explicación de la IA, a la derecha del fragmento */
.cv-fila .cv-ia {
  gap: 6px;
  padding-top: 2px;
  border-top: none;
}

.cv-ia-resumen {
  font-weight: 500;
  color: var(--lexit-verde) !important;
}

.cv-ia-meta {
  font-size: 0.8rem !important;
  color: rgba(var(--lexit-verde-rgb), 0.55) !important;
}

.cv-fila-ver {
  display: inline-flex;
  align-items: center;
  align-self: flex-start;
  gap: 4px;
  min-height: 36px;
  padding: 0 4px;
  border: none;
  background: none;
  color: rgba(var(--lexit-verde-rgb), 0.7);
  font: inherit;
  font-size: 0.82rem;
  font-weight: 600;
  cursor: pointer;
}

.cv-fila-ver:hover {
  color: var(--lexit-verde);
  text-decoration: underline;
  text-underline-offset: 3px;
}

.cv-fila-ver:focus-visible {
  outline: 2px solid var(--lexit-verde);
  outline-offset: 2px;
}

.cv-fila .cv-textos {
  margin-bottom: 6px;
}

/* Resumen más sobrio: sin sombras, borde fino */
.page-container.page-container.page-container.page-container .cv-resumen-grupo {
  box-shadow: none !important;
  border: 1px solid rgba(var(--lexit-verde-rgb), 0.1);
}

.cv-cifra-num {
  font-size: 1.45rem;
}

@media (max-width: 760px) {
  .cv-fila-cuerpo {
    grid-template-columns: minmax(0, 1fr);
  }

  .cv-fila {
    padding: 14px 14px 10px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .cv-fila { transition: none; }
}
</style>
