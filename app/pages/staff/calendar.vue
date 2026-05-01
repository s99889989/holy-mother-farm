<script setup>
definePageMeta({ layout: 'staff' })

const commonStore = useCommonStore()
const BASE = computed(() => commonStore.data.main_url + '/holy/calendar')

// ── 狀態 ──────────────────────────────────────────────────────────
const today        = new Date()
const currentYear  = ref(today.getFullYear())
const currentMonth = ref(today.getMonth() + 1)

const filterType     = ref('全部')
const filterLocation = ref('')      // 地點篩選，空字串 = 全部
const selectedEvent  = ref(null)
const listView       = ref(false)
const loading        = ref(false)

const allEvents    = ref([])   // 當月從 API 取回的活動
const currentNotes = ref([])   // 當月備注

// ── 計算 ──────────────────────────────────────────────────────────
const monthKey   = computed(() => `${currentYear.value}-${String(currentMonth.value).padStart(2, '0')}`)
const monthLabel = computed(() => `${currentYear.value} 年 ${currentMonth.value} 月`)

const monthEvents = computed(() => allEvents.value)

// 套用類型 + 地點兩層篩選
const filteredEvents = computed(() => {
  let list = monthEvents.value
  if (filterType.value !== '全部') list = list.filter(e => e.type === filterType.value)
  if (filterLocation.value)       list = list.filter(e => extractLocation(e.room) === filterLocation.value)
  return list
})

const typeCount = computed(() => {
  const counts = { 醫院: 0, 園區: 0, 芳心: 0 }
  monthEvents.value.forEach(e => { if (counts[e.type] !== undefined) counts[e.type]++ })
  return counts
})

// 從 room 欄位取出地點名稱（去掉前面的場地代碼 P0xxx / H0xxx）
// 範例："P0I10201 水電實習廠" → "水電實習廠"
//        "H0A10404 四樓會議室 " → "四樓會議室"
//        "" → 不顯示
function extractLocation(room) {
  if (!room || !room.trim()) return ''
  // 去掉開頭的場地代碼（英數字串）
  const cleaned = room.trim().replace(/^[A-Z0-9]+\s*/, '').trim()
  return cleaned || room.trim()
}

// 依目前選中的 type 動態產生可用地點清單（去重、排序、過濾空值）
const availableLocations = computed(() => {
  let base = monthEvents.value
  if (filterType.value !== '全部') base = base.filter(e => e.type === filterType.value)
  const locs = [...new Set(
    base.map(e => extractLocation(e.room)).filter(Boolean)
  )].sort((a, b) => a.localeCompare(b, 'zh-Hant'))
  return locs
})

// 切換 type 時，地點篩選自動 reset
function setFilterType(t) {
  filterType.value = t
  filterLocation.value = ''
}

const calendarDays = computed(() => {
  const year  = currentYear.value
  const month = currentMonth.value
  const firstDay    = new Date(year, month - 1, 1).getDay()
  const daysInMonth = new Date(year, month, 0).getDate()
  const cells = []
  for (let i = 0; i < firstDay; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)
  return cells
})

function eventsOnDay(day) {
  if (!day) return []
  const dateStr = `${currentYear.value}-${String(currentMonth.value).padStart(2, '0')}-${String(day).padStart(2, '0')}`
  return filteredEvents.value.filter(e => e.date === dateStr)
}

function isToday(day) {
  return day === today.getDate()
    && currentMonth.value === today.getMonth() + 1
    && currentYear.value  === today.getFullYear()
}

// hasData：只要當月有任何活動就算有資料
const hasData = computed(() => allEvents.value.length > 0)

const typeColor = { 醫院: 'hospital', 園區: 'park', 芳心: 'fragrant' }
function chipClass(type) { return typeColor[type] || 'park' }

const sortedEvents = computed(() =>
  [...filteredEvents.value].sort((a, b) =>
    a.date.localeCompare(b.date) || a.time.localeCompare(b.time)
  )
)

