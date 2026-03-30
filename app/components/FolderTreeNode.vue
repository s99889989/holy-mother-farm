<template>
  <div>
    <div
      :class="['flex items-center group rounded-xl transition-colors pr-1 relative',
        isDragOver ? 'bg-indigo-100 dark:bg-indigo-900/50 ring-2 ring-indigo-400' :
        selectedPath === node.path ? 'bg-indigo-50 dark:bg-indigo-900/30' : 'hover:bg-stone-100 dark:hover:bg-zinc-800']"
      :style="{ paddingLeft: (8 + depth * 14) + 'px' }"
      @dragover.prevent="isDragOver = true"
      @dragleave="isDragOver = false"
      @drop.prevent="onDrop">

      <!-- 展開/收合 -->
      <button class="p-0.5 mr-0.5 text-stone-400 flex-shrink-0 w-4" @click.stop="expanded = !expanded">
        <svg v-if="node.children && node.children.length"
             :class="['w-3 h-3 transition-transform', expanded ? 'rotate-90' : '']"
             fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
        </svg>
      </button>

      <!-- 資料夾名稱 -->
      <button
        :class="['flex-1 text-left py-1.5 text-sm flex items-center gap-1.5 min-w-0 truncate',
          selectedPath === node.path
            ? 'text-indigo-700 dark:text-indigo-300 font-medium'
            : 'text-stone-600 dark:text-stone-300']"
        :title="node.name"
        @click="$emit('select', node.path, node.name)">
        <svg class="w-3.5 h-3.5 flex-shrink-0 opacity-60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"/>
        </svg>
        <span class="truncate">{{ node.name }}</span>
      </button>

      <!-- ⋯ 選單 -->
      <div class="opacity-0 group-hover:opacity-100 flex-shrink-0 relative">
        <button class="p-1 text-stone-400 hover:text-stone-600 transition-colors" @click.stop="menuOpen = !menuOpen">
          <svg class="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
            <circle cx="5" cy="12" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="19" cy="12" r="1.5"/>
          </svg>
        </button>
        <div v-if="menuOpen"
             class="absolute right-0 top-7 z-50 bg-white dark:bg-zinc-800 border border-stone-200 dark:border-stone-600 rounded-xl shadow-lg py-1 min-w-32">
          <button class="w-full text-left px-3 py-1.5 text-xs text-teal-600 hover:bg-stone-50 dark:hover:bg-zinc-700" @click.stop="$emit('moveup', node.path); menuOpen=false">↑ 上移</button>
          <button class="w-full text-left px-3 py-1.5 text-xs text-teal-600 hover:bg-stone-50 dark:hover:bg-zinc-700" @click.stop="$emit('movedown', node.path); menuOpen=false">↓ 下移</button>
          <div class="border-t border-stone-100 dark:border-stone-700 my-1"></div>
          <button class="w-full text-left px-3 py-1.5 text-xs text-indigo-600 hover:bg-stone-50 dark:hover:bg-zinc-700" @click.stop="$emit('add', node.path); menuOpen=false">＋ 新增子資料夾</button>
          <button class="w-full text-left px-3 py-1.5 text-xs text-amber-600 hover:bg-stone-50 dark:hover:bg-zinc-700" @click.stop="$emit('rename', node.path, node.name); menuOpen=false">✏ 重新命名</button>
          <div class="border-t border-stone-100 dark:border-stone-700 my-1"></div>
          <button class="w-full text-left px-3 py-1.5 text-xs text-red-500 hover:bg-stone-50 dark:hover:bg-zinc-700" @click.stop="$emit('delete', node.path); menuOpen=false">🗑 刪除</button>
        </div>
      </div>
    </div>

    <!-- 子資料夾（遞迴） -->
    <template v-if="expanded && node.children && node.children.length">
      <FolderTreeNode v-for="child in node.children" :key="child.path"
                      :node="child" :selectedPath="selectedPath" :depth="depth + 1"
                      @select="(p, n) => $emit('select', p, n)"
                      @add="(p) => $emit('add', p)"
                      @rename="(p, n) => $emit('rename', p, n)"
                      @moveup="(p) => $emit('moveup', p)"
                      @movedown="(p) => $emit('movedown', p)"
                      @delete="(p) => $emit('delete', p)"
                      @drop-file="(folder) => $emit('drop-file', folder)" />
    </template>
  </div>
</template>

<script setup>
import {ref, onMounted, onBeforeUnmount} from 'vue'

const props = defineProps(['node', 'selectedPath', 'depth'])
const emit = defineEmits(['select', 'add', 'rename', 'moveup', 'movedown', 'delete', 'drop-file'])

const expanded = ref(true)
const menuOpen = ref(false)
const isDragOver = ref(false)

const onDrop = () => {
  isDragOver.value = false
  emit('drop-file', props.node.path)
}

const closeMenu = (e) => {
  if (!e.target.closest('.relative')) menuOpen.value = false
}
onMounted(() => document.addEventListener('click', closeMenu))
onBeforeUnmount(() => document.removeEventListener('click', closeMenu))
</script>
