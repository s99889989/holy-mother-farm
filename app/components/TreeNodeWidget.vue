<template>
  <!-- 垂直排列：節點本身 + 子節點列 -->
  <div class="tree-node-wrap inline-flex flex-col items-center" ref="wrapRef">

    <!-- ── 節點卡片 ──────────────────────────────────────────── -->
    <div
      class="tree-node relative group select-none"
      :draggable="isAdmin"
      @dragstart.stop="$emit('drag-start', node.id)"
      @dragover.stop.prevent="$emit('drag-over', node.id)"
      @drop.stop.prevent="$emit('drag-drop', node.id)"
      @dragleave.stop="$emit('drag-over', '')"
      :style="{
        width: NODE_W + 'px',
        borderColor: node.color || undefined,
      }"
      :class="[
        'rounded-xl border-2 cursor-pointer transition-all duration-150 overflow-hidden',
        dragOverId === node.id
          ? 'scale-105 ring-2 ring-emerald-400'
          : '',
        !node.color
          ? (isDark ? 'border-zinc-700 bg-zinc-900 hover:border-zinc-500' : 'border-slate-300 bg-white hover:border-slate-400')
          : (isDark ? 'bg-zinc-900 hover:brightness-110' : 'bg-white hover:brightness-95'),
        isRoot ? (isDark ? '!border-emerald-600 shadow-lg shadow-emerald-900/20' : '!border-emerald-500 shadow-md shadow-emerald-100') : ''
      ]"
      @click.stop="$emit('node-click', node)"
    >
      <!-- 頂部色條（有自訂色時顯示） -->
      <div v-if="node.color" class="h-1 w-full" :style="{ backgroundColor: node.color }"></div>

      <!-- 主體 -->
      <div class="px-3 py-2.5">
        <div class="flex items-start gap-1.5">
          <span v-if="node.icon" class="text-base leading-none flex-shrink-0 mt-0.5">{{ node.icon }}</span>
          <div class="min-w-0 flex-1">
            <p class="text-xs font-semibold leading-tight truncate"
               :class="isDark ? 'text-slate-100' : 'text-slate-800'">{{ node.label }}</p>
            <p v-if="node.sublabel" class="text-xs leading-tight truncate mt-0.5"
               :class="isDark ? 'text-zinc-500' : 'text-slate-400'">{{ node.sublabel }}</p>
          </div>
          <!-- 子節點數量 badge -->
          <span v-if="node.children?.length && collapsedIds.includes(node.id)"
                class="flex-shrink-0 text-xs px-1.5 py-0.5 rounded-full font-medium leading-none"
                :class="isDark ? 'bg-zinc-700 text-zinc-400' : 'bg-slate-100 text-slate-500'">
            {{ totalDescendants(node) }}
          </span>
        </div>
      </div>

      <!-- Admin 工具列（hover 顯示） -->
      <div v-if="isAdmin"
           class="absolute top-1 right-1 hidden group-hover:flex items-center gap-0.5 rounded-lg p-0.5"
           :class="isDark ? 'bg-zinc-800/90' : 'bg-white/90 shadow-sm border border-slate-100'">
        <button @click.stop="$emit('add-child', node)"
                class="w-5 h-5 flex items-center justify-center rounded transition-colors"
                :class="isDark ? 'text-zinc-400 hover:text-emerald-400' : 'text-slate-400 hover:text-emerald-600'"
                title="新增子節點">
          <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 4v16m8-8H4"/></svg>
        </button>
        <button @click.stop="$emit('edit-node', node)"
                class="w-5 h-5 flex items-center justify-center rounded transition-colors"
                :class="isDark ? 'text-zinc-400 hover:text-blue-400' : 'text-slate-400 hover:text-blue-500'"
                title="編輯">
          <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
        </button>
        <button v-if="!isRoot" @click.stop="$emit('delete-node', node.id)"
                class="w-5 h-5 flex items-center justify-center rounded transition-colors"
                :class="isDark ? 'text-zinc-400 hover:text-red-400' : 'text-slate-400 hover:text-red-500'"
                title="刪除">
          <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
        </button>
      </div>

      <!-- 展開/收合按鈕（有子節點時） -->
      <button v-if="node.children?.length"
              @click.stop="$emit('toggle-collapse', node.id)"
              class="absolute -bottom-3 left-1/2 -translate-x-1/2 w-6 h-6 rounded-full border flex items-center justify-center z-10 transition-colors"
              :class="isDark ? 'bg-zinc-800 border-zinc-600 text-zinc-400 hover:border-zinc-400' : 'bg-white border-slate-300 text-slate-500 hover:border-slate-400 shadow-sm'">
        <svg class="w-3 h-3 transition-transform"
             :class="collapsedIds.includes(node.id) ? '' : 'rotate-180'"
             fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M19 9l-7 7-7-7"/>
        </svg>
      </button>
    </div>

    <!-- ── 子節點區 ──────────────────────────────────────────── -->
    <div v-if="node.children?.length && !collapsedIds.includes(node.id)"
         class="relative mt-8"
         ref="childrenRowRef">

      <!-- 子節點橫排 -->
      <div class="flex items-start" :style="{ gap: H_GAP + 'px' }">
        <TreeNodeWidget
          v-for="child in node.children"
          :key="child.id"
          :node="child"
          :isRoot="false"
          :isAdmin="isAdmin"
          :isDark="isDark"
          :collapsedIds="collapsedIds"
          :dragOverId="dragOverId"
          @toggle-collapse="$emit('toggle-collapse', $event)"
          @node-click="$emit('node-click', $event)"
          @add-child="$emit('add-child', $event)"
          @edit-node="$emit('edit-node', $event)"
          @delete-node="$emit('delete-node', $event)"
          @drag-start="$emit('drag-start', $event)"
          @drag-over="$emit('drag-over', $event)"
          @drag-drop="$emit('drag-drop', $event)"
          @layout-done="bubbleLayout"
        />
      </div>
    </div>
  </div>
