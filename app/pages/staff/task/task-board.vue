<template>
  <ClientOnly>
    <div class="min-h-screen bg-stone-50 dark:bg-zinc-900 transition-colors duration-300">

      <!-- ── 頂部導覽 ── -->
      <header class="bg-white dark:bg-zinc-900 border-b border-stone-200 dark:border-stone-700 px-4 py-3 sticky top-0 z-30">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <div class="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">板</div>
            <div>
              <h1 class="font-bold text-stone-800 dark:text-stone-100 leading-none text-sm sm:text-base">今日工作</h1>
              <p class="text-xs text-stone-400 mt-0.5 hidden sm:block">{{ todayLabel }}</p>
            </div>
          </div>
          <div class="flex items-center gap-2">
            <!-- 主分頁切換 -->
            <div class="flex items-center gap-1 bg-stone-100 dark:bg-zinc-800 rounded-xl p-1">
              <button @click="activeTab = 'today'"
                      :class="activeTab === 'today' ? 'bg-white dark:bg-zinc-700 shadow-sm text-stone-800 dark:text-stone-100' : 'text-stone-500 dark:text-stone-400'"
                      class="px-3 py-1 rounded-lg text-xs font-medium transition-all">
                今日
              </button>
              <button @click="activeTab = 'history'"
                      :class="activeTab === 'history' ? 'bg-white dark:bg-zinc-700 shadow-sm text-stone-800 dark:text-stone-100' : 'text-stone-500 dark:text-stone-400'"
                      class="px-3 py-1 rounded-lg text-xs font-medium transition-all">
                紀錄
              </button>
            </div>
            <!-- 今日：顯示切換 -->
            <div v-if="activeTab === 'today'" class="flex items-center gap-1 bg-stone-100 dark:bg-zinc-800 rounded-xl p-1">
              <button @click="viewMode = 'mine'"
                      :class="viewMode === 'mine' ? 'bg-white dark:bg-zinc-700 shadow-sm text-stone-800 dark:text-stone-100' : 'text-stone-500 dark:text-stone-400'"
                      class="px-3 py-1 rounded-lg text-xs font-medium transition-all">
                我的
              </button>
              <button @click="switchToAll"
                      :class="viewMode === 'all' ? 'bg-white dark:bg-zinc-700 shadow-sm text-stone-800 dark:text-stone-100' : 'text-stone-500 dark:text-stone-400'"
                      class="px-3 py-1 rounded-lg text-xs font-medium transition-all">
                全部
              </button>
            </div>
            <button @click="activeTab === 'today' ? loadRecords() : loadHistory()" :disabled="loading"
                    class="p-2 text-stone-400 hover:text-stone-600 hover:bg-stone-100 dark:hover:bg-zinc-700 rounded-xl transition-colors disabled:opacity-50">
              <svg :class="loading ? 'animate-spin' : ''" class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
              </svg>
            </button>
          </div>
        </div>
      </header>

      <div class="max-w-2xl mx-auto px-3 sm:px-4 py-4 sm:py-5">

        <!-- ── 今日工作 tab ── -->
        <div v-if="activeTab === 'today'">

          <!-- 個人今日完成度 -->
          <div class="bg-white dark:bg-zinc-800 rounded-2xl border border-stone-200 dark:border-stone-700 shadow-sm p-4 mb-4">
            <div class="flex items-center justify-between mb-2">
              <div class="flex items-center gap-2">
                <img v-if="myPicture" :src="myPicture" class="w-7 h-7 rounded-full" />
                <span class="text-sm font-semibold text-stone-700 dark:text-stone-200">{{ myName || '今日進度' }}</span>
              </div>
              <span class="text-xs text-stone-400">{{ myDoneCount }} / {{ myTotalCount }} 完成</span>
            </div>
            <div class="h-2 bg-stone-100 dark:bg-zinc-700 rounded-full overflow-hidden">
              <div class="h-full bg-indigo-500 rounded-full transition-all duration-500"
                   :style="{ width: myPct + '%' }"></div>
            </div>
          </div>

          <!-- 載入中 -->
          <div v-if="loading" class="text-center py-12 text-stone-400">
            <svg class="w-6 h-6 animate-spin mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
            </svg>
            載入中...
          </div>

          <div v-else>
            <!-- ── 必要工作 ── -->
            <div v-if="requiredGroups.length > 0" class="mb-5">
              <div class="flex items-center gap-2 mb-2">
                <span class="text-xs font-semibold text-stone-500 dark:text-stone-400 uppercase tracking-wide">必要工作</span>
                <span class="text-xs text-stone-400">{{ requiredDone }}/{{ requiredTotal }}</span>
              </div>
              <div class="space-y-2">
                <div v-for="group in requiredGroups" :key="group.taskId"
                     class="bg-white dark:bg-zinc-800 rounded-2xl border shadow-sm overflow-hidden transition-all"
                     :class="group.allDone ? 'border-teal-200 dark:border-teal-800' : 'border-stone-200 dark:border-stone-700'">
                  <!-- 項目標題 -->
                  <div class="flex items-center gap-3 px-4 py-3 cursor-pointer"
                       @click="toggleGroup(group.taskId)">
                    <!-- 整體完成圈 -->
                    <div :class="group.allDone ? 'bg-teal-500 border-teal-500' : 'border-stone-300 dark:border-stone-500'"
                         class="w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all">
                      <svg v-if="group.allDone" class="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"/>
                      </svg>
                    </div>
                    <div class="flex-1 min-w-0">
                      <div class="flex items-center gap-2 flex-wrap">
                      <span :class="group.allDone ? 'line-through text-stone-400' : 'text-stone-800 dark:text-stone-100'"
                            class="font-semibold text-sm transition-all">{{ group.taskName }}</span>
                        <span v-if="group.estMinutes" class="text-xs text-stone-400">⏱ {{ group.estMinutes }} 分</span>
                        <span class="text-xs text-stone-400">{{ group.doneCount }}/{{ group.totalCount }}</span>
                      </div>
                    </div>
                    <svg :class="expandedGroups.has(group.taskId) ? 'rotate-180' : ''"
                         class="w-4 h-4 text-stone-400 transition-transform flex-shrink-0"
                         fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
                    </svg>
                  </div>

                  <!-- 步驟清單 -->
                  <div v-if="expandedGroups.has(group.taskId)"
                       class="border-t border-stone-100 dark:border-stone-700 divide-y divide-stone-50 dark:divide-zinc-700">
                    <div v-for="r in group.records" :key="r.id"
                         class="px-4 py-3"
                         :class="isLocked(r, group) ? 'opacity-40' : ''">
                      <div class="flex items-start gap-3">
                        <!-- 步驟順序線 -->
                        <div class="flex flex-col items-center flex-shrink-0 pt-0.5">
                          <div :class="stepCircleClass(r, group)"
                               class="w-6 h-6 rounded-full border-2 flex items-center justify-center text-xs font-bold transition-all">
                            <svg v-if="r.status === 'done'" class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"/>
                            </svg>
                            <svg v-else-if="r.status === 'in_progress'" class="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                              <circle cx="12" cy="12" r="4"/>
                            </svg>
                            <span v-else-if="!isLocked(r, group)" class="text-xs">{{ r.stepOrder }}</span>
                            <svg v-else class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/>
                            </svg>
                          </div>
                          <div v-if="r.stepOrder < group.maxStepOrder"
                               class="w-px h-4 mt-1"
                               :class="r.status === 'done' ? 'bg-teal-300' : 'bg-stone-200 dark:bg-zinc-600'"></div>
                        </div>

                        <div class="flex-1 min-w-0">
                          <div class="flex items-start justify-between gap-2">
                            <div class="flex-1 min-w-0">
                              <div class="flex items-center gap-2 flex-wrap">
                              <span :class="r.status === 'done' ? 'line-through text-stone-400' : 'text-stone-700 dark:text-stone-200'"
                                    class="text-sm font-medium">{{ r.stepName }}</span>
                                <span v-if="r.stepEstMinutes" class="text-xs text-stone-400">{{ r.stepEstMinutes }} 分</span>
                                <!-- 接手標示 -->
                                <span v-if="r.actualDoer && r.actualDoer !== r.assigneeId"
                                      class="text-xs bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 px-1.5 py-0.5 rounded-full">
                                接手：{{ r.actualDoerName }}
                              </span>
                                <!-- 排休提示 -->
                                <span v-if="r.assigneeOnLeave && !r.actualDoer"
                                      class="text-xs bg-red-100 dark:bg-red-900/20 text-red-400 px-1.5 py-0.5 rounded-full">
                                負責人休假
                              </span>
                              </div>
                              <!-- 負責人 -->
                              <div class="text-xs text-stone-400 mt-0.5">
                                負責：{{ r.assigneeName }}
                                <span v-if="r.doneAt" class="ml-2 text-teal-500">{{ r.doneAt.slice(11, 16) }} 完成</span>
                                <span v-else-if="r.startedAt" class="ml-2 text-amber-500">{{ r.startedAt.slice(11, 16) }} 開始</span>
                              </div>
                              <!-- 備註 -->
                              <div v-if="r.note" class="text-xs text-stone-400 mt-0.5 italic">{{ r.note }}</div>
                              <img v-if="r.imageUrl" :src="r.imageUrl"
                                   class="mt-1.5 h-12 w-auto rounded-lg object-cover cursor-pointer border border-stone-100 dark:border-zinc-600 hover:opacity-80"
                                   @click="lightboxImg = r.imageUrl" />
                            </div>

                            <!-- 操作按鈕 -->
                            <div class="flex items-center gap-1 flex-shrink-0" v-if="!isLocked(r, group)">
                              <!-- 接手按鈕（其他人的 pending 工作） -->
                              <button v-if="canTakeover(r)"
                                      @click="takeover(r)"
                                      class="text-xs px-2.5 py-1.5 rounded-lg bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 hover:bg-amber-100 font-medium transition-colors">
                                接手
                              </button>
                              <!-- 開始按鈕 -->
                              <button v-if="canStart(r)"
                                      @click="startRecord(r)"
                                      class="text-xs px-2.5 py-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 font-medium transition-colors">
                                開始
                              </button>
                              <!-- 完成按鈕 -->
                              <button v-if="canDone(r)"
                                      @click="doneRecord(r)"
                                      class="text-xs px-2.5 py-1.5 rounded-lg bg-teal-50 dark:bg-teal-900/20 text-teal-600 dark:text-teal-400 hover:bg-teal-100 font-medium transition-colors">
                                完成
                              </button>
                              <!-- 備註按鈕 -->
                              <button @click="openNoteModal(r)"
                                      class="p-1.5 text-stone-300 dark:text-zinc-600 hover:text-stone-500 dark:hover:text-stone-400 rounded-lg transition-colors">
                                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                                </svg>
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- ── 選做工作 ── -->
            <div v-if="optionalGroups.length > 0">
              <div class="flex items-center gap-2 mb-2">
                <span class="text-xs font-semibold text-stone-400 uppercase tracking-wide">選做工作</span>
                <span class="text-xs text-stone-400">{{ optionalDone }}/{{ optionalTotal }}</span>
              </div>
              <div class="space-y-2">
                <div v-for="group in optionalGroups" :key="group.taskId"
                     class="bg-white dark:bg-zinc-800 rounded-2xl border shadow-sm overflow-hidden transition-all"
                     :class="group.allDone ? 'border-teal-200 dark:border-teal-800 opacity-70' : 'border-stone-200 dark:border-stone-700'">
                  <div class="flex items-center gap-3 px-4 py-3 cursor-pointer"
                       @click="toggleGroup(group.taskId)">
                    <div :class="group.allDone ? 'bg-teal-500 border-teal-500' : 'border-stone-300 dark:border-stone-500'"
                         class="w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all">
                      <svg v-if="group.allDone" class="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"/>
                      </svg>
                    </div>
                    <div class="flex-1 min-w-0">
                      <div class="flex items-center gap-2 flex-wrap">
                      <span :class="group.allDone ? 'line-through text-stone-400' : 'text-stone-700 dark:text-stone-200'"
                            class="font-semibold text-sm transition-all">{{ group.taskName }}</span>
                        <span class="text-xs bg-amber-100 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 px-1.5 py-0.5 rounded-full">選做</span>
                        <span v-if="group.estMinutes" class="text-xs text-stone-400">⏱ {{ group.estMinutes }} 分</span>
                      </div>
                    </div>
                    <svg :class="expandedGroups.has(group.taskId) ? 'rotate-180' : ''"
                         class="w-4 h-4 text-stone-400 transition-transform flex-shrink-0"
                         fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
                    </svg>
                  </div>

                  <div v-if="expandedGroups.has(group.taskId)"
                       class="border-t border-stone-100 dark:border-stone-700 divide-y divide-stone-50 dark:divide-zinc-700">
                    <div v-for="r in group.records" :key="r.id"
                         class="px-4 py-3"
                         :class="isLocked(r, group) ? 'opacity-40' : ''">
                      <div class="flex items-start gap-3">
                        <div class="flex flex-col items-center flex-shrink-0 pt-0.5">
                          <div :class="stepCircleClass(r, group)"
                               class="w-6 h-6 rounded-full border-2 flex items-center justify-center text-xs font-bold transition-all">
                            <svg v-if="r.status === 'done'" class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"/>
                            </svg>
                            <svg v-else-if="r.status === 'in_progress'" class="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                              <circle cx="12" cy="12" r="4"/>
                            </svg>
                            <span v-else-if="!isLocked(r, group)" class="text-xs">{{ r.stepOrder }}</span>
                            <svg v-else class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/>
                            </svg>
                          </div>
                          <div v-if="r.stepOrder < group.maxStepOrder"
                               class="w-px h-4 mt-1"
                               :class="r.status === 'done' ? 'bg-teal-300' : 'bg-stone-200 dark:bg-zinc-600'"></div>
                        </div>

                        <div class="flex-1 min-w-0">
                          <div class="flex items-start justify-between gap-2">
                            <div class="flex-1 min-w-0">
                              <div class="flex items-center gap-2 flex-wrap">
                              <span :class="r.status === 'done' ? 'line-through text-stone-400' : 'text-stone-700 dark:text-stone-200'"
                                    class="text-sm font-medium">{{ r.stepName }}</span>
                                <span v-if="r.actualDoer && r.actualDoer !== r.assigneeId"
                                      class="text-xs bg-amber-100 dark:bg-amber-900/30 text-amber-600 px-1.5 py-0.5 rounded-full">
                                接手：{{ r.actualDoerName }}
                              </span>
                                <span v-if="r.assigneeOnLeave && !r.actualDoer"
                                      class="text-xs bg-red-100 dark:bg-red-900/20 text-red-400 px-1.5 py-0.5 rounded-full">
                                負責人休假
                              </span>
                              </div>
                              <div class="text-xs text-stone-400 mt-0.5">
                                負責：{{ r.assigneeName }}
                                <span v-if="r.doneAt" class="ml-2 text-teal-500">{{ r.doneAt.slice(11, 16) }} 完成</span>
                                <span v-else-if="r.startedAt" class="ml-2 text-amber-500">{{ r.startedAt.slice(11, 16) }} 開始</span>
                              </div>
                              <div v-if="r.note" class="text-xs text-stone-400 mt-0.5 italic">{{ r.note }}</div>
                              <img v-if="r.imageUrl" :src="r.imageUrl"
                                   class="mt-1.5 h-12 w-auto rounded-lg object-cover cursor-pointer border border-stone-100 dark:border-zinc-600 hover:opacity-80"
                                   @click="lightboxImg = r.imageUrl" />
                            </div>

                            <div class="flex items-center gap-1 flex-shrink-0" v-if="!isLocked(r, group)">
                              <button v-if="canTakeover(r)" @click="takeover(r)"
                                      class="text-xs px-2.5 py-1.5 rounded-lg bg-amber-50 dark:bg-amber-900/20 text-amber-600 hover:bg-amber-100 font-medium transition-colors">
                                接手
                              </button>
                              <button v-if="canStart(r)" @click="startRecord(r)"
                                      class="text-xs px-2.5 py-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 hover:bg-indigo-100 font-medium transition-colors">
                                開始
                              </button>
                              <button v-if="canDone(r)" @click="doneRecord(r)"
                                      class="text-xs px-2.5 py-1.5 rounded-lg bg-teal-50 dark:bg-teal-900/20 text-teal-600 hover:bg-teal-100 font-medium transition-colors">
                                完成
                              </button>
                              <button @click="openNoteModal(r)"
                                      class="p-1.5 text-stone-300 dark:text-zinc-600 hover:text-stone-500 rounded-lg transition-colors">
                                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                                </svg>
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- 空狀態 -->
            <div v-if="requiredGroups.length === 0 && optionalGroups.length === 0"
                 class="text-center py-16 text-stone-400">
              <div class="text-4xl mb-3">✅</div>
              <div class="text-sm">今日無工作，或尚未產生紀錄</div>
            </div>
          </div>

        </div> <!-- end today tab -->

        <!-- ── 歷史紀錄 tab ── -->
        <div v-if="activeTab === 'history'">
          <!-- 篩選 -->
          <div class="bg-white dark:bg-zinc-800 rounded-2xl border border-stone-200 dark:border-stone-700 shadow-sm p-4 mb-4">
            <div class="grid grid-cols-2 gap-3 mb-3">
              <div>
                <label class="text-xs text-stone-400 mb-1 block">開始日期</label>
                <input type="date" v-model="histFilter.from"
                       class="w-full text-sm border border-stone-200 dark:border-stone-600 rounded-lg px-2 py-1.5 bg-white dark:bg-zinc-700 text-stone-800 dark:text-stone-100" />
              </div>
              <div>
                <label class="text-xs text-stone-400 mb-1 block">結束日期</label>
                <input type="date" v-model="histFilter.to"
                       class="w-full text-sm border border-stone-200 dark:border-stone-600 rounded-lg px-2 py-1.5 bg-white dark:bg-zinc-700 text-stone-800 dark:text-stone-100" />
              </div>
            </div>
            <button @click="loadHistory"
                    class="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-medium transition-colors">
              查詢
            </button>
          </div>

          <div v-if="loadingHistory" class="text-center py-10 text-stone-400">載入中...</div>
          <div v-else class="space-y-2">
            <!-- 依日期分組 -->
            <div v-for="(dayGroup, date) in historyByDate" :key="date"
                 class="bg-white dark:bg-zinc-800 rounded-2xl border border-stone-200 dark:border-stone-700 shadow-sm overflow-hidden">
              <div class="px-4 py-2.5 border-b border-stone-100 dark:border-stone-700 flex items-center justify-between">
                <span class="text-sm font-semibold text-stone-700 dark:text-stone-200">{{ date }}</span>
                <span class="text-xs text-stone-400">{{ dayGroup.filter(r => r.status === 'done').length }}/{{ dayGroup.length }} 完成</span>
              </div>
              <div class="divide-y divide-stone-50 dark:divide-zinc-700">
                <div v-for="r in dayGroup" :key="r.id" class="flex items-center gap-3 px-4 py-2.5">
                  <span :class="statusDot(r.status)" class="w-2 h-2 rounded-full flex-shrink-0"></span>
                  <div class="flex-1 min-w-0">
                    <div class="text-sm text-stone-700 dark:text-stone-200">{{ r.taskName }}</div>
                    <div class="text-xs text-stone-400">{{ r.stepName }}
                      <span v-if="r.actualDoer && r.actualDoer !== r.assigneeId" class="text-amber-500 ml-1">（接手）</span>
                    </div>
                  </div>
                  <span :class="statusTextClass(r.status)" class="text-xs flex-shrink-0">{{ statusLabel(r.status) }}</span>
                </div>
              </div>
            </div>
            <div v-if="Object.keys(historyByDate).length === 0" class="text-center py-12 text-stone-400 text-sm">無紀錄</div>
          </div>
        </div>

      </div>

      <!-- ── 備註 Modal ── -->
      <div v-if="noteModal.show"
           class="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4"
           @click.self="noteModal.show = false">
        <div class="bg-white dark:bg-zinc-800 rounded-2xl w-full max-w-sm shadow-2xl">
          <div class="flex items-center justify-between px-5 py-4 border-b border-stone-100 dark:border-stone-700">
            <h3 class="font-bold text-stone-800 dark:text-stone-100 text-sm">新增備註</h3>
            <button @click="noteModal.show = false" class="text-stone-400 hover:text-stone-600">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </button>
          </div>
          <div class="px-5 py-4">
            <p class="text-xs text-stone-400 mb-2">{{ noteModal.stepName }}</p>
            <textarea v-model="noteModal.text" rows="3"
                      placeholder="記錄執行過程、注意事項..."
                      class="w-full border border-stone-200 dark:border-stone-600 rounded-xl px-3 py-2 text-sm bg-white dark:bg-zinc-700 text-stone-800 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"></textarea>
          </div>
          <div class="flex gap-2 px-5 pb-5">
            <button @click="noteModal.show = false"
                    class="flex-1 py-2.5 rounded-xl border border-stone-200 dark:border-stone-600 text-sm text-stone-600 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-zinc-700 transition-colors">
              取消
            </button>
            <button @click="saveNote" :disabled="saving"
                    class="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium transition-colors disabled:opacity-50">
              {{ saving ? '儲存中...' : '儲存' }}
            </button>
          </div>
        </div>
      </div>

    </div>
  </ClientOnly>
  <!-- Lightbox -->
  <div v-if="lightboxImg" class="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
       @click="lightboxImg = null">
    <img :src="lightboxImg" class="max-w-full max-h-full rounded-xl object-contain" @click.stop />
    <button @click="lightboxImg = null"
            class="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/20 text-white flex items-center justify-center hover:bg-white/30 text-lg">✕</button>
  </div>

