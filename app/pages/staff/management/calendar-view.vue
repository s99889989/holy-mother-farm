<template>
  <div class="min-h-screen bg-stone-50 dark:bg-zinc-900 transition-colors">

    <!-- ── Header ── -->
    <header class="bg-white dark:bg-zinc-900 border-b border-stone-200 dark:border-stone-700 px-4 py-3 sticky top-0 z-30">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2">
          <div class="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">曆</div>
          <div>
            <h1 class="font-bold text-stone-800 dark:text-stone-100 leading-none text-sm sm:text-base">行事曆管理</h1>
            <p class="text-xs text-stone-400 mt-0.5 hidden sm:block">Calendar Events · {{ events.length }} 筆</p>
          </div>
        </div>
        <div class="flex items-center gap-2">
          <button v-if="perm.can('staff.calendar.edit')" @click="showTxtModal = true"
                  class="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-300 rounded-lg bg-white dark:bg-zinc-800 hover:border-indigo-400 hover:text-indigo-600 transition-colors">
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
            <span class="hidden sm:inline">貼上 TXT</span>
            <span class="sm:hidden">TXT</span>
          </button>
          <button v-if="perm.can('staff.calendar.edit')" @click="openAddOnDate(null)"
                  class="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors">
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
            新增
          </button>
        </div>
      </div>
    </header>

    <!-- ── 月份導覽 ── -->
    <div class="bg-white dark:bg-zinc-900 border-b border-stone-100 dark:border-stone-800 px-4 py-3">
      <div class="max-w-5xl mx-auto flex items-center justify-between gap-3">
        <!-- 月份切換 -->
        <div class="flex items-center gap-3">
          <button @click="prevMonth"
                  class="w-8 h-8 flex items-center justify-center rounded-full border border-stone-200 dark:border-stone-700 text-stone-500 hover:bg-indigo-50 hover:border-indigo-300 hover:text-indigo-600 dark:hover:bg-indigo-900/20 transition-colors">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M15 18l-6-6 6-6"/></svg>
          </button>
          <h2 class="text-base font-bold text-stone-800 dark:text-stone-100 min-w-[100px] text-center">
            {{ currentYear }} 年 {{ currentMonth }} 月
          </h2>
          <button @click="nextMonth"
                  class="w-8 h-8 flex items-center justify-center rounded-full border border-stone-200 dark:border-stone-700 text-stone-500 hover:bg-indigo-50 hover:border-indigo-300 hover:text-indigo-600 dark:hover:bg-indigo-900/20 transition-colors">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M9 18l6-6-6-6"/></svg>
          </button>
          <button @click="goToday"
                  class="px-3 py-1 text-xs border border-stone-200 dark:border-stone-700 text-stone-500 dark:text-stone-400 rounded-lg hover:bg-stone-50 dark:hover:bg-zinc-800 transition-colors">
            今天
          </button>
        </div>

        <!-- 類型圖例 -->
        <div class="hidden sm:flex items-center gap-3">
          <div v-for="t in TYPES" :key="t" class="flex items-center gap-1.5">
            <div :class="['w-2.5 h-2.5 rounded-sm', legendDotClass(t)]"></div>
            <span class="text-xs text-stone-500 dark:text-stone-400">{{ t }}</span>
          </div>
          <span class="text-xs text-stone-400 ml-1">{{ monthEventCount }} 筆</span>
        </div>
      </div>
    </div>

    <!-- ── 篩選列 ── -->
    <div class="border-b border-stone-100 dark:border-stone-800 bg-white dark:bg-zinc-900 px-4 py-2.5 space-y-2">
      <div class="max-w-5xl mx-auto space-y-2">

        <!-- 類型 -->
        <div class="flex flex-wrap items-center gap-1.5">
          <span class="text-xs text-stone-400 mr-1 flex-shrink-0">類型</span>
          <button
            v-for="t in ['全部', ...TYPES]" :key="t"
            @click="setFilterType(t)"
            :class="['filter-type-btn', t === '全部' ? 'all' : typeColorClass(t), filterType === t ? 'active' : '']"
          >
            {{ t }}
            <span class="filter-count">
              {{ t === '全部' ? monthEventCount : (typeCount[t] || 0) }}
            </span>
          </button>
        </div>

        <!-- 地點 -->
        <div v-if="availableLocations.length" class="flex flex-wrap items-center gap-1.5">
          <span class="text-xs text-stone-400 mr-1 flex-shrink-0">地點</span>
          <button
            :class="['filter-loc-btn', filterLocation === '' ? 'active' : '']"
            @click="filterLocation = ''"
          >全部</button>
          <button
            v-for="loc in availableLocations" :key="loc"
            :class="['filter-loc-btn', filterLocation === loc ? 'active' : '']"
            @click="filterLocation = loc"
          >{{ loc }}</button>
        </div>

      </div>
    </div>

    <!-- ── 月曆主體 ── -->
    <div class="max-w-5xl mx-auto px-3 sm:px-4 py-4">

      <div v-if="loading" class="flex items-center justify-center py-24 text-stone-400 gap-2">
        <div class="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
        載入中…
      </div>

      <template v-else>
        <!-- 星期標頭 -->
        <div class="calendar-grid mb-1">
          <div v-for="d in weekdays" :key="d"
               :class="['text-center text-xs font-semibold py-2 tracking-wide',
              d === '日' ? 'text-red-400' : d === '六' ? 'text-blue-400' : 'text-stone-400 dark:text-stone-500']">
            {{ d }}
          </div>
        </div>

        <!-- 日期格子 -->
        <div class="calendar-grid gap-1">
          <div v-for="(cell, idx) in calendarCells" :key="idx"
               :class="['cal-cell', {
              'opacity-0 pointer-events-none': !cell.day,
              'today': cell.isToday,
              'weekend': cell.isWeekend,
              'has-events': cell.events.length > 0
            }]"
               @click="cell.day && openAddOnDate(cell.dateStr)"
          >
            <template v-if="cell.day">
              <!-- 日期數字 -->
              <div class="flex items-center justify-between mb-1 px-0.5">
                <span :class="['cal-day-num', {
                  'today-num': cell.isToday,
                  'text-red-400 dark:text-red-400': cell.isWeekend && cell.weekdayIdx === 0,
                  'text-blue-400 dark:text-blue-400': cell.isWeekend && cell.weekdayIdx === 6,
                  'text-stone-600 dark:text-stone-300': !cell.isToday && !cell.isWeekend
                }]">{{ cell.day }}</span>
                <!-- 快速新增按鈕：hover 才顯示 -->
                <button
                  @click.stop="openAddOnDate(cell.dateStr)"
                  class="cal-add-btn opacity-0 group-hover:opacity-100 w-5 h-5 rounded-full bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center hover:bg-indigo-600 hover:text-white transition-all">
                  <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 4v16m8-8H4"/></svg>
                </button>
              </div>

              <!-- 活動 chips -->
              <div class="space-y-0.5">
                <div
                  v-for="ev in cell.events.slice(0, 3)"
                  :key="ev.id"
                  :class="['cal-chip', typeChipClass(ev.type)]"
                  @click.stop="openEdit(ev)"
                >
                  <span class="chip-time hidden sm:inline">{{ ev.time?.split('-')[0] }}</span>
                  <span class="chip-title">{{ ev.title }}</span>
                </div>
                <!-- 超出顯示 +N -->
                <div
                  v-if="cell.events.length > 3"
                  class="text-[10px] text-stone-400 dark:text-stone-500 px-1 cursor-pointer hover:text-indigo-500 transition-colors"
                  @click.stop="openDayPanel(cell)"
                >
                  +{{ cell.events.length - 3 }} 更多
                </div>
              </div>
            </template>
          </div>
        </div>

        <!-- ── 備注區 ── -->
        <div class="mt-5 bg-amber-50 dark:bg-zinc-800/60 border border-amber-200 dark:border-amber-900/50 rounded-2xl overflow-hidden">
          <!-- 備注標題列 -->
          <div class="flex items-center justify-between px-4 py-3 border-b border-amber-100 dark:border-amber-900/40">
            <div class="flex items-center gap-2">
              <svg class="w-4 h-4 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
              <span class="text-sm font-semibold text-amber-700 dark:text-amber-400">備注事項</span>
              <span class="text-xs text-amber-500 dark:text-amber-500">{{ currentYear }}年{{ currentMonth }}月</span>
              <span v-if="notesSaving" class="text-xs text-amber-400 flex items-center gap-1">
                <div class="w-3 h-3 border-2 border-amber-400 border-t-transparent rounded-full animate-spin"></div>
                儲存中
              </span>
            </div>
            <button @click="addNote"
                    class="flex items-center gap-1 px-2.5 py-1 text-xs bg-amber-500 hover:bg-amber-600 text-white rounded-lg transition-colors">
              <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 4v16m8-8H4"/></svg>
              新增備注
            </button>
          </div>

          <!-- 備注列表 -->
          <div class="px-4 py-3 space-y-2">
            <div v-if="notes.length === 0" class="text-center py-4 text-amber-400 dark:text-amber-600 text-sm">
              本月尚無備注，點右上角新增
            </div>

            <div v-for="(note, idx) in notes" :key="idx"
                 class="group flex items-start gap-2">
              <!-- 序號 -->
              <span class="flex-shrink-0 w-5 h-5 rounded-full bg-amber-200 dark:bg-amber-900/50 text-amber-600 dark:text-amber-400 text-[10px] font-bold flex items-center justify-center mt-1">
                {{ idx + 1 }}
              </span>
              <!-- 文字（點擊編輯） -->
              <div class="flex-1 min-w-0">
                <div v-if="noteEditIdx !== idx"
                     class="text-sm text-stone-700 dark:text-stone-300 leading-relaxed cursor-pointer hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors break-words"
                     @click="startEditNote(idx)">
                  {{ note || '（點擊編輯）' }}
                </div>
                <div v-else class="flex items-start gap-2">
                  <textarea
                    v-model="noteEditValue"
                    rows="2"
                    class="flex-1 p-2 text-sm border border-indigo-300 dark:border-indigo-700 rounded-lg bg-white dark:bg-zinc-800 text-stone-800 dark:text-stone-100 resize-none outline-none focus:ring-2 focus:ring-indigo-400"
                    @keydown.enter.ctrl="confirmEditNote(idx)"
                    @keydown.esc="cancelEditNote"
                    autofocus
                  ></textarea>
                  <div class="flex flex-col gap-1 flex-shrink-0">
                    <button @click="confirmEditNote(idx)"
                            class="px-2.5 py-1 text-xs bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors">
                      確認
                    </button>
                    <button @click="cancelEditNote"
                            class="px-2.5 py-1 text-xs border border-stone-200 dark:border-stone-700 text-stone-500 rounded-lg hover:bg-stone-50 transition-colors">
                      取消
                    </button>
                  </div>
                </div>
              </div>
              <!-- 刪除 -->
              <button v-if="noteEditIdx !== idx"
                      @click="deleteNote(idx)"
                      class="flex-shrink-0 p-1 text-stone-300 dark:text-stone-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all mt-0.5" title="刪除">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
              </button>
            </div>
          </div>
        </div>
      </template>
    </div>

    <!-- ══ 側板：某日所有活動 ══ -->
    <Transition name="slide-right">
      <div v-if="dayPanel.show"
           class="fixed inset-0 z-40 flex justify-end"
           @click.self="dayPanel.show = false">
        <div class="w-full sm:w-96 bg-white dark:bg-zinc-900 h-full shadow-2xl overflow-y-auto flex flex-col">
          <!-- 側板 Header -->
          <div class="px-5 py-4 border-b border-stone-100 dark:border-stone-700 flex items-center justify-between sticky top-0 bg-white dark:bg-zinc-900 z-10">
            <div>
              <p class="font-bold text-stone-800 dark:text-stone-100">{{ dayPanel.dateStr }}</p>
              <p class="text-xs text-stone-400 mt-0.5">{{ dayPanel.events.length }} 個活動</p>
            </div>
            <div class="flex items-center gap-2">
              <button @click="openAddOnDate(dayPanel.dateStr)"
                      class="flex items-center gap-1 px-3 py-1.5 text-xs bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors">
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
                新增
              </button>
              <button @click="dayPanel.show = false" class="text-stone-400 hover:text-stone-600 p-1">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
              </button>
            </div>
          </div>

          <!-- 側板活動列表 -->
          <div class="flex-1 px-4 py-3 space-y-2">
            <div v-if="dayPanel.events.length === 0" class="text-center py-12 text-stone-400 text-sm">此日無活動</div>
            <div
              v-for="ev in dayPanel.events"
              :key="ev.id"
              class="group flex items-start gap-3 p-3 rounded-xl border border-stone-100 dark:border-stone-700 hover:border-indigo-200 dark:hover:border-indigo-700 hover:bg-indigo-50/30 dark:hover:bg-indigo-900/10 transition-colors"
            >
              <!-- 類型色條 -->
              <div :class="['w-1 self-stretch rounded-full flex-shrink-0 mt-0.5', typeBarClass(ev.type)]"></div>
              <!-- 內容 -->
              <div class="flex-1 min-w-0">
                <p class="text-sm font-semibold text-stone-800 dark:text-stone-100 leading-tight">{{ ev.title }}</p>
                <p class="text-xs text-stone-400 mt-0.5">{{ ev.time }}</p>
                <p v-if="ev.owner" class="text-xs text-stone-400">👤 {{ ev.owner }}</p>
                <p v-if="ev.room"  class="text-xs text-stone-400 truncate">📍 {{ ev.room }}</p>
                <span :class="['type-badge mt-1.5', typeColorClass(ev.type)]">{{ ev.type }}</span>
              </div>
              <!-- 操作 -->
              <div class="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                <button @click="openEdit(ev)"
                        class="p-1.5 text-stone-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors" title="編輯">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
                </button>
                <button v-if="perm.can('staff.calendar.edit')" @click="deleteEvent(ev)"
                        class="p-1.5 text-stone-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors" title="刪除">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Transition>

    <!-- ══ Modal: 新增 / 編輯 ══ -->
    <div v-if="formModal.show"
         class="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center z-50">
      <div class="bg-white dark:bg-zinc-900 rounded-t-3xl sm:rounded-2xl shadow-xl w-full sm:max-w-lg max-h-[90vh] overflow-y-auto">

        <div class="px-5 py-4 border-b border-stone-100 dark:border-stone-700 flex items-center justify-between sticky top-0 bg-white dark:bg-zinc-900 z-10">
          <h3 class="font-bold text-stone-800 dark:text-stone-100">{{ formModal.isNew ? '新增活動' : '編輯活動' }}</h3>
          <button @click="formModal.show = false" class="text-stone-400 hover:text-stone-600 p-1">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
        </div>

        <div class="px-5 py-4 space-y-3">
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="field-label">日期 *</label>
              <input v-model="form.date" type="date" class="field-input" />
            </div>
            <div>
              <label class="field-label">時間</label>
              <input v-model="form.time" placeholder="08:00-17:00" class="field-input" />
            </div>
          </div>
          <div>
            <label class="field-label">標題 *</label>
            <input v-model="form.title" placeholder="活動名稱" class="field-input" />
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="field-label">負責人</label>
              <input v-model="form.owner" placeholder="姓名" class="field-input" />
            </div>
            <div>
              <label class="field-label">類型</label>
              <select v-model="form.type" class="field-input">
                <option v-for="t in TYPES" :key="t" :value="t">{{ t }}</option>
              </select>
            </div>
          </div>
          <div>
            <label class="field-label">場地</label>
            <input v-model="form.room" placeholder="場地代碼與名稱" class="field-input" />
          </div>
          <p v-if="formError" class="text-xs text-red-500">{{ formError }}</p>
        </div>

        <div class="px-5 py-4 border-t border-stone-100 dark:border-stone-700 flex gap-2 justify-end sticky bottom-0 bg-white dark:bg-zinc-900">
          <button @click="formModal.show = false"
                  class="px-4 py-2 text-sm bg-stone-100 dark:bg-zinc-800 text-stone-600 dark:text-stone-300 rounded-xl hover:bg-stone-200 transition-colors">
            取消
          </button>
          <button @click="saveForm" :disabled="saving"
                  class="px-4 py-2 text-sm bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:bg-indigo-300 transition-colors flex items-center gap-1.5">
            <div v-if="saving" class="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            {{ formModal.isNew ? '新增' : '儲存' }}
          </button>
        </div>
      </div>
    </div>

    <!-- ══ Modal: TXT 匯入 ══ -->
    <div v-if="showTxtModal"
         class="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center z-50">
      <div class="bg-white dark:bg-zinc-900 rounded-t-3xl sm:rounded-2xl shadow-xl w-full sm:max-w-2xl max-h-[90vh] overflow-y-auto">

        <div class="px-5 py-4 border-b border-stone-100 dark:border-stone-700 flex items-center justify-between sticky top-0 bg-white dark:bg-zinc-900 z-10">
          <h3 class="font-bold text-stone-800 dark:text-stone-100">貼上 TXT 行事曆</h3>
          <button @click="closeTxtModal" class="text-stone-400 hover:text-stone-600 p-1">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
        </div>

        <div class="px-5 py-4 space-y-3">
          <div class="bg-stone-50 dark:bg-zinc-800 border border-stone-200 dark:border-stone-700 rounded-xl p-3">
            <p class="text-xs font-semibold text-stone-500 dark:text-stone-400 mb-1.5">支援格式（原始行事曆 TXT）：</p>
            <pre class="text-xs text-stone-400 dark:text-stone-500 font-mono leading-relaxed overflow-x-auto">2026年4月
