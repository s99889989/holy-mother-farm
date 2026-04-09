<template>
  <div class="min-h-screen bg-[#F5F2ED] dark:bg-zinc-900 font-['Noto_Serif_TC',serif]">

    <!-- ══ Header ══ -->
    <header class="bg-white dark:bg-zinc-900 border-b border-stone-200 dark:border-stone-700 px-4 py-3 sticky top-0 z-30">
      <div class="max-w-2xl mx-auto flex items-center justify-between mb-2">
        <div class="flex items-center gap-2.5">
          <div class="w-8 h-8 rounded-lg bg-stone-800 dark:bg-zinc-700 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">✦</div>
          <div>
            <h1 class="font-bold text-stone-800 dark:text-stone-100 leading-none text-sm sm:text-base">工作待辦清單</h1>
            <p class="text-xs text-stone-400 dark:text-stone-500 mt-0.5">
              <template v-if="activeTab === 'todo'">{{ pendingCount }} 項待完成 · {{ doneCount }} 項已完成</template>
              <template v-else>{{ dailyTasks.length }} 項例行任務</template>
            </p>
          </div>
        </div>
        <span :class="apiOnline ? 'text-green-600' : 'text-red-500'" class="text-xs flex items-center gap-1.5 font-medium">
          <span :class="apiOnline ? 'bg-green-500' : 'bg-red-400'" class="w-2 h-2 rounded-full"></span>
          <span class="hidden sm:inline">{{ apiOnline ? '連線中' : '離線' }}</span>
        </span>
      </div>
      <!-- Tab 切換 -->
      <div class="max-w-2xl mx-auto flex gap-1">
        <button @click="activeTab = 'todo'"
                :class="activeTab === 'todo' ? 'bg-stone-800 dark:bg-zinc-600 text-white' : 'bg-stone-100 dark:bg-zinc-800 text-stone-600 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-zinc-700'"
                class="px-4 py-1.5 rounded-lg text-sm font-medium transition-colors">待辦</button>
        <button @click="switchToDaily"
                :class="activeTab === 'daily' ? 'bg-stone-800 dark:bg-zinc-600 text-white' : 'bg-stone-100 dark:bg-zinc-800 text-stone-600 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-zinc-700'"
                class="px-4 py-1.5 rounded-lg text-sm font-medium transition-colors">例行任務</button>
      </div>
    </header>

    <div class="max-w-2xl mx-auto px-4 py-5">

      <!-- ══════════════ TAB: 待辦 ══════════════ -->
      <template v-if="activeTab === 'todo'">
        <div class="flex h-1.5 rounded-full overflow-hidden bg-stone-200 dark:bg-zinc-700 mb-5">
          <div class="bg-red-400 transition-all duration-500"   :style="{width: statWidth('high')}"></div>
          <div class="bg-amber-400 transition-all duration-500" :style="{width: statWidth('mid')}"></div>
          <div class="bg-teal-500 transition-all duration-500"  :style="{width: statWidth('low')}"></div>
          <div class="bg-stone-300 transition-all duration-500" :style="{width: statWidth('done')}"></div>
        </div>

        <!-- ── 篩選列 ── -->
        <div class="flex flex-wrap gap-2 mb-4">
          <!-- 分類 -->
          <button v-for="cat in ['全部', ...categories]" :key="cat"
                  @click="filterCat = (cat === '全部') ? null : cat"
                  :class="(filterCat === null && cat === '全部') || filterCat === cat
                  ? 'bg-stone-800 text-white'
                  : 'bg-white dark:bg-zinc-800 text-stone-500 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-zinc-700 border border-stone-200 dark:border-stone-600'"
                  class="px-3 py-1 rounded-full text-xs font-medium transition-all">
            {{ cat }}
          </button>
          <button @click="showCatManager = true"
                  class="px-3 py-1 rounded-full text-xs text-stone-400 dark:text-stone-500 border border-dashed border-stone-300 dark:border-stone-600 hover:border-stone-500 dark:hover:border-stone-400 transition-colors">
            ＋ 分類
          </button>
        </div>
        <div class="flex gap-2 mb-5">
          <!-- 優先度 -->
          <button v-for="p in priorities" :key="p.key"
                  @click="filterPri = filterPri === p.key ? null : p.key"
                  :class="filterPri === p.key ? p.activeCls : 'bg-white dark:bg-zinc-800 border border-stone-200 dark:border-stone-600 text-stone-500 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-zinc-700'"
                  class="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-all border">
            <span :class="p.dot" class="w-1.5 h-1.5 rounded-full flex-shrink-0"></span>{{ p.label }}
          </button>
          <button @click="showDone = !showDone"
                  :class="showDone ? 'bg-stone-700 text-white border-stone-700' : 'bg-white dark:bg-zinc-800 text-stone-400 dark:text-stone-500 border-stone-200 dark:border-stone-600'"
                  class="ml-auto px-3 py-1 rounded-full text-xs font-medium transition-all border">
            {{ showDone ? '隱藏' : '顯示' }}已完成
          </button>
        </div>

        <!-- ── 新增區 ── -->
        <div class="bg-white dark:bg-zinc-800 rounded-2xl border border-stone-200 dark:border-stone-700 shadow-sm overflow-hidden mb-5">
          <div class="flex items-center gap-3 px-4 py-3 border-b border-stone-100 dark:border-stone-700">
            <span class="text-stone-300 dark:text-stone-600 text-xl select-none leading-none">+</span>
            <input v-model="newTitle" @keydown.enter="addTodo"
                   placeholder="新增待辦事項… (Enter 快速新增)"
                   class="flex-1 text-sm text-stone-700 dark:text-stone-200 placeholder-stone-300 dark:placeholder-stone-600 outline-none bg-transparent" />
          </div>
          <div class="flex items-center gap-2 px-4 py-2.5 flex-wrap">
            <select v-model="newPri"
                    class="text-xs rounded-lg px-2 py-1.5 border border-stone-200 dark:border-stone-600 bg-stone-50 dark:bg-zinc-700 text-stone-600 dark:text-stone-300 outline-none cursor-pointer">
              <option value="high">🔴 高優先</option>
              <option value="mid">🟡 中優先</option>
              <option value="low">🟢 低優先</option>
            </select>
            <select v-model="newCat"
                    class="text-xs rounded-lg px-2 py-1.5 border border-stone-200 dark:border-stone-600 bg-stone-50 dark:bg-zinc-700 text-stone-600 dark:text-stone-300 outline-none cursor-pointer">
              <option value="">無分類</option>
              <option v-for="c in categories" :key="c" :value="c">{{ c }}</option>
            </select>
            <input v-model="newDue" type="date"
                   class="text-xs rounded-lg px-2 py-1.5 border border-stone-200 dark:border-stone-600 bg-stone-50 dark:bg-zinc-700 text-stone-600 dark:text-stone-300 outline-none" />
            <button @click="addTodo" :disabled="!newTitle.trim() || saving"
                    class="ml-auto px-4 py-1.5 bg-stone-800 dark:bg-zinc-600 text-white text-xs rounded-lg hover:bg-stone-700 dark:hover:bg-zinc-500 disabled:opacity-30 transition-all">
              {{ saving ? '…' : '新增' }}
            </button>
          </div>
        </div>

        <!-- ── 清單 ── -->
        <div v-if="loading" class="text-center py-16 text-stone-300 dark:text-stone-600 text-sm">載入中…</div>

        <div v-else class="space-y-2">
          <template v-for="todo in filteredTodos" :key="todo.id">
            <div :class="['bg-white dark:bg-zinc-800 rounded-2xl border shadow-sm overflow-hidden transition-all duration-200',
               todo.done ? 'opacity-50 border-stone-100 dark:border-zinc-700' : priorityBorder(todo.priority)]">

              <!-- 主列 -->
              <div class="flex items-start gap-3 px-4 py-3.5">
                <!-- 完成圓鈕 -->
                <button @click="toggleDone(todo)"
                        :class="todo.done ? 'bg-teal-500 border-teal-500' : 'border-stone-300 dark:border-stone-600 hover:border-teal-400'"
                        class="mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all">
                  <svg v-if="todo.done" class="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"/>
                  </svg>
                </button>

                <!-- 文字區 -->
                <div class="flex-1 min-w-0">
                  <div class="flex items-start justify-between gap-2">
                    <div class="flex-1 min-w-0">
                      <!-- 標題（雙擊編輯） -->
                      <p v-if="editingId !== todo.id"
                         @dblclick="startEdit(todo)"
                         :class="todo.done ? 'line-through text-stone-400 dark:text-stone-600' : 'text-stone-800 dark:text-stone-100'"
                         class="text-sm font-medium leading-snug cursor-text select-none"
                         title="雙擊編輯">{{ todo.title }}</p>
                      <input v-else
                             v-model="editTitle"
                             @keydown.enter="saveEdit(todo)"
                             @keydown.escape="editingId = null"
                             @blur="saveEdit(todo)"
                             ref="editInputEl"
                             class="text-sm font-medium text-stone-800 dark:text-stone-100 w-full outline-none border-b-2 border-teal-400 bg-transparent pb-0.5" />

                      <!-- 標籤列 -->
                      <div class="flex items-center gap-2 mt-1.5 flex-wrap">
                      <span v-if="todo.category"
                            class="text-xs px-2 py-0.5 rounded-full bg-stone-100 dark:bg-zinc-700 text-stone-500 dark:text-stone-400">{{ todo.category }}</span>
                        <span :class="priorityBadge(todo.priority).cls"
                              class="text-xs px-2 py-0.5 rounded-full font-medium">{{ priorityBadge(todo.priority).label }}</span>
                        <span v-if="todo.dueDate"
                              :class="isDueWarning(todo) ? 'text-red-500 font-semibold' : 'text-stone-400'"
                              class="text-xs flex items-center gap-0.5">
                        <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                        </svg>
                        {{ todo.dueDate }}{{ isDueWarning(todo) ? ' ⚠' : '' }}
                      </span>
                        <span v-if="todo.subtasks?.length" class="text-xs text-stone-400 dark:text-stone-500">
                        ✓ {{ todo.subtasks.filter(s => s.done).length }}/{{ todo.subtasks.length }}
                      </span>
                        <!-- 附件指示器 -->
                        <span v-if="todo.note" class="text-xs text-stone-400 dark:text-stone-500 flex items-center gap-0.5">
                        <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
                        備註
                      </span>
                        <span v-if="todo.linkUrl" class="text-xs text-blue-400 flex items-center gap-0.5">
                        <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"/></svg>
                        連結
                      </span>
                        <span v-if="todo.attachments?.length" class="text-xs text-indigo-400 flex items-center gap-0.5">
                        <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"/></svg>
                        {{ todo.attachments.length }} 個附件
                      </span>
                      </div>
                    </div>

                    <!-- 操作按鈕 -->
                    <div class="flex items-center gap-0.5 flex-shrink-0">
                      <!-- 詳情按鈕 -->
                      <button @click="openDetailModal(todo)"
                              class="p-1.5 text-stone-300 dark:text-stone-600 hover:text-blue-500 dark:hover:text-blue-400 transition-colors rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/></svg>
                      </button>
                      <button @click="toggleExpand(todo.id)"
                              class="p-1.5 text-stone-300 dark:text-stone-600 hover:text-stone-600 dark:hover:text-stone-300 transition-colors rounded-lg hover:bg-stone-50 dark:hover:bg-zinc-700">
                        <svg :class="expanded.includes(todo.id) ? 'rotate-180' : ''"
                             class="w-4 h-4 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
                        </svg>
                      </button>
                      <button @click="confirmDelete(todo)"
                              class="p-1.5 text-stone-300 dark:text-stone-600 hover:text-red-400 transition-colors rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <!-- 子任務展開區 -->
              <div v-if="expanded.includes(todo.id)"
                   class="border-t border-stone-100 dark:border-stone-700 px-4 py-3 bg-stone-50/60 dark:bg-zinc-900/40">
                <p class="text-xs text-stone-400 dark:text-stone-500 font-semibold uppercase tracking-widest mb-2.5">子任務</p>

                <div class="space-y-2 mb-3">
                  <div v-for="sub in todo.subtasks" :key="sub.id" class="flex items-center gap-2">
                    <button @click="toggleSubDone(todo, sub)"
                            :class="sub.done ? 'bg-teal-400 border-teal-400' : 'border-stone-300 dark:border-stone-600 hover:border-teal-400'"
                            class="w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 transition-all">
                      <svg v-if="sub.done" class="w-2 h-2 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"/>
                      </svg>
                    </button>
                    <span :class="sub.done ? 'line-through text-stone-400 dark:text-stone-600' : 'text-stone-600 dark:text-stone-300'"
                          class="text-xs flex-1 leading-snug">{{ sub.title }}</span>
                    <button @click="deleteSubtask(todo, sub.id)"
                            class="text-stone-300 dark:text-stone-600 hover:text-red-400 transition-colors p-0.5">
                      <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                      </svg>
                    </button>
                  </div>
                  <p v-if="!todo.subtasks?.length" class="text-xs text-stone-300 dark:text-stone-600 italic">尚無子任務</p>
                </div>

                <div class="flex items-center gap-2 pt-2 border-t border-stone-100 dark:border-stone-700">
                  <input v-model="subInputs[todo.id]"
                         @keydown.enter="addSubtask(todo)"
                         placeholder="輸入子任務… (Enter)"
                         class="flex-1 text-xs text-stone-600 dark:text-stone-300 placeholder-stone-300 dark:placeholder-stone-600 outline-none bg-transparent border-b border-stone-200 dark:border-stone-700 pb-0.5 focus:border-teal-400 transition-colors" />
                  <button @click="addSubtask(todo)"
                          class="text-xs text-teal-600 dark:text-teal-400 hover:text-teal-700 dark:hover:text-teal-300 font-medium transition-colors">新增</button>
                </div>
              </div>

            </div>
          </template>

          <div v-if="filteredTodos.length === 0 && !loading"
               class="text-center py-16 text-stone-300 dark:text-stone-600 text-sm">
            <p class="text-3xl mb-3">✦</p>
            <p>沒有符合的待辦事項</p>
          </div>
        </div>
      </template>

      <!-- ══════════════ TAB: 例行任務 ══════════════ -->
      <template v-if="activeTab === 'daily'">

        <!-- ── 今日打勾區 ── -->
        <div class="mb-5">
          <div class="flex items-center justify-between mb-3">
            <div>
              <h2 class="font-semibold text-stone-700 dark:text-stone-100 text-sm">今日例行任務</h2>
              <p class="text-xs text-stone-400 dark:text-stone-500 mt-0.5">{{ todayStr }} · 完成 {{ todayDoneCount }}/{{ dailyTasks.length }}</p>
            </div>
            <button @click="showDailyManager = true"
                    class="flex items-center gap-1 px-3 py-1.5 bg-stone-800 dark:bg-zinc-600 text-white text-xs rounded-lg hover:bg-stone-700 dark:hover:bg-zinc-500 transition-colors">
              <span class="text-sm leading-none">⚙</span> 管理任務
            </button>
          </div>

          <!-- 今日進度條 -->
          <div class="h-1.5 rounded-full overflow-hidden bg-stone-200 dark:bg-zinc-700 mb-4">
            <div class="h-full bg-teal-500 transition-all duration-500 rounded-full"
                 :style="{width: dailyTasks.length ? (todayDoneCount / dailyTasks.length * 100) + '%' : '0%'}"></div>
          </div>

          <!-- 分群顯示 -->
          <div v-if="dailyTaskGroups.length === 0" class="text-center py-12 text-stone-300 dark:text-stone-600 text-sm">
            <p class="text-3xl mb-3">☀</p><p>尚未建立例行任務</p>
          </div>

          <div v-for="group in dailyTaskGroups" :key="group.name" class="mb-4">
            <!-- 群組標題 -->
            <p v-if="group.name" class="text-xs font-semibold text-stone-400 dark:text-stone-500 uppercase tracking-widest mb-2">{{ group.name }}</p>
            <div class="space-y-2">
              <div v-for="task in group.tasks" :key="task.id"
                   :class="['flex items-center gap-3 px-4 py-3 rounded-2xl border transition-all duration-200 cursor-pointer',
                     isTodayDone(task.id)
                       ? 'bg-teal-50 dark:bg-teal-900/20 border-teal-200 dark:border-teal-800/50'
                       : 'bg-white dark:bg-zinc-800 border-stone-200 dark:border-stone-700']"
                   @click="toggleDailyDone(task.id)">
                <!-- 勾選圓鈕 -->
                <div :class="['w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all',
                       isTodayDone(task.id) ? 'bg-teal-500 border-teal-500' : 'border-stone-300 dark:border-stone-600']">
                  <svg v-if="isTodayDone(task.id)" class="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"/>
                  </svg>
                </div>
                <!-- 任務名稱 -->
                <span :class="isTodayDone(task.id) ? 'line-through text-stone-400 dark:text-stone-600' : 'text-stone-700 dark:text-stone-200'"
                      class="text-sm font-medium flex-1 select-none">{{ task.title }}</span>
                <!-- 本月完成率 -->
                <span class="text-xs text-stone-400 dark:text-stone-500 flex-shrink-0">
                  {{ monthRate(task.id) }}%
                </span>
              </div>
            </div>
          </div>
        </div>

        <!-- ── 月曆歷史 ── -->
        <div class="bg-white dark:bg-zinc-800 rounded-2xl border border-stone-200 dark:border-stone-700 shadow-sm overflow-hidden">
          <div class="flex items-center justify-between px-4 py-3 border-b border-stone-100 dark:border-stone-700">
            <button @click="dailyPrevMonth" class="p-1 hover:bg-stone-100 dark:hover:bg-zinc-700 rounded-lg transition-colors">
              <svg class="w-4 h-4 text-stone-500 dark:text-stone-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
              </svg>
            </button>
            <span class="text-sm font-semibold text-stone-700 dark:text-stone-100">{{ dailyCalYear }}年 {{ dailyCalMonth }}月 完成記錄</span>
            <button @click="dailyNextMonth" class="p-1 hover:bg-stone-100 dark:hover:bg-zinc-700 rounded-lg transition-colors">
              <svg class="w-4 h-4 text-stone-500 dark:text-stone-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
              </svg>
            </button>
          </div>

          <!-- 星期標頭 -->
          <div class="grid grid-cols-7 border-b border-stone-100 dark:border-stone-700">
            <div v-for="w in ['日','一','二','三','四','五','六']" :key="w"
                 :class="w==='日'?'text-red-400':w==='六'?'text-blue-400':'text-stone-400 dark:text-stone-500'"
                 class="py-2 text-center text-xs font-medium">{{ w }}</div>
          </div>

          <!-- 月曆格 -->
          <div class="grid grid-cols-7">
            <div v-for="i in dailyFirstDay" :key="'pad'+i"
                 class="border-b border-r border-stone-50 dark:border-zinc-700/50 min-h-14"></div>
            <div v-for="day in dailyCalDays" :key="day.date"
                 :class="['border-b border-r border-stone-50 dark:border-zinc-700/50 min-h-14 p-1.5 flex flex-col items-center',
                   day.isToday ? 'bg-teal-50 dark:bg-teal-900/20' : '',
                   day.dow===0||day.dow===6 ? 'bg-stone-50/50 dark:bg-zinc-800/30' : '']">
              <!-- 日期 -->
              <span :class="['text-xs font-bold w-5 h-5 flex items-center justify-center rounded-full mb-1',
                day.isToday ? 'bg-teal-600 text-white' :
                day.dow===0 ? 'text-red-400' : day.dow===6 ? 'text-blue-400' : 'text-stone-500 dark:text-stone-400']">
                {{ day.d }}
              </span>
              <!-- 完成率圓圈 -->
              <template v-if="day.rate !== null">
                <div :class="['w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold',
                  day.rate === 100 ? 'bg-teal-500 text-white' :
                  day.rate >= 50  ? 'bg-amber-400 text-white' :
                  day.rate > 0    ? 'bg-stone-300 dark:bg-zinc-600 text-stone-700 dark:text-stone-300' :
                                    'bg-stone-100 dark:bg-zinc-700 text-stone-300 dark:text-stone-600']"
                     :title="`完成 ${day.doneCnt}/${dailyTasks.length} 項`">
                  {{ day.rate === 100 ? '✓' : day.doneCnt }}
                </div>
              </template>
            </div>
          </div>

          <!-- 圖例 -->
          <div class="flex items-center gap-4 px-4 py-2.5 border-t border-stone-100 dark:border-stone-700">
            <div class="flex items-center gap-1.5 text-xs text-stone-400 dark:text-stone-500">
              <span class="w-4 h-4 rounded-full bg-teal-500 flex items-center justify-center text-white text-xs">✓</span> 全部完成
            </div>
            <div class="flex items-center gap-1.5 text-xs text-stone-400 dark:text-stone-500">
              <span class="w-4 h-4 rounded-full bg-amber-400"></span> 部分完成
            </div>
            <div class="flex items-center gap-1.5 text-xs text-stone-400 dark:text-stone-500">
              <span class="w-4 h-4 rounded-full bg-stone-200 dark:bg-zinc-600"></span> 少量完成
            </div>
          </div>
        </div>
      </template>

    </div>

    <!-- ══ 分類管理 Modal ══ -->
    <div v-if="showCatManager" class="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-end sm:items-center justify-center z-50">
      <div class="bg-white dark:bg-zinc-800 rounded-t-3xl sm:rounded-2xl shadow-xl w-full sm:max-w-sm p-5">
        <div class="flex items-center justify-between mb-4">
          <h3 class="font-bold text-stone-800 dark:text-stone-100">管理分類</h3>
          <button @click="showCatManager = false" class="text-stone-400 dark:text-stone-500 hover:text-stone-600 dark:hover:text-stone-300 p-1">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>
        <div class="space-y-2 mb-4 max-h-52 overflow-y-auto">
          <div v-for="cat in categories" :key="cat"
               class="flex items-center justify-between px-3 py-2 bg-stone-50 dark:bg-zinc-700 rounded-xl">
            <span class="text-sm text-stone-700 dark:text-stone-200">{{ cat }}</span>
            <button @click="deleteCategory(cat)" class="text-stone-300 dark:text-stone-500 hover:text-red-400 transition-colors p-1">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </button>
          </div>
          <p v-if="!categories.length" class="text-xs text-stone-400 dark:text-stone-500 text-center py-2 italic">尚未建立分類</p>
        </div>
        <div class="flex gap-2">
          <input v-model="newCatInput" @keydown.enter="addCategory" placeholder="新分類名稱…"
                 class="flex-1 text-sm px-3 py-2 rounded-xl border border-stone-200 dark:border-stone-600 bg-white dark:bg-zinc-700 text-stone-700 dark:text-stone-200 outline-none focus:border-teal-400 transition-colors" />
          <button @click="addCategory"
                  class="px-4 py-2 bg-stone-800 dark:bg-zinc-600 text-white text-sm rounded-xl hover:bg-stone-700 dark:hover:bg-zinc-500 transition-colors">新增</button>
        </div>
      </div>
    </div>

    <!-- ══ 待辦詳情 Modal ══ -->
    <div v-if="detailModal.show" class="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center z-50">
      <div class="bg-white dark:bg-zinc-800 rounded-t-3xl sm:rounded-2xl shadow-xl w-full sm:max-w-lg max-h-[90vh] flex flex-col">

        <!-- Modal Header -->
        <div class="flex items-center justify-between px-5 pt-5 pb-3 border-b border-stone-100 dark:border-stone-700 flex-shrink-0">
          <div class="flex-1 min-w-0 pr-3">
            <p class="text-xs text-stone-400 dark:text-stone-500 mb-0.5">{{ detailModal.todo?.category || '無分類' }}</p>
            <h3 class="font-bold text-stone-800 dark:text-stone-100 leading-snug">{{ detailModal.todo?.title }}</h3>
          </div>
          <button @click="detailModal.show = false" class="text-stone-400 dark:text-stone-500 hover:text-stone-600 dark:hover:text-stone-300 p-1 flex-shrink-0">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
        </div>

        <!-- Modal Body -->
        <div class="flex-1 overflow-y-auto px-5 py-4 space-y-5">

          <!-- 備註 -->
          <div>
            <p class="text-xs font-semibold text-stone-400 dark:text-stone-500 uppercase tracking-widest mb-2">備註</p>
            <textarea v-model="detailModal.note" rows="4" placeholder="輸入詳細說明、備忘事項…"
                      class="w-full text-sm px-3 py-2.5 rounded-xl border border-stone-200 dark:border-stone-600 bg-stone-50 dark:bg-zinc-700 text-stone-700 dark:text-stone-200 placeholder-stone-300 dark:placeholder-stone-600 outline-none focus:border-teal-400 transition-colors resize-none"></textarea>
          </div>

          <!-- 連結 -->
          <div>
            <p class="text-xs font-semibold text-stone-400 dark:text-stone-500 uppercase tracking-widest mb-2">連結 URL</p>
            <div class="flex gap-2">
              <input v-model="detailModal.linkUrl" placeholder="https://…"
                     class="flex-1 text-sm px-3 py-2 rounded-xl border border-stone-200 dark:border-stone-600 bg-stone-50 dark:bg-zinc-700 text-stone-700 dark:text-stone-200 placeholder-stone-300 dark:placeholder-stone-600 outline-none focus:border-teal-400 transition-colors" />
              <a v-if="detailModal.linkUrl" :href="detailModal.linkUrl" target="_blank"
                 class="px-3 py-2 bg-blue-50 dark:bg-blue-900/30 text-blue-500 dark:text-blue-400 rounded-xl hover:bg-blue-100 transition-colors text-xs font-medium flex items-center gap-1">
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/></svg>
                開啟
              </a>
            </div>
          </div>

          <!-- 圖片 -->
          <div>
            <p class="text-xs font-semibold text-stone-400 dark:text-stone-500 uppercase tracking-widest mb-2">圖片</p>
            <div class="grid grid-cols-3 gap-2 mb-2">
              <div v-for="img in detailModal.images" :key="img.name" class="relative group aspect-square">
                <img :src="attachUrl(detailModal.todo?.id, img.name)" :alt="img.name"
                     class="w-full h-full object-cover rounded-xl border border-stone-200 dark:border-stone-600 cursor-pointer"
                     @click="previewImage(attachUrl(detailModal.todo?.id, img.name))" />
                <button @click="deleteAttachment(img.name, 'image')"
                        class="absolute top-1 right-1 w-5 h-5 bg-red-500 text-white rounded-full hidden group-hover:flex items-center justify-center transition-all">
                  <svg class="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M6 18L18 6M6 6l12 12"/></svg>
                </button>
              </div>
              <label class="aspect-square rounded-xl border-2 border-dashed border-stone-200 dark:border-stone-600 flex flex-col items-center justify-center cursor-pointer hover:border-teal-400 hover:bg-teal-50 dark:hover:bg-teal-900/10 transition-colors">
                <svg class="w-5 h-5 text-stone-300 dark:text-stone-600 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
                <span class="text-xs text-stone-300 dark:text-stone-600">上傳</span>
                <input type="file" accept="image/*" multiple class="hidden" @change="uploadFiles($event, 'image')" :disabled="uploading" />
              </label>
            </div>
          </div>

          <!-- 文件 -->
          <div>
            <p class="text-xs font-semibold text-stone-400 dark:text-stone-500 uppercase tracking-widest mb-2">文件</p>
            <div class="space-y-1.5 mb-2">
              <div v-for="doc in detailModal.docs" :key="doc.name"
                   class="flex items-center gap-2 px-3 py-2 bg-stone-50 dark:bg-zinc-700 rounded-xl">
                <svg class="w-4 h-4 text-stone-400 dark:text-stone-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
                <span class="text-xs text-stone-600 dark:text-stone-300 flex-1 truncate">{{ doc.name }}</span>
                <a :href="attachUrl(detailModal.todo?.id, doc.name)" :download="doc.name"
                   class="text-xs text-blue-500 hover:underline flex-shrink-0">下載</a>
                <button @click="deleteAttachment(doc.name, 'doc')"
                        class="text-stone-300 dark:text-stone-600 hover:text-red-400 transition-colors flex-shrink-0">
                  <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
                </button>
              </div>
              <p v-if="!detailModal.docs.length" class="text-xs text-stone-300 dark:text-stone-600 italic">尚無文件</p>
            </div>
            <label class="flex items-center gap-2 px-3 py-2 rounded-xl border border-dashed border-stone-200 dark:border-stone-600 cursor-pointer hover:border-teal-400 hover:bg-teal-50 dark:hover:bg-teal-900/10 transition-colors">
              <svg class="w-4 h-4 text-stone-300 dark:text-stone-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
              <span class="text-xs text-stone-400 dark:text-stone-500">上傳文件</span>
              <input type="file" multiple class="hidden" @change="uploadFiles($event, 'doc')" :disabled="uploading" />
            </label>
          </div>

          <!-- 上傳進度 -->
          <div v-if="uploading" class="text-xs text-teal-600 dark:text-teal-400 text-center animate-pulse">上傳中…</div>
        </div>

        <!-- Modal Footer -->
        <div class="flex gap-2 px-5 py-4 border-t border-stone-100 dark:border-stone-700 flex-shrink-0">
          <button @click="detailModal.show = false"
                  class="flex-1 px-4 py-2.5 text-sm border border-stone-200 dark:border-stone-600 text-stone-600 dark:text-stone-300 rounded-xl hover:bg-stone-50 dark:hover:bg-zinc-700 transition-colors">取消</button>
          <button @click="saveDetail"
                  class="flex-1 px-4 py-2.5 text-sm bg-stone-800 dark:bg-zinc-600 text-white rounded-xl hover:bg-stone-700 dark:hover:bg-zinc-500 transition-colors">儲存備註 &amp; 連結</button>
        </div>
      </div>
    </div>

    <!-- 圖片預覽 -->
    <div v-if="imagePreview" @click="imagePreview = null"
         class="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[60] cursor-pointer">
      <img :src="imagePreview" class="max-w-[90vw] max-h-[85vh] rounded-2xl shadow-2xl object-contain" />
    </div>

    <!-- ══ 例行任務管理 Modal ══ -->
    <div v-if="showDailyManager" class="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-end sm:items-center justify-center z-50">
      <div class="bg-white dark:bg-zinc-800 rounded-t-3xl sm:rounded-2xl shadow-xl w-full sm:max-w-md p-5 max-h-[85vh] flex flex-col">
        <div class="flex items-center justify-between mb-4 flex-shrink-0">
          <h3 class="font-bold text-stone-800 dark:text-stone-100">管理例行任務</h3>
          <button @click="showDailyManager = false" class="text-stone-400 dark:text-stone-500 hover:text-stone-600 dark:hover:text-stone-300 p-1">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>

        <!-- 現有任務列表 -->
        <div class="flex-1 overflow-y-auto space-y-2 mb-4">
          <div v-for="task in dailyTasks" :key="task.id"
               class="flex items-center gap-2 px-3 py-2 bg-stone-50 dark:bg-zinc-700 rounded-xl">
            <div class="flex-1 min-w-0">
              <p class="text-sm text-stone-700 dark:text-stone-200 font-medium">{{ task.title }}</p>
              <p v-if="task.group" class="text-xs text-stone-400 dark:text-stone-500 mt-0.5">{{ task.group }}</p>
            </div>
            <button @click="deleteDailyTask(task.id)"
                    class="text-stone-300 dark:text-stone-500 hover:text-red-400 transition-colors p-1 flex-shrink-0">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </button>
          </div>
          <p v-if="!dailyTasks.length" class="text-xs text-stone-400 dark:text-stone-500 text-center py-4 italic">尚未建立例行任務</p>
        </div>

        <!-- 新增表單 -->
        <div class="border-t border-stone-100 dark:border-stone-700 pt-4 flex-shrink-0 space-y-2">
          <input v-model="newDailyTitle" @keydown.enter="addDailyTask" placeholder="任務名稱… (Enter)"
                 class="w-full text-sm px-3 py-2 rounded-xl border border-stone-200 dark:border-stone-600 bg-white dark:bg-zinc-700 text-stone-700 dark:text-stone-200 outline-none focus:border-teal-400 transition-colors" />
          <div class="flex gap-2">
            <input v-model="newDailyGroup" placeholder="群組（選填，如：清潔、健康）"
                   class="flex-1 text-sm px-3 py-2 rounded-xl border border-stone-200 dark:border-stone-600 bg-white dark:bg-zinc-700 text-stone-700 dark:text-stone-200 outline-none focus:border-teal-400 transition-colors" />
            <button @click="addDailyTask" :disabled="!newDailyTitle.trim()"
                    class="px-4 py-2 bg-stone-800 dark:bg-zinc-600 text-white text-sm rounded-xl hover:bg-stone-700 dark:hover:bg-zinc-500 disabled:opacity-30 transition-colors">新增</button>
          </div>
        </div>
      </div>
    </div>

    <!-- Toast -->
    <transition name="fade">
      <div v-if="toast.show"
           class="fixed bottom-6 left-1/2 -translate-x-1/2 bg-stone-800 text-white text-sm px-4 py-2.5 rounded-xl shadow-lg z-50 whitespace-nowrap flex items-center gap-2">
        <svg class="w-4 h-4 text-teal-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
        </svg>
        {{ toast.message }}
      </div>
    </transition>
  </div>
