<template>
  <div class="schedule-app">
    <!-- Header -->
    <div class="app-header">
      <div class="header-left">
        <h1 class="title">
          <span class="title-org">聖母健康農莊</span>
          <span class="title-divider">／</span>
          <span class="title-dept" v-if="selectedDept">{{ selectedDept }}</span>
          <span class="title-dept placeholder" v-else>請選擇部門</span>
        </h1>
        <div class="subtitle">{{ currentYear }}年{{ currentMonth }}月份班表</div>
      </div>
      <div class="header-right">
        <div class="month-nav">
          <button class="nav-btn" @click="changeMonth(-1)">&#8249;</button>
          <span class="month-label">{{ currentYear }} / {{ String(currentMonth).padStart(2,'0') }}</span>
          <button class="nav-btn" @click="changeMonth(1)">&#8250;</button>
        </div>
        <div class="dept-select-wrap">
          <select v-model="selectedDept" class="dept-select">
            <option value="">選擇部門</option>
            <option v-for="d in departments" :key="d.name" :value="d.name">{{ d.name }}</option>
          </select>
        </div>
        <div class="view-toggle">
          <button :class="['toggle-btn', view === 'table' ? 'active' : '']" @click="view = 'table'">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><rect x="1" y="1" width="6" height="4" rx="0.5"/><rect x="9" y="1" width="6" height="4" rx="0.5"/><rect x="1" y="7" width="6" height="4" rx="0.5"/><rect x="9" y="7" width="6" height="4" rx="0.5"/><rect x="1" y="13" width="6" height="2" rx="0.5"/><rect x="9" y="13" width="6" height="2" rx="0.5"/></svg>
            班表
          </button>
          <button :class="['toggle-btn', view === 'calendar' ? 'active' : '']" @click="view = 'calendar'">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><rect x="1" y="3" width="14" height="12" rx="1" fill="none" stroke="currentColor" stroke-width="1.5"/><line x1="5" y1="1" x2="5" y2="5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><line x1="11" y1="1" x2="11" y2="5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><line x1="1" y1="7" x2="15" y2="7" stroke="currentColor" stroke-width="1"/></svg>
            日曆
          </button>
        </div>
      </div>
    </div>

    <!-- Legend -->
    <div class="legend-bar">
      <span v-for="l in legends" :key="l.code" class="legend-item">
        <span :class="['legend-badge', `badge-${l.code.toLowerCase()}`]">{{ l.code }}</span>
        <span class="legend-text">{{ l.label }}</span>
      </span>
    </div>

    <!-- No dept selected -->
    <div v-if="!selectedDept" class="empty-state">
      <div class="empty-icon">📋</div>
      <div class="empty-text">請選擇部門以查看班表</div>
    </div>

    <!-- TABLE VIEW -->
    <div v-else-if="view === 'table'" class="table-wrap">
      <div class="table-scroll">
        <table class="schedule-table">
          <thead>
            <tr class="header-row-1">
              <th class="col-name" rowspan="2">姓名</th>
              <th v-for="d in daysInMonth" :key="d"
                  :class="['col-day', getDayClass(d)]">
                {{ d }}
              </th>
              <th class="col-summary" colspan="2">本月排休</th>
            </tr>
            <tr class="header-row-2">
              <th v-for="d in daysInMonth" :key="d"
                  :class="['col-weekday', getDayClass(d)]">
                {{ getWeekdayShort(d) }}
              </th>
              <th class="col-summary-sub">應休</th>
              <th class="col-summary-sub">實休</th>
            </tr>
          </thead>
          <tbody>
            <template v-for="emp in currentDeptEmployees" :key="emp.id">
              <tr class="emp-row">
                <td class="cell-name">
                  <div class="emp-name">{{ emp.name }}</div>
                  <div class="emp-id">{{ emp.id }}</div>
                </td>
                <td v-for="d in daysInMonth" :key="d"
                    :class="['cell-day', getDayClass(d), getCellClass(emp.schedule[d])]"
                    @click="openEditCell(emp, d)"
                    :title="`${emp.name} ${currentMonth}/${d} - 點擊編輯`">
                  <span v-if="emp.schedule[d]" :class="['cell-badge', `badge-${(emp.schedule[d]||'').toLowerCase()}`]">
                    {{ emp.schedule[d] }}
                  </span>
                </td>
                <td class="cell-summary">{{ countExpected(emp) }}</td>
                <td class="cell-summary">{{ countActual(emp) }}</td>
              </tr>
            </template>
          </tbody>
        </table>
      </div>
    </div>

    <!-- CALENDAR VIEW -->
    <div v-else-if="view === 'calendar'" class="calendar-wrap">
      <!-- Employee filter for calendar -->
      <div class="cal-filter">
        <span class="cal-filter-label">顯示員工：</span>
        <label v-for="emp in currentDeptEmployees" :key="emp.id" class="cal-emp-toggle">
          <input type="checkbox" :value="emp.id" v-model="calSelectedEmps">
          <span class="cal-emp-name">{{ emp.name }}</span>
        </label>
      </div>

      <div class="calendar-grid">
        <div class="cal-header-row">
          <div v-for="wd in weekdays" :key="wd" :class="['cal-header-cell', wd === '日' || wd === '六' ? 'weekend' : '']">
            星期{{ wd }}
          </div>
        </div>
        <div class="cal-body">
          <!-- leading blank cells -->
          <div v-for="n in leadingBlanks" :key="'b'+n" class="cal-day-cell empty"></div>
          <!-- day cells -->
          <div v-for="d in daysInMonth" :key="d"
               :class="['cal-day-cell', getDayClass(d), isToday(d) ? 'today' : '']">
            <div class="cal-day-num">
              <span>{{ d }}</span>
              <span class="cal-lunar" v-if="lunarDates[d]">{{ lunarDates[d] }}</span>
              <span class="cal-holiday-label" v-if="holidayLabels[d]">{{ holidayLabels[d] }}</span>
              <span class="cal-work-label" v-else-if="!isWeekend(d)">工作日</span>
            </div>
            <div class="cal-emp-list">
              <template v-for="emp in calFilteredEmps" :key="emp.id">
                <div v-if="emp.schedule[d]"
                     :class="['cal-emp-entry', `badge-${(emp.schedule[d]||'').toLowerCase()}`]"
                     @click="openEditCell(emp, d)">
                  <span class="cal-emp-entry-name">{{ emp.name }}</span>
                  <span class="cal-emp-entry-badge">{{ emp.schedule[d] }}</span>
                </div>
              </template>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Edit Modal -->
    <div v-if="editModal.open" class="modal-overlay" @click.self="editModal.open = false">
      <div class="modal-box">
        <div class="modal-header">
          <span class="modal-title">編輯排休</span>
          <button class="modal-close" @click="editModal.open = false">✕</button>
        </div>
        <div class="modal-body">
          <div class="modal-info">
            <span class="modal-emp">{{ editModal.emp?.name }}</span>
            <span class="modal-date">{{ currentMonth }}月{{ editModal.day }}日（{{ editModal.weekday }}）</span>
          </div>
          <div class="modal-options">
            <button v-for="opt in editOptions" :key="opt.code"
                    :class="['opt-btn', `badge-${opt.code.toLowerCase()}`, editModal.value === opt.code ? 'selected' : '']"
                    @click="editModal.value = opt.code">
              {{ opt.code }} {{ opt.label }}
            </button>
            <button :class="['opt-btn opt-clear', editModal.value === '' ? 'selected' : '']"
                    @click="editModal.value = ''">
              — 清除
            </button>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn-cancel" @click="editModal.open = false">取消</button>
          <button class="btn-save" @click="saveEdit">儲存</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, reactive } from 'vue'