</template>

<script setup>
definePageMeta({ layout: 'staff', requiredPermission: 'staff.task' })

const commonStore = useCommonStore()
const customerStore = useCustomerStore()
const REC_BASE = () => commonStore.data.main_url + '/holy/task/record'
const TASK_BASE = () => commonStore.data.main_url + '/holy/task'

// ── 日期 ──────────────────────────────────────────────────────
const today = new Date()
const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
const weekDays = ['日', '一', '二', '三', '四', '五', '六']
const todayLabel = `${today.getMonth() + 1} 月 ${today.getDate()} 日　星期${weekDays[today.getDay()]}`

// ── 目前登入者 ────────────────────────────────────────────────
const myId      = computed(() => customerStore.customer?.id || '')
const myName    = computed(() => customerStore.customer?.name || '')
const myPicture = computed(() => customerStore.customer?.picture || '')

// ── 資料 ──────────────────────────────────────────────────────
const activeTab = ref('today')
const loading   = ref(false)
const saving    = ref(false)
const records   = ref([])
const viewMode  = ref('mine') // 'mine' | 'all'

// ── 分組 ──────────────────────────────────────────────────────
const grouped = computed(() => {
  const map = new Map()
  for (const r of records.value) {
    if (!map.has(r.taskId)) {
      map.set(r.taskId, {
        taskId:      r.taskId,
        taskName:    r.taskName,
        priority:    r.priority,
        estMinutes:  r.taskEstMinutes,
        records:     [],
        doneCount:   0,
        totalCount:  0,
        allDone:     false,
        maxStepOrder: 0
      })
    }
    const g = map.get(r.taskId)
    g.records.push(r)
    g.totalCount++
    if (r.status === 'done') g.doneCount++
    if (r.stepOrder > g.maxStepOrder) g.maxStepOrder = r.stepOrder
  }
  for (const g of map.values()) {
    g.allDone = g.doneCount === g.totalCount && g.totalCount > 0
    g.records.sort((a, b) => a.stepOrder - b.stepOrder)
  }
  return [...map.values()]
})

