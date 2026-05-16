<template>
  <div class="min-h-screen bg-stone-50 dark:bg-zinc-900 transition-colors duration-300 flex flex-col">

    <!-- ── Header ── -->
    <header id="sop-header" class="bg-white dark:bg-zinc-900 border-b border-stone-200 dark:border-stone-700 px-4 py-3 flex-shrink-0 z-30">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2">
          <div class="w-8 h-8 rounded-lg bg-amber-600 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">流</div>
          <div>
            <h1 class="font-bold text-stone-800 dark:text-stone-100 leading-none text-sm sm:text-base">作業流程</h1>
            <p class="text-xs text-stone-400 mt-0.5 hidden sm:block">SOP 查閱</p>
          </div>
        </div>
        <div class="flex items-center gap-2">
          <div class="relative">
            <svg class="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-stone-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
            <input v-model="searchText" placeholder="搜尋…"
                   class="pl-8 pr-3 py-1.5 text-xs rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-zinc-800 text-stone-800 dark:text-stone-100 outline-none focus:ring-2 focus:ring-amber-400 w-36 sm:w-48" />
          </div>
          <button @click="toggleDark" :title="isDark ? '開燈' : '關燈'"
                  class="w-8 h-8 flex items-center justify-center rounded-lg border border-stone-200 dark:border-stone-700 text-stone-500 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-zinc-800 transition-colors">
            <svg v-if="!isDark" class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"/></svg>
            <svg v-else class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707M17.657 17.657l-.707-.707M6.343 6.343l-.707-.707M12 8a4 4 0 100 8 4 4 0 000-8z"/></svg>
          </button>
        </div>
      </div>
    </header>

    <!-- 載入中 -->
    <div v-if="loading" class="flex-1 flex items-center justify-center gap-2 text-stone-400">
      <div class="w-5 h-5 border-2 border-amber-600 border-t-transparent rounded-full animate-spin"></div>
      載入中…
    </div>

    <template v-else>
      <!-- ════════ 桌機：左側目錄 + 右側內容 ════════ -->
      <div class="hidden md:flex flex-1 overflow-hidden">

        <!-- 左側目錄 -->
        <aside class="w-64 flex-shrink-0 border-r border-stone-200 dark:border-stone-700 bg-white dark:bg-zinc-900 overflow-y-auto">
          <div class="p-3">
            <p class="text-xs font-semibold text-stone-400 uppercase tracking-wider px-2 mb-2">目錄</p>
            <nav class="space-y-0.5">
              <template v-for="cat in categoriesWithRules" :key="cat.id">
                <div class="px-2 pt-3 pb-1">
                  <div class="flex items-center gap-1.5">
                    <span class="text-sm">{{ cat.icon }}</span>
                    <span class="text-xs font-semibold text-stone-500 dark:text-stone-400">{{ cat.name }}</span>
                  </div>
                </div>
                <button v-for="rule in filteredRulesInCategory(cat.id)" :key="rule.id"
                        @click="selectRule(rule)"
                        :class="[
                          'w-full text-left px-3 py-2 rounded-lg text-sm transition-colors flex items-center gap-2',
                          selectedRuleId === rule.id
                            ? 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 font-medium'
                            : 'text-stone-600 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-zinc-800'
                        ]">
                  <span :class="[
                    'w-1.5 h-1.5 rounded-full flex-shrink-0',
                    rule.priority === 'critical' ? 'bg-red-500' :
                    rule.priority === 'important' ? 'bg-amber-500' : 'bg-stone-300 dark:bg-stone-600'
                  ]"></span>
                  <span class="truncate">{{ rule.title }}</span>
                  <span v-if="rule.pinned" class="text-xs flex-shrink-0">📌</span>
                </button>
              </template>
              <p v-if="searchText && totalFilteredCount === 0" class="px-3 py-4 text-xs text-stone-400 text-center">找不到符合結果</p>
            </nav>
          </div>
        </aside>

        <!-- 右側內容 -->
        <main class="flex-1 overflow-y-auto bg-stone-50 dark:bg-zinc-900">
          <div v-if="!selectedRule" class="flex flex-col items-center justify-center h-full text-stone-300 dark:text-stone-600 gap-3">
            <svg class="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
            <p class="text-sm">從左側目錄選擇一個規則</p>
          </div>
          <div v-else class="max-w-2xl mx-auto px-8 py-8">
            <!-- 標題區 -->
            <div class="mb-6">
              <div class="flex items-center gap-2 mb-3">
                <span v-if="selectedCat" class="px-2 py-0.5 rounded-full text-xs font-medium text-white" :style="{ backgroundColor: selectedCat.color }">
                  {{ selectedCat.icon }} {{ selectedCat.name }}
                </span>
                <span :class="[
                  'px-2 py-0.5 rounded-full text-xs font-medium',
                  selectedRule.priority === 'critical' ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400' :
                  selectedRule.priority === 'important' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' :
                  'bg-stone-100 text-stone-500 dark:bg-zinc-800 dark:text-stone-400'
                ]">
                  {{ selectedRule.priority === 'critical' ? '🔴 必須遵守' : selectedRule.priority === 'important' ? '🟡 重要' : '一般' }}
                </span>
              </div>
              <h2 class="text-2xl font-bold text-stone-800 dark:text-stone-100 mb-2">{{ selectedRule.title }}</h2>
              <p v-if="selectedRule.content" class="text-stone-500 dark:text-stone-400 text-sm leading-relaxed">{{ selectedRule.content }}</p>
              <p class="text-xs text-stone-300 dark:text-stone-600 mt-2">最後更新：{{ new Date(selectedRule.updatedAt).toLocaleDateString('zh-TW') }}</p>
            </div>

            <hr class="border-stone-200 dark:border-stone-800 mb-6" />

            <!-- 執行步驟 -->
            <div v-if="selectedRule.steps && selectedRule.steps.length > 0" class="mb-6">
              <h3 class="text-sm font-semibold text-stone-700 dark:text-stone-200 mb-4 flex items-center gap-2">
                <span class="w-5 h-5 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 flex items-center justify-center text-xs font-bold">✓</span>
                執行步驟
              </h3>
              <SopStepFlow :steps="selectedRule.steps" />
            </div>

            <!-- 注意事項 -->
            <div v-if="selectedRule.warnings && selectedRule.warnings.length > 0" class="mb-6">
              <h3 class="text-sm font-semibold text-stone-700 dark:text-stone-200 mb-4 flex items-center gap-2">
                <span class="w-5 h-5 rounded-full bg-red-100 dark:bg-red-900/30 text-red-500 flex items-center justify-center text-xs font-bold">!</span>
                注意事項
              </h3>
              <ul class="space-y-2">
                <li v-for="(w, idx) in selectedRule.warnings" :key="idx"
                    class="flex gap-3 bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/30 rounded-xl px-4 py-3">
                  <span class="text-red-400 flex-shrink-0 mt-0.5">⚠</span>
                  <p class="text-sm text-red-700 dark:text-red-300 leading-relaxed">{{ w }}</p>
                </li>
              </ul>
            </div>

            <!-- 備註 -->
            <div v-if="selectedRule.note" class="bg-stone-100 dark:bg-zinc-800 rounded-xl px-4 py-3 text-sm text-stone-500 dark:text-stone-400 italic">
              備註：{{ selectedRule.note }}
            </div>
          </div>
        </main>
      </div>

      <!-- ════════ 手機：折疊清單 ════════ -->
      <div class="md:hidden flex-1 px-3 py-4 space-y-2 overflow-y-auto">
        <div v-if="searchText && totalFilteredCount === 0" class="text-center py-12 text-stone-400 text-sm">找不到符合結果</div>
        <template v-for="cat in categoriesWithRules" :key="cat.id">
          <div v-if="filteredRulesInCategory(cat.id).length > 0">
            <div class="flex items-center gap-2 px-1 mb-2 mt-5 first:mt-1">
              <span>{{ cat.icon }}</span>
              <h2 class="font-semibold text-stone-700 dark:text-stone-200 text-sm">{{ cat.name }}</h2>
            </div>
            <div v-for="rule in filteredRulesInCategory(cat.id)" :key="rule.id"
                 class="bg-white dark:bg-zinc-900 rounded-2xl border border-stone-100 dark:border-stone-800 shadow-sm mb-2 overflow-hidden">
              <button @click="toggleExpand(rule.id)"
                      class="w-full flex items-center justify-between px-4 py-3.5 text-left">
                <div class="flex items-center gap-2.5 min-w-0">
                  <span :class="[
                    'w-2 h-2 rounded-full flex-shrink-0',
                    rule.priority === 'critical' ? 'bg-red-500' :
                    rule.priority === 'important' ? 'bg-amber-500' : 'bg-stone-300 dark:bg-stone-600'
                  ]"></span>
                  <span class="font-medium text-stone-800 dark:text-stone-100 text-sm truncate">{{ rule.title }}</span>
                  <span v-if="rule.pinned" class="text-xs flex-shrink-0">📌</span>
                </div>
                <svg :class="['w-4 h-4 text-stone-400 flex-shrink-0 transition-transform duration-200 ml-2', expandedIds.includes(rule.id) ? 'rotate-180' : '']"
                     fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
                </svg>
              </button>
              <div v-if="expandedIds.includes(rule.id)" class="px-4 pb-4 border-t border-stone-100 dark:border-stone-800">
                <p v-if="rule.content" class="text-sm text-stone-500 dark:text-stone-400 mt-3 mb-4 leading-relaxed">{{ rule.content }}</p>
                <div v-if="rule.steps && rule.steps.length > 0" class="mb-4">
                  <p class="text-xs font-semibold text-stone-500 dark:text-stone-400 mb-2.5">執行步驟</p>
                  <SopStepFlow :steps="rule.steps" compact />
                </div>
                <div v-if="rule.warnings && rule.warnings.length > 0" class="mb-3">
                  <p class="text-xs font-semibold text-stone-500 dark:text-stone-400 mb-2">注意事項</p>
                  <ul class="space-y-1.5">
                    <li v-for="(w, idx) in rule.warnings" :key="idx"
                        class="flex gap-2 bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/20 rounded-xl px-3 py-2">
                      <span class="text-red-400 text-xs mt-0.5 flex-shrink-0">⚠</span>
                      <p class="text-xs text-red-700 dark:text-red-300 leading-relaxed">{{ w }}</p>
                    </li>
                  </ul>
                </div>
                <p v-if="rule.note" class="text-xs text-stone-400 italic mt-2">備註：{{ rule.note }}</p>
              </div>
            </div>
          </div>
        </template>
      </div>
    </template>
  </div>