// ── State ──────────────────────────────────────────────
const view = ref('table')
const currentYear = ref(2026)
const currentMonth = ref(6)
const selectedDept = ref('健康餐飲組')
const calSelectedEmps = ref([])

// ── Static data ────────────────────────────────────────
const legends = [
  { code: '休', label: '休假日' },
  { code: '例', label: '例假日' },
  { code: '假', label: '國定假日' },
  { code: '積', label: '積休' },
  { code: '特', label: '特休' },
  { code: '半', label: '半天' },
  { code: '公', label: '公假' },
  { code: '原', label: '原假' },
]

const editOptions = [
  { code: '休', label: '休假' },
  { code: '例', label: '例假' },
  { code: '假', label: '國定假' },
  { code: '積', label: '積休' },
  { code: '特', label: '特休' },
  { code: '半', label: '半天' },
  { code: '公', label: '公假' },
  { code: '原', label: '原假' },
  { code: '加', label: '加班' },
  { code: 'V', label: 'V' },
]

const weekdays = ['日','一','二','三','四','五','六']

// 2026-06 lunar approximation (illustrative)
const lunarDates = {
  1:'十六', 2:'十七', 3:'十八', 4:'十九', 5:'二十', 6:'廿一',
  7:'廿二', 8:'廿三', 9:'廿四', 10:'廿五', 11:'廿六', 12:'廿七',
  13:'廿八', 14:'廿九', 15:'五月', 16:'初二', 17:'初三', 18:'初四',
  19:'初五', 20:'初六', 21:'初七', 22:'初八', 23:'初九', 24:'初十',
  25:'十一', 26:'十二', 27:'十三', 28:'十四', 29:'十五', 30:'十六',
}