</template>

<script setup>
import {ref, reactive, computed, onMounted, nextTick} from 'vue'
import {useCommonStore} from '~/stores/common.js'

const commonStore = useCommonStore()
const BASE = computed(() => commonStore.data.main_url + '/holy/todo')
const DAILY_BASE = computed(() => commonStore.data.main_url + '/holy/daily')

// ── Tab ───────────────────────────────────────────────────────────
const activeTab = ref('todo')

// ── 狀態 ─────────────────────────────────────────────────────────
const todos = ref([])
const categories = ref([])
const loading = ref(true)
const saving = ref(false)
const apiOnline = ref(false)
const expanded = ref([])
const subInputs = reactive({})

const filterCat = ref(null)
const filterPri = ref(null)
const showDone = ref(false)

const newTitle = ref('')
const newPri = ref('mid')
const newCat = ref('')
const newDue = ref('')

const editingId = ref(null)
const editTitle = ref('')
const editInputEl = ref(null)

const showCatManager = ref(false)
const newCatInput = ref('')
const toast = reactive({show: false, message: ''})

// ── Daily 狀態 ────────────────────────────────────────────────────
const dailyTasks = ref([])
const dailyLog = ref({})   // { 'YYYY-MM-DD': ['taskId1', 'taskId2', ...] }
const dailyCalYear = ref(new Date().getFullYear())
const dailyCalMonth = ref(new Date().getMonth() + 1)
const showDailyManager = ref(false)
const newDailyTitle = ref('')
const newDailyGroup = ref('')

