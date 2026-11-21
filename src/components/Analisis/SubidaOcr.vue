<template>
  <div class="so">
    <div class="so-barra">
      <q-btn flat dense no-caps color="accent" icon="arrow_back" label="Volver" :disable="ocupado" @click="emit('cancelar')" />
      <span v-if="cupo" class="so-cupo" :class="{ 'so-cupo--cero': !cupo.restantes }">
        Te {{ cupo.restantes === 1 ? 'queda' : 'quedan' }} {{ cupo.restantes }} de {{ cupo.limite }} lecturas este mes
      </span>
    </div>

    <h2 class="so-titulo">{{ etapa === 'revision' ? 'Revisa el texto antes de analizar' : 'Lee una foto o un PDF escaneado' }}</h2>

    <p v-if="error" class="so-error" role="alert">{{ error }}</p>

    <!-- 1. Preparar: miniaturas para ordenar, girar o quitar -->
    <template v-if="etapa === 'preparar'">
      <p class="so-ayuda">
        Sube hasta {{ maxPaginas }} fotos (JPG, PNG o HEIC) o un PDF escaneado. Usa buena luz, encuadra la página completa y evita las sombras.
        Las imágenes no se guardan.
      </p>

      <div class="so-zona" :class="{ 'so-zona--compacta': paginas.length }" role="button" tabindex="0" @click="elegir" @keydown.enter.prevent="elegir" @dragover.prevent @drop.prevent="soltar">
        <q-spinner-dots v-if="preparando" color="primary" size="26px" />
        <q-icon v-else name="add_a_photo" :size="paginas.length ? '20px' : '30px'" />
        <span>{{ preparando ? 'Preparando las imágenes…' : paginas.length ? 'Agregar más páginas' : 'Elegir fotos o PDF, o arrastrarlos aquí' }}</span>
      </div>
      <input ref="archivoInput" type="file" multiple :accept="ACEPTA" hidden @change="elegidos" />

      <div v-if="paginas.length" class="so-pie">
        <span class="so-pie-nota">Si ninguna página se puede leer, no se descuenta la lectura.</span>
        <q-btn
          unelevated no-caps color="accent" icon="document_scanner"
          :label="`Leer ${paginas.length} ${paginas.length === 1 ? 'página' : 'páginas'}`"
          :disable="cupo?.restantes === 0" :loading="ocupado" @click="leerTodo"
        />
      </div>

      <ol v-if="paginas.length" class="so-miniaturas">
        <li v-for="(p, i) in paginas" :key="p.id" class="so-mini">
          <img :src="p.url" :alt="`Página ${i + 1}`" />
          <span class="so-mini-num">{{ i + 1 }}</span>
          <div class="so-mini-acciones">
            <q-btn flat dense round size="sm" icon="arrow_back" aria-label="Mover antes" :disable="i === 0" @click="mover(i, -1)" />
            <q-btn flat dense round size="sm" icon="rotate_right" aria-label="Girar" @click="girar(p)" />
            <q-btn flat dense round size="sm" icon="delete_outline" aria-label="Quitar" @click="quitar(p.id)" />
            <q-btn flat dense round size="sm" icon="arrow_forward" aria-label="Mover después" :disable="i === paginas.length - 1" @click="mover(i, 1)" />
          </div>
        </li>
      </ol>

    </template>

    <!-- 2. Revisar: nada se analiza hasta confirmar -->
    <template v-else>
      <p class="so-ayuda">
        Compara el texto con cada imagen y corrige lo que haga falta. Revisa sobre todo lo resaltado:
        <span class="so-ley so-ley--dato">montos, fechas y documentos</span>
        <span class="so-ley so-ley--dudoso">lectura dudosa</span>
        <span class="so-ley so-ley--ilegible">[ILEGIBLE]</span>
      </p>

      <RevisionOcr
        :paginas="paginas"
        :ocupado="ocupado"
        @editar="editar"
        @reemplazar="reemplazar"
        @reintentar="reintentar"
        @quitar="quitar"
      />

      <div class="so-final">
        <ul v-if="pendientes.length" class="so-pendientes">
          <li v-for="t in pendientes" :key="t">{{ t }}</li>
        </ul>
        <q-checkbox v-model="revisado" dense :dark="false" color="primary" label="Comparé el texto con el documento, sobre todo montos, fechas y nombres" class="so-check" :disable="pendientes.length > 0" />
        <p class="so-pie-nota">
          <template v-if="!pendientes.length && !revisado">Marca la casilla para continuar. </template>
          El Word que se genera no incluye logos, sellos ni firmas. Las imágenes no se guardan.
        </p>
        <div class="so-final-botones">
          <q-btn outline no-caps color="accent" icon="download" label="Descargar Word" :disable="pendientes.length > 0 || ocupado" @click="descargar" />
          <q-btn unelevated no-caps color="accent" icon="check" label="Confirmar y continuar" :disable="!puedeConfirmar" :loading="confirmando" @click="confirmar" />
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
// =========================
// OCR: subir fotos o un PDF escaneado, ordenarlos, leerlos con Gemini y
// revisar el texto. Al confirmar entrega un .docx, que sigue el flujo Word
// de siempre. Una página que no se lee bien hay que volver a subirla: no
// se puede confirmar con páginas malas ni con [ILEGIBLE] sin corregir.
// =========================
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { esImagenOcr, esPdfOcr, leerPdf, prepararImagen, rotarImagen } from '../../utils/imagenesOcr'
import { cuantosIlegibles } from '../../utils/resaltadoOcr'
import { textoADocx } from '../../utils/textoADocx'
import { extraerPaginas, leerCupoOcr, type CupoOcr, type PaginaOcr } from '../../services/ocrService'
import RevisionOcr from './RevisionOcr.vue'

