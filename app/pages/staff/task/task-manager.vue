<template>
  <ClientOnly>
    <div class="min-h-screen bg-stone-50 dark:bg-zinc-900 transition-colors duration-300">

      <!-- ── 頂部導覽 ── -->
      <header class="bg-white dark:bg-zinc-900 border-b border-stone-200 dark:border-stone-700 px-4 py-3 sticky top-0 z-30">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <div class="w-8 h-8 rounded-lg bg-teal-700 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">工</div>
            <div>
              <h1 class="font-bold text-stone-800 dark:text-stone-100 leading-none text-sm sm:text-base">工作管理</h1>
              <p class="text-xs text-stone-400 mt-0.5 hidden sm:block">Holy Mother Farm</p>
            </div>
          </div>
          <!-- 分頁切換 -->
          <div class="flex items-center gap-1">
            <button v-for="tab in tabs" :key="tab.key"
                    @click="activeTab = tab.key"
                    :class="activeTab === tab.key
                      ? 'bg-teal-700 text-white'
                      : 'text-stone-500 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-zinc-700'"
                    class="px-3 py-1.5 rounded-lg text-sm font-medium transition-colors">
              {{ tab.label }}
            </button>
          </div>
        </div>
      </header>

      <div class="max-w-6xl mx-auto px-3 sm:px-4 py-4 sm:py-6">

        <!-- ══════════════════════════════════
             TAB 1：今日總覽
        ══════════════════════════════════ -->
        <div v-if="activeTab === 'overview'">
          <!-- 日期 + 人員狀態 -->
          <div class="flex flex-wrap items-center gap-3 mb-4">
            <div class="flex items-center gap-2">
              <span class="text-lg font-bold text-stone-800 dark:text-stone-100">{{ todayLabel }}</span>
              <button @click="generateRecords" :disabled="generating"
                      class="text-xs px-2.5 py-1 rounded-lg bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-400 hover:bg-teal-200 transition-colors font-medium disabled:opacity-50">
                {{ generating ? '產生中...' : '重新整理' }}
              </button>
            </div>
            <!-- 今日在班人員 -->
            <div class="flex flex-wrap gap-1.5">
              <span v-for="s in staffList" :key="s.id"
                    :class="isOnLeave(s.id) ? 'bg-stone-100 dark:bg-zinc-700 text-stone-400 line-through' : 'bg-teal-50 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300'"
                    class="flex items-center gap-1 text-xs px-2 py-1 rounded-full font-medium">
                <img v-if="s.picture" :src="s.picture" class="w-4 h-4 rounded-full" />
                {{ s.name }}
                <span v-if="isOnLeave(s.id)" class="text-xs">休</span>
              </span>
            </div>
          </div>

          <!-- 完成度統計 -->
          <div class="grid grid-cols-2 gap-3 mb-5">
            <div class="bg-white dark:bg-zinc-800 rounded-2xl border border-stone-200 dark:border-stone-700 p-4 shadow-sm">
              <div class="text-xs text-stone-400 mb-1">必要工作</div>
              <div class="flex items-end gap-2">
                <span class="text-2xl font-bold text-stone-800 dark:text-stone-100">
                  {{ summary.requiredDone }} <span class="text-base font-normal text-stone-400">/ {{ summary.requiredTotal }}</span>
                </span>
              </div>
              <div class="mt-2 h-1.5 bg-stone-100 dark:bg-zinc-700 rounded-full overflow-hidden">
                <div class="h-full bg-teal-600 rounded-full transition-all"
                     :style="{ width: reqPct + '%' }"></div>
              </div>
              <div class="text-xs text-stone-400 mt-1">{{ reqPct }}% 完成</div>
            </div>
            <div class="bg-white dark:bg-zinc-800 rounded-2xl border border-stone-200 dark:border-stone-700 p-4 shadow-sm">
              <div class="text-xs text-stone-400 mb-1">選做工作</div>
              <div class="flex items-end gap-2">
                <span class="text-2xl font-bold text-stone-800 dark:text-stone-100">
                  {{ summary.optionalDone }} <span class="text-base font-normal text-stone-400">/ {{ summary.optionalTotal }}</span>
                </span>
              </div>
              <div class="mt-2 h-1.5 bg-stone-100 dark:bg-zinc-700 rounded-full overflow-hidden">
                <div class="h-full bg-amber-500 rounded-full transition-all"
                     :style="{ width: optPct + '%' }"></div>
              </div>
              <div class="text-xs text-stone-400 mt-1">{{ optPct }}% 完成</div>
            </div>
          </div>

          <!-- 工作清單 -->
          <div v-if="loadingOverview" class="text-center py-10 text-stone-400">載入中...</div>
          <div v-else>
            <!-- 必要 -->
            <div class="mb-2 text-xs font-semibold text-stone-500 dark:text-stone-400 uppercase tracking-wide">必要工作</div>
            <div class="space-y-2 mb-5">
              <div v-for="group in requiredGroups" :key="group.taskId"
                   class="bg-white dark:bg-zinc-800 rounded-2xl border border-stone-200 dark:border-stone-700 shadow-sm overflow-hidden">
                <!-- 項目標題列 -->
                <div class="flex items-center justify-between px-4 py-3 border-b border-stone-100 dark:border-stone-700 cursor-pointer"
                     @click="toggleGroup(group.taskId)">
                  <div class="flex items-center gap-2">
                    <span :class="groupStatusClass(group)" class="w-2.5 h-2.5 rounded-full flex-shrink-0"></span>
                    <span class="font-semibold text-stone-800 dark:text-stone-100 text-sm">{{ group.taskName }}</span>
                    <span class="text-xs text-stone-400">{{ group.doneCount }}/{{ group.totalCount }}</span>
                  </div>
                  <svg :class="expandedGroups.has(group.taskId) ? 'rotate-180' : ''"
                       class="w-4 h-4 text-stone-400 transition-transform"
                       fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
                  </svg>
                </div>
                <!-- 步驟明細 -->
                <div v-if="expandedGroups.has(group.taskId)" class="divide-y divide-stone-50 dark:divide-zinc-700">
                  <div v-for="r in group.records" :key="r.id"
                       class="flex items-center gap-3 px-4 py-2.5">
                    <span :class="statusDot(r.status)" class="w-2 h-2 rounded-full flex-shrink-0"></span>
                    <div class="flex-1 min-w-0">
                      <div class="flex items-center gap-2">
                        <span class="text-xs text-stone-400 w-5">{{ r.stepOrder }}</span>
                        <span class="text-sm text-stone-700 dark:text-stone-200">{{ r.stepName }}</span>
                        <span v-if="r.assigneeOnLeave" class="text-xs bg-stone-100 dark:bg-zinc-700 text-stone-400 px-1.5 py-0.5 rounded">休假</span>
                      </div>
                    </div>
                    <div class="text-right flex-shrink-0">
                      <div class="text-xs text-stone-500 dark:text-stone-400">
                        {{ r.actualDoer ? r.actualDoerName : r.assigneeName }}
                      </div>
                      <div class="text-xs" :class="statusTextClass(r.status)">{{ statusLabel(r.status) }}</div>
                    </div>
                  </div>
                </div>
              </div>
              <div v-if="requiredGroups.length === 0" class="text-center py-6 text-stone-400 text-sm">今日無必要工作</div>
            </div>

            <!-- 選做 -->
            <div class="mb-2 text-xs font-semibold text-stone-500 dark:text-stone-400 uppercase tracking-wide">選做工作</div>
            <div class="space-y-2">
              <div v-for="group in optionalGroups" :key="group.taskId"
                   class="bg-white dark:bg-zinc-800 rounded-2xl border border-stone-200 dark:border-stone-700 shadow-sm overflow-hidden">
                <div class="flex items-center justify-between px-4 py-3 border-b border-stone-100 dark:border-stone-700 cursor-pointer"
                     @click="toggleGroup(group.taskId)">
                  <div class="flex items-center gap-2">
                    <span :class="groupStatusClass(group)" class="w-2.5 h-2.5 rounded-full flex-shrink-0"></span>
                    <span class="font-semibold text-stone-800 dark:text-stone-100 text-sm">{{ group.taskName }}</span>
                    <span class="text-xs text-stone-400">{{ group.doneCount }}/{{ group.totalCount }}</span>
                  </div>
                  <svg :class="expandedGroups.has(group.taskId) ? 'rotate-180' : ''"
                       class="w-4 h-4 text-stone-400 transition-transform"
                       fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
                  </svg>
                </div>
                <div v-if="expandedGroups.has(group.taskId)" class="divide-y divide-stone-50 dark:divide-zinc-700">
                  <div v-for="r in group.records" :key="r.id"
                       class="flex items-center gap-3 px-4 py-2.5">
                    <span :class="statusDot(r.status)" class="w-2 h-2 rounded-full flex-shrink-0"></span>
                    <div class="flex-1 min-w-0">
                      <div class="flex items-center gap-2">
                        <span class="text-xs text-stone-400 w-5">{{ r.stepOrder }}</span>
                        <span class="text-sm text-stone-700 dark:text-stone-200">{{ r.stepName }}</span>
                        <span v-if="r.assigneeOnLeave" class="text-xs bg-stone-100 dark:bg-zinc-700 text-stone-400 px-1.5 py-0.5 rounded">休假</span>
                      </div>
                    </div>
                    <div class="text-right flex-shrink-0">
                      <div class="text-xs text-stone-500 dark:text-stone-400">
                        {{ r.actualDoer ? r.actualDoerName : r.assigneeName }}
                      </div>
                      <div class="text-xs" :class="statusTextClass(r.status)">{{ statusLabel(r.status) }}</div>
                    </div>
                  </div>
                </div>
              </div>
              <div v-if="optionalGroups.length === 0" class="text-center py-6 text-stone-400 text-sm">今日無選做工作</div>
            </div>
          </div>
        </div>

        <!-- ══════════════════════════════════
             TAB 2：工作項目管理
        ══════════════════════════════════ -->
        <div v-if="activeTab === 'tasks'">
          <div class="flex items-center justify-between mb-4">
            <div class="flex items-center gap-2">
              <label class="text-sm text-stone-500 dark:text-stone-400 flex items-center gap-1.5 cursor-pointer select-none">
                <input type="checkbox" v-model="showInactive" class="rounded" @change="loadTasks" />
                顯示已停用
              </label>
            </div>
            <button @click="openTaskModal(null)"
                    class="flex items-center gap-1.5 px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-xl text-sm font-medium transition-colors">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
              </svg>
              新增項目
            </button>
          </div>

          <div v-if="loadingTasks" class="text-center py-10 text-stone-400">載入中...</div>
          <div v-else class="space-y-3">
            <div v-for="task in tasks" :key="task.id"
                 class="bg-white dark:bg-zinc-800 rounded-2xl border border-stone-200 dark:border-stone-700 shadow-sm overflow-hidden"
                 :class="task.active === 0 ? 'opacity-50' : ''">
              <!-- 項目標題 -->
              <div class="flex items-start justify-between px-4 py-3">
                <div class="flex items-start gap-3 flex-1 min-w-0">
                  <div class="flex-1 min-w-0">
                    <div class="flex items-center gap-2 flex-wrap">
                      <span class="font-semibold text-stone-800 dark:text-stone-100">{{ task.name }}</span>
                      <span :class="task.priority === 'required' ? 'bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300' : 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300'"
                            class="text-xs px-2 py-0.5 rounded-full font-medium">
                        {{ task.priority === 'required' ? '必做' : '選做' }}
                      </span>
                      <span class="text-xs bg-stone-100 dark:bg-zinc-700 text-stone-500 dark:text-stone-400 px-2 py-0.5 rounded-full">
                        {{ task.category === 'daily' ? '每日' : '一次性' }}
                      </span>
                      <span v-if="task.estMinutes" class="text-xs text-stone-400">⏱ {{ task.estMinutes }} 分</span>
                      <span v-if="task.active === 0" class="text-xs bg-red-100 text-red-500 px-2 py-0.5 rounded-full">已停用</span>
                    </div>
                    <p v-if="task.description" class="text-xs text-stone-400 mt-1">{{ task.description }}</p>
                  </div>
                </div>
                <div class="flex items-center gap-1 flex-shrink-0 ml-2">
                  <button @click="openTaskModal(task)"
                          class="p-1.5 text-stone-400 hover:text-teal-600 hover:bg-teal-50 dark:hover:bg-teal-900/20 rounded-lg transition-colors">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                    </svg>
                  </button>
                  <button @click="toggleTask(task)"
                          :class="task.active ? 'text-stone-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20' : 'text-stone-400 hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20'"
                          class="p-1.5 rounded-lg transition-colors">
                    <svg v-if="task.active" class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"/>
                    </svg>
                    <svg v-else class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                    </svg>
                  </button>
                  <button @click="toggleSteps(task.id)"
                          class="p-1.5 text-stone-400 hover:text-stone-600 hover:bg-stone-50 dark:hover:bg-zinc-700 rounded-lg transition-colors">
                    <svg :class="expandedSteps.has(task.id) ? 'rotate-180' : ''"
                         class="w-4 h-4 transition-transform"
                         fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
                    </svg>
                  </button>
                </div>
              </div>

              <!-- 步驟樹狀 -->
              <div v-if="expandedSteps.has(task.id)"
                   class="border-t border-stone-100 dark:border-stone-700 px-4 py-3">
                <div class="text-xs font-medium text-stone-400 mb-2">流程步驟</div>
                <!-- 樹狀示意 -->
                <div class="space-y-1 mb-3">
                  <div v-for="(step, idx) in task.steps" :key="step.id"
                       class="flex items-start gap-2">
                    <!-- 樹狀連線 -->
                    <div class="flex flex-col items-center flex-shrink-0 w-5 mt-1">
                      <div v-if="idx > 0" class="w-px h-2 bg-stone-200 dark:bg-zinc-600"></div>
                      <div class="w-2 h-2 rounded-full border-2 border-teal-500 bg-white dark:bg-zinc-800"></div>
                      <div v-if="idx < task.steps.length - 1" class="w-px flex-1 min-h-2 bg-stone-200 dark:bg-zinc-600"></div>
                    </div>
                    <div class="flex-1 min-w-0 pb-1">
                      <div class="flex items-center gap-2 flex-wrap">
                        <span class="text-sm text-stone-700 dark:text-stone-200 font-medium">{{ step.name }}</span>
                        <span v-if="step.estMinutes" class="text-xs text-stone-400">⏱ {{ step.estMinutes }} 分</span>
                        <!-- 負責人頭像 -->
                        <div class="flex -space-x-1">
                          <div v-for="cid in step.assigneeIds" :key="cid"
                               class="relative group">
                            <img v-if="staffMap[cid]?.picture"
                                 :src="staffMap[cid].picture"
                                 class="w-5 h-5 rounded-full border border-white dark:border-zinc-800 object-cover" />
                            <div v-else class="w-5 h-5 rounded-full bg-teal-600 border border-white dark:border-zinc-800 flex items-center justify-center text-white text-xs">
                              {{ (staffMap[cid]?.name || '?').charAt(0) }}
                            </div>
                            <div class="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-1.5 py-0.5 bg-stone-800 text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none z-10">
                              {{ staffMap[cid]?.name || cid }}
                            </div>
                          </div>
                        </div>
                        <button @click="openStepModal(task, step)"
                                class="text-xs text-stone-400 hover:text-teal-600 transition-colors">編輯</button>
                        <button @click="removeStep(step)"
                                class="text-xs text-stone-400 hover:text-red-500 transition-colors">刪除</button>
                      </div>
                      <p v-if="step.note" class="text-xs text-stone-400 mt-0.5">{{ step.note }}</p>
                    </div>
                  </div>
                  <div v-if="!task.steps || task.steps.length === 0"
                       class="text-xs text-stone-400 py-2">尚無步驟</div>
                </div>
                <button @click="openStepModal(task, null)"
                        class="flex items-center gap-1 text-xs text-teal-600 dark:text-teal-400 hover:text-teal-700 font-medium transition-colors">
                  <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
                  </svg>
                  新增步驟
                </button>
              </div>
            </div>
            <div v-if="tasks.length === 0" class="text-center py-10 text-stone-400">尚無工作項目</div>
          </div>
        </div>

        <!-- ══════════════════════════════════
             TAB 3：排休管理
        ══════════════════════════════════ -->
        <div v-if="activeTab === 'schedule'">
          <!-- 月份切換 -->
          <div class="flex items-center justify-between mb-4">
            <button @click="prevMonth" class="p-2 hover:bg-stone-100 dark:hover:bg-zinc-700 rounded-xl transition-colors">
              <svg class="w-5 h-5 text-stone-500 dark:text-stone-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
              </svg>
            </button>
            <span class="text-base font-semibold text-stone-700 dark:text-stone-100">{{ scheduleYearMonth }}</span>
            <button @click="nextMonth" class="p-2 hover:bg-stone-100 dark:hover:bg-zinc-700 rounded-xl transition-colors">
              <svg class="w-5 h-5 text-stone-500 dark:text-stone-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
              </svg>
            </button>
          </div>

          <!-- 員工排休表 -->
          <div class="bg-white dark:bg-zinc-800 rounded-2xl border border-stone-200 dark:border-stone-700 shadow-sm overflow-hidden">
            <div class="overflow-x-auto">
              <table class="w-full text-sm">
                <thead>
                  <tr class="border-b border-stone-100 dark:border-stone-700">
                    <th class="text-left px-4 py-3 text-xs font-medium text-stone-400 w-24 sticky left-0 bg-white dark:bg-zinc-800">員工</th>
                    <th v-for="day in scheduleDays" :key="day.date"
                        class="px-1 py-2 text-center min-w-8"
                        :class="day.isSun ? 'text-red-400' : 'text-stone-400'">
                      <div class="text-xs font-medium">{{ day.dayNum }}</div>
                      <div class="text-xs">{{ day.weekday }}</div>
                    </th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-stone-50 dark:divide-zinc-700">
                  <tr v-for="staff in staffList" :key="staff.id">
                    <td class="px-4 py-2 sticky left-0 bg-white dark:bg-zinc-800">
                      <div class="flex items-center gap-1.5">
                        <img v-if="staff.picture" :src="staff.picture" class="w-6 h-6 rounded-full" />
                        <span class="text-xs font-medium text-stone-700 dark:text-stone-200 truncate max-w-16">{{ staff.name }}</span>
                      </div>
                    </td>
                    <td v-for="day in scheduleDays" :key="day.date" class="px-0.5 py-1 text-center">
                      <button @click="toggleSchedule(staff.id, day.date)"
                              :class="getScheduleStatus(staff.id, day.date)
                                ? 'bg-red-100 dark:bg-red-900/30 text-red-500'
                                : day.isSun ? 'bg-stone-50 dark:bg-zinc-700/50 text-stone-300 dark:text-stone-600'
                                            : 'hover:bg-teal-50 dark:hover:bg-teal-900/20 text-stone-200 dark:text-zinc-700'"
                              class="w-7 h-7 rounded-lg text-xs font-medium transition-colors mx-auto block">
                        {{ getScheduleStatus(staff.id, day.date) ? '休' : (day.isSun ? '日' : '') }}
                      </button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
          <p class="text-xs text-stone-400 mt-2 text-center">點擊格子切換排休，紅色「休」表示排休，「日」為週日預設休息</p>
        </div>

        <!-- ══════════════════════════════════
             TAB 4：歷史紀錄
        ══════════════════════════════════ -->
        <div v-if="activeTab === 'history'">
          <!-- 篩選列 -->
          <div class="bg-white dark:bg-zinc-800 rounded-2xl border border-stone-200 dark:border-stone-700 shadow-sm p-4 mb-4">
            <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
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
              <div>
                <label class="text-xs text-stone-400 mb-1 block">員工</label>
                <select v-model="histFilter.customerId"
                        class="w-full text-sm border border-stone-200 dark:border-stone-600 rounded-lg px-2 py-1.5 bg-white dark:bg-zinc-700 text-stone-800 dark:text-stone-100">
                  <option value="">全部</option>
                  <option v-for="s in staffList" :key="s.id" :value="s.id">{{ s.name }}</option>
                </select>
              </div>
              <div>
                <label class="text-xs text-stone-400 mb-1 block">工作項目</label>
                <select v-model="histFilter.taskId"
                        class="w-full text-sm border border-stone-200 dark:border-stone-600 rounded-lg px-2 py-1.5 bg-white dark:bg-zinc-700 text-stone-800 dark:text-stone-100">
                  <option value="">全部</option>
                  <option v-for="t in tasks" :key="t.id" :value="t.id">{{ t.name }}</option>
                </select>
              </div>
            </div>
            <button @click="loadHistory"
                    class="mt-3 px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-xl text-sm font-medium transition-colors">
              查詢
            </button>
          </div>

          <div v-if="loadingHistory" class="text-center py-10 text-stone-400">載入中...</div>
          <div v-else class="bg-white dark:bg-zinc-800 rounded-2xl border border-stone-200 dark:border-stone-700 shadow-sm overflow-hidden">
            <div class="overflow-x-auto">
              <table class="w-full text-sm">
                <thead class="border-b border-stone-100 dark:border-stone-700">
                  <tr>
                    <th class="text-left px-4 py-3 text-xs font-medium text-stone-400">日期</th>
                    <th class="text-left px-4 py-3 text-xs font-medium text-stone-400">工作</th>
                    <th class="text-left px-4 py-3 text-xs font-medium text-stone-400">步驟</th>
                    <th class="text-left px-4 py-3 text-xs font-medium text-stone-400">執行人</th>
                    <th class="text-left px-4 py-3 text-xs font-medium text-stone-400">狀態</th>
                    <th class="text-left px-4 py-3 text-xs font-medium text-stone-400">完成時間</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-stone-50 dark:divide-zinc-700">
                  <tr v-for="r in historyRecords" :key="r.id" class="hover:bg-stone-50 dark:hover:bg-zinc-700/30">
                    <td class="px-4 py-2.5 text-stone-600 dark:text-stone-300 whitespace-nowrap">{{ r.date }}</td>
                    <td class="px-4 py-2.5">
                      <span class="text-stone-800 dark:text-stone-100 font-medium">{{ r.taskName }}</span>
                      <span :class="r.priority === 'required' ? 'text-teal-600' : 'text-amber-600'"
                            class="ml-1.5 text-xs">{{ r.priority === 'required' ? '必' : '選' }}</span>
                    </td>
                    <td class="px-4 py-2.5 text-stone-500 dark:text-stone-400">{{ r.stepName }}</td>
                    <td class="px-4 py-2.5 text-stone-600 dark:text-stone-300">
                      {{ r.actualDoerName || r.assigneeName }}
                      <span v-if="r.actualDoer && r.actualDoer !== r.assigneeId"
                            class="text-xs text-amber-500 ml-1">接手</span>
                    </td>
                    <td class="px-4 py-2.5">
                      <span :class="statusBadgeClass(r.status)"
                            class="text-xs px-2 py-0.5 rounded-full font-medium">
                        {{ statusLabel(r.status) }}
                      </span>
                    </td>
                    <td class="px-4 py-2.5 text-stone-400 text-xs whitespace-nowrap">{{ r.doneAt ? r.doneAt.slice(0, 16) : '—' }}</td>
                  </tr>
                  <tr v-if="historyRecords.length === 0">
                    <td colspan="6" class="text-center py-10 text-stone-400">無紀錄</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

      </div>

      <!-- ══════════════════════════════════
           工作項目 Modal
      ══════════════════════════════════ -->
      <div v-if="taskModal.show"
           class="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4"
           @click.self="taskModal.show = false">
        <div class="bg-white dark:bg-zinc-800 rounded-2xl w-full max-w-md shadow-2xl">
          <div class="flex items-center justify-between px-5 py-4 border-b border-stone-100 dark:border-stone-700">
            <h3 class="font-bold text-stone-800 dark:text-stone-100">{{ taskModal.id ? '編輯項目' : '新增項目' }}</h3>
            <button @click="taskModal.show = false" class="text-stone-400 hover:text-stone-600">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </button>
          </div>
          <div class="px-5 py-4 space-y-4">
            <div>
              <label class="text-xs font-medium text-stone-500 dark:text-stone-400 mb-1 block">項目名稱 *</label>
              <input v-model="taskModal.name" type="text" placeholder="例：餐廳拖地"
                     class="w-full border border-stone-200 dark:border-stone-600 rounded-xl px-3 py-2 text-sm bg-white dark:bg-zinc-700 text-stone-800 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-teal-500" />
            </div>
            <div>
              <label class="text-xs font-medium text-stone-500 dark:text-stone-400 mb-1 block">說明</label>
              <textarea v-model="taskModal.description" rows="2" placeholder="選填"
                        class="w-full border border-stone-200 dark:border-stone-600 rounded-xl px-3 py-2 text-sm bg-white dark:bg-zinc-700 text-stone-800 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none"></textarea>
            </div>
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="text-xs font-medium text-stone-500 dark:text-stone-400 mb-1 block">類型</label>
                <select v-model="taskModal.category"
                        class="w-full border border-stone-200 dark:border-stone-600 rounded-xl px-3 py-2 text-sm bg-white dark:bg-zinc-700 text-stone-800 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-teal-500">
                  <option value="daily">每日重複</option>
                  <option value="once">一次性</option>
                </select>
              </div>
              <div>
                <label class="text-xs font-medium text-stone-500 dark:text-stone-400 mb-1 block">優先度</label>
                <select v-model="taskModal.priority"
                        class="w-full border border-stone-200 dark:border-stone-600 rounded-xl px-3 py-2 text-sm bg-white dark:bg-zinc-700 text-stone-800 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-teal-500">
                  <option value="required">必做</option>
                  <option value="optional">選做</option>
                </select>
              </div>
            </div>
            <div>
              <label class="text-xs font-medium text-stone-500 dark:text-stone-400 mb-1 block">預估時間（分鐘）</label>
              <input v-model.number="taskModal.estMinutes" type="number" min="0" placeholder="0"
                     class="w-full border border-stone-200 dark:border-stone-600 rounded-xl px-3 py-2 text-sm bg-white dark:bg-zinc-700 text-stone-800 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-teal-500" />
            </div>
          </div>
          <div class="flex gap-2 px-5 pb-5">
            <button @click="taskModal.show = false"
                    class="flex-1 py-2.5 rounded-xl border border-stone-200 dark:border-stone-600 text-sm text-stone-600 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-zinc-700 transition-colors">
              取消
            </button>
            <button @click="saveTask" :disabled="saving"
                    class="flex-1 py-2.5 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-sm font-medium transition-colors disabled:opacity-50">
              {{ saving ? '儲存中...' : '儲存' }}
            </button>
          </div>
        </div>
      </div>

      <!-- ══════════════════════════════════
           步驟 Modal
      ══════════════════════════════════ -->
      <div v-if="stepModal.show"
           class="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4"
           @click.self="stepModal.show = false">
        <div class="bg-white dark:bg-zinc-800 rounded-2xl w-full max-w-md shadow-2xl">
          <div class="flex items-center justify-between px-5 py-4 border-b border-stone-100 dark:border-stone-700">
            <div>
              <h3 class="font-bold text-stone-800 dark:text-stone-100">{{ stepModal.id ? '編輯步驟' : '新增步驟' }}</h3>
              <p class="text-xs text-stone-400 mt-0.5">{{ stepModal.taskName }}</p>
            </div>
            <button @click="stepModal.show = false" class="text-stone-400 hover:text-stone-600">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </button>
          </div>
          <div class="px-5 py-4 space-y-4">
            <div>
              <label class="text-xs font-medium text-stone-500 dark:text-stone-400 mb-1 block">步驟名稱 *</label>
              <input v-model="stepModal.name" type="text" placeholder="例：用拖把清潔地板"
                     class="w-full border border-stone-200 dark:border-stone-600 rounded-xl px-3 py-2 text-sm bg-white dark:bg-zinc-700 text-stone-800 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-teal-500" />
            </div>
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="text-xs font-medium text-stone-500 dark:text-stone-400 mb-1 block">順序</label>
                <input v-model.number="stepModal.stepOrder" type="number" min="1"
                       class="w-full border border-stone-200 dark:border-stone-600 rounded-xl px-3 py-2 text-sm bg-white dark:bg-zinc-700 text-stone-800 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-teal-500" />
              </div>
              <div>
                <label class="text-xs font-medium text-stone-500 dark:text-stone-400 mb-1 block">預估時間（分鐘）</label>
                <input v-model.number="stepModal.estMinutes" type="number" min="0"
                       class="w-full border border-stone-200 dark:border-stone-600 rounded-xl px-3 py-2 text-sm bg-white dark:bg-zinc-700 text-stone-800 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-teal-500" />
              </div>
            </div>
            <div>
              <label class="text-xs font-medium text-stone-500 dark:text-stone-400 mb-1 block">備註提示</label>
              <input v-model="stepModal.note" type="text" placeholder="選填，給執行者的提示"
                     class="w-full border border-stone-200 dark:border-stone-600 rounded-xl px-3 py-2 text-sm bg-white dark:bg-zinc-700 text-stone-800 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-teal-500" />
            </div>
            <div>
              <label class="text-xs font-medium text-stone-500 dark:text-stone-400 mb-2 block">負責人</label>
              <div class="space-y-1.5 max-h-40 overflow-y-auto">
                <label v-for="s in staffList" :key="s.id"
                       class="flex items-center gap-2.5 cursor-pointer group">
                  <input type="checkbox" :value="s.id" v-model="stepModal.assigneeIds"
                         class="rounded border-stone-300 text-teal-600 focus:ring-teal-500" />
                  <img v-if="s.picture" :src="s.picture" class="w-6 h-6 rounded-full" />
                  <span class="text-sm text-stone-700 dark:text-stone-200 group-hover:text-teal-600 transition-colors">{{ s.name }}</span>
                </label>
              </div>
            </div>
          </div>
          <div class="flex gap-2 px-5 pb-5">
            <button @click="stepModal.show = false"
                    class="flex-1 py-2.5 rounded-xl border border-stone-200 dark:border-stone-600 text-sm text-stone-600 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-zinc-700 transition-colors">
              取消
            </button>
            <button @click="saveStep" :disabled="saving"
                    class="flex-1 py-2.5 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-sm font-medium transition-colors disabled:opacity-50">
              {{ saving ? '儲存中...' : '儲存' }}
            </button>
          </div>
        </div>
      </div>

    </div>
  </ClientOnly>