const requiredGroups = computed(() => grouped.value.filter(g => g.priority === 'required'))
const optionalGroups = computed(() => grouped.value.filter(g => g.priority === 'optional'))

// 個人完成度（不管 viewMode，都算我的）
const myRecords   = computed(() => records.value.filter(r => r.assigneeId === myId.value || r.actualDoer === myId.value))
const myDoneCount = computed(() => myRecords.value.filter(r => r.status === 'done').length)
const myTotalCount = computed(() => myRecords.value.length)
const myPct       = computed(() => myTotalCount.value ? Math.round(myDoneCount.value / myTotalCount.value * 100) : 0)

// 必要/選做統計
const requiredDone  = computed(() => requiredGroups.value.reduce((s, g) => s + g.doneCount, 0))
const requiredTotal = computed(() => requiredGroups.value.reduce((s, g) => s + g.totalCount, 0))
const optionalDone  = computed(() => optionalGroups.value.reduce((s, g) => s + g.doneCount, 0))
const optionalTotal = computed(() => optionalGroups.value.reduce((s, g) => s + g.totalCount, 0))

// ── 展開/收合 ─────────────────────────────────────────────────
const expandedGroups = ref(new Set())
function toggleGroup(taskId) {
  const s = new Set(expandedGroups.value)
  s.has(taskId) ? s.delete(taskId) : s.add(taskId)
  expandedGroups.value = s
}

