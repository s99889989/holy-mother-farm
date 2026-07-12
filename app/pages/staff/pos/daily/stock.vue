<script setup lang="ts">
definePageMeta({ layout: 'staff', requiredPermission: 'pos.daily.stock' })

interface StockRow {
  matNo: string
  matType: string | null
  matName: string
  matUnit: string | null
  matPrice: number
  remark: string | null
  onHandQty: number
}

interface ListResponse {
  rows: StockRow[]
  total: number
  page: number
  pageSize: number
  totalPages: number
  error?: string
}

const commonStore = useCommonStore()
const apiBase = computed(() => commonStore.data.main_url)

// 資料庫暫停/開啟狀態（跨頁面共用快取，見 composables/useBk35DbStatus.ts）
const { bksqlAttached: dbAttached, checkStatus } = useBk35DbStatus()

function todayStr() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

// 點擊日期欄位時直接跳出日曆選單，不用特地點小圖示（不支援的瀏覽器會靜默失敗，退回原生行為）
function openDatePicker(e: Event) {
  const el = e.target as HTMLInputElement & { showPicker?: () => void }
  el.showPicker?.()
}

function formatQty(n: number) {
  if (n === null || n === undefined) return '-'
  return Number(n).toLocaleString(undefined, { maximumFractionDigits: 2 })
}

function formatPrice(n: number) {
  if (n === null || n === undefined) return '-'
  return Number(n).toLocaleString(undefined, { maximumFractionDigits: 2 })
}

// ══════════════════ 頁籤切換 ══════════════════

const tab = ref<'stocktake' | 'items' | 'io'>('stocktake')

function switchToStocktake() {
  tab.value = 'stocktake'
}

function switchToItems() {
  tab.value = 'items'
  fetchMatTypes()
  fetchItemList(1)
}

function switchToIo() {
  tab.value = 'io'
  ioSelectedCategory.value = ''
  fetchIoItems(1)
  fetchIoDatesWithRecords()
}

// ══════════════════ 庫存盤點 ══════════════════
// 對照 MATIO 進出記錄，支援指定期間、有庫存的排前面

const search = ref('')
const filterMatType = ref('')
const dateFrom = ref('')
const dateTo = ref('')
const pageSize = ref(50)
const page = ref(1)
const totalPages = ref(1)
const total = ref(0)
const rows = ref<StockRow[]>([])
const loading = ref(false)
const error = ref('')
const jumpPage = ref<number | null>(null)

async function fetchList(p: number) {
  if (dbAttached.value === false) return
  loading.value = true
  error.value = ''
  page.value = p
  try {
    const query: Record<string, any> = {
      page: p,
      pageSize: pageSize.value,
      search: search.value,
      sortQtyFirst: true
    }
    if (filterMatType.value) query.matType = filterMatType.value
    if (dateFrom.value) query.dateFrom = dateFrom.value
    if (dateTo.value) query.dateTo = dateTo.value

    const res = await $fetch<ListResponse>(
      `${apiBase.value}/holy/bk35sql/stock/list`,
      { credentials: 'include', query }
    )
    if (res?.error) {
      error.value = res.error
      rows.value = []
      total.value = 0
      totalPages.value = 1
    } else {
      rows.value = res?.rows ?? []
      total.value = res?.total ?? 0
      totalPages.value = res?.totalPages ?? 1
    }
  } catch (e: any) {
    error.value = e?.message ?? '載入資料失敗'
  } finally {
    loading.value = false
  }
}

function resetSearch() {
  search.value = ''
  filterMatType.value = ''
  dateFrom.value = ''
  dateTo.value = ''
  fetchList(1)
}

function goToJumpPage() {
  if (!jumpPage.value || jumpPage.value < 1) return
  fetchList(Math.min(jumpPage.value, totalPages.value))
}

// ══════════════════ 調整庫存（入庫 / 轉入 / 轉出 / 不良） ══════════════════
// 表格裡的快速單筆調整，日期預設今天（要一次登錄多筆、指定其他日期請用「進出庫」頁籤）

const showAdjust = ref(false)
const adjustTarget = ref<StockRow | null>(null)
const adjustType = ref<'in' | 'transferIn' | 'transferOut' | 'scrap'>('in')
const adjustQty = ref<number | null>(null)
const adjustRemark = ref('')
const adjustDate = ref(todayStr())
const adjustLoading = ref(false)
const adjustError = ref('')

const ADJUST_TYPES: { value: 'in' | 'transferIn' | 'transferOut' | 'scrap'; label: string }[] = [
  { value: 'in', label: '入庫' },
  { value: 'transferIn', label: '轉入' },
  { value: 'transferOut', label: '轉出' },
  { value: 'scrap', label: '不良' }
]

function openAdjust(row: StockRow) {
  adjustTarget.value = row
  adjustType.value = 'in'
  adjustQty.value = null
  adjustRemark.value = ''
  adjustDate.value = todayStr()
  adjustError.value = ''
  showAdjust.value = true
}

function closeAdjust() {
  showAdjust.value = false
}

async function submitAdjust() {
  if (!adjustTarget.value) return
  if (!adjustQty.value || adjustQty.value <= 0) {
    adjustError.value = '請輸入大於 0 的數量'
    return
  }
  adjustLoading.value = true
  adjustError.value = ''
  try {
    const formData = new FormData()
    formData.append('matNo', adjustTarget.value.matNo)
    formData.append('matName', adjustTarget.value.matName)
    formData.append('type', adjustType.value)
    formData.append('qty', String(adjustQty.value))
    formData.append('remark', adjustRemark.value)
    formData.append('date', adjustDate.value)

    const res = await $fetch<{ ok: boolean; error?: string }>(
      `${apiBase.value}/holy/bk35sql/stock/adjust`,
      { method: 'POST', credentials: 'include', body: formData }
    )
    if (!res?.ok) {
      adjustError.value = res?.error ?? '調整失敗'
      return
    }
    showAdjust.value = false
    await fetchList(page.value)
  } catch (e: any) {
    adjustError.value = e?.message ?? '調整失敗'
  } finally {
    adjustLoading.value = false
  }
}

