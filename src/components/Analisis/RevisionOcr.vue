<template>
  <div class="ro">
    <div v-if="hayMalas" class="ro-aviso ro-aviso--mal" role="alert">
      <q-icon name="photo_camera" size="20px" />
      <span>
        <strong>Hay páginas que no se leen bien.</strong>
        Sube otra foto de cada una: con buena luz, la página completa, sin sombras y sin mover el celular.
      </span>
    </div>

    <article v-for="(p, i) in paginas" :key="p.id" class="ro-pagina" :class="{ 'ro-pagina--sola': !p.url }">
      <!-- Imagen original -->
      <div v-if="p.url" class="ro-imagen">
        <button type="button" class="ro-imagen-boton" :aria-label="`Ver más grande la página ${i + 1}`" @click="ampliada = p.url">
          <img :src="p.url" :alt="`Página ${i + 1} del contrato`" />
        </button>
      </div>

      <!-- Texto leído -->
      <div class="ro-cuerpo">
        <header class="ro-cabeza">
          <span class="ro-numero">{{ p.url ? `Página ${i + 1}` : 'Texto del PDF' }}</span>
          <span v-if="p.estado === 'ok' && p.url" class="ro-calidad" :class="`ro-calidad--${p.calidad}`">
            <q-icon :name="ICONO_CALIDAD[p.calidad]" size="15px" />
            Lectura {{ p.calidad }}
          </span>
          <span v-if="cuantosIlegibles(p.texto)" class="ro-calidad ro-calidad--mala">
            <q-icon name="visibility_off" size="15px" />
            {{ cuantosIlegibles(p.texto) }} sin leer
          </span>
          <span class="ro-acciones">
            <q-btn
              v-if="p.url"
              flat dense no-caps size="sm" color="accent" icon="photo_camera" label="Subir otra foto"
              :disable="ocupado" @click="elegirFoto(p.id)"
            />
            <q-btn
              v-if="paginas.length > 1"
              flat dense no-caps size="sm" color="grey-8" icon="delete_outline" label="Quitar"
              :disable="ocupado" @click="emit('quitar', p.id)"
            />
          </span>
        </header>

        <div v-if="p.estado === 'leyendo'" class="ro-leyendo">
          <q-spinner-dots color="primary" size="28px" />
          <span>Leyendo esta página…</span>
        </div>

        <div v-else-if="p.estado === 'fallo'" class="ro-aviso ro-aviso--mal">
          <q-icon name="error_outline" size="20px" />
          <span>No se pudo leer esta página.</span>
          <q-btn outline dense no-caps size="sm" color="accent" label="Reintentar" class="ro-reintentar" :disable="ocupado" @click="emit('reintentar', p.id)" />
        </div>

        <template v-else>
          <p v-if="p.calidad === 'mala' && p.url" class="ro-motivo">
            {{ p.motivo || 'La imagen no se lee bien.' }} Sube otra foto para continuar.
          </p>
          <p v-else-if="p.motivo" class="ro-nota">{{ p.motivo }}</p>

          <!-- El fondo pinta los resaltados y da la altura; encima va el campo
               editable. Todo es texto plano: nunca se interpreta como HTML. -->
          <div class="ro-editor">
            <div class="ro-fondo" aria-hidden="true"><span v-for="(t, n) in tramosResaltados(p.texto, p.dudosos)" :key="n" :class="`ro-tramo--${t.tipo}`">{{ t.texto }}</span>{{ '\n' }}</div>
            <textarea
              class="ro-texto"
              :value="p.texto"
              :aria-label="`Texto de la página ${i + 1}`"
              spellcheck="false"
              @input="emit('editar', p.id, ($event.target as HTMLTextAreaElement).value)"
            />
          </div>
        </template>
      </div>
    </article>

    <input ref="fotoInput" type="file" :accept="ACEPTA_FOTOS" hidden @change="fotoElegida" />

    <q-dialog v-model="hayAmpliada">
      <img v-if="ampliada" :src="ampliada" alt="Página ampliada" class="ro-ampliada" />
    </q-dialog>
  </div>
</template>

<script setup lang="ts">
// =========================
// OCR: revisión obligatoria. Cada imagen junto a su texto editable, con
// [ILEGIBLE], lo dudoso, los montos, las fechas y los documentos resaltados.
// =========================
import { computed, ref } from 'vue'
import { tramosResaltados, cuantosIlegibles } from '../../utils/resaltadoOcr'
import type { PaginaOcr } from '../../services/ocrService'

const props = defineProps<{ paginas: PaginaOcr[]; ocupado: boolean }>()
const emit = defineEmits<{
  editar: [id: number, texto: string]
  reemplazar: [id: number, archivo: File]
  reintentar: [id: number]
  quitar: [id: number]
}>()