</template>

<script setup>
definePageMeta({ layout: 'book' })

// ── Dark Mode ─────────────────────────────────────────────────────
const darkStore = useDarkModeStore()
const isDark = computed(() => darkStore.data.dark)
const toggleDark = () => darkStore.change_dark_mode()

// ── API ──────────────────────────────────────────────────────────
const commonStore = useCommonStore()
const BASE = computed(() => commonStore.data.main_url + '/holy/sop')

// ── 狀態 ──────────────────────────────────────────────────────────
const categories = ref([])
const rules = ref([])
const loading = ref(false)
const searchText = ref('')
const selectedRuleId = ref('')
const expandedIds = ref([])

const fetchAll = async () => {
  loading.value = true
  try {
    const [cats, rs] = await Promise.all([
      fetch(`${BASE.value}/categories`).then(r => r.json()),
      fetch(`${BASE.value}/rules`).then(r => r.json()),
    ])
    categories.value = cats
    rules.value = rs
    const first = sortedRules.value[0]
    if (first) selectedRuleId.value = first.id
  } catch (e) {
    console.error(e)
  } finally {
    loading.value = false
  }
}

// ── Computed ──────────────────────────────────────────────────────
const sortedRules = computed(() => {
  const p = { critical: 0, important: 1, normal: 2 }
  return [...rules.value].sort((a, b) => {
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1
    return (p[a.priority] ?? 2) - (p[b.priority] ?? 2)
  })
})

