<template>
  <div class="tree-page min-h-screen flex flex-col" :class="isDark ? 'dark bg-zinc-950' : 'bg-slate-50'">

    <!-- ── Header ────────────────────────────────────────────────── -->
    <header class="flex-shrink-0 border-b px-4 py-3 flex items-center gap-3 z-30"
            :class="isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-slate-200'">
      <!-- 左：樹選擇器 -->
      <div class="flex items-center gap-2 min-w-0">
        <div class="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">樹</div>
        <div class="relative" ref="treePickerRef">
          <button @click="showTreePicker = !showTreePicker"
                  class="flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm font-medium transition-colors min-w-0"
                  :class="isDark ? 'border-zinc-700 bg-zinc-800 text-slate-200 hover:border-zinc-600' : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'">
            <span v-if="currentTree">{{ currentTree.icon }} {{ currentTree.name }}</span>
            <span v-else :class="isDark ? 'text-zinc-500' : 'text-slate-400'">選擇圖表…</span>
            <svg class="w-3.5 h-3.5 flex-shrink-0 transition-transform" :class="[showTreePicker ? 'rotate-180' : '', isDark ? 'text-zinc-500' : 'text-slate-400']"
                 fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/></svg>
          </button>
          <!-- 下拉 -->
          <div v-if="showTreePicker"
               class="absolute top-full mt-1 left-0 rounded-xl shadow-xl border py-1 z-50 min-w-52"
               :class="isDark ? 'bg-zinc-900 border-zinc-700' : 'bg-white border-slate-200'">
            <button v-for="t in trees" :key="t.id"
                    @click="selectTree(t)"
                    class="w-full flex items-center gap-2 px-3 py-2 text-sm text-left transition-colors"
                    :class="[
                      currentTree?.id === t.id
                        ? (isDark ? 'bg-emerald-900/30 text-emerald-400' : 'bg-emerald-50 text-emerald-700')
                        : (isDark ? 'text-slate-300 hover:bg-zinc-800' : 'text-slate-700 hover:bg-slate-50')
                    ]">
              <span>{{ t.icon }}</span>
              <span class="flex-1 font-medium">{{ t.name }}</span>
              <button v-if="isAdmin" @click.stop="confirmDeleteTree(t.id)"
                      class="text-xs p-0.5 rounded transition-colors"
                      :class="isDark ? 'text-zinc-600 hover:text-red-400' : 'text-slate-300 hover:text-red-400'">
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
              </button>
            </button>
            <div v-if="trees.length === 0" class="px-3 py-4 text-xs text-center"
                 :class="isDark ? 'text-zinc-500' : 'text-slate-400'">尚無圖表</div>
            <div v-if="isAdmin" class="border-t mt-1 pt-1" :class="isDark ? 'border-zinc-800' : 'border-slate-100'">
              <button @click="openCreateTree"
                      class="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium transition-colors"
                      :class="isDark ? 'text-emerald-500 hover:bg-zinc-800' : 'text-emerald-600 hover:bg-slate-50'">
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
                新增圖表
              </button>
            </div>
          </div>
        </div>
      </div>

      <div class="flex-1" />

      <!-- 右：工具列 -->
      <div class="flex items-center gap-2">
        <!-- 縮放 -->
        <div class="hidden sm:flex items-center gap-1 rounded-lg border px-1 py-0.5"
             :class="isDark ? 'border-zinc-700' : 'border-slate-200'">
          <button @click="zoom = Math.max(0.3, zoom - 0.1)"
                  class="w-6 h-6 flex items-center justify-center rounded text-sm transition-colors"
                  :class="isDark ? 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100'">−</button>
          <span class="text-xs w-10 text-center" :class="isDark ? 'text-zinc-400' : 'text-slate-500'">{{ Math.round(zoom * 100) }}%</span>
          <button @click="zoom = Math.min(2, zoom + 0.1)"
                  class="w-6 h-6 flex items-center justify-center rounded text-sm transition-colors"
                  :class="isDark ? 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100'">＋</button>
          <button @click="zoom = 1"
                  class="px-1 text-xs rounded transition-colors"
                  :class="isDark ? 'text-zinc-500 hover:text-zinc-300' : 'text-slate-400 hover:text-slate-600'">重置</button>
        </div>
        <!-- 全展開/全收合 -->
        <button @click="toggleAllCollapse"
                class="px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-colors hidden sm:flex items-center gap-1"
                :class="isDark ? 'border-zinc-700 text-zinc-400 hover:border-zinc-600 hover:text-zinc-200' : 'border-slate-200 text-slate-500 hover:border-slate-300 hover:text-slate-700'">
          {{ allCollapsed ? '全展開' : '全收合' }}
        </button>
        <!-- Admin 切換 -->
        <button @click="isAdmin = !isAdmin"
                class="px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-colors flex items-center gap-1"
                :class="[
                  isAdmin
                    ? (isDark ? 'bg-emerald-900/30 border-emerald-700 text-emerald-400' : 'bg-emerald-50 border-emerald-300 text-emerald-600')
                    : (isDark ? 'border-zinc-700 text-zinc-400 hover:border-zinc-600' : 'border-slate-200 text-slate-500 hover:border-slate-300')
                ]">
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
          {{ isAdmin ? '編輯中' : '編輯' }}
        </button>
        <!-- 暗/亮 -->
        <button @click="toggleDark"
                class="w-8 h-8 flex items-center justify-center rounded-lg border transition-colors"
                :class="isDark ? 'border-zinc-700 text-zinc-400 hover:bg-zinc-800' : 'border-slate-200 text-slate-500 hover:bg-slate-100'">
          <svg v-if="!isDark" class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"/></svg>
          <svg v-else class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707M17.657 17.657l-.707-.707M6.343 6.343l-.707-.707M12 8a4 4 0 100 8 4 4 0 000-8z"/></svg>
        </button>
      </div>
    </header>

    <!-- ── 主畫布 ──────────────────────────────────────────────── -->
    <div class="flex-1 overflow-auto relative"
         ref="canvasWrapRef"
         @mousedown="startPan"
         @mousemove="doPan"
         @mouseup="endPan"
         @mouseleave="endPan"
         @wheel.prevent="onWheel"
         :style="{ cursor: isPanning ? 'grabbing' : 'grab' }">

      <!-- 載入 -->
      <div v-if="loading" class="absolute inset-0 flex items-center justify-center gap-2"
           :class="isDark ? 'text-zinc-500' : 'text-slate-400'">
        <div class="w-5 h-5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
        載入中…
      </div>

      <!-- 無樹提示 -->
      <div v-else-if="!rootNode" class="absolute inset-0 flex flex-col items-center justify-center gap-3"
           :class="isDark ? 'text-zinc-600' : 'text-slate-300'">
        <svg class="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
        <p class="text-sm">從上方選擇或新增一個圖表</p>
      </div>

      <!-- 樹狀圖 -->
      <div v-else
           class="absolute origin-top-left transition-none"
           :style="{
             transform: `translate(${panX}px, ${panY}px) scale(${zoom})`,
             transformOrigin: '0 0',
             padding: '60px',
           }">
        <svg class="absolute inset-0 pointer-events-none overflow-visible"
             :width="svgW" :height="svgH">
          <path v-for="(e, i) in edges" :key="i" :d="e.d"
                :stroke="isDark ? '#3f3f46' : '#cbd5e1'"
                stroke-width="1.5" fill="none"
                stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        <TreeNodeWidget
          :node="rootNode"
          :isRoot="true"
          :isAdmin="isAdmin"
          :isDark="isDark"
          :collapsedIds="collapsedIds"
          :dragOverId="dragOverId"
          @toggle-collapse="toggleCollapse"
          @node-click="openDetail"
          @add-child="openAddNode"
          @edit-node="openEditNode"
          @delete-node="confirmDeleteNode"
          @drag-start="onDragStart"
          @drag-over="onDragOver"
          @drag-drop="onDragDrop"
          @layout-done="onLayoutDone"
        />
      </div>
    </div>

    <!-- ── 節點詳情抽屜（右側） ──────────────────────────────────── -->
    <transition name="slide-right">
      <div v-if="detailNode"
           class="fixed right-0 top-0 bottom-0 w-80 shadow-2xl border-l z-40 flex flex-col"
           :class="isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-slate-200'">
        <div class="flex items-center justify-between px-5 py-4 border-b"
             :class="isDark ? 'border-zinc-800' : 'border-slate-100'">
          <h3 class="font-bold text-sm" :class="isDark ? 'text-slate-100' : 'text-slate-800'">節點資訊</h3>
          <button @click="detailNode = null"
                  :class="isDark ? 'text-zinc-500 hover:text-zinc-300' : 'text-slate-400 hover:text-slate-600'">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
        </div>
        <div class="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          <div class="flex items-center gap-3">
            <div v-if="detailNode.icon" class="text-3xl">{{ detailNode.icon }}</div>
            <div>
              <p class="font-bold text-base" :class="isDark ? 'text-slate-100' : 'text-slate-800'">{{ detailNode.label }}</p>
              <p v-if="detailNode.sublabel" class="text-xs mt-0.5" :class="isDark ? 'text-zinc-400' : 'text-slate-500'">{{ detailNode.sublabel }}</p>
            </div>
          </div>
          <div v-if="detailNode.desc"
               class="text-sm leading-relaxed rounded-xl p-4"
               :class="isDark ? 'bg-zinc-800 text-slate-300' : 'bg-slate-50 text-slate-600'"
               v-html="detailNode.desc.replace(/\n/g, '<br>')"></div>
          <div v-else class="text-sm italic" :class="isDark ? 'text-zinc-600' : 'text-slate-400'">無說明</div>
          <div v-if="detailNode.children?.length"
               class="text-xs rounded-lg px-3 py-2"
               :class="isDark ? 'bg-zinc-800 text-zinc-400' : 'bg-slate-100 text-slate-500'">
            子節點：{{ detailNode.children.length }} 個
          </div>
        </div>
        <div v-if="isAdmin" class="px-5 py-4 border-t flex gap-2"
             :class="isDark ? 'border-zinc-800' : 'border-slate-100'">
          <button @click="openEditNode(detailNode)"
                  class="flex-1 py-2 rounded-xl text-xs font-medium border transition-colors"
                  :class="isDark ? 'border-zinc-700 text-zinc-300 hover:bg-zinc-800' : 'border-slate-200 text-slate-600 hover:bg-slate-50'">編輯</button>
          <button @click="confirmDeleteNode(detailNode.id)"
                  class="flex-1 py-2 rounded-xl text-xs font-medium border transition-colors"
                  :class="isDark ? 'border-red-900 text-red-400 hover:bg-red-900/20' : 'border-red-200 text-red-500 hover:bg-red-50'">刪除</button>
        </div>
      </div>
    </transition>

    <!-- ── 新增/編輯節點 Modal ───────────────────────────────────── -->
    <div v-if="nodeModal.show"
         class="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 px-4">
      <div class="rounded-2xl shadow-2xl w-full max-w-md"
           :class="isDark ? 'bg-zinc-900' : 'bg-white'">
        <div class="flex items-center justify-between px-5 py-4 border-b"
             :class="isDark ? 'border-zinc-800' : 'border-slate-100'">
          <h3 class="font-bold text-sm" :class="isDark ? 'text-slate-100' : 'text-slate-800'">
            {{ nodeModal.isNew ? '新增節點' : '編輯節點' }}
            <span v-if="nodeModal.parentLabel" class="font-normal text-xs ml-1"
                  :class="isDark ? 'text-zinc-500' : 'text-slate-400'">→ {{ nodeModal.parentLabel }}</span>
          </h3>
          <button @click="nodeModal.show = false" :class="isDark ? 'text-zinc-500 hover:text-zinc-300' : 'text-slate-400 hover:text-slate-600'">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
        </div>
        <div class="px-5 py-4 space-y-3">
          <!-- 圖示 + 名稱 -->
          <div class="flex gap-2">
            <input v-model="nodeModal.data.icon" placeholder="圖示"
                   class="w-14 text-center px-2 py-2 text-sm rounded-xl border outline-none focus:ring-2 focus:ring-emerald-400"
                   :class="isDark ? 'border-zinc-700 bg-zinc-800 text-slate-100' : 'border-slate-200 bg-white text-slate-800'" />
            <input v-model="nodeModal.data.label" placeholder="節點名稱 *"
                   class="flex-1 px-3 py-2 text-sm rounded-xl border outline-none focus:ring-2 focus:ring-emerald-400"
                   :class="isDark ? 'border-zinc-700 bg-zinc-800 text-slate-100' : 'border-slate-200 bg-white text-slate-800'" />
          </div>
          <!-- 副標題 -->
          <input v-model="nodeModal.data.sublabel" placeholder="副標題（選填，例如英文名）"
                 class="w-full px-3 py-2 text-sm rounded-xl border outline-none focus:ring-2 focus:ring-emerald-400"
                 :class="isDark ? 'border-zinc-700 bg-zinc-800 text-slate-100' : 'border-slate-200 bg-white text-slate-800'" />
          <!-- 邊框色 -->
          <div class="flex items-center gap-2">
            <label class="text-xs" :class="isDark ? 'text-zinc-400' : 'text-slate-500'">邊框色</label>
            <input type="color" v-model="nodeModal.data.color"
                   class="w-8 h-8 rounded-lg border cursor-pointer p-0.5"
                   :class="isDark ? 'border-zinc-700 bg-zinc-800' : 'border-slate-200'" />
            <button @click="nodeModal.data.color = ''"
                    class="text-xs transition-colors"
                    :class="isDark ? 'text-zinc-500 hover:text-zinc-300' : 'text-slate-400 hover:text-slate-600'">清除</button>
            <!-- 快速顏色 -->
            <div class="flex gap-1 ml-1">
              <button v-for="c in PRESET_COLORS" :key="c"
                      @click="nodeModal.data.color = c"
                      class="w-5 h-5 rounded-full border-2 transition-transform hover:scale-110"
                      :style="{ backgroundColor: c, borderColor: nodeModal.data.color === c ? 'white' : 'transparent' }"/>
            </div>
          </div>
          <!-- 說明 -->
          <textarea v-model="nodeModal.data.desc" placeholder="詳細說明（選填）" rows="3"
                    class="w-full px-3 py-2 text-sm rounded-xl border outline-none focus:ring-2 focus:ring-emerald-400 resize-none"
                    :class="isDark ? 'border-zinc-700 bg-zinc-800 text-slate-100 placeholder-zinc-600' : 'border-slate-200 bg-white text-slate-800 placeholder-slate-400'"/>
        </div>
        <div class="px-5 py-4 border-t flex gap-2 justify-end"
             :class="isDark ? 'border-zinc-800' : 'border-slate-100'">
          <button @click="nodeModal.show = false"
                  class="px-4 py-2 text-sm rounded-xl transition-colors"
                  :class="isDark ? 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'">取消</button>
          <button @click="saveNode"
                  class="px-4 py-2 text-sm rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 transition-colors font-medium">
            {{ nodeModal.isNew ? '新增' : '儲存' }}
          </button>
        </div>
      </div>
    </div>

    <!-- ── 新增圖表 Modal ────────────────────────────────────────── -->
    <div v-if="createTreeModal.show"
         class="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 px-4">
      <div class="rounded-2xl shadow-2xl w-full max-w-sm"
           :class="isDark ? 'bg-zinc-900' : 'bg-white'">
        <div class="px-5 py-4 border-b" :class="isDark ? 'border-zinc-800' : 'border-slate-100'">
          <h3 class="font-bold text-sm" :class="isDark ? 'text-slate-100' : 'text-slate-800'">新增圖表</h3>
        </div>
        <div class="px-5 py-4 space-y-3">
          <div class="flex gap-2">
            <input v-model="createTreeModal.icon" placeholder="🌳"
                   class="w-14 text-center px-2 py-2 text-sm rounded-xl border outline-none"
                   :class="isDark ? 'border-zinc-700 bg-zinc-800 text-slate-100' : 'border-slate-200 bg-white'" />
            <input v-model="createTreeModal.name" placeholder="圖表名稱 *"
                   @keydown.enter="doCreateTree"
                   class="flex-1 px-3 py-2 text-sm rounded-xl border outline-none focus:ring-2 focus:ring-emerald-400"
                   :class="isDark ? 'border-zinc-700 bg-zinc-800 text-slate-100' : 'border-slate-200 bg-white text-slate-800'" />
          </div>
          <input v-model="createTreeModal.desc" placeholder="說明（選填）"
                 class="w-full px-3 py-2 text-sm rounded-xl border outline-none focus:ring-2 focus:ring-emerald-400"
                 :class="isDark ? 'border-zinc-700 bg-zinc-800 text-slate-100' : 'border-slate-200 bg-white text-slate-800'" />
        </div>
        <div class="px-5 py-4 border-t flex gap-2 justify-end" :class="isDark ? 'border-zinc-800' : 'border-slate-100'">
          <button @click="createTreeModal.show = false"
                  class="px-4 py-2 text-sm rounded-xl transition-colors"
                  :class="isDark ? 'bg-zinc-800 text-zinc-300' : 'bg-slate-100 text-slate-600'">取消</button>
          <button @click="doCreateTree"
                  class="px-4 py-2 text-sm rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 font-medium transition-colors">建立</button>
        </div>
      </div>
    </div>

    <!-- Toast -->
    <transition name="fade">
      <div v-if="toast.show"
           class="fixed bottom-6 left-1/2 -translate-x-1/2 bg-zinc-800 text-white text-sm px-4 py-2.5 rounded-xl shadow-lg flex items-center gap-2 z-50">
        <svg class="w-4 h-4 text-emerald-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>
        {{ toast.message }}
      </div>
    </transition>
  </div>