1
08:00-10:00 新進人員報到 (高儀玟 H0A10404 四樓會議室 )醫院
10:00-17:00 慈濟大學參訪 (賈德蘭 P0A30102 簡報室)園區</pre>
          </div>

          <textarea v-model="txtInput" rows="10"
                    placeholder="請貼上行事曆 TXT 內容…"
                    :disabled="!!txtResult"
                    class="w-full p-3 text-sm font-mono border border-stone-200 dark:border-stone-700 rounded-xl bg-stone-50 dark:bg-zinc-800 text-stone-800 dark:text-stone-100 resize-none outline-none focus:ring-2 focus:ring-indigo-400 disabled:opacity-60">
          </textarea>

          <div v-if="txtResult" class="space-y-2">
            <!-- 活動統計 + 列表 -->
            <div class="rounded-xl border border-stone-200 dark:border-stone-700 overflow-hidden">
              <div class="px-4 py-3 bg-stone-50 dark:bg-zinc-800 flex flex-wrap gap-4 text-sm">
                <span class="text-stone-500 dark:text-stone-400">活動：解析 <strong class="text-stone-700 dark:text-stone-200">{{ txtResult.total }}</strong> 筆</span>
                <span class="text-green-600 dark:text-green-400">✓ 可新增 <strong>{{ txtResult.added.length }}</strong> 筆</span>
                <span class="text-amber-500 dark:text-amber-400">⊘ 重複跳過 <strong>{{ txtResult.skipped }}</strong> 筆</span>
              </div>
              <div v-if="txtResult.added.length > 0" class="divide-y divide-stone-100 dark:divide-stone-800 max-h-44 overflow-y-auto">
                <div v-for="(ev, i) in txtResult.added" :key="i" class="flex items-center gap-3 px-4 py-2 text-xs">
                  <span class="font-mono text-indigo-500 flex-shrink-0 tabular-nums">{{ ev.date }}</span>
                  <span class="text-stone-600 dark:text-stone-300 truncate flex-1">{{ ev.title }}</span>
                  <span class="text-stone-400 flex-shrink-0 hidden sm:block">{{ ev.owner }}</span>
                  <span :class="['type-badge flex-shrink-0', typeColorClass(ev.type)]">{{ ev.type }}</span>
                </div>
              </div>
              <div v-else class="px-4 py-4 text-center text-sm text-stone-400">沒有新活動可匯入（全部都是重複）</div>
            </div>

            <!-- 備注預覽 -->
            <div v-if="txtResult.notes.length > 0"
                 class="rounded-xl border border-amber-200 dark:border-amber-900/50 overflow-hidden">
              <div class="px-4 py-2.5 bg-amber-50 dark:bg-amber-900/20 flex items-center gap-2 text-sm">
                <svg class="w-3.5 h-3.5 text-amber-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
                <span class="text-amber-700 dark:text-amber-400 font-semibold">備注</span>
                <span class="text-amber-500">解析到 {{ txtResult.notes.length }} 條，將合併至當月</span>
              </div>
              <div class="divide-y divide-amber-100 dark:divide-amber-900/30 max-h-36 overflow-y-auto">
                <div v-for="(n, i) in txtResult.notes" :key="i"
                     class="flex items-start gap-2 px-4 py-2 text-xs text-stone-600 dark:text-stone-300">
                  <span class="flex-shrink-0 text-amber-400 font-bold mt-0.5">{{ i + 1 }}.</span>
                  <span class="break-words">{{ n }}</span>
                </div>
              </div>
            </div>
            <div v-else class="text-xs text-stone-400 px-1">本次 TXT 未包含備注</div>
          </div>
        </div>

        <div class="px-5 py-4 border-t border-stone-100 dark:border-stone-700 flex gap-2 justify-end sticky bottom-0 bg-white dark:bg-zinc-900">
          <button @click="closeTxtModal"
                  class="px-4 py-2 text-sm bg-stone-100 dark:bg-zinc-800 text-stone-600 dark:text-stone-300 rounded-xl hover:bg-stone-200 transition-colors">
            取消
          </button>
          <template v-if="!txtResult">
            <button @click="parseTxt" :disabled="!txtInput.trim()"
                    class="px-4 py-2 text-sm bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-50 transition-colors">
              解析預覽
            </button>
          </template>
          <template v-else>
            <button @click="txtResult = null"
                    class="px-4 py-2 text-sm border border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-300 rounded-xl hover:bg-stone-50 transition-colors">
              重新解析
            </button>
            <button @click="confirmImportTxt"
                    :disabled="(txtResult.added.length === 0 && txtResult.notes.length === 0) || saving"
                    class="px-4 py-2 text-sm bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-50 transition-colors flex items-center gap-1.5">
              <div v-if="saving" class="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              匯入{{ txtResult.added.length > 0 ? ` ${txtResult.added.length} 筆活動` : '' }}{{ txtResult.notes.length > 0 ? ` ${txtResult.notes.length} 條備注` : '' }}
            </button>
          </template>
        </div>
      </div>
    </div>

    <!-- Toast -->
    <Transition name="fade">
      <div v-if="toast.show"
           class="fixed bottom-6 left-1/2 -translate-x-1/2 sm:left-auto sm:right-6 sm:translate-x-0 bg-stone-800 text-white text-sm px-4 py-3 rounded-xl shadow-lg flex items-center gap-2 z-50 whitespace-nowrap">
        <svg class="w-4 h-4 text-green-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
        </svg>
        {{ toast.message }}
      </div>
    </Transition>
  </div>
