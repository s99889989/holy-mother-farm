<template>
  <div class="min-h-screen bg-stone-50 dark:bg-zinc-900 transition-colors duration-300">

    <!-- ── Header ── -->
    <header class="bg-white dark:bg-zinc-900 border-b border-stone-200 dark:border-stone-700 px-4 py-3 sticky top-0 z-30">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2">
          <div class="w-8 h-8 rounded-lg bg-amber-600 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">流</div>
          <div>
            <h1 class="font-bold text-stone-800 dark:text-stone-100 leading-none text-sm sm:text-base">流程管理</h1>
            <p class="text-xs text-stone-400 mt-0.5 hidden sm:block">SOP 編輯</p>
          </div>
        </div>
        <div class="flex items-center gap-2">
          <button @click="toggleDark" :title="isDark ? '開燈' : '關燈'"
                  class="w-8 h-8 flex items-center justify-center rounded-lg border border-stone-200 dark:border-stone-700 text-stone-500 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-zinc-800 transition-colors">
            <svg v-if="!isDark" class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"/></svg>
            <svg v-else class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707M17.657 17.657l-.707-.707M6.343 6.343l-.707-.707M12 8a4 4 0 100 8 4 4 0 000-8z"/></svg>
          </button>
          <button @click="openCategoryModal"
                  class="w-8 h-8 sm:w-auto sm:h-auto flex items-center justify-center sm:gap-1.5 sm:px-3 sm:py-1.5 text-xs font-medium text-stone-600 dark:text-stone-300 border border-stone-300 dark:border-stone-600 rounded-lg hover:bg-stone-50 dark:hover:bg-zinc-800 transition-colors">
            <svg class="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"/></svg>
            <span class="hidden sm:inline">管理分類</span>
          </button>
          <button @click="openRuleModal(null)"
                  class="w-8 h-8 sm:w-auto sm:h-auto flex items-center justify-center sm:gap-1.5 sm:px-3 sm:py-1.5 text-xs font-medium bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors">
            <svg class="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
            <span class="hidden sm:inline">新增規則</span>
          </button>
        </div>
      </div>
    </header>

    <!-- 載入中 -->
    <div v-if="loading" class="flex items-center justify-center py-24 gap-2 text-stone-400">
      <div class="w-5 h-5 border-2 border-amber-600 border-t-transparent rounded-full animate-spin"></div>
      載入中…
    </div>

    <div v-else class="max-w-3xl mx-auto px-3 sm:px-4 py-4">

      <!-- 分類 tabs -->
      <div class="flex gap-2 overflow-x-auto pb-2 mb-4 scrollbar-none">
        <button @click="activeCategory = ''"
                :class="activeCategory === '' ? 'bg-amber-600 text-white' : 'bg-white dark:bg-zinc-900 text-stone-600 dark:text-stone-300 border border-stone-200 dark:border-stone-700'"
                class="px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors flex-shrink-0">
          全部 ({{ rules.length }})
        </button>
        <button v-for="cat in categories" :key="cat.id"
                @click="activeCategory = cat.id"
                :class="activeCategory === cat.id ? 'text-white' : 'bg-white dark:bg-zinc-900 text-stone-600 dark:text-stone-300 border border-stone-200 dark:border-stone-700'"
                :style="activeCategory === cat.id ? { backgroundColor: cat.color } : {}"
                class="px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors flex-shrink-0 flex items-center gap-1.5">
          <span>{{ cat.icon }}</span>
          <span>{{ cat.name }}</span>
          <span class="opacity-70">({{ rulesInCategory(cat.id).length }})</span>
        </button>
      </div>

      <!-- 搜尋 -->
      <div class="mb-4">
        <input v-model="searchText" placeholder="搜尋規則標題、說明…"
               class="w-full px-3 py-2 text-sm rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-zinc-800 text-stone-800 dark:text-stone-100 outline-none focus:ring-2 focus:ring-amber-400" />
      </div>

      <!-- 無資料 -->
      <div v-if="filteredRules.length === 0" class="text-center py-16">
        <div class="text-4xl mb-3">📋</div>
        <p class="text-stone-400 text-sm">{{ rules.length === 0 ? '尚無規則，點擊「新增規則」開始建立' : '找不到符合條件的規則' }}</p>
      </div>

      <!-- 規則列表 -->
      <div v-else class="space-y-3">
        <div v-for="rule in filteredRules" :key="rule.id"
             :class="['bg-white dark:bg-zinc-900 rounded-2xl border shadow-sm overflow-hidden',
               rule.priority === 'critical' ? 'border-red-200 dark:border-red-800' :
               rule.priority === 'important' ? 'border-amber-200 dark:border-amber-800' :
               'border-stone-200 dark:border-stone-700']">
          <div :class="['h-1',
            rule.priority === 'critical' ? 'bg-red-400' :
            rule.priority === 'important' ? 'bg-amber-400' : 'bg-stone-200 dark:bg-stone-700']"></div>
          <div class="p-4">
            <div class="flex items-start justify-between gap-3 mb-2">
              <div class="flex items-start gap-2 min-w-0">
                <span v-if="rule.pinned" class="text-amber-500 text-xs mt-0.5 flex-shrink-0">📌</span>
                <h3 class="font-semibold text-stone-800 dark:text-stone-100 text-sm leading-snug">{{ rule.title }}</h3>
              </div>
              <div class="flex items-center gap-1.5 flex-shrink-0">
                <span v-if="getCat(rule.categoryId)" class="px-2 py-0.5 rounded-full text-xs font-medium text-white" :style="{ backgroundColor: getCat(rule.categoryId).color }">
                  {{ getCat(rule.categoryId).icon }} {{ getCat(rule.categoryId).name }}
                </span>
                <span :class="['px-2 py-0.5 rounded-full text-xs font-medium',
                  rule.priority === 'critical' ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400' :
                  rule.priority === 'important' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' :
                  'bg-stone-100 text-stone-500 dark:bg-zinc-800 dark:text-stone-400']">
                  {{ rule.priority === 'critical' ? '必須' : rule.priority === 'important' ? '重要' : '一般' }}
                </span>
              </div>
            </div>
            <p v-if="rule.content" class="text-xs text-stone-500 dark:text-stone-400 mb-2 leading-relaxed">{{ rule.content }}</p>
            <!-- 步驟預覽 -->
            <div v-if="rule.steps && rule.steps.length > 0" class="mb-2">
              <p class="text-xs text-stone-400 mb-1">{{ rule.steps.length }} 個步驟
                <span v-if="rule.steps.some(s => s.condition)" class="ml-1 text-amber-500">⬦ 含判斷分支</span>
              </p>
              <div class="flex gap-1 flex-wrap">
                <span v-for="(s, i) in rule.steps.slice(0, 3)" :key="i"
                      :class="[
                        'px-2 py-0.5 text-xs rounded-lg truncate max-w-48',
                        s.condition
                          ? 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400'
                          : 'bg-stone-50 dark:bg-zinc-800 text-stone-500 dark:text-stone-400'
                      ]">
                  {{ s.condition ? '⬦ ' + s.condition : (i + 1) + '. ' + (s.text || s) }}
                </span>
                <span v-if="rule.steps.length > 3" class="px-2 py-0.5 bg-stone-50 dark:bg-zinc-800 text-stone-400 text-xs rounded-lg">
                  +{{ rule.steps.length - 3 }} 個
                </span>
              </div>
            </div>
            <p v-if="rule.warnings && rule.warnings.length > 0" class="text-xs text-red-400 mb-3">
              ⚠ {{ rule.warnings.length }} 個注意事項
            </p>
            <div class="flex items-center justify-between mt-3">
              <span class="text-xs text-stone-300 dark:text-stone-600">{{ new Date(rule.updatedAt).toLocaleDateString('zh-TW') }}</span>
              <div class="flex gap-1.5">
                <button @click="togglePin(rule.id)"
                        :class="rule.pinned ? 'text-amber-500 border-amber-300 dark:border-amber-700' : 'text-stone-400 border-stone-200 dark:border-stone-700'"
                        class="px-2 py-1 text-xs border rounded-lg hover:bg-stone-50 dark:hover:bg-zinc-800 transition-colors">
                  {{ rule.pinned ? '取消置頂' : '置頂' }}
                </button>
                <button @click="openRuleModal(rule)"
                        class="px-2 py-1 text-xs border border-blue-300 dark:border-blue-700 text-blue-600 dark:text-blue-400 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors">編輯</button>
                <button @click="deleteRule(rule.id)"
                        class="px-2 py-1 text-xs border border-red-300 dark:border-red-700 text-red-500 dark:text-red-400 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">刪除</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- ════════ 新增/編輯規則 Modal ════════ -->
    <div v-if="ruleModal.show" class="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center z-50">
      <div class="bg-white dark:bg-zinc-900 rounded-t-3xl sm:rounded-2xl shadow-xl w-full sm:max-w-xl max-h-[94vh] overflow-y-auto">
        <div class="px-5 py-4 border-b border-stone-100 dark:border-stone-700 flex items-center justify-between sticky top-0 bg-white dark:bg-zinc-900 z-10">
          <h3 class="font-bold text-stone-800 dark:text-stone-100 text-base">{{ ruleModal.isNew ? '新增規則' : '編輯規則' }}</h3>
          <button @click="ruleModal.show = false" class="text-stone-400 hover:text-stone-600 p-1">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
        </div>
        <div class="px-5 py-4 space-y-4">

          <!-- 標題 -->
          <div>
            <label class="text-xs font-medium text-stone-600 dark:text-stone-300 block mb-1">標題 <span class="text-red-400">*</span></label>
            <input v-model="ruleModal.data.title" placeholder="例：烘焙麵包未售完處理"
                   class="w-full px-3 py-2 text-sm rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-zinc-800 text-stone-800 dark:text-stone-100 outline-none focus:ring-2 focus:ring-amber-400" />
          </div>

          <!-- 分類 + 重要程度 -->
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="text-xs font-medium text-stone-600 dark:text-stone-300 block mb-1">分類</label>
              <select v-model="ruleModal.data.categoryId"
                      class="w-full px-3 py-2 text-sm rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-zinc-800 text-stone-800 dark:text-stone-100 outline-none focus:ring-2 focus:ring-amber-400">
                <option value="">— 未分類 —</option>
                <option v-for="cat in categories" :key="cat.id" :value="cat.id">{{ cat.icon }} {{ cat.name }}</option>
              </select>
            </div>
            <div>
              <label class="text-xs font-medium text-stone-600 dark:text-stone-300 block mb-1">重要程度</label>
              <div class="flex gap-1.5">
                <button v-for="lvl in PRIORITY_LEVELS" :key="lvl.value"
                        @click="ruleModal.data.priority = lvl.value"
                        :class="ruleModal.data.priority === lvl.value ? lvl.activeClass : 'bg-stone-100 dark:bg-zinc-800 text-stone-500 dark:text-stone-400'"
                        class="flex-1 py-2 rounded-lg text-xs font-medium transition-colors">
                  {{ lvl.label }}
                </button>
              </div>
            </div>
          </div>

          <!-- 簡短說明 -->
          <div>
            <label class="text-xs font-medium text-stone-600 dark:text-stone-300 block mb-1">簡短說明</label>
            <input v-model="ruleModal.data.content" placeholder="一句話說明這條規則的目的"
                   class="w-full px-3 py-2 text-sm rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-zinc-800 text-stone-800 dark:text-stone-100 outline-none focus:ring-2 focus:ring-amber-400" />
          </div>

          <!-- ── 執行步驟（新版：支援分支） ── -->
          <div>
            <div class="flex items-center justify-between mb-2">
              <label class="text-xs font-medium text-stone-600 dark:text-stone-300">執行步驟</label>
              <div class="flex gap-2">
                <button @click="addStep('normal')"
                        class="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-0.5 hover:text-amber-700 transition-colors">
                  <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
                  一般步驟
                </button>
                <button @click="addStep('branch')"
                        class="text-xs text-amber-500 flex items-center gap-0.5 hover:text-amber-600 transition-colors border border-amber-300 dark:border-amber-700 px-1.5 py-0.5 rounded-md">
                  ⬦ 判斷分支
                </button>
              </div>
            </div>

            <div class="space-y-3">
              <div v-if="ruleModal.data.steps.length === 0"
                   class="text-xs text-stone-400 text-center py-4 border border-dashed border-stone-200 dark:border-stone-700 rounded-xl">
                點擊右上角按鈕加入步驟
              </div>

              <!-- 逐個步驟渲染 -->
              <div v-for="(step, idx) in ruleModal.data.steps" :key="idx"
                   :class="[
                     'rounded-xl border overflow-hidden',
                     step.condition
                       ? 'border-amber-300 dark:border-amber-700 bg-amber-50/50 dark:bg-amber-900/10'
                       : 'border-stone-200 dark:border-stone-700 bg-white dark:bg-zinc-800/50'
                   ]">

                <!-- 步驟 Header -->
                <div class="flex items-center gap-2 px-3 py-2 border-b border-stone-100 dark:border-stone-700/50">
                  <!-- 類型徽章 -->
                  <span v-if="!step.condition"
                        class="w-5 h-5 rounded-full bg-amber-600 text-white text-xs font-bold flex items-center justify-center flex-shrink-0">
                    {{ getStepNumber(idx) }}
                  </span>
                  <span v-else class="text-amber-500 font-bold text-sm leading-none flex-shrink-0">⬦</span>
                  <span class="text-xs text-stone-500 dark:text-stone-400 flex-1">
                    {{ step.condition ? '判斷分支' : '一般步驟' }}
                  </span>
                  <!-- 上移/下移 -->
                  <button v-if="idx > 0" @click="moveStep(idx, -1)"
                          class="text-stone-300 hover:text-stone-500 dark:hover:text-stone-300 p-0.5 transition-colors" title="上移">
                    <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 15l7-7 7 7"/></svg>
                  </button>
                  <button v-if="idx < ruleModal.data.steps.length - 1" @click="moveStep(idx, 1)"
                          class="text-stone-300 hover:text-stone-500 dark:hover:text-stone-300 p-0.5 transition-colors" title="下移">
                    <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/></svg>
                  </button>
                  <button @click="removeStep(idx)" class="text-stone-300 hover:text-red-400 p-0.5 transition-colors">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
                  </button>
                </div>

                <!-- 步驟內容 -->
                <div class="px-3 py-2.5 space-y-2.5">

                  <!-- 一般步驟：只有 text -->
                  <template v-if="!step.condition && (!step.branches || step.branches.length === 0)">
                    <input v-model="step.text" :placeholder="`步驟 ${getStepNumber(idx)} 內容`"
                           class="w-full px-3 py-2 text-sm rounded-lg border border-stone-200 dark:border-stone-600 bg-white dark:bg-zinc-800 text-stone-800 dark:text-stone-100 outline-none focus:ring-2 focus:ring-amber-400" />
                    <button @click="convertToBranch(idx)"
                            class="text-xs text-stone-400 hover:text-amber-600 dark:hover:text-amber-400 transition-colors flex items-center gap-1">
                      <span class="text-amber-400">⬦</span> 轉換成判斷分支
                    </button>
                  </template>

                  <!-- 判斷分支步驟 -->
                  <template v-else>
                    <!-- 判斷條件說明 -->
                    <div>
                      <label class="text-xs text-stone-500 dark:text-stone-400 mb-1 block">判斷條件</label>
                      <input v-model="step.condition" placeholder="例：數量是否足夠？"
                             class="w-full px-3 py-2 text-sm rounded-lg border border-amber-300 dark:border-amber-700 bg-white dark:bg-zinc-800 text-stone-800 dark:text-stone-100 outline-none focus:ring-2 focus:ring-amber-400" />
                    </div>
                    <!-- 補充說明（可選） -->
                    <div>
                      <label class="text-xs text-stone-500 dark:text-stone-400 mb-1 block">補充說明（選填）</label>
                      <input v-model="step.text" placeholder="對這個判斷點的額外說明…"
                             class="w-full px-3 py-2 text-sm rounded-lg border border-stone-200 dark:border-stone-600 bg-white dark:bg-zinc-800 text-stone-800 dark:text-stone-100 outline-none focus:ring-2 focus:ring-amber-400" />
                    </div>
                    <!-- 分支列表 -->
                    <div>
                      <div class="flex items-center justify-between mb-2">
                        <label class="text-xs text-stone-500 dark:text-stone-400">分支選項</label>
                        <button @click="addBranch(idx)"
                                class="text-xs text-teal-600 dark:text-teal-400 hover:text-teal-700 flex items-center gap-0.5 transition-colors">
                          <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
                          新增分支
                        </button>
                      </div>
                      <div class="space-y-2">
                        <div v-if="!step.branches || step.branches.length === 0"
                             class="text-xs text-stone-400 text-center py-2 border border-dashed border-stone-200 dark:border-stone-700 rounded-lg">
                          點擊「新增分支」加入選項
                        </div>
                        <div v-for="(branch, bi) in step.branches" :key="bi"
                             :class="[
                               'rounded-lg border p-2.5',
                               bi === 0 ? 'border-teal-200 dark:border-teal-800 bg-teal-50/50 dark:bg-teal-900/10' :
                               bi === 1 ? 'border-red-200 dark:border-red-800 bg-red-50/50 dark:bg-red-900/10' :
                               'border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-zinc-800/50'
                             ]">
                          <!-- 分支標籤 -->
                          <div class="flex items-center gap-2 mb-2">
                            <span :class="[
                              'w-4 h-4 rounded-full text-white text-xs font-bold flex items-center justify-center flex-shrink-0',
                              bi === 0 ? 'bg-teal-500' : bi === 1 ? 'bg-red-400' : 'bg-stone-400'
                            ]">{{ bi + 1 }}</span>
                            <input v-model="branch.label" placeholder="分支標籤，例：是 / 否 / 數量不足"
                                   class="flex-1 px-2 py-1 text-xs rounded-lg border border-stone-200 dark:border-stone-600 bg-white dark:bg-zinc-800 text-stone-800 dark:text-stone-100 outline-none focus:ring-2 focus:ring-amber-400" />
                            <button @click="removeBranch(idx, bi)" class="text-stone-300 hover:text-red-400 transition-colors p-0.5">
                              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
                            </button>
                          </div>
                          <!-- 分支子步驟 -->
                          <div class="space-y-1.5 pl-2 border-l-2 border-stone-200 dark:border-stone-700">
                            <div v-for="(subStep, si) in branch.steps" :key="si" class="flex gap-1.5 items-start">
                              <span class="text-stone-400 text-xs mt-2 flex-shrink-0">{{ si + 1 }}.</span>
                              <input v-model="branch.steps[si].text" :placeholder="`子步驟 ${si + 1}`"
                                     class="flex-1 px-2 py-1.5 text-xs rounded-lg border border-stone-200 dark:border-stone-600 bg-white dark:bg-zinc-800 text-stone-800 dark:text-stone-100 outline-none focus:ring-2 focus:ring-amber-400" />
                              <button @click="removeSubStep(idx, bi, si)" class="text-stone-300 hover:text-red-400 transition-colors mt-1.5 p-0.5">
                                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
                              </button>
                            </div>
                            <button @click="addSubStep(idx, bi)"
                                    class="text-xs text-stone-400 hover:text-stone-600 dark:hover:text-stone-300 flex items-center gap-0.5 mt-1 transition-colors">
                              <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
                              加入子步驟
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </template>

                </div>
              </div>
            </div>
          </div>

          <!-- 注意事項 -->
          <div>
            <div class="flex items-center justify-between mb-2">
              <label class="text-xs font-medium text-stone-600 dark:text-stone-300">注意事項</label>
              <button @click="addWarning"
                      class="text-xs text-red-500 flex items-center gap-0.5 hover:text-red-600 transition-colors">
                <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
                新增注意
              </button>
            </div>
            <div class="space-y-2">
              <div v-if="ruleModal.data.warnings.length === 0" class="text-xs text-stone-400 text-center py-3 border border-dashed border-stone-200 dark:border-stone-700 rounded-xl">
                點擊「新增注意」加入注意事項
              </div>
              <div v-for="(w, idx) in ruleModal.data.warnings" :key="idx" class="flex gap-2 items-start">
                <span class="text-red-400 mt-2.5 flex-shrink-0 text-sm">⚠</span>
                <input v-model="ruleModal.data.warnings[idx]" :placeholder="`注意事項 ${idx + 1}`"
                       class="flex-1 px-3 py-2 text-sm rounded-xl border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-900/10 text-stone-800 dark:text-stone-100 outline-none focus:ring-2 focus:ring-red-300" />
                <button @click="removeWarning(idx)" class="text-stone-300 hover:text-red-400 transition-colors mt-2 p-1">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
                </button>
              </div>
            </div>
          </div>

          <!-- 備註 -->
          <div>
            <label class="text-xs font-medium text-stone-600 dark:text-stone-300 block mb-1">備註（選填）</label>
            <input v-model="ruleModal.data.note" placeholder="補充說明、例外情形…"
                   class="w-full px-3 py-2 text-sm rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-zinc-800 text-stone-800 dark:text-stone-100 outline-none focus:ring-2 focus:ring-amber-400" />
          </div>
        </div>
        <div class="px-5 py-4 border-t border-stone-100 dark:border-stone-700 flex gap-2 justify-end">
          <button @click="ruleModal.show = false"
                  class="px-4 py-2 text-sm bg-stone-100 dark:bg-zinc-800 text-stone-600 dark:text-stone-300 rounded-xl hover:bg-stone-200 transition-colors">取消</button>
          <button @click="saveRule"
                  class="px-4 py-2 text-sm bg-amber-600 text-white rounded-xl hover:bg-amber-700 transition-colors">
            {{ ruleModal.isNew ? '新增' : '儲存' }}
          </button>
        </div>
      </div>
    </div>

    <!-- ════════ 分類管理 Modal ════════ -->
    <div v-if="categoryModal.show" class="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center z-50">
      <div class="bg-white dark:bg-zinc-900 rounded-t-3xl sm:rounded-2xl shadow-xl w-full sm:max-w-md max-h-[92vh] overflow-y-auto">
        <div class="px-5 py-4 border-b border-stone-100 dark:border-stone-700 flex items-center justify-between sticky top-0 bg-white dark:bg-zinc-900 z-10">
          <h3 class="font-bold text-stone-800 dark:text-stone-100 text-base">管理分類</h3>
          <button @click="categoryModal.show = false" class="text-stone-400 hover:text-stone-600 p-1">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
        </div>
        <div class="px-5 py-4">
          <div class="flex gap-1.5 flex-wrap mb-3">
            <button v-for="e in EMOJI_OPTIONS" :key="e"
                    @click="categoryModal.newIcon = e"
                    :class="categoryModal.newIcon === e ? 'ring-2 ring-amber-400 bg-amber-50 dark:bg-amber-900/20' : 'bg-stone-100 dark:bg-zinc-800'"
                    class="w-8 h-8 rounded-lg flex items-center justify-center text-base hover:bg-stone-200 dark:hover:bg-zinc-700 transition-colors">
              {{ e }}
            </button>
          </div>
          <div class="flex gap-2 mb-4">
            <input v-model="categoryModal.newName" placeholder="分類名稱…"
                   @keydown.enter.prevent="addCategory"
                   class="flex-1 px-3 py-2 text-sm rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-zinc-800 text-stone-800 dark:text-stone-100 outline-none focus:ring-2 focus:ring-amber-400" />
            <input v-model="categoryModal.newColor" type="color"
                   class="w-10 h-10 rounded-xl border border-stone-200 dark:border-stone-700 cursor-pointer p-1 bg-white" />
            <button @click="addCategory"
                    class="px-3 py-2 text-sm bg-amber-600 text-white rounded-xl hover:bg-amber-700 transition-colors">新增</button>
          </div>
          <div class="space-y-2">
            <div v-if="categories.length === 0" class="text-center py-6 text-stone-400 text-sm">尚無分類</div>
            <div v-for="cat in categories" :key="cat.id"
                 class="flex items-center gap-3 px-3 py-2.5 bg-stone-50 dark:bg-zinc-800 rounded-xl">
              <span class="text-lg">{{ cat.icon }}</span>
              <div class="w-3 h-3 rounded-full flex-shrink-0" :style="{ backgroundColor: cat.color }"></div>
              <span class="flex-1 text-sm text-stone-700 dark:text-stone-200">{{ cat.name }}</span>
              <span class="text-xs text-stone-400">{{ rulesInCategory(cat.id).length }} 條</span>
              <button @click="deleteCategory(cat.id)" class="text-stone-300 hover:text-red-400 transition-colors p-0.5">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
              </button>
            </div>
          </div>
        </div>
        <div class="px-5 py-4 border-t border-stone-100 dark:border-stone-700">
          <button @click="categoryModal.show = false"
                  class="w-full py-2 text-sm bg-stone-100 dark:bg-zinc-800 text-stone-600 dark:text-stone-300 rounded-xl hover:bg-stone-200 transition-colors">完成</button>
        </div>
      </div>
    </div>

    <!-- Toast -->
    <transition name="fade">
      <div v-if="toast.show"
           class="fixed bottom-6 left-1/2 -translate-x-1/2 sm:left-auto sm:right-6 sm:translate-x-0 bg-stone-800 text-white text-sm px-4 py-3 rounded-xl shadow-lg flex items-center gap-2 z-50">
        <svg class="w-4 h-4 text-green-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>
        {{ toast.message }}
      </div>
    </transition>
  </div>