const ACEPTA_FOTOS = 'image/jpeg,image/png,image/heic,image/heif,.heic,.heif'
const ICONO_CALIDAD = { buena: 'check_circle', regular: 'info', mala: 'warning' } as const

const hayMalas = computed(() => props.paginas.some(p => p.url && p.estado === 'ok' && p.calidad === 'mala'))

const ampliada = ref<string | null>(null)
const hayAmpliada = computed({
  get: () => ampliada.value !== null,
  set: v => { if (!v) ampliada.value = null }
})

const fotoInput = ref<HTMLInputElement | null>(null)
let idAReemplazar: number | null = null

function elegirFoto(id: number) {
  idAReemplazar = id
  fotoInput.value?.click()
}

function fotoElegida(evento: Event) {
  const input = evento.target as HTMLInputElement
  const archivo = input.files?.[0]
  input.value = ''
  if (archivo && idAReemplazar !== null) emit('reemplazar', idAReemplazar, archivo)
}
</script>

<style scoped>
.ro { display: flex; flex-direction: column; gap: 14px; }

.ro-aviso { display: flex; align-items: center; flex-wrap: wrap; gap: 8px; padding: 10px 12px; border-radius: 8px; font-size: 0.88rem; line-height: 1.4; }
.ro-aviso > span { flex: 1; min-width: 180px; }
.ro-aviso--mal { background: #FEF3F2; color: #912018; }
.ro-reintentar { flex-shrink: 0; }

.ro-pagina { display: grid; grid-template-columns: minmax(0, 2fr) minmax(0, 3fr); gap: 16px; padding: 14px; border: 1px solid #E4E7EC; border-radius: 10px; background: #FFFFFF; }
.ro-pagina--sola { grid-template-columns: minmax(0, 1fr); }

.ro-imagen { position: sticky; top: 76px; align-self: start; }
.ro-imagen-boton { display: block; width: 100%; padding: 0; border: 1px solid #E4E7EC; border-radius: 6px; background: #F6F7F9; cursor: zoom-in; overflow: hidden; }
.ro-imagen-boton:focus-visible { outline: 2px solid #1D4E89; outline-offset: 2px; }
.ro-imagen img { display: block; width: 100%; height: auto; }
.ro-ampliada { max-width: 95vw; max-height: 92vh; background: #FFFFFF; }

.ro-cuerpo { min-width: 0; }
.ro-cabeza { display: flex; flex-wrap: wrap; align-items: center; gap: 6px 10px; margin-bottom: 8px; }
.ro-numero { font-weight: 600; font-size: 0.92rem; }
.ro-calidad { display: inline-flex; align-items: center; gap: 4px; padding: 2px 8px; border-radius: 999px; font-size: 0.74rem; font-weight: 600; }
.ro-calidad--buena { background: #ECFDF3; color: #05603A; }
.ro-calidad--regular { background: #FFFAEB; color: #93370D; }
.ro-calidad--mala { background: #FEF3F2; color: #912018; }
.ro-acciones { display: flex; gap: 4px; margin-left: auto; }

.ro-leyendo { display: flex; align-items: center; gap: 10px; padding: 24px 0; font-size: 0.88rem; color: #5b6475; }
.ro-motivo { margin: 0 0 8px; font-size: 0.85rem; font-weight: 600; color: #912018; }
.ro-nota { margin: 0 0 8px; font-size: 0.82rem; color: #93370D; }

/* Campo editable sobre el fondo con resaltados: misma letra y medidas */
.ro-editor { display: grid; border: 1px solid #D5DAE1; border-radius: 8px; background: #FFFFFF; }
.ro-editor:focus-within { border-color: #1D4E89; box-shadow: 0 0 0 1px #1D4E89; }
.ro-fondo,
.ro-texto {
  grid-area: 1 / 1;
  width: 100%;
  margin: 0;
  padding: 10px 12px;
  border: 0;
  font-family: 'Urbanist', 'Figtree', sans-serif;
  font-size: 0.92rem;
  font-weight: 400;
  line-height: 1.6;
  letter-spacing: normal;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}
.ro-fondo { color: transparent; pointer-events: none; }
.ro-texto { min-height: 120px; background: transparent; color: #1a1f2b; resize: none; outline: none; overflow: hidden; }

.ro-tramo--ilegible { background: #FECDCA; border-radius: 3px; }
.ro-tramo--dudoso { background: #FEDF89; border-radius: 3px; }
.ro-tramo--dato { background: rgba(29, 78, 137, 0.14); border-radius: 3px; }

@media (max-width: 800px) {
  .ro-pagina { grid-template-columns: minmax(0, 1fr); }
  .ro-imagen { position: static; }
  .ro-imagen-boton { max-height: 320px; overflow: auto; }
}
</style>