// ── 常數 ─────────────────────────────────────────────────────────
const todayStr = new Date().toISOString().slice(0, 10)

const priorities = [
  {
    key: 'high',
    label: '高',
    dot: 'bg-red-400',
    activeCls: 'bg-red-50 dark:bg-red-900/30 border-red-300 dark:border-red-700 text-red-600 dark:text-red-400'
  },
  {
    key: 'mid',
    label: '中',
    dot: 'bg-amber-400',
    activeCls: 'bg-amber-50 dark:bg-amber-900/30 border-amber-300 dark:border-amber-700 text-amber-600 dark:text-amber-400'
  },
  {
    key: 'low',
    label: '低',
    dot: 'bg-teal-400',
    activeCls: 'bg-teal-50 dark:bg-teal-900/30 border-teal-300 dark:border-teal-700 text-teal-600 dark:text-teal-400'
  },
]

// ── 計算 ─────────────────────────────────────────────────────────
const pendingCount = computed(() => todos.value.filter(t => !t.done).length)
const doneCount = computed(() => todos.value.filter(t => t.done).length)

const filteredTodos = computed(() => {
  return todos.value
    .filter(t => {
      if (!showDone.value && t.done) return false
      if (filterCat.value && t.category !== filterCat.value) return false
      if (filterPri.value && t.priority !== filterPri.value) return false
      return true
    })
    .sort((a, b) => {
      if (a.done !== b.done) return a.done ? 1 : -1
      const po = {high: 0, mid: 1, low: 2}
      if (po[a.priority] !== po[b.priority]) return po[a.priority] - po[b.priority]
      if (a.dueDate && b.dueDate) return a.dueDate.localeCompare(b.dueDate)
      if (a.dueDate) return -1;
      if (b.dueDate) return 1
      return 0
    })
})