</template>

<script setup>
definePageMeta({ layout: 'book' })

// ── Dark Mode ─────────────────────────────────────────────────────
const darkStore = useDarkModeStore()
const isDark = computed(() => darkStore.data.dark)
const toggleDark = () => darkStore.change_dark_mode()

// ── 常數 ──────────────────────────────────────────────────────────
const PRIORITY_LEVELS = [
  { value: 'normal',    label: '一般', activeClass: 'bg-stone-500 text-white' },
  { value: 'important', label: '重要', activeClass: 'bg-amber-500 text-white' },
  { value: 'critical',  label: '必須', activeClass: 'bg-red-500 text-white' },
]
const EMOJI_OPTIONS = ['🍞', '🧁', '🏪', '📦', '💰', '📋', '⚙️', '🌿', '🎁', '🚚', '🧾', '👥']

// ── API ──────────────────────────────────────────────────────────
const commonStore = useCommonStore()
const BASE = computed(() => commonStore.data.main_url + '/holy/sop')

// ── 狀態 ──────────────────────────────────────────────────────────
const categories     = ref([])
const rules          = ref([])
const loading        = ref(false)
const activeCategory = ref('')
const searchText     = ref('')

const fetchAll = async () => {
  loading.value = true
  try {
    const [cats, rs] = await Promise.all([
      fetch(`${BASE.value}/categories`).then(r => r.json()),
      fetch(`${BASE.value}/rules`).then(r => r.json()),
    ])
    categories.value = cats
    rules.value = rs
  } catch (e) {
    console.error(e)
    showToast('載入失敗')
  } finally {
    loading.value = false
  }
}

