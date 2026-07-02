<script setup>
definePageMeta({ layout: 'staff', requiredPermission: 'personnel.class-schedule' })

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
  { code: '喪', label: '喪假',           color: 'bg-gray-200 text-gray-600 dark:bg-gray-700/60 dark:text-gray-300' },
]

const EXTRA_OPTIONS = [
  { code: '加', label: '加班', color: 'bg-red-500 text-white' },
  { code: '水', label: '澆水', color: 'bg-lime-600 text-white' }
]

const EDIT_OPTIONS = [...LEGENDS, { code: 'V', label: 'V', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-700' }]

const OFF_CODES = new Set(['休', '例', '假', '積', '特', '半', '公', '原', '事', '病', '喪'])

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
    ?? 'bg-surface2 text-muted-c'
}

function extraBadgeClass(extra) {
  return EXTRA_OPTIONS.find(e => e.code === extra)?.color ?? 'bg-accent-solid text-white'
}

// ── 日期 ──────────────────────────────────────────────────────────
const MONTH_KEY = 'class-schedule-currentYM'
const _initYM = (() => {
  try {
    if (!import.meta.client) throw new Error()
    const v = localStorage.getItem(MONTH_KEY)
    if (v) {
      const [y, m] = v.split('-').map(Number)
      if (y >= 2020 && y <= 2099 && m >= 1 && m <= 12) return { y, m }
    }
  } catch {}
  return { y: new Date().getFullYear(), m: new Date().getMonth() + 1 }
})()
const currentYear  = ref(_initYM.y)
const currentMonth = ref(_initYM.m)
watch([currentYear, currentMonth], ([y, m]) => {
    try { localStorage.setItem(MONTH_KEY, `${y}-${m}`) } catch {}
  }
)

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
  return 'text-hint-c'
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

async function fetchSchedule(silent = false) {
  if (!silent) {
    loading.value   = true
    loadError.value = ''
  }
  try {
    const res  = await (await fetch(`${BASE()}/${currentYear.value}/${currentMonth.value}`)).json()
    if (!res.success) throw new Error(res.message ?? '載入失敗')
    const data = res.data

    holidays.value = normalizeKeys(data.holidays ?? {})
    lunar.value    = normalizeKeys(data.lunar    ?? {})

    const incoming = (data.departments ?? []).map(dept => ({
      name:      dept.name,
      employees: (dept.employees ?? []).map(emp => ({
        name:     emp.name,
        id:       String(emp.id),
        expected: emp.expected ?? 0,
        schedule: normalizeKeys(emp.schedule ?? {})
      }))
    }))

    if (silent && departments.value.length > 0) {
      // 靜默合併：只更新有變動的 schedule 格子，不替換整個陣列避免畫面閃爍
      for (const inDept of incoming) {
        const localDept = departments.value.find(d => d.name === inDept.name)
        if (!localDept) continue
        for (const inEmp of inDept.employees) {
          const localEmp = localDept.employees.find(e => e.id === inEmp.id)
          if (!localEmp) continue
          // 更新 expected
          localEmp.expected = inEmp.expected
          // 合併 schedule：只寫入有差異的 key，跳過佇列中待送出的格子
          const queue = loadQueue()
          for (const [dayStr, val] of Object.entries(inEmp.schedule)) {
            const day = Number(dayStr)
            const queueKey = `${currentYear.value}-${currentMonth.value}-${inEmp.id}-${day}`
            if (queue[queueKey]) continue  // 本地有未送出變更，保留本地值
            localEmp.schedule[day] = val
          }
          // 清除後端已刪除的格子（同樣跳過佇列中的）
          for (const dayStr of Object.keys(localEmp.schedule)) {
            const day = Number(dayStr)
            if (!(day in inEmp.schedule)) {
              const queueKey = `${currentYear.value}-${currentMonth.value}-${inEmp.id}-${day}`
              if (!loadQueue()[queueKey]) delete localEmp.schedule[day]
            }
          }
        }
      }
    } else {
      // 初始載入或月份切換：完整替換
      departments.value = incoming
      if (departments.value.length && !departments.value.find(d => d.name === selectedDept.value)) {
        selectedDept.value = departments.value[0].name
      }
    }
  } catch (e) {
    if (!silent) {
      loadError.value = e.message ?? '網路錯誤'
      showToast('載入失敗：' + loadError.value)
      departments.value = []
      holidays.value    = {}
      lunar.value       = {}
    }
    // 靜默刷新失敗時不打擾使用者，下次再試
  } finally {
    if (!silent) {
      loading.value = false
      nextTick(() => updateTableScale())
    }
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
const DEPT_KEY = 'class-schedule-selectedDept'
const VIEW_KEY = 'class-schedule-view'
const selectedDept = ref('')
const view         = ref('table')
watch(selectedDept, v => { try { localStorage.setItem(DEPT_KEY, v) } catch {} })
watch(view,         v => { try { localStorage.setItem(VIEW_KEY, v) } catch {} })
const legendOpen   = ref(false)
const HEADER_KEY      = 'class-schedule-headerCollapsed'
const headerCollapsed = ref(false)
watch(headerCollapsed, v => { try { localStorage.setItem(HEADER_KEY, v ? '1' : '0') } catch {} })

const currentDeptEmployees = computed(
  () => departments.value.find(d => d.name === selectedDept.value)?.employees ?? []
)

// ── 每日統計 ──────────────────────────────────────────────────────
function countActual(emp) {
  return Object.values(emp.schedule).reduce((sum, v) => {
    const code = parseCell(v).code
    if (!OFF_CODES.has(code)) return sum
    return sum + (code === '半' ? 0.5 : 1)
  }, 0)
}
function dailyOffCount(day)  {
  const emps = visibleIds.value.length
    ? currentDeptEmployees.value.filter(e => visibleIds.value.includes(e.id))
    : currentDeptEmployees.value
  return emps.reduce((sum, e) => {
    const code = parseCell(e.schedule[day]).code
    if (!OFF_CODES.has(code)) return sum
    return sum + (code === '半' ? 0.5 : 1)
  }, 0)
}
function dailyWorkCount(day) {
  const emps = visibleIds.value.length
    ? currentDeptEmployees.value.filter(e => visibleIds.value.includes(e.id))
    : currentDeptEmployees.value
  return emps.length - dailyOffCount(day)
}
const totalEmployees = computed(() =>
  visibleIds.value.length
    ? currentDeptEmployees.value.filter(e => visibleIds.value.includes(e.id)).length
    : currentDeptEmployees.value.length
)

function fmtNum(n) { return Number.isInteger(n) ? String(n) : n.toFixed(1) }
const calLeadingBlanks = computed(() => getWeekday(1))

// ── Toast ─────────────────────────────────────────────────────────
const toast = reactive({ show: false, message: '', error: false })
function showToast(msg, error = false) {
  toast.message = msg; toast.show = true; toast.error = error
  setTimeout(() => toast.show = false, 2500)
}

// ════════════════════════════════════════════════════════════════════
// ── 離線佇列 ──────────────────────────────────────────────────────
// ════════════════════════════════════════════════════════════════════
const QUEUE_KEY  = 'class-schedule-offlineQueue'
const isOnline   = ref(import.meta.client ? navigator.onLine : true)
const isSyncing  = ref(false)

// 佇列結構：Record<`${year}-${month}-${empId}-${day}`, payload>
// key 相同時後者覆蓋前者（同一格只保留最後一筆）
function loadQueue() {
  try { return JSON.parse(localStorage.getItem(QUEUE_KEY) ?? '{}') } catch { return {} }
}
function saveQueue(q) {
  try { localStorage.setItem(QUEUE_KEY, JSON.stringify(q)) } catch {}
}

const pendingCount = ref(import.meta.client ? Object.keys(loadQueue()).length : 0)

function enqueue(payload) {
  const q   = loadQueue()
  const key = `${payload.year}-${payload.month}-${payload.employeeId}-${payload.day}`
  q[key]    = payload
  saveQueue(q)
  pendingCount.value = Object.keys(q).length
}

function dequeue(key) {
  const q = loadQueue()
  delete q[key]
  saveQueue(q)
  pendingCount.value = Object.keys(q).length
}

async function flushQueue() {
  if (isSyncing.value) return
  const q = loadQueue()
  if (Object.keys(q).length === 0) return
  isSyncing.value = true
  let failed = 0
  for (const [key, payload] of Object.entries(q)) {
    try {
      const res = await (await fetch(`${BASE()}/cell`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(payload)
      })).json()
      if (!res.success) throw new Error(res.message)
      dequeue(key)
      _applyLocalCell(payload)
    } catch {
      failed++
    }
  }
  isSyncing.value = false
  const remaining = Object.keys(loadQueue()).length
  if (remaining === 0) {
    showToast('離線變更已全部同步')
    _broadcast()
  } else {
    showToast(`同步完成，${failed} 筆失敗待重試`, true)
  }
}

function _applyLocalCell(payload) {
  for (const dept of departments.value) {
    const emp = dept.employees.find(e => e.id === payload.employeeId)
    if (!emp) continue
    if (payload.code === '') {
      delete emp.schedule[payload.day]
    } else {
      emp.schedule[payload.day] = payload.extra
        ? { code: payload.code, extra: payload.extra }
        : payload.code
    }
    break
  }
}

// ── BroadcastChannel：通知同瀏覽器其他頁籤重 fetch ──────────────
let _bc = null
function _broadcast() {
  try { _bc?.postMessage({ type: 'refetch' }) } catch {}
}

// ── 定時重新 fetch（60 秒，有佇列或正在編輯時跳過）─────────────
let _autoFetchTimer = null
function startAutoFetch() {
  _autoFetchTimer = setInterval(() => {
    if (!isOnline.value)        return
    if (pendingCount.value > 0) return
    if (showForm.value)         return
    fetchSchedule(true)  // 靜默刷新，不閃畫面
  }, 60_000)
}
function stopAutoFetch() {
  clearInterval(_autoFetchTimer)
  _autoFetchTimer = null
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
  editEmp.value       = emp
  editDay.value       = day
  selectedEmpId.value = emp.id
  selectedDay.value   = day
  const cell          = parseCell(emp.schedule[day])
  editCode.value      = cell.code
  editExtra.value     = cell.extra
  showForm.value      = true
}

const canSetExtra = computed(() => OFF_CODES.has(editCode.value))

async function saveEdit() {
  if (!editEmp.value) return
  saving.value = true
  const extra   = canSetExtra.value ? editExtra.value : ''
  const payload = {
    year:       currentYear.value,
    month:      currentMonth.value,
    employeeId: editEmp.value.id,
    day:        editDay.value,
    code:       editCode.value,
    extra
  }
  // 先更新本地畫面
  if (editCode.value === '') {
    delete editEmp.value.schedule[editDay.value]
  } else {
    editEmp.value.schedule[editDay.value] = extra
      ? { code: editCode.value, extra }
      : editCode.value
  }
  showForm.value = false

  if (!isOnline.value) {
    // 離線：存入佇列，同一格後者覆蓋前者
    enqueue(payload)
    showToast('已暫存（離線中，連線後自動同步）')
    saving.value = false
    return
  }

  try {
    const res = await (await fetch(`${BASE()}/cell`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(payload)
    })).json()
    if (!res.success) throw new Error(res.message)
    showToast('已儲存')
    _broadcast()
  } catch (e) {
    // 連線但請求失敗（如伺服器暫時無回應）→ 存佇列等重試
    enqueue(payload)
    showToast('儲存失敗，已暫存待重試', true)
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
const staffTab          = ref('dept')   // 'dept' | 'shift'
const showStaffForm     = ref(false)
const staffFormMode     = ref('add')
const staffDeleteId     = ref(null)
const showDeleteConfirm = ref(false)
const staffSaving       = ref(false)

const staffForm = reactive({
  id:            '',
  name:          '',
  department:    '',
  expectedLeave: 9,
  shiftCode:     ''
})

const deptNames = computed(() => departments.value.map(d => d.name))

function openAddStaff() {
  staffFormMode.value     = 'add'
  staffForm.id            = ''
  staffForm.name          = ''
  staffForm.department    = departments.value[0]?.name ?? ''
  staffForm.expectedLeave = 9
  staffForm.shiftCode     = ''
  showStaffForm.value     = true
}

function openEditStaff(emp, deptName) {
  staffFormMode.value     = 'edit'
  staffForm.id            = emp.id
  staffForm.name          = emp.name
  staffForm.department    = deptName
  staffForm.expectedLeave = emp.expected
  staffForm.shiftCode     = emp.shiftCode ?? ''
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
      expectedLeave: staffForm.expectedLeave,
      shiftCode:     staffForm.shiftCode
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


// ════════════════════════════════════════════════════════════════════
// ── 班別設定 ──────────────────────────────────────────────────────
// ════════════════════════════════════════════════════════════════════
const shifts        = ref([])      // { code, label, start, end, breakMinutes }
const shiftsSaving  = ref(false)
const showShiftForm = ref(false)
const shiftForm     = reactive({ code: '', label: '', start: '', end: '', breakMinutes: 60 })
const shiftEditIdx  = ref(null)    // null = 新增，number = 編輯

async function fetchShifts() {
  try {
    const res = await (await fetch(`${BASE()}/shifts`)).json()
    if (res.success) shifts.value = res.data ?? []
  } catch (e) {
    console.warn('班別載入失敗', e)
  }
}

function openAddShift() {
  shiftEditIdx.value     = null
  shiftForm.code         = ''
  shiftForm.label        = ''
  shiftForm.start        = ''
  shiftForm.end          = ''
  shiftForm.breakMinutes = 60
  showShiftForm.value    = true
}

function openEditShift(idx) {
  shiftEditIdx.value     = idx
  const s                = shifts.value[idx]
  shiftForm.code         = s.code
  shiftForm.label        = s.label
  shiftForm.start        = s.start
  shiftForm.end          = s.end
  shiftForm.breakMinutes = s.breakMinutes ?? 60
  showShiftForm.value    = true
}

function deleteShift(idx) {
  shifts.value.splice(idx, 1)
  saveShifts()
}

async function saveShiftForm() {
  if (!shiftForm.code.trim() || !shiftForm.start || !shiftForm.end) return
  const entry = {
    code:         shiftForm.code.trim(),
    label:        shiftForm.label.trim(),
    start:        shiftForm.start,
    end:          shiftForm.end,
    breakMinutes: Number(shiftForm.breakMinutes)
  }
  if (shiftEditIdx.value === null) {
    shifts.value.push(entry)
  } else {
    shifts.value.splice(shiftEditIdx.value, 1, entry)
  }
  showShiftForm.value = false
  await saveShifts()
}

async function saveShifts() {
  shiftsSaving.value = true
  try {
    const res = await (await fetch(`${BASE()}/shifts`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(shifts.value)
    })).json()
    if (!res.success) throw new Error(res.message)
    showToast('班別已儲存')
  } catch (e) {
    showToast('儲存失敗：' + e.message, true)
  } finally {
    shiftsSaving.value = false
  }
}

// 計算實際工時（分鐘 → 小時字串）
function calcWorkHours(shift) {
  if (!shift.start || !shift.end) return ''
  const [sh, sm] = shift.start.split(':').map(Number)
  const [eh, em] = shift.end.split(':').map(Number)
  let total = (eh * 60 + em) - (sh * 60 + sm) - (shift.breakMinutes ?? 0)
  if (total <= 0) return ''
  const h = Math.floor(total / 60)
  const m = total % 60
  return m === 0 ? `${h}H` : `${h}H${m}M`
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

// ── 表格容器 ref ──────────────────────────────────────────────
const tableWrapRef  = ref(null)
const scalerClipRef = ref(null)
const tableInnerRef = ref(null)
const tableScale    = ref(1)

// 縮放比例：從 localStorage 讀取，預設 100，範圍 50–150
const ZOOM_KEY = 'class-schedule-tableZoom'
const tableZoom = ref((() => {
  try {
    if (!import.meta.client) return 100
    const v = Number(localStorage.getItem(ZOOM_KEY))
    return v >= 50 && v <= 150 ? v : 100
  } catch { return 100 }
})())
watch(tableZoom, (v) => {
  try { localStorage.setItem(ZOOM_KEY, String(v)) } catch {}
})

// ── 顯示人員篩選（班表 + 日曆共用，存 localStorage，按部門分開）──
const VISIBLE_KEY = 'class-schedule-visibleIds'
function loadVisibleIds(dept) {
  try {
    const all = JSON.parse(localStorage.getItem(VISIBLE_KEY) ?? '{}')
    return Array.isArray(all[dept]) ? all[dept] : []
  } catch { return [] }
}
function saveVisibleIds(dept, ids) {
  try {
    const all = JSON.parse(localStorage.getItem(VISIBLE_KEY) ?? '{}')
    all[dept] = ids
    localStorage.setItem(VISIBLE_KEY, JSON.stringify(all))
  } catch {}
}

const visibleIds = ref([])

// 部門切換時從 localStorage 載入該部門的設定
watch(selectedDept, (dept) => {
  visibleIds.value = import.meta.client ? loadVisibleIds(dept) : []
})

// visibleIds 變動時存入 localStorage
watch(visibleIds, (ids) => {
  if (import.meta.client) saveVisibleIds(selectedDept.value, ids)
}, { deep: true })

const tableVisibleIds = visibleIds   // 班表用（alias）
const calSelectedIds  = visibleIds   // 日曆用（alias）

const tableFilteredEmps = computed(() =>
  visibleIds.value.length
    ? currentDeptEmployees.value.filter(e => visibleIds.value.includes(e.id))
    : currentDeptEmployees.value
)
const calFilteredEmps = computed(() =>
  visibleIds.value.length
    ? currentDeptEmployees.value.filter(e => visibleIds.value.includes(e.id))
    : currentDeptEmployees.value
)

// ── 欄 hover 高亮（hover 時顯示星期列）────────────────────────
const hoveredDay = ref(null)
const hoveredRow = ref(null)
// 點選後持續高亮（手機無 hover，點格子後保留十字直到 modal 關閉）
const selectedDay   = ref(null)
const selectedEmpId = ref(null)

watch(showForm, (open) => {
  if (!open) { selectedDay.value = null; selectedEmpId.value = null }
})

function updateTableScale() {}

let _tableRO = null
function mountTableObserver() {}
function unmountTableObserver() { _tableRO?.disconnect(); _tableRO = null }

// 切回班表 view 時重新計算 scale
watch(view, (v) => {
  if (v === 'table') nextTick(() => updateTableScale())
})

// ── 初始載入 ─────────────────────────────────────────────────
onMounted(() => {
  // 從 localStorage 還原 view 和 selectedDept（放 onMounted 避免 SSR hydration mismatch）
  try {
    const savedView = localStorage.getItem(VIEW_KEY)
    if (savedView && ['table', 'calendar', 'staff'].includes(savedView)) view.value = savedView
    const savedDept = localStorage.getItem(DEPT_KEY)
    if (savedDept) selectedDept.value = savedDept
    headerCollapsed.value = localStorage.getItem(HEADER_KEY) === '1'
  } catch {}

  fetchSchedule()
  fetchShifts()
  nextTick(() => mountTableObserver())
  startAutoFetch()

  // 網路狀態監聽
  window.addEventListener('online', () => {
    isOnline.value = true
    flushQueue()
    fetchSchedule(true)  // 靜默補齊離線期間的變動
  })
  window.addEventListener('offline', () => {
    isOnline.value = false
  })

  // BroadcastChannel：接收其他頁籤的 refetch 通知
  try {
    _bc = new BroadcastChannel('class-schedule-sync')
    _bc.onmessage = (e) => {
      if (e.data?.type === 'refetch' && !showForm.value && pendingCount.value === 0) {
        fetchSchedule(true)
      }
    }
  } catch {}
})

onUnmounted(() => {
  unmountTableObserver()
  stopAutoFetch()
  window.removeEventListener('online', () => {})
  window.removeEventListener('offline', () => {})
  try { _bc?.close() } catch {}
})
</script>

<template>
  <div class="min-h-full flex flex-col bg-surface2 transition-colors duration-300 overflow-hidden">
    <!-- ── Header ── -->
    <header class="bg-surface border-b border-light-c px-4 sticky top-0 z-30"
            :class="headerCollapsed ? 'py-1' : 'py-3'">

      <!-- 收起狀態：只顯示月份 + 頁籤 + 展開按鈕 -->
      <div v-if="headerCollapsed" class="flex items-center justify-between gap-2">
        <div class="flex items-center gap-1 bg-surface2 rounded-lg px-1 py-0.5 flex-shrink-0">
          <button class="p-1 hover-surface2 rounded-md transition-colors" :disabled="loading" @click="changeMonth(-1)">
            <svg class="w-3.5 h-3.5 text-hint-c dark:text-hint-c" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/></svg>
          </button>
          <span class="text-sm font-semibold text-base-c min-w-[60px] text-center">
            {{ currentYear }}/{{ String(currentMonth).padStart(2, '0') }}
          </span>
          <button class="p-1 hover-surface2 rounded-md transition-colors" :disabled="loading" @click="changeMonth(1)">
            <svg class="w-3.5 h-3.5 text-hint-c dark:text-hint-c" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/></svg>
          </button>
        </div>
        <div class="flex items-center gap-0.5 bg-surface2 rounded-lg p-0.5 flex-shrink-0">
          <button v-for="tab in [{ key: 'table', label: '班表' }, { key: 'calendar', label: '日曆' }, { key: 'staff', label: '人員' }]"
                  :key="tab.key"
                  :class="['px-2 py-1 text-xs font-medium rounded-md transition-colors',
 view === tab.key ? 'bg-surface text-base-c shadow-sm' : 'text-hint-c']"
                  @click="view = tab.key">
            {{ tab.label }}
          </button>
        </div>
        <button class="ml-auto flex items-center gap-1 text-xs text-hint-c px-2 py-1 rounded-lg hover-surface2 transition-colors flex-shrink-0"
                @click="headerCollapsed = false">
          展開
          <svg class="w-3 h-3 rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/></svg>
        </button>
      </div>

      <!-- 展開狀態：完整 header -->
      <template v-else>
        <div class="flex items-center gap-1.5 sm:gap-2">
          <!-- Logo + 標題：手機隱藏 -->
          <div class="hidden sm:flex items-center gap-2 min-w-0 flex-1">
            <div class="w-8 h-8 rounded-lg bg-green-700 flex items-center justify-center text-white text-lg font-bold flex-shrink-0">📋</div>
            <div class="min-w-0">
              <h1 class="font-bold text-base-c leading-none text-lg truncate">員工排假班表</h1>
              <p class="text-lg text-hint-c mt-0.5 hidden md:block">Shift Schedule</p>
            </div>
          </div>

          <!-- 月份切換 -->
          <div class="flex items-center gap-1 bg-surface2 rounded-lg px-1 py-0.5 flex-shrink-0">
            <button class="p-1.5 hover-surface2 rounded-md transition-colors" :disabled="loading" @click="changeMonth(-1)">
              <svg class="w-4 h-4 text-hint-c" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/></svg>
            </button>
            <span class="text-sm font-semibold text-base-c min-w-[60px] text-center tabular-nums">
              {{ currentYear }}/{{ String(currentMonth).padStart(2, '0') }}
            </span>
            <button class="p-1.5 hover-surface2 rounded-md transition-colors" :disabled="loading" @click="changeMonth(1)">
              <svg class="w-4 h-4 text-hint-c" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/></svg>
            </button>
          </div>

          <!-- 頁籤 -->
          <div class="flex items-center gap-0.5 bg-surface2 rounded-lg p-0.5 flex-shrink-0">
            <button v-for="tab in [
              { key: 'table',    label: '班表' },
              { key: 'calendar', label: '日曆' },
              { key: 'staff',    label: '人員' },
            ]" :key="tab.key"
                    :class="['px-2 py-1.5 text-sm font-medium rounded-md transition-colors',
 view === tab.key ? 'bg-surface text-base-c shadow-sm' : 'text-hint-c hover-text-muted']"
                    @click="view = tab.key">
              {{ tab.label }}
            </button>
          </div>

          <!-- 縮放控制（桌機 + 班表 view） -->
          <div v-if="view === 'table'" class="hidden sm:flex items-center gap-1.5 flex-shrink-0">
            <button class="p-1 rounded hover-surface2 text-hint-c transition-colors disabled:opacity-30"
                    :disabled="tableZoom <= 50" @click="tableZoom = Math.max(50, tableZoom - 10)" title="縮小">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 12H4"/></svg>
            </button>
            <span class="text-xs text-hint-c min-w-[36px] text-center tabular-nums select-none">{{ tableZoom }}%</span>
            <button class="p-1 rounded hover-surface2 text-hint-c transition-colors disabled:opacity-30"
                    :disabled="tableZoom >= 150" @click="tableZoom = Math.min(150, tableZoom + 10)" title="放大">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
            </button>
          </div>

          <!-- 下載 Excel：手機只顯示 icon -->
          <button v-if="view === 'table'"
                  class="flex items-center gap-1 px-2 sm:px-3 py-1.5 bg-green-700 hover:bg-green-800 text-white text-sm font-medium rounded-xl transition-colors disabled:opacity-60 flex-shrink-0"
                  :disabled="downloading || loading" @click="exportExcel">
            <svg v-if="downloading" class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
            </svg>
            <svg v-else class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/>
            </svg>
            <span class="hidden sm:inline">{{ downloading ? '產生中…' : '下載 Excel' }}</span>
          </button>

          <!-- 收起按鈕 -->
          <button class="flex-shrink-0 p-1.5 rounded-lg text-hint-c hover-surface2 transition-colors"
                  title="收起標題列"
                  @click="headerCollapsed = true">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 15l7-7 7 7"/></svg>
          </button>
        </div>

        <!-- 部門 + 圖例（班表/日曆） -->
        <div v-if="view === 'table' || view === 'calendar'" class="flex items-center gap-2 mt-2.5 pt-2.5 border-t border-light-c">
          <select v-model="selectedDept"
                  class="text-lg border border-light-c rounded-lg px-2 py-1.5 bg-surface text-base-c outline-none focus:ring-2 focus:ring-green-400 flex-shrink-0">
            <option v-for="d in departments" :key="d.name" :value="d.name">{{ d.name }}</option>
          </select>
          <!-- 桌機：僅顯示色塊，hover 顯示標籤 tooltip -->
          <div class="hidden lg:flex items-center gap-1 flex-1 flex-wrap">
          <span v-for="l in LEGENDS" :key="l.code"
                :title="l.label"
                :class="['inline-flex items-center justify-center w-6 h-6 rounded text-lg font-bold cursor-default', l.color]">
            {{ l.code }}
          </span>
            <span class="inline-block w-px h-4 bg-surface2 dark:bg-surface2 mx-1"/>
            <span v-for="e in EXTRA_OPTIONS" :key="'ex'+e.code"
                  :title="e.label"
                  :class="['inline-flex items-center justify-center w-6 h-6 rounded-full text-lg font-bold cursor-default', e.color]">
            {{ e.code }}
          </span>
            <!-- 展開完整圖例按鈕 -->
            <button class="ml-1 flex items-center gap-1 text-lg text-hint-c px-2 py-1 rounded-lg hover-surface2 transition-colors"
                    @click="legendOpen = !legendOpen">
              {{ legendOpen ? '收起' : '圖例' }}
              <svg :class="['w-3 h-3 transition-transform', legendOpen ? 'rotate-180' : '']" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/></svg>
            </button>
          </div>
          <!-- 手機：圖例按鈕 -->
          <button class="lg:hidden ml-auto flex items-center gap-1 text-lg text-hint-c px-2 py-1.5 rounded-lg bg-surface2 hover-surface2 transition-colors flex-shrink-0"
                  @click="legendOpen = !legendOpen">
            圖例
            <svg :class="['w-3 h-3 transition-transform', legendOpen ? 'rotate-180' : '']" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/></svg>
          </button>
        </div>
        <!-- 展開圖例（桌機 + 手機共用） -->
        <div v-if="legendOpen && (view === 'table' || view === 'calendar')" class="mt-2 pb-1 flex flex-wrap gap-x-4 gap-y-1.5">
        <span v-for="l in LEGENDS" :key="l.code" class="inline-flex items-center gap-1 text-lg">
          <span :class="['inline-flex items-center justify-center w-5 h-5 rounded text-lg font-bold', l.color]">{{ l.code }}</span>
          <span class="text-hint-c">{{ l.label }}</span>
        </span>
          <span class="w-full h-px bg-surface2 my-0.5"/>
          <span class="text-lg text-hint-c self-center">附加：</span>
          <span v-for="e in EXTRA_OPTIONS" :key="'ex'+e.code" class="inline-flex items-center gap-1 text-lg">
          <span :class="['inline-flex items-center justify-center w-5 h-5 rounded-full text-lg font-bold', e.color]">{{ e.code }}</span>
          <span class="text-hint-c">{{ e.label }}</span>
        </span>
        </div>
        <!-- 人員篩選（班表 view 時顯示） -->
        <div v-if="view === 'table' && currentDeptEmployees.length > 0"
             class="flex flex-wrap items-center gap-1.5 sm:gap-2 mt-2 pt-2 border-t border-light-c">
          <span class="text-sm text-hint-c font-medium flex-shrink-0">顯示人員：</span>
          <label v-for="emp in currentDeptEmployees" :key="emp.id" class="flex items-center gap-1 cursor-pointer select-none">
            <input v-model="tableVisibleIds" type="checkbox" :value="emp.id" class="rounded accent-green-600">
            <span :class="['text-sm px-1.5 py-0.5 rounded-full transition-colors',
 tableVisibleIds.includes(emp.id) ? 'bg-green-700 text-white' : 'bg-surface2 text-muted-c']">
              {{ emp.name }}
            </span>
          </label>
          <button v-if="tableVisibleIds.length > 0"
                  class="ml-auto text-xs text-hint-c hover-text-muted px-2 py-0.5 rounded hover-surface2 transition-colors flex-shrink-0"
                  @click="tableVisibleIds = []">
            顯示全部
          </button>
        </div>
      </template><!-- end v-else (headerCollapsed) -->
    </header>

    <!-- ── 主體 ── -->
    <div class="flex flex-col flex-1 min-h-0 w-full px-3 sm:px-4 py-3 sm:py-4">

      <!-- 載入中 -->
      <div v-if="loading" class="flex items-center justify-center py-20 gap-3 text-hint-c">
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
        <div ref="tableWrapRef"
             class="bg-surface rounded-2xl border border-light-c shadow-sm overflow-x-auto" style="width: fit-content; max-width: 100%">
          <div ref="scalerClipRef">
            <div ref="tableInnerRef" :style="{ zoom: tableZoom / 100 }">
              <table class="text-sm border-collapse" style="table-layout:fixed">
                <colgroup>
                  <col style="width:90px">
                  <col v-for="d in days" :key="d" style="width:32px">
                  <col style="width:32px">
                  <col style="width:32px">
                </colgroup>
                <thead>
                <tr class="bg-surface2 border-b border-light-c">
                  <th class="sticky left-0 z-10 bg-surface2 px-2 py-2 text-left text-hint-c font-medium whitespace-nowrap border-r border-light-c">姓名</th>
                  <th v-for="d in days" :key="d"
                      :class="['px-0 py-2 text-center font-semibold transition-colors', dayHeaderClass(d)]"
                  >{{ d }}</th>
                  <th class="px-0 py-2 text-center text-hint-c font-medium whitespace-nowrap border-l border-light-c">應</th>
                  <th class="px-0 py-2 text-center text-hint-c font-medium whitespace-nowrap">實</th>
                </tr>
                <tr class="border-b-2 border-light-c">
                  <th class="sticky left-0 z-10 bg-surface border-r border-light-c px-2 py-1 text-left text-hint-c font-normal text-xs">
                    {{ currentYear }}年{{ currentMonth }}月
                  </th>
                  <th v-for="d in days" :key="d"
                      :class="['py-1 text-center text-xs font-normal transition-colors', dayHeaderClass(d), dayCellBg(d),
 hoveredDay === d ? '!text-green-600 dark:!text-green-400 font-bold bg-green-500/15 dark:bg-green-400/15' : '']">
                    <span :class="hoveredDay === d ? 'font-black' : ''">{{ WEEKDAY_NAMES[getWeekday(d)] }}</span>
                    <div v-if="holidays[d]" class="text-[9px] text-pink-400 leading-tight truncate px-0.5">{{ holidays[d] }}</div>
                  </th>
                  <th class="border-l border-light-c" colspan="3"/>
                </tr>
                </thead>
                <tbody class="divide-y divide-base">
                <tr v-for="emp in tableFilteredEmps" :key="emp.id">
                  <td class="sticky left-0 z-10 bg-surface border-r border-light-c px-2 py-1.5 whitespace-nowrap overflow-hidden">
                    <div class="font-semibold text-base-c text-sm truncate">{{ emp.name }}</div>
                    <div class="text-xs text-hint-c truncate">{{ emp.id }}</div>
                  </td>
                  <td v-for="d in days" :key="d"
                      :class="['text-center py-1 px-0 cursor-pointer transition-colors border-r border-cell', dayCellBg(d),
 hoveredDay === d ? 'bg-green-500/20 dark:bg-green-400/20' : '',
 selectedDay === d && selectedEmpId === emp.id ? 'ring-2 ring-inset ring-green-500' : '',
 'hover:bg-green-500/15 dark:hover:bg-green-400/15']"
                      @mouseenter="hoveredDay = d"
                      @mouseleave="hoveredDay = null"
                      @click="openEdit(emp, d)">
                    <template v-if="emp.schedule[d]">
                      <div class="relative inline-flex items-center justify-center">
                        <span :class="['inline-flex items-center justify-center w-6 h-6 rounded text-xs font-bold', badgeClass(parseCell(emp.schedule[d]).code)]">
                          {{ parseCell(emp.schedule[d]).code }}
                        </span>
                        <span v-if="parseCell(emp.schedule[d]).extra"
                              :class="['absolute -top-1 -right-1.5 w-3 h-3 rounded-full flex items-center justify-center text-[9px] font-bold leading-none shadow-sm',
 extraBadgeClass(parseCell(emp.schedule[d]).extra)]">
                          {{ parseCell(emp.schedule[d]).extra }}
                        </span>
                      </div>
                    </template>
                  </td>
                  <td class="text-center border-l border-light-c text-hint-c font-medium py-1 text-xs">{{ emp.expected }}</td>
                  <td class="text-center text-base-c font-semibold py-1 text-xs">{{ fmtNum(countActual(emp)) }}</td>
                </tr>
                </tbody>
                <tfoot class="border-t-2 border-light-c">
                <tr class="bg-surface2">
                  <td class="sticky left-0 z-10 bg-surface2 border-r border-light-c px-2 py-1.5">
                    <div class="text-xs font-semibold text-muted-c leading-tight">每日人力</div>
                    <div class="text-xs text-hint-c leading-tight">共 {{ totalEmployees }} 人</div>
                  </td>
                  <td v-for="d in days" :key="d"
                      :class="['text-center py-1 px-0 transition-colors border-r border-cell', dayCellBg(d),
 hoveredDay === d ? 'bg-green-500/20 dark:bg-green-400/20' : '']">
                    <span v-if="dailyWorkCount(d) > 0"
                          class="inline-flex items-center justify-center w-6 h-6 rounded text-xs font-bold bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300">
                      {{ fmtNum(dailyWorkCount(d)) }}
                    </span>
                    <span v-else class="text-xs text-hint-c">—</span>
                  </td>
                  <td class="border-l border-light-c" colspan="3"/>
                </tr>
                <tr class="bg-surface2/60 /60">
                  <td class="sticky left-0 z-10 bg-surface2 border-r border-light-c px-2 py-1.5">
                    <div class="text-xs font-semibold text-hint-c leading-tight">休假人數</div>
                  </td>
                  <td v-for="d in days" :key="d" :class="['text-center py-1 px-0 border-r border-cell', dayCellBg(d)]">
                    <span v-if="dailyOffCount(d) > 0"
                          class="inline-flex items-center justify-center w-6 h-6 rounded text-xs font-bold bg-surface2 text-hint-c dark:text-hint-c">
                      {{ fmtNum(dailyOffCount(d)) }}
                    </span>
                    <span v-else class="text-xs text-hint-c">—</span>
                  </td>
                  <td class="border-l border-light-c" colspan="3"/>
                </tr>
                </tfoot>
              </table>
            </div><!-- end tableInnerRef -->
          </div>
        </div>
        <div v-if="!loading && currentDeptEmployees.length === 0"
             class="hidden lg:block bg-surface rounded-2xl border border-light-c px-4 py-12 text-center text-hint-c text-lg shadow-sm mt-3">
          此部門暫無員工資料
        </div>
      </div>

      <!-- ══ 日曆 ══ -->
      <div v-else-if="view === 'calendar'">
        <div class="bg-surface rounded-2xl border border-light-c shadow-sm px-3 sm:px-4 py-3 mb-3">
          <div class="flex flex-wrap items-center gap-1.5 sm:gap-2">
            <span class="text-lg text-hint-c font-medium w-full sm:w-auto">顯示員工：</span>
            <label v-for="emp in currentDeptEmployees" :key="emp.id" class="flex items-center gap-1 cursor-pointer select-none">
              <input v-model="calSelectedIds" type="checkbox" :value="emp.id" class="rounded accent-green-600">
              <span :class="['text-lg px-1.5 py-0.5 rounded-full transition-colors',
 calSelectedIds.includes(emp.id) ? 'bg-green-700 text-white' : 'bg-surface2 text-muted-c']">
                {{ emp.name }}
              </span>
            </label>
          </div>
        </div>
        <div class="bg-surface rounded-2xl border border-light-c shadow-sm overflow-hidden">
          <div class="grid grid-cols-7 border-b border-light-c bg-surface2">
            <div v-for="(w, wi) in WEEKDAY_NAMES" :key="w"
                 :class="['text-center font-semibold py-1.5 sm:py-2 text-lg sm:text-lg',
 wi === 0 ? 'text-red-500' : wi === 6 ? 'text-blue-500' : 'text-hint-c']">
              <span class="sm:hidden">{{ w }}</span>
              <span class="hidden sm:inline">星期{{ w }}</span>
            </div>
          </div>
          <div class="grid grid-cols-7 divide-x divide-y divide-base">
            <div v-for="n in calLeadingBlanks" :key="'blank'+n" class="min-h-[70px] sm:min-h-[100px] bg-surface2/50 /30"/>
            <div v-for="d in days" :key="d" :class="['min-h-[70px] sm:min-h-[100px] p-1 sm:p-1.5 transition-colors', dayCellBg(d)]">
              <div class="flex items-start justify-between gap-0.5 mb-0.5 sm:mb-1">
                <div class="flex items-center gap-0.5 sm:gap-1">
                  <span :class="['text-lg sm:text-lg font-bold leading-none', dayHeaderClass(d)]">{{ d }}</span>
                  <span v-if="holidays[d]" class="hidden sm:inline text-lg bg-pink-100 dark:bg-pink-900/30 text-pink-500 rounded px-1 py-0.5 leading-none">{{ holidays[d] }}</span>
                  <span v-if="holidays[d]" class="sm:hidden w-1.5 h-1.5 rounded-full bg-pink-400 flex-shrink-0 mt-0.5"/>
                </div>
                <span v-if="lunar[d]" class="text-lg sm:text-lg text-hint-c leading-none mt-0.5">{{ lunar[d] }}</span>
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

        <!-- 子頁籤 -->
        <div class="flex items-center gap-0.5 bg-surface2 rounded-xl p-0.5 w-fit mb-4">
          <button v-for="t in [{key:'dept',label:'組別設定'},{key:'shift',label:'班別設定'}]" :key="t.key"
                  :class="['px-4 py-1.5 text-sm font-medium rounded-lg transition-colors',
 staffTab === t.key
 ? 'bg-surface text-base-c shadow-sm'
 : 'text-hint-c hover-text-muted']"
                  @click="staffTab = t.key">
            {{ t.label }}
          </button>
        </div>

        <!-- ── 組別設定 tab ── -->
        <div v-if="staffTab === 'dept'">
          <div class="flex items-center gap-2 mb-4">
            <h2 class="text-lg font-bold text-base-c flex-1">人員設定</h2>
            <button class="flex items-center gap-1.5 px-3 py-1.5 border border-light-c text-muted-c text-base font-medium rounded-lg hover-surface2 transition-colors" @click="openAddDept">
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
                 class="bg-surface rounded-2xl border border-light-c shadow-sm overflow-hidden">
              <div class="flex items-center justify-between px-4 py-3 bg-surface2 border-b border-light-c">
                <div class="flex items-center gap-2 min-w-0">
                  <span class="font-semibold text-base-c text-base">{{ dept.name }}</span>
                  <span class="text-base text-hint-c">{{ dept.employees.length }} 人</span>
                </div>
                <div class="flex gap-1 flex-shrink-0">
                  <button class="text-base px-2 py-1 text-hint-c hover:text-muted-c hover-surface2 rounded-lg transition-colors"
                          @click="openRenameDept(dept.name)">改名</button>
                  <button class="text-base px-2 py-1 text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                          @click="confirmDeleteDept(dept.name)">刪除</button>
                </div>
              </div>
              <div v-if="dept.employees.length === 0" class="px-4 py-6 text-center text-hint-c text-lg">此部門暫無員工</div>
              <div v-else class="divide-y divide-base">
                <div v-for="emp in dept.employees" :key="emp.id"
                     class="flex items-center gap-3 px-4 py-3 hover-surface2/40 transition-colors">
                  <div class="w-8 h-8 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center text-green-700 dark:text-green-400 font-bold text-lg flex-shrink-0">
                    {{ emp.name.slice(0, 1) }}
                  </div>
                  <div class="flex-1 min-w-0">
                    <div class="font-semibold text-base-c text-lg">{{ emp.name }}</div>
                    <div class="flex items-center gap-2 text-sm text-hint-c mt-0.5">
                      <span>{{ emp.id }}</span>
                      <span class="text-base-c dark:text-muted-c">·</span>
                      <span>預計休假 {{ emp.expected }} 天</span>
                      <template v-if="emp.shiftCode">
                        <span class="text-base-c dark:text-muted-c">·</span>
                        <span class="px-1.5 py-0.5 bg-surface2 text-muted-c rounded font-medium text-xs">{{ emp.shiftCode }}</span>
                      </template>
                    </div>
                  </div>
                  <div class="flex gap-1.5 flex-shrink-0">
                    <button class="text-lg px-2.5 py-1 text-hint-c hover-surface2 rounded-lg transition-colors"
                            @click="openEditStaff(emp, dept.name)">編輯</button>
                    <button class="text-lg px-2.5 py-1 text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                            @click="confirmDeleteStaff(emp.id)">刪除</button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- ── 班別設定 tab ── -->
        <div v-else-if="staffTab === 'shift'">
          <div class="flex items-center gap-2 mb-4">
            <h2 class="text-lg font-bold text-base-c flex-1">班別設定</h2>
            <button class="flex items-center gap-1.5 px-3 py-1.5 bg-green-700 hover:bg-green-800 text-white text-base font-medium rounded-lg transition-colors"
                    @click="openAddShift">
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
              新增班別
            </button>
          </div>
          <div class="bg-surface rounded-2xl border border-light-c shadow-sm overflow-hidden">
            <div v-if="shifts.length === 0" class="px-4 py-8 text-center text-hint-c text-base">尚未設定任何班別</div>
            <div v-else class="divide-y divide-base">
              <div v-for="(shift, idx) in shifts" :key="idx"
                   class="flex items-center gap-3 px-4 py-3 hover-surface2/40 transition-colors">
                <div class="w-10 h-10 rounded-xl bg-surface2 flex items-center justify-center flex-shrink-0">
                  <span class="font-bold text-base text-base-c">{{ shift.code }}</span>
                </div>
                <div class="flex-1 min-w-0">
                  <div class="font-semibold text-base-c text-base">
                    {{ shift.code }}<span v-if="shift.label" class="text-hint-c font-normal ml-1.5 text-sm">{{ shift.label }}</span>
                  </div>
                  <div class="text-sm text-hint-c mt-0.5">
                    {{ shift.start }} ~ {{ shift.end }}
                    <span class="mx-1 text-base-c dark:text-muted-c">·</span>
                    休息 {{ shift.breakMinutes >= 60 ? Math.floor(shift.breakMinutes / 60) + 'H' + (shift.breakMinutes % 60 ? shift.breakMinutes % 60 + 'M' : '') : shift.breakMinutes + 'M' }}
                    <span class="mx-1 text-base-c dark:text-muted-c">·</span>
                    實際 <span class="text-green-700 dark:text-green-400 font-medium">{{ calcWorkHours(shift) }}</span>
                  </div>
                </div>
                <div class="flex gap-1 flex-shrink-0">
                  <button class="text-sm px-2.5 py-1 text-hint-c hover-surface2 rounded-lg transition-colors"
                          @click="openEditShift(idx)">編輯</button>
                  <button class="text-sm px-2.5 py-1 text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                          @click="deleteShift(idx)">刪除</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- ══ Modal：班別新增/編輯 ══ -->
    <div v-if="showShiftForm" class="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center z-50" @click.self="showShiftForm = false">
      <div class="bg-surface rounded-t-3xl sm:rounded-2xl shadow-xl w-full sm:max-w-sm p-5">
        <div class="flex items-center justify-between mb-4">
          <h3 class="font-bold text-base-c">{{ shiftEditIdx === null ? '新增班別' : '編輯班別' }}</h3>
          <button class="p-1.5 hover-surface2 rounded-lg transition-colors text-hint-c" @click="showShiftForm = false">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
        </div>
        <div class="space-y-3 mb-5">
          <div class="flex gap-3">
            <div class="flex-1">
              <label class="text-xs font-semibold text-hint-c uppercase tracking-wide block mb-1">班別代碼</label>
              <input v-model="shiftForm.code" type="text" placeholder="e.g. C3"
                     class="w-full text-base border border-light-c rounded-xl px-3 py-2 bg-surface text-base-c outline-none focus:ring-2 focus:ring-green-400"/>
            </div>
            <div class="flex-[2]">
              <label class="text-xs font-semibold text-hint-c uppercase tracking-wide block mb-1">說明（選填）</label>
              <input v-model="shiftForm.label" type="text" placeholder="e.g. 早班"
                     class="w-full text-base border border-light-c rounded-xl px-3 py-2 bg-surface text-base-c outline-none focus:ring-2 focus:ring-green-400"/>
            </div>
          </div>
          <div class="flex gap-3">
            <div class="flex-1">
              <label class="text-xs font-semibold text-hint-c uppercase tracking-wide block mb-1">上班時間</label>
              <input v-model="shiftForm.start" type="time"
                     class="w-full text-base border border-light-c rounded-xl px-3 py-2 bg-surface text-base-c outline-none focus:ring-2 focus:ring-green-400"/>
            </div>
            <div class="flex-1">
              <label class="text-xs font-semibold text-hint-c uppercase tracking-wide block mb-1">下班時間</label>
              <input v-model="shiftForm.end" type="time"
                     class="w-full text-base border border-light-c rounded-xl px-3 py-2 bg-surface text-base-c outline-none focus:ring-2 focus:ring-green-400"/>
            </div>
          </div>
          <div>
            <label class="text-xs font-semibold text-hint-c uppercase tracking-wide block mb-1">休息時間（分鐘）</label>
            <div class="flex items-center gap-2">
              <input v-model.number="shiftForm.breakMinutes" type="number" min="0" step="30"
                     class="w-28 text-base border border-light-c rounded-xl px-3 py-2 bg-surface text-base-c outline-none focus:ring-2 focus:ring-green-400"/>
              <div class="flex gap-1">
                <button v-for="m in [30, 60, 90]" :key="m"
                        :class="['px-2.5 py-1.5 text-xs rounded-lg border transition-colors',
 shiftForm.breakMinutes === m
 ? 'border-green-600 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400'
 : 'border-light-c text-hint-c hover-surface2']"
                        @click="shiftForm.breakMinutes = m">{{ m }}M</button>
              </div>
            </div>
          </div>
          <!-- 預覽工時 -->
          <div v-if="shiftForm.start && shiftForm.end"
               class="px-3 py-2 bg-surface2 rounded-xl text-sm text-hint-c flex items-center gap-2">
            <span>實際工時：</span>
            <span class="font-semibold text-green-700 dark:text-green-400">{{ calcWorkHours(shiftForm) || '—' }}</span>
            <span class="text-hint-c mx-1">·</span>
            <span>{{ shiftForm.start }} ~ {{ shiftForm.end }}，休息 {{ shiftForm.breakMinutes }}M</span>
          </div>
        </div>
        <div class="flex gap-2">
          <button class="flex-1 py-2.5 text-base border border-light-c text-muted-c rounded-xl hover-surface2 transition-colors"
                  @click="showShiftForm = false">取消</button>
          <button class="flex-1 py-2.5 text-base bg-green-700 hover:bg-green-800 text-white rounded-xl font-medium transition-colors flex items-center justify-center gap-2"
                  :disabled="shiftsSaving || !shiftForm.code.trim() || !shiftForm.start || !shiftForm.end"
                  @click="saveShiftForm">
            <svg v-if="shiftsSaving" class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/></svg>
            {{ shiftsSaving ? '儲存中…' : (shiftEditIdx === null ? '新增' : '儲存') }}
          </button>
        </div>
      </div>
    </div>
    <div v-if="showForm" class="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center z-50" @click.self="showForm = false">
      <div class="bg-surface rounded-t-3xl sm:rounded-2xl shadow-xl w-full sm:max-w-2xl flex flex-col max-h-[90vh] sm:max-h-[85vh]">
        <!-- Header（固定不捲動） -->
        <div class="flex items-center justify-between px-5 pt-5 pb-3 flex-shrink-0">
          <div>
            <h3 class="font-bold text-base-c">編輯排休</h3>
            <p class="text-lg text-hint-c mt-0.5">
              {{ editEmp?.name }}
              <span class="text-hint-c">{{ editEmp?.id }}</span>
              · {{ currentMonth }}/{{ editDay }} {{ editWeekday }}
            </p>
          </div>
          <button class="p-1.5 hover-surface2 rounded-lg transition-colors text-hint-c" @click="showForm = false">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
        </div>

        <!-- 捲動區域 -->
        <div class="overflow-y-auto flex-1 px-5">
          <!-- 桌機：左右雙欄；手機：單欄 -->
          <div class="sm:flex sm:gap-5 sm:items-start">
            <!-- 左欄：主狀態 -->
            <div class="sm:flex-1">
              <p class="text-sm font-semibold text-hint-c uppercase tracking-wide mb-2">主狀態</p>
              <div class="grid grid-cols-4 gap-2">
                <button v-for="opt in EDIT_OPTIONS" :key="opt.code"
                        :class="['flex flex-col items-center gap-1 py-2.5 rounded-xl border-2 transition-all',
         editCode === opt.code ? 'border-green-600 ring-2 ring-green-200 dark:ring-green-800 scale-105' : 'border-transparent hover-border']"
                        @click="editCode = opt.code">
                  <span :class="['w-8 h-8 rounded-lg flex items-center justify-center text-lg font-bold', opt.color]">{{ opt.code }}</span>
                  <span class="text-xs text-hint-c text-center leading-tight">{{ opt.label }}</span>
                </button>
                <button
                  :class="['flex flex-col items-center gap-1 py-2.5 rounded-xl border-2 transition-all',
         editCode === '' ? 'border-green-600 ring-2 ring-green-200 dark:ring-green-800 scale-105' : 'border-transparent hover-border']"
                  @click="editCode = ''; editExtra = ''">
                  <span class="w-8 h-8 rounded-lg flex items-center justify-center text-lg font-bold bg-surface2 text-hint-c">—</span>
                  <span class="text-xs text-hint-c">清除</span>
                </button>
              </div>
            </div>

            <!-- 右欄（桌機）/ 下方（手機）：附加工作 + 預覽 -->
            <div class="sm:w-52 mt-4 sm:mt-0">
              <transition name="fade">
                <div v-if="canSetExtra" class="mb-3">
                  <p class="text-sm font-semibold text-hint-c uppercase tracking-wide mb-2">
                    附加工作 <span class="normal-case font-normal">（休假期間）</span>
                  </p>
                  <div class="flex gap-2">
                    <button :class="['flex flex-col items-center gap-1 px-3 py-2 rounded-xl border-2 transition-all', editExtra === '' ? 'border-green-600 ring-2 ring-green-200 dark:ring-green-800' : 'border-transparent hover-border']" @click="editExtra = ''">
                      <span class="w-8 h-8 rounded-full flex items-center justify-center text-lg font-bold bg-surface2 text-hint-c">—</span>
                      <span class="text-xs text-hint-c">無</span>
                    </button>
                    <button v-for="opt in EXTRA_OPTIONS" :key="opt.code"
                            :class="['flex flex-col items-center gap-1 px-3 py-2 rounded-xl border-2 transition-all', editExtra === opt.code ? 'border-green-600 ring-2 ring-green-200 dark:ring-green-800 scale-105' : 'border-transparent hover-border']"
                            @click="editExtra = opt.code">
                      <span :class="['w-8 h-8 rounded-full flex items-center justify-center text-lg font-bold', opt.color]">{{ opt.code }}</span>
                      <span class="text-xs text-hint-c">{{ opt.label }}</span>
                    </button>
                  </div>
                </div>
              </transition>
              <div v-if="editCode" class="px-3 py-2 bg-surface2 rounded-xl flex items-center gap-2 text-sm text-hint-c">
                <span>預覽：</span>
                <div class="relative inline-flex items-center justify-center">
                  <span :class="['inline-flex items-center justify-center w-7 h-7 rounded-lg text-lg font-bold', badgeClass(editCode)]">{{ editCode }}</span>
                  <span v-if="editExtra" :class="['absolute -top-1 -right-1.5 w-4 h-4 rounded-full flex items-center justify-center text-xs font-bold leading-none shadow-sm', extraBadgeClass(editExtra)]">{{ editExtra }}</span>
                </div>
                <span>
                  {{ LEGENDS.find(l => l.code === editCode)?.label ?? editCode }}
                  <template v-if="editExtra">＋ {{ EXTRA_OPTIONS.find(e => e.code === editExtra)?.label }}</template>
                </span>
              </div>
            </div>
          </div>
        </div>

        <!-- 取消/儲存按鈕（固定在底部） -->
        <div class="flex gap-2 px-5 py-4 flex-shrink-0 border-t border-light-c">
          <button class="flex-1 py-2.5 text-lg border border-light-c text-muted-c rounded-xl hover-surface2 transition-colors" @click="showForm = false">取消</button>
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
      <div class="bg-surface rounded-t-3xl sm:rounded-2xl shadow-xl w-full sm:max-w-sm p-5">
        <div class="flex items-center justify-between mb-4">
          <h3 class="font-bold text-base-c">{{ staffFormMode === 'add' ? '新增員工' : '編輯員工' }}</h3>
          <button class="p-1.5 hover-surface2 rounded-lg transition-colors text-hint-c" @click="showStaffForm = false">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
        </div>
        <div class="space-y-3 mb-5">
          <div>
            <label class="text-lg font-semibold text-hint-c uppercase tracking-wide block mb-1">員工 ID</label>
            <input v-model="staffForm.id" type="text" placeholder="e.g. F00001"
                   :disabled="staffFormMode === 'edit'"
                   class="w-full text-lg border border-light-c rounded-xl px-3 py-2 bg-surface text-base-c outline-none focus:ring-2 focus:ring-green-400 disabled:opacity-50 disabled:cursor-not-allowed"/>
          </div>
          <div>
            <label class="text-lg font-semibold text-hint-c uppercase tracking-wide block mb-1">姓名</label>
            <input v-model="staffForm.name" type="text" placeholder="員工姓名"
                   class="w-full text-lg border border-light-c rounded-xl px-3 py-2 bg-surface text-base-c outline-none focus:ring-2 focus:ring-green-400"/>
          </div>
          <div>
            <label class="text-lg font-semibold text-hint-c uppercase tracking-wide block mb-1">部門</label>
            <select v-model="staffForm.department"
                    class="w-full text-lg border border-light-c rounded-xl px-3 py-2 bg-surface text-base-c outline-none focus:ring-2 focus:ring-green-400">
              <option v-for="d in deptNames" :key="d" :value="d">{{ d }}</option>
            </select>
          </div>
          <div>
            <label class="text-lg font-semibold text-hint-c uppercase tracking-wide block mb-1">預計休假天數（當月）</label>
            <input v-model.number="staffForm.expectedLeave" type="number" min="0" max="31"
                   class="w-full text-lg border border-light-c rounded-xl px-3 py-2 bg-surface text-base-c outline-none focus:ring-2 focus:ring-green-400"/>
          </div>
          <div>
            <label class="text-lg font-semibold text-hint-c uppercase tracking-wide block mb-1">班別（當月）</label>
            <select v-model="staffForm.shiftCode"
                    class="w-full text-lg border border-light-c rounded-xl px-3 py-2 bg-surface text-base-c outline-none focus:ring-2 focus:ring-green-400">
              <option value="">— 未指定 —</option>
              <option v-for="s in shifts" :key="s.code" :value="s.code">
                {{ s.code }}{{ s.label ? '　' + s.label : '' }}　{{ s.start }}~{{ s.end }}
              </option>
            </select>
          </div>
        </div>
        <div class="flex gap-2">
          <button class="flex-1 py-2.5 text-lg border border-light-c text-muted-c rounded-xl hover-surface2 transition-colors" @click="showStaffForm = false">取消</button>
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
      <div class="bg-surface rounded-2xl shadow-xl w-full max-w-xs p-5 mx-4">
        <h3 class="font-bold text-base-c mb-2">確認刪除</h3>
        <p class="text-lg text-hint-c mb-5">
          確定要刪除員工
          <span class="font-semibold text-base-c">
            {{ allEmployeesFlat.find(e => e.id === staffDeleteId)?.name }}
          </span>
          嗎？此操作無法復原。
        </p>
        <div class="flex gap-2">
          <button class="flex-1 py-2.5 text-lg border border-light-c text-muted-c rounded-xl hover-surface2 transition-colors" @click="showDeleteConfirm = false">取消</button>
          <button class="flex-1 py-2.5 text-lg bg-red-600 hover:bg-red-700 text-white rounded-xl font-medium transition-colors" @click="deleteStaff">刪除</button>
        </div>
      </div>
    </div>

    <!-- ══ Modal：組別新增/改名 ══ -->
    <div v-if="showDeptForm" class="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50" @click.self="showDeptForm = false">
      <div class="bg-surface rounded-2xl shadow-xl w-full max-w-xs p-5 mx-4">
        <div class="flex items-center justify-between mb-4">
          <h3 class="font-bold text-base-c">{{ deptFormMode === 'add' ? '新增組別' : '組別改名' }}</h3>
          <button class="p-1.5 hover-surface2 rounded-lg transition-colors text-hint-c" @click="showDeptForm = false">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
        </div>
        <div class="mb-5">
          <label class="text-base font-semibold text-hint-c uppercase tracking-wide block mb-1.5">組別名稱</label>
          <input v-model="deptFormName" type="text" placeholder="e.g. 田園餐廳"
                 class="w-full text-base border border-light-c rounded-xl px-3 py-2 bg-surface text-base-c outline-none focus:ring-2 focus:ring-green-400"/>
        </div>
        <div class="flex gap-2">
          <button class="flex-1 py-2.5 text-base border border-light-c text-muted-c rounded-xl hover-surface2 transition-colors" @click="showDeptForm = false">取消</button>
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
      <div class="bg-surface rounded-2xl shadow-xl w-full max-w-xs p-5 mx-4">
        <h3 class="font-bold text-base-c mb-2">確認刪除組別</h3>
        <p class="text-base text-hint-c mb-5">
          確定要刪除組別
          <span class="font-semibold text-base-c">{{ deptDeleteTarget }}</span>
          嗎？組別內必須無在職員工才能刪除。
        </p>
        <div class="flex gap-2">
          <button class="flex-1 py-2.5 text-base border border-light-c text-muted-c rounded-xl hover-surface2 transition-colors" @click="showDeptDelete = false">取消</button>
          <button class="flex-1 py-2.5 text-base bg-red-600 hover:bg-red-700 text-white rounded-xl font-medium transition-colors" @click="deleteDept">刪除</button>
        </div>
      </div>
    </div>

    <!-- 網路狀態 Badge -->
    <transition name="fade">
      <div v-if="!isOnline || isSyncing || pendingCount > 0"
           class="fixed top-16 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium shadow-lg whitespace-nowrap"
           :class="isSyncing ? 'bg-blue-600 text-white' : !isOnline ? 'bg-amber-500 text-white' : 'bg-yellow-500 text-white'">
        <!-- 同步中 -->
        <template v-if="isSyncing">
          <svg class="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
          </svg>
          同步中…
        </template>
        <!-- 離線 -->
        <template v-else-if="!isOnline">
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18.364 5.636a9 9 0 010 12.728M15.536 8.464a5 5 0 010 7.072M3 3l18 18M9.879 9.879A3 3 0 0012 9c.34 0 .67.057.976.163"/>
          </svg>
          離線中{{ pendingCount > 0 ? `・${pendingCount} 筆待同步` : '' }}
        </template>
        <!-- 連線但有待送出佇列 -->
        <template v-else>
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
          </svg>
          {{ pendingCount }} 筆待同步
        </template>
      </div>
    </transition>

    <!-- Toast -->
    <transition name="fade">
      <div v-if="toast.show"
           :class="['fixed bottom-6 left-1/2 -translate-x-1/2 sm:left-auto sm:right-6 sm:translate-x-0 text-white text-lg px-4 py-3 rounded-xl shadow-lg flex items-center gap-2 z-50 whitespace-nowrap',
 toast.error ? 'bg-red-700' : 'bg-accent-solid']">
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
/* 格子分隔線：用 CSS 變數保持深淺模式一致，透明度調低讓格線淡而不搶眼 */
.border-cell { border-color: color-mix(in srgb, var(--border-light) 65%, transparent); border-right-width: 2px; }

</style>