const props = defineProps<{ archivosIniciales: File[] }>()
const emit = defineEmits<{ confirmar: [archivo: File]; cancelar: [] }>()

const ACEPTA = 'image/jpeg,image/png,image/heic,image/heif,.heic,.heif,application/pdf,.pdf'

const etapa = ref<'preparar' | 'revision'>('preparar')
const paginas = ref<PaginaOcr[]>([])
const cupo = ref<CupoOcr | null>(null)
const error = ref('')
const preparando = ref(false)
const ocupado = ref(false)
const confirmando = ref(false)
const revisado = ref(false)
const archivoInput = ref<HTMLInputElement | null>(null)

let extraccionId: string | null = null
let nombreBase = 'contrato'
let siguienteId = 1

const maxPaginas = computed(() => cupo.value?.maxPaginas ?? 10)

function crearPagina(imagen: Blob | null, texto = ''): PaginaOcr {
  return {
    id: siguienteId++,
    imagen,
    url: imagen ? URL.createObjectURL(imagen) : '',
    estado: imagen ? 'pendiente' : 'ok',
    texto,
    dudosos: [],
    calidad: 'buena',
    motivo: ''
  }
}

function elegir() {
  if (!preparando.value) archivoInput.value?.click()
}

function elegidos(evento: Event) {
  const input = evento.target as HTMLInputElement
  const archivos = [...(input.files ?? [])]
  input.value = ''
  void agregar(archivos)
}

function soltar(evento: DragEvent) {
  void agregar([...(evento.dataTransfer?.files ?? [])])
}

async function agregar(archivos: File[]) {
  if (!archivos.length) return
  error.value = ''
  preparando.value = true
  if (!paginas.value.length) nombreBase = archivos[0]?.name ?? nombreBase
  try {
    for (const archivo of archivos) {
      if (esPdfOcr(archivo)) {
        const lectura = await leerPdf(archivo, maxPaginas.value)
        if (lectura.tipo === 'texto') {
          // PDF con texto: no gasta lectura ni usa Gemini, pero también se revisa
          if (paginas.value.length) throw new Error(`"${archivo.name}" ya tiene texto: súbelo solo, sin fotos.`)
          paginas.value = [crearPagina(null, lectura.texto)]
          etapa.value = 'revision'
          return
        }
        comprobarEspacio(lectura.paginas.length)
        paginas.value.push(...lectura.paginas.map(p => crearPagina(p)))
      } else if (esImagenOcr(archivo)) {
        comprobarEspacio(1)
        paginas.value.push(crearPagina(await prepararImagen(archivo)))
      } else {
        throw new Error(`"${archivo.name}" no es una foto (JPG, PNG, HEIC) ni un PDF.`)
      }
    }
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'No se pudo abrir el archivo.'
  } finally {
    preparando.value = false
  }
}

function comprobarEspacio(nuevas: number) {
  if (paginas.value.length + nuevas > maxPaginas.value) {
    throw new Error(`Se pueden leer hasta ${maxPaginas.value} páginas por vez.`)
  }
}