</template>

<script setup>
definePageMeta({ layout: 'staff', requiredPermission: 'staff.calendar' })
const perm = usePermission()

const commonStore = useCommonStore()
const BASE = computed(() => commonStore.data.main_url + '/holy/calendar')

const TYPES    = ['醫院', '園區', '芳心']
const weekdays = ['日', '一', '二', '三', '四', '五', '六']

// ── 顏色工具 ─────────────────────────────────────────────────────
function typeColorClass(type) {
  return { 醫院: 'hospital', 園區: 'park', 芳心: 'fragrant' }[type] || 'park'
}
function typeChipClass(type) {
  return { 醫院: 'chip-hospital', 園區: 'chip-park', 芳心: 'chip-fragrant' }[type] || 'chip-park'
}
function typeBarClass(type) {
  return { 醫院: 'bg-red-400', 園區: 'bg-emerald-500', 芳心: 'bg-purple-400' }[type] || 'bg-emerald-500'
}
function legendDotClass(type) {
  return { 醫院: 'bg-red-400', 園區: 'bg-emerald-500', 芳心: 'bg-purple-400' }[type] || 'bg-emerald-500'
}

// ── 月份狀態 ──────────────────────────────────────────────────────
const today        = new Date()
const currentYear  = ref(today.getFullYear())
const currentMonth = ref(today.getMonth() + 1)  // 1-based