</template>

<script setup>
const props = defineProps({
  node:         { type: Object,  required: true },
  isRoot:       { type: Boolean, default: false },
  isAdmin:      { type: Boolean, default: false },
  isDark:       { type: Boolean, default: false },
  collapsedIds: { type: Array,   default: () => [] },
  dragOverId:   { type: String,  default: '' },
})

const emit = defineEmits([
  'toggle-collapse', 'node-click', 'add-child', 'edit-node', 'delete-node',
  'drag-start', 'drag-over', 'drag-drop', 'layout-done',
])

// ── 佈局常數（和 WorkflowTree.vue 對齊） ─────────────────────────
const NODE_W = 110
const NODE_H = 52
const H_GAP  = 40
const V_GAP  = 60

const wrapRef       = ref(null)
const childrenRowRef = ref(null)

// 子孫總數（收合時顯示）
function totalDescendants(node) {
  let n = 0
  function count(nd) { nd.children?.forEach(c => { n++; count(c) }) }
  count(node)
  return n
}

// ── 佈局計算 & 邊線回報 ──────────────────────────────────────────
/*
  整個頁面的 SVG 邊線由根節點的 layout-done 事件回報。
  每個節點渲染後計算自己 + 子孫的絕對位置，
  然後向上 emit layout-done({ w, h, edgeList })。
  只有根節點的 layout-done 被 WorkflowTree.vue 監聽；
  其他層只做 bubble。
*/

function bubbleLayout() {
  nextTick(computeLayout)
}

function computeLayout() {
  if (!wrapRef.value) return
  const rect   = wrapRef.value.getBoundingClientRect()
  const parentRect = wrapRef.value.parentElement?.getBoundingClientRect() || rect

  // 收集所有子孫節點位置並建邊線
  const edgeList = []
  collectEdges(wrapRef.value, edgeList, null, null)

  const w = wrapRef.value.scrollWidth
  const h = wrapRef.value.scrollHeight
  emit('layout-done', { w, h, edgeList })
}

function collectEdges(container, edgeList, parentCx, parentBottomY) {
  // 找到直接子節點的 .tree-node-wrap
  const childWraps = Array.from(container.children).filter(el =>
    el.classList.contains('tree-node-wrap') || el.tagName === 'DIV'
  )
  // 實際上 DOM 結構：直接子是 .tree-node-wrap
}

// 用 ResizeObserver 追蹤佈局變化，重算邊線
let ro = null
onMounted(() => {
  if (!props.isRoot) return
  nextTick(() => {
    computeEdgesForRoot()
    ro = new ResizeObserver(() => nextTick(computeEdgesForRoot))
    if (wrapRef.value) ro.observe(wrapRef.value)
  })
})

onUnmounted(() => ro?.disconnect())

watch(() => props.collapsedIds, () => {
  if (props.isRoot) nextTick(computeEdgesForRoot)
}, { deep: true })

watch(() => props.node, () => {
  if (props.isRoot) nextTick(computeEdgesForRoot)
}, { deep: true })

function computeEdgesForRoot() {
  if (!wrapRef.value) return
  const containerRect = wrapRef.value.getBoundingClientRect()
  const edgeList = []
  buildEdges(wrapRef.value, props.node, edgeList, containerRect)
  const w = wrapRef.value.scrollWidth
  const h = wrapRef.value.scrollHeight
  emit('layout-done', { w, h, edgeList })
}

function buildEdges(wrapEl, node, edgeList, containerRect) {
  if (!wrapEl) return
  // 找此節點卡片元素
  const cardEl = wrapEl.querySelector(':scope > .tree-node')
  if (!cardEl) return
  const cardRect = cardEl.getBoundingClientRect()
  const cx = cardRect.left + cardRect.width / 2  - containerRect.left
  const by = cardRect.bottom - containerRect.top

  if (node.children?.length && !props.collapsedIds.includes(node.id)) {
    // 找子節點 wraps
    const childRowEl = wrapEl.querySelector(':scope > div:last-child')
    if (!childRowEl) return
    const childWraps = Array.from(childRowEl.children)

    childWraps.forEach((childWrapEl, ci) => {
      const child = node.children[ci]
      if (!child) return
      const childCardEl = childWrapEl.querySelector(':scope > .tree-node')
      if (!childCardEl) return
      const ccRect = childCardEl.getBoundingClientRect()
      const ccx = ccRect.left + ccRect.width / 2 - containerRect.left
      const cty = ccRect.top - containerRect.top

      // 父底部 → 中間橫線 → 子頂部
      const midY = (by + cty) / 2
      edgeList.push({
        d: `M ${cx} ${by} C ${cx} ${midY}, ${ccx} ${midY}, ${ccx} ${cty}`
      })

      // 遞迴
      buildEdges(childWrapEl, child, edgeList, containerRect)
    })
  }
}
</script>

<style scoped>
.tree-node {
  min-height: v-bind('NODE_H + "px"');
}
</style>