</template>

<script setup>
definePageMeta({ layout: 'staff', requiredPermission: 'staff.task.manage' })

const commonStore = useCommonStore()
const BASE        = () => commonStore.data.main_url + '/holy/task'
const REC_BASE    = () => commonStore.data.main_url + '/holy/task/record'

// ── 日期 ──────────────────────────────────────────────────────
const today = new Date()
const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
const weekDays = ['日', '一', '二', '三', '四', '五', '六']
const todayLabel = `${today.getMonth() + 1} 月 ${today.getDate()} 日　星期${weekDays[today.getDay()]}`

// ── 分頁 ──────────────────────────────────────────────────────
const activeTab = ref('overview')
const tabs = [
  { key: 'overview',  label: '今日總覽' },
  { key: 'tasks',     label: '項目管理' },
  { key: 'schedule',  label: '排休管理' },
  { key: 'history',   label: '歷史紀錄' }
]

// ── 員工清單 ──────────────────────────────────────────────────
const staffList = ref([])
const staffMap  = computed(() => Object.fromEntries(staffList.value.map(s => [s.id, s])))

async function loadStaffList() {
  try {
    const res = await fetch(`${BASE()}/staff/list`)
    staffList.value = await res.json()
  } catch { staffList.value = [] }
}

// ── 今日總覽 ──────────────────────────────────────────────────
const loadingOverview = ref(false)
const generating      = ref(false)
const overviewRecords = ref([])
const summary         = ref({ requiredTotal: 0, requiredDone: 0, optionalTotal: 0, optionalDone: 0 })
const expandedGroups  = ref(new Set())