// ── API ───────────────────────────────────────────────────────────
// GET /holy/calendar/list?yearMonth=YYYY-MM  → CalendarEvent[]
async function fetchEvents() {
  loading.value = true
  allEvents.value = []
  try {
    const res = await fetch(`${BASE.value}/list?yearMonth=${monthKey.value}`)
    allEvents.value = res.ok ? await res.json() : []
  } catch (e) {
    console.error('行事曆載入失敗', e)
  } finally {
    loading.value = false
  }
}

// GET /holy/calendar/notes?yearMonth=YYYY-MM  → String[]
async function fetchNotes() {
  currentNotes.value = []
  try {
    const res = await fetch(`${BASE.value}/notes?yearMonth=${monthKey.value}`)
    currentNotes.value = res.ok ? await res.json() : []
  } catch (e) {
    console.error('備注載入失敗', e)
  }
}

// ── 月份切換 ──────────────────────────────────────────────────────
function prevMonth() {
  if (currentMonth.value === 1) { currentMonth.value = 12; currentYear.value-- }
  else currentMonth.value--
}
function nextMonth() {
  if (currentMonth.value === 12) { currentMonth.value = 1; currentYear.value++ }
  else currentMonth.value++
}

// 切換月份時重新拉資料
watch(monthKey, () => {
  fetchEvents()
  fetchNotes()
})

onMounted(() => {
  fetchEvents()
  fetchNotes()
})
</script>