// ── Computed ──────────────────────────────────────────────────────
const sortedRules = computed(() => {
  const priority = { critical: 0, important: 1, normal: 2 }
  return [...rules.value].sort((a, b) => {
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1
    return (priority[a.priority] ?? 2) - (priority[b.priority] ?? 2)
  })
})

const filteredRules = computed(() => {
  const q = searchText.value.toLowerCase()
  return sortedRules.value.filter(r => {
    const matchCat = !activeCategory.value || r.categoryId === activeCategory.value
    const matchSearch = !q || r.title.toLowerCase().includes(q) || r.content?.toLowerCase().includes(q)
    return matchCat && matchSearch
  })
})

const rulesInCategory = (catId) => rules.value.filter(r => r.categoryId === catId)
const getCat = (id) => categories.value.find(c => c.id === id) || null

// ── 步驟序號（跳過判斷節點不計入序號） ──────────────────────────
const getStepNumber = (targetIdx) => {
  let n = 0
  for (let i = 0; i <= targetIdx; i++) {
    const s = ruleModal.data.steps[i]
    if (!s.condition) n++
  }
  return n
}

// ── 規則 Modal ────────────────────────────────────────────────────
const emptyStep = () => ({ text: '', condition: '', branches: [] })
const emptyBranch = () => ({ label: '', steps: [] })
const emptySubStep = () => ({ text: '' })