const reqPct = computed(() =>
  summary.value.requiredTotal ? Math.round(summary.value.requiredDone / summary.value.requiredTotal * 100) : 0)
const optPct = computed(() =>
  summary.value.optionalTotal ? Math.round(summary.value.optionalDone / summary.value.optionalTotal * 100) : 0)

// 依 taskId 分組
const groupedRecords = computed(() => {
  const map = new Map()
  for (const r of overviewRecords.value) {
    if (!map.has(r.taskId)) {
      map.set(r.taskId, { taskId: r.taskId, taskName: r.taskName, priority: r.priority, records: [], doneCount: 0, totalCount: 0 })
    }
    const g = map.get(r.taskId)
    g.records.push(r)
    g.totalCount++
    if (r.status === 'done') g.doneCount++
  }
  return [...map.values()]
})
const requiredGroups = computed(() => groupedRecords.value.filter(g => g.priority === 'required'))
const optionalGroups = computed(() => groupedRecords.value.filter(g => g.priority === 'optional'))

function toggleGroup(taskId) {
  const s = new Set(expandedGroups.value)
  s.has(taskId) ? s.delete(taskId) : s.add(taskId)
  expandedGroups.value = s
}

async function generateRecords() {
  generating.value = true
  try {
    await fetch(`${REC_BASE()}/generate/${todayStr}`, { method: 'POST' })
    await loadOverview()
  } finally { generating.value = false }
}

