<template>
  <div class="er">
    <!-- Barra de herramientas tipo Word -->
    <div class="er-barra" role="toolbar" aria-label="Formato del documento">
      <button
        v-for="b in BOTONES_FORMATO"
        :key="b.icono"
        type="button"
        class="er-boton"
        :class="{ 'er-boton--activo': b.activo?.() }"
        :aria-label="b.etiqueta"
        :title="b.etiqueta"
        @click="b.accion()"
      >
        <q-icon :name="b.icono" size="19px" />
      </button>
    </div>

    <div class="er-hoja-zona">
      <div class="er-hoja">
        <editor-content v-if="editor" :editor="editor" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onBeforeUnmount, watch } from 'vue'
import { useEditor, EditorContent } from '@tiptap/vue-3'
import StarterKit from '@tiptap/starter-kit'
import TextAlign from '@tiptap/extension-text-align'

// =========================
// Editor de Redacción avanzada (tiptap). Además del HTML (v-model), avisa
// en qué párrafo está escribiendo el usuario —con el anterior y el
// siguiente como contexto— para que el asistente en vivo lo revise, y
// permite reemplazar el texto de un párrafo por la versión sugerida.
// =========================

export interface ParrafoEnEdicion {
  texto: string
  anterior: string
  siguiente: string
}

const props = defineProps<{ modelValue: string }>()
const emit = defineEmits<{
  (e: 'update:modelValue', valor: string): void
  (e: 'escribiendo', parrafo: ParrafoEnEdicion): void
}>()

const editor = useEditor({
  content: props.modelValue,
  extensions: [StarterKit, TextAlign.configure({ types: ['heading', 'paragraph'] })],
  editorProps: { attributes: { class: 'tiptap-editor er-contenido', spellcheck: 'true' } },
  onUpdate: ({ editor: ed }) => {
    emit('update:modelValue', ed.getHTML())
    const parrafo = parrafoActual()
    if (parrafo) emit('escribiendo', parrafo)
  }
})

// Párrafos del documento con su posición, y el que contiene el cursor
function bloquesDeTexto(): { texto: string; desde: number; hasta: number }[] {
  const ed = editor.value
  if (!ed) return []
  const bloques: { texto: string; desde: number; hasta: number }[] = []
  ed.state.doc.descendants((nodo, pos) => {
    if (nodo.isTextblock) {
      bloques.push({ texto: nodo.textContent, desde: pos, hasta: pos + nodo.nodeSize })
      return false
    }
    return true
  })
  return bloques
}

function parrafoActual(): ParrafoEnEdicion | null {
  const ed = editor.value
  if (!ed) return null
  const cursor = ed.state.selection.from
  const bloques = bloquesDeTexto()
  const i = bloques.findIndex(b => cursor > b.desde && cursor < b.hasta)
  if (i === -1) return null
  return {
    texto: bloques[i]!.texto,
    anterior: bloques[i - 1]?.texto ?? '',
    siguiente: bloques[i + 1]?.texto ?? ''
  }
}

/**
 * Reemplaza el texto del párrafo cuyo contenido es `original` por `nuevo`
 * (conserva la alineación del párrafo). Devuelve false si ya no existe
 * (el usuario lo cambió mientras tanto).
 */
function reemplazarParrafo(original: string, nuevo: string): boolean {
  const ed = editor.value
  if (!ed) return false
  const objetivo = original.replace(/\s+/g, ' ').trim()
  const bloque = bloquesDeTexto().find(b => b.texto.replace(/\s+/g, ' ').trim() === objetivo)
  if (!bloque) return false
  ed.chain()
    .focus()
    .insertContentAt({ from: bloque.desde + 1, to: bloque.hasta - 1 }, nuevo)
    .run()
  return true
}

defineExpose({ reemplazarParrafo })

watch(() => props.modelValue, (valor) => {
  if (editor.value && valor !== editor.value.getHTML()) {
    editor.value.commands.setContent(valor || '', { emitUpdate: false })
  }
})

onBeforeUnmount(() => editor.value?.destroy())