const statWidth = (key) => {
  const total = todos.value.length
  if (!total) return '0%'
  if (key === 'done') return (todos.value.filter(t => t.done).length / total * 100) + '%'
  return (todos.value.filter(t => !t.done && t.priority === key).length / total * 100) + '%'
}

// ── Daily 計算 ────────────────────────────────────────────────────
const dailyYearMonth = computed(() =>
  `${dailyCalYear.value}-${String(dailyCalMonth.value).padStart(2, '0')}`)

const isTodayDone = (taskId) => (dailyLog.value[todayStr] || []).includes(taskId)

const todayDoneCount = computed(() =>
  dailyTasks.value.filter(t => isTodayDone(t.id)).length)

const monthRate = (taskId) => {
  const today = new Date()
  const isCurrentMonth = dailyCalYear.value === today.getFullYear() && dailyCalMonth.value === today.getMonth() + 1
  const daysInMonth = new Date(dailyCalYear.value, dailyCalMonth.value, 0).getDate()
  const daysToCount = isCurrentMonth ? today.getDate() : daysInMonth
  let done = 0
  for (let d = 1; d <= daysToCount; d++) {
    const date = `${dailyCalYear.value}-${String(dailyCalMonth.value).padStart(2, '0')}-${String(d).padStart(2, '0')}`
    if ((dailyLog.value[date] || []).includes(taskId)) done++
  }
  return daysToCount > 0 ? Math.round(done / daysToCount * 100) : 0
}