async function loadOverview() {
  loadingOverview.value = true
  try {
    const res  = await fetch(`${REC_BASE()}/daily/${todayStr}`)
    const data = await res.json()
    overviewRecords.value = data.records || []
    summary.value = data.summary || { requiredTotal: 0, requiredDone: 0, optionalTotal: 0, optionalDone: 0 }
    // 預設展開所有群組
    expandedGroups.value = new Set(overviewRecords.value.map(r => r.taskId))
  } catch { overviewRecords.value = [] }
  finally  { loadingOverview.value = false }
}

// 今日排休
const todaySchedule = ref([])
function isOnLeave(customerId) {
  return todaySchedule.value.some(s => s.customerId === customerId && s.date === todayStr)
}
async function loadTodaySchedule() {
  const ym = todayStr.slice(0, 7)
  try {
    const res = await fetch(`${BASE()}/schedule/${ym}`)
    todaySchedule.value = await res.json()
  } catch { todaySchedule.value = [] }
}

// ── 工作項目 ──────────────────────────────────────────────────
const tasks        = ref([])
const loadingTasks = ref(false)
const showInactive = ref(false)
const expandedSteps = ref(new Set())
const saving        = ref(false)

function toggleSteps(taskId) {
  const s = new Set(expandedSteps.value)
  s.has(taskId) ? s.delete(taskId) : s.add(taskId)
  expandedSteps.value = s
}