const filteredRulesInCategory = (catId) => {
  const q = searchText.value.toLowerCase()
  return sortedRules.value.filter(r => {
    if (r.categoryId !== catId) return false
    if (!q) return true
    return r.title.toLowerCase().includes(q) ||
      r.content?.toLowerCase().includes(q) ||
      r.steps?.some(s => (s.text || s).toLowerCase?.().includes(q)) ||
      r.warnings?.some(w => w.toLowerCase().includes(q))
  })
}

const categoriesWithRules = computed(() =>
  categories.value.filter(c => filteredRulesInCategory(c.id).length > 0)
)

const totalFilteredCount = computed(() =>
  categories.value.reduce((acc, c) => acc + filteredRulesInCategory(c.id).length, 0)
)

const selectedRule = computed(() =>
  rules.value.find(r => r.id === selectedRuleId.value) || null
)

const selectedCat = computed(() =>
  categories.value.find(c => c.id === selectedRule.value?.categoryId) || null
)

const selectRule = (rule) => {
  selectedRuleId.value = rule.id
}

const toggleExpand = (id) => {
  const idx = expandedIds.value.indexOf(id)
  if (idx >= 0) expandedIds.value.splice(idx, 1)
  else expandedIds.value.push(id)
}

onMounted(fetchAll)