// ── 載入資料 ──────────────────────────────────────────────────
async function loadRecords() {
  loading.value = true
  try {
    const url = viewMode.value === 'mine'
      ? `${REC_BASE()}/my/${todayStr}`
      : `${REC_BASE()}/all/${todayStr}`
    const res = await fetch(url, { credentials: 'include' })
    records.value = await res.json()
    // 預設全部展開
    expandedGroups.value = new Set(records.value.map(r => r.taskId))
  } catch { records.value = [] }
  finally { loading.value = false }
}

async function switchToAll() {
  viewMode.value = 'all'
  await loadRecords()
}

// ── 步驟鎖定判斷 ──────────────────────────────────────────────
// 平行群組鎖定邏輯：
// 同 task 中，比本步驟的 parallelGroup 小的最大群組，若有未完成則鎖定
// 同群組的步驟互不鎖定（可平行進行）
function isLocked(record, group) {
  const myGroup = record.parallelGroup || record.stepOrder
  if (myGroup <= 1) return false
  // 找比本群組小的所有步驟
  const prevGroupRecords = group.records.filter(r => {
    const rg = r.parallelGroup || r.stepOrder
    return rg < myGroup
  })
  if (prevGroupRecords.length === 0) return false
  // 找最大的前置群組
  const maxPrevGroup = Math.max(...prevGroupRecords.map(r => r.parallelGroup || r.stepOrder))
  // 該群組所有步驟必須全部 done
  const prevGroupDone = prevGroupRecords
    .filter(r => (r.parallelGroup || r.stepOrder) === maxPrevGroup)
    .every(r => r.status === 'done')
  return !prevGroupDone
}

