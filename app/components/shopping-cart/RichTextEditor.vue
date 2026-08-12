<template>
  <div class="rounded-xl border border-light-c bg-surface overflow-hidden" :class="{ 'opacity-60': disabled }">
    <div v-if="editor" class="flex flex-wrap gap-1 px-2 py-1.5 bg-surface2 border-b border-light-c">
      <button type="button" class="rte-btn" :class="rteBtnClass(editor.isActive('bold'))" title="粗體" @click="editor.chain().focus().toggleBold().run()">
        <b>B</b>
      </button>
      <button type="button" class="rte-btn italic" :class="rteBtnClass(editor.isActive('italic'))" title="斜體" @click="editor.chain().focus().toggleItalic().run()">
        I
      </button>
      <button type="button" class="rte-btn underline" :class="rteBtnClass(editor.isActive('underline'))" title="底線" @click="editor.chain().focus().toggleUnderline().run()">
        U
      </button>
      <button type="button" class="rte-btn line-through" :class="rteBtnClass(editor.isActive('strike'))" title="刪除線" @click="editor.chain().focus().toggleStrike().run()">
        S
      </button>

      <span class="w-px self-stretch my-0.5 mx-1 border-l border-light-c" />

      <button type="button" class="rte-btn" :class="rteBtnClass(editor.isActive('heading', { level: 2 }))" title="標題" @click="editor.chain().focus().toggleHeading({ level: 2 }).run()">
        H2
      </button>
      <button type="button" class="rte-btn" :class="rteBtnClass(editor.isActive('heading', { level: 3 }))" title="子標題" @click="editor.chain().focus().toggleHeading({ level: 3 }).run()">
        H3
      </button>

      <span class="w-px self-stretch my-0.5 mx-1 border-l border-light-c" />

      <button type="button" class="rte-btn" :class="rteBtnClass(editor.isActive('bulletList'))" title="項目符號清單" @click="editor.chain().focus().toggleBulletList().run()">
        • 清單
      </button>
      <button type="button" class="rte-btn" :class="rteBtnClass(editor.isActive('orderedList'))" title="編號清單" @click="editor.chain().focus().toggleOrderedList().run()">
        1. 清單
      </button>
      <button type="button" class="rte-btn" :class="rteBtnClass(editor.isActive('blockquote'))" title="引用段落" @click="editor.chain().focus().toggleBlockquote().run()">
        引用
      </button>
      <button type="button" class="rte-btn" title="插入水平線" @click="editor.chain().focus().setHorizontalRule().run()">
        —
      </button>

      <span class="w-px self-stretch my-0.5 mx-1 border-l border-light-c" />

      <button type="button" class="rte-btn" :class="rteBtnClass(editor.isActive({ textAlign: 'left' }))" title="靠左對齊" @click="editor.chain().focus().setTextAlign('left').run()">
        靠左
      </button>
      <button type="button" class="rte-btn" :class="rteBtnClass(editor.isActive({ textAlign: 'center' }))" title="置中" @click="editor.chain().focus().setTextAlign('center').run()">
        置中
      </button>
      <button type="button" class="rte-btn" :class="rteBtnClass(editor.isActive({ textAlign: 'right' }))" title="靠右對齊" @click="editor.chain().focus().setTextAlign('right').run()">
        靠右
      </button>

      <span class="w-px self-stretch my-0.5 mx-1 border-l border-light-c" />

      <button type="button" class="rte-btn" title="復原" @click="editor.chain().focus().undo().run()">
        復原
      </button>
      <button type="button" class="rte-btn" title="取消復原" @click="editor.chain().focus().redo().run()">
        重做
      </button>
      <button type="button" class="rte-btn" title="清除格式" @click="editor.chain().focus().clearNodes().unsetAllMarks().run()">
        清除格式
      </button>
    </div>

    <EditorContent :editor="editor" class="rte-content px-3 py-2.5 min-h-[220px] text-sm leading-relaxed text-base-c" />
  </div>
</template>

<script setup>
// 共用的富文字編輯器，取代原網站的 CKEditor（詳細描述欄位）。
// 專案已經裝了 @tiptap/vue-3、starter-kit、underline、strike、text-align，
// 這裡直接沿用，不另外加套件。用法跟 textarea 一樣是 v-model 綁一個 HTML 字串。
// 配色跟其他 staff 頁面一樣用 bg-surface/text-base-c/border-light-c 這套
// token，才會跟著 dark mode 走（之前寫死白底黑字，深色模式看不清楚）。
import { onBeforeUnmount, watch } from 'vue'
import { useEditor, EditorContent } from '@tiptap/vue-3'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import Strike from '@tiptap/extension-strike'
import TextAlign from '@tiptap/extension-text-align'

const props = defineProps({
  modelValue: {
    type: String,
    default: ''
  },
  disabled: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['update:modelValue'])

function rteBtnClass(active) {
  return active ? 'bg-green-700 text-white' : 'text-muted-c hover-surface2'
}

const editor = useEditor({
  content: props.modelValue,
  editable: !props.disabled,
  extensions: [
    // starter-kit 內建的 strike 跟另外裝的 @tiptap/extension-strike 同名，
    // 這裡關掉 starter-kit 內建版本，改用獨立套件（避免重複註冊）。
    StarterKit.configure({ strike: false }),
    Underline,
    Strike,
    TextAlign.configure({ types: ['heading', 'paragraph'] })
  ],
  onUpdate: ({ editor: e }) => {
    emit('update:modelValue', e.getHTML())
  }
})

watch(
  () => props.modelValue,
  (val) => {
    if (!editor.value) return
    const current = editor.value.getHTML()
    if (val !== current) {
      editor.value.commands.setContent(val || '', false)
    }
  }
)

watch(
  () => props.disabled,
  (val) => {
    editor.value?.setEditable(!val)
  }
)

onBeforeUnmount(() => {
  editor.value?.destroy()
})
</script>

<style scoped>
.rte-btn {
  padding: 4px 8px;
  font-size: 12px;
  line-height: 1;
  border-radius: 6px;
  cursor: pointer;
}

.rte-content :deep(.ProseMirror) {
  min-height: 200px;
  outline: none;
}

.rte-content :deep(p) {
  margin: 0 0 0.6em;
}

.rte-content :deep(ul),
.rte-content :deep(ol) {
  padding-left: 1.4em;
  margin: 0 0 0.6em;
}

.rte-content :deep(blockquote) {
  border-left: 3px solid var(--tw-border-opacity, currentColor);
  margin: 0 0 0.6em;
  padding-left: 12px;
  opacity: 0.85;
}

.rte-content :deep(hr) {
  border: none;
  border-top: 1px solid currentColor;
  opacity: 0.2;
  margin: 1em 0;
}
</style>