const dailyTaskGroups = computed(() => {
  const groups = {}
  for (const task of dailyTasks.value) {
    const key = task.group || ''
    if (!groups[key]) groups[key] = []
    groups[key].push(task)
  }
  return Object.entries(groups).map(([name, tasks]) => ({name, tasks}))
})

const dailyFirstDay = computed(() =>
  new Date(dailyCalYear.value, dailyCalMonth.value - 1, 1).getDay())

const dailyCalDays = computed(() => {
  const total = new Date(dailyCalYear.value, dailyCalMonth.value, 0).getDate()
  const days = []
  for (let d = 1; d <= total; d++) {
    const date = `${dailyCalYear.value}-${String(dailyCalMonth.value).padStart(2, '0')}-${String(d).padStart(2, '0')}`
    const dow = new Date(dailyCalYear.value, dailyCalMonth.value - 1, d).getDay()
    const doneIds = dailyLog.value[date] || []
    const doneCnt = dailyTasks.value.filter(t => doneIds.includes(t.id)).length
    const total2 = dailyTasks.value.length
    days.push({
      d, date, dow,
      isToday: date === todayStr,
      rate: total2 > 0 ? Math.round(doneCnt / total2 * 100) : null,
      doneCnt,
    })
  }
  return days
})

// ── 工具 ─────────────────────────────────────────────────────────
const priorityBorder = (p) => ({
  high: 'border-red-200 dark:border-red-900/50',
  mid: 'border-amber-200 dark:border-amber-900/50',
  low: 'border-stone-200 dark:border-stone-600'
}[p] || 'border-stone-200 dark:border-stone-600')
const priorityBadge = (p) => ({
  high: {label: '高優先', cls: 'bg-red-50 dark:bg-red-900/20 text-red-500 dark:text-red-400'},
  mid: {label: '中優先', cls: 'bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400'},
  low: {label: '低優先', cls: 'bg-teal-50 dark:bg-teal-900/20 text-teal-600 dark:text-teal-400'},
}[p] || {label: '', cls: ''})