// ── 操作權限判斷 ──────────────────────────────────────────────
function isMyRecord(r) {
  return r.assigneeId === myId.value || r.actualDoer === myId.value
}
function canTakeover(r) {
  // pending、不是我負責、沒有人接手
  return r.status === 'pending' && r.assigneeId !== myId.value && !r.actualDoer
}
function canStart(r) {
  // pending 且是我負責（或我接手）
  return r.status === 'pending' && isMyRecord(r)
}
function canDone(r) {
  // pending 或 in_progress 且是我負責
  return (r.status === 'pending' || r.status === 'in_progress') && isMyRecord(r)
}

// ── 操作 API ─────────────────────────────────────────────────
async function startRecord(r) {
  try {
    await fetch(`${REC_BASE()}/start/${r.id}`, { method: 'PUT', credentials: 'include' })
    await loadRecords()
  } catch { alert('操作失敗，請重試') }
}

async function doneRecord(r) {
  try {
    await fetch(`${REC_BASE()}/done/${r.id}`, { method: 'PUT', credentials: 'include' })
    await loadRecords()
  } catch { alert('操作失敗，請重試') }
}

async function takeover(r) {
  try {
    await fetch(`${REC_BASE()}/takeover/${r.id}`, { method: 'PUT', credentials: 'include' })
    await loadRecords()
  } catch { alert('操作失敗，請重試') }
}