const holidayLabels = {
  19: '端午節',
}

// 2026-06 weekends: 6,7,13,14,19(端午補),20,21,27,28
const weekendDays = new Set([6,7,13,14,20,21,27,28])
// day 1 = 一 (Monday), so day 6 = 六, day 7 = 日
// June 2026 starts on Monday
const startWeekday = 1 // 0=Sun,1=Mon,...

// ── Department data ────────────────────────────────────
const departments = reactive([
  {
    name: '健康餐飲組',
    employees: [
      { name: '林萬玉', id: 'F00029', schedule: { 1:'休', 5:'例', 8:'休', 12:'例', 18:'休', 19:'休', 20:'例', 23:'休', 27:'例' } },
      { name: '郭婕妤', id: 'F00227', schedule: { 3:'休', 5:'例', 6:'休', 7:'積', 12:'例', 18:'休', 19:'休', 20:'例', 22:'休', 27:'例' } },
      { name: '黃秋珍', id: 'A00026', schedule: { 2:'下', 3:'特', 4:'特', 5:'特', 6:'休', 7:'例', 11:'休', 12:'例', 18:'休', 19:'休', 20:'例', 24:'休', 27:'例' } },
      { name: '陶彩萍', id: 'F00210', schedule: { 2:'休', 5:'例', 9:'休', 12:'例', 18:'休', 19:'休', 20:'例', 22:'休', 27:'例' } },
      { name: '郭儀珍', id: 'F00216', schedule: { 4:'休', 5:'特', 6:'例', 8:'休', 12:'例', 16:'積', 18:'休', 19:'休', 20:'例', 21:'休', 27:'例' } },
      { name: '張小娟', id: 'F00009', schedule: { 5:'休', 6:'例', 11:'休', 12:'例', 18:'休', 19:'休', 20:'例', 24:'休', 27:'例' } },
      { name: '陳治國', id: 'F00036', schedule: { 1:'休', 4:'休', 5:'休', 6:'例', 7:'半', 11:'休', 12:'休', 13:'例', 14:'半', 18:'休', 19:'休', 20:'例', 21:'休', 25:'休', 27:'例', 28:'休' } },
    ]
  },
  {
    name: '服務中心',
    employees: [
      { name: '賈德蘭', id: 'A00208', schedule: { 5:'休', 6:'公', 7:'例', 12:'休', 13:'例', 19:'假', 20:'休', 21:'例', 27:'休', 28:'例' } },
      { name: '施秀秀', id: 'F00225', schedule: { 3:'休', 7:'例', 8:'休', 9:'積', 13:'例', 15:'積', 19:'假', 20:'休', 21:'例', 28:'例' } },
      { name: '吳宣澔', id: 'F00228', schedule: { 6:'休', 7:'例', 12:'休', 13:'例', 17:'積', 19:'假', 20:'休', 21:'例', 27:'休', 28:'例' } },
      { name: '林瓊華', id: 'F00231', schedule: { 2:'休', 7:'例', 10:'休', 13:'例', 19:'假', 20:'休', 21:'例', 22:'休', 28:'例' } },
    ]
  },
  {
    name: '香藥草教育推廣組',
    employees: [
      { name: '力素朱', id: 'F00178', schedule: { 6:'休', 7:'例', 12:'休', 13:'例', 19:'假', 20:'休', 21:'假', 22:'V', 27:'例', 28:'休' } },
      { name: '王建斌', id: 'F00200', schedule: { 6:'休', 7:'例', 12:'休', 13:'例', 19:'假', 20:'休', 21:'假', 27:'休', 28:'例' } },
      { name: '王明宗', id: 'F00204', schedule: { 5:'休', 7:'例', 12:'休', 13:'例', 19:'假', 20:'休', 21:'假', 27:'休', 28:'例' } },
      { name: '郭廣榮', id: 'F00010', schedule: { 4:'例', 5:'休', 12:'休', 13:'例', 19:'假', 20:'例', 21:'休', 27:'休', 28:'例' } },
      { name: '陳鈺文', id: 'F00207', schedule: { 4:'例', 5:'休', 12:'例', 13:'休', 19:'假', 20:'休', 21:'假', 27:'例', 28:'休' } },
      { name: '姜家智', id: 'F00230', schedule: { 5:'休', 6:'例', 12:'例', 13:'休', 19:'假', 20:'例', 21:'休', 26:'休', 27:'例' } },
      { name: '應芝雲', id: 'F00212', schedule: { 5:'休', 6:'例', 9:'原', 10:'原', 11:'原', 12:'休', 13:'例', 19:'假', 20:'休', 21:'假', 27:'休', 28:'例' } },
    ]
  }
])