// ════════════════════════════════════════════════════════════════
// SopStepFlow — 遞迴步驟流程渲染元件
// 支援：一般步驟（有序號）、判斷分支節點（condition + branches）
// ════════════════════════════════════════════════════════════════
const SopStepFlow = defineComponent({
  name: 'SopStepFlow',
  props: {
    steps: {type: Array, required: true},
    compact: {type: Boolean, default: false},
    // depth: 縮排層次（0=頂層，1=分支子步驟）
    depth: {type: Number, default: 0},
    // counter: 共享序號計數（傳入陣列 [number] 以實現 pass-by-ref）
    counter: {type: Array, default: () => [0]},
  },
  setup(props) {
    // 分支顏色 class
    const branchColors = [
      'bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-400 border-teal-300 dark:border-teal-700',
      'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 border-red-300 dark:border-red-700',
      'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 border-purple-300 dark:border-purple-700',
      'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 border-blue-300 dark:border-blue-700',
    ]

    return {branchColors}
  },
  template: `
    <div :class="['flex flex-col', depth > 0 ? 'pl-3 border-l-2 border-stone-200 dark:border-stone-700' : '']">
      <template v-for="(step, i) in steps" :key="i">

        <!-- ── 連接線（非第一個） ── -->
        <div v-if="i > 0" class="w-0.5 h-4 bg-stone-200 dark:bg-stone-700 self-center"></div>

        <!-- ══ 判斷節點 ══ -->
        <template v-if="step.condition && step.condition.trim()">
          <!-- 判斷卡片 -->
          <div class="border-2 border-amber-400 dark:border-amber-600 rounded-xl px-4 py-3 bg-amber-50 dark:bg-amber-900/20">
            <div class="flex items-center gap-1.5 mb-1">
              <span class="text-amber-500 font-bold text-sm leading-none">⬦</span>
              <span class="text-xs font-semibold text-amber-700 dark:text-amber-400 uppercase tracking-wide">判斷</span>
            </div>
            <p class="text-sm font-medium text-stone-800 dark:text-stone-100 leading-snug">{{ step.condition }}</p>
            <p v-if="step.text && step.text.trim()" class="text-xs text-stone-500 dark:text-stone-400 mt-1 leading-relaxed">{{ step.text }}</p>
          </div>

          <!-- 分支群 -->
          <div v-if="step.branches && step.branches.length" class="mt-1">
            <div :class="[
              'grid gap-3',
              step.branches.length === 1 ? 'grid-cols-1' :
              step.branches.length === 2 ? 'grid-cols-2' :
              step.branches.length === 3 ? 'grid-cols-3' : 'grid-cols-2'
            ]">
              <div v-for="(branch, bi) in step.branches" :key="bi" class="flex flex-col items-center">
                <!-- 分支連線 -->
                <div class="w-0.5 h-3 bg-stone-300 dark:bg-stone-600 self-center"></div>
                <!-- 分支標籤 -->
                <span :class="['px-2 py-0.5 rounded-full text-xs font-semibold border mb-1 self-center whitespace-nowrap', branchColors[bi % branchColors.length]]">
                  {{ branch.label || '選項 ' + (bi + 1) }}
                </span>
                <!-- 分支子步驟（遞迴） -->
                <div class="w-full">
                  <SopStepFlow
                    v-if="branch.steps && branch.steps.length"
                    :steps="branch.steps"
                    :compact="compact"
                    :depth="depth + 1"
                    :counter="counter"
                  />
                  <p v-else class="text-xs text-stone-400 italic text-center py-2">（無子步驟）</p>
                </div>
              </div>
            </div>
            <!-- 分支收斂後的向下箭頭（後面還有步驟時顯示） -->
            <div v-if="i < steps.length - 1" class="flex flex-col items-center mt-1">
              <div class="w-0.5 h-3 bg-stone-200 dark:bg-stone-700"></div>
              <svg class="w-3 h-3 text-stone-400" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clip-rule="evenodd"/>
              </svg>
            </div>
          </div>
        </template>

        <!-- ══ 一般步驟 ══ -->
        <template v-else>
          <div class="flex gap-3 items-start">
            <!-- 序號（頂層才顯示自動遞增序號，子步驟顯示點） -->
            <span v-if="depth === 0" :class="[
              'rounded-full text-white text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5',
              compact ? 'w-5 h-5' : 'w-7 h-7',
              (i === steps.length - 1) ? 'bg-emerald-500' : 'bg-amber-600'
            ]">{{ ++counter[0] }}</span>
            <span v-else :class="[
              'rounded-full flex-shrink-0 mt-1.5',
              compact ? 'w-1.5 h-1.5' : 'w-2 h-2',
              'bg-stone-400 dark:bg-stone-500'
            ]"></span>
            <!-- 步驟內文 -->
            <div :class="[
              'flex-1 bg-white dark:bg-zinc-800 rounded-xl px-4 py-3',
              'text-stone-700 dark:text-stone-200 leading-relaxed shadow-sm',
              'border border-stone-100 dark:border-stone-700',
              compact ? 'text-xs' : 'text-sm'
            ]">{{ step.text || step }}</div>
          </div>
        </template>

      </template>
    </div>
  `,
})
</script>

<style scoped>
.scrollbar-none::-webkit-scrollbar {
  display: none;
}

.scrollbar-none {
  -ms-overflow-style: none;
  scrollbar-width: none;
}
</style>
