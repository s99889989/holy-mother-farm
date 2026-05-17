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
              <div class="flex items-center justify-between mb-4">
                <h3 class="text-sm font-semibold text-stone-700 dark:text-stone-200 flex items-center gap-2">
                  <span class="w-5 h-5 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 flex items-center justify-center text-xs font-bold">✓</span>
                  執行步驟
                </h3>
                <!-- 切換顯示模式（有分支時才顯示） -->
                <button v-if="hasBranches(selectedRule.steps)"
                        @click="flowMode = !flowMode"
                        :class="[
                          'flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors',
                          flowMode
                            ? 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 border-amber-300 dark:border-amber-700'
                            : 'bg-white dark:bg-zinc-800 text-stone-500 dark:text-stone-400 border-stone-200 dark:border-stone-700 hover:border-amber-300 dark:hover:border-amber-700'
                        ]">
                  <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                          d="M4 6h16M4 12h10M4 18h6M16 12l4-4m0 0l-4-4m4 4H10"/>
                  </svg>
                  {{ flowMode ? '列表模式' : '流程圖' }}
                </button>
              </div>

              <!-- 流程圖模式 -->
              <SopFlowChart v-if="flowMode && hasBranches(selectedRule.steps)"
                            :steps="selectedRule.steps"
                            :dark="isDark" />

              <!-- 列表模式（原本） -->
              <ol v-else class="space-y-3">
                <template v-for="(step, idx) in selectedRule.steps" :key="idx">
                  <!-- 一般步驟 -->
                  <li v-if="!step.condition" class="flex gap-3">
                    <span class="w-7 h-7 rounded-full bg-amber-600 text-white text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">{{ getStepNumber(selectedRule.steps, idx) }}</span>
                    <div class="flex-1 bg-white dark:bg-zinc-800 rounded-xl px-4 py-3 text-sm text-stone-700 dark:text-stone-200 leading-relaxed shadow-sm border border-stone-100 dark:border-stone-700">
                      {{ step.text }}
                    </div>
                  </li>
                  <!-- 判斷分支步驟 -->
                  <li v-else class="flex gap-3">
                    <span class="w-7 h-7 rounded bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 text-base flex items-center justify-center flex-shrink-0 mt-0.5">⬦</span>
                    <div class="flex-1">
                      <div class="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl px-4 py-3 mb-2">
                        <p class="text-sm font-semibold text-amber-800 dark:text-amber-300">{{ step.condition }}</p>
                        <p v-if="step.text" class="text-xs text-amber-600 dark:text-amber-500 mt-1">{{ step.text }}</p>
                      </div>
                      <div class="space-y-2 pl-3">
                        <div v-for="(branch, bi) in step.branches" :key="bi"
                             :class="[
                               'rounded-xl border px-3 py-2.5',
                               bi === 0 ? 'border-teal-200 dark:border-teal-800 bg-teal-50/50 dark:bg-teal-900/10' :
                               bi === 1 ? 'border-red-200 dark:border-red-800 bg-red-50/50 dark:bg-red-900/10' :
                               'border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-zinc-800/50'
                             ]">
                          <p :class="[
                            'text-xs font-semibold mb-2',
                            bi === 0 ? 'text-teal-700 dark:text-teal-400' :
                            bi === 1 ? 'text-red-600 dark:text-red-400' : 'text-stone-600 dark:text-stone-400'
                          ]">→ {{ branch.label }}</p>
                          <ol v-if="branch.steps && branch.steps.length > 0" class="space-y-1.5">
                            <li v-for="(sub, si) in branch.steps" :key="si" class="flex gap-2 text-sm text-stone-600 dark:text-stone-300">
                              <span class="text-stone-400 flex-shrink-0">{{ si + 1 }}.</span>
                              <span class="leading-relaxed">{{ sub.text }}</span>
                            </li>
                          </ol>
                          <p v-else class="text-xs text-stone-400 italic">（無子步驟）</p>
                        </div>
                      </div>
                    </div>
                  </li>
                </template>
              </ol>
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
              <span class="text-xs text-stone-400">({{ filteredRulesInCategory(cat.id).length }})</span>
            </div>
            <div class="space-y-2">
              <div v-for="rule in filteredRulesInCategory(cat.id)" :key="rule.id"
                   class="bg-white dark:bg-zinc-900 rounded-2xl border border-stone-200 dark:border-stone-700 overflow-hidden shadow-sm">
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

                  <!-- 步驟（手機版流程圖切換） -->
                  <div v-if="rule.steps && rule.steps.length > 0" class="mb-4">
                    <div class="flex items-center justify-between mb-2.5">
                      <p class="text-xs font-semibold text-stone-500 dark:text-stone-400">執行步驟</p>
                      <button v-if="hasBranches(rule.steps)"
                              @click.stop="toggleMobileFlow(rule.id)"
                              :class="[
                                'text-xs px-2 py-0.5 rounded-md border transition-colors',
                                mobileFlowIds.includes(rule.id)
                                  ? 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 border-amber-300 dark:border-amber-700'
                                  : 'text-stone-400 border-stone-200 dark:border-stone-700'
                              ]">
                        {{ mobileFlowIds.includes(rule.id) ? '列表' : '流程圖' }}
                      </button>
                    </div>

                    <!-- 手機流程圖 -->
                    <SopFlowChart v-if="mobileFlowIds.includes(rule.id) && hasBranches(rule.steps)"
                                  :steps="rule.steps"
                                  :dark="isDark"
                                  compact />

                    <!-- 手機列表 -->
                    <template v-else>
                      <ol class="space-y-2">
                        <template v-for="(step, idx) in rule.steps" :key="idx">
                          <li v-if="!step.condition" class="flex gap-2.5">
                            <span class="w-6 h-6 rounded-full bg-amber-600 text-white text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">{{ getStepNumber(rule.steps, idx) }}</span>
                            <p class="text-sm text-stone-700 dark:text-stone-200 leading-relaxed pt-0.5">{{ step.text }}</p>
                          </li>
                          <li v-else class="flex gap-2.5">
                            <span class="w-6 h-6 rounded bg-amber-100 dark:bg-amber-900/30 text-amber-600 text-sm flex items-center justify-center flex-shrink-0">⬦</span>
                            <div class="flex-1">
                              <p class="text-sm font-semibold text-amber-700 dark:text-amber-300 mb-1.5">{{ step.condition }}</p>
                              <div class="space-y-1.5 pl-2">
                                <div v-for="(branch, bi) in step.branches" :key="bi"
                                     :class="[
                                       'rounded-lg border px-2.5 py-2',
                                       bi === 0 ? 'border-teal-200 dark:border-teal-800 bg-teal-50/50 dark:bg-teal-900/10' :
                                       bi === 1 ? 'border-red-200 dark:border-red-800 bg-red-50/50 dark:bg-red-900/10' :
                                       'border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-zinc-800/50'
                                     ]">
                                  <p :class="[
                                    'text-xs font-semibold mb-1',
                                    bi === 0 ? 'text-teal-700 dark:text-teal-400' :
                                    bi === 1 ? 'text-red-600 dark:text-red-400' : 'text-stone-600 dark:text-stone-400'
                                  ]">→ {{ branch.label }}</p>
                                  <ol v-if="branch.steps && branch.steps.length > 0" class="space-y-1">
                                    <li v-for="(sub, si) in branch.steps" :key="si" class="flex gap-1.5 text-xs text-stone-600 dark:text-stone-300">
                                      <span class="text-stone-400 flex-shrink-0">{{ si + 1 }}.</span>
                                      <span>{{ sub.text }}</span>
                                    </li>
                                  </ol>
                                </div>
                              </div>
                            </div>
                          </li>
                        </template>
                      </ol>
                    </template>
                  </div>

                  <!-- 注意 -->
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
          </div>
        </template>
      </div>
    </template>
  </div>
