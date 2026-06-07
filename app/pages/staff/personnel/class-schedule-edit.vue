<script setup>
definePageMeta({ layout: 'staff' })

// ── API base（參考 quick-links-edit.vue 使用 commonStore）────────
const commonStore = useCommonStore()
const BASE = () => commonStore.data.main_url + '/holy/class-schedule'

// ── 假別設定 ──────────────────────────────────────────────────────
const LEGENDS = [
  { code: '休', label: '休假日',         color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300' },
  { code: '例', label: '例假日',         color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300' },
  { code: '假', label: '國定假日',       color: 'bg-pink-100 text-pink-700 dark:bg-pink-900/40 dark:text-pink-300' },
  { code: '積', label: '積休',           color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300' },
  { code: '特', label: '特休',           color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300' },
  { code: '半', label: '半天',           color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300' },
  { code: '公', label: '公假',           color: 'bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300' },
  { code: '原', label: '原住民歲時祭儀', color: 'bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300' },
  { code: '事', label: '事假',           color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300' },
  { code: '病', label: '病假',           color: 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300' },
]

const EXTRA_OPTIONS = [
  { code: '加', label: '加班', color: 'bg-red-500 text-white' },
  { code: '水', label: '澆水', color: 'bg-lime-600 text-white' }
]

const EDIT_OPTIONS = [...LEGENDS, { code: 'V', label: 'V', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-700' }]

const OFF_CODES = new Set(['休', '例', '假', '積', '特', '半', '公', '原', '事', '病'])

const WEEKDAY_NAMES = ['日', '一', '二', '三', '四', '五', '六']


// ── 工具函式 ──────────────────────────────────────────────────────
function parseCell(val) {
  if (!val) return { code: '', extra: '' }
  if (typeof val === 'string') return { code: val, extra: '' }
  return { code: val.code ?? '', extra: val.extra ?? '' }
}

function badgeClass(codeOrVal) {
  const code = typeof codeOrVal === 'string' ? codeOrVal : codeOrVal?.code ?? ''
  return LEGENDS.find(l => l.code === code)?.color
    ?? 'bg-stone-100 text-stone-600 dark:bg-zinc-700 dark:text-stone-300'
}

function extraBadgeClass(extra) {
  return EXTRA_OPTIONS.find(e => e.code === extra)?.color ?? 'bg-stone-400 text-white'
}

// ── 日期 ──────────────────────────────────────────────────────────
const currentYear  = ref(new Date().getFullYear())
const currentMonth = ref(new Date().getMonth() + 1)

// 假日 & 農曆從後端載入，初始值為空
const holidays = ref({})
const lunar    = ref({})

const daysInMonth = computed(() => new Date(currentYear.value, currentMonth.value, 0).getDate())
const days        = computed(() => Array.from({ length: daysInMonth.value }, (_, i) => i + 1))

function getWeekday(day) {
  return new Date(currentYear.value, currentMonth.value - 1, day).getDay()
}
function isSaturday(day) { return getWeekday(day) === 6 }
function isSunday(day)   { return getWeekday(day) === 0 }
function isHoliday(day)  { return !!holidays.value[day] }

function dayHeaderClass(day) {
  if (isSunday(day))   return 'text-red-500'
  if (isSaturday(day)) return 'text-blue-500'
  if (isHoliday(day))  return 'text-pink-500'
  return 'text-stone-400 dark:text-stone-500'
}
function dayCellBg(day) {
  if (isSunday(day))   return 'bg-red-50 dark:bg-red-900/10'
  if (isSaturday(day)) return 'bg-blue-50 dark:bg-blue-900/10'
  if (isHoliday(day))  return 'bg-pink-50 dark:bg-pink-900/10'
  return ''
}

// ── 部門員工資料（從後端載入）────────────────────────────────────
const departments  = ref([])
const loading      = ref(false)
const loadError    = ref('')

async function fetchSchedule() {
  loading.value   = true
  loadError.value = ''
  try {
    const res  = await (await fetch(`${BASE()}/${currentYear.value}/${currentMonth.value}`)).json()
    if (!res.success) throw new Error(res.message ?? '載入失敗')
    const data = res.data
    // 後端回傳 YML 解析結果，key 為整數需轉換
    holidays.value = normalizeKeys(data.holidays ?? {})
    lunar.value    = normalizeKeys(data.lunar    ?? {})
    departments.value = (data.departments ?? []).map(dept => ({
      name:      dept.name,
      employees: (dept.employees ?? []).map(emp => ({
        name:     emp.name,
        id:       String(emp.id),
        expected: emp.expected ?? 0,
        // schedule key 為整數，統一轉成數字 key 的物件
        schedule: normalizeKeys(emp.schedule ?? {})
      }))
    }))
    // 部門選擇預設第一個
    if (departments.value.length && !departments.value.find(d => d.name === selectedDept.value)) {
      selectedDept.value = departments.value[0].name
    }
  } catch (e) {
    loadError.value = e.message ?? '網路錯誤'
    showToast('載入失敗：' + loadError.value)
    // 清空舊資料，避免顯示上個月的內容
    departments.value = []
    holidays.value    = {}
    lunar.value       = {}
  } finally {
    loading.value = false
  }
}

// YML 解析後 key 可能是數字或字串，統一轉成數字 key
function normalizeKeys(obj) {
  if (!obj || typeof obj !== 'object') return {}
  return Object.fromEntries(
    Object.entries(obj).map(([k, v]) => [Number(k), v])
  )
}

// ── 月份切換 ──────────────────────────────────────────────────────
function changeMonth(dir) {
  let m = currentMonth.value + dir, y = currentYear.value
  if (m > 12) { m = 1;  y++ }
  if (m < 1)  { m = 12; y-- }
  currentMonth.value = m
  currentYear.value  = y
  fetchSchedule()
}

// ── 部門 & 頁籤 ───────────────────────────────────────────────────
const selectedDept = ref('')
const view         = ref('table')
const legendOpen   = ref(false)

const currentDeptEmployees = computed(
  () => departments.value.find(d => d.name === selectedDept.value)?.employees ?? []
)

// ── 每日統計 ──────────────────────────────────────────────────────
function countActual(emp) {
  return Object.values(emp.schedule).filter(v => OFF_CODES.has(parseCell(v).code)).length
}
function dailyOffCount(day)  {
  return currentDeptEmployees.value.filter(e => OFF_CODES.has(parseCell(e.schedule[day]).code)).length
}
function dailyWorkCount(day) { return currentDeptEmployees.value.length - dailyOffCount(day) }
const totalEmployees = computed(() => currentDeptEmployees.value.length)

// ── 日曆篩選 ──────────────────────────────────────────────────────
const calSelectedIds  = ref([])
const calFilteredEmps = computed(() =>
  calSelectedIds.value.length
    ? currentDeptEmployees.value.filter(e => calSelectedIds.value.includes(e.id))
    : currentDeptEmployees.value
)
const calLeadingBlanks = computed(() => getWeekday(1))

// ── Toast ─────────────────────────────────────────────────────────
const toast = reactive({ show: false, message: '', error: false })
function showToast(msg, error = false) {
  toast.message = msg; toast.show = true; toast.error = error
  setTimeout(() => toast.show = false, 2500)
}

// ════════════════════════════════════════════════════════════════════
// ── 排班編輯 Modal ────────────────────────────────────────────────
// ════════════════════════════════════════════════════════════════════
const showForm  = ref(false)
const editEmp   = ref(null)
const editDay   = ref(null)
const editCode  = ref('')
const editExtra = ref('')
const saving    = ref(false)

function openEdit(emp, day) {
  editEmp.value   = emp
  editDay.value   = day
  const cell      = parseCell(emp.schedule[day])
  editCode.value  = cell.code
  editExtra.value = cell.extra
  showForm.value  = true
}

const canSetExtra = computed(() => OFF_CODES.has(editCode.value))

async function saveEdit() {
  if (!editEmp.value) return
  saving.value = true
  try {
    const extra = canSetExtra.value ? editExtra.value : ''
    // 呼叫後端
    const res = await (await fetch(`${BASE()}/cell`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        year:       currentYear.value,
        month:      currentMonth.value,
        employeeId: editEmp.value.id,
        day:        editDay.value,
        code:       editCode.value,
        extra:      extra
      })
    })).json()
    if (!res.success) throw new Error(res.message)
    // 更新本地資料
    if (editCode.value === '') {
      delete editEmp.value.schedule[editDay.value]
    } else {
      editEmp.value.schedule[editDay.value] = extra
        ? { code: editCode.value, extra }
        : editCode.value
    }
    showForm.value = false
    showToast('已儲存')
  } catch (e) {
    showToast('儲存失敗：' + (e.data?.message ?? e.message), true)
  } finally {
    saving.value = false
  }
}

const editWeekday = computed(() =>
  editDay.value ? `星期${WEEKDAY_NAMES[getWeekday(editDay.value)]}` : ''
)

// ════════════════════════════════════════════════════════════════════
// ── 人員設定 ──────────────────────────────────────────────────────
// ════════════════════════════════════════════════════════════════════
const showStaffForm     = ref(false)
const staffFormMode     = ref('add')
const staffDeleteId     = ref(null)
const showDeleteConfirm = ref(false)
const staffSaving       = ref(false)

const staffForm = reactive({
  id:            '',
  name:          '',
  department:    '',
  expectedLeave: 9
})

const deptNames = computed(() => departments.value.map(d => d.name))

function openAddStaff() {
  staffFormMode.value     = 'add'
  staffForm.id            = ''
  staffForm.name          = ''
  staffForm.department    = departments.value[0]?.name ?? ''
  staffForm.expectedLeave = 9
  showStaffForm.value     = true
}

function openEditStaff(emp, deptName) {
  staffFormMode.value     = 'edit'
  staffForm.id            = emp.id
  staffForm.name          = emp.name
  staffForm.department    = deptName
  staffForm.expectedLeave = emp.expected
  showStaffForm.value     = true
}

async function saveStaff() {
  if (!staffForm.name.trim() || !staffForm.id.trim()) return
  staffSaving.value = true
  try {
    const body = {
      id:            staffForm.id.trim(),
      name:          staffForm.name.trim(),
      department:    staffForm.department,
      expectedLeave: staffForm.expectedLeave
    }
    if (staffFormMode.value === 'add') {
      const res = await (await fetch(`${BASE()}/employees`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })).json()
      if (!res.success) throw new Error(res.message)
      // 本地插入
      const dept = departments.value.find(d => d.name === staffForm.department)
      if (dept) dept.employees.push({ id: body.id, name: body.name, expected: body.expectedLeave, schedule: {} })
      showToast(`已新增員工：${body.name}`)
    } else {
      const res = await (await fetch(`${BASE()}/employees/${body.id}?year=${currentYear.value}&month=${currentMonth.value}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })).json()
      if (!res.success) throw new Error(res.message)
      // 本地更新，含跨部門
      for (const dept of departments.value) {
        const idx = dept.employees.findIndex(e => e.id === body.id)
        if (idx !== -1) {
          const emp = dept.employees[idx]
          if (dept.name !== staffForm.department) {
            dept.employees.splice(idx, 1)
            const newDept = departments.value.find(d => d.name === staffForm.department)
            if (newDept) newDept.employees.push({ ...emp, name: body.name, expected: body.expectedLeave })
          } else {
            emp.name     = body.name
            emp.expected = body.expectedLeave
          }
          break
        }
      }
      showToast(`已更新員工：${body.name}`)
    }
    showStaffForm.value = false
  } catch (e) {
    showToast('儲存失敗：' + (e.data?.message ?? e.message), true)
  } finally {
    staffSaving.value = false
  }
}

function confirmDeleteStaff(empId) {
  staffDeleteId.value     = empId
  showDeleteConfirm.value = true
}

async function deleteStaff() {
  const id = staffDeleteId.value
  try {
    const res = await (await fetch(`${BASE()}/employees/${id}`, { method: 'DELETE' })).json()
    if (!res.success) throw new Error(res.message)
    for (const dept of departments.value) {
      const idx = dept.employees.findIndex(e => e.id === id)
      if (idx !== -1) {
        const name = dept.employees[idx].name
        dept.employees.splice(idx, 1)
        showToast(`已刪除員工：${name}`)
        break
      }
    }
  } catch (e) {
    showToast('刪除失敗：' + (e.data?.message ?? e.message), true)
  } finally {
    showDeleteConfirm.value = false
    staffDeleteId.value     = null
  }
}

const allEmployeesFlat = computed(() =>
  departments.value.flatMap(d => d.employees.map(e => ({ ...e, department: d.name })))
)

// ════════════════════════════════════════════════════════════════════
// ── 組別管理 ──────────────────────────────────────────────────────
// ════════════════════════════════════════════════════════════════════
const showDeptForm     = ref(false)
const deptFormMode     = ref('add')   // 'add' | 'rename'
const deptFormTarget   = ref('')      // rename 時的原名稱
const deptFormName     = ref('')
const deptSaving       = ref(false)
const showDeptDelete   = ref(false)
const deptDeleteTarget = ref('')

function openAddDept() {
  deptFormMode.value   = 'add'
  deptFormName.value   = ''
  showDeptForm.value   = true
}

function openRenameDept(name) {
  deptFormMode.value   = 'rename'
  deptFormTarget.value = name
  deptFormName.value   = name
  showDeptForm.value   = true
}

async function saveDept() {
  if (!deptFormName.value.trim()) return
  deptSaving.value = true
  try {
    if (deptFormMode.value === 'add') {
      const res = await (await fetch(`${BASE()}/departments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: deptFormName.value.trim() })
      })).json()
      if (!res.success) throw new Error(res.message)
      departments.value.push({ name: deptFormName.value.trim(), employees: [] })
      showToast(`已新增組別：${deptFormName.value}`)
    } else {
      const encoded = encodeURIComponent(deptFormTarget.value)
      const res = await (await fetch(`${BASE()}/departments/${encoded}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: deptFormName.value.trim() })
      })).json()
      if (!res.success) throw new Error(res.message)
      // 本地更新
      const dept = departments.value.find(d => d.name === deptFormTarget.value)
      if (dept) dept.name = deptFormName.value.trim()
      if (selectedDept.value === deptFormTarget.value) selectedDept.value = deptFormName.value.trim()
      showToast(`已更名：${deptFormTarget.value} → ${deptFormName.value}`)
    }
    showDeptForm.value = false
  } catch (e) {
    showToast('操作失敗：' + (e.data?.message ?? e.message), true)
  } finally {
    deptSaving.value = false
  }
}

function confirmDeleteDept(name) {
  deptDeleteTarget.value = name
  showDeptDelete.value   = true
}

async function deleteDept() {
  const name = deptDeleteTarget.value
  try {
    const encoded = encodeURIComponent(name)
    const res = await (await fetch(`${BASE()}/departments/${encoded}`, { method: 'DELETE' })).json()
    if (!res.success) throw new Error(res.message)
    departments.value = departments.value.filter(d => d.name !== name)
    if (selectedDept.value === name) selectedDept.value = departments.value[0]?.name ?? ''
    showToast(`已刪除組別：${name}`)
  } catch (e) {
    showToast('刪除失敗：' + (e.data?.message ?? e.message), true)
  } finally {
    showDeptDelete.value   = false
    deptDeleteTarget.value = ''
  }
}


// ── 匯出 Excel ────────────────────────────────────────────────────
const downloading = ref(false)

async function exportExcel() {
  downloading.value = true
  try {
    const url = `${BASE()}/export/excel/${currentYear.value}/${currentMonth.value}`
    const res = await fetch(url)
    if (!res.ok) throw new Error('匯出失敗')
    const blob = await res.blob()
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `${currentYear.value}年${String(currentMonth.value).padStart(2,'0')}月班表.xlsx`
    a.click()
    URL.revokeObjectURL(a.href)
    showToast('Excel 已下載')
  } catch (e) {
    showToast('匯出失敗：' + e.message, true)
  } finally {
    downloading.value = false
  }
}

// ── 初始載入 ─────────────────────────────────────────────────
onMounted(() => {
  fetchSchedule()
})
</script>

<template>
  <div class="min-h-screen bg-stone-50 dark:bg-zinc-900 transition-colors duration-300">
    <!-- ── Header ── -->
    <header class="bg-white dark:bg-zinc-900 border-b border-stone-200 dark:border-stone-700 px-4 py-3 sticky top-0 z-30">
      <div class="flex items-center gap-2">
        <div class="flex items-center gap-2 min-w-0 flex-1">
          <div class="w-8 h-8 rounded-lg bg-green-700 flex items-center justify-center text-white text-lg font-bold flex-shrink-0">📋</div>
          <div class="min-w-0">
            <h1 class="font-bold text-stone-800 dark:text-stone-100 leading-none text-lg sm:text-lg truncate">員工排假班表</h1>
            <p class="text-lg text-stone-400 mt-0.5 hidden sm:block">Shift Schedule</p>
          </div>
        </div>

        <!-- 月份切換 -->
        <div class="flex items-center gap-1 bg-stone-100 dark:bg-zinc-800 rounded-lg px-1 py-0.5 flex-shrink-0">
          <button class="p-1.5 hover:bg-stone-200 dark:hover:bg-zinc-700 rounded-md transition-colors" :disabled="loading" @click="changeMonth(-1)">
            <svg class="w-4 h-4 text-stone-500 dark:text-stone-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/></svg>
          </button>
          <span class="text-lg font-semibold text-stone-700 dark:text-stone-200 min-w-[72px] text-center">
            {{ currentYear }}/{{ String(currentMonth).padStart(2, '0') }}
          </span>
          <button class="p-1.5 hover:bg-stone-200 dark:hover:bg-zinc-700 rounded-md transition-colors" :disabled="loading" @click="changeMonth(1)">
            <svg class="w-4 h-4 text-stone-500 dark:text-stone-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/></svg>
          </button>
        </div>

        <!-- 頁籤 -->
        <div class="flex items-center gap-0.5 bg-stone-100 dark:bg-zinc-800 rounded-lg p-0.5 flex-shrink-0">
          <button v-for="tab in [
              { key: 'table',    label: '班表' },
              { key: 'calendar', label: '日曆' },
              { key: 'staff',    label: '人員' },
            ]" :key="tab.key"
                  :class="['px-2.5 py-1.5 text-lg font-medium rounded-md transition-colors relative',
                     view === tab.key
                       ? 'bg-white dark:bg-zinc-700 text-stone-800 dark:text-stone-100 shadow-sm'
                       : 'text-stone-500 dark:text-stone-400 hover:text-stone-700 dark:hover:text-stone-200']"
                  @click="view = tab.key">
            {{ tab.label }}
          </button>
        </div>
      </div>

      <!-- 部門 + 圖例（班表/日曆） -->
      <div v-if="view === 'table' || view === 'calendar'" class="flex items-center gap-2 mt-2.5 pt-2.5 border-t border-stone-100 dark:border-stone-800">
        <select v-model="selectedDept"
                class="text-lg border border-stone-200 dark:border-stone-700 rounded-lg px-2 py-1.5 bg-white dark:bg-zinc-800 text-stone-700 dark:text-stone-200 outline-none focus:ring-2 focus:ring-green-400 flex-shrink-0">
          <option v-for="d in departments" :key="d.name" :value="d.name">{{ d.name }}</option>
        </select>
        <div class="hidden sm:flex flex-wrap gap-1.5 flex-1">
          <span v-for="l in LEGENDS" :key="l.code" class="inline-flex items-center gap-1 text-lg">
            <span :class="['inline-flex items-center justify-center w-5 h-5 rounded text-lg font-bold', l.color]">{{ l.code }}</span>
            <span class="text-stone-400 dark:text-stone-500">{{ l.label }}</span>
          </span>
          <span class="inline-block w-px h-4 bg-stone-200 dark:bg-stone-700 self-center mx-1"/>
          <span class="text-lg text-stone-300 dark:text-stone-600 self-center mr-0.5">附加：</span>
          <span v-for="e in EXTRA_OPTIONS" :key="'ex'+e.code" class="inline-flex items-center gap-1 text-lg">
            <span :class="['inline-flex items-center justify-center w-5 h-5 rounded-full text-lg font-bold', e.color]">{{ e.code }}</span>
            <span class="text-stone-400 dark:text-stone-500">{{ e.label }}</span>
          </span>
        </div>
        <button class="sm:hidden ml-auto flex items-center gap-1 text-lg text-stone-400 dark:text-stone-500 px-2 py-1.5 rounded-lg bg-stone-100 dark:bg-zinc-800 hover:bg-stone-200 dark:hover:bg-zinc-700 transition-colors flex-shrink-0"
                @click="legendOpen = !legendOpen">
          圖例
          <svg :class="['w-3 h-3 transition-transform', legendOpen ? 'rotate-180' : '']" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/></svg>
        </button>
      </div>
      <div v-if="legendOpen && (view === 'table' || view === 'calendar')" class="sm:hidden mt-2 pb-1 flex flex-wrap gap-x-3 gap-y-1.5">
        <span v-for="l in LEGENDS" :key="l.code" class="inline-flex items-center gap-1 text-lg">
          <span :class="['inline-flex items-center justify-center w-5 h-5 rounded text-lg font-bold', l.color]">{{ l.code }}</span>
          <span class="text-stone-400 dark:text-stone-500">{{ l.label }}</span>
        </span>
        <span class="w-full h-px bg-stone-100 dark:bg-stone-800 my-0.5"/>
        <span class="text-lg text-stone-300 dark:text-stone-600 self-center">附加：</span>
        <span v-for="e in EXTRA_OPTIONS" :key="'ex'+e.code" class="inline-flex items-center gap-1 text-lg">
          <span :class="['inline-flex items-center justify-center w-5 h-5 rounded-full text-lg font-bold', e.color]">{{ e.code }}</span>
          <span class="text-stone-400 dark:text-stone-500">{{ e.label }}</span>
        </span>
      </div>
    </header>

    <!-- ── 主體 ── -->
    <div class="max-w-[1400px] mx-auto px-3 sm:px-4 py-4 sm:py-6">

      <!-- 載入中 -->
      <div v-if="loading" class="flex items-center justify-center py-20 gap-3 text-stone-400">
        <svg class="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
        </svg>
        <span class="text-lg">載入中…</span>
      </div>

      <!-- 載入錯誤 -->
      <div v-else-if="loadError && departments.length === 0"
           class="bg-red-50 dark:bg-red-900/20 rounded-2xl border border-red-200 dark:border-red-800 px-4 py-8 text-center">
        <p class="text-lg text-red-600 dark:text-red-400 mb-3">{{ loadError }}</p>
        <button class="text-lg px-3 py-1.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors" @click="fetchSchedule">重新載入</button>
      </div>

      <!-- ══ 班表 ══ -->
      <div v-else-if="view === 'table'">
        <!-- 列印工具列 -->
        <div class="hidden sm:flex justify-end mb-3 gap-2">
          <button
            class="flex items-center gap-2 px-4 py-2 bg-green-700 hover:bg-green-800 text-white text-base font-medium rounded-xl transition-colors disabled:opacity-60"
            :disabled="downloading || loading" @click="exportExcel">
            <svg v-if="downloading" class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
            </svg>
            <svg v-else class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/>
            </svg>
            {{ downloading ? '產生中…' : '下載 Excel' }}
          </button>
        </div>
        <!-- 手機版員工卡片 -->
        <div class="sm:hidden space-y-3">
          <div v-for="emp in currentDeptEmployees" :key="emp.id"
               class="bg-white dark:bg-zinc-900 rounded-2xl border border-stone-200 dark:border-stone-700 shadow-sm overflow-hidden">
            <div class="flex items-center justify-between px-4 py-2.5 bg-stone-50 dark:bg-zinc-800 border-b border-stone-200 dark:border-stone-700">
              <div>
                <span class="font-semibold text-stone-800 dark:text-stone-100 text-lg">{{ emp.name }}</span>
                <span class="text-lg text-stone-400 dark:text-stone-500 ml-2">{{ emp.id }}</span>
              </div>
              <div class="flex items-center gap-2 text-lg text-stone-400 dark:text-stone-500">
                <span>應 <span class="font-semibold text-stone-600 dark:text-stone-300">{{ emp.expected }}</span></span>
                <span>實 <span class="font-semibold text-green-700 dark:text-green-400">{{ countActual(emp) }}</span></span>
              </div>
            </div>
            <div class="overflow-x-auto">
              <div class="flex min-w-max px-2 py-2 gap-1">
                <button v-for="d in days" :key="d"
                        :class="['flex flex-col items-center rounded-xl w-10 py-1.5 flex-shrink-0 transition-colors',
                           dayCellBg(d) || 'bg-stone-50 dark:bg-zinc-800/50',
                           'hover:ring-2 hover:ring-green-400 hover:ring-inset active:scale-95']"
                        @click="openEdit(emp, d)">
                  <span :class="['text-lg font-semibold leading-none mb-0.5', dayHeaderClass(d)]">{{ d }}</span>
                  <span :class="['text-lg leading-none mb-1', dayHeaderClass(d), 'opacity-70']">{{ WEEKDAY_NAMES[getWeekday(d)] }}</span>
                  <div class="relative flex items-center justify-center w-7 h-7">
                    <span v-if="emp.schedule[d]"
                          :class="['inline-flex items-center justify-center w-7 h-7 rounded-lg text-lg font-bold', badgeClass(parseCell(emp.schedule[d]).code)]">
                      {{ parseCell(emp.schedule[d]).code }}
                    </span>
                    <span v-else class="w-7 h-7 rounded-lg border border-dashed border-stone-200 dark:border-stone-700"/>
                    <span v-if="parseCell(emp.schedule[d]).extra"
                          :class="['absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full flex items-center justify-center text-lg font-bold leading-none shadow-sm',
                               extraBadgeClass(parseCell(emp.schedule[d]).extra)]">
                      {{ parseCell(emp.schedule[d]).extra }}
                    </span>
                  </div>
                </button>
              </div>
            </div>
          </div>

          <!-- 每日人力 -->
          <div class="bg-white dark:bg-zinc-900 rounded-2xl border border-stone-200 dark:border-stone-700 shadow-sm overflow-hidden">
            <div class="px-4 py-2.5 bg-stone-50 dark:bg-zinc-800 border-b border-stone-200 dark:border-stone-700">
              <span class="font-semibold text-stone-700 dark:text-stone-300 text-lg">每日人力</span>
              <span class="text-lg text-stone-400 ml-2">總人數 {{ totalEmployees }}</span>
            </div>
            <div class="overflow-x-auto">
              <div class="flex min-w-max px-2 py-2 gap-1">
                <div v-for="d in days" :key="d"
                     :class="['flex flex-col items-center rounded-xl w-10 py-1.5 flex-shrink-0', dayCellBg(d) || 'bg-stone-50 dark:bg-zinc-800/50']">
                  <span :class="['text-lg font-semibold leading-none mb-0.5', dayHeaderClass(d)]">{{ d }}</span>
                  <span :class="['text-lg leading-none mb-1', dayHeaderClass(d), 'opacity-70']">{{ WEEKDAY_NAMES[getWeekday(d)] }}</span>
                  <span v-if="dailyWorkCount(d) > 0"
                        class="inline-flex items-center justify-center w-7 h-7 rounded-lg text-lg font-bold bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300">
                    {{ dailyWorkCount(d) }}
                  </span>
                  <span v-else class="w-7 h-7 flex items-center justify-center text-lg text-stone-300 dark:text-stone-600">—</span>
                </div>
              </div>
            </div>
          </div>
          <div v-if="currentDeptEmployees.length === 0" class="bg-white dark:bg-zinc-900 rounded-2xl border border-stone-200 dark:border-stone-700 px-4 py-12 text-center text-stone-400 text-lg shadow-sm">此部門暫無員工資料</div>
        </div>

        <!-- 桌機版表格 -->
        <div class="hidden sm:block bg-white dark:bg-zinc-900 rounded-2xl border border-stone-200 dark:border-stone-700 shadow-sm overflow-hidden">
          <div class="overflow-x-auto">
            <table class="w-full text-lg border-collapse min-w-[700px]">
              <thead>
              <tr class="bg-stone-50 dark:bg-zinc-800 border-b border-stone-200 dark:border-stone-700">
                <th class="sticky left-0 z-10 bg-stone-50 dark:bg-zinc-800 px-3 py-2 text-left text-stone-500 dark:text-stone-400 font-medium whitespace-nowrap border-r border-stone-200 dark:border-stone-700 min-w-[110px]">姓名</th>
                <th v-for="d in days" :key="d" :class="['px-0 py-2 text-center font-semibold w-8 min-w-[32px]', dayHeaderClass(d)]">{{ d }}</th>
                <th class="px-2 py-2 text-center text-stone-400 dark:text-stone-500 font-medium whitespace-nowrap border-l border-stone-200 dark:border-stone-700 w-10">應</th>
                <th class="px-2 py-2 text-center text-stone-400 dark:text-stone-500 font-medium whitespace-nowrap w-10">實</th>
              </tr>
              <tr class="border-b-2 border-stone-200 dark:border-stone-700">
                <th class="sticky left-0 z-10 bg-white dark:bg-zinc-900 border-r border-stone-200 dark:border-stone-700 px-3 py-1 text-left text-stone-300 dark:text-stone-600 font-normal text-lg">
                  {{ currentYear }}年{{ currentMonth }}月
                </th>
                <th v-for="d in days" :key="d" :class="['py-1 text-center text-lg font-normal', dayHeaderClass(d), dayCellBg(d)]">
                  {{ WEEKDAY_NAMES[getWeekday(d)] }}
                  <div v-if="holidays[d]" class="text-lg text-pink-400 leading-tight">{{ holidays[d] }}</div>
                </th>
                <th class="border-l border-stone-200 dark:border-stone-700" colspan="3"/>
              </tr>
              </thead>
              <tbody class="divide-y divide-stone-100 dark:divide-stone-800">
              <tr v-for="emp in currentDeptEmployees" :key="emp.id"
                  class="hover:bg-stone-50 dark:hover:bg-zinc-800/40 transition-colors">
                <td class="sticky left-0 z-10 bg-white dark:bg-zinc-900 hover:bg-stone-50 dark:hover:bg-zinc-800/40 border-r border-stone-200 dark:border-stone-700 px-3 py-2 whitespace-nowrap">
                  <div class="font-semibold text-stone-800 dark:text-stone-100 text-lg">{{ emp.name }}</div>
                  <div class="text-lg text-stone-400 dark:text-stone-500">{{ emp.id }}</div>
                </td>
                <td v-for="d in days" :key="d"
                    :class="['text-center py-1.5 px-0 cursor-pointer transition-colors', dayCellBg(d), 'hover:ring-1 hover:ring-inset hover:ring-green-400']"
                    @click="openEdit(emp, d)">
                  <template v-if="emp.schedule[d]">
                    <div class="relative inline-flex items-center justify-center">
                        <span :class="['inline-flex items-center justify-center w-6 h-6 rounded text-lg font-bold', badgeClass(parseCell(emp.schedule[d]).code)]">
                          {{ parseCell(emp.schedule[d]).code }}
                        </span>
                      <span v-if="parseCell(emp.schedule[d]).extra"
                            :class="['absolute -top-1 -right-1.5 w-3.5 h-3.5 rounded-full flex items-center justify-center text-lg font-bold leading-none shadow-sm',
                                   extraBadgeClass(parseCell(emp.schedule[d]).extra)]">
                          {{ parseCell(emp.schedule[d]).extra }}
                        </span>
                    </div>
                  </template>
                </td>
                <td class="text-center border-l border-stone-200 dark:border-stone-700 text-stone-500 dark:text-stone-400 font-medium py-2">{{ emp.expected }}</td>
                <td class="text-center text-stone-700 dark:text-stone-200 font-semibold py-2">{{ countActual(emp) }}</td>
              </tr>
              </tbody>
              <tfoot class="border-t-2 border-stone-200 dark:border-stone-700">
              <tr class="bg-stone-50 dark:bg-zinc-800">
                <td class="sticky left-0 z-10 bg-stone-50 dark:bg-zinc-800 border-r border-stone-200 dark:border-stone-700 px-3 py-2 whitespace-nowrap">
                  <div class="text-lg font-semibold text-stone-600 dark:text-stone-300">每日人力</div>
                  <div class="text-lg text-stone-400 dark:text-stone-500">總人數 {{ totalEmployees }}</div>
                </td>
                <td v-for="d in days" :key="d" :class="['text-center py-1.5 px-0', dayCellBg(d)]">
                    <span v-if="dailyWorkCount(d) > 0"
                          class="inline-flex items-center justify-center w-6 h-6 rounded text-lg font-bold bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300">
                      {{ dailyWorkCount(d) }}
                    </span>
                  <span v-else class="text-lg text-stone-300 dark:text-stone-600">—</span>
                </td>
                <td class="border-l border-stone-200 dark:border-stone-700" colspan="3"/>
              </tr>
              <tr class="bg-stone-50/60 dark:bg-zinc-800/60">
                <td class="sticky left-0 z-10 bg-stone-50 dark:bg-zinc-800 border-r border-stone-200 dark:border-stone-700 px-3 py-2 whitespace-nowrap">
                  <div class="text-lg font-semibold text-stone-500 dark:text-stone-400">休假人數</div>
                </td>
                <td v-for="d in days" :key="d" :class="['text-center py-1.5 px-0', dayCellBg(d)]">
                    <span v-if="dailyOffCount(d) > 0"
                          class="inline-flex items-center justify-center w-6 h-6 rounded text-lg font-bold bg-stone-200 text-stone-500 dark:bg-zinc-700 dark:text-stone-300">
                      {{ dailyOffCount(d) }}
                    </span>
                  <span v-else class="text-lg text-stone-300 dark:text-stone-600">—</span>
                </td>
                <td class="border-l border-stone-200 dark:border-stone-700" colspan="3"/>
              </tr>
              </tfoot>
            </table>
          </div>
        </div>
        <div v-if="!loading && currentDeptEmployees.length === 0"
             class="hidden sm:block bg-white dark:bg-zinc-900 rounded-2xl border border-stone-200 dark:border-stone-700 px-4 py-12 text-center text-stone-400 text-lg shadow-sm mt-3">
          此部門暫無員工資料
        </div>
      </div>

      <!-- ══ 日曆 ══ -->
      <div v-else-if="view === 'calendar'">
        <div class="bg-white dark:bg-zinc-900 rounded-2xl border border-stone-200 dark:border-stone-700 shadow-sm px-3 sm:px-4 py-3 mb-3">
          <div class="flex flex-wrap items-center gap-1.5 sm:gap-2">
            <span class="text-lg text-stone-400 dark:text-stone-500 font-medium w-full sm:w-auto">顯示員工：</span>
            <label v-for="emp in currentDeptEmployees" :key="emp.id" class="flex items-center gap-1 cursor-pointer select-none">
              <input v-model="calSelectedIds" type="checkbox" :value="emp.id" class="rounded accent-green-600">
              <span :class="['text-lg px-1.5 py-0.5 rounded-full transition-colors',
                             calSelectedIds.includes(emp.id) ? 'bg-green-700 text-white' : 'bg-stone-100 dark:bg-zinc-700 text-stone-600 dark:text-stone-300']">
                {{ emp.name }}
              </span>
            </label>
          </div>
        </div>
        <div class="bg-white dark:bg-zinc-900 rounded-2xl border border-stone-200 dark:border-stone-700 shadow-sm overflow-hidden">
          <div class="grid grid-cols-7 border-b border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-zinc-800">
            <div v-for="(w, wi) in WEEKDAY_NAMES" :key="w"
                 :class="['text-center font-semibold py-1.5 sm:py-2 text-lg sm:text-lg',
                       wi === 0 ? 'text-red-500' : wi === 6 ? 'text-blue-500' : 'text-stone-500 dark:text-stone-400']">
              <span class="sm:hidden">{{ w }}</span>
              <span class="hidden sm:inline">星期{{ w }}</span>
            </div>
          </div>
          <div class="grid grid-cols-7 divide-x divide-y divide-stone-100 dark:divide-stone-800">
            <div v-for="n in calLeadingBlanks" :key="'blank'+n" class="min-h-[70px] sm:min-h-[100px] bg-stone-50/50 dark:bg-zinc-800/30"/>
            <div v-for="d in days" :key="d" :class="['min-h-[70px] sm:min-h-[100px] p-1 sm:p-1.5 transition-colors', dayCellBg(d)]">
              <div class="flex items-start justify-between gap-0.5 mb-0.5 sm:mb-1">
                <div class="flex items-center gap-0.5 sm:gap-1">
                  <span :class="['text-lg sm:text-lg font-bold leading-none', dayHeaderClass(d)]">{{ d }}</span>
                  <span v-if="holidays[d]" class="hidden sm:inline text-lg bg-pink-100 dark:bg-pink-900/30 text-pink-500 rounded px-1 py-0.5 leading-none">{{ holidays[d] }}</span>
                  <span v-if="holidays[d]" class="sm:hidden w-1.5 h-1.5 rounded-full bg-pink-400 flex-shrink-0 mt-0.5"/>
                </div>
                <span v-if="lunar[d]" class="text-lg sm:text-lg text-stone-300 dark:text-stone-600 leading-none mt-0.5">{{ lunar[d] }}</span>
              </div>
              <div class="flex flex-col gap-0.5">
                <template v-for="emp in calFilteredEmps" :key="emp.id">
                  <button v-if="emp.schedule[d]"
                          :class="['flex items-center justify-between gap-0.5 sm:gap-1 w-full rounded transition-opacity hover:opacity-80 active:scale-95 px-1 py-0.5 sm:px-1.5',
                             badgeClass(parseCell(emp.schedule[d]).code)]"
                          @click="openEdit(emp, d)">
                    <span class="sm:hidden text-lg font-semibold leading-tight truncate flex-1 text-left">{{ emp.name.slice(0, 1) }}</span>
                    <span class="hidden sm:flex flex-col items-start min-w-0 flex-1">
                      <span class="font-medium truncate leading-tight text-lg">{{ emp.name }}</span>
                      <span class="text-lg opacity-60 leading-tight">{{ emp.id }}</span>
                    </span>
                    <span class="flex items-center gap-0.5 flex-shrink-0">
                      <span class="font-bold text-lg sm:text-lg">{{ parseCell(emp.schedule[d]).code }}</span>
                      <span v-if="parseCell(emp.schedule[d]).extra"
                            :class="['w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full flex items-center justify-center text-lg sm:text-lg font-bold leading-none shadow-sm',
                                 extraBadgeClass(parseCell(emp.schedule[d]).extra)]">
                        {{ parseCell(emp.schedule[d]).extra }}
                      </span>
                    </span>
                  </button>
                </template>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- ══ 人員設定 ══ -->
      <div v-else-if="view === 'staff'">
        <div class="flex items-center gap-2 mb-4">
          <h2 class="text-lg font-bold text-stone-800 dark:text-stone-100 flex-1">人員設定</h2>
          <button class="flex items-center gap-1.5 px-3 py-1.5 border border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-300 text-base font-medium rounded-lg hover:bg-stone-50 dark:hover:bg-zinc-800 transition-colors" @click="openAddDept">
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
            新增組別
          </button>
          <button class="flex items-center gap-1.5 px-3 py-1.5 bg-green-700 hover:bg-green-800 text-white text-base font-medium rounded-lg transition-colors" @click="openAddStaff">
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
            新增員工
          </button>
        </div>
        <div class="space-y-4">
          <div v-for="dept in departments" :key="dept.name"
               class="bg-white dark:bg-zinc-900 rounded-2xl border border-stone-200 dark:border-stone-700 shadow-sm overflow-hidden">
            <div class="flex items-center justify-between px-4 py-3 bg-stone-50 dark:bg-zinc-800 border-b border-stone-200 dark:border-stone-700">
              <div class="flex items-center gap-2 min-w-0">
                <span class="font-semibold text-stone-800 dark:text-stone-100 text-base">{{ dept.name }}</span>
                <span class="text-base text-stone-400 dark:text-stone-500">{{ dept.employees.length }} 人</span>
              </div>
              <div class="flex gap-1 flex-shrink-0">
                <button class="text-base px-2 py-1 text-stone-400 hover:text-stone-600 hover:bg-stone-100 dark:hover:bg-zinc-700 rounded-lg transition-colors"
                        @click="openRenameDept(dept.name)">改名</button>
                <button class="text-base px-2 py-1 text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                        @click="confirmDeleteDept(dept.name)">刪除</button>
              </div>
            </div>
            <div v-if="dept.employees.length === 0" class="px-4 py-6 text-center text-stone-400 text-lg">此部門暫無員工</div>
            <div v-else class="divide-y divide-stone-100 dark:divide-stone-800">
              <div v-for="emp in dept.employees" :key="emp.id"
                   class="flex items-center gap-3 px-4 py-3 hover:bg-stone-50 dark:hover:bg-zinc-800/40 transition-colors">
                <div class="w-8 h-8 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center text-green-700 dark:text-green-400 font-bold text-lg flex-shrink-0">
                  {{ emp.name.slice(0, 1) }}
                </div>
                <div class="flex-1 min-w-0">
                  <div class="font-semibold text-stone-800 dark:text-stone-100 text-lg">{{ emp.name }}</div>
                  <div class="text-lg text-stone-400 dark:text-stone-500">{{ emp.id }} · 預計休假 {{ emp.expected }} 天</div>
                </div>
                <div class="flex gap-1.5 flex-shrink-0">
                  <button class="text-lg px-2.5 py-1 text-stone-500 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-zinc-700 rounded-lg transition-colors"
                          @click="openEditStaff(emp, dept.name)">編輯</button>
                  <button class="text-lg px-2.5 py-1 text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                          @click="confirmDeleteStaff(emp.id)">刪除</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- ══ Modal：排班編輯 ══ -->
    <div v-if="showForm" class="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center z-50" @click.self="showForm = false">
      <div class="bg-white dark:bg-zinc-900 rounded-t-3xl sm:rounded-2xl shadow-xl w-full sm:max-w-sm p-5">
        <div class="flex items-center justify-between mb-4">
          <div>
            <h3 class="font-bold text-stone-800 dark:text-stone-100">編輯排休</h3>
            <p class="text-lg text-stone-400 mt-0.5">
              {{ editEmp?.name }}
              <span class="text-stone-300 dark:text-stone-600">{{ editEmp?.id }}</span>
              · {{ currentMonth }}/{{ editDay }} {{ editWeekday }}
            </p>
          </div>
          <button class="p-1.5 hover:bg-stone-100 dark:hover:bg-zinc-700 rounded-lg transition-colors text-stone-400" @click="showForm = false">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
        </div>
        <p class="text-lg font-semibold text-stone-400 dark:text-stone-500 uppercase tracking-wide mb-2">主狀態</p>
        <div class="grid grid-cols-4 gap-2 mb-4">
          <button v-for="opt in EDIT_OPTIONS" :key="opt.code"
                  :class="['flex flex-col items-center gap-1 py-2.5 rounded-xl border-2 transition-all',
                     editCode === opt.code ? 'border-green-600 ring-2 ring-green-200 dark:ring-green-800 scale-105' : 'border-transparent hover:border-stone-200 dark:hover:border-stone-600']"
                  @click="editCode = opt.code">
            <span :class="['w-8 h-8 rounded-lg flex items-center justify-center text-lg font-bold', opt.color]">{{ opt.code }}</span>
            <span class="text-lg text-stone-500 dark:text-stone-400">{{ opt.label }}</span>
          </button>
          <button
            :class="['flex flex-col items-center gap-1 py-2.5 rounded-xl border-2 transition-all',
                     editCode === '' ? 'border-green-600 ring-2 ring-green-200 dark:ring-green-800 scale-105' : 'border-transparent hover:border-stone-200 dark:hover:border-stone-600']"
            @click="editCode = ''; editExtra = ''">
            <span class="w-8 h-8 rounded-lg flex items-center justify-center text-lg font-bold bg-stone-100 dark:bg-zinc-700 text-stone-400">—</span>
            <span class="text-lg text-stone-500 dark:text-stone-400">清除</span>
          </button>
        </div>
        <transition name="fade">
          <div v-if="canSetExtra" class="mb-4">
            <p class="text-lg font-semibold text-stone-400 dark:text-stone-500 uppercase tracking-wide mb-2">
              附加工作 <span class="text-stone-300 dark:text-stone-600 normal-case font-normal">（休假期間）</span>
            </p>
            <div class="flex gap-2">
              <button :class="['flex flex-col items-center gap-1 px-3 py-2 rounded-xl border-2 transition-all', editExtra === '' ? 'border-green-600 ring-2 ring-green-200 dark:ring-green-800' : 'border-transparent hover:border-stone-200 dark:hover:border-stone-600']" @click="editExtra = ''">
                <span class="w-8 h-8 rounded-full flex items-center justify-center text-lg font-bold bg-stone-100 dark:bg-zinc-700 text-stone-400">—</span>
                <span class="text-lg text-stone-500 dark:text-stone-400">無</span>
              </button>
              <button v-for="opt in EXTRA_OPTIONS" :key="opt.code"
                      :class="['flex flex-col items-center gap-1 px-3 py-2 rounded-xl border-2 transition-all', editExtra === opt.code ? 'border-green-600 ring-2 ring-green-200 dark:ring-green-800 scale-105' : 'border-transparent hover:border-stone-200 dark:hover:border-stone-600']"
                      @click="editExtra = opt.code">
                <span :class="['w-8 h-8 rounded-full flex items-center justify-center text-lg font-bold', opt.color]">{{ opt.code }}</span>
                <span class="text-lg text-stone-500 dark:text-stone-400">{{ opt.label }}</span>
              </button>
            </div>
          </div>
        </transition>
        <div v-if="editCode" class="mb-4 px-3 py-2 bg-stone-50 dark:bg-zinc-800 rounded-xl flex items-center gap-2 text-lg text-stone-500 dark:text-stone-400">
          <span class="text-stone-400">預覽：</span>
          <div class="relative inline-flex items-center justify-center">
            <span :class="['inline-flex items-center justify-center w-7 h-7 rounded-lg text-lg font-bold', badgeClass(editCode)]">{{ editCode }}</span>
            <span v-if="editExtra" :class="['absolute -top-1 -right-1.5 w-4 h-4 rounded-full flex items-center justify-center text-lg font-bold leading-none shadow-sm', extraBadgeClass(editExtra)]">{{ editExtra }}</span>
          </div>
          <span class="ml-1">
            {{ LEGENDS.find(l => l.code === editCode)?.label ?? editCode }}
            <template v-if="editExtra">＋ {{ EXTRA_OPTIONS.find(e => e.code === editExtra)?.label }}</template>
          </span>
        </div>
        <div class="flex gap-2">
          <button class="flex-1 py-2.5 text-lg border border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-300 rounded-xl hover:bg-stone-50 dark:hover:bg-zinc-800 transition-colors" @click="showForm = false">取消</button>
          <button class="flex-1 py-2.5 text-lg bg-green-700 hover:bg-green-800 text-white rounded-xl font-medium transition-colors flex items-center justify-center gap-2"
                  :disabled="saving" @click="saveEdit">
            <svg v-if="saving" class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/></svg>
            {{ saving ? '儲存中…' : '儲存' }}
          </button>
        </div>
      </div>
    </div>

    <!-- ══ Modal：人員新增/編輯 ══ -->
    <div v-if="showStaffForm" class="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center z-50" @click.self="showStaffForm = false">
      <div class="bg-white dark:bg-zinc-900 rounded-t-3xl sm:rounded-2xl shadow-xl w-full sm:max-w-sm p-5">
        <div class="flex items-center justify-between mb-4">
          <h3 class="font-bold text-stone-800 dark:text-stone-100">{{ staffFormMode === 'add' ? '新增員工' : '編輯員工' }}</h3>
          <button class="p-1.5 hover:bg-stone-100 dark:hover:bg-zinc-700 rounded-lg transition-colors text-stone-400" @click="showStaffForm = false">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
        </div>
        <div class="space-y-3 mb-5">
          <div>
            <label class="text-lg font-semibold text-stone-400 dark:text-stone-500 uppercase tracking-wide block mb-1">員工 ID</label>
            <input v-model="staffForm.id" type="text" placeholder="e.g. F00001"
                   :disabled="staffFormMode === 'edit'"
                   class="w-full text-lg border border-stone-200 dark:border-stone-700 rounded-xl px-3 py-2 bg-white dark:bg-zinc-800 text-stone-700 dark:text-stone-200 outline-none focus:ring-2 focus:ring-green-400 disabled:opacity-50 disabled:cursor-not-allowed"/>
          </div>
          <div>
            <label class="text-lg font-semibold text-stone-400 dark:text-stone-500 uppercase tracking-wide block mb-1">姓名</label>
            <input v-model="staffForm.name" type="text" placeholder="員工姓名"
                   class="w-full text-lg border border-stone-200 dark:border-stone-700 rounded-xl px-3 py-2 bg-white dark:bg-zinc-800 text-stone-700 dark:text-stone-200 outline-none focus:ring-2 focus:ring-green-400"/>
          </div>
          <div>
            <label class="text-lg font-semibold text-stone-400 dark:text-stone-500 uppercase tracking-wide block mb-1">部門</label>
            <select v-model="staffForm.department"
                    class="w-full text-lg border border-stone-200 dark:border-stone-700 rounded-xl px-3 py-2 bg-white dark:bg-zinc-800 text-stone-700 dark:text-stone-200 outline-none focus:ring-2 focus:ring-green-400">
              <option v-for="d in deptNames" :key="d" :value="d">{{ d }}</option>
            </select>
          </div>
          <div>
            <label class="text-lg font-semibold text-stone-400 dark:text-stone-500 uppercase tracking-wide block mb-1">預計休假天數（當月）</label>
            <input v-model.number="staffForm.expectedLeave" type="number" min="0" max="31"
                   class="w-full text-lg border border-stone-200 dark:border-stone-700 rounded-xl px-3 py-2 bg-white dark:bg-zinc-800 text-stone-700 dark:text-stone-200 outline-none focus:ring-2 focus:ring-green-400"/>
          </div>
        </div>
        <div class="flex gap-2">
          <button class="flex-1 py-2.5 text-lg border border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-300 rounded-xl hover:bg-stone-50 dark:hover:bg-zinc-800 transition-colors" @click="showStaffForm = false">取消</button>
          <button class="flex-1 py-2.5 text-lg bg-green-700 hover:bg-green-800 text-white rounded-xl font-medium transition-colors flex items-center justify-center gap-2"
                  :disabled="staffSaving" @click="saveStaff">
            <svg v-if="staffSaving" class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/></svg>
            {{ staffSaving ? '儲存中…' : (staffFormMode === 'add' ? '新增' : '儲存') }}
          </button>
        </div>
      </div>
    </div>

    <!-- ══ Modal：刪除確認 ══ -->
    <div v-if="showDeleteConfirm" class="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50" @click.self="showDeleteConfirm = false">
      <div class="bg-white dark:bg-zinc-900 rounded-2xl shadow-xl w-full max-w-xs p-5 mx-4">
        <h3 class="font-bold text-stone-800 dark:text-stone-100 mb-2">確認刪除</h3>
        <p class="text-lg text-stone-500 dark:text-stone-400 mb-5">
          確定要刪除員工
          <span class="font-semibold text-stone-800 dark:text-stone-100">
            {{ allEmployeesFlat.find(e => e.id === staffDeleteId)?.name }}
          </span>
          嗎？此操作無法復原。
        </p>
        <div class="flex gap-2">
          <button class="flex-1 py-2.5 text-lg border border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-300 rounded-xl hover:bg-stone-50 dark:hover:bg-zinc-800 transition-colors" @click="showDeleteConfirm = false">取消</button>
          <button class="flex-1 py-2.5 text-lg bg-red-600 hover:bg-red-700 text-white rounded-xl font-medium transition-colors" @click="deleteStaff">刪除</button>
        </div>
      </div>
    </div>

    <!-- ══ Modal：組別新增/改名 ══ -->
    <div v-if="showDeptForm" class="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50" @click.self="showDeptForm = false">
      <div class="bg-white dark:bg-zinc-900 rounded-2xl shadow-xl w-full max-w-xs p-5 mx-4">
        <div class="flex items-center justify-between mb-4">
          <h3 class="font-bold text-stone-800 dark:text-stone-100">{{ deptFormMode === 'add' ? '新增組別' : '組別改名' }}</h3>
          <button class="p-1.5 hover:bg-stone-100 dark:hover:bg-zinc-700 rounded-lg transition-colors text-stone-400" @click="showDeptForm = false">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
        </div>
        <div class="mb-5">
          <label class="text-base font-semibold text-stone-400 dark:text-stone-500 uppercase tracking-wide block mb-1.5">組別名稱</label>
          <input v-model="deptFormName" type="text" placeholder="e.g. 田園餐廳"
                 class="w-full text-base border border-stone-200 dark:border-stone-700 rounded-xl px-3 py-2 bg-white dark:bg-zinc-800 text-stone-700 dark:text-stone-200 outline-none focus:ring-2 focus:ring-green-400"/>
        </div>
        <div class="flex gap-2">
          <button class="flex-1 py-2.5 text-base border border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-300 rounded-xl hover:bg-stone-50 dark:hover:bg-zinc-800 transition-colors" @click="showDeptForm = false">取消</button>
          <button class="flex-1 py-2.5 text-base bg-green-700 hover:bg-green-800 text-white rounded-xl font-medium transition-colors flex items-center justify-center gap-2"
                  :disabled="deptSaving" @click="saveDept">
            <svg v-if="deptSaving" class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/></svg>
            {{ deptSaving ? '儲存中…' : (deptFormMode === 'add' ? '新增' : '儲存') }}
          </button>
        </div>
      </div>
    </div>

    <!-- ══ Modal：刪除組別確認 ══ -->
    <div v-if="showDeptDelete" class="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50" @click.self="showDeptDelete = false">
      <div class="bg-white dark:bg-zinc-900 rounded-2xl shadow-xl w-full max-w-xs p-5 mx-4">
        <h3 class="font-bold text-stone-800 dark:text-stone-100 mb-2">確認刪除組別</h3>
        <p class="text-base text-stone-500 dark:text-stone-400 mb-5">
          確定要刪除組別
          <span class="font-semibold text-stone-800 dark:text-stone-100">{{ deptDeleteTarget }}</span>
          嗎？組別內必須無在職員工才能刪除。
        </p>
        <div class="flex gap-2">
          <button class="flex-1 py-2.5 text-base border border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-300 rounded-xl hover:bg-stone-50 dark:hover:bg-zinc-800 transition-colors" @click="showDeptDelete = false">取消</button>
          <button class="flex-1 py-2.5 text-base bg-red-600 hover:bg-red-700 text-white rounded-xl font-medium transition-colors" @click="deleteDept">刪除</button>
        </div>
      </div>
    </div>

    <!-- Toast -->
    <transition name="fade">
      <div v-if="toast.show"
           :class="['fixed bottom-6 left-1/2 -translate-x-1/2 sm:left-auto sm:right-6 sm:translate-x-0 text-white text-lg px-4 py-3 rounded-xl shadow-lg flex items-center gap-2 z-50 whitespace-nowrap',
                 toast.error ? 'bg-red-700' : 'bg-stone-800']">
        <svg v-if="!toast.error" class="w-4 h-4 text-green-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>
        <svg v-else class="w-4 h-4 text-red-300 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
        {{ toast.message }}
      </div>
    </transition>
  </div>
</template>

<style scoped>
.fade-enter-active, .fade-leave-active { transition: opacity 0.3s, transform 0.3s; }
.fade-enter-from, .fade-leave-to { opacity: 0; transform: translateY(8px); }
</style>
