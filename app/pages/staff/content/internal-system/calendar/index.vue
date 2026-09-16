<template>
  <InternalSystemCalendarShell>
  <div class="calendar-page">
    <!-- 頂部導覽 -->
    <div class="cal-header">
      <div class="cal-nav">
        <button class="nav-btn" @click="prevMonth">&#8249; 上一月</button>
        <h2 class="cal-title">{{ year }}年{{ month }}月</h2>
        <button class="nav-btn" @click="nextMonth">下一月 &#8250;</button>
      </div>

      <!-- 同步狀態 + 操作 -->
      <div class="sync-status">
        <button
                class="nav-btn week-start-toggle"
                type="button"
                :title="weekStartsOn === 1 ? '目前：週一排第一個，點擊改成週日排第一個' : '目前：週日排第一個，點擊改成週一排第一個'"
                @click="toggleWeekStart"
        >
          🗓️ {{ weekStartsOn === 1 ? '週一為首' : '週日為首' }}
        </button>
        <span v-if="syncStatus === 'syncing'" class="sync-badge syncing">
          <span class="sync-dot"></span> 更新中...
        </span>
        <span v-else-if="syncStatus === 'done'" class="sync-badge done">
          ✓ 已更新
        </span>
        <button
                v-if="calendarData"
                class="nav-btn copy-txt-btn"
                type="button"
                :disabled="copying"
                @click="copyMonthAsTxt"
        >
          📋 複製 TXT
        </button>
      </div>
    </div>

    <!-- 篩選列 -->
    <div v-if="calendarData" class="filter-bar">
      <div class="filter-select-group">
        <label class="filter-label">類型</label>
        <select
                class="filter-select"
                :value="selectedUnit"
                @change="onUnitChange(($event.target as HTMLSelectElement).value)"
        >
          <option value="">全部 {{ totalCount }}</option>
          <option v-for="u in unitCounts" :key="u.name" :value="u.name">
            {{ u.name }} {{ u.count }}
          </option>
        </select>
      </div>

      <div class="filter-select-group person-filter" ref="personFilterRef">
        <label class="filter-label">建立者</label>
        <button
                type="button"
                class="filter-select person-dropdown-btn"
                @click="personDropdownOpen = !personDropdownOpen"
        >
          {{ personFilterText }}
          <span class="dropdown-arrow" :class="{ open: personDropdownOpen }">▾</span>
        </button>

        <div v-if="personDropdownOpen" class="person-dropdown-panel">
          <label class="person-option person-option-all">
            <input
                    type="checkbox"
                    :checked="selectedPersons.length === 0"
                    @change="clearSelectedPersons"
            /> 全部
          </label>
          <div class="person-option-divider"></div>
          <label v-for="p in availablePersons" :key="p.name" class="person-option">
            <input
                    type="checkbox"
                    :value="p.name"
                    v-model="selectedPersons"
            /> {{ p.name }} {{ p.count }}
          </label>
        </div>
      </div>

      <div class="filter-select-group">
        <label class="filter-label">地點</label>
        <select class="filter-select" v-model="selectedLocation">
          <option value="">全部</option>
          <option v-for="loc in availableLocations" :key="loc" :value="loc">
            {{ loc }}
          </option>
        </select>
      </div>
    </div>

    <!-- 圖例 -->
    <div class="legend">
      <span class="legend-item">
        <span class="legend-dot blue"></span> 一般活動
      </span>
      <span class="legend-item">
        <span class="legend-dot orange"></span> ✏️ 我建立的（可編輯）
      </span>
    </div>

    <div v-if="loading" class="loading">載入中...</div>
    <div v-else-if="error" class="error-banner">{{ error }}</div>

    <!-- 月曆格 -->
    <div v-else class="cal-grid-wrapper">
      <div class="cal-weekdays">
        <div v-for="d in weekdays" :key="d" class="weekday">{{ d }}</div>
      </div>

      <div class="cal-grid">
        <div v-for="n in leadingDays" :key="`empty-${n}`" class="cal-cell empty" />

        <div
                v-for="dayData in enrichedFilteredDays"
                :key="dayData.day"
                class="cal-cell"
                :class="{ today: dayData.isToday }"
        >
          <div class="day-num" @click="goAdd(dayData.date)">
            {{ dayData.day }}
          </div>

          <!-- 跨天長條：整段只有「一個」DOM 元素，用 width 一次跨滿所有天數，
               中間完全沒有其他元素的邊界要對齊，天然不會有縫隙。
               只有活動真正的頭尾留 2px 邊距＋圓角；因跨週被切開的段落頭尾貼齊格子邊緣。 -->
          <div
                  v-for="bar in dayData.multiDayItems"
                  :key="`bar-${bar.segId}`"
                  class="event-item multi-day-bar"
                  :class="{ editable: bar.isEditable, 'bar-hovered': hoveredCalId === bar.calendarId }"
                  :style="{
                    position: 'absolute',
                    top: `${26 + bar.row * 22}px`,
                    left: bar.isEventStart ? '2px' : '0',
                    width: `calc(${bar.span} * 100% + ${bar.span - 1} * 1px${bar.isEventStart ? ' - 2px' : ''}${bar.isEventEnd ? ' - 2px' : ''})`,
                    height: '20px',
                    zIndex: 2,
                    borderRadius: `${bar.isEventStart ? 3 : 0}px ${bar.isEventEnd ? 3 : 0}px ${bar.isEventEnd ? 3 : 0}px ${bar.isEventStart ? 3 : 0}px`,
                  }"
                  @click="goEvent(bar)"
                  @mouseenter="showTooltip(bar, $event)"
                  @mousemove="moveTooltip($event)"
                  @mouseleave="hideTooltip"
          >
            <span class="event-time">{{ bar.startTime }}</span>
            <span class="event-title">{{ bar.title }}</span>
            <span v-if="bar.unit" class="event-unit">{{ bar.unit }}</span>
          </div>

          <!-- 單天活動，padding-top 讓出跨日長條的空間 -->
          <div
                  class="event-list"
                  :style="{ marginTop: dayData.multiDayRowCount > 0 ? `${dayData.multiDayRowCount * 22}px` : '0' }"
          >
            <!-- 單天活動 -->
            <div
                    v-for="ev in dayData.singleDayEvents"
                    :key="ev.calendarId"
                    class="event-item"
                    :class="{ editable: ev.isEditable }"
                    @click="goEvent(ev)"
                    @mouseenter="showTooltip(ev, $event)"
                    @mousemove="moveTooltip($event)"
                    @mouseleave="hideTooltip"
            >
              <span class="event-time">{{ ev.startTime }}</span>
              <span class="event-title">{{ ev.title }}</span>
              <span v-if="ev.unit" class="event-unit">{{ ev.unit }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 備註 -->
    <div v-if="calendarData?.remarks?.length" class="remarks">
      <strong>備註：</strong>
      <p v-for="(r, i) in calendarData.remarks" :key="i">{{ r }}</p>
    </div>

    <!-- 滑鼠移上去顯示詳細內容（跟隨游標，類似遊戲道具提示） -->
    <Teleport to="body">
      <div
              v-if="tooltipEvent"
              class="event-tooltip"
              :style="tooltipStyle"
      >
        <div class="tooltip-title">{{ tooltipEvent.title }}</div>
        <div class="tooltip-row">
          🕐
          <template v-if="tooltipEvent.multiDayStartDate">
            {{ tooltipEvent.multiDayStartDate }} {{ tooltipEvent.startTime }}
            <template v-if="tooltipEvent.multiDayEndDate !== tooltipEvent.multiDayStartDate">
              ～ {{ tooltipEvent.multiDayEndDate }} {{ tooltipEvent.endTime }}
            </template>
          </template>
          <template v-else>
            {{ tooltipEvent.startTime }}<template v-if="tooltipEvent.endTime">–{{ tooltipEvent.endTime }}</template>
          </template>
        </div>
        <div v-if="tooltipEvent.location" class="tooltip-row">📍 {{ tooltipEvent.location }}</div>
        <div v-if="tooltipEvent.unit" class="tooltip-row">🏷️ {{ tooltipEvent.unit }}</div>
        <div v-if="tooltipEvent.person" class="tooltip-row">👤 {{ tooltipEvent.person }}</div>
        <div v-if="tooltipEvent.isEditable" class="tooltip-hint">✏️ 點擊可編輯</div>
      </div>
    </Teleport>

    <!-- 複製成功提示 -->
    <Transition name="toast-fade">
      <div v-if="toast.show" class="copy-toast">
        <span class="copy-toast-icon">✓</span>
        {{ toast.message }}
      </div>
    </Transition>
  </div>
  </InternalSystemCalendarShell>
</template>

<script setup lang="ts">
  definePageMeta({ layout: 'staff', requiredPermission: 'content.internal-system', middleware: 'internal-system-auth' })

  const route = useRoute()
  const router = useRouter()
  const { loading, error, fetchList } = useInternalSystemCalendar()

  const now = new Date()
  const year = ref(parseInt(String(route.query.y ?? now.getFullYear())))
  const month = ref(parseInt(String(route.query.m ?? now.getMonth() + 1)))

  const FILTER_KEY = 'calendar_filter_memory'

  function loadSavedFilters() {
    if (!import.meta.client) return { unit: '', persons: [] as string[], location: '' }
    try {
      const raw = localStorage.getItem(FILTER_KEY)
      if (!raw) return { unit: '', persons: [] as string[], location: '', weekStart: 0 as 0 | 1 }
      const saved = JSON.parse(raw)
      // 相容舊版單選資料（person 字串）
      let persons: string[] = []
      if (Array.isArray(saved.persons)) persons = saved.persons
      else if (saved.person) persons = [saved.person]
      return {
        unit: saved.unit ?? '',
        persons,
        location: saved.location ?? '',
        weekStart: (saved.weekStart === 1 ? 1 : 0) as 0 | 1,
      }
    } catch {
      return { unit: '', persons: [] as string[], location: '', weekStart: 0 as 0 | 1 }
    }
  }

  function saveFilters() {
    if (!import.meta.client) return
    localStorage.setItem(FILTER_KEY, JSON.stringify({
      unit: selectedUnit.value,
      persons: selectedPersons.value,
      location: selectedLocation.value,
      weekStart: weekStartsOn.value,
    }))
  }

  const savedFilters = loadSavedFilters()
  const selectedUnit = ref(savedFilters.unit)
  const selectedPersons = ref<string[]>(savedFilters.persons)
  const selectedLocation = ref(savedFilters.location)
  const weekStartsOn = ref<0 | 1>(savedFilters.weekStart)  // 0 = 週日為首，1 = 週一為首
  const syncStatus = ref<'idle' | 'syncing' | 'done'>('idle')
  let syncTimer: ReturnType<typeof setTimeout> | null = null
  let loadToken = 0

  // 建立者下拉勾選選單
  const personDropdownOpen = ref(false)
  const personFilterRef = ref<HTMLElement | null>(null)

  const personFilterText = computed(() => {
    if (selectedPersons.value.length === 0) return '全部'
    if (selectedPersons.value.length === 1) return selectedPersons.value[0]
    return `已選 ${selectedPersons.value.length} 人`
  })

  const clearSelectedPersons = () => {
    selectedPersons.value = []
  }

  const onClickOutsidePersonFilter = (e: MouseEvent) => {
    if (!personFilterRef.value) return
    if (!personFilterRef.value.contains(e.target as Node)) {
      personDropdownOpen.value = false
    }
  }

  onMounted(() => {
    if (import.meta.client) document.addEventListener('click', onClickOutsidePersonFilter)
  })

  onUnmounted(() => {
    if (import.meta.client) document.removeEventListener('click', onClickOutsidePersonFilter)
  })

  const weekdayNames = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六']
  const weekdays = computed(() => {
    // weekStartsOn = 0 → 週日排第一個（原順序）；= 1 → 週一排第一個（整組往前轉一位，週日排到最後）
    return weekStartsOn.value === 1
            ? [...weekdayNames.slice(1), weekdayNames[0]]
            : weekdayNames
  })
  const calendarData = ref<any>(null)

  const leadingDays = computed(() => {
    const d = new Date(year.value, month.value - 1, 1)
    // getDay()：0=週日...6=週六。扣掉週首偏移量，換算成「這個月第一天前面要空幾格」
    return (d.getDay() - weekStartsOn.value + 7) % 7
  })

  // 所有活動
  const allEvents = computed(() => {
    if (!calendarData.value?.days) return []
    return calendarData.value.days.flatMap((d: any) => d.events)
  })

  const totalCount = computed(() => allEvents.value.length)

  const onUnitChange = (value: string) => {
    selectedUnit.value = value
    selectedPersons.value = []
    selectedLocation.value = ''
    saveFilters()
  }

  watch(selectedPersons, saveFilters)
  watch(selectedLocation, saveFilters)

  const toggleWeekStart = () => {
    weekStartsOn.value = weekStartsOn.value === 0 ? 1 : 0
    saveFilters()
  }

  // 單位統計
  const unitCounts = computed(() => {
    const map: Record<string, number> = {}
    allEvents.value.forEach((ev: any) => {
      if (ev.unit) map[ev.unit] = (map[ev.unit] ?? 0) + 1
    })
    const list = Object.entries(map)
            .sort((a, b) => b[1] - a[1])
            .map(([name, count]) => ({ name, count }))
    // 即使當月沒有符合的活動，也要保留目前選的類型在選單中（顯示 0）
    if (selectedUnit.value && !list.some((u) => u.name === selectedUnit.value)) {
      list.push({ name: selectedUnit.value, count: 0 })
    }
    return list
  })

  // 建立者清單（根據目前選的單位篩選）
  const availablePersons = computed(() => {
    const events = selectedUnit.value
            ? allEvents.value.filter((ev: any) => ev.unit === selectedUnit.value)
            : allEvents.value
    const map: Record<string, number> = {}
    events.forEach((ev: any) => {
      if (ev.person) map[ev.person] = (map[ev.person] ?? 0) + 1
    })
    const list = Object.entries(map)
            .sort((a, b) => b[1] - a[1])
            .map(([name, count]) => ({ name, count }))
    // 即使當月沒有符合的活動，也要保留目前選的建立者在選單中（顯示 0）
    selectedPersons.value.forEach((name) => {
      if (!list.some((p) => p.name === name)) {
        list.push({ name, count: 0 })
      }
    })
    return list
  })

  // 地點清單（根據單位＋建立者篩選）
  const availableLocations = computed(() => {
    let events = allEvents.value
    if (selectedUnit.value) events = events.filter((ev: any) => ev.unit === selectedUnit.value)
    if (selectedPersons.value.length > 0) {
      events = events.filter((ev: any) => selectedPersons.value.includes(ev.person))
    }
    const locs = new Set<string>()
    events.forEach((ev: any) => {
      if (ev.location) {
        const locName = ev.location.replace(/^[A-Z0-9]+\s+/, '').trim()
        if (locName) locs.add(locName)
      }
    })
    // 即使當月沒有符合的活動，也要保留目前選的地點在選單中
    if (selectedLocation.value) locs.add(selectedLocation.value)
    return Array.from(locs).sort()
  })

  // 套用所有篩選
  const filteredDays = computed(() => {
    if (!calendarData.value?.days) return []
    return calendarData.value.days.map((dayData: any) => {
      let events = dayData.events
      if (selectedUnit.value) {
        events = events.filter((ev: any) => ev.unit === selectedUnit.value)
      }
      if (selectedPersons.value.length > 0) {
        events = events.filter((ev: any) => selectedPersons.value.includes(ev.person))
      }
      if (selectedLocation.value) {
        events = events.filter((ev: any) => {
          const locName = (ev.location ?? '').replace(/^[A-Z0-9]+\s+/, '').trim()
          return locName === selectedLocation.value
        })
      }
      return { ...dayData, filteredEvents: events }
    })
  })

  // 計算跨天活動長條
  const weekCount = computed(() => {
    if (!calendarData.value?.days) return 0
    const total = leadingDays.value + calendarData.value.days.length
    return Math.ceil(total / 7)
  })

  const multiDayBars = computed(() => {
    const days = filteredDays.value
    if (!days.length) return []

    // 找出所有出現 2+ 天的 calendarId
    const idDays: Record<string, number[]> = {}
    days.forEach((d: any, idx: number) => {
      d.filteredEvents.forEach((ev: any) => {
        if (!idDays[ev.calendarId]) idDays[ev.calendarId] = []
        idDays[ev.calendarId].push(idx)
      })
    })

    const multiIds = new Set(
            Object.entries(idDays)
                    .filter(([, idxs]) => idxs.length > 1)
                    .map(([id]) => id)
    )

    if (!multiIds.size) return []

    // 把連續天數分組成「段」（同一活動可能橫跨週邊界，需要拆成多列）
    const bars: any[] = []
    for (const [calId, dayIdxs] of Object.entries(idDays)) {
      if (!multiIds.has(calId)) continue
      const ev = days[dayIdxs[0]].filteredEvents.find((e: any) => e.calendarId === calId)
      if (!ev) continue

      // 把 dayIdxs 按連續性分段，每段一條長條
      const sorted = [...dayIdxs].sort((a, b) => a - b)
      let segStart = sorted[0]
      let segEnd = sorted[0]
      for (let i = 1; i <= sorted.length; i++) {
        const curr = sorted[i]
        const prev = sorted[i - 1]
        const isSameWeekRow = curr !== undefined && Math.floor((leadingDays.value + segStart) / 7) === Math.floor((leadingDays.value + curr) / 7)
        if (curr !== undefined && curr === prev + 1 && isSameWeekRow) {
          segEnd = curr
        } else {
          // emit this segment
          const absStart = leadingDays.value + segStart
          const row = Math.floor(absStart / 7)
          const colStart = (absStart % 7) + 1
          const colEnd = colStart + (segEnd - segStart)
          bars.push({ ...ev, calendarId: calId, row, colStart, colEnd, trackOffset: 0 })
          if (curr !== undefined) {
            segStart = curr
            segEnd = curr
          }
        }
      }
    }

    // 為同一 row 的 bars 計算垂直偏移（避免重疊）
    // trackOffset: 每條長條的垂直位置，從第2條起偏移
    const rowTracks: Record<number, number> = {}
    bars.sort((a, b) => a.row - b.row || a.colStart - b.colStart)
    bars.forEach(bar => {
      const track = rowTracks[bar.row] ?? 0
      bar.trackOffset = 26 + track * 20  // 26px = 日期數字高度
      rowTracks[bar.row] = track + 1
    })

    return bars
  })

  // enrichedFilteredDays：每格含 multiDayItems（跨天長條）和 singleDayEvents
  const enrichedFilteredDays = computed(() => {
    const days = filteredDays.value
    if (!days.length) return []

    // 找出所有跨天的 calendarId（在月份內出現 2+ 天）
    const idDayIdxs: Record<string, number[]> = {}
    days.forEach((d: any, idx: number) => {
      d.filteredEvents.forEach((ev: any) => {
        if (!idDayIdxs[ev.calendarId]) idDayIdxs[ev.calendarId] = []
        idDayIdxs[ev.calendarId].push(idx)
      })
    })

    // 建立 calendarId → segments（每段含 startIdx, span）
    // 跨週邊界拆成多段，各段獨立顯示長條
    type Seg = { calendarId: string; segId: string; startIdx: number; span: number; ev: any }
    const segments: Seg[] = []
    for (const [calId, idxs] of Object.entries(idDayIdxs)) {
      if (idxs.length < 2) continue  // 整個月只出現一天就跳過（真正的單日活動）
      const sorted = [...idxs].sort((a, b) => a - b)
      const overallFirstIdx = sorted[0]
      const overallLastIdx = sorted[sorted.length - 1]
      let segStart = sorted[0]
      let segEnd = sorted[0]
      for (let i = 1; i <= sorted.length; i++) {
        const curr = sorted[i]
        const prev = sorted[i - 1]
        const crossWeek = curr !== undefined &&
                Math.floor((leadingDays.value + prev) / 7) !== Math.floor((leadingDays.value + curr) / 7)
        if (curr !== undefined && curr === prev + 1 && !crossWeek) {
          segEnd = curr
        } else {
          const ev = days[segStart].filteredEvents.find((e: any) => e.calendarId === calId)
          if (ev) {
            const segStartDate = days[segStart]?.date ?? ''
            const segEndDate = days[segEnd]?.date ?? ''
            // tooltip 顯示整個活動的起訖日（取該 calId 所有天的首尾）
            const allIdxsForCal = sorted  // sorted 是整個活動的所有 dayIdx
            const activityStartDate = days[allIdxsForCal[0]]?.date ?? segStartDate
            const activityEndDate = days[allIdxsForCal[allIdxsForCal.length - 1]]?.date ?? segEndDate
            segments.push({
              calendarId: calId,
              segId: `${calId}-${segStart}`,
              startIdx: segStart,
              span: segEnd - segStart + 1,
              // 這段是否包含整個活動的真正第一天／最後一天（跨週被拆段時，段的頭尾不一定是活動真正的頭尾）
              isEventFirstSeg: segStart === overallFirstIdx,
              isEventLastSeg: segEnd === overallLastIdx,
              ev: { ...ev, multiDayStartDate: activityStartDate, multiDayEndDate: activityEndDate },
            })
          }
          if (curr !== undefined) { segStart = curr; segEnd = curr }
        }
      }
    }

    // 為每個 segment 分配 row（同週不衝突）
    // rowUsed[weekStart][row] = true 表示該週該行已被佔用
    const segRow: Record<string, number> = {}
    const rowUsed: Record<number, boolean[]> = {}
    // 按 startIdx 排序確保先到先得
    segments.sort((a, b) => a.startIdx - b.startIdx)
    segments.forEach(seg => {
      const weekStart = Math.floor((leadingDays.value + seg.startIdx) / 7) * 7
      if (!rowUsed[weekStart]) rowUsed[weekStart] = []
      // 找第一個沒被佔用的 row
      let row = 0
      while (rowUsed[weekStart][row]) row++
      segRow[seg.segId] = row
      // 佔用這個週的這個 row（整段都佔）
      rowUsed[weekStart][row] = true
    })

    // 建立每格的 multiDayItems：長條只在「這一段的第一天」放一個元素，
    // 用 width 一次跨滿整段（中間完全沒有其他 DOM 邊界，天然不會有縫隙）；
    // 其餘被跨過的天數仍要保留同樣的行高空間，讓單天活動往下讓開。
    const multiIds = new Set(segments.map(s => s.calendarId))
    const visibleBar: Record<number, any[]> = {}
    const cellRowCount: Record<number, number> = {}
    segments.forEach(seg => {
      const row = segRow[seg.segId]
      for (let i = 0; i < seg.span; i++) {
        const idx = seg.startIdx + i
        cellRowCount[idx] = Math.max(cellRowCount[idx] ?? 0, row + 1)
      }
      if (!visibleBar[seg.startIdx]) visibleBar[seg.startIdx] = []
      visibleBar[seg.startIdx].push({
        ...seg.ev,
        calendarId: seg.calendarId,
        segId: seg.segId,
        span: seg.span,
        row,
        // 只有活動「真正」的第一天／最後一天才留邊距、畫圓角；
        // 因跨週被切開的段落頭尾則貼齊格子邊緣（下一段會在新的一列從貼齊處接著畫）
        isEventStart: seg.isEventFirstSeg,
        isEventEnd: seg.isEventLastSeg,
      })
    })

    // debug
    if (import.meta.client) {
      console.log('[enriched] segments:', segments.map(s => ({ segId: s.segId, startIdx: s.startIdx, span: s.span })))
      console.log('[enriched] visibleBar keys:', Object.keys(visibleBar))
      console.log('[enriched] multiIds:', [...multiIds])
    }

    return days.map((d: any, idx: number) => ({
      ...d,
      multiDayItems: visibleBar[idx] ?? [],
      multiDayRowCount: cellRowCount[idx] ?? 0,
      singleDayEvents: d.filteredEvents.filter((ev: any) => !multiIds.has(ev.calendarId)),
    }))
  })

  const loadCalendar = async () => {
    router.replace({ query: { y: year.value, m: month.value } })

    // 記下這次請求的 token，月份是 y/m，防止切換月份後舊回應蓋掉新月份
    const token = ++loadToken
    const requestYear = year.value
    const requestMonth = month.value

    // 有快取時顯示「更新中」，背景更新完成後顯示「已更新」
    const hasCached = !!localStorage.getItem(`swr_calendar_${requestYear}_${requestMonth}`)
    if (hasCached) {
      syncStatus.value = 'syncing'
      if (syncTimer) clearTimeout(syncTimer)
    }

    const result = await fetchList(requestYear, requestMonth, (fresh) => {
      // 這段背景更新回來時，若已經切到別的月份（token 過期），就丟棄，不更新畫面
      if (token !== loadToken) return

      const stale = calendarData.value
      if (detectLoggedOut(stale, fresh)) {
        navigateTo('/staff/content/internal-system/login')
        return
      }
      calendarData.value = fresh
      syncStatus.value = 'done'
      if (syncTimer) clearTimeout(syncTimer)
      syncTimer = setTimeout(() => { syncStatus.value = 'idle' }, 2000)
    })

    // 主要請求（立即回傳的快取或第一次抓取）也要檢查 token 是否還是最新
    if (token !== loadToken) return
    calendarData.value = result

    // 沒有快取（第一次），直接完成不顯示狀態
    if (!hasCached) syncStatus.value = 'idle'
  }

  /**
   * 比對快取(舊)與最新資料：若同一筆活動原本可編輯，
   * 重新讀取後變成只能查看，代表後端 session 已過期（被登出）
   */
  function detectLoggedOut(stale: any, fresh: any): boolean {
    if (!stale?.days || !fresh?.days) return false

    const staleEditable = new Set<string>()
    stale.days.forEach((d: any) => {
      d.events?.forEach((ev: any) => {
        if (ev.isEditable) staleEditable.add(ev.calendarId)
      })
    })
    if (staleEditable.size === 0) return false

    const freshById = new Map<string, any>()
    fresh.days.forEach((d: any) => {
      d.events?.forEach((ev: any) => {
        freshById.set(ev.calendarId, ev)
      })
    })

    for (const id of staleEditable) {
      const freshEv = freshById.get(id)
      if (freshEv && !freshEv.isEditable) return true
    }
    return false
  }

  const prevMonth = () => {
    if (month.value === 1) { month.value = 12; year.value-- }
    else month.value--
    loadCalendar()
  }

  const nextMonth = () => {
    if (month.value === 12) { month.value = 1; year.value++ }
    else month.value++
    loadCalendar()
  }

  const goAdd = (date: string) => {
    if (date) navigateTo(`/staff/content/internal-system/calendar/add?date=${date}`)
  }

  const goEvent = (ev: any) => {
    const params = new URLSearchParams()
    if (ev.isEditable) params.set('editable', '1')
    params.set('y', String(year.value))
    params.set('m', String(month.value))
    navigateTo(`/staff/content/internal-system/calendar/detail/${ev.calendarId}?${params.toString()}`)
  }

  // 跟隨游標的提示框（類似遊戲道具提示）
  const tooltipEvent = ref<any>(null)
  const hoveredCalId = ref<string | null>(null)
  const tooltipPos = reactive({ x: 0, y: 0 })
  const TOOLTIP_OFFSET = 18
  const TOOLTIP_WIDTH = 280
  const TOOLTIP_MAX_HEIGHT = 220

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

  const showTooltip = (ev: any, e: MouseEvent) => {
    tooltipEvent.value = ev
    hoveredCalId.value = ev.calendarId ?? null
    tooltipPos.x = e.clientX
    tooltipPos.y = e.clientY
  }

  const moveTooltip = (e: MouseEvent) => {
    tooltipPos.x = e.clientX
    tooltipPos.y = e.clientY
  }

  const hideTooltip = () => {
    tooltipEvent.value = null
    hoveredCalId.value = null
  }

  // ── 輸出為 TXT（給聖母行事曆管理「貼上 TXT」匯入用） ──────────────
  const copying = ref(false)
  const toast = reactive({ show: false, message: '' })
  let toastTimer: ReturnType<typeof setTimeout> | null = null

  function showToast(message: string) {
    toast.message = message
    toast.show = true
    if (toastTimer) clearTimeout(toastTimer)
    toastTimer = setTimeout(() => { toast.show = false }, 2400)
  }

  // 單位名稱需符合 calendar-edit.vue 解析格式（醫院 / 園區 / 芳心），其他單位（教會分支等）不輸出
  const TXT_TYPES = ['醫院', '園區', '芳心']

  // 把 YYYY-MM-DD 轉成不補零的 M/D（例如 2026-06-05 → 6/5）
  function formatMonthDay(dateStr: string): string {
    const parts = dateStr.split('-')
    if (parts.length !== 3) return dateStr
    return `${parseInt(parts[1], 10)}/${parseInt(parts[2], 10)}`
  }

  function buildCalendarTxt(): string {
    if (!calendarData.value?.days) return ''

    const lines: string[] = []
    lines.push(`${year.value}年${month.value}月`)

    // 掃過整月，把同一 calendarId 的所有出現天數彙整成一筆（記下第一天／最後一天，用來判斷單天或跨天）
    const firstDateByCalId: Record<string, string> = {}
    const lastDateByCalId: Record<string, string> = {}
    const occurrenceCount: Record<string, number> = {}
    const evByCalId: Record<string, any> = {}

    for (const dayData of calendarData.value.days) {
      for (const ev of (dayData.events || [])) {
        if (!TXT_TYPES.includes(ev.unit)) continue
        occurrenceCount[ev.calendarId] = (occurrenceCount[ev.calendarId] || 0) + 1
        if (!firstDateByCalId[ev.calendarId]) firstDateByCalId[ev.calendarId] = dayData.date
        lastDateByCalId[ev.calendarId] = dayData.date
        evByCalId[ev.calendarId] = ev
      }
    }

    // 依「第一次出現的日期 → 開始時間」排序，讓輸出仍照時間先後排列
    const calIds = Object.keys(evByCalId).sort((a, b) => {
      const dateA = firstDateByCalId[a]
      const dateB = firstDateByCalId[b]
      if (dateA !== dateB) return dateA < dateB ? -1 : 1
      return (evByCalId[a].startTime || '').localeCompare(evByCalId[b].startTime || '')
    })

    // 每筆活動獨立一行，行內直接寫出自己的完整日期（單天／跨天皆同），格式比照 tooltip
    for (const calId of calIds) {
      const ev = evByCalId[calId]
      const roomPart = [ev.locationCode, ev.location].filter(Boolean).join(' ')
      const bracket = [ev.person, roomPart].filter(Boolean).join(' ')
      const isMultiDay = (occurrenceCount[calId] || 0) > 1

      const dateTime = isMultiDay
              ? `${formatMonthDay(firstDateByCalId[calId])} ${ev.startTime} ～ ${formatMonthDay(lastDateByCalId[calId])}${ev.endTime ? ` ${ev.endTime}` : ''}`
              : `${formatMonthDay(firstDateByCalId[calId])} ${ev.startTime}${ev.endTime ? `–${ev.endTime}` : ''}`

      lines.push(`${dateTime} ${ev.title} (${bracket})${ev.unit}`)
    }

    // 備註區塊（calendar-edit.vue 支援「備 註 :」起始的區塊）
    // 來源 remarks 字串可能已自帶序號（例如「1.(2026-06-02-14:00)...」），
    // 此時不再重複加編號，避免變成「1.1.(...)」
    if (calendarData.value.remarks?.length) {
      lines.push('備 註 :')
      calendarData.value.remarks.forEach((r: string, i: number) => {
        const alreadyNumbered = /^\d+\.\s*/.test(r.trim())
        lines.push(alreadyNumbered ? r.trim() : `${i + 1}.${r}`)
      })
    }

    return lines.join('\n')
  }

  async function copyMonthAsTxt() {
    const text = buildCalendarTxt()
    if (!text || !calendarData.value?.days?.some((d: any) =>
            (d.events || []).some((ev: any) => TXT_TYPES.includes(ev.unit)))) {
      showToast('本月沒有可輸出的活動（醫院／園區／芳心）')
      return
    }

    copying.value = true
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text)
      } else {
        // 後備方案：部分舊瀏覽器或非 https 環境不支援 clipboard API
        const ta = document.createElement('textarea')
        ta.value = text
        ta.style.position = 'fixed'
        ta.style.opacity = '0'
        document.body.appendChild(ta)
        ta.select()
        document.execCommand('copy')
        document.body.removeChild(ta)
      }
      showToast(`已複製 ${year.value} 年 ${month.value} 月行事曆 TXT，可貼到「行事曆管理」匯入`)
    } catch (e) {
      showToast('複製失敗，請手動選取後複製')
    } finally {
      copying.value = false
    }
  }

  onMounted(loadCalendar)