</template>

<script setup>
definePageMeta({ layout: 'book' })

// ── Dark Mode ────────────────────────────────────────────────────
const darkStore = useDarkModeStore()
const isDark    = computed(() => darkStore.data.dark)
const toggleDark = () => darkStore.change_dark_mode()

// ── API ──────────────────────────────────────────────────────────
const commonStore = useCommonStore()
const BASE = computed(() => commonStore.data.main_url + '/holy/tree')

// ── 狀態 ─────────────────────────────────────────────────────────
const trees       = ref([])
const currentTree = ref(null)
const rootNode    = ref(null)
const loading     = ref(false)
const isAdmin     = ref(false)
const detailNode  = ref(null)
const collapsedIds = ref([])
const allCollapsed = ref(false)

// 畫布 pan/zoom
const zoom       = ref(1)
const panX       = ref(60)
const panY       = ref(60)
const isPanning  = ref(false)
const lastMouse  = ref({ x: 0, y: 0 })
const canvasWrapRef = ref(null)

// SVG 邊線尺寸（由 layout 回報）
const svgW = ref(2000)
const svgH = ref(2000)
const edges = ref([])

// 拖曳
const dragNodeId = ref('')
const dragOverId = ref('')

// 下拉
const showTreePicker  = ref(false)
const treePickerRef   = ref(null)