function mover(i: number, delta: number) {
  const lista = paginas.value
  const [pagina] = lista.splice(i, 1)
  if (pagina) lista.splice(i + delta, 0, pagina)
}

function cambiarImagen(pagina: PaginaOcr, imagen: Blob) {
  URL.revokeObjectURL(pagina.url)
  pagina.imagen = imagen
  pagina.url = URL.createObjectURL(imagen)
}

async function girar(pagina: PaginaOcr) {
  if (!pagina.imagen) return
  try {
    cambiarImagen(pagina, await rotarImagen(pagina.imagen))
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'No se pudo girar la imagen.'
  }
}

function quitar(id: number) {
  const pagina = paginas.value.find(p => p.id === id)
  if (pagina?.url) URL.revokeObjectURL(pagina.url)
  paginas.value = paginas.value.filter(p => p.id !== id)
  revisado.value = false
  if (!paginas.value.length) etapa.value = 'preparar'
}

function editar(id: number, texto: string) {
  const pagina = paginas.value.find(p => p.id === id)
  if (pagina) pagina.texto = texto
  revisado.value = false
}

// Manda a Gemini las páginas indicadas y deja cada resultado en su lugar
async function leer(ids: number[]): Promise<boolean> {
  const aLeer = paginas.value
    .map((p, indice) => ({ pagina: p, indice }))
    .filter(x => ids.includes(x.pagina.id) && x.pagina.imagen)
  if (!aLeer.length) return false

  error.value = ''
  ocupado.value = true
  revisado.value = false
  for (const { pagina } of aLeer) pagina.estado = 'leyendo'
  try {
    const resultado = await extraerPaginas(aLeer.map(x => ({ indice: x.indice, imagen: x.pagina.imagen as Blob })), extraccionId)
    extraccionId = resultado.extraccionId
    if (cupo.value) cupo.value = { ...cupo.value, restantes: resultado.restantes, limite: resultado.limite }
    for (const leida of resultado.paginas) {
      const destino = aLeer.find(x => x.indice === leida.indice)?.pagina
      if (destino) Object.assign(destino, { estado: leida.estado, texto: leida.texto, dudosos: leida.dudosos, calidad: leida.calidad, motivo: leida.motivo })
    }
    return true
  } catch (err) {
    for (const { pagina } of aLeer) pagina.estado = 'fallo'
    error.value = err instanceof Error ? err.message : 'No se pudo leer el documento.'
    return false
  } finally {
    ocupado.value = false
  }
}

async function leerTodo() {
  const ids = paginas.value.map(p => p.id)
  if (await leer(ids)) {
    etapa.value = 'revision'
    return
  }
  // Nada que revisar todavía: se queda en esta pantalla para corregir
  for (const p of paginas.value) p.estado = 'pendiente'
}

const reintentar = (id: number) => { void leer([id]) }

async function reemplazar(id: number, archivo: File) {
  const pagina = paginas.value.find(p => p.id === id)
  if (!pagina) return
  error.value = ''
  try {
    cambiarImagen(pagina, await prepararImagen(archivo))
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'No se pudo abrir la imagen.'
    return
  }
  await leer([id])
}

// Lo que impide confirmar: si no se puede leer, se pide subirla de nuevo
const pendientes = computed(() => {
  const avisos: string[] = []
  paginas.value.forEach((p, i) => {
    const n = i + 1
    if (p.estado === 'fallo') avisos.push(`Página ${n}: no se pudo leer. Reinténtalo o sube otra foto.`)
    else if (p.estado === 'leyendo') avisos.push(`Página ${n}: se está leyendo.`)
    else if (p.url && p.calidad === 'mala') avisos.push(`Página ${n}: no se lee bien. Sube otra foto más clara.`)
    else if (cuantosIlegibles(p.texto)) avisos.push(`Página ${n}: tiene partes [ILEGIBLE]. Corrígelas con el documento a la vista o sube otra foto.`)
  })
  if (!paginas.value.some(p => p.texto.trim())) avisos.push('No hay texto para analizar.')
  return avisos
})

const puedeConfirmar = computed(() => revisado.value && pendientes.value.length === 0 && !ocupado.value)

const textoFinal = () => paginas.value.map(p => p.texto.trim()).filter(Boolean).join('\n\n')