async function loadTasks() {
  loadingTasks.value = true
  try {
    const res = await fetch(`${BASE()}/list?includeInactive=${showInactive.value}`)
    tasks.value = await res.json()
  } catch { tasks.value = [] }
  finally { loadingTasks.value = false }
}

// Task Modal
const taskModal = reactive({
  show: false, id: null, name: '', description: '',
  category: 'daily', priority: 'required', estMinutes: 0
})

function openTaskModal(task) {
  if (task) {
    Object.assign(taskModal, { show: true, id: task.id, name: task.name,
      description: task.description || '', category: task.category,
      priority: task.priority, estMinutes: task.estMinutes || 0 })
  } else {
    Object.assign(taskModal, { show: true, id: null, name: '', description: '',
      category: 'daily', priority: 'required', estMinutes: 0 })
  }
}

async function saveTask() {
  if (!taskModal.name.trim()) return
  saving.value = true
  try {
    const body = { name: taskModal.name, description: taskModal.description,
                   category: taskModal.category, priority: taskModal.priority,
                   estMinutes: taskModal.estMinutes }
    if (taskModal.id) {
      await fetch(`${BASE()}/update`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...body, id: taskModal.id }) })
    } else {
      await fetch(`${BASE()}/save`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    }
    taskModal.show = false
    await loadTasks()
  } finally { saving.value = false }
}