// ── Computed ───────────────────────────────────────────
const daysInMonth = computed(() => {
  return Array.from({ length: new Date(currentYear.value, currentMonth.value, 0).getDate() }, (_, i) => i + 1)
})

const leadingBlanks = computed(() => {
  // June 2026 starts on Monday = index 1
  return startWeekday
})

const currentDeptEmployees = computed(() => {
  const dept = departments.find(d => d.name === selectedDept.value)
  return dept ? dept.employees : []
})

const calFilteredEmps = computed(() => {
  if (calSelectedEmps.value.length === 0) return currentDeptEmployees.value
  return currentDeptEmployees.value.filter(e => calSelectedEmps.value.includes(e.id))
})

// ── Helpers ────────────────────────────────────────────
function getDayOfWeek(day) {
  // June 2026: day 1 = Monday
  return (startWeekday + day - 1) % 7 // 0=Sun,1=Mon,...6=Sat
}

function isWeekend(day) {
  const dow = getDayOfWeek(day)
  return dow === 0 || dow === 6
}

function getDayClass(day) {
  const dow = getDayOfWeek(day)
  if (dow === 0) return 'sunday'
  if (dow === 6) return 'saturday'
  if (holidayLabels[day]) return 'holiday'
  return ''
}

function getWeekdayShort(day) {
  const names = ['日','一','二','三','四','五','六']
  return names[getDayOfWeek(day)]
}

function getCellClass(val) {
  if (!val) return ''
  return `has-badge badge-bg-${val.toLowerCase()}`
}

function countExpected(emp) {
  return emp.schedule._expected ?? 9
}

function countActual(emp) {
  const vals = ['休','例','假','積','特','半','公','原']
  return Object.values(emp.schedule).filter(v => vals.includes(v)).length
}

function isToday(day) {
  const today = new Date()
  return today.getFullYear() === currentYear.value && today.getMonth() + 1 === currentMonth.value && today.getDate() === day
}

function changeMonth(dir) {
  let m = currentMonth.value + dir
  let y = currentYear.value
  if (m > 12) { m = 1; y++ }
  if (m < 1) { m = 12; y-- }
  currentMonth.value = m
  currentYear.value = y
}

// ── Edit modal ─────────────────────────────────────────
const editModal = reactive({ open: false, emp: null, day: null, value: '', weekday: '' })

function openEditCell(emp, day) {
  editModal.emp = emp
  editModal.day = day
  editModal.value = emp.schedule[day] || ''
  editModal.weekday = '星期' + getWeekdayShort(day)
  editModal.open = true
}

function saveEdit() {
  if (editModal.emp) {
    if (editModal.value === '') {
      delete editModal.emp.schedule[editModal.day]
    } else {
      editModal.emp.schedule[editModal.day] = editModal.value
    }
  }
  editModal.open = false
}
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Noto+Sans+TC:wght@400;500;600;700&display=swap');