// ── 篩選狀態 ──────────────────────────────────────────────────────
const filterType     = ref('全部')   // 全部 / 醫院 / 園區 / 芳心
const filterLocation = ref('')       // 空字串 = 全部地點

function setFilterType(t) {
  filterType.value     = t
  filterLocation.value = ''
}

// room 欄位去掉場地代碼前綴："P0I10201 水電實習廠" → "水電實習廠"
function extractLocation(room) {
  if (!room || !room.trim()) return ''
  return room.trim().replace(/^[A-Z0-9]+\s*/, '').trim() || room.trim()
}

// 依目前 filterType 動態產生可選地點（去重、排序）
const availableLocations = computed(() => {
  const ym   = `${currentYear.value}-${String(currentMonth.value).padStart(2, '0')}`
  let   base = events.value.filter(e => e.date?.startsWith(ym))
  if (filterType.value !== '全部') base = base.filter(e => e.type === filterType.value)
  return [...new Set(base.map(e => extractLocation(e.room)).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'zh-Hant'))
})

function prevMonth() {
  if (currentMonth.value === 1) { currentMonth.value = 12; currentYear.value-- }
  else currentMonth.value--
}
function nextMonth() {
  if (currentMonth.value === 12) { currentMonth.value = 1; currentYear.value++ }
  else currentMonth.value++
}
function goToday() {
  currentYear.value  = today.getFullYear()
  currentMonth.value = today.getMonth() + 1
}