// ══════════════════ 物料項目（清單 + 新增 + 編輯 + 刪除） ══════════════════

const itemSearch = ref('')
const itemPageSize = ref(50)
const itemPage = ref(1)
const itemTotalPages = ref(1)
const itemTotal = ref(0)
const itemRows = ref<StockRow[]>([])
const itemLoading = ref(false)
const itemError = ref('')
const itemJumpPage = ref<number | null>(null)

async function fetchItemList(p: number) {
  if (dbAttached.value === false) return
  itemLoading.value = true
  itemError.value = ''
  itemPage.value = p
  try {
    const res = await $fetch<ListResponse>(
      `${apiBase.value}/holy/bk35sql/stock/list`,
      { credentials: 'include', query: { page: p, pageSize: itemPageSize.value, search: itemSearch.value } }
    )
    if (res?.error) {
      itemError.value = res.error
      itemRows.value = []
      itemTotal.value = 0
      itemTotalPages.value = 1
    } else {
      itemRows.value = res?.rows ?? []
      itemTotal.value = res?.total ?? 0
      itemTotalPages.value = res?.totalPages ?? 1
    }
  } catch (e: any) {
    itemError.value = e?.message ?? '載入資料失敗'
  } finally {
    itemLoading.value = false
  }
}

function resetItemSearch() {
  itemSearch.value = ''
  fetchItemList(1)
}

function goToItemJumpPage() {
  if (!itemJumpPage.value || itemJumpPage.value < 1) return
  fetchItemList(Math.min(itemJumpPage.value, itemTotalPages.value))
}

// 從 MATLIST 現有資料反查已經用過的分類，給下拉/輸入建議用
// （舊系統另外有獨立的「物料類別」維護畫面，這裡先不去動那張表）
const matTypeOptions = ref<string[]>([])

async function fetchMatTypes() {
  try {
    const res = await $fetch<string[] | { error: string }>(
      `${apiBase.value}/holy/bk35sql/stock/types`,
      { credentials: 'include' }
    )
    if (Array.isArray(res)) {
      matTypeOptions.value = res
    }
  } catch {
    // 抓不到分類清單不影響主要功能，安靜失敗即可，輸入框仍可手動輸入
  }
}

// 新增 / 編輯共用表單。editingMatNo 為 null 時是新增模式，有值時是編輯模式（料號欄位鎖定不可改）
const showAddForm = ref(false)
const editingMatNo = ref<string | null>(null)
const newMatNo = ref('')
const newMatType = ref('')
const newMatName = ref('')
const newMatUnit = ref('')
const newMatPrice = ref<number | null>(null)
const newMatRemark = ref('')
const addMaterialLoading = ref(false)
const addMaterialError = ref('')
const addMaterialSuccess = ref('')

function resetAddMaterialForm() {
  newMatNo.value = ''
  newMatType.value = ''
  newMatName.value = ''
  newMatUnit.value = ''
  newMatPrice.value = null
  newMatRemark.value = ''
  addMaterialError.value = ''
}

function toggleAddForm() {
  if (showAddForm.value && editingMatNo.value === null) {
    showAddForm.value = false
    return
  }
  editingMatNo.value = null
  resetAddMaterialForm()
  showAddForm.value = true
}

function openEditForm(row: StockRow) {
  editingMatNo.value = row.matNo
  newMatNo.value = row.matNo
  newMatType.value = row.matType ?? ''
  newMatName.value = row.matName
  newMatUnit.value = row.matUnit ?? ''
  newMatPrice.value = row.matPrice ?? null
  newMatRemark.value = row.remark ?? ''
  addMaterialError.value = ''
  addMaterialSuccess.value = ''
  showAddForm.value = true
  fetchMatTypes()
}

function cancelForm() {
  showAddForm.value = false
  editingMatNo.value = null
}

async function submitAddMaterial() {
  if (!newMatNo.value.trim() || !newMatName.value.trim()) {
    addMaterialError.value = '料號與物料名稱為必填'
    return
  }
  addMaterialLoading.value = true
  addMaterialError.value = ''
  addMaterialSuccess.value = ''
  try {
    const formData = new FormData()
    formData.append('matNo', newMatNo.value.trim())
    formData.append('matType', newMatType.value.trim())
    formData.append('matName', newMatName.value.trim())
    formData.append('matUnit', newMatUnit.value.trim())
    formData.append('matPrice', String(newMatPrice.value ?? 0))
    formData.append('remark', newMatRemark.value)

    const isEdit = editingMatNo.value !== null
    const res = await $fetch<{ ok: boolean; error?: string }>(
      `${apiBase.value}/holy/bk35sql/stock/material`,
      { method: isEdit ? 'PUT' : 'POST', credentials: 'include', body: formData }
    )
    if (!res?.ok) {
      addMaterialError.value = res?.error ?? (isEdit ? '更新失敗' : '新增失敗')
      return
    }
    const savedName = newMatName.value
    const savedNo = newMatNo.value
    showAddForm.value = false
    editingMatNo.value = null
    resetAddMaterialForm()
    addMaterialSuccess.value = isEdit
      ? `已更新物料「${savedName}」（料號 ${savedNo}）`
      : `已新增物料「${savedName}」（料號 ${savedNo}）`
    fetchMatTypes()
    await fetchItemList(itemPage.value)
  } catch (e: any) {
    addMaterialError.value = e?.message ?? '送出失敗'
  } finally {
    addMaterialLoading.value = false
  }
}

const deletingMatNo = ref('')