const PRESET_COLORS = ['#10b981', '#f59e0b', '#ef4444', '#3b82f6', '#8b5cf6', '#ec4899']

// ── 常數 ─────────────────────────────────────────────────────────
// 節點尺寸（需與 TreeNodeWidget 保持一致）
const NODE_W  = 110
const NODE_H  = 52
const H_GAP   = 40   // 同層水平間距
const V_GAP   = 60   // 層級垂直間距

// ── Fetch ────────────────────────────────────────────────────────
const fetchTrees = async () => {
  try {
    trees.value = await fetch(`${BASE.value}/list`).then(r => r.json())
  } catch (e) { console.error(e) }
}

const fetchTree = async (treeId) => {
  loading.value = true
  try {
    rootNode.value = await fetch(`${BASE.value}/${treeId}/nodes`).then(r => r.json())
    collapsedIds.value = []
    panX.value = 60
    panY.value = 60
  } catch (e) { console.error(e) }
  finally { loading.value = false }
}

const selectTree = (t) => {
  currentTree.value = t
  showTreePicker.value = false
  fetchTree(t.id)
}

// ── 展開/收合 ────────────────────────────────────────────────────
const toggleCollapse = (id) => {
  const idx = collapsedIds.value.indexOf(id)
  if (idx >= 0) collapsedIds.value.splice(idx, 1)
  else collapsedIds.value.push(id)
}