// ── 月曆格子計算 ─────────────────────────────────────────────────
const calendarCells = computed(() => {
  const year  = currentYear.value
  const month = currentMonth.value
  const firstWeekday = new Date(year, month - 1, 1).getDay()   // 0=Sun
  const daysInMonth  = new Date(year, month, 0).getDate()

  const cells = []

  // 填充前空格
  for (let i = 0; i < firstWeekday; i++) {
    cells.push({ day: null, dateStr: null, events: [], isToday: false, isWeekend: false, weekdayIdx: i })
  }

  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr    = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`
    const weekdayIdx = (firstWeekday + d - 1) % 7
    const isToday    = d === today.getDate() && month === today.getMonth() + 1 && year === today.getFullYear()
    const isWeekend  = weekdayIdx === 0 || weekdayIdx === 6
    const dayEvents  = eventsOnDate(dateStr)
    cells.push({ day: d, dateStr, events: dayEvents, isToday, isWeekend, weekdayIdx })
  }

  return cells
})

const monthEventCount = computed(() => {
  const ym = `${currentYear.value}-${String(currentMonth.value).padStart(2, '0')}`
  return events.value.filter(e => {
    if (!e.date?.startsWith(ym)) return false
    if (filterType.value !== '全部' && e.type !== filterType.value) return false
    if (filterLocation.value && extractLocation(e.room) !== filterLocation.value) return false
    return true
  }).length
})

// 類型統計（當月）
const typeCount = computed(() => {
  const ym = `${currentYear.value}-${String(currentMonth.value).padStart(2, '0')}`
  const counts = { 醫院: 0, 園區: 0, 芳心: 0 }
  events.value.filter(e => e.date?.startsWith(ym)).forEach(e => {
    if (counts[e.type] !== undefined) counts[e.type]++
  })
  return counts
})

function eventsOnDate(dateStr) {
  return events.value
    .filter(e => {
      if (e.date !== dateStr) return false
      if (filterType.value !== '全部' && e.type !== filterType.value) return false
      if (filterLocation.value && extractLocation(e.room) !== filterLocation.value) return false
      return true
    })
    .sort((a, b) => (a.time || '').localeCompare(b.time || ''))
}

// ── 主資料狀態 ────────────────────────────────────────────────────
const events  = ref([])
const loading = ref(false)
const saving  = ref(false)
const toast   = reactive({ show: false, message: '' })

async function fetchEvents() {
  loading.value = true
  try {
    const res = await fetch(`${BASE.value}/list`)
    events.value = res.ok ? await res.json() : []
  } catch (e) {
    console.error(e)
    showToast('載入失敗')
  } finally {
    loading.value = false
  }
}

// ── 日面板（點 +N 展開當日所有活動）──────────────────────────────
const dayPanel = reactive({ show: false, dateStr: '', events: [] })

function openDayPanel(cell) {
  dayPanel.dateStr = cell.dateStr
  dayPanel.events  = cell.events
  dayPanel.show    = true
}

// ── 新增 / 編輯 Modal ─────────────────────────────────────────────
const formModal = reactive({ show: false, isNew: true, id: null })
const form      = reactive({ date: '', time: '', title: '', owner: '', room: '', type: '醫院' })
const formError = ref('')

// 從日曆格子點 + 新增，自動帶入日期
function openAddOnDate(dateStr) {
  formModal.isNew = true
  formModal.id    = null
  Object.assign(form, {
    date: dateStr || '',
    time: '', title: '', owner: '', room: '', type: '醫院'
  })
  formError.value = ''
  formModal.show  = true
}

function openEdit(ev) {
  formModal.isNew = false
  formModal.id    = ev.id
  Object.assign(form, { date: ev.date, time: ev.time, title: ev.title, owner: ev.owner, room: ev.room, type: ev.type })
  formError.value = ''
  formModal.show  = true
}

async function saveForm() {
  if (!form.date || !form.title.trim()) { formError.value = '日期和標題為必填'; return }
  saving.value    = true
  formError.value = ''
  try {
    const payload = { ...form, id: formModal.isNew ? null : formModal.id }
    const res = await fetch(`${BASE.value}/save`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
    if (!res.ok) throw new Error('儲存失敗')
    const saved = await res.json()
    if (formModal.isNew) {
      events.value.push(saved)
      showToast('活動已新增')
    } else {
      const idx = events.value.findIndex(e => e.id === formModal.id)
      if (idx !== -1) events.value[idx] = saved
      // 同步更新側板
      if (dayPanel.show && dayPanel.dateStr === saved.date) {
        dayPanel.events = eventsOnDate(saved.date)
      }
      showToast('活動已更新')
    }
    formModal.show = false
  } catch (e) {
    formError.value = e.message
  } finally {
    saving.value = false
  }
}

// DELETE /holy/calendar/{id}?date=YYYY-MM-DD
async function deleteEvent(ev) {
  if (!confirm(`確定要刪除「${ev.title}」？`)) return
  try {
    const res = await fetch(`${BASE.value}/${ev.id}?date=${ev.date}`, { method: 'DELETE' })
    if (!res.ok) throw new Error()
    events.value = events.value.filter(e => e.id !== ev.id)
    // 同步更新側板
    if (dayPanel.show) dayPanel.events = eventsOnDate(dayPanel.dateStr)
    showToast('已刪除')
  } catch {
    showToast('刪除失敗')
  }
}

// ── TXT 解析 ──────────────────────────────────────────────────────
const showTxtModal = ref(false)
const txtInput     = ref('')
const txtResult    = ref(null)

function closeTxtModal() {
  showTxtModal.value = false
  txtInput.value     = ''
  txtResult.value    = null
}

// 回傳 { events: [], notes: [] }
function parseTxtContent(raw) {
  const lines   = raw.split('\n').map(l => l.trim()).filter(Boolean)
  const evList  = []
  const noteList = []
  let year = null, month = null, day = null
  let inNotes = false

  for (const line of lines) {
    // 年月行
    const ym = line.match(/^(\d{4})年(\d{1,2})月/)
    if (ym) { year = +ym[1]; month = +ym[2]; inNotes = false; continue }

    // 備注區塊起始：「備 註 :」「備註：」等變體
    if (/^備\s*[註注]\s*[:：]/.test(line)) { inNotes = true; continue }

    // ── 備注區 ──
    if (inNotes) {
      // 格式：1.(2026-04-03-14:00)文字內容
      // → 保留成「(2026-04-03-14:00) 文字內容」
      const m = line.match(/^\d+\.\s*(\([^)]*\))?\s*(.+)$/)
      if (m) {
        const prefix = m[1] ? m[1] + ' ' : ''
        const text   = m[2].trim()
        if (text) noteList.push(prefix + text)
      } else if (line && !/^備/.test(line)) {
        noteList.push(line)
      }
      continue
    }

    // ── 活動區 ──
    if (/^\d{1,2}$/.test(line) && +line >= 1 && +line <= 31) {
      day = +line; continue
    }

    if (!year || !month || !day) continue

    const ev = line.match(/^(\d{2}:\d{2}-\d{2}:\d{2})\s+(.+?)\s*\(([^)]*)\)(醫院|園區|芳心)$/)
    if (!ev) continue

    const time  = ev[1]
    const title = ev[2].replace(/\s*\.\.\s*$/, '').trim()
    const type  = ev[4]
    const parts = ev[3].trim().split(/\s+/).filter(Boolean)
    const owner = parts[0] || ''
    const room  = parts.slice(1).join(' ')
    const date  = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`

    evList.push({ date, time, title, owner, room, type })
  }
  return { events: evList, notes: noteList }
}