const BOTONES_FORMATO = [
  { icono: 'format_bold', etiqueta: 'Negrita', accion: () => editor.value?.chain().focus().toggleBold().run(), activo: () => editor.value?.isActive('bold') ?? false },
  { icono: 'format_italic', etiqueta: 'Cursiva', accion: () => editor.value?.chain().focus().toggleItalic().run(), activo: () => editor.value?.isActive('italic') ?? false },
  { icono: 'format_underlined', etiqueta: 'Subrayado', accion: () => editor.value?.chain().focus().toggleUnderline().run(), activo: () => editor.value?.isActive('underline') ?? false },
  { icono: 'format_align_left', etiqueta: 'Alinear a la izquierda', accion: () => editor.value?.chain().focus().setTextAlign('left').run(), activo: () => editor.value?.isActive({ textAlign: 'left' }) ?? false },
  { icono: 'format_align_center', etiqueta: 'Centrar', accion: () => editor.value?.chain().focus().setTextAlign('center').run(), activo: () => editor.value?.isActive({ textAlign: 'center' }) ?? false },
  { icono: 'format_align_right', etiqueta: 'Alinear a la derecha', accion: () => editor.value?.chain().focus().setTextAlign('right').run(), activo: () => editor.value?.isActive({ textAlign: 'right' }) ?? false },
  { icono: 'format_align_justify', etiqueta: 'Justificar', accion: () => editor.value?.chain().focus().setTextAlign('justify').run(), activo: () => editor.value?.isActive({ textAlign: 'justify' }) ?? false },
  { icono: 'format_list_bulleted', etiqueta: 'Viñetas', accion: () => editor.value?.chain().focus().toggleBulletList().run(), activo: () => editor.value?.isActive('bulletList') ?? false },
  { icono: 'format_list_numbered', etiqueta: 'Lista numerada', accion: () => editor.value?.chain().focus().toggleOrderedList().run(), activo: () => editor.value?.isActive('orderedList') ?? false },
  { icono: 'undo', etiqueta: 'Deshacer', accion: () => editor.value?.chain().focus().undo().run() },
  { icono: 'redo', etiqueta: 'Rehacer', accion: () => editor.value?.chain().focus().redo().run() }
]
</script>

<style scoped>
.er {
  display: flex;
  flex-direction: column;
  min-width: 0;
  background: #F4F5F7;
  border: 1px solid #E4E6EA;
}

.page-container.page-container.page-container.page-container .er {
  border-radius: 14px !important;
  overflow: hidden;
}

.er-barra {
  position: sticky;
  top: 0;
  z-index: 2;
  display: flex;
  flex-wrap: wrap;
  gap: 2px;
  padding: 6px 8px;
  background: #FFFFFF;
  border-bottom: 1px solid #E4E6EA;
}

.er-boton {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border: none;
  background: transparent;
  color: rgba(25, 28, 31, 0.72);
  cursor: pointer;
  transition: background-color 0.15s ease, color 0.15s ease;
}

.page-container.page-container.page-container.page-container .er-boton {
  border-radius: 8px !important;
}

.er-boton:hover {
  background: #F4F5F7;
  color: #191C1F;
}

.er-boton--activo {
  background: #EEF3F9;
  color: #1D4E89;
}

.er-boton:focus-visible {
  outline: 2px solid #1D4E89;
  outline-offset: 1px;
}

.er-hoja-zona {
  padding: 24px 16px;
  overflow-x: auto;
}

.er-hoja {
  max-width: 210mm;
  min-height: 297mm;
  margin: 0 auto;
  padding: 25mm 22mm;
  background: #FFFFFF;
  border: 1px solid #E4E6EA;
}

.page-container.page-container.page-container.page-container .er-hoja {
  border-radius: 2px !important;
  box-shadow: 0 6px 24px -14px rgba(25, 28, 31, 0.25) !important;
}

@media (max-width: 700px) {
  .er-hoja {
    min-height: 0;
    padding: 18px 16px;
  }
}

/* Texto de la hoja: negro sobre blanco, como en Word (no depende de los
   estilos de otros editores de la app ni de los colores de la interfaz) */
.er-hoja :deep(.er-contenido) {
  min-height: 240mm;
  outline: none;
  color: #111111;
  caret-color: #111111;
  font-family: 'Times New Roman', Georgia, serif;
  font-size: 12pt;
  line-height: 1.6;
}

.er-hoja :deep(.er-contenido p) {
  margin: 0 0 10px;
  color: #111111;
}

.er-hoja :deep(.er-contenido :is(h1, h2, h3)) {
  margin: 16px 0 8px;
  color: #111111;
  font-family: 'Times New Roman', Georgia, serif;
  font-weight: 700;
}

.er-hoja :deep(.er-contenido :is(ul, ol)) {
  margin: 0 0 10px;
  padding-left: 24px;
}

.er-hoja :deep(.er-contenido strong) {
  font-weight: 700;
}

.er-hoja :deep(.er-contenido *) {
  font-family: inherit;
}

@media (max-width: 700px) {
  .er-hoja :deep(.er-contenido) {
    min-height: 0;
  }
}
</style>
