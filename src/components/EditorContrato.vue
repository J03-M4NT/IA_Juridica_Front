<template>
  <div class="editor-wrapper">
    <!-- Barra de herramientas tipo Word -->
    <div class="toolbar">
      <q-btn-group flat>
        <q-btn flat dense icon="format_bold" @click="editor?.chain().focus().toggleBold().run()" :color="editor?.isActive('bold') ? 'accent' : 'grey-7'" />
        <q-btn flat dense icon="format_italic" @click="editor?.chain().focus().toggleItalic().run()" :color="editor?.isActive('italic') ? 'accent' : 'grey-7'" />
        <q-btn flat dense icon="format_underlined" @click="editor?.chain().focus().toggleUnderline().run()" :color="editor?.isActive('underline') ? 'accent' : 'grey-7'" />
      </q-btn-group>

      <q-separator vertical class="q-mx-sm" />

      <q-btn-group flat>
        <q-btn flat dense icon="format_align_left" @click="editor?.chain().focus().setTextAlign('left').run()" />
        <q-btn flat dense icon="format_align_center" @click="editor?.chain().focus().setTextAlign('center').run()" />
        <q-btn flat dense icon="format_align_right" @click="editor?.chain().focus().setTextAlign('right').run()" />
        <q-btn flat dense icon="format_align_justify" @click="editor?.chain().focus().setTextAlign('justify').run()" />
      </q-btn-group>

      <q-separator vertical class="q-mx-sm" />

      <q-btn-group flat>
        <q-btn flat dense icon="format_list_bulleted" @click="editor?.chain().focus().toggleBulletList().run()" />
        <q-btn flat dense icon="format_list_numbered" @click="editor?.chain().focus().toggleOrderedList().run()" />
      </q-btn-group>

      <q-separator vertical class="q-mx-sm" />

      <q-btn flat dense icon="undo" @click="editor?.chain().focus().undo().run()" />
      <q-btn flat dense icon="redo" @click="editor?.chain().focus().redo().run()" />
    </div>

    <!-- Área del documento tipo Word -->
    <div class="document-area">
      <div class="document-page">
        <editor-content v-if="editor" :editor="editor" class="document-content" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onBeforeUnmount, watch } from 'vue'
import { useEditor, EditorContent } from '@tiptap/vue-3'
import StarterKit from '@tiptap/starter-kit'
import TextAlign from '@tiptap/extension-text-align'

const props = defineProps<{
  modelValue: string
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void
}>()

const editor = useEditor({
  content: props.modelValue,
  extensions: [
    StarterKit,
    TextAlign.configure({ types: ['heading', 'paragraph'] }),
  ],
  editorProps: {
    attributes: {
      class: 'tiptap-editor'
    }
  },
  onUpdate: () => {
    emit('update:modelValue', editor.value?.getHTML() ?? '')
  }
})

watch(() => props.modelValue, (newVal) => {
  if (editor.value && newVal !== editor.value.getHTML()) {
    editor.value.commands.setContent(newVal || '', { emitUpdate: false })
  }
})

onBeforeUnmount(() => {
  editor.value?.destroy()
})
</script>

<style scoped>
.editor-wrapper {
  border: 1px solid var(--border-color);
  border-radius: var(--border-radius-small);
  overflow: hidden;
  background: var(--surface-alt);
}

.toolbar {
  background: var(--surface);
  border-bottom: 1px solid var(--border-color);
  padding: 8px 12px;
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 4px;
  position: sticky;
  top: 0;
  z-index: 10;
}

.document-area {
  padding: 24px;
  min-height: 600px;
  overflow-y: auto;
  background: var(--surface-alt);
}

.document-page {
  background: var(--surface);
  width: 210mm;
  min-height: 297mm;
  margin: 0 auto;
  padding: 25mm 20mm;
  box-shadow: var(--shadow-medium);
  border-radius: 2px;
}
</style>

<style>
.tiptap-editor {
  outline: none;
  font-family: 'Times New Roman', serif;
  font-size: 12pt;
  line-height: 1.6;
  color: #1a1a1a;
  min-height: 200px;
}

.tiptap-editor p {
  margin: 0 0 8px 0;
  text-align: justify;
}

.tiptap-editor h1, .tiptap-editor h2 {
  font-weight: bold;
  text-align: center;
  margin: 16px 0 8px 0;
}
</style>