async function deleteMaterial(row: StockRow) {
  const ok = confirm(`確定要刪除物料「${row.matName}」（料號 ${row.matNo}）嗎？\n\n這只會刪除物料主檔資料，過去的進出庫記錄不會被刪除，但這個動作無法復原。`)
  if (!ok) return

  deletingMatNo.value = row.matNo
  try {
    const res = await $fetch<{ ok: boolean; error?: string }>(
      `${apiBase.value}/holy/bk35sql/stock/material`,
      { method: 'DELETE', credentials: 'include', query: { matNo: row.matNo } }
    )
    if (!res?.ok) {
      alert(res?.error ?? '刪除失敗')
      return
    }
    await fetchItemList(itemPage.value)
    fetchMatTypes()
  } catch (e: any) {
    alert(e?.message ?? '刪除失敗')
  } finally {
    deletingMatNo.value = ''
  }
}

// ══════════════════ 進出庫（指定日期，一次登錄多筆） ══════════════════

interface IoCartLine {
  matNo: string
  matName: string
  matUnit: string | null
  type: 'in' | 'transferIn' | 'transferOut' | 'scrap'
  qty: number | null
  remark: string
}

const ioDate = ref(todayStr())

// 內嵌迷你日曆（取代原生 date input 的彈出視窗，直接顯示在畫面上方便點選）
const ioCalendarViewDate = ref(new Date())

const ioCalendarLabel = computed(() =>
  `${ioCalendarViewDate.value.getFullYear()} 年 ${ioCalendarViewDate.value.getMonth() + 1} 月`
)

const ioCalendarDays = computed(() => {
  const year = ioCalendarViewDate.value.getFullYear()
  const month = ioCalendarViewDate.value.getMonth()
  const startOffset = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const cells: (number | null)[] = []
  for (let i = 0; i < startOffset; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)
  return cells
})

function ioCalPrevMonth() {
  const d = new Date(ioCalendarViewDate.value)
  d.setMonth(d.getMonth() - 1)
  ioCalendarViewDate.value = d
}

function ioCalNextMonth() {
  const d = new Date(ioCalendarViewDate.value)
  d.setMonth(d.getMonth() + 1)
  ioCalendarViewDate.value = d
}