const emptyRule = () => ({
  id: '', title: '', content: '', steps: [], warnings: [],
  note: '', categoryId: activeCategory.value || '', priority: 'normal', pinned: false,
})

const ruleModal = reactive({ show: false, isNew: true, data: emptyRule() })

const openRuleModal = (rule) => {
  ruleModal.isNew = !rule
  if (rule) {
    // 深拷貝，確保分支陣列也獨立
    ruleModal.data = {
      ...rule,
      steps: (rule.steps || []).map(s => ({
        text: s.text || (typeof s === 'string' ? s : ''),
        condition: s.condition || '',
        branches: (s.branches || []).map(b => ({
          label: b.label || '',
          steps: (b.steps || []).map(sub => ({ text: sub.text || (typeof sub === 'string' ? sub : '') })),
        })),
      })),
      warnings: [...(rule.warnings || [])],
    }
  } else {
    ruleModal.data = emptyRule()
  }
  ruleModal.show = true
}

// 新增步驟
const addStep = (type) => {
  if (type === 'branch') {
    ruleModal.data.steps.push({ text: '', condition: '請填寫判斷條件', branches: [
        { label: '是', steps: [] },
        { label: '否', steps: [] },
      ]})
  } else {
    ruleModal.data.steps.push(emptyStep())
  }
}