const toggleAllCollapse = () => {
  if (allCollapsed.value) {
    collapsedIds.value = []
    allCollapsed.value = false
  } else {
    // 收合所有有子節點的非根節點
    const ids = []
    const collect = (node) => {
      if (node.children?.length) {
        ids.push(node.id)
        node.children.forEach(collect)
      }
    }
    if (rootNode.value) rootNode.value.children?.forEach(collect)
    collapsedIds.value = ids
    allCollapsed.value = true
  }
}

// ── 詳情 ─────────────────────────────────────────────────────────
const openDetail = (node) => {
  detailNode.value = node
}

// ── 節點 Modal ───────────────────────────────────────────────────
const nodeModal = reactive({
  show: false, isNew: true, treeId: '', parentId: '', parentLabel: '',
  editId: '',
  data: { label: '', sublabel: '', desc: '', color: '', icon: '' },
})

const openAddNode = (parentNode) => {
  nodeModal.isNew = true
  nodeModal.treeId = currentTree.value.id
  nodeModal.parentId = parentNode.id
  nodeModal.parentLabel = parentNode.label
  nodeModal.editId = ''
  nodeModal.data = { label: '', sublabel: '', desc: '', color: '', icon: '' }
  nodeModal.show = true
}

const openEditNode = (node) => {
  nodeModal.isNew = false
  nodeModal.treeId = currentTree.value.id
  nodeModal.editId = node.id
  nodeModal.parentLabel = ''
  nodeModal.data = {
    label:    node.label    || '',
    sublabel: node.sublabel || '',
    desc:     node.desc     || '',
    color:    node.color    || '',
    icon:     node.icon     || '',
  }
  nodeModal.show = true
  detailNode.value = null
}