async function toggleTask(task) {
  await fetch(`${BASE()}/toggle/${task.id}`, { method: 'PUT' })
  await loadTasks()
}

// Step Modal
const stepModal = reactive({
  show: false, id: null, taskId: null, taskName: '',
  name: '', stepOrder: 1, estMinutes: 0, note: '', assigneeIds: []
})

function openStepModal(task, step) {
  if (step) {
    Object.assign(stepModal, { show: true, id: step.id, taskId: task.id, taskName: task.name,
      name: step.name, stepOrder: step.stepOrder, estMinutes: step.estMinutes || 0,
      note: step.note || '', assigneeIds: [...(step.assigneeIds || [])] })
  } else {
    const nextOrder = (task.steps?.length || 0) + 1
    Object.assign(stepModal, { show: true, id: null, taskId: task.id, taskName: task.name,
      name: '', stepOrder: nextOrder, estMinutes: 0, note: '', assigneeIds: [] })
  }
}

async function saveStep() {
  if (!stepModal.name.trim()) return
  saving.value = true
  try {
    const body = { taskId: stepModal.taskId, name: stepModal.name,
                   stepOrder: stepModal.stepOrder, estMinutes: stepModal.estMinutes,
                   note: stepModal.note, assigneeIds: stepModal.assigneeIds }
    if (stepModal.id) {
      await fetch(`${BASE()}/step/update`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...body, id: stepModal.id }) })
    } else {
      await fetch(`${BASE()}/step/save`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    }
    stepModal.show = false
    await loadTasks()
  } finally { saving.value = false }
}

