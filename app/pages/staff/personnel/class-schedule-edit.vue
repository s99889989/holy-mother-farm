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

const APPLY_LEAVE_CODES = [
  { code: '特', label: '特休' },
  { code: '積', label: '積休' },
  { code: '事', label: '事假' },
  { code: '病', label: '病假' },
  { code: '半', label: '半天' },
  { code: '公', label: '公假' },
  { code: '原', label: '原住民歲時祭儀' },
]

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
// ── 前排假系統 ────────────────────────────────────────────────────
// ════════════════════════════════════════════════════════════════════
const leaveRequests     = ref([])
const leaveLoading      = ref(false)
const showLeaveForm     = ref(false)
const leaveSubmitting   = ref(false)
const leaveFilterStatus = ref('ALL')
const leaveFilterDept   = ref('')

const leaveForm = reactive({
  employeeId:    '',
  employeeName:  '',
  department:    '',
  leaveCode:     '特',
  day:           1,
  halfDay:       false,
  halfDayPeriod: 'AM',
  reason:        '',
  extra:         ''
})

const filteredLeaveRequests = computed(() =>
  leaveRequests.value
    .filter(r => leaveFilterStatus.value === 'ALL' || r.status === leaveFilterStatus.value)
    .filter(r => !leaveFilterDept.value || r.department === leaveFilterDept.value)
    .filter(r => r.year === currentYear.value && r.month === currentMonth.value)
)

async function fetchLeaveRequests() {
  leaveLoading.value = true
  try {
    const params = new URLSearchParams({ year: currentYear.value, month: currentMonth.value })
    const res = await (await fetch(`${BASE()}/leave/list?${params}`)).json()
    if (res.success) leaveRequests.value = res.data ?? []
  } catch (e) {
    showToast('載入請假清單失敗', true)
  } finally {
    leaveLoading.value = false
  }
}

function openLeaveForm(emp) {
  leaveForm.employeeId    = emp?.id   ?? ''
  leaveForm.employeeName  = emp?.name ?? ''
  leaveForm.department    = emp ? selectedDept.value : ''
  leaveForm.leaveCode     = '特'
  leaveForm.day           = 1
  leaveForm.halfDay       = false
  leaveForm.halfDayPeriod = 'AM'
  leaveForm.reason        = ''
  leaveForm.extra         = ''
  showLeaveForm.value     = true
}

async function submitLeaveRequest() {
  if (!leaveForm.employeeId) { showToast('請選擇員工', true); return }
  leaveSubmitting.value = true
  try {
    const res = await (await fetch(`${BASE()}/leave/apply`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        employeeId:    leaveForm.employeeId,
        employeeName:  leaveForm.employeeName,
        department:    leaveForm.department,
        leaveCode:     leaveForm.leaveCode,
        year:          currentYear.value,
        month:         currentMonth.value,
        day:           leaveForm.day,
        halfDay:       leaveForm.halfDay,
        halfDayPeriod: leaveForm.halfDay ? leaveForm.halfDayPeriod : null,
        reason:        leaveForm.reason,
        extra:         leaveForm.extra
      })
    })).json()
    if (!res.success) throw new Error(res.message)
    // 插入本地清單（不重新 fetch，保持即時感）
    const labelMap = Object.fromEntries(APPLY_LEAVE_CODES.map(c => [c.code, c.label]))
    leaveRequests.value.unshift({
      id:            res.id,
      employeeId:    leaveForm.employeeId,
      employeeName:  leaveForm.employeeName,
      department:    leaveForm.department,
      leaveCode:     leaveForm.leaveCode,
      leaveLabel:    labelMap[leaveForm.leaveCode] ?? leaveForm.leaveCode,
      year:          currentYear.value,
      month:         currentMonth.value,
      day:           leaveForm.day,
      halfDay:       leaveForm.halfDay,
      halfDayPeriod: leaveForm.halfDay ? leaveForm.halfDayPeriod : null,
      reason:        leaveForm.reason,
      status:        'PENDING',
      createdAt:     new Date().toISOString()
    })
    showLeaveForm.value = false
    showToast(`請假申請已送出（${leaveForm.employeeName}）`)
  } catch (e) {
    showToast('送出失敗：' + (e.data?.message ?? e.message), true)
  } finally {
    leaveSubmitting.value = false
  }
}

async function approveLeave(req) {
  try {
    const res = await (await fetch(`${BASE()}/leave/review`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ requestId: req.id, status: 'APPROVED', reviewerName: '', reviewNote: '' })
    })).json()
    if (!res.success) throw new Error(res.message)
    req.status     = 'APPROVED'
    req.reviewedAt = new Date().toISOString()
    // 核准後同步更新本地排班
    const dept = departments.value.find(d => d.name === req.department)
    if (dept) {
      const emp = dept.employees.find(e => e.id === req.employeeId)
      if (emp) emp.schedule[req.day] = req.leaveCode
    }
    showToast(`已核准 ${req.employeeName} ${req.leaveLabel}`)
  } catch (e) {
    showToast('操作失敗：' + (e.data?.message ?? e.message), true)
  }
}

async function rejectLeave(req) {
  try {
    const res = await (await fetch(`${BASE()}/leave/review`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ requestId: req.id, status: 'REJECTED', reviewerName: '', reviewNote: '' })
    })).json()
    if (!res.success) throw new Error(res.message)
    req.status     = 'REJECTED'
    req.reviewedAt = new Date().toISOString()
    showToast(`已駁回 ${req.employeeName} 的申請`)
  } catch (e) {
    showToast('操作失敗：' + (e.data?.message ?? e.message), true)
  }
}

async function cancelLeave(req) {
  if (req.status !== 'PENDING') return
  try {
    await fetch(`${BASE()}/leave/${req.id}`, { method: 'DELETE' })
    leaveRequests.value = leaveRequests.value.filter(r => r.id !== req.id)
    showToast('申請已撤回')
  } catch (e) {
    showToast('撤回失敗：' + (e.data?.message ?? e.message), true)
  }
}