<template>
  <div class="cal-wrap">
    <!-- ── Header ── -->
    <header class="cal-header">
      <div class="cal-header-inner">
        <div class="cal-brand">
          <span class="cal-brand-icon">📅</span>
          <div>
            <h1 class="cal-title">行事曆</h1>
            <p class="cal-subtitle">聖母健康農莊 · 員工專區</p>
          </div>
        </div>
        <div class="cal-header-actions">
          <button @click="listView = !listView" class="view-toggle" :class="{ active: listView }">
            <span v-if="listView">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>
            </span>
            <span v-else>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
            </span>
          </button>
        </div>
      </div>
    </header>

    <div class="cal-body">
      <!-- ── 月份 + 篩選 同一排 ── -->
      <div class="nav-filter-row">
        <!-- 月份切換 -->
        <div class="month-nav">
          <button @click="prevMonth" class="nav-btn">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M15 18l-6-6 6-6"/></svg>
          </button>
          <div class="month-label">
            <span class="month-text">{{ monthLabel }}</span>
            <span v-if="!hasData && !loading" class="no-data-badge">無資料</span>
          </div>
          <button @click="nextMonth" class="nav-btn">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M9 18l6-6-6-6"/></svg>
          </button>
        </div>

        <!-- 篩選：類型 -->
        <div class="filter-bar">
          <button
            v-for="t in ['全部', '醫院', '園區', '芳心']"
            :key="t"
            @click="setFilterType(t)"
            :class="['filter-btn', `filter-${t === '全部' ? 'all' : typeColor[t]}`, filterType === t ? 'active' : '']"
          >
            {{ t }}
            <span class="filter-count">
              {{ t === '全部' ? monthEvents.length : (typeCount[t] || 0) }}
            </span>
          </button>
        </div>
      </div>

      <!-- ── 地點篩選 ── -->
      <div v-if="availableLocations.length" class="location-bar">
        <button
          :class="['loc-btn', filterLocation === '' ? 'active' : '']"
          @click="filterLocation = ''"
        >全部地點</button>
        <button
          v-for="loc in availableLocations"
          :key="loc"
          :class="['loc-btn', filterLocation === loc ? 'active' : '']"
          @click="filterLocation = loc"
        >{{ loc }}</button>
      </div>

      <!-- ── 載入中 ── -->
      <div v-if="loading" class="loading-bar">
        <div class="loading-shimmer"></div>
      </div>

      <!-- ── 月曆視圖 ── -->
      <template v-if="!listView">
        <!-- 星期標頭 + 日曆格合併成同一 grid，確保永遠對齊 -->
        <div class="calendar-grid">
          <!-- 星期標頭（固定第一排） -->
          <div v-for="d in ['日','一','二','三','四','五','六']" :key="'h'+d"
               class="weekday-cell" :class="d === '日' ? 'sun' : d === '六' ? 'sat' : ''">
            {{ d }}
          </div>

          <!-- 日期格子 -->
          <div
            v-for="(day, idx) in calendarDays"
            :key="idx"
            class="day-cell"
            :class="{
              empty: !day,
              today: isToday(day),
              weekend: day && (idx % 7 === 0 || idx % 7 === 6),
              'has-events': day && eventsOnDay(day).length > 0
            }"
          >
            <template v-if="day">
              <span class="day-num">{{ day }}</span>
              <div class="event-chips">
                <div
                  v-for="(ev, ei) in eventsOnDay(day).slice(0, 3)"
                  :key="ei"
                  :class="['event-chip', chipClass(ev.type)]"
                  @click="selectedEvent = ev"
                >
                  <span class="chip-time">{{ ev.time.split('-')[0] }}</span>
                  <span class="chip-title">{{ ev.title }}</span>
                </div>
                <div
                  v-if="eventsOnDay(day).length > 3"
                  class="event-more"
                  @click="selectedEvent = eventsOnDay(day)[3]"
                >
                  +{{ eventsOnDay(day).length - 3 }} 更多
                </div>
              </div>
            </template>
          </div>
        </div>
      </template>

      <!-- ── 清單視圖 ── -->
      <template v-else>
        <div class="list-view">
          <div v-if="sortedEvents.length === 0" class="list-empty">本月無活動</div>
          <template v-else>
            <div
              v-for="(ev, i) in sortedEvents"
              :key="i"
              class="list-item"
              @click="selectedEvent = ev"
            >
              <div :class="['list-type-bar', chipClass(ev.type)]"></div>
              <div class="list-date-col">
                <span class="list-day">{{ parseInt(ev.date.split('-')[2]) }}</span>
                <span class="list-month">{{ parseInt(ev.date.split('-')[1]) }}月</span>
              </div>
              <div class="list-info">
                <p class="list-item-title">{{ ev.title }}</p>
                <p class="list-item-meta">{{ ev.time }} · {{ ev.owner }}</p>
                <p v-if="ev.room" class="list-item-room">{{ ev.room }}</p>
              </div>
              <span :class="['list-badge', chipClass(ev.type)]">{{ ev.type }}</span>
            </div>
          </template>
        </div>
      </template>

      <!-- ── 備注 ── -->
      <div v-if="currentNotes.length" class="notes-section">
        <div class="notes-header">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
          備注事項
        </div>
        <div class="notes-list">
          <div v-for="(n, i) in currentNotes" :key="i" class="note-item">
            <span class="note-dot">▪</span>
            {{ n }}
          </div>
        </div>
      </div>
    </div>

    <!-- ── 活動詳情 Drawer ── -->
    <Transition name="slide">
      <div v-if="selectedEvent" class="event-overlay" @click.self="selectedEvent = null">
        <div class="event-drawer">
          <div class="drawer-handle"></div>
          <div :class="['drawer-type-strip', chipClass(selectedEvent.type)]"></div>
          <div class="drawer-content">
            <div class="drawer-header">
              <span :class="['drawer-badge', chipClass(selectedEvent.type)]">{{ selectedEvent.type }}</span>
              <button class="drawer-close" @click="selectedEvent = null">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
            <h2 class="drawer-title">{{ selectedEvent.title }}</h2>
            <div class="drawer-meta-list">
              <div class="drawer-meta-row">
                <span class="meta-icon">📅</span>
                <span>{{ selectedEvent.date }}</span>
              </div>
              <div class="drawer-meta-row">
                <span class="meta-icon">🕐</span>
                <span>{{ selectedEvent.time }}</span>
              </div>
              <div class="drawer-meta-row">
                <span class="meta-icon">👤</span>
                <span>{{ selectedEvent.owner }}</span>
              </div>
              <div v-if="selectedEvent.room" class="drawer-meta-row">
                <span class="meta-icon">📍</span>
                <span>{{ selectedEvent.room }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
/* ── Loading ── */
.loading-bar {
  height: 3px;
  background: #e8e3dc;
  border-radius: 2px;
  overflow: hidden;
  margin-bottom: 12px;
}
.loading-shimmer {
  height: 100%;
  width: 40%;
  background: linear-gradient(90deg, #3d6b52 0%, #6b9e7f 50%, #3d6b52 100%);
  border-radius: 2px;
  animation: shimmer 1.2s ease-in-out infinite;
}
@keyframes shimmer {
  0%   { transform: translateX(-150%); }
  100% { transform: translateX(350%); }
}

/* ── 基底 ── */
.cal-wrap {
  min-height: 100vh;
  background: #f5f3ef;
  font-family: 'Noto Sans TC', 'PingFang TC', sans-serif;
}
:root.dark .cal-wrap { background: #18181b; }

/* ── Header ── */
.cal-header {
  background: #fff;
  border-bottom: 1px solid #e8e3dc;
  position: sticky;
  top: 0;
  z-index: 20;
}
:root.dark .cal-header { background: #27272a; border-color: #3f3f46; }
.cal-header-inner {
  max-width: 900px;
  margin: 0 auto;
  padding: 12px 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.cal-brand { display: flex; align-items: center; gap: 10px; }
.cal-brand-icon {
  width: 36px; height: 36px;
  background: linear-gradient(135deg, #3d6b52, #2a4f3a);
  border-radius: 10px;
  display: flex; align-items: center; justify-content: center;
  font-size: 18px; flex-shrink: 0;
}
.cal-title {
  font-size: 15px; font-weight: 700;
  color: #1c1917;
  line-height: 1;
}
:root.dark .cal-title { color: #f5f5f4; }
.cal-subtitle {
  font-size: 11px; color: #a8a29e; margin-top: 2px;
}

.view-toggle {
  width: 34px; height: 34px;
  border: 1px solid #e2ddd8;
  border-radius: 8px;
  background: #faf9f7;
  color: #78716c;
  display: flex; align-items: center; justify-content: center;
  cursor: pointer;
  transition: all .15s;
}
.view-toggle:hover, .view-toggle.active {
  background: #3d6b52; color: #fff; border-color: #3d6b52;
}
:root.dark .view-toggle { background: #3f3f46; border-color: #52525b; color: #a1a1aa; }

/* ── Body ── */
.cal-body {
  max-width: 900px;
  margin: 0 auto;
  padding: 16px 12px 40px;
}

/* ── Month Nav ── */
.month-nav {
  display: flex; align-items: center; gap: 12px;
  justify-content: center;
  margin-bottom: 14px;
}
.nav-btn {
  width: 36px; height: 36px;
  border: 1px solid #e2ddd8;
  border-radius: 50%;
  background: #fff;
  color: #57534e;
  display: flex; align-items: center; justify-content: center;
  cursor: pointer;
  transition: all .15s;
}
.nav-btn:hover { background: #3d6b52; color: #fff; border-color: #3d6b52; }
:root.dark .nav-btn { background: #3f3f46; border-color: #52525b; color: #d4d4d8; }
.month-label { display: flex; align-items: center; gap: 8px; min-width: 140px; justify-content: center; }
.month-text { font-size: 18px; font-weight: 700; color: #1c1917; letter-spacing: .5px; }
:root.dark .month-text { color: #f5f5f4; }
.no-data-badge {
  font-size: 11px; background: #fef3c7; color: #92400e;
  border-radius: 6px; padding: 2px 7px; font-weight: 600;
}

/* ── Filter ── */
.filter-bar {
  display: flex; gap: 8px;
  margin-bottom: 14px;
  flex-wrap: wrap;
}
.filter-btn {
  display: flex; align-items: center; gap: 5px;
  padding: 6px 13px;
  border-radius: 20px;
  font-size: 13px; font-weight: 500;
  border: 1.5px solid transparent;
  cursor: pointer;
  transition: all .15s;
  background: #fff;
  color: #57534e;
  border-color: #e2ddd8;
}
:root.dark .filter-btn { background: #27272a; color: #a1a1aa; border-color: #3f3f46; }
.filter-count {
  font-size: 11px; opacity: .65;
  background: rgba(0,0,0,.06);
  border-radius: 10px;
  padding: 0 5px;
  min-width: 18px; text-align: center;
}
.filter-btn.active.filter-all { background: #1c1917; color: #fff; border-color: #1c1917; }
.filter-btn.active.filter-hospital { background: #e0534a; color: #fff; border-color: #e0534a; }
.filter-btn.active.filter-park { background: #3d6b52; color: #fff; border-color: #3d6b52; }
.filter-btn.active.filter-fragrant { background: #a06080; color: #fff; border-color: #a06080; }

/* ── Calendar Grid（含星期標頭，同一 grid 確保對齊）── */
.calendar-grid {
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
  gap: 3px;
}
.weekday-cell {
  text-align: center;
  font-size: 11px; font-weight: 600;
  color: #a8a29e;
  padding: 6px 0;
  letter-spacing: .5px;
}
.weekday-cell.sun { color: #e0534a; }
.weekday-cell.sat { color: #5b7fc4; }
.day-cell {
  min-height: 90px;
  background: #fff;
  border-radius: 8px;
  padding: 6px 5px 5px;
  position: relative;
  transition: box-shadow .15s;
}
:root.dark .day-cell { background: #27272a; }
/* 空格子：不顯示背景，但高度保持和其他格子一致以撐開 row */
.day-cell.empty { background: transparent; visibility: hidden; }
.day-cell.weekend { background: #faf6f2; }
:root.dark .day-cell.weekend { background: #232325; }
.day-cell.has-events { box-shadow: 0 1px 4px rgba(0,0,0,.06); }
.day-cell.today .day-num {
  background: #3d6b52;
  color: #fff;
  border-radius: 50%;
  width: 22px; height: 22px;
  display: flex; align-items: center; justify-content: center;
  font-weight: 700;
}
.day-num {
  font-size: 12px; font-weight: 600;
  color: #57534e;
  line-height: 1;
  display: inline-block;
  margin-bottom: 4px;
}
:root.dark .day-num { color: #d4d4d8; }
.weekend .day-num { color: #e0534a; }
:root.dark .weekend .day-num { color: #f87171; }

/* Event chips */
.event-chips { display: flex; flex-direction: column; gap: 2px; }
.event-chip {
  display: flex; gap: 3px; align-items: baseline;
  border-radius: 4px;
  padding: 2px 4px;
  cursor: pointer;
  transition: opacity .1s;
  overflow: hidden;
}
.event-chip:hover { opacity: .8; }
.event-chip.hospital { background: #fee2e2; }
.event-chip.park { background: #dcfce7; }
.event-chip.fragrant { background: #fce7f3; }
:root.dark .event-chip.hospital { background: #4d2323; }
:root.dark .event-chip.park { background: #1a3a26; }
:root.dark .event-chip.fragrant { background: #3b1a2e; }
.chip-time {
  font-size: 9px; font-weight: 700; flex-shrink: 0;
  color: #78716c;
  font-variant-numeric: tabular-nums;
}
.event-chip.hospital .chip-time { color: #c0392b; }
.event-chip.park .chip-time { color: #2d6a46; }
.event-chip.fragrant .chip-time { color: #9d4f78; }
.chip-title {
  font-size: 10px;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  color: #44403c;
  flex: 1;
  min-width: 0;
}
:root.dark .chip-title { color: #d4d4d8; }
.event-more {
  font-size: 10px; color: #a8a29e;
  padding: 1px 4px; cursor: pointer;
}

/* ── List View ── */
.list-view { display: flex; flex-direction: column; gap: 6px; }
.list-empty { text-align: center; color: #a8a29e; padding: 40px 0; font-size: 14px; }
.list-item {
  background: #fff;
  border-radius: 10px;
  display: flex; align-items: stretch;
  overflow: hidden;
  cursor: pointer;
  box-shadow: 0 1px 3px rgba(0,0,0,.06);
  transition: transform .12s, box-shadow .12s;
}
:root.dark .list-item { background: #27272a; }
.list-item:hover { transform: translateX(2px); box-shadow: 0 2px 8px rgba(0,0,0,.1); }
.list-type-bar { width: 4px; flex-shrink: 0; }
.list-type-bar.hospital { background: #e0534a; }
.list-type-bar.park { background: #3d6b52; }
.list-type-bar.fragrant { background: #a06080; }
.list-date-col {
  width: 48px; flex-shrink: 0;
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  background: #faf9f7; padding: 10px 6px;
  border-right: 1px solid #f0ece6;
}
:root.dark .list-date-col { background: #1f1f22; border-color: #3f3f46; }
.list-day { font-size: 20px; font-weight: 800; color: #1c1917; line-height: 1; }
:root.dark .list-day { color: #f5f5f4; }
.list-month { font-size: 10px; color: #a8a29e; margin-top: 2px; }
.list-info { flex: 1; padding: 10px 10px 10px 12px; min-width: 0; }
.list-item-title { font-size: 13px; font-weight: 600; color: #1c1917; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
:root.dark .list-item-title { color: #f5f5f4; }
.list-item-meta { font-size: 11px; color: #a8a29e; margin-top: 2px; }
.list-item-room { font-size: 10px; color: #c4bdb5; margin-top: 1px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.list-badge {
  flex-shrink: 0; align-self: center;
  font-size: 10px; font-weight: 600;
  padding: 2px 7px; border-radius: 10px; margin-right: 10px;
}
.list-badge.hospital { background: #fee2e2; color: #c0392b; }
.list-badge.park { background: #dcfce7; color: #2d6a46; }
.list-badge.fragrant { background: #fce7f3; color: #9d4f78; }

/* ── Notes ── */
.notes-section { margin-top: 20px; }
.notes-header {
  display: flex; align-items: center; gap: 6px;
  font-size: 12px; font-weight: 600;
  color: #78716c;
  padding: 0 0 6px 0;
}
:root.dark .notes-header { color: #a1a1aa; }
.notes-list {
  background: #fff8e8;
  border: 1px solid #f0e4ba;
  border-radius: 10px;
  padding: 10px 14px;
  margin-top: 6px;
}
:root.dark .notes-list { background: #2a2516; border-color: #4a3e20; }
.note-item {
  font-size: 12px; color: #78716c; line-height: 1.7;
  display: flex; gap: 6px;
}
:root.dark .note-item { color: #d4c98a; }
.note-dot { flex-shrink: 0; color: #c8a84b; }

/* ── Event Overlay & Drawer ── */
.event-overlay {
  position: fixed; inset: 0;
  background: rgba(0,0,0,.45);
  z-index: 50;
  display: flex; align-items: flex-end;
}
.event-drawer {
  width: 100%;
  background: #fff;
  border-radius: 20px 20px 0 0;
  overflow: hidden;
  max-height: 80vh;
}
:root.dark .event-drawer { background: #27272a; }
.drawer-handle {
  width: 36px; height: 4px;
  background: #e2ddd8; border-radius: 2px;
  margin: 12px auto 0;
}
:root.dark .drawer-handle { background: #3f3f46; }
.drawer-type-strip { height: 3px; }
.drawer-type-strip.hospital { background: #e0534a; }
.drawer-type-strip.park { background: #3d6b52; }
.drawer-type-strip.fragrant { background: #a06080; }
.drawer-content { padding: 16px 20px 32px; }
.drawer-header {
  display: flex; align-items: center; justify-content: space-between;
  margin-bottom: 10px;
}
.drawer-badge {
  font-size: 12px; font-weight: 600;
  padding: 3px 10px; border-radius: 12px;
}
.drawer-badge.hospital { background: #fee2e2; color: #c0392b; }
.drawer-badge.park { background: #dcfce7; color: #2d6a46; }
.drawer-badge.fragrant { background: #fce7f3; color: #9d4f78; }
.drawer-close {
  width: 32px; height: 32px; border-radius: 50%;
  border: 1px solid #e2ddd8; background: #faf9f7;
  display: flex; align-items: center; justify-content: center;
  cursor: pointer; color: #78716c;
  transition: all .15s;
}
:root.dark .drawer-close { background: #3f3f46; border-color: #52525b; color: #a1a1aa; }
.drawer-close:hover { background: #f87171; color: #fff; border-color: #f87171; }
.drawer-title {
  font-size: 20px; font-weight: 700;
  color: #1c1917; line-height: 1.3;
  margin-bottom: 16px;
}
:root.dark .drawer-title { color: #f5f5f4; }
.drawer-meta-list { display: flex; flex-direction: column; gap: 10px; }
.drawer-meta-row {
  display: flex; align-items: flex-start; gap: 10px;
  font-size: 14px; color: #44403c;
}
:root.dark .drawer-meta-row { color: #d4d4d8; }
.meta-icon { font-size: 16px; flex-shrink: 0; margin-top: -1px; }

/* ── Transition ── */
.slide-enter-active, .slide-leave-active { transition: opacity .2s; }
.slide-enter-active .event-drawer, .slide-leave-active .event-drawer { transition: transform .25s cubic-bezier(.32,.72,0,1); }
.slide-enter-from { opacity: 0; }
.slide-enter-from .event-drawer { transform: translateY(100%); }
.slide-leave-to { opacity: 0; }
.slide-leave-to .event-drawer { transform: translateY(100%); }

/* ── Location bar ── */
.location-bar {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  margin-bottom: 12px;
  padding: 8px 12px;
  background: #fff;
  border-radius: 12px;
  border: 1px solid #e8e3dc;
}
:root.dark .location-bar {
  background: #27272a;
  border-color: #3f3f46;
}
.loc-btn {
  padding: 4px 11px;
  border-radius: 16px;
  font-size: 12px;
  font-weight: 500;
  border: 1.5px solid #e2ddd8;
  background: transparent;
  color: #78716c;
  cursor: pointer;
  transition: all .15s;
  white-space: nowrap;
}
:root.dark .loc-btn {
  border-color: #52525b;
  color: #a1a1aa;
}
.loc-btn:hover {
  border-color: #3d6b52;
  color: #3d6b52;
}
.loc-btn.active {
  background: #3d6b52;
  border-color: #3d6b52;
  color: #fff;
}

/* ── RWD ── */
@media (max-width: 640px) {
  .day-cell { min-height: 70px; padding: 4px 3px 3px; }
  .chip-time { display: none; }
  .chip-title { font-size: 9px; }
  .drawer-title { font-size: 17px; }
}
@media (min-width: 641px) {
  .event-overlay { align-items: center; justify-content: center; }
  .event-drawer {
    max-width: 480px; border-radius: 20px;
    max-height: 70vh;
  }
}
</style>