const saveNode = async () => {
  if (!nodeModal.data.label.trim()) { showToast('名稱不能為空'); return }
  try {
    if (nodeModal.isNew) {
      const newNode = await fetch(`${BASE.value}/${nodeModal.treeId}/nodes/add`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...nodeModal.data, parentId: nodeModal.parentId }),
      }).then(r => r.json())
      // 插入到樹中（直接更新 rootNode 避免重新 fetch）
      insertNodeInTree(rootNode.value, nodeModal.parentId, { ...newNode, children: [] })
    } else {
      await fetch(`${BASE.value}/${nodeModal.treeId}/nodes/update/${nodeModal.editId}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(nodeModal.data),
      })
      updateNodeInTree(rootNode.value, nodeModal.editId, nodeModal.data)
    }
    nodeModal.show = false
    showToast(nodeModal.isNew ? '已新增節點' : '已儲存')
  } catch (e) { console.error(e); showToast('操作失敗') }
}

// ── 刪除節點 ─────────────────────────────────────────────────────
const confirmDeleteNode = async (nodeId) => {
  if (!confirm('確定刪除此節點及所有子節點？')) return
  try {
    await fetch(`${BASE.value}/${currentTree.value.id}/nodes/delete/${nodeId}`, { method: 'DELETE' })
    removeNodeFromTree(rootNode.value, nodeId)
    if (detailNode.value?.id === nodeId) detailNode.value = null
    showToast('已刪除')
  } catch (e) { console.error(e) }
}

// ── 圖表管理 ─────────────────────────────────────────────────────
const createTreeModal = reactive({ show: false, name: '', desc: '', icon: '🌳' })
const openCreateTree = () => {
  createTreeModal.name = ''
  createTreeModal.desc = ''
  createTreeModal.icon = '🌳'
  createTreeModal.show = true
  showTreePicker.value = false
}

const doCreateTree = async () => {
  if (!createTreeModal.name.trim()) return
  try {
    const t = await fetch(`${BASE.value}/create`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: createTreeModal.name, desc: createTreeModal.desc, icon: createTreeModal.icon }),
    }).then(r => r.json())
    trees.value.push(t)
    createTreeModal.show = false
    selectTree(t)
    showToast('已建立圖表')
  } catch (e) { console.error(e) }
}

const confirmDeleteTree = async (treeId) => {
  if (!confirm('確定刪除此圖表？')) return
  try {
    await fetch(`${BASE.value}/delete/${treeId}`, { method: 'DELETE' })
    trees.value = trees.value.filter(t => t.id !== treeId)
    if (currentTree.value?.id === treeId) { currentTree.value = null; rootNode.value = null }
    showToast('已刪除圖表')
  } catch (e) { console.error(e) }
}

// ── 拖曳移動 ─────────────────────────────────────────────────────
const onDragStart = (nodeId) => { dragNodeId.value = nodeId }
const onDragOver  = (nodeId) => { dragOverId.value = nodeId }
const onDragDrop  = async (targetId) => {
  const src = dragNodeId.value
  dragOverId.value = ''
  dragNodeId.value = ''
  if (!src || src === targetId) return
  // 防止拖到自己子孫
  if (isDescendant(rootNode.value, src, targetId)) return
  try {
    await fetch(`${BASE.value}/${currentTree.value.id}/nodes/move/${src}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ newParentId: targetId, newOrder: 999 }),
    })
    await fetchTree(currentTree.value.id)
    showToast('已移動')
  } catch (e) { console.error(e) }
}

