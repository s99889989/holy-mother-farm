<script setup>
import { ref } from 'vue'

// 原網站頂部選單最深到 3 層（例如：進銷存 > 銷貨管理 > 客戶報價單），
// 用遞迴元件畫任意深度，滑鼠移到有子選單的項目上時展開下一層。
defineProps({
  node: { type: Object, required: true },
  depth: { type: Number, default: 0 }
})

const isOpen = ref(false)
</script>

<template>
  <li
    class="relative"
    @mouseenter="isOpen = true"
    @mouseleave="isOpen = false"
  >
    <a
      :href="node.href || '#'"
      :target="node.href ? node.target : undefined"
      class="block px-3 py-2 text-sm whitespace-nowrap transition-colors hover:bg-green-700 hover:text-white"
      :class="depth === 0 ? 'font-medium text-base-c' : 'text-muted-c'"
      @click="!node.href && $event.preventDefault()"
    >
      {{ node.label }}
      <span v-if="node.children && node.children.length" class="ml-1 text-[10px] opacity-60">
        {{ depth === 0 ? '▾' : '▸' }}
      </span>
    </a>

    <ul
      v-if="node.children && node.children.length"
      v-show="isOpen"
      class="absolute z-20 min-w-[180px] rounded-lg border border-light-c bg-surface py-1 shadow-lg"
      :class="depth === 0 ? 'left-0 top-full' : 'left-full top-0'"
    >
      <DcMenuNode
        v-for="(child, idx) in node.children"
        :key="idx"
        :node="child"
        :depth="depth + 1"
      />
    </ul>
  </li>
</template>