// 一般步驟轉換成判斷分支
const convertToBranch = (idx) => {
  const s = ruleModal.data.steps[idx]
  s.condition = s.text || '請填寫判斷條件'
  s.text = ''
  s.branches = [{ label: '是', steps: [] }, { label: '否', steps: [] }]
}

const removeStep = (idx) => ruleModal.data.steps.splice(idx, 1)

const moveStep = (idx, dir) => {
  const arr = ruleModal.data.steps
  const target = idx + dir
  if (target < 0 || target >= arr.length) return
    ;[arr[idx], arr[target]] = [arr[target], arr[idx]]
}

// 分支操作
const addBranch    = (stepIdx) => ruleModal.data.steps[stepIdx].branches.push(emptyBranch())
const removeBranch = (stepIdx, bi) => ruleModal.data.steps[stepIdx].branches.splice(bi, 1)

// 子步驟操作
const addSubStep    = (stepIdx, bi) => ruleModal.data.steps[stepIdx].branches[bi].steps.push(emptySubStep())
const removeSubStep = (stepIdx, bi, si) => ruleModal.data.steps[stepIdx].branches[bi].steps.splice(si, 1)

// 注意事項
const addWarning    = () => ruleModal.data.warnings.push('')
const removeWarning = (idx) => ruleModal.data.warnings.splice(idx, 1)