// ── 邊線 layout 回調 ─────────────────────────────────────────────
const onLayoutDone = ({ w, h, edgeList }) => {
  svgW.value = w + 120
  svgH.value = h + 120
  edges.value = edgeList
}

// ── Pan / Wheel ──────────────────────────────────────────────────
const startPan = (e) => {
  if (e.target !== canvasWrapRef.value && !e.target.classList.contains('canvas-bg')) return
  isPanning.value = true
  lastMouse.value = { x: e.clientX, y: e.clientY }
}
const doPan = (e) => {
  if (!isPanning.value) return
  panX.value += e.clientX - lastMouse.value.x
  panY.value += e.clientY - lastMouse.value.y
  lastMouse.value = { x: e.clientX, y: e.clientY }
}
const endPan = () => { isPanning.value = false }
const onWheel = (e) => {
  const delta = e.deltaY > 0 ? -0.08 : 0.08
  zoom.value = Math.max(0.2, Math.min(2.5, zoom.value + delta))
}

// ── 樹操作工具函式 ───────────────────────────────────────────────
function insertNodeInTree(node, parentId, newNode) {
  if (!node) return false
  if (node.id === parentId) { node.children.push(newNode); return true }
  return node.children?.some(c => insertNodeInTree(c, parentId, newNode))
}
function updateNodeInTree(node, id, data) {
  if (!node) return
  if (node.id === id) { Object.assign(node, data); return }
  node.children?.forEach(c => updateNodeInTree(c, id, data))
}
function removeNodeFromTree(node, id) {
  if (!node) return
  node.children = (node.children || []).filter(c => c.id !== id)
  node.children.forEach(c => removeNodeFromTree(c, id))
}
function isDescendant(root, ancestorId, targetId) {
  // 檢查 targetId 是否是 ancestorId 的子孫
  function findAndCheck(node) {
    if (!node) return false
    if (node.id === ancestorId) {
      return containsId(node, targetId)
    }
    return node.children?.some(findAndCheck)
  }
  function containsId(node, id) {
    if (node.id === id) return true
    return node.children?.some(c => containsId(c, id))
  }
  return findAndCheck(root)
}

// ── 點擊外部收合下拉 ─────────────────────────────────────────────
onMounted(() => {
  fetchTrees()
  document.addEventListener('click', (e) => {
    if (treePickerRef.value && !treePickerRef.value.contains(e.target)) {
      showTreePicker.value = false
    }
  })
})

// ── Toast ────────────────────────────────────────────────────────
const toast = reactive({ show: false, message: '' })
const showToast = (msg) => {
  toast.message = msg; toast.show = true
  setTimeout(() => toast.show = false, 2500)
}
</script>

<style scoped>
.slide-right-enter-active, .slide-right-leave-active {
  transition: transform 0.25s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.2s;
}
.slide-right-enter-from, .slide-right-leave-to {
  transform: translateX(100%);
  opacity: 0;
}
.fade-enter-active, .fade-leave-active { transition: opacity 0.25s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>