* { box-sizing: border-box; margin: 0; padding: 0; }

.schedule-app {
  font-family: 'Noto Sans TC', sans-serif;
  background: #f4f6f9;
  min-height: 100vh;
  color: #1a2332;
}

/* ── Header ── */
.app-header {
  background: linear-gradient(135deg, #1a2e4a 0%, #243b5e 100%);
  color: white;
  padding: 16px 24px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
  box-shadow: 0 2px 12px rgba(0,0,0,0.2);
}

.title {
  font-size: 20px;
  font-weight: 700;
  letter-spacing: 0.03em;
  line-height: 1.2;
}
.title-org { color: #f0d080; }
.title-divider { margin: 0 6px; opacity: 0.5; }
.title-dept { color: #a8d4ff; }
.title-dept.placeholder { color: #6a8aaa; font-style: italic; }
.subtitle { font-size: 13px; color: #7aaadd; margin-top: 2px; }

.header-right {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.month-nav {
  display: flex;
  align-items: center;
  gap: 8px;
  background: rgba(255,255,255,0.1);
  border-radius: 8px;
  padding: 4px 10px;
}
.nav-btn {
  background: none; border: none; color: white;
  font-size: 20px; cursor: pointer; line-height: 1;
  padding: 0 4px;
  transition: color 0.15s;
}
.nav-btn:hover { color: #f0d080; }
.month-label { font-size: 15px; font-weight: 600; min-width: 72px; text-align: center; }

.dept-select-wrap select {
  background: rgba(255,255,255,0.15);
  color: white;
  border: 1px solid rgba(255,255,255,0.25);
  border-radius: 7px;
  padding: 6px 12px;
  font-size: 13px;
  font-family: inherit;
  cursor: pointer;
  outline: none;
}
.dept-select-wrap select option { background: #1a2e4a; }

.view-toggle {
  display: flex;
  gap: 4px;
  background: rgba(255,255,255,0.1);
  border-radius: 8px;
  padding: 3px;
}
.toggle-btn {
  display: flex; align-items: center; gap: 5px;
  background: none; border: none; color: rgba(255,255,255,0.7);
  padding: 5px 12px; border-radius: 6px;
  font-size: 13px; font-family: inherit; cursor: pointer;
  transition: all 0.15s;
}
.toggle-btn.active {
  background: white; color: #1a2e4a; font-weight: 600;
}
.toggle-btn:not(.active):hover { color: white; background: rgba(255,255,255,0.15); }

/* ── Legend ── */
.legend-bar {
  background: white;
  border-bottom: 1px solid #e2e8f0;
  padding: 8px 24px;
  display: flex; flex-wrap: wrap; gap: 12px;
  align-items: center;
}
.legend-item { display: flex; align-items: center; gap: 5px; }
.legend-badge {
  display: inline-block; width: 22px; height: 22px;
  line-height: 22px; text-align: center;
  border-radius: 4px; font-size: 12px; font-weight: 700;
}
.legend-text { font-size: 12px; color: #556; }

/* ── Badge colors ── */
.badge-休, .badge-bg-休 { background: #dbeafe; color: #1d4ed8; }
.badge-例, .badge-bg-例 { background: #fef9c3; color: #854d0e; }
.badge-假, .badge-bg-假 { background: #fce7f3; color: #9d174d; }
.badge-積, .badge-bg-積 { background: #d1fae5; color: #065f46; }
.badge-特, .badge-bg-特 { background: #ede9fe; color: #4c1d95; }
.badge-半, .badge-bg-半 { background: #ffedd5; color: #7c2d12; }
.badge-公, .badge-bg-公 { background: #e0f2fe; color: #0369a1; }
.badge-原, .badge-bg-原 { background: #f0fdf4; color: #14532d; }
.badge-加, .badge-bg-加 { background: #fee2e2; color: #991b1b; }
.badge-v, .badge-bg-v,
.badge-V, .badge-bg-V { background: #fef3c7; color: #92400e; }
.badge-下, .badge-bg-下 { background: #f1f5f9; color: #475569; }

/* ── Empty state ── */
.empty-state {
  text-align: center; padding: 80px 20px;
  color: #94a3b8;
}
.empty-icon { font-size: 48px; margin-bottom: 12px; }
.empty-text { font-size: 16px; }

/* ── Table View ── */
.table-wrap { padding: 16px 24px; }
.table-scroll { overflow-x: auto; border-radius: 10px; box-shadow: 0 1px 8px rgba(0,0,0,0.08); }

.schedule-table {
  border-collapse: collapse;
  min-width: 900px;
  width: 100%;
  background: white;
  font-size: 12px;
}

.schedule-table th, .schedule-table td {
  border: 1px solid #e2e8f0;
  padding: 0;
  text-align: center;
  white-space: nowrap;
}

.header-row-1 th, .header-row-2 th {
  background: #1a2e4a;
  color: white;
  font-weight: 600;
  font-size: 12px;
  padding: 5px 2px;
}

.col-name { min-width: 80px; width: 80px; }
.col-day { min-width: 28px; width: 28px; }
.col-weekday { min-width: 28px; width: 28px; font-size: 11px; }
.col-summary { min-width: 60px; }
.col-summary-sub { min-width: 30px; font-size: 11px; }

th.saturday, td.saturday { background: #e8f4ff; }
th.sunday, td.sunday { background: #fff0f0; color: #c0392b; }
th.holiday, td.holiday { background: #ffeef5; color: #c0392b; }
.header-row-1 th.saturday, .header-row-2 th.saturday { background: #2563a8; }
.header-row-1 th.sunday, .header-row-2 th.sunday { background: #992222; }
.header-row-1 th.holiday, .header-row-2 th.holiday { background: #7d1d4a; }

.cell-name {
  text-align: left;
  padding: 6px 8px !important;
  background: #f8fafc;
}
.emp-name { font-weight: 600; font-size: 13px; color: #1a2332; }
.emp-id { font-size: 10px; color: #94a3b8; margin-top: 1px; }

.cell-day {
  width: 28px; height: 42px;
  cursor: pointer;
  transition: background 0.1s;
  vertical-align: middle;
  padding: 2px !important;
}
.cell-day:hover { background: #f0f9ff !important; }

.cell-badge {
  display: inline-block;
  width: 22px; height: 22px;
  line-height: 22px; text-align: center;
  border-radius: 4px;
  font-size: 12px; font-weight: 700;
}

.cell-summary {
  font-weight: 600; font-size: 13px;
  color: #1a2e4a; background: #f8fafc;
  padding: 0 6px !important;
}

.emp-row:hover td { background: #f7fbff; }
.emp-row:hover td.saturday { background: #d6eeff; }
.emp-row:hover td.sunday { background: #ffe5e5; }

/* ── Calendar View ── */
.calendar-wrap { padding: 12px 24px 24px; }

.cal-filter {
  display: flex; flex-wrap: wrap; align-items: center; gap: 8px;
  background: white; border-radius: 8px; padding: 10px 16px;
  margin-bottom: 12px; box-shadow: 0 1px 4px rgba(0,0,0,0.06);
  font-size: 13px;
}
.cal-filter-label { color: #64748b; font-weight: 500; }
.cal-emp-toggle { display: flex; align-items: center; gap: 4px; cursor: pointer; }
.cal-emp-toggle input { cursor: pointer; }
.cal-emp-name {
  background: #e8f0fe; color: #1a56db;
  padding: 2px 8px; border-radius: 12px; font-size: 12px;
  transition: background 0.15s;
}
.cal-emp-toggle input:checked + .cal-emp-name { background: #1a56db; color: white; }

.calendar-grid {
  background: white; border-radius: 10px;
  box-shadow: 0 1px 8px rgba(0,0,0,0.08);
  overflow: hidden;
}

.cal-header-row {
  display: grid; grid-template-columns: repeat(7, 1fr);
  background: #1a2e4a;
}
.cal-header-cell {
  color: white; text-align: center;
  padding: 10px 4px; font-size: 13px; font-weight: 600;
}
.cal-header-cell.weekend { color: #fca5a5; }

.cal-body {
  display: grid; grid-template-columns: repeat(7, 1fr);
  border-top: 1px solid #e2e8f0;
}

.cal-day-cell {
  border-right: 1px solid #e2e8f0;
  border-bottom: 1px solid #e2e8f0;
  min-height: 100px;
  padding: 6px;
  vertical-align: top;
  transition: background 0.1s;
}
.cal-day-cell:nth-child(7n) { border-right: none; }
.cal-day-cell.empty { background: #f8fafc; }
.cal-day-cell.saturday { background: #f0f7ff; }
.cal-day-cell.sunday { background: #fff5f5; }
.cal-day-cell.holiday { background: #fff0f8; }
.cal-day-cell.today { box-shadow: inset 0 0 0 2px #3b82f6; }

.cal-day-num {
  display: flex; align-items: center; gap: 4px; flex-wrap: wrap;
  margin-bottom: 4px;
}
.cal-day-num > span:first-child {
  font-size: 15px; font-weight: 700; color: #1a2332;
  min-width: 20px;
}
.sunday .cal-day-num > span:first-child,
.holiday .cal-day-num > span:first-child { color: #dc2626; }
.cal-lunar { font-size: 10px; color: #94a3b8; }
.cal-holiday-label { font-size: 10px; color: #be185d; font-weight: 600; background: #fce7f3; padding: 1px 4px; border-radius: 3px; }
.cal-work-label { font-size: 10px; color: #94a3b8; }

.cal-emp-list { display: flex; flex-direction: column; gap: 2px; }
.cal-emp-entry {
  display: flex; align-items: center; justify-content: space-between;
  padding: 2px 5px; border-radius: 4px;
  cursor: pointer; font-size: 11px;
  transition: opacity 0.1s;
}
.cal-emp-entry:hover { opacity: 0.8; }
.cal-emp-entry-name { font-weight: 500; }
.cal-emp-entry-badge { font-weight: 700; }

/* ── Modal ── */
.modal-overlay {
  position: fixed; inset: 0;
  background: rgba(0,0,0,0.4);
  display: flex; align-items: center; justify-content: center;
  z-index: 999; padding: 20px;
}
.modal-box {
  background: white; border-radius: 12px;
  width: 100%; max-width: 400px;
  box-shadow: 0 20px 60px rgba(0,0,0,0.25);
  overflow: hidden;
}
.modal-header {
  background: #1a2e4a; color: white;
  padding: 14px 20px;
  display: flex; align-items: center; justify-content: space-between;
}
.modal-title { font-size: 15px; font-weight: 600; }
.modal-close {
  background: none; border: none; color: rgba(255,255,255,0.7);
  font-size: 16px; cursor: pointer; line-height: 1;
  padding: 2px 4px;
}
.modal-close:hover { color: white; }

.modal-body { padding: 16px 20px; }
.modal-info {
  display: flex; align-items: center; gap: 10px;
  margin-bottom: 14px; padding-bottom: 12px;
  border-bottom: 1px solid #e2e8f0;
}
.modal-emp { font-size: 16px; font-weight: 700; color: #1a2332; }
.modal-date { font-size: 13px; color: #64748b; }

.modal-options {
  display: flex; flex-wrap: wrap; gap: 8px;
}
.opt-btn {
  padding: 7px 14px; border-radius: 7px;
  border: 2px solid transparent;
  font-size: 13px; font-weight: 600;
  font-family: inherit; cursor: pointer;
  transition: all 0.15s;
}
.opt-btn.selected { border-color: #1a2e4a; box-shadow: 0 0 0 2px rgba(26,46,74,0.2); transform: scale(1.05); }
.opt-clear {
  background: #f1f5f9; color: #64748b;
}
.opt-clear.selected { border-color: #64748b; }

.modal-footer {
  padding: 12px 20px;
  display: flex; justify-content: flex-end; gap: 8px;
  border-top: 1px solid #e2e8f0;
}
.btn-cancel {
  padding: 8px 18px; border-radius: 7px;
  background: #f1f5f9; border: none; color: #475569;
  font-size: 13px; font-family: inherit; cursor: pointer;
}
.btn-save {
  padding: 8px 18px; border-radius: 7px;
  background: #1a2e4a; border: none; color: white;
  font-size: 13px; font-weight: 600; font-family: inherit; cursor: pointer;
  transition: background 0.15s;
}
.btn-save:hover { background: #243b5e; }

@media (max-width: 640px) {
  .app-header { padding: 12px 16px; }
  .table-wrap, .calendar-wrap { padding: 12px; }
  .cal-day-cell { min-height: 70px; padding: 4px; }
}
</style>