</script>

<style scoped>
  .calendar-page {
    padding: 16px;
    max-width: 1400px;
    margin: 0 auto;
  }

  .sync-status {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .sync-badge {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 4px 10px;
    border-radius: 999px;
    font-size: 12px;
    font-weight: 500;
  }

  .sync-badge.syncing {
    background: var(--warn-light);
    color: var(--warn);
    border: 1px solid var(--warn);
  }

  .sync-badge.done {
    background: var(--accent-light);
    color: var(--accent);
    border: 1px solid var(--accent);
  }

  .sync-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: var(--warn);
    animation: pulse 1s infinite;
  }

  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.3; }
  }

  .cal-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 12px;
    flex-wrap: wrap;
    gap: 12px;
  }

  .cal-nav {
    display: flex;
    align-items: center;
    gap: 16px;
  }

  .cal-title {
    font-size: 22px;
    margin: 0;
    min-width: 140px;
    text-align: center;
  }

  .nav-btn {
    padding: 8px 16px;
    border: 1px solid var(--border);
    border-radius: 6px;
    background: var(--surface);
    color: var(--text);
    cursor: pointer;
    font-size: 14px;
    transition: background 0.2s;
  }
  .nav-btn:hover { background: var(--surface2); }

  .filter-bar {
    background: var(--surface2);
    border: 1px solid var(--border-light);
    border-radius: 10px;
    padding: 10px 16px;
    margin-bottom: 16px;
    display: flex;
    flex-wrap: wrap;
    gap: 16px;
    align-items: center;
  }

  .filter-select-group {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .filter-label {
    font-size: 13px;
    font-weight: 600;
    color: var(--text-muted);
    white-space: nowrap;
  }

  .filter-select {
    padding: 6px 10px;
    border: 1px solid var(--border);
    border-radius: 6px;
    background: var(--surface);
    color: var(--text);
    font-size: 13px;
    max-width: 220px;
  }
  .filter-select:focus {
    outline: none;
    border-color: var(--accent);
  }

  .person-filter {
    position: relative;
  }

  .person-dropdown-btn {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    cursor: pointer;
    min-width: 120px;
    text-align: left;
  }

  .dropdown-arrow {
    font-size: 11px;
    color: var(--text-hint);
    transition: transform 0.15s;
  }
  .dropdown-arrow.open {
    transform: rotate(180deg);
  }

  .person-dropdown-panel {
    position: absolute;
    top: calc(100% + 4px);
    left: 0;
    z-index: 20;
    min-width: 200px;
    max-height: 260px;
    overflow-y: auto;
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 8px;
    box-shadow: 0 10px 30px rgba(0,0,0,0.15);
    padding: 6px;
  }

  .person-option {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 6px 8px;
    font-size: 13px;
    color: var(--text);
    border-radius: 6px;
    cursor: pointer;
    white-space: nowrap;
  }
  .person-option:hover {
    background: var(--surface2);
  }

  .person-option input[type="checkbox"] {
    appearance: none;
    -webkit-appearance: none;
    width: 16px;
    height: 16px;
    flex-shrink: 0;
    margin: 0;
    border: 1.5px solid var(--border);
    border-radius: 4px;
    background: var(--surface);
    cursor: pointer;
    position: relative;
  }

  .person-option input[type="checkbox"]:checked {
    background: var(--warn);
    border-color: var(--warn);
  }

  .person-option input[type="checkbox"]:checked::after {
    content: '';
    position: absolute;
    left: 4.5px;
    top: 1px;
    width: 5px;
    height: 9px;
    border: solid white;
    border-width: 0 2px 2px 0;
    transform: rotate(45deg);
  }

  html.dark .person-option input[type="checkbox"] {
    background: var(--surface2);
    border-color: var(--text-hint);
  }

  html.dark .person-option input[type="checkbox"]:checked {
    background: #fb923c;
    border-color: #fb923c;
  }

  html.dark .person-option input[type="checkbox"]:checked::after {
    border-color: #1a1d24;
  }

  .person-option-all {
    font-weight: 600;
  }

  .person-option-divider {
    height: 1px;
    background: var(--border-light);
    margin: 4px 2px;
  }

  .legend {
    display: flex;
    gap: 16px;
    font-size: 12px;
    color: var(--text-muted);
    margin-bottom: 10px;
    padding: 0 4px;
  }
  .legend-item {
    display: flex;
    align-items: center;
    gap: 5px;
  }
  .legend-dot {
    width: 12px;
    height: 12px;
    border-radius: 2px;
    border-left: 3px solid;
    flex-shrink: 0;
  }
  .legend-dot.blue {
    background: var(--accent-light);
    border-left-color: #4a90d9;
  }
  .legend-dot.orange {
    background: var(--warn-light);
    border-left-color: var(--warn);
  }
  html.dark .legend-dot.orange {
    background: rgba(249, 115, 22, 0.22);
    border-left-color: #fb923c;
  }

  .loading, .error-banner {
    text-align: center;
    padding: 40px;
    color: var(--text-hint);
  }
  .error-banner { color: #e53e3e; }

  .cal-weekdays {
    display: grid;
    grid-template-columns: repeat(7, 1fr);
    background: #495969;
    color: white;
  }
  .weekday {
    text-align: center;
    padding: 10px;
    font-size: 14px;
  }

  .cal-grid {
    display: grid;
    grid-template-columns: repeat(7, 1fr);
    border-left: 1px solid var(--border-light);
    border-top: 1px solid var(--border-light);
  }

  /* 跨天長條：整段只有一個元素，用 width 一次跨滿所有天數（inline style 計算），
     只有活動真正的頭尾會有 left/圓角，中間完全沒有其他元素的邊界，不會有縫隙 */
  .event-item.multi-day-bar {
    box-sizing: border-box;
    overflow: hidden;
    line-height: 20px;
    white-space: nowrap;
    text-overflow: ellipsis;
    /* position/left/width/top/border-radius set by inline style */
  }

  .cal-cell {
    border-right: 1px solid var(--border-light);
    border-bottom: 1px solid var(--border-light);
    min-height: 100px;
    padding: 4px;
    background: var(--surface);
    overflow: visible;
    position: relative;
  }
  .cal-cell.empty { background: var(--surface2); }
  /* 不能用跟 .event-item 相同的 var(--accent-light) 當今天格背景，
     否則一般（非可編輯）活動會跟格子底色融在一起，看起來像黏成一塊。
     改用外框 + 日期圓圈高亮，格子底色維持跟其他天一致。 */
  .cal-cell.today {
    background: var(--surface);
    box-shadow: inset 0 0 0 2px var(--accent);
  }

  .day-num {
    font-size: 15px;
    font-weight: bold;
    color: var(--text);
    cursor: pointer;
    display: inline-block;
    padding: 2px 6px;
    border-radius: 50%;
    transition: background 0.15s;
  }
  .day-num:hover { background: var(--accent); color: white; }
  .cal-cell.today .day-num {
    background: var(--accent);
    color: white;
  }

  .event-list {
    margin-top: 4px;
    display: flex;
    flex-direction: column;
    gap: 2px;
    overflow: visible;
  }

  /* 一般活動：藍色系 */
  .event-item {
    font-size: 12px;
    padding: 2px 5px;
    border-radius: 3px;
    cursor: pointer;
    background: var(--accent-light);
    border-left: 3px solid #4a90d9;
    display: flex;
    flex-wrap: nowrap;
    gap: 3px;
    align-items: center;
    transition: background 0.15s;
    overflow: hidden;
    color: var(--text);
  }
  .event-item:hover { background: var(--surface2); }

  /* 可編輯活動：橘色系，明顯區別 */
  .event-item.editable {
    background: var(--warn-light);
    border-left: 3px solid var(--warn);
    color: #c2410c;
  }
  .event-item.editable:hover { background: #fed7aa; }

  html.dark .event-item.editable {
    background: rgba(249, 115, 22, 0.22);
    border-left: 3px solid #fb923c;
    color: #ffd9b3;
  }
  html.dark .event-item.editable:hover {
    background: rgba(249, 115, 22, 0.34);
  }

  .edit-icon {
    font-size: 10px;
    flex-shrink: 0;
  }

  .event-time {
    color: var(--text-hint);
    white-space: nowrap;
    font-size: 11px;
    flex-shrink: 0;
  }
  .event-item.editable .event-time { color: #92400e; }
  html.dark .event-item.editable .event-time { color: #ffcd99; }

  .event-title {
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .event-unit {
    font-size: 10px;
    background: #4a90d9;
    color: white;
    padding: 1px 4px;
    border-radius: 2px;
    flex-shrink: 0;
  }
  .event-item.editable .event-unit {
    background: #f97316;
  }

  .event-tooltip {
    position: fixed;
    z-index: 1000;
    width: 280px;
    background: var(--surface);
    color: var(--text);
    border: 1px solid var(--border);
    border-radius: 10px;
    box-shadow: 0 10px 30px rgba(0,0,0,0.3);
    padding: 14px 16px;
    font-size: 14px;
    line-height: 1.7;
    white-space: normal;
    text-align: left;
    pointer-events: none;
  }

  .tooltip-title {
    font-weight: 700;
    font-size: 16px;
    margin-bottom: 6px;
    word-break: break-word;
  }

  .tooltip-row {
    color: var(--text-muted);
    word-break: break-word;
  }

  .tooltip-hint {
    margin-top: 8px;
    color: var(--warn);
    font-size: 13px;
  }

  .remarks {
    margin-top: 20px;
    padding: 12px 16px;
    background: var(--warn-light);
    border: 1px solid var(--warn);
    border-radius: 8px;
    font-size: 13px;
    color: var(--text);
  }
  .copy-txt-btn {
    font-size: 13px;
    padding: 6px 12px;
    border-color: var(--accent);
    color: var(--accent);
    background: var(--surface);
    display: inline-flex;
    align-items: center;
    gap: 4px;
  }
  .copy-txt-btn:hover:not(:disabled) {
    background: var(--accent-light);
  }
  .copy-txt-btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .copy-toast {
    position: fixed;
    left: 50%;
    bottom: 28px;
    transform: translateX(-50%);
    background: #2d3748;
    color: white;
    padding: 12px 18px;
    border-radius: 10px;
    font-size: 13px;
    box-shadow: 0 8px 24px rgba(0,0,0,0.3);
    display: flex;
    align-items: center;
    gap: 8px;
    z-index: 1000;
    max-width: 90vw;
    text-align: left;
  }
  html.dark .copy-toast {
    background: #1a1d24;
    border: 1px solid var(--border);
  }
  .copy-toast-icon {
    color: #4ade80;
    font-weight: bold;
    flex-shrink: 0;
  }

  .toast-fade-enter-active, .toast-fade-leave-active {
    transition: opacity 0.25s, transform 0.25s;
  }
  .toast-fade-enter-from, .toast-fade-leave-to {
    opacity: 0;
    transform: translate(-50%, 8px);
  }
</style>