async function confirmar() {
  confirmando.value = true
  try {
    emit('confirmar', await textoADocx(textoFinal(), nombreBase))
  } catch {
    error.value = 'No se pudo preparar el documento. Inténtalo de nuevo.'
  } finally {
    confirmando.value = false
  }
}

async function descargar() {
  try {
    const archivo = await textoADocx(textoFinal(), nombreBase)
    const url = URL.createObjectURL(archivo)
    const enlace = document.createElement('a')
    enlace.href = url
    enlace.download = archivo.name
    enlace.click()
    URL.revokeObjectURL(url)
  } catch {
    error.value = 'No se pudo preparar el documento. Inténtalo de nuevo.'
  }
}

onMounted(async () => {
  // Primero el cupo: de ahí sale el máximo de páginas
  try {
    cupo.value = await leerCupoOcr()
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'No se pudo consultar tu cupo.'
  }
  await agregar(props.archivosIniciales)
})

onBeforeUnmount(() => {
  for (const p of paginas.value) if (p.url) URL.revokeObjectURL(p.url)
})
</script>

<style scoped>
.so { width: 100%; max-width: 1120px; margin: 0 auto; padding: 8px 0 32px; font-family: 'Urbanist', 'Figtree', sans-serif; color: var(--ink, #1a1f2b); }
.so-barra { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 6px 12px; margin-bottom: 8px; }
.so-cupo { font-size: 0.82rem; color: #5b6475; font-weight: 600; }
.so-cupo--cero { color: #912018; }
.so-titulo { margin: 0 0 8px; font-family: 'Baskervville', 'EB Garamond', serif; font-size: 1.5rem; font-weight: 600; line-height: 1.25; letter-spacing: normal; }
.so-ayuda { margin: 0 0 14px; font-size: 0.9rem; line-height: 1.5; color: #5b6475; }
.so-error { margin: 0 0 12px; padding: 10px 12px; border-radius: 8px; background: #FEF3F2; color: #912018; font-size: 0.88rem; }

.so-ley { display: inline-block; margin: 2px 2px 0 4px; padding: 0 6px; border-radius: 3px; color: #1a1f2b; font-size: 0.82rem; }
.so-ley--dato { background: rgba(29, 78, 137, 0.14); }
.so-ley--dudoso { background: #FEDF89; }
.so-ley--ilegible { background: #FECDCA; }

.so-zona { display: flex; flex-direction: column; align-items: center; gap: 8px; padding: 32px 16px; border: 1.5px dashed #B6BDC8; border-radius: 12px; background: #FAFBFC; color: #1D4E89; font-size: 0.95rem; font-weight: 600; text-align: center; cursor: pointer; }
.so-zona--compacta { flex-direction: row; justify-content: center; padding: 10px 16px; font-size: 0.88rem; }
.so-zona:hover { background: rgba(29, 78, 137, 0.05); }
.so-zona:focus-visible { outline: 2px solid #1D4E89; outline-offset: 2px; }

.so-miniaturas { display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 12px; margin: 12px 0 0; padding: 0; list-style: none; }
.so-mini { position: relative; border: 1px solid #E4E7EC; border-radius: 8px; background: #FFFFFF; overflow: hidden; }
.so-mini img { display: block; width: 100%; height: 170px; object-fit: contain; background: #F6F7F9; }
.so-mini-num { position: absolute; top: 6px; left: 6px; min-width: 22px; padding: 1px 6px; border-radius: 999px; background: #1D4E89; color: #FFFFFF; font-size: 0.74rem; font-weight: 700; text-align: center; }
.so-mini-acciones { display: flex; justify-content: space-between; padding: 2px; color: #1a1f2b; }

.so-pie { display: flex; flex-wrap: wrap; align-items: center; justify-content: flex-end; gap: 8px 16px; margin-top: 12px; }
.so-pie-nota { font-size: 0.8rem; color: #5b6475; }

.so-final { display: flex; flex-direction: column; gap: 8px; margin-top: 14px; padding: 14px; border: 1px solid #E4E7EC; border-radius: 10px; background: #FFFFFF; }
.so-pendientes { margin: 0; padding-left: 18px; font-size: 0.84rem; color: #912018; }
.so-check { font-size: 0.88rem; color: #1a1f2b; }
.so-final .so-pie-nota { margin: 0; }
.so-final-botones { display: flex; flex-wrap: wrap; justify-content: flex-end; gap: 8px; }
</style>