function ioCalDayStr(day: number) {
  const y = ioCalendarViewDate.value.getFullYear()
  const m = ioCalendarViewDate.value.getMonth()
  return `${y}-${String(m + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

function ioCalSelectDay(day: number | null) {
  if (!day) return
  ioDate.value = ioCalDayStr(day)
}

function ioCalIsSelected(day: number | null) {
  return !!day && ioCalDayStr(day) === ioDate.value
}

function ioCalIsToday(day: number | null) {
  if (!day) return false
  const t = new Date()
  return day === t.getDate()
    && ioCalendarViewDate.value.getMonth() === t.getMonth()
    && ioCalendarViewDate.value.getFullYear() === t.getFullYear()
}

// 該月份有進出庫紀錄的日期集合，用來在日曆上顯示紅點提示
const ioDatesWithRecords = ref<Set<string>>(new Set())

async function fetchIoDatesWithRecords() {
  try {
    const year = ioCalendarViewDate.value.getFullYear()
    const month = ioCalendarViewDate.value.getMonth() + 1
    const res = await $fetch<string[] | { error: string }>(
      `${apiBase.value}/holy/bk35sql/stock/io-dates`,
      { credentials: 'include', query: { year, month } }
    )
    ioDatesWithRecords.value = Array.isArray(res) ? new Set(res) : new Set()
  } catch {
    // 抓不到紅點提示不影響主要功能，安靜失敗即可
    ioDatesWithRecords.value = new Set()
  }
}

function ioCalHasRecord(day: number | null) {
  return !!day && ioDatesWithRecords.value.has(ioCalDayStr(day))
}

watch(ioCalendarViewDate, fetchIoDatesWithRecords)
const ioSearch = ref('')
const ioSelectedCategory = ref('') // 空字串 = 全部分類
const ioItems = ref<StockRow[]>([])
const ioItemsLoading = ref(false)
const ioItemsError = ref('')
const ioItemPage = ref(1)
const ioItemTotalPages = ref(1)
const ioCart = ref<IoCartLine[]>([])
const ioSubmitLoading = ref(false)
const ioSubmitError = ref('')
const ioSubmitSuccess = ref('')

async function fetchIoItems(p: number) {
  ioItemsLoading.value = true
  ioItemsError.value = ''
  ioItemPage.value = p
  try {
    const query: Record<string, any> = { page: p, pageSize: 30, search: ioSearch.value }
    if (ioSelectedCategory.value) query.matType = ioSelectedCategory.value
    const res = await $fetch<ListResponse>(
      `${apiBase.value}/holy/bk35sql/stock/list`,
      { credentials: 'include', query }
    )
    if (res?.error) {
      ioItemsError.value = res.error
      ioItems.value = []
      ioItemTotalPages.value = 1
    } else {
      ioItems.value = res?.rows ?? []
      ioItemTotalPages.value = res?.totalPages ?? 1
    }
  } catch (e: any) {
    ioItemsError.value = e?.message ?? '載入失敗'
  } finally {
    ioItemsLoading.value = false
  }
}

function selectIoCategory(cat: string) {
  ioSelectedCategory.value = cat
  fetchIoItems(1)
}

function addToCart(row: StockRow) {
  if (ioCart.value.some(l => l.matNo === row.matNo)) return
  ioCart.value.push({
    matNo: row.matNo,
    matName: row.matName,
    matUnit: row.matUnit,
    type: 'in',
    qty: null,
    remark: ''
  })
}

function removeFromCart(index: number) {
  ioCart.value.splice(index, 1)
}

async function submitIoCart() {
  if (ioCart.value.length === 0) return
  const invalid = ioCart.value.find(l => !l.qty || l.qty <= 0)
  if (invalid) {
    ioSubmitError.value = `「${invalid.matName}」的數量必須大於 0`
    return
  }

  ioSubmitLoading.value = true
  ioSubmitError.value = ''
  ioSubmitSuccess.value = ''
  const failed: string[] = []

  for (const line of ioCart.value) {
    try {
      const formData = new FormData()
      formData.append('matNo', line.matNo)
      formData.append('matName', line.matName)
      formData.append('type', line.type)
      formData.append('qty', String(line.qty))
      formData.append('remark', line.remark)
      formData.append('date', ioDate.value)

      const res = await $fetch<{ ok: boolean; error?: string }>(
        `${apiBase.value}/holy/bk35sql/stock/adjust`,
        { method: 'POST', credentials: 'include', body: formData }
      )
      if (!res?.ok) failed.push(`${line.matName}：${res?.error ?? '失敗'}`)
    } catch (e: any) {
      failed.push(`${line.matName}：${e?.message ?? '失敗'}`)
    }
  }

  ioSubmitLoading.value = false
  if (failed.length === 0) {
    ioSubmitSuccess.value = `已送出 ${ioCart.value.length} 筆進出庫記錄（日期：${ioDate.value}）`
    ioCart.value = []
  } else {
    ioSubmitError.value = `部分送出失敗：${failed.join('；')}`
  }
}

await checkStatus()
await fetchList(1)
fetchMatTypes()
</script>

<template>
  <div class="page-wrap">
    <div class="page-header">
      <h1 class="page-title">庫存管理</h1>
      <div class="tab-switch">
        <button :class="['sw-tab', { active: tab === 'stocktake' }]" @click="switchToStocktake">庫存盤點</button>
        <button :class="['sw-tab', { active: tab === 'io' }]" @click="switchToIo">進出庫</button>
        <button :class="['sw-tab', { active: tab === 'items' }]" @click="switchToItems">物料項目</button>
      </div>
    </div>

    <div v-if="dbAttached === false" class="paused-banner">
      ⏸ BKSQL 資料庫目前已暫停（Detach），查詢功能暫時無法使用，請聯繫管理員開啟資料庫後再試。
    </div>

    <!-- ══════════════════ 庫存盤點頁籤 ══════════════════ -->
    <template v-else-if="tab === 'stocktake'">
      <p class="hint-banner">
        庫存量 = MATIO（物料進出記錄）的「入庫 + 轉入 − 轉出 − 不良」加總。
        指定日期區間時，只加總該區間內的異動；不指定則是全部歷史加總。有庫存的品項排在前面。
      </p>

      <div class="filter-bar">
        <input
          v-model="search"
          placeholder="搜尋料號 / 物料名稱 / 分類…"
          class="search-input"
          @keyup.enter="fetchList(1)"
        >
        <select v-model="filterMatType" class="date-input" @change="fetchList(1)">
          <option value="">全部分類</option>
          <option v-for="t in matTypeOptions" :key="t" :value="t">{{ t }}</option>
        </select>
        <label class="inline-label">起：<input v-model="dateFrom" type="date" class="date-input" @click="openDatePicker"></label>
        <label class="inline-label">迄：<input v-model="dateTo" type="date" class="date-input" @click="openDatePicker"></label>
        <button class="btn-primary" @click="fetchList(1)">查詢</button>
        <button class="btn-ghost" @click="resetSearch">清除</button>
        <span class="total-hint">共 {{ total }} 筆</span>
      </div>

      <div class="pagination-bar">
        <button class="page-btn" :disabled="page === 1" @click="fetchList(1)">⏮ 第一頁</button>
        <button class="page-btn" :disabled="page === 1" @click="fetchList(page - 1)">‹ 上一頁</button>
        <span class="page-info">第 {{ page }} / {{ totalPages }} 頁</span>
        <button class="page-btn" :disabled="page === totalPages" @click="fetchList(page + 1)">下一頁 ›</button>
        <button class="page-btn" :disabled="page === totalPages" @click="fetchList(totalPages)">最後一頁 ⏭</button>
        <span class="jump-group">
          跳至<input v-model.number="jumpPage" type="number" min="1" :max="totalPages" class="jump-input" @keyup.enter="goToJumpPage">頁
          <button class="btn-ghost small" @click="goToJumpPage">前往</button>
        </span>
        <select v-model.number="pageSize" class="page-size-select" @change="fetchList(1)">
          <option :value="20">20 筆/頁</option>
          <option :value="50">50 筆/頁</option>
          <option :value="100">100 筆/頁</option>
          <option :value="200">200 筆/頁</option>
        </select>
      </div>

      <div v-if="loading" class="loading">載入中…</div>
      <div v-else-if="error" class="error-box">{{ error }}</div>
      <div v-else class="table-wrap">
        <table class="data-table">
          <thead>
          <tr>
            <th>料號</th>
            <th>分類</th>
            <th>物料名稱</th>
            <th>單位</th>
            <th>單價</th>
            <th>庫存數量</th>
            <th>備註</th>
            <th>操作</th>
          </tr>
          </thead>
          <tbody>
          <tr v-for="row in rows" :key="row.matNo">
            <td>{{ row.matNo }}</td>
            <td>{{ row.matType || '-' }}</td>
            <td>{{ row.matName }}</td>
            <td>{{ row.matUnit || '-' }}</td>
            <td>{{ formatPrice(row.matPrice) }}</td>
            <td :class="{ 'qty-low': row.onHandQty <= 0 }">
              {{ formatQty(row.onHandQty) }}
              <span v-if="row.onHandQty <= 0" class="low-badge">庫存不足</span>
            </td>
            <td>{{ row.remark || '-' }}</td>
            <td>
              <button class="btn-ghost small" @click="openAdjust(row)">調整庫存</button>
            </td>
          </tr>
          <tr v-if="rows.length === 0">
            <td colspan="8" class="empty-cell">查無資料</td>
          </tr>
          </tbody>
        </table>
      </div>

      <div class="pagination-bar">
        <button class="page-btn" :disabled="page === 1" @click="fetchList(1)">⏮ 第一頁</button>
        <button class="page-btn" :disabled="page === 1" @click="fetchList(page - 1)">‹ 上一頁</button>
        <span class="page-info">第 {{ page }} / {{ totalPages }} 頁</span>
        <button class="page-btn" :disabled="page === totalPages" @click="fetchList(page + 1)">下一頁 ›</button>
        <button class="page-btn" :disabled="page === totalPages" @click="fetchList(totalPages)">最後一頁 ⏭</button>
        <span class="jump-group">
          跳至<input v-model.number="jumpPage" type="number" min="1" :max="totalPages" class="jump-input" @keyup.enter="goToJumpPage">頁
          <button class="btn-ghost small" @click="goToJumpPage">前往</button>
        </span>
      </div>
    </template>

    <!-- ══════════════════ 物料項目頁籤 ══════════════════ -->
    <template v-else-if="tab === 'items'">
      <div class="filter-bar">
        <input
          v-model="itemSearch"
          placeholder="搜尋料號 / 物料名稱 / 分類…"
          class="search-input"
          @keyup.enter="fetchItemList(1)"
        >
        <button class="btn-primary" @click="fetchItemList(1)">查詢</button>
        <button class="btn-ghost" @click="resetItemSearch">清除</button>
        <span class="total-hint">共 {{ itemTotal }} 筆</span>
        <button class="btn-primary" style="margin-left: auto" @click="toggleAddForm">
          {{ showAddForm && editingMatNo === null ? '✕ 取消新增' : '＋ 新增物料' }}
        </button>
      </div>

      <!-- 新增 / 編輯物料表單 -->
      <div v-if="showAddForm" class="section">
        <h2 class="section-title">{{ editingMatNo ? `編輯物料 — ${editingMatNo}` : '新增物料' }}</h2>
        <div class="form-row">
          <label class="form-label">料號{{ editingMatNo ? '（編輯模式不可修改）' : '（必填，需唯一）' }}</label>
          <input v-model="newMatNo" class="form-input" placeholder="例如：M0001" :disabled="editingMatNo !== null">
        </div>
        <div class="form-row">
          <label class="form-label">分類（可從清單選，也可以直接輸入新的）</label>
          <input v-model="newMatType" class="form-input" list="mat-type-options" placeholder="例如：麵粉、乳製、包裝…">
          <datalist id="mat-type-options">
            <option v-for="t in matTypeOptions" :key="t" :value="t" />
          </datalist>
        </div>
        <div class="form-row">
          <label class="form-label">物料名稱（必填）</label>
          <input v-model="newMatName" class="form-input">
        </div>
        <div class="form-row">
          <label class="form-label">單位</label>
          <input v-model="newMatUnit" class="form-input" placeholder="例如：公斤、包、瓶">
        </div>
        <div class="form-row">
          <label class="form-label">單價</label>
          <input v-model.number="newMatPrice" type="number" min="0" step="0.01" class="form-input">
        </div>
        <div class="form-row">
          <label class="form-label">備註</label>
          <input v-model="newMatRemark" class="form-input">
        </div>

        <div v-if="addMaterialError" class="error-box">{{ addMaterialError }}</div>

        <div class="form-actions">
          <button class="btn-primary" :disabled="addMaterialLoading" @click="submitAddMaterial">
            {{ addMaterialLoading ? '送出中…' : (editingMatNo ? '確認更新' : '確認新增') }}
          </button>
          <button class="btn-ghost" @click="cancelForm">取消</button>
        </div>
      </div>

      <div v-if="addMaterialSuccess" class="success-box">✓ {{ addMaterialSuccess }}</div>

      <div class="pagination-bar">
        <button class="page-btn" :disabled="itemPage === 1" @click="fetchItemList(1)">⏮ 第一頁</button>
        <button class="page-btn" :disabled="itemPage === 1" @click="fetchItemList(itemPage - 1)">‹ 上一頁</button>
        <span class="page-info">第 {{ itemPage }} / {{ itemTotalPages }} 頁</span>
        <button class="page-btn" :disabled="itemPage === itemTotalPages" @click="fetchItemList(itemPage + 1)">下一頁 ›</button>
        <button class="page-btn" :disabled="itemPage === itemTotalPages" @click="fetchItemList(itemTotalPages)">最後一頁 ⏭</button>
        <span class="jump-group">
          跳至<input v-model.number="itemJumpPage" type="number" min="1" :max="itemTotalPages" class="jump-input" @keyup.enter="goToItemJumpPage">頁
          <button class="btn-ghost small" @click="goToItemJumpPage">前往</button>
        </span>
        <select v-model.number="itemPageSize" class="page-size-select" @change="fetchItemList(1)">
          <option :value="20">20 筆/頁</option>
          <option :value="50">50 筆/頁</option>
          <option :value="100">100 筆/頁</option>
          <option :value="200">200 筆/頁</option>
        </select>
      </div>

      <div v-if="itemLoading" class="loading">載入中…</div>
      <div v-else-if="itemError" class="error-box">{{ itemError }}</div>
      <div v-else class="table-wrap">
        <table class="data-table">
          <thead>
          <tr>
            <th>料號</th>
            <th>分類</th>
            <th>物料名稱</th>
            <th>單位</th>
            <th>單價</th>
            <th>備註</th>
            <th>操作</th>
          </tr>
          </thead>
          <tbody>
          <tr v-for="row in itemRows" :key="row.matNo">
            <td>{{ row.matNo }}</td>
            <td>{{ row.matType || '-' }}</td>
            <td>{{ row.matName }}</td>
            <td>{{ row.matUnit || '-' }}</td>
            <td>{{ formatPrice(row.matPrice) }}</td>
            <td>{{ row.remark || '-' }}</td>
            <td class="action-cell">
              <button class="btn-ghost small" @click="openEditForm(row)">編輯</button>
              <button
                class="btn-danger small"
                :disabled="deletingMatNo === row.matNo"
                @click="deleteMaterial(row)"
              >
                {{ deletingMatNo === row.matNo ? '刪除中…' : '刪除' }}
              </button>
            </td>
          </tr>
          <tr v-if="itemRows.length === 0">
            <td colspan="7" class="empty-cell">查無資料</td>
          </tr>
          </tbody>
        </table>
      </div>

      <div class="pagination-bar">
        <button class="page-btn" :disabled="itemPage === 1" @click="fetchItemList(1)">⏮ 第一頁</button>
        <button class="page-btn" :disabled="itemPage === 1" @click="fetchItemList(itemPage - 1)">‹ 上一頁</button>
        <span class="page-info">第 {{ itemPage }} / {{ itemTotalPages }} 頁</span>
        <button class="page-btn" :disabled="itemPage === itemTotalPages" @click="fetchItemList(itemPage + 1)">下一頁 ›</button>
        <button class="page-btn" :disabled="itemPage === itemTotalPages" @click="fetchItemList(itemTotalPages)">最後一頁 ⏭</button>
        <span class="jump-group">
          跳至<input v-model.number="itemJumpPage" type="number" min="1" :max="itemTotalPages" class="jump-input" @keyup.enter="goToItemJumpPage">頁
          <button class="btn-ghost small" @click="goToItemJumpPage">前往</button>
        </span>
      </div>
    </template>

    <!-- ══════════════════ 進出庫頁籤 ══════════════════ -->
    <template v-else>
      <div class="io-layout">
        <!-- 左：日期日曆 + 待送出清單 -->
        <div class="io-left-col">
          <div class="section">
            <h2 class="section-title">日期</h2>
            <div class="mini-calendar">
              <div class="mini-cal-header">
                <button class="btn-ghost small" @click="ioCalPrevMonth">‹</button>
                <span>{{ ioCalendarLabel }}</span>
                <button class="btn-ghost small" @click="ioCalNextMonth">›</button>
              </div>
              <div class="mini-cal-weekdays">
                <span v-for="w in ['日', '一', '二', '三', '四', '五', '六']" :key="w">{{ w }}</span>
              </div>
              <div class="mini-cal-days">
                <button
                  v-for="(day, i) in ioCalendarDays"
                  :key="i"
                  type="button"
                  class="mini-cal-day"
                  :class="{ empty: !day, selected: ioCalIsSelected(day), today: ioCalIsToday(day) }"
                  :disabled="!day"
                  @click="ioCalSelectDay(day)"
                >
                  {{ day }}
                  <span v-if="ioCalHasRecord(day)" class="mini-cal-dot" />
                </button>
              </div>
              <div class="mini-cal-selected">已選日期：{{ ioDate }}　<span class="mini-cal-dot-hint">● 當天有進出庫紀錄</span></div>
            </div>
          </div>

          <div class="section io-cart-col">
            <h2 class="section-title">待送出清單（{{ ioCart.length }} 筆）</h2>

            <div v-if="ioCart.length === 0" class="empty-hint">尚未加入任何物料，從右邊搜尋後點「＋加入」</div>

            <div v-for="(line, i) in ioCart" :key="line.matNo" class="io-cart-line">
              <div class="io-cart-name">{{ line.matName }}（{{ line.matUnit || '' }}）</div>
              <div class="tab-switch tab-switch-4">
                <button
                  v-for="t in ADJUST_TYPES"
                  :key="t.value"
                  :class="['sw-tab', { active: line.type === t.value }]"
                  @click="line.type = t.value"
                >
                  {{ t.label }}
                </button>
              </div>
              <input v-model.number="line.qty" type="number" min="0" step="0.01" class="form-input io-qty-input" placeholder="數量">
              <input v-model="line.remark" class="form-input io-remark-input" placeholder="備註（選填）">
              <button class="btn-danger small" @click="removeFromCart(i)">移除</button>
            </div>

            <div v-if="ioSubmitError" class="error-box">{{ ioSubmitError }}</div>
            <div v-if="ioSubmitSuccess" class="success-box">✓ {{ ioSubmitSuccess }}</div>

            <div class="form-actions">
              <button class="btn-primary" :disabled="ioCart.length === 0 || ioSubmitLoading" @click="submitIoCart">
                {{ ioSubmitLoading ? '送出中…' : `確認送出全部（${ioCart.length} 筆）` }}
              </button>
            </div>
          </div>
        </div>

        <!-- 右：分類瀏覽 + 物料選取 -->
        <div class="section io-search-col">
          <h2 class="section-title">選擇物料</h2>

          <div class="io-category-grid">
            <button
              :class="['io-category-btn', { active: ioSelectedCategory === '' }]"
              @click="selectIoCategory('')"
            >
              全部
            </button>
            <button
              v-for="t in matTypeOptions"
              :key="t"
              :class="['io-category-btn', { active: ioSelectedCategory === t }]"
              @click="selectIoCategory(t)"
            >
              {{ t }}
            </button>
          </div>

          <div class="filter-bar">
            <input
              v-model="ioSearch"
              placeholder="在目前分類內搜尋名稱 / 料號…"
              class="search-input"
              @keyup.enter="fetchIoItems(1)"
            >
            <button class="btn-primary" @click="fetchIoItems(1)">查詢</button>
          </div>

          <div v-if="ioItemsLoading" class="loading">載入中…</div>
          <div v-else-if="ioItemsError" class="error-box">{{ ioItemsError }}</div>
          <template v-else>
            <div v-if="ioItems.length === 0" class="empty-hint">這個分類目前沒有物料</div>
            <div v-else class="io-item-grid">
              <button
                v-for="row in ioItems"
                :key="row.matNo"
                class="io-item-btn"
                :class="{ 'in-cart': ioCart.some(l => l.matNo === row.matNo) }"
                @click="addToCart(row)"
              >
                {{ row.matName }}
                <span v-if="ioCart.some(l => l.matNo === row.matNo)" class="io-item-badge">已加入</span>
              </button>
            </div>

            <div v-if="ioItemTotalPages > 1" class="pagination-bar">
              <button class="page-btn" :disabled="ioItemPage === 1" @click="fetchIoItems(ioItemPage - 1)">‹ 上一頁</button>
              <span class="page-info">第 {{ ioItemPage }} / {{ ioItemTotalPages }} 頁</span>
              <button class="page-btn" :disabled="ioItemPage === ioItemTotalPages" @click="fetchIoItems(ioItemPage + 1)">下一頁 ›</button>
            </div>
          </template>
        </div>
      </div>
    </template>

    <!-- ══════════════════ 調整庫存彈窗 ══════════════════ -->
    <div v-if="showAdjust" class="modal-overlay" @click.self="closeAdjust">
      <div class="modal-box">
        <div class="modal-header">
          <h2 class="section-title">調整庫存 — {{ adjustTarget?.matName }}</h2>
          <button class="btn-ghost small" @click="closeAdjust">✕ 關閉</button>
        </div>

        <p class="section-hint">
          目前庫存：{{ formatQty(adjustTarget?.onHandQty ?? 0) }} {{ adjustTarget?.matUnit || '' }}
        </p>

        <div class="form-row">
          <label class="form-label">日期</label>
          <input v-model="adjustDate" type="date" class="form-input" @click="openDatePicker">
        </div>

        <div class="form-row">
          <label class="form-label">調整類型</label>
          <div class="tab-switch tab-switch-4">
            <button
              v-for="t in ADJUST_TYPES"
              :key="t.value"
              :class="['sw-tab', { active: adjustType === t.value }]"
              @click="adjustType = t.value"
            >
              {{ t.label }}
            </button>
          </div>
        </div>

        <div class="form-row">
          <label class="form-label">數量（{{ adjustTarget?.matUnit || '單位' }}）</label>
          <input v-model.number="adjustQty" type="number" min="0" step="0.01" class="form-input">
        </div>

        <div class="form-row">
          <label class="form-label">備註（選填）</label>
          <input v-model="adjustRemark" class="form-input" placeholder="例如：供應商進貨單號、耗損原因…">
        </div>

        <div v-if="adjustError" class="error-box">{{ adjustError }}</div>

        <div class="modal-actions">
          <button class="btn-primary" :disabled="adjustLoading" @click="submitAdjust">
            {{ adjustLoading ? '送出中…' : '確認送出' }}
          </button>
          <button class="btn-ghost" @click="closeAdjust">取消</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.page-wrap { padding: 20px; display: flex; flex-direction: column; gap: 12px; }
.page-header { display: flex; align-items: center; justify-content: space-between; gap: 16px; flex-wrap: wrap; }
.page-title { font-size: 20px; font-weight: 700; color: var(--text); margin: 0; }

.hint-banner { font-size: 12px; color: var(--text-hint); background: var(--surface2); border: 1px solid var(--border-light); border-radius: var(--radius-sm); padding: 8px 12px; margin: 0; line-height: 1.6; }
.paused-banner { font-size: 13px; color: #92400e; background: #fef3c7; border: 1px solid #fde68a; border-radius: var(--radius-sm); padding: 12px 16px; }

.filter-bar { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
.search-input { width: 240px; padding: 7px 12px; font-size: 13px; border: 1px solid var(--border); border-radius: var(--radius-sm); background: var(--surface); color: var(--text); outline: none; }
.search-input:focus { border-color: var(--accent); }
.inline-label { display: flex; align-items: center; gap: 4px; font-size: 13px; color: var(--text-muted); }
.date-input { padding: 6px 8px; font-size: 13px; border: 1px solid var(--border); border-radius: var(--radius-sm); background: var(--surface); color: var(--text); outline: none; }
.btn-primary { padding: 7px 16px; background: var(--accent); color: #fff; border: none; border-radius: var(--radius-sm); font-size: 13px; cursor: pointer; }
.btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
.btn-ghost { padding: 7px 12px; background: transparent; color: var(--text-muted); border: 1px solid var(--border); border-radius: var(--radius-sm); font-size: 13px; cursor: pointer; }
.btn-ghost.small { padding: 4px 10px; font-size: 12px; }
.btn-danger { padding: 7px 16px; background: #c0392b; color: #fff; border: none; border-radius: var(--radius-sm); font-size: 13px; cursor: pointer; }
.btn-danger.small { padding: 4px 10px; font-size: 12px; }
.btn-danger:disabled { opacity: 0.5; cursor: not-allowed; }
.total-hint { font-size: 13px; color: var(--text-hint); }

.loading { color: var(--text-hint); font-size: 14px; }
.error-box { color: #c0392b; font-size: 13px; background: #fdecea; border: 1px solid #f5c6cb; border-radius: var(--radius-sm); padding: 10px 14px; }
.success-box { color: #1e7e34; font-size: 13px; background: #e6f4ea; border: 1px solid #b7dfc0; border-radius: var(--radius-sm); padding: 10px 14px; }
.empty-cell { text-align: center; color: var(--text-hint); padding: 24px 0 !important; }
.empty-hint { color: var(--text-hint); font-size: 13px; padding: 8px 0; }

.table-wrap { overflow-x: auto; border: 1px solid var(--border-light); border-radius: var(--radius); background: var(--surface); }
.data-table { width: 100%; border-collapse: collapse; font-size: 13px; }
.data-table th { background: var(--surface2); padding: 10px 14px; text-align: left; font-weight: 600; color: var(--text-muted); border-bottom: 1px solid var(--border-light); white-space: nowrap; }
.data-table td { padding: 9px 14px; border-bottom: 1px solid var(--border-light); color: var(--text); white-space: nowrap; }
.data-table tr:last-child td { border-bottom: none; }
.data-table tr:hover td { background: var(--accent-light); }
.qty-low { color: #c0392b; font-weight: 600; }
.low-badge { display: inline-block; margin-left: 6px; font-size: 10px; font-weight: 700; color: #fff; background: #c0392b; border-radius: 4px; padding: 1px 5px; vertical-align: middle; }
.action-cell { display: flex; gap: 6px; }

.pagination-bar { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.page-btn { padding: 6px 14px; background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius-sm); font-size: 13px; cursor: pointer; color: var(--text); }
.page-btn:hover:not(:disabled) { background: var(--accent-light); border-color: var(--accent); color: var(--accent); }
.page-btn:disabled { opacity: 0.4; cursor: not-allowed; }
.page-info { font-size: 13px; color: var(--text-muted); }
.jump-group { display: flex; align-items: center; gap: 4px; font-size: 13px; color: var(--text-muted); }
.jump-input { width: 56px; padding: 5px 6px; font-size: 13px; border: 1px solid var(--border); border-radius: var(--radius-sm); background: var(--surface); color: var(--text); outline: none; text-align: center; }
.page-size-select { padding: 6px 8px; font-size: 13px; border: 1px solid var(--border); border-radius: var(--radius-sm); background: var(--surface); color: var(--text); outline: none; margin-left: auto; }

/* 彈窗共用 */
.modal-overlay { position: fixed; inset: 0; background: rgba(0, 0, 0, 0.45); display: flex; align-items: center; justify-content: center; z-index: 100; padding: 24px; }
.modal-box { background: var(--surface); border-radius: var(--radius); padding: 20px 24px; width: min(480px, 100%); max-height: 85vh; overflow-y: auto; display: flex; flex-direction: column; gap: 14px; }
.modal-header { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.section-title { font-size: 15px; font-weight: 700; color: var(--text); margin: 0; }
.section-hint { font-size: 12px; color: var(--text-hint); margin: 0; line-height: 1.6; }

.form-row { display: flex; flex-direction: column; gap: 4px; }
.form-label { font-size: 12px; color: var(--text-muted); font-weight: 600; }
.form-input { padding: 8px 10px; font-size: 13px; border: 1px solid var(--border); border-radius: var(--radius-sm); background: var(--surface); color: var(--text); outline: none; }
.form-input:focus { border-color: var(--accent); }
.form-input:disabled { opacity: 0.6; }

.section { background: var(--surface); border: 1px solid var(--border-light); border-radius: var(--radius); padding: 16px 18px; display: flex; flex-direction: column; gap: 10px; max-width: 560px; }
.form-actions { display: flex; gap: 8px; padding-top: 4px; }

.tab-switch { display: flex; border: 1px solid var(--border); border-radius: var(--radius-sm); overflow: hidden; width: fit-content; }
.tab-switch-4 { flex-wrap: wrap; width: auto; }
.sw-tab { padding: 6px 16px; font-size: 13px; border: none; background: var(--surface); color: var(--text-muted); cursor: pointer; }
.sw-tab.active { background: var(--accent); color: #fff; }

.modal-actions { display: flex; gap: 8px; justify-content: flex-end; padding-top: 4px; }

/* 進出庫頁籤 */
.io-layout { display: flex; gap: 12px; align-items: flex-start; flex-wrap: wrap; }
.io-left-col { display: flex; flex-direction: column; gap: 12px; flex: 0 1 400px; max-width: 400px; }
.io-cart-col { max-width: none; }
.io-search-col { flex: 1 1 500px; max-width: none; }
.io-category-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(72px, 1fr)); gap: 6px; }
.io-category-btn { padding: 10px 6px; font-size: 13px; font-weight: 600; border: 1px solid #d4c72a; border-radius: var(--radius-sm); background: #fff9c4; color: #5c5220; cursor: pointer; text-align: center; }
.io-category-btn:hover { background: #fff59d; }
.io-category-btn.active { background: #fbc02d; border-color: #f9a825; color: #4a3f00; }
.io-item-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(96px, 1fr)); gap: 6px; max-height: 420px; overflow-y: auto; padding: 2px; }
.io-item-btn { position: relative; padding: 12px 8px; font-size: 12px; line-height: 1.4; border: 1px solid var(--border); border-radius: var(--radius-sm); background: var(--surface); color: var(--text); cursor: pointer; text-align: center; min-height: 56px; }
.io-item-btn:hover { border-color: var(--accent); background: var(--accent-light); }
.io-item-btn.in-cart { border-color: #1e7e34; background: #e6f4ea; }
.io-item-badge { display: block; margin-top: 4px; font-size: 10px; font-weight: 700; color: #1e7e34; }
.io-cart-line { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; padding: 10px 0; border-bottom: 1px solid var(--border-light); }
.io-cart-line:last-of-type { border-bottom: none; }
.io-cart-name { font-size: 13px; font-weight: 600; color: var(--text); min-width: 160px; }
.io-qty-input { width: 100px; }
/* 迷你日曆（進出庫頁籤用） */
.mini-calendar { width: 100%; display: flex; flex-direction: column; gap: 6px; }
.mini-cal-header { display: flex; align-items: center; justify-content: space-between; font-size: 13px; font-weight: 600; color: var(--text); }
.mini-cal-weekdays { display: grid; grid-template-columns: repeat(7, 1fr); text-align: center; font-size: 11px; color: var(--text-hint); }
.mini-cal-days { display: grid; grid-template-columns: repeat(7, 1fr); gap: 2px; }
.mini-cal-day { position: relative; aspect-ratio: 1; border: none; background: transparent; border-radius: var(--radius-sm); font-size: 12px; color: var(--text); cursor: pointer; }
.mini-cal-day:hover:not(:disabled) { background: var(--accent-light); }
.mini-cal-day.empty { visibility: hidden; cursor: default; }
.mini-cal-day.today { border: 1px solid var(--accent); }
.mini-cal-day.selected { background: var(--accent); color: #fff; font-weight: 700; }
.mini-cal-dot { position: absolute; bottom: 3px; left: 50%; transform: translateX(-50%); width: 5px; height: 5px; border-radius: 50%; background: #e53935; }
.mini-cal-day.selected .mini-cal-dot { background: #fff; }
.mini-cal-selected { font-size: 12px; color: var(--text-hint); text-align: center; padding-top: 2px; border-top: 1px solid var(--border-light); }
.mini-cal-dot-hint { color: #e53935; }
</style>