</template>

<script setup>
definePageMeta({layout: 'book'})

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
const flowMode = ref(false)       // 桌機：是否顯示流程圖
const mobileFlowIds = ref([])          // 手機：哪些規則展示流程圖

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
  const p = {critical: 0, important: 1, normal: 2}
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
      r.steps?.some(s => (s.text || s).toString().toLowerCase().includes(q)) ||
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

// ── 工具函數 ──────────────────────────────────────────────────────
// 計算非分支步驟的序號
const getStepNumber = (steps, targetIdx) => {
  let n = 0
  for (let i = 0; i <= targetIdx; i++) {
    if (!steps[i].condition) n++
  }
  return n
}

// 是否含有分支步驟
const hasBranches = (steps) => steps?.some(s => s.condition)

// ── 操作 ──────────────────────────────────────────────────────────
const selectRule = (rule) => {
  selectedRuleId.value = rule.id
  flowMode.value = false  // 切換規則時回到列表模式
}

const toggleExpand = (id) => {
  const idx = expandedIds.value.indexOf(id)
  if (idx >= 0) expandedIds.value.splice(idx, 1)
  else expandedIds.value.push(id)
}

const toggleMobileFlow = (id) => {
  const idx = mobileFlowIds.value.indexOf(id)
  if (idx >= 0) mobileFlowIds.value.splice(idx, 1)
  else mobileFlowIds.value.push(id)
}

onMounted(fetchAll)
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