const isDueWarning = (todo) => todo.dueDate && !todo.done && todo.dueDate <= todayStr

const showToast = (msg) => {
  toast.message = msg;
  toast.show = true
  setTimeout(() => toast.show = false, 2200)
}

const apiFetch = async (path, opts = {}) => {
  const res = await fetch(`${BASE.value}${path}`, {
    headers: {'Content-Type': 'application/json'},
    ...opts,
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

// ── 初始化 ────────────────────────────────────────────────────────
onMounted(async () => {
  try {
    const [t, c] = await Promise.all([
      apiFetch('/list'),
      apiFetch('/categories'),
    ])
    todos.value = t
    categories.value = c
    apiOnline.value = true
  } catch (e) {
    console.error(e)
    apiOnline.value = false
    showToast('無法連線到伺服器')
  } finally {
    loading.value = false
  }
})

// ── Todos CRUD ────────────────────────────────────────────────────
const addTodo = async () => {
  if (!newTitle.value.trim() || saving.value) return
  saving.value = true
  try {
    const saved = await apiFetch('/save', {
      method: 'POST',
      body: JSON.stringify({
        title: newTitle.value.trim(),
        priority: newPri.value,
        category: newCat.value,
        dueDate: newDue.value,
      })
    })
    todos.value.unshift(saved)
    newTitle.value = '';
    newDue.value = ''
    showToast('已新增待辦')
  } catch {
    showToast('新增失敗')
  } finally {
    saving.value = false
  }
}

const toggleDone = async (todo) => {
  const next = !todo.done
  todo.done = next   // 樂觀更新
  try {
    await apiFetch(`/done/${todo.id}?done=${next}`, {method: 'PATCH'})
    showToast(next ? '已完成！' : '標記為未完成')
  } catch {
    todo.done = !next;
    showToast('更新失敗')
  }
}

const confirmDelete = async (todo) => {
  if (!confirm(`確定刪除「${todo.title}」？`)) return
  try {
    await apiFetch(`/remove/${todo.id}`, {method: 'DELETE'})
    todos.value = todos.value.filter(t => t.id !== todo.id)
    showToast('已刪除')
  } catch {
    showToast('刪除失敗')
  }
}

const startEdit = async (todo) => {
  editingId.value = todo.id
  editTitle.value = todo.title
  await nextTick()
  editInputEl.value?.focus()
}

const saveEdit = async (todo) => {
  const newVal = editTitle.value.trim()
  editingId.value = null
  if (!newVal || newVal === todo.title) return
  const original = todo.title
  todo.title = newVal
  try {
    await apiFetch('/update', {method: 'PUT', body: JSON.stringify(todo)})
    showToast('已更新')
  } catch {
    todo.title = original;
    showToast('更新失敗')
  }
}

// ── Subtasks ──────────────────────────────────────────────────────
const toggleExpand = (id) => {
  const idx = expanded.value.indexOf(id)
  idx >= 0 ? expanded.value.splice(idx, 1) : expanded.value.push(id)
}

const addSubtask = async (todo) => {
  const text = (subInputs[todo.id] || '').trim()
  if (!text) return
  try {
    const sub = await apiFetch(`/subtask/${todo.id}`, {
      method: 'POST',
      body: JSON.stringify({title: text})
    })
    if (!todo.subtasks) todo.subtasks = []
    todo.subtasks.push(sub)
    subInputs[todo.id] = ''
    if (!expanded.value.includes(todo.id)) expanded.value.push(todo.id)
  } catch {
    showToast('新增子任務失敗')
  }
}

const toggleSubDone = async (todo, sub) => {
  const next = !sub.done
  sub.done = next
  try {
    await apiFetch(`/subtask/${todo.id}/${sub.id}?done=${next}`, {method: 'PATCH'})
  } catch {
    sub.done = !next;
    showToast('更新失敗')
  }
}

const deleteSubtask = async (todo, subId) => {
  try {
    await apiFetch(`/subtask/${todo.id}/${subId}`, {method: 'DELETE'})
    todo.subtasks = todo.subtasks.filter(s => s.id !== subId)
  } catch {
    showToast('刪除失敗')
  }
}

const ATTACH_BASE = computed(() => commonStore.data.main_url + '/holy/todo/attach')

// ── 詳情 Modal 狀態 ───────────────────────────────────────────────
const detailModal = reactive({
  show: false, todo: null,
  note: '', linkUrl: '',
  images: [], docs: [],
})
const uploading = ref(false)
const imagePreview = ref(null)

const attachUrl = (todoId, filename) =>
  `${ATTACH_BASE.value}/${todoId}/${filename}`

const openDetailModal = async (todo) => {
  detailModal.todo = todo
  detailModal.note = todo.note || ''
  detailModal.linkUrl = todo.linkUrl || ''
  detailModal.images = []
  detailModal.docs = []
  detailModal.show = true
  try {
    const list = await apiFetch(`/attach/${todo.id}/list`)
    detailModal.images = list.filter(f => /\.(jpe?g|png|gif|webp|svg)$/i.test(f.name))
    detailModal.docs = list.filter(f => !/\.(jpe?g|png|gif|webp|svg)$/i.test(f.name))
  } catch { /* 無附件也沒關係 */
  }
}

const saveDetail = async () => {
  const todo = detailModal.todo
  if (!todo) return
  todo.note = detailModal.note
  todo.linkUrl = detailModal.linkUrl
  try {
    await apiFetch('/update', {method: 'PUT', body: JSON.stringify(todo)})
    detailModal.show = false
    showToast('已儲存')
  } catch {
    showToast('儲存失敗')
  }
}

const uploadFiles = async (event, type) => {
  const files = Array.from(event.target.files)
  if (!files.length || !detailModal.todo) return
  uploading.value = true
  try {
    for (const file of files) {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('todoId', detailModal.todo.id)
      const res = await fetch(`${ATTACH_BASE.value}/upload`, {method: 'POST', body: fd})
      if (!res.ok) throw new Error()
      const saved = await res.json()
      if (type === 'image') detailModal.images.push(saved)
      else detailModal.docs.push(saved)
      if (!detailModal.todo.attachments) detailModal.todo.attachments = []
      detailModal.todo.attachments.push({name: saved.name})
    }
    showToast(`已上傳 ${files.length} 個檔案`)
  } catch {
    showToast('上傳失敗')
  } finally {
    uploading.value = false;
    event.target.value = ''
  }
}

const deleteAttachment = async (filename, type) => {
  if (!confirm(`確定刪除「${filename}」？`)) return
  try {
    await fetch(`${ATTACH_BASE.value}/${detailModal.todo.id}/${filename}`, {method: 'DELETE'})
    if (type === 'image') detailModal.images = detailModal.images.filter(f => f.name !== filename)
    else detailModal.docs = detailModal.docs.filter(f => f.name !== filename)
    if (detailModal.todo.attachments)
      detailModal.todo.attachments = detailModal.todo.attachments.filter(f => f.name !== filename)
    showToast('已刪除')
  } catch {
    showToast('刪除失敗')
  }
}

const previewImage = (url) => {
  imagePreview.value = url
}

const dailyApiFetch = async (path, opts = {}) => {
  const res = await fetch(`${DAILY_BASE.value}${path}`, {
    headers: {'Content-Type': 'application/json'}, ...opts,
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

const fetchDaily = async () => {
  try {
    const [tasks, log] = await Promise.all([
      dailyApiFetch('/tasks'),
      dailyApiFetch(`/log/${dailyYearMonth.value}`),
    ])
    dailyTasks.value = tasks
    dailyLog.value = log
  } catch (e) {
    console.error(e)
  }
}

const switchToDaily = async () => {
  activeTab.value = 'daily'
  await fetchDaily()
}

const toggleDailyDone = async (taskId) => {
  const date = todayStr
  const current = dailyLog.value[date] || []
  const isDone = current.includes(taskId)
  // 樂觀更新
  if (isDone) {
    dailyLog.value[date] = current.filter(id => id !== taskId)
  } else {
    dailyLog.value[date] = [...current, taskId]
  }
  try {
    await dailyApiFetch(`/log/toggle`, {
      method: 'POST',
      body: JSON.stringify({date, taskId, done: !isDone}),
    })
    showToast(!isDone ? '完成！' : '取消完成')
  } catch {
    // rollback
    dailyLog.value[date] = current
    showToast('更新失敗')
  }
}

const addDailyTask = async () => {
  if (!newDailyTitle.value.trim()) return
  try {
    const saved = await dailyApiFetch('/tasks/save', {
      method: 'POST',
      body: JSON.stringify({title: newDailyTitle.value.trim(), group: newDailyGroup.value.trim()}),
    })
    dailyTasks.value.push(saved)
    newDailyTitle.value = '';
    newDailyGroup.value = ''
    showToast('已新增例行任務')
  } catch {
    showToast('新增失敗')
  }
}

const deleteDailyTask = async (id) => {
  if (!confirm('確定刪除此例行任務？（歷史記錄將保留）')) return
  try {
    await dailyApiFetch(`/tasks/remove/${id}`, {method: 'DELETE'})
    dailyTasks.value = dailyTasks.value.filter(t => t.id !== id)
    showToast('已刪除')
  } catch {
    showToast('刪除失敗')
  }
}

const dailyPrevMonth = async () => {
  if (dailyCalMonth.value === 1) {
    dailyCalYear.value--;
    dailyCalMonth.value = 12
  } else dailyCalMonth.value--
  await fetchDaily()
}

const dailyNextMonth = async () => {
  if (dailyCalMonth.value === 12) {
    dailyCalYear.value++;
    dailyCalMonth.value = 1
  } else dailyCalMonth.value++
  await fetchDaily()
}

// ── Categories ────────────────────────────────────────────────────
const addCategory = async () => {
  const c = newCatInput.value.trim()
  if (!c || categories.value.includes(c)) return
  const updated = [...categories.value, c]
  try {
    await apiFetch('/categories', {method: 'POST', body: JSON.stringify(updated)})
    categories.value = updated
    newCatInput.value = ''
  } catch {
    showToast('新增分類失敗')
  }
}

const deleteCategory = async (cat) => {
  if (!confirm(`刪除分類「${cat}」？（已套用的事項將變為無分類）`)) return
  const updated = categories.value.filter(c => c !== cat)
  try {
    await apiFetch('/categories', {method: 'POST', body: JSON.stringify(updated)})
    categories.value = updated
    todos.value.forEach(t => {
      if (t.category === cat) t.category = ''
    })
  } catch {
    showToast('刪除分類失敗')
  }
}
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Noto+Serif+TC:wght@400;600;700&display=swap');

.fade-enter-active, .fade-leave-active {
  transition: opacity 0.2s, transform 0.2s;
}

.fade-enter-from, .fade-leave-to {
  opacity: 0;
  transform: translateY(6px);
}
</style>