const saveRule = async () => {
  if (!ruleModal.data.title.trim()) { showToast('標題不能為空'); return }
  const data = {
    ...ruleModal.data,
    // 過濾空白警告
    warnings: ruleModal.data.warnings.filter(w => w.trim()),
    // 步驟：過濾完全空白的一般步驟；判斷節點保留（condition 不為空）
    steps: ruleModal.data.steps.filter(s => s.condition?.trim() || s.text?.trim()),
  }
  try {
    if (ruleModal.isNew) {
      const saved = await fetch(`${BASE.value}/rules/save`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data),
      }).then(r => r.json())
      rules.value.push(saved)
    } else {
      const updated = await fetch(`${BASE.value}/rules/update/${data.id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data),
      }).then(r => r.json())
      const idx = rules.value.findIndex(r => r.id === data.id)
      if (idx >= 0) rules.value[idx] = updated
    }
    ruleModal.show = false
    showToast(ruleModal.isNew ? '已新增規則' : '已儲存')
  } catch (e) {
    console.error(e); showToast('儲存失敗')
  }
}

const deleteRule = async (id) => {
  if (!confirm('確定刪除此規則？')) return
  try {
    await fetch(`${BASE.value}/rules/remove/${id}`, { method: 'DELETE' })
    rules.value = rules.value.filter(r => r.id !== id)
    showToast('已刪除')
  } catch (e) {
    console.error(e); showToast('刪除失敗')
  }
}

const togglePin = async (id) => {
  try {
    const pinned = await fetch(`${BASE.value}/rules/pin/${id}`, { method: 'PUT' }).then(r => r.json())
    const r = rules.value.find(r => r.id === id)
    if (r) r.pinned = pinned
  } catch (e) { console.error(e) }
}

// ── 分類 Modal ────────────────────────────────────────────────────
const categoryModal = reactive({ show: false, newName: '', newIcon: '📋', newColor: '#d97706' })
const openCategoryModal = () => { categoryModal.show = true }

const addCategory = async () => {
  const name = categoryModal.newName.trim()
  if (!name) return
  try {
    const saved = await fetch(`${BASE.value}/categories/save`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, icon: categoryModal.newIcon, color: categoryModal.newColor }),
    }).then(r => r.json())
    categories.value.push(saved)
    categoryModal.newName = ''
    categoryModal.newIcon = '📋'
  } catch (e) {
    console.error(e); showToast('新增失敗')
  }
}

const deleteCategory = async (id) => {
  if (rulesInCategory(id).length > 0) {
    if (!confirm('此分類下有規則，刪除後規則將變成未分類，確定繼續？')) return
  }
  try {
    await fetch(`${BASE.value}/categories/remove/${id}`, { method: 'DELETE' })
    rules.value.forEach(r => { if (r.categoryId === id) r.categoryId = '' })
    categories.value = categories.value.filter(c => c.id !== id)
    if (activeCategory.value === id) activeCategory.value = ''
  } catch (e) {
    console.error(e); showToast('刪除失敗')
  }
}

// ── Toast ─────────────────────────────────────────────────────────
const toast = reactive({ show: false, message: '' })
const showToast = (msg) => {
  toast.message = msg; toast.show = true
  setTimeout(() => toast.show = false, 2500)
}

onMounted(fetchAll)
</script>

<style scoped>
.scrollbar-none::-webkit-scrollbar { display: none; }
.scrollbar-none { -ms-overflow-style: none; scrollbar-width: none; }
.fade-enter-active, .fade-leave-active { transition: opacity 0.3s, transform 0.3s; }
.fade-enter-from, .fade-leave-to { opacity: 0; transform: translateY(8px); }
</style>