async function removeStep(step) {
  if (!confirm(`確定刪除步驟「${step.name}」？`)) return
  await fetch(`${BASE()}/step/remove/${step.id}`, { method: 'DELETE' })
  await loadTasks()
}

// ── 排休管理 ──────────────────────────────────────────────────
const scheduleDate    = ref(new Date(today.getFullYear(), today.getMonth(), 1))
const scheduleRecords = ref([])

const scheduleYearMonth = computed(() => {
  const d = scheduleDate.value
  return `${d.getFullYear()} 年 ${d.getMonth() + 1} 月`
})
const scheduleYM = computed(() => {
  const d = scheduleDate.value
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
})

const scheduleDays = computed(() => {
  const d   = scheduleDate.value
  const year = d.getFullYear(), month = d.getMonth()
  const days = new Date(year, month + 1, 0).getDate()
  return Array.from({ length: days }, (_, i) => {
    const dt  = new Date(year, month, i + 1)
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(i + 1).padStart(2, '0')}`
    return { date: dateStr, dayNum: i + 1, weekday: ['日','一','二','三','四','五','六'][dt.getDay()], isSun: dt.getDay() === 0 }
  })
})

function getScheduleStatus(customerId, date) {
  return scheduleRecords.value.some(s => s.customerId === customerId && s.date === date)
}

async function toggleSchedule(customerId, date) {
  if (getScheduleStatus(customerId, date)) {
    await fetch(`${BASE()}/schedule/remove`, {
      method: 'DELETE', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ customerId, date })
    })
  } else {
    await fetch(`${BASE()}/schedule/save`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ customerId, date, type: 'off' })
    })
  }
  await loadSchedule()
}

async function loadSchedule() {
  try {
    const res = await fetch(`${BASE()}/schedule/${scheduleYM.value}`)
    scheduleRecords.value = await res.json()
  } catch { scheduleRecords.value = [] }
}

function prevMonth() { scheduleDate.value = new Date(scheduleDate.value.getFullYear(), scheduleDate.value.getMonth() - 1, 1); loadSchedule() }
function nextMonth() { scheduleDate.value = new Date(scheduleDate.value.getFullYear(), scheduleDate.value.getMonth() + 1, 1); loadSchedule() }

// ── 歷史紀錄 ──────────────────────────────────────────────────
const histFilter = reactive({
  from: todayStr.slice(0, 8) + '01',
  to:   todayStr,
  customerId: '',
  taskId: ''
})
const historyRecords  = ref([])
const loadingHistory  = ref(false)

async function loadHistory() {
  loadingHistory.value = true
  try {
    const params = new URLSearchParams()
    if (histFilter.from)       params.set('from', histFilter.from)
    if (histFilter.to)         params.set('to',   histFilter.to)
    if (histFilter.customerId) params.set('customerId', histFilter.customerId)
    if (histFilter.taskId)     params.set('taskId', histFilter.taskId)
    const res = await fetch(`${REC_BASE()}/history?${params}`)
    historyRecords.value = await res.json()
  } catch { historyRecords.value = [] }
  finally { loadingHistory.value = false }
}

// ── 工具函式 ──────────────────────────────────────────────────
function statusLabel(s) {
  return { pending: '待處理', in_progress: '進行中', done: '已完成', skipped: '略過' }[s] || s
}
function statusDot(s) {
  return { pending: 'bg-stone-300', in_progress: 'bg-amber-400', done: 'bg-teal-500', skipped: 'bg-stone-200' }[s] || 'bg-stone-300'
}
function statusTextClass(s) {
  return { pending: 'text-stone-400', in_progress: 'text-amber-500', done: 'text-teal-600', skipped: 'text-stone-300' }[s] || 'text-stone-400'
}
function statusBadgeClass(s) {
  return { pending: 'bg-stone-100 dark:bg-zinc-700 text-stone-500', in_progress: 'bg-amber-100 dark:bg-amber-900/30 text-amber-600', done: 'bg-teal-100 dark:bg-teal-900/30 text-teal-700', skipped: 'bg-stone-50 text-stone-400' }[s] || ''
}
function groupStatusClass(group) {
  if (group.doneCount === group.totalCount && group.totalCount > 0) return 'bg-teal-500'
  if (group.doneCount > 0) return 'bg-amber-400'
  return 'bg-stone-300 dark:bg-zinc-500'
}

// ── 初始化 ────────────────────────────────────────────────────
onMounted(async () => {
  await loadStaffList()
  await Promise.all([
    generateRecords(),
    loadTodaySchedule(),
    loadTasks(),
    loadSchedule()
  ])
})
</script>