function eventKey(e) { return `${e.date}|${e.time}|${e.title}|${e.owner}` }

function parseTxt() {
  const { events: parsed, notes: parsedNotes } = parseTxtContent(txtInput.value)
  const existing = new Set(events.value.map(eventKey))
  const added = [], skipped = { count: 0 }

  for (const ev of parsed) {
    if (existing.has(eventKey(ev))) { skipped.count++; continue }
    existing.add(eventKey(ev))
    added.push(ev)
  }
  txtResult.value = { total: parsed.length, added, skipped: skipped.count, notes: parsedNotes }
}

async function confirmImportTxt() {
  if (!txtResult.value?.added.length && !txtResult.value?.notes.length) return
  saving.value = true
  try {
    // ① 匯入活動
    if (txtResult.value.added.length > 0) {
      const res = await fetch(`${BASE.value}/batch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(txtResult.value.added)
      })
      if (!res.ok) throw new Error('活動匯入失敗')
      const saved = await res.json()
      events.value.push(...saved)
    }

    // ② 匯入備注：按月份分組，合併到現有備注後儲存
    if (txtResult.value.notes.length > 0) {
      // 找出解析到的活動所在月份（取第一筆），若無活動就取 currentYearMonth
      const targetYm = txtResult.value.added.length > 0
        ? txtResult.value.added[0].date.slice(0, 7)
        : currentYearMonth.value

      // 先抓現有備注，再合併新備注（去重）
      let existing = []
      try {
        const r = await fetch(`${BASE.value}/notes?yearMonth=${targetYm}`)
        if (r.ok) existing = await r.json()
      } catch {}
      const merged = [...existing]
      for (const n of txtResult.value.notes) {
        if (!merged.includes(n)) merged.push(n)
      }
      await fetch(`${BASE.value}/notes?yearMonth=${targetYm}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(merged)
      })
      // 若當前月份就是 targetYm，同步更新畫面
      if (targetYm === currentYearMonth.value) {
        notes.value = merged
      }
    }

    // ③ 跳至第一筆活動的月份
    if (txtResult.value.added.length > 0) {
      const firstDate = txtResult.value.added[0].date
      currentYear.value  = +firstDate.slice(0, 4)
      currentMonth.value = +firstDate.slice(5, 7)
    }

    const evCount   = txtResult.value.added.length
    const noteCount = txtResult.value.notes.length
    showToast(`匯入 ${evCount} 筆活動、${noteCount} 條備注`)
    closeTxtModal()
  } catch (e) {
    showToast(e.message)
  } finally {
    saving.value = false
  }
}

