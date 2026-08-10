<template>
  <div class="min-h-full bg-surface2 dark:bg-[#15171c] transition-colors lg:flex lg:items-start">
    <!-- ══ 左側功能欄（lg 以上固定在左側；手機維持在最上方）══ -->
    <div class="lg:w-72 lg:flex-shrink-0 lg:border-r lg:border-light-c dark:lg:border-[#2a2e37] lg:h-screen lg:sticky lg:top-0 lg:overflow-y-auto">
      <!-- ── 精簡列（永遠顯示）── -->
      <div class="bg-surface dark:bg-[#15171c] border-b border-light-c dark:border-[#22252c] px-6 py-3 sticky top-0 z-30 lg:static">
        <div class="flex items-center gap-4">
          <button
            class="w-9 h-9 flex items-center justify-center rounded-full border border-light-c dark:border-[#2a2e37] text-hint-c hover:bg-indigo-50 hover:border-indigo-300 hover:text-indigo-600 dark:hover:bg-indigo-900/20 transition-colors"
            @click="prevMonth"
          >
            <svg
              class="w-4.5 h-4.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            ><path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2.5"
              d="M15 18l-6-6 6-6"
            /></svg>
          </button>
          <h2 class="text-xl font-bold text-base-c min-w-[130px] text-center">
            {{ currentYear }} 年 {{ currentMonth }} 月
          </h2>
          <button
            class="w-9 h-9 flex items-center justify-center rounded-full border border-light-c dark:border-[#2a2e37] text-hint-c hover:bg-indigo-50 hover:border-indigo-300 hover:text-indigo-600 dark:hover:bg-indigo-900/20 transition-colors"
            @click="nextMonth"
          >
            <svg
              class="w-4.5 h-4.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            ><path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2.5"
              d="M9 18l6-6-6-6"
            /></svg>
          </button>
          <button
            class="px-4 py-1.5 text-sm border border-light-c dark:border-[#2a2e37] text-hint-c rounded-lg hover:bg-surface2 dark:hover:bg-[#1c1f26] transition-colors"
            @click="goToday"
          >
            今天
          </button>
          <button
            class="lg:hidden flex items-center gap-1.5 px-3 py-1.5 text-sm text-hint-c hover:text-indigo-600 dark:hover:text-indigo-400 rounded-lg hover:bg-surface2 dark:hover:bg-[#1c1f26] transition-colors"
            @click="panelExpanded = !panelExpanded"
          >
            <span class="hidden sm:inline">{{ panelExpanded ? '收合' : '展開' }}</span>
            <svg
              class="w-4 h-4 transition-transform"
              :class="{ 'rotate-180': panelExpanded }"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            ><path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2.5"
              d="M19 9l-7 7-7-7"
            /></svg>
          </button>
        </div>
      </div>

      <!-- ── 可收合區塊：Header / 圖例 / 篩選列 ── -->
      <!-- v-show（不是 v-if）＋ .collapsible-panel：收合只在手機生效，lg 以上一定強制顯示（見 <style> 裡的 media query） -->
      <div
        v-show="panelExpanded"
        class="collapsible-panel"
      >
        <!-- ── Header ── -->
        <header class="bg-surface dark:bg-[#15171c] border-b border-light-c dark:border-[#2a2e37] px-6 py-4">
          <div class="flex items-center gap-6 flex-wrap lg:flex-col lg:items-stretch lg:gap-4">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-lg bg-indigo-600 flex items-center justify-center text-white text-base font-bold flex-shrink-0">
                曆
              </div>
              <div>
                <h1 class="font-bold text-base-c leading-none text-lg sm:text-xl">
                  行事曆管理
                </h1>
                <p class="text-sm text-hint-c mt-1 hidden sm:block">
                  Calendar Events · {{ events.length }} 筆
                </p>
              </div>
            </div>
            <div
              v-if="perm.can('management.calendar')"
              class="lg:w-full rounded-xl border border-light-c dark:border-[#2a2e37] bg-surface2/70 dark:bg-[#1c1f26]/70 px-3 py-2.5"
            >
              <p class="text-xs font-semibold text-hint-c/80 mb-2 px-0.5 tracking-wide">
                院內功能
              </p>
              <div class="flex items-center gap-3 lg:flex-col lg:items-stretch lg:gap-2">
                <button
                  class="flex items-center gap-1.5 px-4 py-2 text-sm font-medium border border-red-200 dark:border-red-900/50 text-red-500 dark:text-red-400 rounded-lg bg-surface dark:bg-[#1c1f26] hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors lg:w-full lg:justify-center"
                  @click="openClearMonthModal"
                >
                  <svg
                    class="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  ><path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                  /></svg>
                  <span class="hidden sm:inline">清空當月</span>
                </button>
                <button
                  class="flex items-center gap-1.5 px-4 py-2 text-sm font-medium border border-light-c dark:border-[#2a2e37] text-muted-c rounded-lg bg-surface dark:bg-[#1c1f26] hover:border-indigo-400 hover:text-indigo-600 transition-colors lg:w-full lg:justify-center"
                  @click="showTxtModal = true"
                >
                  <svg
                    class="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  ><path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  /></svg>
                  <span class="hidden sm:inline">貼上 TXT</span>
                  <span class="sm:hidden">TXT</span>
                </button>
                <button
                  class="flex items-center gap-1.5 px-4 py-2 text-sm font-medium bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors lg:w-full lg:justify-center"
                  @click="openAddOnDate(null)"
                >
                  <svg
                    class="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  ><path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M12 4v16m8-8H4"
                  /></svg>
                  新增
                </button>
              </div>
            </div>

            <!-- 行程功能：跟院內系統互不相干的獨立資料，UI 結構相似但獨立成一區 -->
            <div
              v-if="perm.can('management.calendar')"
              class="lg:w-full rounded-xl border border-teal-200 dark:border-teal-900/50 bg-teal-50/60 dark:bg-teal-900/10 px-3 py-2.5"
            >
              <p class="text-xs font-semibold text-teal-700/80 dark:text-teal-400/80 mb-2 px-0.5 tracking-wide">
                行程功能
              </p>
              <div class="flex items-center gap-3 lg:flex-col lg:items-stretch lg:gap-2">
                <button
                  class="flex items-center gap-1.5 px-4 py-2 text-sm font-medium bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors lg:w-full lg:justify-center"
                  @click="openAddOnDate(null, 'itinerary')"
                >
                  <svg
                    class="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  ><path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M12 4v16m8-8H4"
                  /></svg>
                  新增行程
                </button>
              </div>
            </div>
          </div>
        </header>

        <!-- ── 類型圖例（可複選，勾選/取消決定要不要顯示該分類）── -->
        <div class="bg-surface dark:bg-[#15171c] border-b border-light-c dark:border-[#22252c] px-6 py-3">
          <div class="flex items-center justify-between mb-2">
            <span class="text-sm text-hint-c">{{ monthEventCount }} 筆</span>
            <button
              class="text-xs text-indigo-500 hover:text-indigo-600 font-medium"
              @click="allCategoriesActive ? clearAllCategories() : selectAllCategories()"
            >
              {{ allCategoriesActive ? '全部取消' : '全選' }}
            </button>
          </div>
          <div class="flex flex-col gap-1.5">
            <!-- 院內：父層 checkbox，統一控制底下 4 個子分類；半勾表示部分子分類有勾 -->
            <label class="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                class="legend-checkbox"
                :checked="localAllActive"
                :indeterminate="localSomeActive"
                @change="toggleLocalGroup"
              >
              <span class="text-sm text-hint-c flex-1 font-semibold">院內</span>
              <span class="text-xs text-hint-c/70">{{ localTotalCount }}</span>
            </label>
            <label
              v-for="item in LOCAL_SUB_ITEMS"
              :key="item.key"
              class="flex items-center gap-2 cursor-pointer select-none pl-5"
            >
              <input
                type="checkbox"
                class="legend-checkbox"
                :checked="activeCategories[item.key]"
                @change="toggleCategory(item.key)"
              >
              <div :class="['w-3 h-3 rounded-sm flex-shrink-0', item.dot]" />
              <span class="text-sm text-hint-c flex-1">{{ item.label }}</span>
              <span class="text-xs text-hint-c/70">{{ leafTypeCount[item.key] || 0 }}</span>
            </label>
            <!-- 其餘獨立來源：行程／Google／訂位／便當／豆漿／訂房 -->
            <label
              v-for="item in OTHER_LEGEND_ITEMS"
              :key="item.key"
              class="flex items-center gap-2 cursor-pointer select-none"
            >
              <input
                type="checkbox"
                class="legend-checkbox"
                :checked="activeCategories[item.key]"
                @change="toggleCategory(item.key)"
              >
              <div :class="['w-3 h-3 rounded-sm flex-shrink-0', item.dot]" />
              <span class="text-sm text-hint-c flex-1">{{ item.label }}</span>
              <span class="text-xs text-hint-c/70">{{ leafTypeCount[item.key] || 0 }}</span>
              <span
                v-if="item.key === 'Google' && googleLoading"
                class="filter-sync-hint !ml-1"
              >
                  <span class="filter-sync-dot" />
                </span>
            </label>
          </div>
        </div>

        <!-- ── 篩選列 ── -->
        <div class="border-b border-light-c dark:border-[#22252c] bg-surface dark:bg-[#15171c] px-6 py-3.5">
          <div class="filter-bar">
            <!-- 地點 -->
            <div
              v-if="availableLocations.length"
              class="filter-select-group"
            >
              <label class="filter-label">地點</label>
              <select
                v-model="filterLocation"
                class="filter-select"
              >
                <option value="">
                  全部
                </option>
                <option
                  v-for="loc in availableLocations"
                  :key="loc"
                  :value="loc"
                >
                  {{ loc }}
                </option>
              </select>
            </div>
          </div>
        </div>
      </div>
    </div>
    <!-- ══ 左側功能欄結束 ══ -->

    <!-- ══ 右側主內容 ══ -->
    <div class="flex-1 min-w-0">
      <!-- ── 月曆主體 ── -->
      <div class="px-0 sm:px-6 py-6">
        <div
          v-if="loading"
          class="flex items-center justify-center py-24 text-hint-c gap-2"
        >
          <div class="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          載入中…
        </div>

        <template v-else>
          <!-- 星期標頭 -->
          <div class="calendar-grid gap-1.5 mb-1.5 weekday-header">
            <div
              v-for="(d, wIdx) in weekdays"
              :key="d"
              :class="['cal-weekday', { sun: wIdx === 0, sat: wIdx === 6 }]"
            >
              {{ d }}
            </div>
          </div>

          <!-- 逐週渲染：每週獨立一組 grid + overlay，讓跨天活動可以畫成橫跨整週的連續色條 -->
          <div
            v-for="(week, wi) in calendarWeeks"
            :key="wi"
            class="week-row mb-1.5"
          >
            <div class="calendar-grid gap-1.5">
              <div
                v-for="(cell, idx) in week"
                :key="idx"
                :class="['cal-cell', {
                  'opacity-0 pointer-events-none': !cell.day,
                  'today': cell.isToday,
                  'weekend': cell.isWeekend,
                  'has-events': cell.events.length > 0
                }]"
              >
                <template v-if="cell.day">
                  <!-- 日期數字 -->
                  <div class="cal-day-header flex items-center justify-between mb-1 px-0.5">
                    <span
                      :class="['cal-day-num', {
                        'today-num': cell.isToday,
                        'text-red-400 dark:text-red-400': cell.isWeekend && cell.weekdayIdx === 0,
                        'text-blue-400 dark:text-blue-400': cell.isWeekend && cell.weekdayIdx === 6,
                        'text-muted-c': !cell.isToday && !cell.isWeekend
                      }]"
                    >{{ cell.day }}</span>
                  </div>

                  <!-- 活動 chips（跨天橫幅活動已排除，改由下方 overlay 顯示） -->
                  <div
                    class="space-y-0.5"
                    :style="weekBannerLanes[wi] ? { marginTop: (weekBannerLanes[wi] * BANNER_ROW_HEIGHT) + 'px' } : null"
                  >
                    <div
                      v-for="ev in cell.chipEvents.slice(0, 3)"
                      :key="ev.id"
                      :class="['cal-chip', chipClass(ev), { 'cursor-pointer': isDetailClickable(ev) }]"
                      @click.stop="isDetailClickable(ev) && openEventDetail(ev)"
                      @mouseenter="showTooltip(ev, $event)"
                      @mousemove="moveTooltip($event)"
                      @mouseleave="hideTooltip"
                    >
                      <span class="chip-time hidden sm:inline">{{ ev.time }}</span>
                      <span class="chip-title">{{ ev.title }}</span>
                    </div>
                    <!-- 超出顯示 +N -->
                    <div
                      v-if="cell.chipEvents.length > 3"
                      class="text-xs text-hint-c px-1 cursor-pointer hover:text-indigo-500 transition-colors"
                      @click.stop="openDayPanel(cell)"
                    >
                      +{{ cell.chipEvents.length - 3 }} 更多
                    </div>
                  </div>
                </template>
              </div>
            </div>

            <!-- 跨天活動連續色條（比照 Google 日曆的橫幅顯示方式） -->
            <div
              v-if="weekBanners[wi] && weekBanners[wi].length"
              class="week-banner-layer"
            >
              <div
                v-for="b in weekBanners[wi]"
                :key="b.key"
                :class="['week-banner-bar', chipClass(b.ev), { 'round-l': b.roundLeft, 'round-r': b.roundRight, 'cursor-pointer': isDetailClickable(b.ev) }]"
                :style="{ gridColumn: `${b.startCol + 1} / ${b.endCol + 2}`, top: (b.lane * BANNER_ROW_HEIGHT) + 'px' }"
                @click.stop="isDetailClickable(b.ev) && openEventDetail(b.ev)"
                @mouseenter="showTooltip(b.ev, $event)"
                @mousemove="moveTooltip($event)"
                @mouseleave="hideTooltip"
              >
                {{ b.ev.title }}
              </div>
            </div>
          </div>

          <!-- ── 備注區 ── -->
          <div class="mt-5 bg-amber-50 dark:bg-[#3a2a1a]/60 border border-amber-200 dark:border-amber-900/50 rounded-2xl overflow-hidden">
            <!-- 備注標題列 -->
            <div class="flex items-center justify-between px-4 py-3 border-b border-amber-100 dark:border-amber-900/40">
              <div class="flex items-center gap-2">
                <svg
                  class="w-4 h-4 text-amber-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                ><path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                /></svg>
                <span class="text-sm font-semibold text-amber-700 dark:text-amber-400">備注事項</span>
                <span class="text-xs text-amber-500 dark:text-amber-500">{{ currentYear }}年{{ currentMonth }}月</span>
                <span
                  v-if="notesSaving"
                  class="text-xs text-amber-400 flex items-center gap-1"
                >
                  <div class="w-3 h-3 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
                  儲存中
                </span>
              </div>
              <button
                class="flex items-center gap-1 px-2.5 py-1 text-xs bg-amber-500 hover:bg-amber-600 text-white rounded-lg transition-colors"
                @click="addNote"
              >
                <svg
                  class="w-3 h-3"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                ><path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2.5"
                  d="M12 4v16m8-8H4"
                /></svg>
                新增備注
              </button>
            </div>

            <!-- 備注列表 -->
            <div class="px-4 py-3 space-y-2">
              <div
                v-if="notes.length === 0"
                class="text-center py-4 text-amber-400 dark:text-amber-600 text-sm"
              >
                本月尚無備注，點右上角新增
              </div>

              <div
                v-for="(note, idx) in notes"
                :key="idx"
                class="group flex items-start gap-2"
              >
                <!-- 序號 -->
                <span class="flex-shrink-0 w-5 h-5 rounded-full bg-amber-200 dark:bg-amber-900/50 text-amber-600 dark:text-amber-400 text-xs font-bold flex items-center justify-center mt-1">
                  {{ idx + 1 }}
                </span>
                <!-- 文字（點擊編輯） -->
                <div class="flex-1 min-w-0">
                  <div
                    v-if="noteEditIdx !== idx"
                    class="text-sm text-muted-c leading-relaxed cursor-pointer hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors break-words"
                    @click="startEditNote(idx)"
                  >
                    {{ note || '（點擊編輯）' }}
                  </div>
                  <div
                    v-else
                    class="flex items-start gap-2"
                  >
                    <textarea
                      v-model="noteEditValue"
                      rows="2"
                      class="flex-1 p-2 text-sm border border-indigo-300 dark:border-indigo-700 rounded-lg bg-surface dark:bg-[#1c1f26] text-base-c resize-none outline-none focus:ring-2 focus:ring-indigo-400"
                      autofocus
                      @keydown.enter.ctrl="confirmEditNote(idx)"
                      @keydown.esc="cancelEditNote"
                    />
                    <div class="flex flex-col gap-1 flex-shrink-0">
                      <button
                        class="px-2.5 py-1 text-xs bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                        @click="confirmEditNote(idx)"
                      >
                        確認
                      </button>
                      <button
                        class="px-2.5 py-1 text-xs border border-light-c dark:border-[#2a2e37] text-hint-c rounded-lg hover:bg-surface2 transition-colors"
                        @click="cancelEditNote"
                      >
                        取消
                      </button>
                    </div>
                  </div>
                </div>
                <!-- 刪除 -->
                <button
                  v-if="noteEditIdx !== idx"
                  class="flex-shrink-0 p-1 text-hint-c hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all mt-0.5"
                  title="刪除"
                  @click="deleteNote(idx)"
                >
                  <svg
                    class="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  ><path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M6 18L18 6M6 6l12 12"
                  /></svg>
                </button>
              </div>
            </div>
          </div>
        </template>
      </div>
    </div>
    <!-- ══ 右側主內容結束 ══ -->

    <!-- ══ 側板：某日所有活動 ══ -->
    <Transition name="slide-right">
      <div
        v-if="dayPanel.show"
        class="fixed inset-0 z-40 flex justify-end"
        @click.self="dayPanel.show = false"
      >
        <div class="w-full sm:w-96 bg-surface dark:bg-[#15171c] h-full shadow-2xl overflow-y-auto flex flex-col">
          <!-- 側板 Header -->
          <div class="px-5 py-4 border-b border-light-c dark:border-[#2a2e37] flex items-center justify-between sticky top-0 bg-surface dark:bg-[#15171c] z-10">
            <div>
              <p class="font-bold text-base-c">
                {{ dayPanel.dateStr }}
              </p>
              <p class="text-xs text-hint-c mt-0.5">
                {{ dayPanel.events.length }} 個活動
              </p>
            </div>
            <div class="flex items-center gap-2">
              <button
                class="flex items-center gap-1 px-3 py-1.5 text-xs bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                @click="openAddOnDate(dayPanel.dateStr)"
              >
                <svg
                  class="w-3.5 h-3.5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                ><path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M12 4v16m8-8H4"
                /></svg>
                新增
              </button>
              <button
                class="text-hint-c hover:text-muted-c p-1"
                @click="dayPanel.show = false"
              >
                <svg
                  class="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                ><path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M6 18L18 6M6 6l12 12"
                /></svg>
              </button>
            </div>
          </div>

          <!-- 側板活動列表 -->
          <div class="flex-1 px-4 py-3 space-y-2">
            <div
              v-if="dayPanel.events.length === 0"
              class="text-center py-12 text-hint-c text-sm"
            >
              此日無活動
            </div>
            <div
              v-for="ev in dayPanel.events"
              :key="ev.id"
              class="group flex items-start gap-3 p-3 rounded-xl border border-light-c dark:border-[#2a2e37] hover:border-indigo-200 dark:hover:border-indigo-700 hover:bg-indigo-50/30 dark:hover:bg-indigo-900/10 transition-colors"
            >
              <!-- 類型色條 -->
              <div :class="['w-1 self-stretch rounded-full flex-shrink-0 mt-0.5', typeBarClass(ev)]" />
              <!-- 內容 -->
              <div
                :class="['flex-1 min-w-0', { 'cursor-pointer': isDetailClickable(ev) }]"
                @click="isDetailClickable(ev) && openEventDetail(ev)"
              >
                <p class="text-sm font-semibold text-base-c leading-tight">
                  {{ ev.title }}
                </p>
                <p class="text-xs text-hint-c mt-0.5">
                  {{ eventTimeLabel(ev) }}
                </p>
                <p
                  v-if="ev.owner"
                  class="text-xs text-hint-c"
                >
                  👤 {{ ev.owner }}
                </p>
                <p
                  v-if="ev.room"
                  class="text-xs text-hint-c truncate"
                >
                  📍 {{ ev.room }}
                </p>
                <p
                  v-if="ev.description"
                  class="text-xs text-hint-c mt-1 line-clamp-2 whitespace-pre-line"
                >
                  📝 {{ ev.description }}
                </p>
                <a
                  v-if="ev.source === 'google' && ev.googleLink"
                  :href="ev.googleLink"
                  target="_blank"
                  rel="noopener"
                  class="text-xs text-blue-500 underline mt-1 inline-block"
                  @click.stop
                >在 Google 日曆開啟</a>
                <span :class="['type-badge mt-1.5', typeColorClass(ev)]">{{ eventBadgeLabel(ev) }}</span>
              </div>
              <!-- 操作 -->
              <div class="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                <button
                  v-if="!ORDER_SOURCES.includes(ev.source)"
                  class="p-1.5 text-hint-c hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                  title="編輯"
                  @click="openEdit(ev)"
                >
                  <svg
                    class="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  ><path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                  /></svg>
                </button>
                <button
                  v-if="perm.can('management.calendar') && !ORDER_SOURCES.includes(ev.source)"
                  class="p-1.5 text-hint-c hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                  title="刪除"
                  @click="deleteEvent(ev)"
                >
                  <svg
                    class="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  ><path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                  /></svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Transition>

    <!-- ══ Modal: 新增 / 編輯 ══ -->
    <div
      v-if="formModal.show"
      class="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center z-50"
    >
      <div class="bg-surface dark:bg-[#15171c] rounded-t-3xl sm:rounded-2xl shadow-xl w-full sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <div class="px-5 py-4 border-b border-light-c dark:border-[#2a2e37] flex items-center justify-between sticky top-0 bg-surface dark:bg-[#15171c] z-10">
          <h3 class="font-bold text-base-c">
            {{ formModal.isNew ? (formModal.source === 'itinerary' ? '新增行程' : '新增活動') : (formModal.source === 'itinerary' ? '編輯行程' : '編輯活動') }}
          </h3>
          <button
            class="text-hint-c hover:text-muted-c p-1"
            @click="formModal.show = false"
          >
            <svg
              class="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            ><path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M6 18L18 6M6 6l12 12"
            /></svg>
          </button>
        </div>

        <div class="px-5 py-4 space-y-3">
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="field-label">起始日期 *</label>
              <input
                v-model="form.date"
                type="date"
                class="field-input"
              >
            </div>
            <div>
              <label class="field-label">起始時間</label>
              <input
                v-model="form.time"
                type="time"
                class="field-input"
              >
            </div>
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="field-label">結束日期（選填，跨天活動才需要填）</label>
              <input
                v-model="form.endDate"
                type="date"
                :min="form.date"
                class="field-input"
              >
            </div>
            <div>
              <label class="field-label">結束時間</label>
              <input
                v-model="form.endTime"
                type="time"
                class="field-input"
              >
            </div>
          </div>
          <p class="text-xs text-hint-c -mt-1">
            結束日期留空代表單日活動；填了結束日期就會以一整筆跨天活動顯示（畫面上是連續色條，不會拆成好幾天各自一筆）。
          </p>
          <div>
            <label class="field-label">標題 *</label>
            <input
              v-model="form.title"
              placeholder="活動名稱"
              class="field-input"
            >
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div :class="{ 'col-span-2': formModal.source === 'itinerary' }">
              <label class="field-label">負責人</label>
              <input
                v-model="form.owner"
                placeholder="姓名"
                class="field-input"
              >
            </div>
            <div v-if="formModal.source !== 'itinerary'">
              <label class="field-label">建築分類</label>
              <select
                v-model="form.building"
                class="field-input"
              >
                <option
                  v-for="t in TYPES"
                  :key="t"
                  :value="t"
                >
                  {{ t }}
                </option>
              </select>
            </div>
          </div>
          <div>
            <label class="field-label">場地</label>
            <input
              v-model="form.room"
              placeholder="場地代碼與名稱"
              class="field-input"
            >
          </div>
          <div v-if="formModal.source === 'itinerary'">
            <label class="field-label">詳細內容</label>
            <textarea
              v-model="form.description"
              rows="6"
              placeholder="場地、人數、單價、房間分配、聯絡人、租金、折扣、實收款項…等自由格式內容都可以直接貼在這裡"
              class="field-input resize-y"
            />
          </div>
          <p
            v-if="formError"
            class="text-xs text-red-500"
          >
            {{ formError }}
          </p>
        </div>

        <div class="px-5 py-4 border-t border-light-c dark:border-[#2a2e37] flex gap-2 justify-end sticky bottom-0 bg-surface dark:bg-[#15171c]">
          <button
            class="px-4 py-2 text-sm bg-surface2 dark:bg-[#1c1f26] text-muted-c rounded-xl hover:bg-surface2 transition-colors"
            @click="formModal.show = false"
          >
            取消
          </button>
          <button
            :disabled="saving"
            class="px-4 py-2 text-sm bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:bg-indigo-300 transition-colors flex items-center gap-1.5"
            @click="saveForm"
          >
            <div
              v-if="saving"
              class="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"
            />
            {{ formModal.isNew ? '新增' : '儲存' }}
          </button>
        </div>
      </div>
    </div>

    <!-- ══ Modal: 清空當月確認 ══ -->
    <div
      v-if="clearMonthModal.show"
      class="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center z-50"
      @click.self="closeClearMonthModal"
    >
      <div class="bg-surface dark:bg-[#15171c] rounded-t-3xl sm:rounded-2xl shadow-xl w-full sm:max-w-md max-h-[90vh] overflow-y-auto">
        <div class="px-5 py-4 border-b border-light-c dark:border-[#2a2e37] flex items-center justify-between">
          <h3 class="font-bold text-red-500 flex items-center gap-2">
            <svg
              class="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            ><path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"
            /></svg>
            清空當月內容
          </h3>
          <button
            class="text-hint-c hover:text-muted-c p-1"
            @click="closeClearMonthModal"
          >
            <svg
              class="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            ><path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M6 18L18 6M6 6l12 12"
            /></svg>
          </button>
        </div>

        <div class="px-5 py-4 space-y-3">
          <p class="text-sm text-muted-c leading-relaxed">
            即將刪除 <strong class="text-base-c">{{ currentYear }} 年 {{ currentMonth }} 月</strong> 的全部系統活動（{{ clearableEventCount }} 筆）與備注（{{ notes.length }} 條）。
          </p>
          <p class="text-xs text-hint-c">
            此操作無法復原。Google 日曆同步的活動不受影響，請另至 Google 日曆刪除。
          </p>
          <div>
            <label class="field-label">請輸入「{{ currentMonth }}」以確認刪除</label>
            <input
              v-model="clearMonthConfirmText"
              type="text"
              class="field-input"
              :placeholder="String(currentMonth)"
            >
          </div>
          <p
            v-if="clearMonthError"
            class="text-xs text-red-500"
          >
            {{ clearMonthError }}
          </p>
        </div>

        <div class="px-5 py-4 border-t border-light-c dark:border-[#2a2e37] flex gap-2 justify-end">
          <button
            class="px-4 py-2 text-sm bg-surface2 dark:bg-[#1c1f26] text-muted-c rounded-xl hover:bg-surface2 transition-colors"
            @click="closeClearMonthModal"
          >
            取消
          </button>
          <button
            :disabled="clearingMonth || clearMonthConfirmText !== String(currentMonth)"
            class="px-4 py-2 text-sm bg-red-500 text-white rounded-xl hover:bg-red-600 disabled:bg-red-200 disabled:cursor-not-allowed transition-colors flex items-center gap-1.5"
            @click="confirmClearMonth"
          >
            <div
              v-if="clearingMonth"
              class="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"
            />
            確認刪除
          </button>
        </div>
      </div>
    </div>

    <!-- ══ Modal: Google 活動詳細 ══ -->
    <div
      v-if="googleDetailModal.show && googleDetailModal.ev"
      class="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center z-50"
      @click.self="googleDetailModal.show = false"
    >
      <div class="bg-surface dark:bg-[#15171c] rounded-t-3xl sm:rounded-2xl shadow-xl w-full sm:max-w-lg max-h-[85vh] overflow-y-auto">
        <!-- Header -->
        <div class="px-5 py-4 border-b border-light-c dark:border-[#2a2e37] flex items-center justify-between sticky top-0 bg-surface dark:bg-[#15171c] z-10">
          <div class="flex items-center gap-2">
            <div class="w-2.5 h-2.5 rounded-sm bg-blue-500 flex-shrink-0" />
            <h3 class="font-bold text-base-c text-sm">
              Google 日曆活動
            </h3>
          </div>
          <button
            class="text-hint-c hover:text-muted-c p-1"
            @click="googleDetailModal.show = false"
          >
            <svg
              class="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            ><path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M6 18L18 6M6 6l12 12"
            /></svg>
          </button>
        </div>
        <!-- 內容 -->
        <div class="px-5 py-4 space-y-3">
          <!-- 標題 -->
          <p class="text-base font-bold text-base-c leading-snug">
            {{ googleDetailModal.ev.title }}
          </p>
          <!-- 日期 / 時間 -->
          <div class="flex items-center gap-2 text-sm text-hint-c">
            <svg
              class="w-4 h-4 flex-shrink-0"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            ><path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
            /></svg>
            <span>{{ eventTimeLabel(googleDetailModal.ev) || googleDetailModal.ev.date }}</span>
          </div>
          <!-- 地點 -->
          <div
            v-if="googleDetailModal.ev.room"
            class="flex items-start gap-2 text-sm text-hint-c"
          >
            <svg
              class="w-4 h-4 flex-shrink-0 mt-0.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            ><path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
            /><path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
            /></svg>
            <span>{{ googleDetailModal.ev.room }}</span>
          </div>
          <!-- 主辦人 -->
          <div
            v-if="googleDetailModal.ev.owner"
            class="flex items-center gap-2 text-sm text-hint-c"
          >
            <svg
              class="w-4 h-4 flex-shrink-0"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            ><path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
            /></svg>
            <span>{{ googleDetailModal.ev.owner }}</span>
          </div>
          <!-- 說明 -->
          <div
            v-if="googleDetailModal.ev.description"
            class="bg-surface2 dark:bg-[#1c1f26] rounded-xl p-3 text-sm text-muted-c leading-relaxed google-desc-html"
            style="white-space: pre-line"
            v-html="googleDetailModal.ev.description"
          />
        </div>
        <!-- Footer -->
        <div class="px-5 py-4 border-t border-light-c dark:border-[#2a2e37] flex gap-2 justify-end sticky bottom-0 bg-surface dark:bg-[#15171c]">
          <button
            class="px-4 py-2 text-sm bg-surface2 dark:bg-[#1c1f26] text-muted-c rounded-xl hover:bg-surface2 transition-colors"
            @click="googleDetailModal.show = false"
          >
            關閉
          </button>
          <a
            v-if="googleDetailModal.ev.googleLink"
            :href="googleDetailModal.ev.googleLink"
            target="_blank"
            rel="noopener"
            class="px-4 py-2 text-sm bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors flex items-center gap-1.5"
          >
            <svg
              class="w-3.5 h-3.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            ><path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
            /></svg>
            在 Google 日曆開啟
          </a>
        </div>
      </div>
    </div>

    <!-- ══ Modal: 行程詳細（點行程先看資料，裡面才有編輯／刪除）══ -->
    <div
      v-if="itineraryDetailModal.show && itineraryDetailModal.ev"
      class="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center z-50"
      @click.self="itineraryDetailModal.show = false"
    >
      <div class="bg-surface dark:bg-[#15171c] rounded-t-3xl sm:rounded-2xl shadow-xl w-full sm:max-w-lg max-h-[85vh] overflow-y-auto">
        <!-- Header -->
        <div class="px-5 py-4 border-b border-light-c dark:border-[#2a2e37] flex items-center justify-between sticky top-0 bg-surface dark:bg-[#15171c] z-10">
          <div class="flex items-center gap-2">
            <div class="w-2.5 h-2.5 rounded-sm bg-teal-500 flex-shrink-0" />
            <h3 class="font-bold text-base-c text-sm">
              行程詳細
            </h3>
          </div>
          <button
            class="text-hint-c hover:text-muted-c p-1"
            @click="itineraryDetailModal.show = false"
          >
            <svg
              class="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            ><path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M6 18L18 6M6 6l12 12"
            /></svg>
          </button>
        </div>
        <!-- 內容 -->
        <div class="px-5 py-4 space-y-3">
          <!-- 標題 -->
          <p class="text-base font-bold text-base-c leading-snug">
            {{ itineraryDetailModal.ev.title }}
          </p>
          <!-- 日期 / 時間 -->
          <div class="flex items-center gap-2 text-sm text-hint-c">
            <svg
              class="w-4 h-4 flex-shrink-0"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            ><path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
            /></svg>
            <span>{{ eventTimeLabel(itineraryDetailModal.ev) || itineraryDetailModal.ev.date }}</span>
          </div>
          <!-- 地點 -->
          <div
            v-if="itineraryDetailModal.ev.room"
            class="flex items-start gap-2 text-sm text-hint-c"
          >
            <svg
              class="w-4 h-4 flex-shrink-0 mt-0.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            ><path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
            /><path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
            /></svg>
            <span>{{ itineraryDetailModal.ev.room }}</span>
          </div>
          <!-- 負責人 -->
          <div
            v-if="itineraryDetailModal.ev.owner"
            class="flex items-center gap-2 text-sm text-hint-c"
          >
            <svg
              class="w-4 h-4 flex-shrink-0"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            ><path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
            /></svg>
            <span>{{ itineraryDetailModal.ev.owner }}</span>
          </div>
          <!-- 詳細內容 -->
          <div
            v-if="itineraryDetailModal.ev.description"
            class="bg-surface2 dark:bg-[#1c1f26] rounded-xl p-3 text-sm text-muted-c leading-relaxed"
            style="white-space: pre-line"
          >{{ itineraryDetailModal.ev.description }}</div>
        </div>
        <!-- Footer -->
        <div class="px-5 py-4 border-t border-light-c dark:border-[#2a2e37] flex gap-2 justify-end sticky bottom-0 bg-surface dark:bg-[#15171c]">
          <button
            v-if="perm.can('management.calendar')"
            class="px-4 py-2 text-sm border border-red-200 dark:border-red-900/50 text-red-500 dark:text-red-400 rounded-xl hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
            @click="deleteItineraryFromDetail"
          >
            刪除
          </button>
          <button
            v-if="perm.can('management.calendar')"
            class="px-4 py-2 text-sm bg-teal-600 text-white rounded-xl hover:bg-teal-700 transition-colors"
            @click="editItineraryFromDetail"
          >
            編輯
          </button>
        </div>
      </div>
    </div>

    <!-- ══ Modal: 訂位／便當／豆漿／訂房 詳細（唯讀，編輯/刪除請到各自管理頁）══ -->
    <div
      v-if="orderDetailModal.show && orderDetailModal.ev"
      class="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center z-50"
      @click.self="orderDetailModal.show = false"
    >
      <div class="bg-surface dark:bg-[#15171c] rounded-t-3xl sm:rounded-2xl shadow-xl w-full sm:max-w-lg max-h-[85vh] overflow-y-auto">
        <!-- Header -->
        <div class="px-5 py-4 border-b border-light-c dark:border-[#2a2e37] flex items-center justify-between sticky top-0 bg-surface dark:bg-[#15171c] z-10">
          <div class="flex items-center gap-2">
            <span :class="['type-badge', typeColorClass(orderDetailModal.ev)]">{{ eventBadgeLabel(orderDetailModal.ev) }}</span>
            <h3 class="font-bold text-base-c text-sm">
              詳細資料
            </h3>
          </div>
          <button
            class="text-hint-c hover:text-muted-c p-1"
            @click="orderDetailModal.show = false"
          >
            <svg
              class="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            ><path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M6 18L18 6M6 6l12 12"
            /></svg>
          </button>
        </div>
        <!-- 內容 -->
        <div class="px-5 py-4 space-y-3">
          <!-- 標題 -->
          <p class="text-base font-bold text-base-c leading-snug">
            {{ orderDetailModal.ev.title }}
          </p>
          <!-- 日期 / 時間 -->
          <div class="flex items-center gap-2 text-sm text-hint-c">
            <svg
              class="w-4 h-4 flex-shrink-0"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            ><path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
            /></svg>
            <span>{{ eventTimeLabel(orderDetailModal.ev) || orderDetailModal.ev.date }}</span>
          </div>
          <!-- 房號（訂房才有） -->
          <div
            v-if="orderDetailModal.ev.room"
            class="flex items-start gap-2 text-sm text-hint-c"
          >
            <svg
              class="w-4 h-4 flex-shrink-0 mt-0.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            ><path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
            /><path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
            /></svg>
            <span>{{ orderDetailModal.ev.room }}</span>
          </div>
          <!-- 姓名 -->
          <div
            v-if="orderDetailModal.ev.owner"
            class="flex items-center gap-2 text-sm text-hint-c"
          >
            <svg
              class="w-4 h-4 flex-shrink-0"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            ><path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
            /></svg>
            <span>{{ orderDetailModal.ev.owner }}</span>
          </div>
          <!-- 電話 -->
          <div
            v-if="orderDetailModal.ev.phone"
            class="flex items-center gap-2 text-sm text-hint-c"
          >
            <svg
              class="w-4 h-4 flex-shrink-0"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            ><path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
            /></svg>
            <span>{{ orderDetailModal.ev.phone }}</span>
          </div>
          <!-- 狀態 -->
          <div
            v-if="orderDetailModal.ev.status"
            class="flex items-center gap-2 text-sm text-hint-c"
          >
            <svg
              class="w-4 h-4 flex-shrink-0"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            ><path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
            /></svg>
            <span>{{ orderDetailModal.ev.status }}</span>
          </div>
          <!-- 明細 / 備註 -->
          <div
            v-if="orderDetailModal.ev.description"
            class="bg-surface2 dark:bg-[#1c1f26] rounded-xl p-3 text-sm text-muted-c leading-relaxed"
            style="white-space: pre-line"
          >{{ orderDetailModal.ev.description }}</div>
          <p class="text-xs text-hint-c">
            這筆資料唯讀，編輯或刪除請到對應的管理頁面操作
          </p>
        </div>
        <!-- Footer -->
        <div class="px-5 py-4 border-t border-light-c dark:border-[#2a2e37] flex gap-2 justify-end sticky bottom-0 bg-surface dark:bg-[#15171c]">
          <button
            class="px-4 py-2 text-sm bg-surface2 dark:bg-[#1c1f26] text-muted-c rounded-xl hover:bg-surface2 transition-colors"
            @click="orderDetailModal.show = false"
          >
            關閉
          </button>
          <a
            v-if="ORDER_ADMIN_PATH[orderDetailModal.ev.source]"
            :href="ORDER_ADMIN_PATH[orderDetailModal.ev.source]"
            class="px-4 py-2 text-sm bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors"
          >
            前往管理
          </a>
        </div>
      </div>
    </div>

    <!-- ══ Modal: TXT 匯入 ══ -->
    <div
      v-if="showTxtModal"
      class="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center z-50"
    >
      <div class="bg-surface dark:bg-[#15171c] rounded-t-3xl sm:rounded-2xl shadow-xl w-full sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <div class="px-5 py-4 border-b border-light-c dark:border-[#2a2e37] flex items-center justify-between sticky top-0 bg-surface dark:bg-[#15171c] z-10">
          <h3 class="font-bold text-base-c">
            貼上 TXT 行事曆
          </h3>
          <button
            class="text-hint-c hover:text-muted-c p-1"
            @click="closeTxtModal"
          >
            <svg
              class="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            ><path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M6 18L18 6M6 6l12 12"
            /></svg>
          </button>
        </div>

        <div class="px-5 py-4 space-y-3">
          <div class="bg-surface2 dark:bg-[#1c1f26] border border-light-c dark:border-[#2a2e37] rounded-xl p-3">
            <p class="text-xs font-semibold text-hint-c mb-1.5">
              支援格式（原始行事曆 TXT）：
            </p>
            <pre class="text-xs text-hint-c font-mono leading-relaxed overflow-x-auto">2026年8月
8/3 08:00–12:00 4位新人報到 (高儀玟 H0A10404 四樓會議室)醫院
8/4 08:00 ～ 8/7 17:00 中餐丙級證照職訓班 (王榮貴 P0G20101 雨田大樓中餐教室)園區
備 註 :
1.(2026-08-05-08:00)多功能教室.樂功能.一對一訓練室打地舖及運動館住宿</pre>
            <p class="text-xs text-hint-c mt-1.5">
              每行開頭直接帶日期（M/D）；同一天用「–」或「-」分隔起訖時間，跨天活動用「～」分隔起訖日期時間。行尾仍需帶醫院/園區/芳心/Google 其中一個標籤才能正確解析，但匯入後活動一律歸類為「院內」。
            </p>
          </div>

          <textarea
            v-model="txtInput"
            rows="10"
            placeholder="請貼上行事曆 TXT 內容…"
            :disabled="!!txtResult"
            class="w-full p-3 text-sm font-mono border border-light-c dark:border-[#2a2e37] rounded-xl bg-surface2 dark:bg-[#1c1f26] text-base-c resize-none outline-none focus:ring-2 focus:ring-indigo-400 disabled:opacity-60"
          />

          <div
            v-if="txtResult"
            class="space-y-2"
          >
            <!-- 活動統計 + 列表 -->
            <div class="rounded-xl border border-light-c dark:border-[#2a2e37] overflow-hidden">
              <div class="px-4 py-3 bg-surface2 dark:bg-[#1c1f26] flex flex-wrap gap-4 text-sm">
                <span class="text-hint-c">活動：解析 <strong class="text-base-c">{{ txtResult.total }}</strong> 筆</span>
                <span class="text-green-600 dark:text-green-400">✓ 可新增 <strong>{{ txtResult.added.length }}</strong> 筆</span>
                <span class="text-amber-500 dark:text-amber-400">⊘ 重複跳過 <strong>{{ txtResult.skipped }}</strong> 筆</span>
              </div>
              <div
                v-if="txtResult.added.length > 0"
                class="divide-y divide-base max-h-44 overflow-y-auto"
              >
                <div
                  v-for="(ev, i) in txtResult.added"
                  :key="i"
                  class="flex items-center gap-3 px-4 py-2 text-xs"
                >
                  <span class="font-mono text-indigo-500 flex-shrink-0 tabular-nums">{{ ev.endDate && ev.endDate !== ev.date ? `${ev.date}~${ev.endDate}` : ev.date }}</span>
                  <span class="text-muted-c truncate flex-1">{{ ev.title }}</span>
                  <span class="text-hint-c flex-shrink-0 hidden sm:block">{{ ev.owner }}</span>
                  <span :class="['type-badge flex-shrink-0', typeColorClass(ev)]">{{ eventBadgeLabel(ev) }}</span>
                </div>
              </div>
              <div
                v-else
                class="px-4 py-4 text-center text-sm text-hint-c"
              >
                沒有新活動可匯入（全部都是重複）
              </div>
            </div>

            <!-- 備注預覽 -->
            <div
              v-if="txtResult.notes.length > 0"
              class="rounded-xl border border-amber-200 dark:border-amber-900/50 overflow-hidden"
            >
              <div class="px-4 py-2.5 bg-amber-50 dark:bg-amber-900/20 flex items-center gap-2 text-sm">
                <svg
                  class="w-3.5 h-3.5 text-amber-500 flex-shrink-0"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                ><path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                /></svg>
                <span class="text-amber-700 dark:text-amber-400 font-semibold">備注</span>
                <span class="text-amber-500">解析到 {{ txtResult.notes.length }} 條，將合併至當月</span>
              </div>
              <div class="divide-y divide-amber-100 dark:divide-amber-900/30 max-h-36 overflow-y-auto">
                <div
                  v-for="(n, i) in txtResult.notes"
                  :key="i"
                  class="flex items-start gap-2 px-4 py-2 text-xs text-muted-c"
                >
                  <span class="flex-shrink-0 text-amber-400 font-bold mt-0.5">{{ i + 1 }}.</span>
                  <span class="break-words">{{ n }}</span>
                </div>
              </div>
            </div>
            <div
              v-else
              class="text-xs text-hint-c px-1"
            >
              本次 TXT 未包含備注
            </div>
          </div>
        </div>

        <div class="px-5 py-4 border-t border-light-c dark:border-[#2a2e37] flex gap-2 justify-end sticky bottom-0 bg-surface dark:bg-[#15171c]">
          <button
            class="px-4 py-2 text-sm bg-surface2 dark:bg-[#1c1f26] text-muted-c rounded-xl hover:bg-surface2 transition-colors"
            @click="closeTxtModal"
          >
            取消
          </button>
          <template v-if="!txtResult">
            <button
              :disabled="!txtInput.trim()"
              class="px-4 py-2 text-sm bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-50 transition-colors"
              @click="parseTxt"
            >
              解析預覽
            </button>
          </template>
          <template v-else>
            <button
              class="px-4 py-2 text-sm border border-light-c dark:border-[#2a2e37] text-muted-c rounded-xl hover:bg-surface2 transition-colors"
              @click="txtResult = null"
            >
              重新解析
            </button>
            <button
              :disabled="(txtResult.added.length === 0 && txtResult.notes.length === 0) || saving"
              class="px-4 py-2 text-sm bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-50 transition-colors flex items-center gap-1.5"
              @click="confirmImportTxt"
            >
              <div
                v-if="saving"
                class="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"
              />
              匯入{{ txtResult.added.length > 0 ? ` ${txtResult.added.length} 筆活動` : '' }}{{ txtResult.notes.length > 0 ? ` ${txtResult.notes.length} 條備注` : '' }}
            </button>
          </template>
        </div>
      </div>
    </div>

    <!-- Toast -->
    <Transition name="fade">
      <div
        v-if="toast.show"
        class="fixed bottom-6 left-1/2 -translate-x-1/2 sm:left-auto sm:right-6 sm:translate-x-0 bg-accent-solid text-white text-sm px-4 py-3 rounded-xl shadow-lg flex items-center gap-2 z-50 whitespace-nowrap"
      >
        <svg
          class="w-4 h-4 text-green-400 flex-shrink-0"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M5 13l4 4L19 7"
          />
        </svg>
        {{ toast.message }}
      </div>
    </Transition>

    <!-- 滑鼠移上活動 chip 顯示詳細內容（跟隨游標） -->
    <Teleport to="body">
      <div
        v-if="tooltipEvent"
        class="event-tooltip"
        :style="tooltipStyle"
      >
        <div class="tooltip-title">
          {{ tooltipEvent.title }}
        </div>
        <div
          v-if="eventTimeLabel(tooltipEvent)"
          class="tooltip-row"
        >
          🕐 {{ eventTimeLabel(tooltipEvent) }}
        </div>
        <div
          v-if="tooltipEvent.room"
          class="tooltip-row"
        >
          📍 {{ tooltipEvent.room }}
        </div>
        <div
          v-if="tooltipEvent.owner"
          class="tooltip-row"
        >
          👤 {{ tooltipEvent.owner }}
        </div>
        <div
          v-if="tooltipEvent.description"
          class="tooltip-row"
          style="white-space: pre-line"
        >
          📝 {{ stripHtml(tooltipEvent.description).length > 80 ? stripHtml(tooltipEvent.description).slice(0, 80) + '…' : stripHtml(tooltipEvent.description) }}
        </div>
        <div
          v-if="tooltipEvent.source === 'google'"
          class="tooltip-hint"
        >
          🔗 點擊查看 Google 詳細資訊
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup>
  definePageMeta({ layout: 'staff', requiredPermission: 'management.calendar' })
  const perm = usePermission()

  const commonStore = useCommonStore()
  const BASE = computed(() => commonStore.data.main_url + '/holy/calendar')
  // 「行程」功能：跟院內行事曆結構類似，但資料完全獨立、互不相干（獨立 API + 獨立 YML）
  const BASE_ITINERARY = computed(() => commonStore.data.main_url + '/holy/itinerary')
  // 訂位／便當／豆漿／訂房：純顯示用（唯讀），實際新增/編輯/刪除都在各自的管理頁面進行
  const BASE_BOOKING = computed(() => commonStore.data.main_url + '/holy/booking')
  const BASE_LUNCH = computed(() => commonStore.data.main_url + '/holy/lunch')
  const BASE_SOYBEAN = computed(() => commonStore.data.main_url + '/holy/soybean')
  const BASE_ROOMS = computed(() => commonStore.data.main_url + '/holy/rooms/bookings')

  const TYPES = ['醫院', '園區', '芳心'] // 建築分類：本地院內活動底下的細分類別（新增/編輯表單、院內篩選底下的建築分類子篩選都用這組值）
  const weekdays = ['日', '一', '二', '三', '四', '五', '六']

  // ── Google Calendar 設定 ──────────────────────────────────────────
  const GOOGLE_CALENDAR_ID = 'healthfarmpr@st-mary.org.tw'
  const GOOGLE_API_KEY = 'AIzaSyDJ3AtXgPyYbHWZsHVLWNm9Hkr1gVa2l_k'

  const googleEvents = ref([])
  const googleLoading = ref(false)
  const itineraryEvents = ref([]) // 「行程」資料（獨立來源，跟院內活動互不相干）
  // 訂位／便當／豆漿／訂房：唯讀顯示用，正規化成跟 CalendarEvent 一樣的 {id,date,endDate,time,title,owner,room,source} 形狀
  const bookingEvents = ref([])
  const lunchEvents = ref([])
  const soybeanEvents = ref([])
  const roomOrderEvents = ref([])

  // ── 顏色工具 ─────────────────────────────────────────────────────
  // 「類型」只分院內／Google 兩種，但顏色沿用以前的建築分類配色：
  // 院內活動依 building（醫院/園區/芳心）決定顏色，Google 固定藍色，
  // 院內活動沒有 building 時（少數舊資料）退回琥珀色
  // 徽章文字：本地活動有建築分類時直接顯示建築名稱（顏色也是那個建築的顏色），沒有才顯示「院內」
  function eventBadgeLabel(ev) {
    if (ev.source === 'google') return 'Google'
    if (ev.source === 'itinerary') return '行程'
    if (SOURCE_TYPE_LABEL[ev.source]) return SOURCE_TYPE_LABEL[ev.source]
    return eventBuilding(ev) || '院內'
  }

  // 活動的建築分類：優先用 building 欄位，舊資料 type 若剛好是建築分類值就當備援
  function eventBuilding(ev) {
    return ev.building || (TYPES.includes(ev.type) ? ev.type : '')
  }

  function typeColorClass(ev) {
    if (ev.source === 'google') return 'google'
    if (ev.source === 'itinerary') return 'itinerary'
    if (['booking', 'lunch', 'soybean', 'roomorder'].includes(ev.source)) return ev.source
    return { 醫院: 'hospital', 園區: 'park', 芳心: 'fragrant' }[eventBuilding(ev)] || 'onsite'
  }

  function typeChipClass(ev) {
    if (ev.source === 'google') return 'chip-google'
    if (ev.source === 'itinerary') return 'chip-itinerary'
    if (['booking', 'lunch', 'soybean', 'roomorder'].includes(ev.source)) return `chip-${ev.source}`
    return { 醫院: 'chip-hospital', 園區: 'chip-park', 芳心: 'chip-fragrant' }[eventBuilding(ev)] || 'chip-onsite'
  }

  function chipClass(ev) {
    return typeChipClass(ev)
  }

  // 跨多天顯示為連續色條的活動：每筆活動（不論系統或 Google）都直接帶 date（起）/ endDate（迄），
  // 不再需要用「內容是否相同 + 日期是否連續」去猜，也不會有斷天或重複的問題
  function isBannerEvent(ev) {
    return !!(ev.endDate && ev.endDate !== ev.date)
  }

  // 跨天活動的分組鍵：每筆活動本身就是唯一一筆資料（不再逐日展開），直接用 id 分組即可
  function bannerGroupKey(ev) {
    return ev.id
  }

  // 活動的日期範圍是否與某天有交集（含頭尾）
  function eventCoversDate(ev, dateStr) {
    const end = ev.endDate || ev.date
    return dateStr >= ev.date && dateStr <= end
  }

  // 活動的日期範圍是否與某個月份（yearMonth，例如 "2026-08"）有交集
  function eventOverlapsMonth(ev, ym) {
    const end = ev.endDate || ev.date
    const monthStart = `${ym}-01`
    const monthEnd = `${ym}-31` // 字串比較用，31 一定 >= 該月最後一天
    return ev.date <= monthEnd && end >= monthStart
  }

  // 活動時間顯示文字：同一天顯示「起-迄」，跨天顯示「起始日 起時 ～ 結束日 迄時」
  function eventTimeLabel(ev) {
    if (!ev.date) return ''
    if (isBannerEvent(ev)) {
      const startPart = ev.time ? `${ev.date} ${ev.time}` : ev.date
      const endPart = ev.endTime ? `${ev.endDate} ${ev.endTime}` : ev.endDate
      return `${startPart} ～ ${endPart}`
    }
    if (ev.time && ev.endTime) return `${ev.time}-${ev.endTime}`
    return ev.time || ev.endTime || ''
  }

  // ── 跟隨游標的活動提示框 ─────────────────────────────────────────
  const tooltipEvent = ref(null)
  const tooltipPos = reactive({ x: 0, y: 0 })
  const TOOLTIP_OFFSET = 18
  const TOOLTIP_WIDTH = 280
  const TOOLTIP_MAX_HEIGHT = 300

  const tooltipStyle = computed(() => {
    if (!import.meta.client) return {}
    let left = tooltipPos.x + TOOLTIP_OFFSET
    let top = tooltipPos.y + TOOLTIP_OFFSET

    // 靠右邊界時翻到游標左側
    if (left + TOOLTIP_WIDTH > window.innerWidth - 8) {
      left = tooltipPos.x - TOOLTIP_WIDTH - TOOLTIP_OFFSET
    }
    // 靠下邊界時翻到游標上方
    if (top + TOOLTIP_MAX_HEIGHT > window.innerHeight - 8) {
      top = tooltipPos.y - TOOLTIP_MAX_HEIGHT - TOOLTIP_OFFSET
    }
    if (left < 8) left = 8
    if (top < 8) top = 8

    return { left: `${left}px`, top: `${top}px` }
  })

  function showTooltip(ev, e) {
    tooltipEvent.value = ev
    tooltipPos.x = e.clientX
    tooltipPos.y = e.clientY
  }

  function moveTooltip(e) {
    tooltipPos.x = e.clientX
    tooltipPos.y = e.clientY
  }

  function hideTooltip() {
    tooltipEvent.value = null
  }

  function stripHtml(html) {
    if (!html) return ''
    return html.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').trim()
  }

  function typeBarClass(ev) {
    if (ev.source === 'google') return 'bg-blue-500'
    if (ev.source === 'itinerary') return 'bg-teal-500'
    if (ev.source === 'booking') return 'bg-pink-500'
    if (ev.source === 'lunch') return 'bg-orange-500'
    if (ev.source === 'soybean') return 'bg-lime-600'
    if (ev.source === 'roomorder') return 'bg-violet-600'
    return { 醫院: 'bg-red-400', 園區: 'bg-emerald-500', 芳心: 'bg-purple-400' }[eventBuilding(ev)] || 'bg-amber-500'
  }

  // ── 月份狀態 ──────────────────────────────────────────────────────
  const today = new Date()
  const currentYear = ref(today.getFullYear())
  const currentMonth = ref(today.getMonth() + 1) // 1-based

  // ── 上方資訊區收合狀態 ────────────────────────────────────────────
  const panelExpanded = ref(true)

  // ── 篩選狀態：類型改成複選 checkbox（每個圖例項目都能各自勾選/取消）─────
  // 十個「葉節點」分類：院內原本的醫院/園區/芳心/未分類拆開各自可勾，其餘來源各自一個
  // 院內底下的 4 個子分類會顯示成一個「院內」大項＋縮排子項，用一個父層 checkbox 統一勾/取消全部子項
  const LOCAL_SUB_ITEMS = [
    { key: '醫院', label: '醫院', dot: 'bg-red-400' },
    { key: '園區', label: '園區', dot: 'bg-emerald-500' },
    { key: '芳心', label: '芳心', dot: 'bg-purple-400' },
    { key: '院內未分類', label: '院內（未分類）', dot: 'bg-amber-500' }
  ]
  const OTHER_LEGEND_ITEMS = [
    { key: '行程', label: '行程', dot: 'bg-teal-500' },
    { key: 'Google', label: 'Google', dot: 'bg-blue-500' },
    { key: '訂位', label: '訂位', dot: 'bg-pink-500' },
    { key: '便當', label: '便當', dot: 'bg-orange-500' },
    { key: '豆漿', label: '豆漿', dot: 'bg-lime-600' },
    { key: '訂房', label: '訂房', dot: 'bg-violet-600' }
  ]
  const LEGEND_ITEMS = [...LOCAL_SUB_ITEMS, ...OTHER_LEGEND_ITEMS] // 給還需要「全部十項」的地方用（全選/全取消/總計）
  const activeCategories = reactive(Object.fromEntries(LEGEND_ITEMS.map(i => [i.key, true])))
  const filterLocation = ref('') // 空字串 = 全部地點

  // 判斷一筆事件屬於哪個「葉節點」分類
  function eventLeafCategory(e) {
    if (e.source === 'itinerary') return '行程'
    if (e.source === 'google') return 'Google'
    if (SOURCE_TYPE_LABEL[e.source]) return SOURCE_TYPE_LABEL[e.source]
    return eventBuilding(e) || '院內未分類'
  }

  // 這筆事件目前是否應該顯示（依 activeCategories 勾選狀態）
  function isCategoryActive(e) {
    return activeCategories[eventLeafCategory(e)] !== false
  }

  function toggleCategory(key) {
    activeCategories[key] = !activeCategories[key]
  }

  function selectAllCategories() {
    LEGEND_ITEMS.forEach(i => { activeCategories[i.key] = true })
  }

  function clearAllCategories() {
    LEGEND_ITEMS.forEach(i => { activeCategories[i.key] = false })
  }

  const allCategoriesActive = computed(() => LEGEND_ITEMS.every(i => activeCategories[i.key]))

  // 「院內」父層 checkbox：全部子分類都勾 → 打勾；都沒勾 → 空；部分勾 → 半勾（indeterminate）
  const localActiveCount = computed(() => LOCAL_SUB_ITEMS.filter(i => activeCategories[i.key]).length)
  const localAllActive = computed(() => localActiveCount.value === LOCAL_SUB_ITEMS.length)
  const localSomeActive = computed(() => localActiveCount.value > 0 && !localAllActive.value)
  const localTotalCount = computed(() => LOCAL_SUB_ITEMS.reduce((sum, i) => sum + (leafTypeCount.value[i.key] || 0), 0))

  function toggleLocalGroup() {
    const turnOn = !localAllActive.value
    LOCAL_SUB_ITEMS.forEach(i => { activeCategories[i.key] = turnOn })
  }

  // ── 月份 / 類型 / 地點 / 收合 狀態持久化（記住使用者上次的選擇）───
  // 注意：這段刻意不放在 setup 最上層直接執行——放在最上層的話，SSR 出來的畫面跟
  // client 讀到 localStorage 後的狀態會兜不起來（hydration mismatch），畫面會先閃一下
  // SSR 版本再被套用 client 版本蓋掉。改成在 onMounted（一定是 client、且在 hydrate 完成後）才套用，
  // 避免重新整理時「先出現一下又不見」的閃爍。
  const CALENDAR_STATE_KEY = 'calendar_filter_state'
  function restoreCalendarState() {
    try {
      const saved = JSON.parse(localStorage.getItem(CALENDAR_STATE_KEY) || 'null')
      if (saved) {
        if (saved.year) currentYear.value = saved.year
        if (saved.month) currentMonth.value = saved.month
        if (saved.categories) Object.assign(activeCategories, saved.categories) // 舊存檔沒有的分類維持預設 true
        if (saved.location !== undefined) filterLocation.value = saved.location
        if (saved.expanded !== undefined) panelExpanded.value = saved.expanded
      }
    } catch {}
  }

  watch([currentYear, currentMonth, activeCategories, filterLocation, panelExpanded], () => {
    if (import.meta.client) {
      localStorage.setItem(CALENDAR_STATE_KEY, JSON.stringify({
        year: currentYear.value,
        month: currentMonth.value,
        categories: { ...activeCategories },
        location: filterLocation.value,
        expanded: panelExpanded.value
      }))
    }
  }, { deep: true })

  // room 欄位去掉場地代碼前綴："P0I10201 水電實習廠" → "水電實習廠"
  function extractLocation(room) {
    if (!room || !room.trim()) return ''
    return room.trim().replace(/^[A-Z0-9]+\s*/, '').trim() || room.trim()
  }

  // 每個資料來源對應的篩選類型標籤（跟篩選下拉的 option value 一致）
  const SOURCE_TYPE_LABEL = {
    google: 'Google', itinerary: '行程',
    booking: '訂位', lunch: '便當', soybean: '豆漿', roomorder: '訂房'
  }

  // 依目前勾選的分類動態產生可選地點（去重、排序）
  const availableLocations = computed(() => {
    const ym = `${currentYear.value}-${String(currentMonth.value).padStart(2, '0')}`
    const base = allEvents.value.filter(e => eventOverlapsMonth(e, ym) && isCategoryActive(e))
    return [...new Set(base.map(e => extractLocation(e.room)).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'zh-Hant'))
  })

  // 院內活動中，各建築分類的當月筆數
  const buildingCount = computed(() => {
    const ym = `${currentYear.value}-${String(currentMonth.value).padStart(2, '0')}`
    const counts = {}
    events.value
      .filter(e => eventOverlapsMonth(e, ym))
      .forEach((e) => {
        const b = eventBuilding(e) || '未分類'
        counts[b] = (counts[b] || 0) + 1
      })
    return counts
  })

  function prevMonth() {
    if (currentMonth.value === 1) {
      currentMonth.value = 12
      currentYear.value--
    } else currentMonth.value--
  }

  function nextMonth() {
    if (currentMonth.value === 12) {
      currentMonth.value = 1
      currentYear.value++
    } else currentMonth.value++
  }

  function goToday() {
    currentYear.value = today.getFullYear()
    currentMonth.value = today.getMonth() + 1
  }

  // ── 月曆格子計算 ─────────────────────────────────────────────────
  const calendarCells = computed(() => {
    const year = currentYear.value
    const month = currentMonth.value
    const firstWeekday = new Date(year, month - 1, 1).getDay() // 0=Sun
    const daysInMonth = new Date(year, month, 0).getDate()

    const cells = []

    // 填充前空格
    for (let i = 0; i < firstWeekday; i++) {
      cells.push({ day: null, dateStr: null, events: [], isToday: false, isWeekend: false, weekdayIdx: i })
    }

    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`
      const weekdayIdx = (firstWeekday + d - 1) % 7
      const isToday = d === today.getDate() && month === today.getMonth() + 1 && year === today.getFullYear()
      const isWeekend = weekdayIdx === 0 || weekdayIdx === 6
      const dayEvents = eventsOnDate(dateStr)
      const chipEvents = dayEvents.filter(e => !isBannerEvent(e))
      cells.push({ day: d, dateStr, events: dayEvents, chipEvents, isToday, isWeekend, weekdayIdx })
    }

    return cells
  })

  // 依週切分 calendarCells，方便跨天活動渲染成連續色條（橫跨整週的 overlay）
  const calendarWeeks = computed(() => {
    const cells = calendarCells.value
    const weeks = []
    for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7))
    return weeks
  })

  // 每週跨天活動的色條資料：依活動 id 分組、
  // 計算橫跨欄位與是否為活動實際起訖日（決定圓角端）
  // 並用簡單貪婪法分配 lane（垂直層），避免同週重疊的跨天活動互相覆蓋
  // 色條堆疊高度：手機版 .week-banner-bar 變矮（15px+1px margin），需跟著縮小，
  // 避免下方一般活動 chip 跟色條之間留下多餘空隙
  const isMobileViewport = ref(false)
  let mobileMql = null

  function updateMobileViewport(e) {
    isMobileViewport.value = e.matches
  }

  const BANNER_ROW_HEIGHT = computed(() => isMobileViewport.value ? 16 : 20)

  const weekBanners = computed(() => {
    return calendarWeeks.value.map((week) => {
      const map = new Map()
      week.forEach((cell, col) => {
        if (!cell.day) return
        cell.events.forEach((ev) => {
          if (!isBannerEvent(ev)) return
          const key = bannerGroupKey(ev)
          if (!map.has(key)) {
            map.set(key, { ev, startCol: col, endCol: col })
          } else {
            map.get(key).endCol = col
          }
        })
      })
      const banners = [...map.values()].map(b => ({
        key: `${bannerGroupKey(b.ev)}_${week[b.startCol].dateStr}`,
        ev: b.ev,
        startCol: b.startCol,
        endCol: b.endCol,
        roundLeft: week[b.startCol].dateStr === b.ev.date,
        roundRight: week[b.endCol].dateStr === (b.ev.endDate || b.ev.date),
        lane: 0
      }))
      banners.sort((a, b) => a.startCol - b.startCol)
      const laneEnds = []
      banners.forEach((b) => {
        let lane = 0
        while (laneEnds[lane] !== undefined && laneEnds[lane] >= b.startCol) lane++
        b.lane = lane
        laneEnds[lane] = b.endCol
      })
      return banners
    })
  })

  // 每週需要保留的色條層數（讓下方的一般活動 chip 往下讓出空間，避免被色條蓋住）
  const weekBannerLanes = computed(() =>
    weekBanners.value.map(list => list.reduce((max, b) => Math.max(max, b.lane + 1), 0))
  )

  const monthEventCount = computed(() => {
    const ym = `${currentYear.value}-${String(currentMonth.value).padStart(2, '0')}`
    return allEvents.value.filter((e) => {
      if (!eventOverlapsMonth(e, ym)) return false
      if (!isCategoryActive(e)) return false
      if (filterLocation.value && extractLocation(e.room) !== filterLocation.value) return false
      return true
    }).length
  })

  // 各葉節點分類的當月筆數（給圖例 checkbox 旁邊的數字用）
  const leafTypeCount = computed(() => {
    const ym = `${currentYear.value}-${String(currentMonth.value).padStart(2, '0')}`
    const overlap = list => list.filter(e => eventOverlapsMonth(e, ym)).length
    return {
      醫院: buildingCount.value['醫院'] || 0,
      園區: buildingCount.value['園區'] || 0,
      芳心: buildingCount.value['芳心'] || 0,
      院內未分類: buildingCount.value['未分類'] || 0,
      行程: overlap(itineraryEvents.value),
      Google: overlap(googleEvents.value),
      訂位: overlap(bookingEvents.value),
      便當: overlap(lunchEvents.value),
      豆漿: overlap(soybeanEvents.value),
      訂房: overlap(roomOrderEvents.value)
    }
  })

  // 某天有哪些活動：直接用 date/endDate 範圍判斷是否涵蓋該日，
  // 不需要逐日展開資料，也不需要用內容比對去猜測是不是同一個跨天活動
  function eventsOnDate(dateStr) {
    return allEvents.value
      .filter((e) => {
        if (!eventCoversDate(e, dateStr)) return false
        if (!isCategoryActive(e)) return false
        if (filterLocation.value && extractLocation(e.room) !== filterLocation.value) return false
        return true
      })
      .sort((a, b) => (a.time || '').localeCompare(b.time || ''))
  }

  // ── 主資料狀態 ────────────────────────────────────────────────────
  const events = ref([])
  const loading = ref(false)
  const saving = ref(false)
  const toast = reactive({ show: false, message: '' })

  // 系統活動 + 行程 + Google 活動合併（都是「一筆活動一筆資料」，用 date/endDate 表示範圍）
  const allEvents = computed(() => [
    ...events.value, ...itineraryEvents.value, ...googleEvents.value,
    ...bookingEvents.value, ...lunchEvents.value, ...soybeanEvents.value, ...roomOrderEvents.value
  ])

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

  // 「行程」資料：獨立 API + 獨立資料表，跟院內活動互不相干（結構相同，一次抓全部月份）
  // 後端回傳的 JSON 沒有 source 欄位，前端要自己補上 'itinerary' 才能跟院內/Google 活動分辨
  async function fetchItineraryEvents() {
    try {
      const res = await fetch(`${BASE_ITINERARY.value}/list`)
      const list = res.ok ? await res.json() : []
      itineraryEvents.value = list.map(ev => ({ ...ev, source: 'itinerary' }))
    } catch (e) {
      console.error(e)
      showToast('行程載入失敗')
    }
  }

  // ── 訂位／便當／豆漿／訂房：唯讀顯示，正規化成通用的月曆事件格式 ──────────
  // 這四個系統本身都有自己完整的管理頁面（訂單/新增/編輯/刪除都在那邊做），
  // 這裡只負責「讀」出來顯示在月曆上，點了只能看詳細資料，不能編輯。

  function summarizeMeal(o) {
    const parts = []
    if (o.meatQty) parts.push(`肉${o.meatQty}`)
    if (o.fullVegQty) parts.push(`全素${o.fullVegQty}`)
    if (o.eggVegQty) parts.push(`蛋奶素${o.eggVegQty}`)
    if (o.spiceVegQty) parts.push(`五辛素${o.spiceVegQty}`)
    return parts.join('・')
  }
  function mealTotal(o) {
    return (o.meatQty || 0) + (o.fullVegQty || 0) + (o.eggVegQty || 0) + (o.spiceVegQty || 0)
  }

  // 訂位（RestaurantOrderController /holy/booking）：單日，用 /dates 取當月有訂位的日期，逐日 /get 撈明細
  async function fetchBookingEvents() {
    try {
      const dRes = await fetch(`${BASE_BOOKING.value}/dates/${currentYearMonth.value}`)
      const dates = dRes.ok ? await dRes.json() : []
      const lists = await Promise.all(dates.map(async (date) => {
        const res = await fetch(`${BASE_BOOKING.value}/get/${date}`)
        return res.ok ? await res.json() : []
      }))
      bookingEvents.value = lists.flat().map(o => ({
        id: `booking_${o.id}`,
        date: o.date,
        endDate: o.date,
        time: o.time || '',
        title: `${o.name}／訂位${mealTotal(o)}位`,
        owner: o.name,
        room: '',
        description: [summarizeMeal(o), o.note].filter(Boolean).join('\n'),
        status: o.status,
        phone: o.phone,
        source: 'booking'
      }))
    } catch (e) {
      console.error(e)
    }
  }

  // 便當（BentoOrderController /holy/lunch）：單日，用 /dates 取當月有訂單的日期，逐日 /get 撈明細
  async function fetchLunchEvents() {
    try {
      const dRes = await fetch(`${BASE_LUNCH.value}/dates/${currentYearMonth.value}`)
      const dates = dRes.ok ? await dRes.json() : []
      const lists = await Promise.all(dates.map(async (date) => {
        const res = await fetch(`${BASE_LUNCH.value}/get/${date}`)
        return res.ok ? await res.json() : []
      }))
      lunchEvents.value = lists.flat().map(o => ({
        id: `lunch_${o.id}`,
        date: o.date,
        endDate: o.date,
        time: o.time || '',
        title: `${o.name}／便當${mealTotal(o)}份`,
        owner: o.name,
        room: '',
        description: [summarizeMeal(o), o.note].filter(Boolean).join('\n'),
        status: o.status,
        phone: o.phone,
        source: 'lunch'
      }))
    } catch (e) {
      console.error(e)
    }
  }

  // 豆漿/豆腐（SoybeanController /holy/soybean）：/admin/list?month= 直接回傳整月訂單
  async function fetchSoybeanEvents() {
    try {
      const res = await fetch(`${BASE_SOYBEAN.value}/admin/list?month=${currentYearMonth.value}`)
      const data = res.ok ? await res.json() : { orders: [] }
      soybeanEvents.value = (data.orders || [])
        .filter(o => o.pickupDate)
        .map(o => ({
          id: `soybean_${o.id}`,
          date: o.pickupDate,
          endDate: o.pickupDate,
          time: '',
          title: `${o.name}／豆漿${o.soymilkQty || 0}‧豆腐${o.tofuQty || 0}`,
          owner: o.name,
          room: '',
          description: [o.remark].filter(Boolean).join('\n'),
          status: o.status,
          phone: o.contact,
          source: 'soybean'
        }))
    } catch (e) {
      console.error(e)
    }
  }

  // 訂房（RoomOrdersController /holy/rooms/bookings）：/list 一次回傳全部訂單（不分月），跟院內/行程一樣只在掛載時抓一次
  async function fetchRoomOrderEvents() {
    try {
      const res = await fetch(`${BASE_ROOMS.value}/list`)
      const raw = res.ok ? await res.json() : []
      roomOrderEvents.value = groupRoomOrders(raw.filter(o => o.checkIn))
    } catch (e) {
      console.error(e)
    }
  }

  // 團體訂房（有 groupId）合併成一筆顯示「團名（N 間）」，日期取整團最早入住～最晚退房；
  // 沒有 groupId 的個人訂房照舊逐筆列出。比照 home.vue 房務清單的合併寫法（用 groupId 分組、
  // 只留一筆代表整團，其餘成員資料收進 members 供詳細面板使用）
  function groupRoomOrders(list) {
    const groupMembers = new Map() // groupId -> [booking, ...]
    const solo = []
    for (const o of list) {
      if (o.groupId) {
        if (!groupMembers.has(o.groupId)) groupMembers.set(o.groupId, [])
        groupMembers.get(o.groupId).push(o)
      } else {
        solo.push(o)
      }
    }

    const events = solo.map(o => ({
      id: `room_${o.id}`,
      date: o.checkIn,
      endDate: o.checkOut || o.checkIn,
      time: '',
      title: `${o.name}／${o.guests}人${o.roomId ? '（' + o.roomId + '）' : ''}`,
      owner: o.name,
      room: o.roomId || '',
      description: [o.notes].filter(Boolean).join('\n'),
      status: o.status,
      phone: o.phone,
      source: 'roomorder'
    }))

    for (const [groupId, members] of groupMembers) {
      const minCheckIn = members.map(m => m.checkIn).sort()[0]
      const maxCheckOut = members.map(m => m.checkOut || m.checkIn).sort().slice(-1)[0]
      const sameRange = members.every(m => m.checkIn === minCheckIn) && members.every(m => (m.checkOut || m.checkIn) === maxCheckOut)
      const totalGuests = members.reduce((sum, m) => sum + (m.guests || 0), 0)
      const rooms = members.map(m => m.roomId).filter(Boolean)
      const statusCounts = {}
      members.forEach(m => { statusCounts[m.status] = (statusCounts[m.status] || 0) + 1 })
      const groupName = members[0].groupName || members[0].name
      events.push({
        id: `room_group_${groupId}`,
        date: minCheckIn,
        endDate: maxCheckOut,
        time: '',
        title: `${groupName}（${members.length} 間）`,
        owner: groupName,
        room: rooms.join('、'),
        description: [
          !sameRange ? '（各房入住/退房日期不同）' : '',
          ...members.map(m => `${m.roomId || '未指派'}／${m.guests}人／${m.status}`)
        ].filter(Boolean).join('\n'),
        status: Object.entries(statusCounts).map(([s, c]) => `${s} ${c}`).join('・'),
        phone: members[0].phone,
        isGroup: true,
        guests: totalGuests,
        members,
        source: 'roomorder'
      })
    }

    return events
  }

  // ── Google Calendar API ───────────────────────────────────────────
  async function fetchGoogleEvents() {
    if (!GOOGLE_CALENDAR_ID || GOOGLE_CALENDAR_ID.includes('your-calendar')) return
    googleLoading.value = true
    googleEvents.value = []
    try {
      const year = currentYear.value
      const month = currentMonth.value
      const timeMin = encodeURIComponent(new Date(year, month - 1, 1).toISOString())
      const timeMax = encodeURIComponent(new Date(year, month, 0, 23, 59, 59).toISOString())
      const url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(GOOGLE_CALENDAR_ID)}/events`
        + `?key=${GOOGLE_API_KEY}`
        + `&timeMin=${timeMin}&timeMax=${timeMax}`
        + `&singleEvents=true&orderBy=startTime&maxResults=250`
      const res = await fetch(url)
      const data = res.ok ? await res.json() : {}
      const result = []
      for (const item of data.items || []) {
        const isAllDay = !!item.start?.date
        const startRaw = isAllDay ? item.start.date : item.start?.dateTime
        const endRaw = isAllDay ? item.end?.date : item.end?.dateTime
        if (!startRaw) continue

        const base = {
          id: `google_${item.id}`,
          googleEventId: item.id,
          title: item.summary || '（無標題）',
          owner: item.organizer?.displayName || '',
          room: item.location || '',
          type: 'Google',
          source: 'google',
          googleLink: item.htmlLink || '',
          description: item.description || ''
        }

        const fmt = d => `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`

        if (!isAllDay) {
          // 有時間的活動：直接取 Google 給的起訖日期/時間，不逐日展開
          const s = new Date(startRaw)
          const e = endRaw ? new Date(endRaw) : null
          result.push({
            ...base,
            date: startRaw.slice(0, 10),
            endDate: e ? endRaw.slice(0, 10) : startRaw.slice(0, 10),
            time: fmt(s),
            endTime: e ? fmt(e) : ''
          })
          continue
        }

        // 全天活動：Google 的 end.date 是「不含」的下一天，換算成實際結束日（含）
        const endDate = endRaw ? new Date(`${endRaw}T00:00:00`) : new Date(`${startRaw}T00:00:00`)
        endDate.setDate(endDate.getDate() - 1)
        const endDateStr = `${endDate.getFullYear()}-${String(endDate.getMonth() + 1).padStart(2, '0')}-${String(endDate.getDate()).padStart(2, '0')}`
        result.push({
          ...base,
          date: startRaw,
          endDate: endDateStr,
          time: '',
          endTime: ''
        })
      }
      googleEvents.value = result
    } catch (e) {
      console.warn('Google 日曆載入失敗', e)
    } finally {
      googleLoading.value = false
    }
  }

  // ── 日面板（點 +N 展開當日所有活動）──────────────────────────────
  const dayPanel = reactive({ show: false, dateStr: '', events: [] })

  function openDayPanel(cell) {
    dayPanel.dateStr = cell.dateStr
    dayPanel.events = cell.events
    dayPanel.show = true
  }

  // ── 新增 / 編輯 Modal ─────────────────────────────────────────────
  // source: 'local' = 院內活動, 'itinerary' = 行程（獨立資料，跟院內互不相干）
  const formModal = reactive({ show: false, isNew: true, id: null, source: 'local' })
  const form = reactive({ date: '', time: '', endDate: '', endTime: '', title: '', owner: '', room: '', building: '醫院', description: '' })
  const formError = ref('')

  // 從日曆格子點 + 新增，自動帶入日期；source 預設為院內活動，行程新增會另外傳 'itinerary'
  function openAddOnDate(dateStr, source = 'local') {
    formModal.isNew = true
    formModal.id = null
    formModal.source = source
    Object.assign(form, {
      date: dateStr || '',
      time: '', endDate: '', endTime: '', title: '', owner: '', room: '', building: '醫院', description: ''
    })
    formError.value = ''
    formModal.show = true
  }

  // ── Google 活動詳細 Modal ──────────────────────────────────────────
  const googleDetailModal = reactive({ show: false, ev: null })

  function openGoogleDetail(ev) {
    googleDetailModal.ev = ev
    googleDetailModal.show = true
  }

  // ── 行程詳細 Modal（點行程先看資料，裡面才有編輯／刪除）──────────────────
  const itineraryDetailModal = reactive({ show: false, ev: null })

  // 訂位／便當／豆漿／訂房：唯讀來源，點了只開詳細資料 Modal（不能編輯/刪除）
  const ORDER_SOURCES = ['booking', 'lunch', 'soybean', 'roomorder']
  function isDetailClickable(ev) {
    return ev.source === 'itinerary' || ORDER_SOURCES.includes(ev.source)
  }
  function openEventDetail(ev) {
    if (ev.source === 'itinerary') openItineraryDetail(ev)
    else if (ORDER_SOURCES.includes(ev.source)) openOrderDetail(ev)
  }

  function openItineraryDetail(ev) {
    itineraryDetailModal.ev = ev
    itineraryDetailModal.show = true
  }

  function editItineraryFromDetail() {
    const ev = itineraryDetailModal.ev
    itineraryDetailModal.show = false
    openEdit(ev)
  }

  async function deleteItineraryFromDetail() {
    const ev = itineraryDetailModal.ev
    const ok = await deleteEvent(ev)
    if (ok) itineraryDetailModal.show = false
  }

  // ── 訂位／便當／豆漿／訂房 詳細 Modal（唯讀，編輯/刪除請到各自管理頁）──────
  // 假設沿用 Nuxt 檔案路由（xxx-orders.vue → /xxx-orders），如實際路由不同請自行調整
  const ORDER_ADMIN_PATH = {
    booking: '/booking-orders',
    lunch: '/lunch-orders',
    soybean: '/soybean-orders',
    roomorder: '/rooms-orders'
  }
  const orderDetailModal = reactive({ show: false, ev: null })

  function openOrderDetail(ev) {
    orderDetailModal.ev = ev
    orderDetailModal.show = true
  }

  function openEdit(ev) {
    // Google 活動顯示詳細面板，不直接跳轉
    if (ev.source === 'google') {
      openGoogleDetail(ev)
      return
    }
    // 訂位／便當／豆漿／訂房是唯讀資料，沒有編輯表單可用，一律導去詳細面板
    if (ORDER_SOURCES.includes(ev.source)) {
      openOrderDetail(ev)
      return
    }
    formModal.isNew = false
    formModal.id = ev.id
    formModal.source = ev.source === 'itinerary' ? 'itinerary' : 'local'
    Object.assign(form, {
      date: ev.date, time: ev.time || '',
      endDate: ev.endDate && ev.endDate !== ev.date ? ev.endDate : '', endTime: ev.endTime || '',
      title: ev.title, owner: ev.owner, room: ev.room, building: eventBuilding(ev) || '醫院',
      description: ev.description || ''
    })
    formError.value = ''
    formModal.show = true
  }

  // 一筆活動＝一次 API 呼叫（不論單日或跨天），後端直接存 date/endDate，
  // 前端不用再逐日展開、也不用事後用內容比對去猜是不是同一個跨天活動
  // source === 'local' 存到院內行事曆；source === 'itinerary' 存到獨立的行程資料，兩邊互不相干
  async function saveForm() {
    if (!form.date || !form.title.trim()) {
      formError.value = '日期和標題為必填'
      return
    }
    if (form.endDate && form.endDate < form.date) {
      formError.value = '結束日期不能早於起始日期'
      return
    }
    saving.value = true
    formError.value = ''
    const isItinerary = formModal.source === 'itinerary'
    try {
      const payload = {
        id: formModal.isNew ? null : formModal.id,
        date: form.date,
        endDate: form.endDate || form.date,
        time: form.time,
        endTime: form.endTime,
        title: form.title,
        owner: form.owner,
        room: form.room,
        type: isItinerary ? '行程' : '院內',
        building: isItinerary ? '' : form.building
      }
      if (isItinerary) payload.description = form.description
      const res = await fetch(`${(isItinerary ? BASE_ITINERARY : BASE).value}/save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      if (!res.ok) throw new Error('儲存失敗')
      const saved = await res.json()
      if (isItinerary) saved.source = 'itinerary'
      const list = isItinerary ? itineraryEvents : events
      if (formModal.isNew) {
        list.value.push(saved)
        showToast(isItinerary ? '行程已新增' : '活動已新增')
      } else {
        const idx = list.value.findIndex(e => e.id === formModal.id)
        if (idx !== -1) list.value[idx] = saved
        // 同步更新側板
        if (dayPanel.show && eventCoversDate(saved, dayPanel.dateStr)) {
          dayPanel.events = eventsOnDate(dayPanel.dateStr)
        }
        showToast(isItinerary ? '行程已更新' : '活動已更新')
      }
      formModal.show = false
    } catch (e) {
      formError.value = e.message
    } finally {
      saving.value = false
    }
  }

  // DELETE /holy/calendar/{id}?date=YYYY-MM-DD 或 /holy/itinerary/{id}?date=YYYY-MM-DD（依 source 而定）
  // 一筆活動只有一個 id，跨天活動會整筆一起刪除
  async function deleteEvent(ev) {
    // 訂位／便當／豆漿／訂房是唯讀資料，這裡沒有對應的刪除端點，一律擋掉
    if (ORDER_SOURCES.includes(ev.source)) {
      showToast('這筆資料請到對應的管理頁面操作')
      return false
    }
    const hint = isBannerEvent(ev) ? `（跨天${ev.source === 'itinerary' ? '行程' : '活動'} ${ev.date} ~ ${ev.endDate}，將整筆刪除）` : ''
    if (!confirm(`確定要刪除「${ev.title}」？${hint}`)) return false
    const isItinerary = ev.source === 'itinerary'
    try {
      const res = await fetch(`${(isItinerary ? BASE_ITINERARY : BASE).value}/${ev.id}?date=${ev.date}`, { method: 'DELETE' })
      if (!res.ok) throw new Error()
      if (isItinerary) {
        itineraryEvents.value = itineraryEvents.value.filter(e => e.id !== ev.id)
      } else {
        events.value = events.value.filter(e => e.id !== ev.id)
      }
      // 同步更新側板
      if (dayPanel.show) dayPanel.events = eventsOnDate(dayPanel.dateStr)
      showToast('已刪除')
      return true
    } catch {
      showToast('刪除失敗')
      return false
    }
  }

  // ── 清空當月（活動 + 備注，不含 Google 同步活動）──────────────────
  const clearMonthModal = reactive({ show: false })
  const clearMonthConfirmText = ref('')
  const clearMonthError = ref('')
  const clearingMonth = ref(false)

  // 當月可清空的系統活動（排除 Google 來源）；用「起始日」而非月份交集判斷，
  // 因為後端資料是依起始日所在月份存檔（見 CalendarController.path()），
  // 清空當月即是清空存在該月 YML 檔裡的所有活動（即使跨天活動的結束日落到下個月也一併清掉）
  const clearableMonthEvents = computed(() => {
    const ym = `${currentYear.value}-${String(currentMonth.value).padStart(2, '0')}`
    return events.value.filter(e => e.date?.startsWith(ym))
  })
  const clearableEventCount = computed(() => clearableMonthEvents.value.length)

  function openClearMonthModal() {
    clearMonthConfirmText.value = ''
    clearMonthError.value = ''
    clearMonthModal.show = true
  }

  function closeClearMonthModal() {
    clearMonthModal.show = false
  }

  async function confirmClearMonth() {
    if (clearMonthConfirmText.value !== String(currentMonth.value)) return
    clearingMonth.value = true
    clearMonthError.value = ''
    try {
      const ym = `${currentYear.value}-${String(currentMonth.value).padStart(2, '0')}`
      const targets = clearableMonthEvents.value
      // 逐筆刪除系統活動（後端僅提供單筆 DELETE，沒有批次清空 API）
      const results = await Promise.allSettled(
        targets.map(ev => fetch(`${BASE.value}/${ev.id}?date=${ev.date}`, { method: 'DELETE' }))
      )
      const failedCount = results.filter(r => r.status === 'rejected' || !r.value?.ok).length
      const deletedIds = new Set(
        targets.filter((_, i) => results[i].status === 'fulfilled' && results[i].value?.ok).map(ev => ev.id)
      )
      events.value = events.value.filter(e => !deletedIds.has(e.id))

      // 清空當月備注
      await fetch(`${BASE.value}/notes?yearMonth=${ym}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify([])
      })
      notes.value = []

      // 同步更新側板
      if (dayPanel.show) dayPanel.events = eventsOnDate(dayPanel.dateStr)

      clearMonthModal.show = false
      if (failedCount > 0) {
        showToast(`已清空，但有 ${failedCount} 筆活動刪除失敗`)
      } else {
        showToast(`已清空 ${currentYear.value} 年 ${currentMonth.value} 月內容`)
      }
    } catch (e) {
      clearMonthError.value = '清空失敗，請稍後再試'
    } finally {
      clearingMonth.value = false
    }
  }

  // ── TXT 解析 ──────────────────────────────────────────────────────
  const showTxtModal = ref(false)
  const txtInput = ref('')
  const txtResult = ref(null)

  function closeTxtModal() {
    showTxtModal.value = false
    txtInput.value = ''
    txtResult.value = null
  }

  const TXT_TYPE = '(醫院|園區|芳心|Google)'
  // 跨天：8/4 08:00 ～ 8/7 17:00 標題 (owner room)類型
  const TXT_CROSS_DAY_RE = new RegExp(`^(\\d{1,2})/(\\d{1,2})\\s+(\\d{2}:\\d{2})\\s*[～~]\\s*(\\d{1,2})/(\\d{1,2})\\s+(\\d{2}:\\d{2})\\s+(.+?)\\s*\\(([^)]*)\\)${TXT_TYPE}$`)
  // 同天、日期寫在行首：8/3 08:00–12:00 標題 (owner room)類型
  const TXT_SAME_DAY_RE = new RegExp(`^(\\d{1,2})/(\\d{1,2})\\s+(\\d{2}:\\d{2})\\s*[-–—]\\s*(\\d{2}:\\d{2})\\s+(.+?)\\s*\\(([^)]*)\\)${TXT_TYPE}$`)
  // 舊格式相容：日期寫成獨立一行「16」，事件行只有時間：08:00-12:00 標題 (owner room)類型
  const TXT_OLD_STYLE_RE = new RegExp(`^(\\d{2}:\\d{2})\\s*[-–—]\\s*(\\d{2}:\\d{2})\\s+(.+?)\\s*\\(([^)]*)\\)${TXT_TYPE}$`)

  function splitOwnerRoom(inner) {
    const parts = inner.trim().split(/\s+/).filter(Boolean)
    return { owner: parts[0] || '', room: parts.slice(1).join(' ') }
  }

  function cleanTitle(t) {
    return t.replace(/\s*\.\.\s*$/, '').trim()
  }

  // 回傳 { events: [], notes: [] }；events 已經是「一筆活動一筆資料」，跨天活動直接帶 endDate/endTime
  function parseTxtContent(raw) {
    const lines = raw.split('\n').map(l => l.trim()).filter(Boolean)
    const evList = []
    const noteList = []
    let year = null, month = null, day = null
    let inNotes = false

    for (const line of lines) {
      // 年月行
      const ym = line.match(/^(\d{4})年(\d{1,2})月/)
      if (ym) {
        year = +ym[1]
        month = +ym[2]
        inNotes = false
        continue
      }

      // 備注區塊起始：「備 註 :」「備註：」等變體
      if (/^備\s*[註注]\s*[:：]/.test(line)) {
        inNotes = true
        continue
      }

      // ── 備注區 ──
      if (inNotes) {
        // 格式：1.(2026-04-03-14:00)文字內容
        // → 保留成「(2026-04-03-14:00) 文字內容」
        const m = line.match(/^\d+\.\s*(\([^)]*\))?\s*(.+)$/)
        if (m) {
          const prefix = m[1] ? m[1] + ' ' : ''
          const text = m[2].trim()
          if (text) noteList.push(prefix + text)
        } else if (line && !/^備/.test(line)) {
          noteList.push(line)
        }
        continue
      }

      if (!year) continue

      // 舊格式：獨立一行的日期數字（1~31），記住當前 day，供下面的舊格式時間行使用
      if (/^\d{1,2}$/.test(line) && +line >= 1 && +line <= 31) {
        day = +line
        continue
      }

      // ── 跨天活動：M/D HH:MM ～ M/D HH:MM 標題 (owner room)類型 ──
      const cross = line.match(TXT_CROSS_DAY_RE)
      if (cross) {
        const [, sm, sd, stime, em, ed, etime, titleRaw, inner, type] = cross
        const startMonth = +sm, endMonth = +em
        const startDate = `${year}-${String(startMonth).padStart(2, '0')}-${String(+sd).padStart(2, '0')}`
        // 跨年（例如 12月 ～ 1月）：結束日期年份 +1
        const endYear = endMonth < startMonth ? year + 1 : year
        const endDate = `${endYear}-${String(endMonth).padStart(2, '0')}-${String(+ed).padStart(2, '0')}`
        const { owner, room } = splitOwnerRoom(inner)
        // TXT 貼上匯入的活動一律歸類為「院內」，行尾解析到的標籤保留在 building 欄位（原本的建築分類）
        evList.push({ date: startDate, endDate, time: stime, endTime: etime, title: cleanTitle(titleRaw), owner, room, type: '院內', building: type })
        month = startMonth; day = +sd
        continue
      }

      // ── 同天活動、日期在行首：M/D HH:MM-HH:MM 標題 (owner room)類型 ──
      const sameDay = line.match(TXT_SAME_DAY_RE)
      if (sameDay) {
        const [, m, d, stime, etime, titleRaw, inner, type] = sameDay
        const date = `${year}-${String(+m).padStart(2, '0')}-${String(+d).padStart(2, '0')}`
        const { owner, room } = splitOwnerRoom(inner)
        evList.push({ date, endDate: date, time: stime, endTime: etime, title: cleanTitle(titleRaw), owner, room, type: '院內', building: type })
        month = +m; day = +d
        continue
      }

      // ── 舊格式：純時間行，日期沿用前面獨立的日期行 ──
      if (year && month && day) {
        const old = line.match(TXT_OLD_STYLE_RE)
        if (old) {
          const [, stime, etime, titleRaw, inner, type] = old
          const date = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
          const { owner, room } = splitOwnerRoom(inner)
          evList.push({ date, endDate: date, time: stime, endTime: etime, title: cleanTitle(titleRaw), owner, room, type: '院內', building: type })
        }
      }
    }
    return { events: evList, notes: noteList }
  }

  function eventKey(e) {
    return `${e.date}|${e.endDate}|${e.time}|${e.endTime}|${e.title}|${e.owner}|${e.room}`
  }

  function parseTxt() {
    const { events: parsed, notes: parsedNotes } = parseTxtContent(txtInput.value)
    const existing = new Set(events.value.map(eventKey))
    const added = [], skipped = { count: 0 }

    for (const ev of parsed) {
      if (existing.has(eventKey(ev))) {
        skipped.count++
        continue
      }
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
        } catch {
        }
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
        currentYear.value = +firstDate.slice(0, 4)
        currentMonth.value = +firstDate.slice(5, 7)
      }

      const evCount = txtResult.value.added.length
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
  const notes = ref([]) // 當月備注陣列
  const notesSaving = ref(false)
  const noteEditIdx = ref(-1) // 正在編輯的備注 index，-1 表示無
  const noteEditValue = ref('')

  const currentYearMonth = computed(() =>
    `${currentYear.value}-${String(currentMonth.value).padStart(2, '0')}`
  )

  // 切換月份時重新載入備注（類型 / 地點篩選維持不變，跨月份記住）
  watch(currentYearMonth, () => {
    fetchNotes()
    fetchGoogleEvents()
    fetchBookingEvents()
    fetchLunchEvents()
    fetchSoybeanEvents()
    noteEditIdx.value = -1
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
    noteEditIdx.value = notes.value.length - 1
    noteEditValue.value = ''
  }

  function startEditNote(idx) {
    noteEditIdx.value = idx
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
    toast.show = true
    setTimeout(() => {
      toast.show = false
    }, 2500)
  }

  onMounted(() => {
    restoreCalendarState() // 一定要在下面幾個依賴 currentYear/currentMonth 的 fetch 之前執行

    fetchEvents()
    fetchItineraryEvents()
    fetchNotes()
    fetchGoogleEvents()
    fetchBookingEvents()
    fetchLunchEvents()
    fetchSoybeanEvents()
    fetchRoomOrderEvents() // /list 一次回傳全部訂單，不用像上面三個依月份重抓

    if (import.meta.client && window.matchMedia) {
      mobileMql = window.matchMedia('(max-width: 640px)')
      isMobileViewport.value = mobileMql.matches
      mobileMql.addEventListener('change', updateMobileViewport)
    }
  })

  onUnmounted(() => {
    if (mobileMql) mobileMql.removeEventListener('change', updateMobileViewport)
  })
</script>

<style scoped>
  /* ── 月曆格線 ── */
  .calendar-grid {
    display: grid;
    grid-template-columns: repeat(7, minmax(0, 1fr));
    width: 100%;
  }

  :root.dark .calendar-grid {
    gap: 0 !important;
  }

  :root.dark .cal-cell {
    margin: 0 -1px -1px 0;
  }

  /* ── 每週容器：作為跨天活動色條 overlay 的定位基準 ── */
  .week-row {
    position: relative;
  }

  /* ── 跨天活動連續色條（比照 Google 日曆月檢視的橫幅樣式）── */
  .week-banner-layer {
    position: absolute;
    inset: 0;
    display: grid;
    grid-template-columns: repeat(7, minmax(0, 1fr));
    column-gap: 6px;
    padding-top: 27px; /* 對齊日期數字列高度 */
    pointer-events: none;
    z-index: 5;
  }

  :root.dark .week-banner-layer {
    column-gap: 0;
  }

  .week-banner-bar {
    position: relative;
    grid-row: 1; /* 強制所有色條共用同一列，避免 CSS Grid 自動排版跟 JS 算的 top 位移疊加兩次 */
    pointer-events: auto;
    box-sizing: border-box;
    height: 18px;
    line-height: 18px;
    padding: 0 6px;
    margin-bottom: 2px;
    font-size: 12px; /* text-xs */
    font-weight: 500;
    border-radius: 3px;
    border-left: none;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: clip;
    transition: opacity 0.1s, filter 0.1s;
  }

  .week-banner-bar:hover {
    opacity: 0.85;
    filter: brightness(0.97);
  }

  .week-banner-bar.round-l {
    border-top-left-radius: 9px;
    border-bottom-left-radius: 9px;
    margin-left: 1px;
  }

  .week-banner-bar.round-r {
    border-top-right-radius: 9px;
    border-bottom-right-radius: 9px;
    margin-right: 1px;
  }

  /* ── 星期標頭：深色底白字 ── */
  .cal-weekday {
    text-align: center;
    font-size: 14px;
    font-weight: 600;
    letter-spacing: .03em;
    padding: 10px 0;
    background: #495969;
    color: #fff;
    border-radius: 6px;
  }

  .cal-weekday.sun {
    color: #fca5a5;
  }

  .cal-weekday.sat {
    color: #93c5fd;
  }

  :root.dark .cal-weekday {
    background: #38404c;
    border-radius: 0;
  }

  /* ── 日期格子（用 min-height 取代固定 height：平常維持 120px 高，
     內容太多（活動 chip 或跨天色條疊很多層）時改成撐高，不裁切內容。
     同一週的 7 個格子仍會透過 CSS Grid 自動等高，週與週之間不會因此對不齊）── */
  .cal-cell {
    min-height: 120px;
    background: #fff;
    border: 1px solid #ece7e2;
    border-radius: 8px;
    padding: 8px 7px 7px;
    cursor: pointer;
    transition: box-shadow 0.15s, background 0.1s, border-color 0.15s;
    position: relative;
  }

  .cal-cell:hover {
    border-color: #6366f1;
    box-shadow: 0 0 0 2px #6366f1;
  }

  :root.dark .cal-cell {
    background: #15171c;
    border: 1px solid #2a2e37;
    border-radius: 0;
  }

  .cal-cell.weekend {
    background: #faf6f2;
  }

  :root.dark .cal-cell.weekend {
    background: #15171c;
  }

  .cal-cell.today {
    border-color: #6366f1;
    box-shadow: 0 0 0 2px #6366f1;
  }

  :root.dark .cal-cell.today {
    background: #2d3250;
    border-color: #5b6bb8;
    box-shadow: none;
  }

  .cal-cell.has-events {
    box-shadow: 0 1px 4px rgba(0, 0, 0, .07);
  }

  :root.dark .cal-cell.has-events {
    box-shadow: none;
  }

  /* ── 日期數字 ── */
  /* 固定高度＝跨天色條圖層 padding-top(27px) 扣掉自己的 margin-bottom(mb-1=4px)，
     確保這一列的實際佔用高度跟 .week-banner-layer 的 padding-top 完全對齊，
     不然色條跟下面自己的活動清單會因為兩邊各自算的高度對不起來而稍微疊到 */
  .cal-day-header {
    min-height: 23px;
  }

  .cal-day-num {
    font-size: 16px; /* text-base */
    font-weight: 600;
    line-height: 1;
  }

  .today-num {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 25px;
    height: 25px;
    background: #6366f1;
    color: #fff;
    border-radius: 50%;
    font-weight: 700;
  }

  :root.dark .today-num {
    background: transparent;
    color: #c7d2fe;
  }

  /* ── 活動 chip ── */
  .cal-chip {
    display: flex;
    align-items: baseline;
    gap: 4px;
    border-radius: 4px;
    border-left: 3px solid transparent;
    padding: 2px 5px 2px 6px;
    overflow: hidden;
    transition: opacity 0.1s, filter 0.1s;
    font-size: 12px; /* text-xs */
  }

  .cal-chip:hover {
    opacity: 0.85;
    filter: brightness(0.97);
  }

  .chip-time {
    font-size: 12px; /* text-xs */
    font-weight: 700;
    flex-shrink: 0;
    font-variant-numeric: tabular-nums;
    opacity: 0.7;
  }

  .chip-title {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: clip;
    flex: 1;
    min-width: 0;
    font-weight: 500;
  }

  /* chip 顏色：依建築分類（醫院/園區/芳心），院內沒有建築分類的用 onsite，Google 另外一色 */
  .chip-hospital {
    background: #fee2e2;
    color: #c0392b;
    border-left-color: #e0534a;
  }

  .chip-park {
    background: #d1fae5;
    color: #065f46;
    border-left-color: #3d6b52;
  }

  .chip-fragrant {
    background: #fce7f3;
    color: #9d4f78;
    border-left-color: #a06080;
  }

  .chip-google {
    background: #dbeafe;
    color: #1d4ed8;
    border-left-color: #2563eb;
  }

  .chip-itinerary {
    background: #ccfbf1;
    color: #0f766e;
    border-left-color: #14b8a6;
  }

  .chip-booking {
    background: #fce7f3;
    color: #be185d;
    border-left-color: #ec4899;
  }

  .chip-lunch {
    background: #ffedd5;
    color: #c2410c;
    border-left-color: #f97316;
  }

  .chip-soybean {
    background: #ecfccb;
    color: #4d7c0f;
    border-left-color: #65a30d;
  }

  .chip-roomorder {
    background: #ede9fe;
    color: #6d28d9;
    border-left-color: #7c3aed;
  }

  .chip-onsite {
    background: #fef3c7;
    color: #b45309;
    border-left-color: #d97706;
  }

  :root.dark .cal-chip {
    border-left-width: 0;
    padding: 2px 6px;
  }

  :root.dark .chip-hospital {
    background: #c0392b;
    color: #fff;
  }

  :root.dark .chip-park {
    background: #15803d;
    color: #fff;
  }

  :root.dark .chip-fragrant {
    background: #a06080;
    color: #fff;
  }

  :root.dark .chip-google {
    background: #2563eb;
    color: #fff;
  }

  :root.dark .chip-itinerary {
    background: #0d9488;
    color: #fff;
  }

  :root.dark .chip-booking {
    background: #db2777;
    color: #fff;
  }

  :root.dark .chip-lunch {
    background: #ea580c;
    color: #fff;
  }

  :root.dark .chip-soybean {
    background: #4d7c0f;
    color: #fff;
  }

  :root.dark .chip-roomorder {
    background: #6d28d9;
    color: #fff;
  }

  :root.dark .chip-onsite {
    background: #b45309;
    color: #fff;
  }

  :root.dark .chip-time {
    opacity: 0.85;
  }

  /* ── 類型 badge ── */
  .type-badge {
    display: inline-flex;
    align-items: center;
    font-size: 12px; /* text-xs */
    font-weight: 600;
    padding: 2px 8px;
    border-radius: 10px;
  }

  .type-badge.hospital {
    background: #fee2e2;
    color: #c0392b;
  }

  .type-badge.park {
    background: #d1fae5;
    color: #065f46;
  }

  .type-badge.fragrant {
    background: #fce7f3;
    color: #9d4f78;
  }

  .type-badge.google {
    background: #dbeafe;
    color: #1d4ed8;
  }

  .type-badge.itinerary {
    background: #ccfbf1;
    color: #0f766e;
  }

  .type-badge.booking {
    background: #fce7f3;
    color: #be185d;
  }

  .type-badge.lunch {
    background: #ffedd5;
    color: #c2410c;
  }

  .type-badge.soybean {
    background: #ecfccb;
    color: #4d7c0f;
  }

  .type-badge.roomorder {
    background: #ede9fe;
    color: #6d28d9;
  }

  .type-badge.onsite {
    background: #fef3c7;
    color: #b45309;
  }

  :root.dark .type-badge.hospital {
    background: #4d2323;
    color: #f87171;
  }

  :root.dark .type-badge.park {
    background: #1a3a26;
    color: #4ade80;
  }

  :root.dark .type-badge.fragrant {
    background: #3b1a2e;
    color: #f0abfc;
  }

  :root.dark .type-badge.google {
    background: #1e3a5f;
    color: #93c5fd;
  }

  :root.dark .type-badge.itinerary {
    background: #134e4a;
    color: #5eead4;
  }

  :root.dark .type-badge.booking {
    background: #831843;
    color: #f9a8d4;
  }

  :root.dark .type-badge.lunch {
    background: #7c2d12;
    color: #fdba74;
  }

  :root.dark .type-badge.soybean {
    background: #365314;
    color: #bef264;
  }

  :root.dark .type-badge.roomorder {
    background: #4c1d95;
    color: #c4b5fd;
  }

  :root.dark .type-badge.onsite {
    background: #b45309;
    color: #fff;
  }

  /* ── 篩選列：下拉選單 ── */
  .filter-bar {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 18px;
  }

  .filter-select-group {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .filter-label {
    font-size: 14px; /* text-sm */
    font-weight: 600;
    color: #a8a29e;
    white-space: nowrap;
    flex-shrink: 0;
  }

  .filter-select {
    padding: 7px 12px;
    border: 1.5px solid #e2ddd8;
    border-radius: 8px;
    background: #fff;
    color: #1c1917;
    font-size: 14px; /* text-sm */
    max-width: 220px;
    cursor: pointer;
    transition: border-color .15s;
  }

  .filter-select:hover {
    border-color: #6366f1;
  }

  .filter-select:focus {
    outline: none;
    border-color: #6366f1;
    box-shadow: 0 0 0 3px rgba(99, 102, 241, .12);
  }

  :root.dark .filter-select {
    background: #1c1f26;
    border-color: #2a2e37;
    color: #f5f5f4;
  }

  .filter-sync-hint {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    font-size: 12px; /* text-xs */
    color: #2563eb;
  }

  :root.dark .filter-sync-hint {
    color: #93c5fd;
  }

  .legend-checkbox {
    width: 15px;
    height: 15px;
    border-radius: 4px;
    border: 1px solid #d6d0ca;
    accent-color: #6366f1;
    flex-shrink: 0;
    cursor: pointer;
  }

  :root.dark .legend-checkbox {
    border-color: #2a2e37;
  }

  /* 收合只在手機生效；lg（電腦版）以上這個側欄本來就固定顯示在左邊，不該被收合狀態影響 */
  @media (min-width: 1024px) {
    .collapsible-panel {
      display: block !important;
    }
  }

  .filter-sync-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: #2563eb;
    animation: filter-sync-pulse 1s infinite;
  }

  :root.dark .filter-sync-dot {
    background: #93c5fd;
  }

  @keyframes filter-sync-pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.3; }
  }

  /* ── 表單欄位 ── */

  .field-label {
    display: block;
    font-size: 12px; /* text-xs */
    font-weight: 600;
    color: #57534e;
    margin-bottom: 4px;
  }

  :root.dark .field-label {
    color: #a8a29e;
  }

  .field-input {
    width: 100%;
    padding: 8px 12px;
    font-size: 14px; /* text-sm */
    border: 1px solid #e2ddd8;
    border-radius: 12px;
    background: #fff;
    color: #1c1917;
    outline: none;
    transition: border 0.15s, box-shadow 0.15s;
  }

  :root.dark .field-input {
    background: #1c1f26;
    border-color: #2a2e37;
    color: #f5f5f4;
  }

  .field-input:focus {
    border-color: #6366f1;
    box-shadow: 0 0 0 3px rgba(99, 102, 241, .12);
  }

  /* ── 側板動畫 ── */
  .slide-right-enter-active, .slide-right-leave-active {
    transition: opacity 0.2s;
  }

  .slide-right-enter-active > div, .slide-right-leave-active > div {
    transition: transform 0.25s cubic-bezier(.32, .72, 0, 1);
  }

  .slide-right-enter-from {
    opacity: 0;
  }

  .slide-right-enter-from > div {
    transform: translateX(100%);
  }

  .slide-right-leave-to {
    opacity: 0;
  }

  .slide-right-leave-to > div {
    transform: translateX(100%);
  }

  /* ── Toast ── */
  .fade-enter-active, .fade-leave-active {
    transition: opacity 0.3s, transform 0.3s;
  }

  .fade-enter-from, .fade-leave-to {
    opacity: 0;
    transform: translateY(8px);
  }

  /* ── 跟隨游標的活動提示框 ── */
  .event-tooltip {
    position: fixed;
    z-index: 1000;
    width: 280px;
    background: #fff;
    color: #1c1917;
    border: 1px solid #e2ddd8;
    border-radius: 12px;
    box-shadow: 0 10px 30px rgba(0, 0, 0, .25);
    padding: 14px 16px;
    font-size: 14px; /* text-sm */
    line-height: 1.7;
    white-space: normal;
    text-align: left;
    pointer-events: none;
  }

  :root.dark .event-tooltip {
    background: #1c1f26;
    color: #f5f5f4;
    border-color: #2a2e37;
  }

  .tooltip-title {
    font-weight: 700;
    font-size: 16px; /* text-base */
    margin-bottom: 6px;
    word-break: break-word;
  }

  .tooltip-row {
    color: #78716c;
    word-break: break-word;
  }

  :root.dark .tooltip-row {
    color: #a1a1aa;
  }

  .tooltip-hint {
    margin-top: 8px;
    color: #6366f1;
    font-size: 12px; /* text-xs */
  }

  :root.dark .tooltip-hint {
    color: #818cf8;
  }

  /* ── Google 活動描述 HTML 渲染 ── */
  .google-desc-html :deep(p) { margin: 0 0 6px; }
  .google-desc-html :deep(ul),
  .google-desc-html :deep(ol) { margin: 4px 0 4px 16px; padding: 0; }
  .google-desc-html :deep(li) { margin-bottom: 2px; }
  .google-desc-html :deep(strong) { font-weight: 600; color: var(--color-base-c, #1c1917); }
  .google-desc-html :deep(a) { color: #6366f1; text-decoration: underline; }

  /* ── RWD ── */
  @media (max-width: 640px) {
    .calendar-grid {
      gap: 3px;
    }

    .weekday-header {
      margin-bottom: 3px;
    }

    .weekday-header .cal-weekday {
      padding: 6px 0;
    }

    .week-row {
      margin-bottom: 3px;
    }

    .cal-cell {
      min-height: 120px;
      padding: 1px;
    }

    .cal-day-num {
      font-size: 12px; /* text-xs，手機版再縮小一級 */
    }

    .cal-day-header {
      min-height: 14px; /* 對齊手機版 .week-banner-layer 的 padding-top(18px) - mb-1(4px) */
    }

    .cal-chip {
      padding: 0 2px;
    }

    .chip-time,
    .cal-chip {
      font-size: 11px;
    }

    .week-banner-layer {
      column-gap: 3px;
      padding-top: 18px;
    }

    .week-banner-bar {
      font-size: 10px;
      height: 15px;
      line-height: 15px;
      padding: 0 3px;
      margin-bottom: 1px;
    }
  }
</style>