function leaveStatusBadge(status) {
  if (status === 'APPROVED') return 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300'
  if (status === 'REJECTED') return 'bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-300'
  return 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'
}
function leaveStatusLabel(status) {
  if (status === 'APPROVED') return '已核准'
  if (status === 'REJECTED') return '已駁回'
  return '待審核'
}

const pendingCount = computed(() =>
  leaveRequests.value.filter(r =>
    r.status === 'PENDING' && r.year === currentYear.value && r.month === currentMonth.value
  ).length
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
      const res = await (await fetch(`${BASE()}/employees/${body.id}`, {
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
    await fetch(`${BASE()}/employees/${id}`, { method: 'DELETE' })
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

// ── 切換頁籤時載入對應資料 ────────────────────────────────────────
watch(view, (v) => {
  if (v === 'leave') fetchLeaveRequests()
})

// ── 初始載入 ─────────────────────────────────────────────────────
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
          <div class="w-8 h-8 rounded-lg bg-green-700 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">📋</div>
          <div class="min-w-0">
            <h1 class="font-bold text-stone-800 dark:text-stone-100 leading-none text-sm sm:text-base truncate">員工排假班表</h1>
            <p class="text-xs text-stone-400 mt-0.5 hidden sm:block">Shift Schedule</p>
          </div>
        </div>

        <!-- 月份切換 -->
        <div class="flex items-center gap-1 bg-stone-100 dark:bg-zinc-800 rounded-lg px-1 py-0.5 flex-shrink-0">
          <button class="p-1.5 hover:bg-stone-200 dark:hover:bg-zinc-700 rounded-md transition-colors" :disabled="loading" @click="changeMonth(-1)">
            <svg class="w-4 h-4 text-stone-500 dark:text-stone-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/></svg>
          </button>
          <span class="text-sm font-semibold text-stone-700 dark:text-stone-200 min-w-[72px] text-center">
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
              { key: 'leave',    label: '排假' },
              { key: 'staff',    label: '人員' },
            ]" :key="tab.key"
                  :class="['px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors relative',
                     view === tab.key
                       ? 'bg-white dark:bg-zinc-700 text-stone-800 dark:text-stone-100 shadow-sm'
                       : 'text-stone-500 dark:text-stone-400 hover:text-stone-700 dark:hover:text-stone-200']"
                  @click="view = tab.key">
            {{ tab.label }}
            <span v-if="tab.key === 'leave' && pendingCount > 0"
                  class="absolute -top-0.5 -right-0.5 w-2 h-2 bg-red-500 rounded-full"/>
          </button>
        </div>
      </div>

      <!-- 部門 + 圖例（班表/日曆） -->
      <div v-if="view === 'table' || view === 'calendar'" class="flex items-center gap-2 mt-2.5 pt-2.5 border-t border-stone-100 dark:border-stone-800">
        <select v-model="selectedDept"
                class="text-xs border border-stone-200 dark:border-stone-700 rounded-lg px-2 py-1.5 bg-white dark:bg-zinc-800 text-stone-700 dark:text-stone-200 outline-none focus:ring-2 focus:ring-green-400 flex-shrink-0">
          <option v-for="d in departments" :key="d.name" :value="d.name">{{ d.name }}</option>
        </select>
        <div class="hidden sm:flex flex-wrap gap-1.5 flex-1">
          <span v-for="l in LEGENDS" :key="l.code" class="inline-flex items-center gap-1 text-xs">
            <span :class="['inline-flex items-center justify-center w-5 h-5 rounded text-xs font-bold', l.color]">{{ l.code }}</span>
            <span class="text-stone-400 dark:text-stone-500">{{ l.label }}</span>
          </span>
          <span class="inline-block w-px h-4 bg-stone-200 dark:bg-stone-700 self-center mx-1"/>
          <span class="text-xs text-stone-300 dark:text-stone-600 self-center mr-0.5">附加：</span>
          <span v-for="e in EXTRA_OPTIONS" :key="'ex'+e.code" class="inline-flex items-center gap-1 text-xs">
            <span :class="['inline-flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold', e.color]">{{ e.code }}</span>
            <span class="text-stone-400 dark:text-stone-500">{{ e.label }}</span>
          </span>
        </div>
        <button class="sm:hidden ml-auto flex items-center gap-1 text-xs text-stone-400 dark:text-stone-500 px-2 py-1.5 rounded-lg bg-stone-100 dark:bg-zinc-800 hover:bg-stone-200 dark:hover:bg-zinc-700 transition-colors flex-shrink-0"
                @click="legendOpen = !legendOpen">
          圖例
          <svg :class="['w-3 h-3 transition-transform', legendOpen ? 'rotate-180' : '']" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/></svg>
        </button>
      </div>
      <div v-if="legendOpen && (view === 'table' || view === 'calendar')" class="sm:hidden mt-2 pb-1 flex flex-wrap gap-x-3 gap-y-1.5">
        <span v-for="l in LEGENDS" :key="l.code" class="inline-flex items-center gap-1 text-xs">
          <span :class="['inline-flex items-center justify-center w-5 h-5 rounded text-xs font-bold', l.color]">{{ l.code }}</span>
          <span class="text-stone-400 dark:text-stone-500">{{ l.label }}</span>
        </span>
        <span class="w-full h-px bg-stone-100 dark:bg-stone-800 my-0.5"/>
        <span class="text-xs text-stone-300 dark:text-stone-600 self-center">附加：</span>
        <span v-for="e in EXTRA_OPTIONS" :key="'ex'+e.code" class="inline-flex items-center gap-1 text-xs">
          <span :class="['inline-flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold', e.color]">{{ e.code }}</span>
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
        <span class="text-sm">載入中…</span>
      </div>

      <!-- 載入錯誤 -->
      <div v-else-if="loadError && departments.length === 0"
           class="bg-red-50 dark:bg-red-900/20 rounded-2xl border border-red-200 dark:border-red-800 px-4 py-8 text-center">
        <p class="text-sm text-red-600 dark:text-red-400 mb-3">{{ loadError }}</p>
        <button class="text-xs px-3 py-1.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors" @click="fetchSchedule">重新載入</button>
      </div>

      <!-- ══ 班表 ══ -->
      <div v-else-if="view === 'table'">
        <!-- 手機版員工卡片 -->
        <div class="sm:hidden space-y-3">
          <div v-for="emp in currentDeptEmployees" :key="emp.id"
               class="bg-white dark:bg-zinc-900 rounded-2xl border border-stone-200 dark:border-stone-700 shadow-sm overflow-hidden">
            <div class="flex items-center justify-between px-4 py-2.5 bg-stone-50 dark:bg-zinc-800 border-b border-stone-200 dark:border-stone-700">
              <div>
                <span class="font-semibold text-stone-800 dark:text-stone-100 text-sm">{{ emp.name }}</span>
                <span class="text-[11px] text-stone-400 dark:text-stone-500 ml-2">{{ emp.id }}</span>
              </div>
              <div class="flex items-center gap-2 text-xs text-stone-400 dark:text-stone-500">
                <span>應 <span class="font-semibold text-stone-600 dark:text-stone-300">{{ emp.expected }}</span></span>
                <span>實 <span class="font-semibold text-green-700 dark:text-green-400">{{ countActual(emp) }}</span></span>
                <button class="ml-1 text-[10px] px-1.5 py-0.5 bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 rounded-md"
                        @click="openLeaveForm(emp)">申請</button>
              </div>
            </div>
            <div class="overflow-x-auto">
              <div class="flex min-w-max px-2 py-2 gap-1">
                <button v-for="d in days" :key="d"
                        :class="['flex flex-col items-center rounded-xl w-10 py-1.5 flex-shrink-0 transition-colors',
                           dayCellBg(d) || 'bg-stone-50 dark:bg-zinc-800/50',
                           'hover:ring-2 hover:ring-green-400 hover:ring-inset active:scale-95']"
                        @click="openEdit(emp, d)">
                  <span :class="['text-[10px] font-semibold leading-none mb-0.5', dayHeaderClass(d)]">{{ d }}</span>
                  <span :class="['text-[9px] leading-none mb-1', dayHeaderClass(d), 'opacity-70']">{{ WEEKDAY_NAMES[getWeekday(d)] }}</span>
                  <div class="relative flex items-center justify-center w-7 h-7">
                    <span v-if="emp.schedule[d]"
                          :class="['inline-flex items-center justify-center w-7 h-7 rounded-lg text-[12px] font-bold', badgeClass(parseCell(emp.schedule[d]).code)]">
                      {{ parseCell(emp.schedule[d]).code }}
                    </span>
                    <span v-else class="w-7 h-7 rounded-lg border border-dashed border-stone-200 dark:border-stone-700"/>
                    <span v-if="parseCell(emp.schedule[d]).extra"
                          :class="['absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full flex items-center justify-center text-[8px] font-bold leading-none shadow-sm',
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
              <span class="font-semibold text-stone-700 dark:text-stone-300 text-sm">每日人力</span>
              <span class="text-xs text-stone-400 ml-2">總人數 {{ totalEmployees }}</span>
            </div>
            <div class="overflow-x-auto">
              <div class="flex min-w-max px-2 py-2 gap-1">
                <div v-for="d in days" :key="d"
                     :class="['flex flex-col items-center rounded-xl w-10 py-1.5 flex-shrink-0', dayCellBg(d) || 'bg-stone-50 dark:bg-zinc-800/50']">
                  <span :class="['text-[10px] font-semibold leading-none mb-0.5', dayHeaderClass(d)]">{{ d }}</span>
                  <span :class="['text-[9px] leading-none mb-1', dayHeaderClass(d), 'opacity-70']">{{ WEEKDAY_NAMES[getWeekday(d)] }}</span>
                  <span v-if="dailyWorkCount(d) > 0"
                        class="inline-flex items-center justify-center w-7 h-7 rounded-lg text-[11px] font-bold bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300">
                    {{ dailyWorkCount(d) }}
                  </span>
                  <span v-else class="w-7 h-7 flex items-center justify-center text-[10px] text-stone-300 dark:text-stone-600">—</span>
                </div>
              </div>
            </div>
          </div>
          <div v-if="currentDeptEmployees.length === 0" class="bg-white dark:bg-zinc-900 rounded-2xl border border-stone-200 dark:border-stone-700 px-4 py-12 text-center text-stone-400 text-sm shadow-sm">此部門暫無員工資料</div>
        </div>

        <!-- 桌機版表格 -->
        <div class="hidden sm:block bg-white dark:bg-zinc-900 rounded-2xl border border-stone-200 dark:border-stone-700 shadow-sm overflow-hidden">
          <div class="overflow-x-auto">
            <table class="w-full text-xs border-collapse min-w-[700px]">
              <thead>
              <tr class="bg-stone-50 dark:bg-zinc-800 border-b border-stone-200 dark:border-stone-700">
                <th class="sticky left-0 z-10 bg-stone-50 dark:bg-zinc-800 px-3 py-2 text-left text-stone-500 dark:text-stone-400 font-medium whitespace-nowrap border-r border-stone-200 dark:border-stone-700 min-w-[110px]">姓名</th>
                <th v-for="d in days" :key="d" :class="['px-0 py-2 text-center font-semibold w-8 min-w-[32px]', dayHeaderClass(d)]">{{ d }}</th>
                <th class="px-2 py-2 text-center text-stone-400 dark:text-stone-500 font-medium whitespace-nowrap border-l border-stone-200 dark:border-stone-700 w-10">應</th>
                <th class="px-2 py-2 text-center text-stone-400 dark:text-stone-500 font-medium whitespace-nowrap w-10">實</th>
                <th class="px-2 py-2 text-center text-stone-400 dark:text-stone-500 font-medium whitespace-nowrap w-12">申請</th>
              </tr>
              <tr class="border-b-2 border-stone-200 dark:border-stone-700">
                <th class="sticky left-0 z-10 bg-white dark:bg-zinc-900 border-r border-stone-200 dark:border-stone-700 px-3 py-1 text-left text-stone-300 dark:text-stone-600 font-normal text-[10px]">
                  {{ currentYear }}年{{ currentMonth }}月
                </th>
                <th v-for="d in days" :key="d" :class="['py-1 text-center text-[10px] font-normal', dayHeaderClass(d), dayCellBg(d)]">
                  {{ WEEKDAY_NAMES[getWeekday(d)] }}
                  <div v-if="holidays[d]" class="text-[9px] text-pink-400 leading-tight">{{ holidays[d] }}</div>
                </th>
                <th class="border-l border-stone-200 dark:border-stone-700" colspan="3"/>
              </tr>
              </thead>
              <tbody class="divide-y divide-stone-100 dark:divide-stone-800">
              <tr v-for="emp in currentDeptEmployees" :key="emp.id"
                  class="hover:bg-stone-50 dark:hover:bg-zinc-800/40 transition-colors">
                <td class="sticky left-0 z-10 bg-white dark:bg-zinc-900 hover:bg-stone-50 dark:hover:bg-zinc-800/40 border-r border-stone-200 dark:border-stone-700 px-3 py-2 whitespace-nowrap">
                  <div class="font-semibold text-stone-800 dark:text-stone-100 text-xs">{{ emp.name }}</div>
                  <div class="text-[10px] text-stone-400 dark:text-stone-500">{{ emp.id }}</div>
                </td>
                <td v-for="d in days" :key="d"
                    :class="['text-center py-1.5 px-0 cursor-pointer transition-colors', dayCellBg(d), 'hover:ring-1 hover:ring-inset hover:ring-green-400']"
                    @click="openEdit(emp, d)">
                  <template v-if="emp.schedule[d]">
                    <div class="relative inline-flex items-center justify-center">
                        <span :class="['inline-flex items-center justify-center w-6 h-6 rounded text-[11px] font-bold', badgeClass(parseCell(emp.schedule[d]).code)]">
                          {{ parseCell(emp.schedule[d]).code }}
                        </span>
                      <span v-if="parseCell(emp.schedule[d]).extra"
                            :class="['absolute -top-1 -right-1.5 w-3.5 h-3.5 rounded-full flex items-center justify-center text-[8px] font-bold leading-none shadow-sm',
                                   extraBadgeClass(parseCell(emp.schedule[d]).extra)]">
                          {{ parseCell(emp.schedule[d]).extra }}
                        </span>
                    </div>
                  </template>
                </td>
                <td class="text-center border-l border-stone-200 dark:border-stone-700 text-stone-500 dark:text-stone-400 font-medium py-2">{{ emp.expected }}</td>
                <td class="text-center text-stone-700 dark:text-stone-200 font-semibold py-2">{{ countActual(emp) }}</td>
                <td class="text-center py-2">
                  <button class="text-[10px] px-1.5 py-0.5 bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 rounded-md hover:bg-green-200 transition-colors"
                          @click="openLeaveForm(emp)">申請</button>
                </td>
              </tr>
              </tbody>
              <tfoot class="border-t-2 border-stone-200 dark:border-stone-700">
              <tr class="bg-stone-50 dark:bg-zinc-800">
                <td class="sticky left-0 z-10 bg-stone-50 dark:bg-zinc-800 border-r border-stone-200 dark:border-stone-700 px-3 py-2 whitespace-nowrap">
                  <div class="text-xs font-semibold text-stone-600 dark:text-stone-300">每日人力</div>
                  <div class="text-[10px] text-stone-400 dark:text-stone-500">總人數 {{ totalEmployees }}</div>
                </td>
                <td v-for="d in days" :key="d" :class="['text-center py-1.5 px-0', dayCellBg(d)]">
                    <span v-if="dailyWorkCount(d) > 0"
                          class="inline-flex items-center justify-center w-6 h-6 rounded text-[11px] font-bold bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300">
                      {{ dailyWorkCount(d) }}
                    </span>
                  <span v-else class="text-[10px] text-stone-300 dark:text-stone-600">—</span>
                </td>
                <td class="border-l border-stone-200 dark:border-stone-700" colspan="3"/>
              </tr>
              <tr class="bg-stone-50/60 dark:bg-zinc-800/60">
                <td class="sticky left-0 z-10 bg-stone-50 dark:bg-zinc-800 border-r border-stone-200 dark:border-stone-700 px-3 py-2 whitespace-nowrap">
                  <div class="text-xs font-semibold text-stone-500 dark:text-stone-400">休假人數</div>
                </td>
                <td v-for="d in days" :key="d" :class="['text-center py-1.5 px-0', dayCellBg(d)]">
                    <span v-if="dailyOffCount(d) > 0"
                          class="inline-flex items-center justify-center w-6 h-6 rounded text-[11px] font-bold bg-stone-200 text-stone-500 dark:bg-zinc-700 dark:text-stone-300">
                      {{ dailyOffCount(d) }}
                    </span>
                  <span v-else class="text-[10px] text-stone-300 dark:text-stone-600">—</span>
                </td>
                <td class="border-l border-stone-200 dark:border-stone-700" colspan="3"/>
              </tr>
              </tfoot>
            </table>
          </div>
        </div>
        <div v-if="!loading && currentDeptEmployees.length === 0"
             class="hidden sm:block bg-white dark:bg-zinc-900 rounded-2xl border border-stone-200 dark:border-stone-700 px-4 py-12 text-center text-stone-400 text-sm shadow-sm mt-3">
          此部門暫無員工資料
        </div>
      </div>

      <!-- ══ 日曆 ══ -->
      <div v-else-if="view === 'calendar'">
        <div class="bg-white dark:bg-zinc-900 rounded-2xl border border-stone-200 dark:border-stone-700 shadow-sm px-3 sm:px-4 py-3 mb-3">
          <div class="flex flex-wrap items-center gap-1.5 sm:gap-2">
            <span class="text-xs text-stone-400 dark:text-stone-500 font-medium w-full sm:w-auto">顯示員工：</span>
            <label v-for="emp in currentDeptEmployees" :key="emp.id" class="flex items-center gap-1 cursor-pointer select-none">
              <input v-model="calSelectedIds" type="checkbox" :value="emp.id" class="rounded accent-green-600">
              <span :class="['text-xs px-1.5 py-0.5 rounded-full transition-colors',
                             calSelectedIds.includes(emp.id) ? 'bg-green-700 text-white' : 'bg-stone-100 dark:bg-zinc-700 text-stone-600 dark:text-stone-300']">
                {{ emp.name }}
              </span>
            </label>
          </div>
        </div>
        <div class="bg-white dark:bg-zinc-900 rounded-2xl border border-stone-200 dark:border-stone-700 shadow-sm overflow-hidden">
          <div class="grid grid-cols-7 border-b border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-zinc-800">
            <div v-for="(w, wi) in WEEKDAY_NAMES" :key="w"
                 :class="['text-center font-semibold py-1.5 sm:py-2 text-[10px] sm:text-xs',
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
                  <span :class="['text-xs sm:text-sm font-bold leading-none', dayHeaderClass(d)]">{{ d }}</span>
                  <span v-if="holidays[d]" class="hidden sm:inline text-[9px] bg-pink-100 dark:bg-pink-900/30 text-pink-500 rounded px-1 py-0.5 leading-none">{{ holidays[d] }}</span>
                  <span v-if="holidays[d]" class="sm:hidden w-1.5 h-1.5 rounded-full bg-pink-400 flex-shrink-0 mt-0.5"/>
                </div>
                <span v-if="lunar[d]" class="text-[8px] sm:text-[9px] text-stone-300 dark:text-stone-600 leading-none mt-0.5">{{ lunar[d] }}</span>
              </div>
              <div class="flex flex-col gap-0.5">
                <template v-for="emp in calFilteredEmps" :key="emp.id">
                  <button v-if="emp.schedule[d]"
                          :class="['flex items-center justify-between gap-0.5 sm:gap-1 w-full rounded transition-opacity hover:opacity-80 active:scale-95 px-1 py-0.5 sm:px-1.5',
                             badgeClass(parseCell(emp.schedule[d]).code)]"
                          @click="openEdit(emp, d)">
                    <span class="sm:hidden text-[10px] font-semibold leading-tight truncate flex-1 text-left">{{ emp.name.slice(0, 1) }}</span>
                    <span class="hidden sm:flex flex-col items-start min-w-0 flex-1">
                      <span class="font-medium truncate leading-tight text-[11px]">{{ emp.name }}</span>
                      <span class="text-[9px] opacity-60 leading-tight">{{ emp.id }}</span>
                    </span>
                    <span class="flex items-center gap-0.5 flex-shrink-0">
                      <span class="font-bold text-[10px] sm:text-[11px]">{{ parseCell(emp.schedule[d]).code }}</span>
                      <span v-if="parseCell(emp.schedule[d]).extra"
                            :class="['w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full flex items-center justify-center text-[8px] sm:text-[9px] font-bold leading-none shadow-sm',
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

      <!-- ══ 排假申請 ══ -->
      <div v-else-if="view === 'leave'">
        <div class="flex flex-wrap items-center gap-2 mb-4">
          <h2 class="text-sm font-bold text-stone-800 dark:text-stone-100 flex-1">排假申請管理</h2>
          <select v-model="leaveFilterDept"
                  class="text-xs border border-stone-200 dark:border-stone-700 rounded-lg px-2 py-1.5 bg-white dark:bg-zinc-800 text-stone-700 dark:text-stone-200 outline-none focus:ring-2 focus:ring-green-400">
            <option value="">全部部門</option>
            <option v-for="d in departments" :key="d.name" :value="d.name">{{ d.name }}</option>
          </select>
          <div class="flex gap-0.5 bg-stone-100 dark:bg-zinc-800 rounded-lg p-0.5">
            <button v-for="s in [
                { key: 'ALL', label: '全部' },
                { key: 'PENDING', label: '待審' },
                { key: 'APPROVED', label: '核准' },
                { key: 'REJECTED', label: '駁回' },
              ]" :key="s.key"
                    :class="['px-2.5 py-1 text-xs font-medium rounded-md transition-colors',
                       leaveFilterStatus === s.key ? 'bg-white dark:bg-zinc-700 text-stone-800 dark:text-stone-100 shadow-sm' : 'text-stone-500 dark:text-stone-400']"
                    @click="leaveFilterStatus = s.key">
              {{ s.label }}
            </button>
          </div>
          <button class="flex items-center gap-1.5 px-3 py-1.5 bg-green-700 hover:bg-green-800 text-white text-xs font-medium rounded-lg transition-colors"
                  @click="openLeaveForm(null)">
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
            新增申請
          </button>
        </div>

        <div v-if="leaveLoading" class="flex justify-center py-12 text-stone-400 text-sm gap-2">
          <svg class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/></svg>
          載入中…
        </div>
        <div v-else-if="filteredLeaveRequests.length === 0"
             class="bg-white dark:bg-zinc-900 rounded-2xl border border-stone-200 dark:border-stone-700 px-4 py-12 text-center text-stone-400 text-sm shadow-sm">
          暫無申請記錄
        </div>
        <div v-else class="space-y-2">
          <div v-for="req in filteredLeaveRequests" :key="req.id"
               class="bg-white dark:bg-zinc-900 rounded-2xl border border-stone-200 dark:border-stone-700 shadow-sm px-4 py-3 flex flex-wrap sm:flex-nowrap items-center gap-3">
            <span :class="['flex-shrink-0 inline-flex items-center justify-center w-9 h-9 rounded-xl text-base font-bold', badgeClass(req.leaveCode)]">
              {{ req.leaveCode }}
            </span>
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2 flex-wrap">
                <span class="font-semibold text-stone-800 dark:text-stone-100 text-sm">{{ req.employeeName }}</span>
                <span class="text-xs text-stone-400 dark:text-stone-500">{{ req.department }}</span>
              </div>
              <div class="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
                {{ req.year }}/{{ String(req.month).padStart(2,'0') }}/{{ String(req.day).padStart(2,'0') }}
                <span v-if="req.halfDay" class="ml-1 text-orange-500">（{{ req.halfDayPeriod === 'AM' ? '上午' : '下午' }}）</span>
                ・{{ req.leaveLabel }}
                <span v-if="req.reason" class="ml-1 text-stone-400">｜{{ req.reason }}</span>
              </div>
            </div>
            <span :class="['flex-shrink-0 text-xs px-2 py-1 rounded-lg font-medium', leaveStatusBadge(req.status)]">
              {{ leaveStatusLabel(req.status) }}
            </span>
            <div class="flex gap-1.5 flex-shrink-0">
              <template v-if="req.status === 'PENDING'">
                <button class="text-xs px-2.5 py-1 bg-green-700 hover:bg-green-800 text-white rounded-lg transition-colors" @click="approveLeave(req)">核准</button>
                <button class="text-xs px-2.5 py-1 bg-red-100 hover:bg-red-200 text-red-600 dark:bg-red-900/30 dark:text-red-400 rounded-lg transition-colors" @click="rejectLeave(req)">駁回</button>
                <button class="text-xs px-2.5 py-1 text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 rounded-lg hover:bg-stone-100 dark:hover:bg-zinc-800 transition-colors" @click="cancelLeave(req)">撤回</button>
              </template>
              <span v-else class="text-[10px] text-stone-300 dark:text-stone-600">
                {{ req.reviewedAt ? new Date(req.reviewedAt).toLocaleDateString('zh-TW') : '' }}
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- ══ 人員設定 ══ -->
      <div v-else-if="view === 'staff'">
        <div class="flex items-center gap-2 mb-4">
          <h2 class="text-sm font-bold text-stone-800 dark:text-stone-100 flex-1">人員設定</h2>
          <button class="flex items-center gap-1.5 px-3 py-1.5 bg-green-700 hover:bg-green-800 text-white text-xs font-medium rounded-lg transition-colors" @click="openAddStaff">
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
            新增員工
          </button>
        </div>
        <div class="space-y-4">
          <div v-for="dept in departments" :key="dept.name"
               class="bg-white dark:bg-zinc-900 rounded-2xl border border-stone-200 dark:border-stone-700 shadow-sm overflow-hidden">
            <div class="flex items-center justify-between px-4 py-3 bg-stone-50 dark:bg-zinc-800 border-b border-stone-200 dark:border-stone-700">
              <span class="font-semibold text-stone-800 dark:text-stone-100 text-sm">{{ dept.name }}</span>
              <span class="text-xs text-stone-400 dark:text-stone-500">{{ dept.employees.length }} 人</span>
            </div>
            <div v-if="dept.employees.length === 0" class="px-4 py-6 text-center text-stone-400 text-xs">此部門暫無員工</div>
            <div v-else class="divide-y divide-stone-100 dark:divide-stone-800">
              <div v-for="emp in dept.employees" :key="emp.id"
                   class="flex items-center gap-3 px-4 py-3 hover:bg-stone-50 dark:hover:bg-zinc-800/40 transition-colors">
                <div class="w-8 h-8 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center text-green-700 dark:text-green-400 font-bold text-sm flex-shrink-0">
                  {{ emp.name.slice(0, 1) }}
                </div>
                <div class="flex-1 min-w-0">
                  <div class="font-semibold text-stone-800 dark:text-stone-100 text-sm">{{ emp.name }}</div>
                  <div class="text-[11px] text-stone-400 dark:text-stone-500">{{ emp.id }} · 預計休假 {{ emp.expected }} 天</div>
                </div>
                <div class="flex gap-1.5 flex-shrink-0">
                  <button class="text-xs px-2.5 py-1 text-stone-500 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-zinc-700 rounded-lg transition-colors"
                          @click="openEditStaff(emp, dept.name)">編輯</button>
                  <button class="text-xs px-2.5 py-1 text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
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
            <p class="text-xs text-stone-400 mt-0.5">
              {{ editEmp?.name }}
              <span class="text-stone-300 dark:text-stone-600">{{ editEmp?.id }}</span>
              · {{ currentMonth }}/{{ editDay }} {{ editWeekday }}
            </p>
          </div>
          <button class="p-1.5 hover:bg-stone-100 dark:hover:bg-zinc-700 rounded-lg transition-colors text-stone-400" @click="showForm = false">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
        </div>
        <p class="text-[11px] font-semibold text-stone-400 dark:text-stone-500 uppercase tracking-wide mb-2">主狀態</p>
        <div class="grid grid-cols-4 gap-2 mb-4">
          <button v-for="opt in EDIT_OPTIONS" :key="opt.code"
                  :class="['flex flex-col items-center gap-1 py-2.5 rounded-xl border-2 transition-all',
                     editCode === opt.code ? 'border-green-600 ring-2 ring-green-200 dark:ring-green-800 scale-105' : 'border-transparent hover:border-stone-200 dark:hover:border-stone-600']"
                  @click="editCode = opt.code">
            <span :class="['w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold', opt.color]">{{ opt.code }}</span>
            <span class="text-[10px] text-stone-500 dark:text-stone-400">{{ opt.label }}</span>
          </button>
          <button
            :class="['flex flex-col items-center gap-1 py-2.5 rounded-xl border-2 transition-all',
                     editCode === '' ? 'border-green-600 ring-2 ring-green-200 dark:ring-green-800 scale-105' : 'border-transparent hover:border-stone-200 dark:hover:border-stone-600']"
            @click="editCode = ''; editExtra = ''">
            <span class="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold bg-stone-100 dark:bg-zinc-700 text-stone-400">—</span>
            <span class="text-[10px] text-stone-500 dark:text-stone-400">清除</span>
          </button>
        </div>
        <transition name="fade">
          <div v-if="canSetExtra" class="mb-4">
            <p class="text-[11px] font-semibold text-stone-400 dark:text-stone-500 uppercase tracking-wide mb-2">
              附加工作 <span class="text-stone-300 dark:text-stone-600 normal-case font-normal">（休假期間）</span>
            </p>
            <div class="flex gap-2">
              <button :class="['flex flex-col items-center gap-1 px-3 py-2 rounded-xl border-2 transition-all', editExtra === '' ? 'border-green-600 ring-2 ring-green-200 dark:ring-green-800' : 'border-transparent hover:border-stone-200 dark:hover:border-stone-600']" @click="editExtra = ''">
                <span class="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold bg-stone-100 dark:bg-zinc-700 text-stone-400">—</span>
                <span class="text-[10px] text-stone-500 dark:text-stone-400">無</span>
              </button>
              <button v-for="opt in EXTRA_OPTIONS" :key="opt.code"
                      :class="['flex flex-col items-center gap-1 px-3 py-2 rounded-xl border-2 transition-all', editExtra === opt.code ? 'border-green-600 ring-2 ring-green-200 dark:ring-green-800 scale-105' : 'border-transparent hover:border-stone-200 dark:hover:border-stone-600']"
                      @click="editExtra = opt.code">
                <span :class="['w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold', opt.color]">{{ opt.code }}</span>
                <span class="text-[10px] text-stone-500 dark:text-stone-400">{{ opt.label }}</span>
              </button>
            </div>
          </div>
        </transition>
        <div v-if="editCode" class="mb-4 px-3 py-2 bg-stone-50 dark:bg-zinc-800 rounded-xl flex items-center gap-2 text-xs text-stone-500 dark:text-stone-400">
          <span class="text-stone-400">預覽：</span>
          <div class="relative inline-flex items-center justify-center">
            <span :class="['inline-flex items-center justify-center w-7 h-7 rounded-lg text-sm font-bold', badgeClass(editCode)]">{{ editCode }}</span>
            <span v-if="editExtra" :class="['absolute -top-1 -right-1.5 w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold leading-none shadow-sm', extraBadgeClass(editExtra)]">{{ editExtra }}</span>
          </div>
          <span class="ml-1">
            {{ LEGENDS.find(l => l.code === editCode)?.label ?? editCode }}
            <template v-if="editExtra">＋ {{ EXTRA_OPTIONS.find(e => e.code === editExtra)?.label }}</template>
          </span>
        </div>
        <div class="flex gap-2">
          <button class="flex-1 py-2.5 text-sm border border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-300 rounded-xl hover:bg-stone-50 dark:hover:bg-zinc-800 transition-colors" @click="showForm = false">取消</button>
          <button class="flex-1 py-2.5 text-sm bg-green-700 hover:bg-green-800 text-white rounded-xl font-medium transition-colors flex items-center justify-center gap-2"
                  :disabled="saving" @click="saveEdit">
            <svg v-if="saving" class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/></svg>
            {{ saving ? '儲存中…' : '儲存' }}
          </button>
        </div>
      </div>
    </div>

    <!-- ══ Modal：請假申請 ══ -->
    <div v-if="showLeaveForm" class="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center z-50" @click.self="showLeaveForm = false">
      <div class="bg-white dark:bg-zinc-900 rounded-t-3xl sm:rounded-2xl shadow-xl w-full sm:max-w-md p-5 max-h-[90vh] overflow-y-auto">
        <div class="flex items-center justify-between mb-4">
          <div>
            <h3 class="font-bold text-stone-800 dark:text-stone-100">前排假申請</h3>
            <p v-if="leaveForm.employeeName" class="text-xs text-stone-400 mt-0.5">{{ leaveForm.employeeName }} · {{ leaveForm.department }}</p>
          </div>
          <button class="p-1.5 hover:bg-stone-100 dark:hover:bg-zinc-700 rounded-lg transition-colors text-stone-400" @click="showLeaveForm = false">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
        </div>

        <!-- 若從排假管理頁開啟（無預設員工）需選部門 + 員工 -->
        <div v-if="!leaveForm.employeeId" class="mb-4 space-y-2">
          <label class="text-[11px] font-semibold text-stone-400 dark:text-stone-500 uppercase tracking-wide block">選擇員工</label>
          <select v-model="leaveForm.department"
                  class="w-full text-sm border border-stone-200 dark:border-stone-700 rounded-xl px-3 py-2 bg-white dark:bg-zinc-800 text-stone-700 dark:text-stone-200 outline-none focus:ring-2 focus:ring-green-400">
            <option v-for="d in departments" :key="d.name" :value="d.name">{{ d.name }}</option>
          </select>
          <select v-model="leaveForm.employeeId"
                  class="w-full text-sm border border-stone-200 dark:border-stone-700 rounded-xl px-3 py-2 bg-white dark:bg-zinc-800 text-stone-700 dark:text-stone-200 outline-none focus:ring-2 focus:ring-green-400"
                  @change="leaveForm.employeeName = departments.find(d => d.name === leaveForm.department)?.employees.find(e => e.id === leaveForm.employeeId)?.name ?? ''">
            <option value="">請選擇員工</option>
            <option v-for="emp in (departments.find(d => d.name === leaveForm.department)?.employees ?? [])" :key="emp.id" :value="emp.id">{{ emp.name }}</option>
          </select>
        </div>

        <!-- 假別 -->
        <div class="mb-4">
          <label class="text-[11px] font-semibold text-stone-400 dark:text-stone-500 uppercase tracking-wide block mb-2">假別</label>
          <div class="grid grid-cols-4 gap-2">
            <button v-for="lc in APPLY_LEAVE_CODES" :key="lc.code"
                    :class="['flex flex-col items-center gap-1 py-2.5 rounded-xl border-2 transition-all',
                       leaveForm.leaveCode === lc.code ? 'border-green-600 ring-2 ring-green-200 dark:ring-green-800 scale-105' : 'border-transparent hover:border-stone-200 dark:hover:border-stone-600']"
                    @click="leaveForm.leaveCode = lc.code">
              <span :class="['w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold', badgeClass(lc.code)]">{{ lc.code }}</span>
              <span class="text-[10px] text-stone-500 dark:text-stone-400 text-center leading-tight">{{ lc.label }}</span>
            </button>
          </div>
        </div>

        <!-- 日期 -->
        <div class="mb-4">
          <label class="text-[11px] font-semibold text-stone-400 dark:text-stone-500 uppercase tracking-wide block mb-1.5">請假日期</label>
          <div class="flex items-center gap-2">
            <span class="text-sm text-stone-500 dark:text-stone-400">{{ currentYear }}/{{ String(currentMonth).padStart(2,'0') }}/</span>
            <select v-model="leaveForm.day"
                    class="text-sm border border-stone-200 dark:border-stone-700 rounded-xl px-3 py-2 bg-white dark:bg-zinc-800 text-stone-700 dark:text-stone-200 outline-none focus:ring-2 focus:ring-green-400">
              <option v-for="d in days" :key="d" :value="d">{{ String(d).padStart(2,'0') }} {{ WEEKDAY_NAMES[getWeekday(d)] }}</option>
            </select>
          </div>
        </div>

        <!-- 半天 -->
        <div class="mb-4">
          <label class="flex items-center gap-2 cursor-pointer">
            <input v-model="leaveForm.halfDay" type="checkbox" class="rounded accent-green-600">
            <span class="text-sm text-stone-700 dark:text-stone-200">只請半天</span>
          </label>
          <div v-if="leaveForm.halfDay" class="mt-2 flex gap-2">
            <button v-for="p in [{ key: 'AM', label: '上午' }, { key: 'PM', label: '下午' }]" :key="p.key"
                    :class="['flex-1 py-2 text-sm rounded-xl border-2 transition-all font-medium',
                       leaveForm.halfDayPeriod === p.key ? 'border-green-600 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400' : 'border-stone-200 dark:border-stone-700 text-stone-500 dark:text-stone-400 hover:border-stone-300']"
                    @click="leaveForm.halfDayPeriod = p.key">{{ p.label }}</button>
          </div>
        </div>

        <!-- 原因 -->
        <div class="mb-5">
          <label class="text-[11px] font-semibold text-stone-400 dark:text-stone-500 uppercase tracking-wide block mb-1.5">請假原因（選填）</label>
          <textarea v-model="leaveForm.reason" rows="2" placeholder="請輸入事由…"
                    class="w-full text-sm border border-stone-200 dark:border-stone-700 rounded-xl px-3 py-2 bg-white dark:bg-zinc-800 text-stone-700 dark:text-stone-200 outline-none focus:ring-2 focus:ring-green-400 resize-none"/>
        </div>

        <div class="flex gap-2">
          <button class="flex-1 py-2.5 text-sm border border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-300 rounded-xl hover:bg-stone-50 dark:hover:bg-zinc-800 transition-colors" @click="showLeaveForm = false">取消</button>
          <button class="flex-1 py-2.5 text-sm bg-green-700 hover:bg-green-800 text-white rounded-xl font-medium transition-colors flex items-center justify-center gap-2"
                  :disabled="leaveSubmitting" @click="submitLeaveRequest">
            <svg v-if="leaveSubmitting" class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/></svg>
            {{ leaveSubmitting ? '送出中…' : '送出申請' }}
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
            <label class="text-[11px] font-semibold text-stone-400 dark:text-stone-500 uppercase tracking-wide block mb-1">員工 ID</label>
            <input v-model="staffForm.id" type="text" placeholder="e.g. F00001"
                   :disabled="staffFormMode === 'edit'"
                   class="w-full text-sm border border-stone-200 dark:border-stone-700 rounded-xl px-3 py-2 bg-white dark:bg-zinc-800 text-stone-700 dark:text-stone-200 outline-none focus:ring-2 focus:ring-green-400 disabled:opacity-50 disabled:cursor-not-allowed"/>
          </div>
          <div>
            <label class="text-[11px] font-semibold text-stone-400 dark:text-stone-500 uppercase tracking-wide block mb-1">姓名</label>
            <input v-model="staffForm.name" type="text" placeholder="員工姓名"
                   class="w-full text-sm border border-stone-200 dark:border-stone-700 rounded-xl px-3 py-2 bg-white dark:bg-zinc-800 text-stone-700 dark:text-stone-200 outline-none focus:ring-2 focus:ring-green-400"/>
          </div>
          <div>
            <label class="text-[11px] font-semibold text-stone-400 dark:text-stone-500 uppercase tracking-wide block mb-1">部門</label>
            <select v-model="staffForm.department"
                    class="w-full text-sm border border-stone-200 dark:border-stone-700 rounded-xl px-3 py-2 bg-white dark:bg-zinc-800 text-stone-700 dark:text-stone-200 outline-none focus:ring-2 focus:ring-green-400">
              <option v-for="d in deptNames" :key="d" :value="d">{{ d }}</option>
            </select>
          </div>
          <div>
            <label class="text-[11px] font-semibold text-stone-400 dark:text-stone-500 uppercase tracking-wide block mb-1">預計休假天數（當月）</label>
            <input v-model.number="staffForm.expectedLeave" type="number" min="0" max="31"
                   class="w-full text-sm border border-stone-200 dark:border-stone-700 rounded-xl px-3 py-2 bg-white dark:bg-zinc-800 text-stone-700 dark:text-stone-200 outline-none focus:ring-2 focus:ring-green-400"/>
          </div>
        </div>
        <div class="flex gap-2">
          <button class="flex-1 py-2.5 text-sm border border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-300 rounded-xl hover:bg-stone-50 dark:hover:bg-zinc-800 transition-colors" @click="showStaffForm = false">取消</button>
          <button class="flex-1 py-2.5 text-sm bg-green-700 hover:bg-green-800 text-white rounded-xl font-medium transition-colors flex items-center justify-center gap-2"
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
        <p class="text-sm text-stone-500 dark:text-stone-400 mb-5">
          確定要刪除員工
          <span class="font-semibold text-stone-800 dark:text-stone-100">
            {{ allEmployeesFlat.find(e => e.id === staffDeleteId)?.name }}
          </span>
          嗎？此操作無法復原。
        </p>
        <div class="flex gap-2">
          <button class="flex-1 py-2.5 text-sm border border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-300 rounded-xl hover:bg-stone-50 dark:hover:bg-zinc-800 transition-colors" @click="showDeleteConfirm = false">取消</button>
          <button class="flex-1 py-2.5 text-sm bg-red-600 hover:bg-red-700 text-white rounded-xl font-medium transition-colors" @click="deleteStaff">刪除</button>
        </div>
      </div>
    </div>

    <!-- Toast -->
    <transition name="fade">
      <div v-if="toast.show"
           :class="['fixed bottom-6 left-1/2 -translate-x-1/2 sm:left-auto sm:right-6 sm:translate-x-0 text-white text-sm px-4 py-3 rounded-xl shadow-lg flex items-center gap-2 z-50 whitespace-nowrap',
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