// ── 備注 ──────────────────────────────────────────────────────────
// GET  /holy/calendar/notes?yearMonth=2026-04  → String[]
// POST /holy/calendar/notes?yearMonth=2026-04  body: String[]
const notes        = ref([])      // 當月備注陣列
const notesSaving  = ref(false)
const noteEditIdx  = ref(-1)      // 正在編輯的備注 index，-1 表示無
const noteEditValue = ref('')

const currentYearMonth = computed(() =>
  `${currentYear.value}-${String(currentMonth.value).padStart(2, '0')}`
)

// 切換月份時重新載入備注，並重置篩選
watch(currentYearMonth, () => {
  fetchNotes()
  noteEditIdx.value    = -1
  filterType.value     = '全部'
  filterLocation.value = ''
})

async function fetchNotes() {
  try {
    const res = await fetch(`${BASE.value}/notes?yearMonth=${currentYearMonth.value}`)
    notes.value = res.ok ? await res.json() : []
  } catch {
    notes.value = []
  }
}

async function saveNotes() {
  notesSaving.value = true
  try {
    await fetch(`${BASE.value}/notes?yearMonth=${currentYearMonth.value}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(notes.value)
    })
  } catch {
    showToast('備注儲存失敗')
  } finally {
    notesSaving.value = false
  }
}

function addNote() {
  notes.value.push('')
  noteEditIdx.value   = notes.value.length - 1
  noteEditValue.value = ''
}

function startEditNote(idx) {
  noteEditIdx.value   = idx
  noteEditValue.value = notes.value[idx]
}

async function confirmEditNote(idx) {
  if (!noteEditValue.value.trim()) {
    // 空白就直接刪除
    notes.value.splice(idx, 1)
  } else {
    notes.value[idx] = noteEditValue.value.trim()
  }
  noteEditIdx.value = -1
  await saveNotes()
}

function cancelEditNote() {
  // 若是剛新增的空白項就移除
  if (notes.value[noteEditIdx.value] === '') {
    notes.value.splice(noteEditIdx.value, 1)
  }
  noteEditIdx.value = -1
}

async function deleteNote(idx) {
  notes.value.splice(idx, 1)
  await saveNotes()
  showToast('備注已刪除')
}

// ── Toast ─────────────────────────────────────────────────────────
function showToast(msg) {
  toast.message = msg
  toast.show    = true
  setTimeout(() => { toast.show = false }, 2500)
}

onMounted(() => {
  fetchEvents()
  fetchNotes()
})
</script>

<style scoped>
/* ── 月曆格線 ── */
.calendar-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
}

/* ── 日期格子 ── */
.cal-cell {
  min-height: 110px;
  background: #fff;
  border-radius: 8px;
  padding: 6px 5px 5px;
  cursor: pointer;
  transition: box-shadow 0.15s, background 0.1s;
  position: relative;
}
.cal-cell:hover { box-shadow: 0 0 0 2px #6366f1; }
.cal-cell:hover .cal-add-btn { opacity: 1 !important; }

:root.dark .cal-cell { background: #27272a; }
.cal-cell.weekend  { background: #faf6f2; }
:root.dark .cal-cell.weekend { background: #232325; }
.cal-cell.today    { box-shadow: 0 0 0 2px #6366f1; }
.cal-cell.has-events { box-shadow: 0 1px 4px rgba(0,0,0,.07); }

/* ── 日期數字 ── */
.cal-day-num {
  font-size: 13px;
  font-weight: 600;
  line-height: 1;
}
.today-num {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  background: #6366f1;
  color: #fff;
  border-radius: 50%;
  font-weight: 700;
}

/* ── 快速新增按鈕 ── */
.cal-add-btn { opacity: 0; transition: opacity 0.15s; }

/* ── 活動 chip ── */
.cal-chip {
  display: flex;
  align-items: baseline;
  gap: 3px;
  border-radius: 4px;
  padding: 1px 4px;
  cursor: pointer;
  overflow: hidden;
  transition: opacity 0.1s, filter 0.1s;
  font-size: 10px;
}
.cal-chip:hover { opacity: 0.8; filter: brightness(0.95); }

.chip-time {
  font-size: 9px;
  font-weight: 700;
  flex-shrink: 0;
  font-variant-numeric: tabular-nums;
  opacity: 0.7;
}
.chip-title {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  flex: 1;
  min-width: 0;
  font-weight: 500;
}

/* chip 顏色 */
.chip-hospital { background: #fee2e2; color: #c0392b; }
.chip-park     { background: #d1fae5; color: #065f46; }
.chip-fragrant { background: #fce7f3; color: #9d4f78; }
:root.dark .chip-hospital { background: #4d2323; color: #fca5a5; }
:root.dark .chip-park     { background: #1a3a26; color: #6ee7b7; }
:root.dark .chip-fragrant { background: #3b1a2e; color: #f0abfc; }

/* ── 類型 badge ── */
.type-badge {
  display: inline-flex;
  align-items: center;
  font-size: 11px;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: 10px;
}
.type-badge.hospital { background: #fee2e2; color: #c0392b; }
.type-badge.park     { background: #d1fae5; color: #065f46; }
.type-badge.fragrant { background: #fce7f3; color: #9d4f78; }
:root.dark .type-badge.hospital { background: #4d2323; color: #f87171; }
:root.dark .type-badge.park     { background: #1a3a26; color: #4ade80; }
:root.dark .type-badge.fragrant { background: #3b1a2e; color: #f0abfc; }

/* ── 篩選按鈕：類型 ── */
.filter-type-btn {
  display: inline-flex; align-items: center; gap: 5px;
  padding: 4px 10px; border-radius: 16px; font-size: 12px; font-weight: 500;
  border: 1.5px solid #e2ddd8; background: transparent; cursor: pointer;
  color: #78716c; transition: all .15s;
}
:root.dark .filter-type-btn { border-color: #3f3f46; color: #a1a1aa; }
.filter-count {
  font-size: 10px; opacity: .7; background: rgba(0,0,0,.06);
  border-radius: 8px; padding: 0 4px; min-width: 16px; text-align: center;
}
.filter-type-btn.active.all      { background: #1c1917; color: #fff; border-color: #1c1917; }
.filter-type-btn.active.hospital { background: #e0534a; color: #fff; border-color: #e0534a; }
.filter-type-btn.active.park     { background: #3d6b52; color: #fff; border-color: #3d6b52; }
.filter-type-btn.active.fragrant { background: #a06080; color: #fff; border-color: #a06080; }
.filter-type-btn:not(.active):hover { border-color: #6366f1; color: #6366f1; }

/* ── 篩選按鈕：地點 ── */
.filter-loc-btn {
  padding: 3px 10px; border-radius: 14px; font-size: 11px; font-weight: 500;
  border: 1.5px solid #e2ddd8; background: transparent; cursor: pointer;
  color: #78716c; transition: all .15s; white-space: nowrap;
}
:root.dark .filter-loc-btn { border-color: #3f3f46; color: #a1a1aa; }
.filter-loc-btn.active      { background: #6366f1; color: #fff; border-color: #6366f1; }
.filter-loc-btn:not(.active):hover { border-color: #6366f1; color: #6366f1; }

/* ── 表單欄位 ── */
.field-label {
  display: block;
  font-size: 12px;
  font-weight: 600;
  color: #57534e;
  margin-bottom: 4px;
}
:root.dark .field-label { color: #a8a29e; }
.field-input {
  width: 100%;
  padding: 8px 12px;
  font-size: 13px;
  border: 1px solid #e2ddd8;
  border-radius: 12px;
  background: #fff;
  color: #1c1917;
  outline: none;
  transition: border 0.15s, box-shadow 0.15s;
}
:root.dark .field-input { background: #3f3f46; border-color: #52525b; color: #f5f5f4; }
.field-input:focus { border-color: #6366f1; box-shadow: 0 0 0 3px rgba(99,102,241,.12); }

/* ── 側板動畫 ── */
.slide-right-enter-active, .slide-right-leave-active { transition: opacity 0.2s; }
.slide-right-enter-active > div, .slide-right-leave-active > div { transition: transform 0.25s cubic-bezier(.32,.72,0,1); }
.slide-right-enter-from { opacity: 0; }
.slide-right-enter-from > div { transform: translateX(100%); }
.slide-right-leave-to { opacity: 0; }
.slide-right-leave-to > div { transform: translateX(100%); }

/* ── Toast ── */
.fade-enter-active, .fade-leave-active { transition: opacity 0.3s, transform 0.3s; }
.fade-enter-from, .fade-leave-to { opacity: 0; transform: translateY(8px); }

/* ── RWD ── */
@media (max-width: 640px) {
  .cal-cell { min-height: 72px; padding: 3px 2px; }
  .cal-chip  { padding: 1px 3px; }
}
</style>