// ── 備註 Modal ────────────────────────────────────────────────
const noteModal = reactive({ show: false, recordId: null, stepName: '', text: '' })

function openNoteModal(r) {
  Object.assign(noteModal, { show: true, recordId: r.id, stepName: r.stepName, text: r.note || '' })
}

async function saveNote() {
  saving.value = true
  try {
    await fetch(`${REC_BASE()}/note/${noteModal.recordId}`, {
      method: 'PUT',
      headers: {'Content-Type': 'application/json'},
      credentials: 'include',
      body: JSON.stringify({note: noteModal.text})
    })
    noteModal.show = false
    await loadRecords()
  } finally {
    saving.value = false
  }
}

// ── 樣式工具 ──────────────────────────────────────────────────
function stepCircleClass(r, group) {
  if (r.status === 'done') return 'bg-teal-500 border-teal-500 text-white'
  if (r.status === 'in_progress') return 'bg-amber-400 border-amber-400 text-white'
  if (isLocked(r, group)) return 'bg-stone-100 dark:bg-zinc-700 border-stone-200 dark:border-zinc-600 text-stone-300'
  return 'bg-white dark:bg-zinc-800 border-indigo-300 dark:border-indigo-600 text-indigo-500'
}

// ── 初始化 ────────────────────────────────────────────────────
onMounted(async () => {
  // 先產生當天紀錄，再載入
  try {
    await fetch(`${REC_BASE()}/generate/${todayStr}`, {method: 'POST', credentials: 'include'})
  } catch { /* ignore */
  }
  await loadRecords()
})
</script>
