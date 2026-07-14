<script setup lang="ts">
definePageMeta({ layout: 'staff', requiredPermission: 'pos.analyze.pos-sales' })

// ══════════════════════════════════════════════════════════════════
// 對應後端新增的 Bk35SalesAnalysisController（/holy/bk35sql/sales-analysis/*）
// 三支報表：期間進銷存彙總表、類別銷售統計表、單品明細統計表。
// 後端還沒部署的話這頁三個頁籤都會顯示查詢失敗，屬正常現象，等後端上線即可。
// ══════════════════════════════════════════════════════════════════

interface InventoryRow {
  matNo: string
  matType: string | null
  matName: string
  matUnit: string | null
  beginQty: number
  inQty: number
  transferInQty: number
  transferOutQty: number
  scrapQty: number
  saleQty: number
  endQty: number
  stocktakeQty: number
  orderQty: number
}
interface InventoryResponse {
  rows: InventoryRow[]
  totals: Omit<InventoryRow, 'matNo' | 'matType' | 'matName' | 'matUnit'>
  error?: string
}

interface CategoryItem {
  itemName: string
  qty: number
  amt: number
  staffQty: number
  staffAmt: number
  vipQty: number
  vipAmt: number
  totalQty: number
  totalAmt: number
}
interface CategoryGroup {
  typeNo: number
  typeName: string
  items: CategoryItem[]
  totalQty: number
  totalAmt: number
  sumQty: number
  sumAmt: number
  sumStaffQty: number
  sumStaffAmt: number
  sumVipQty: number
  sumVipAmt: number
}
interface CategoryResponse {
  categories: CategoryGroup[]
  grandTotalQty: number
  grandTotalAmt: number
  tier1TotalQty: number
  tier2TotalQty: number
  tier3TotalQty: number
  error?: string
}

interface DetailTransaction {
  date: string
  shiftName: string | null
  checkNo: string | null
  custTotal: number | null
  tblName: string | null
  itemName: string
  vipNote: string | null
  qty: number
  amt: number
}
interface DetailGroup {
  itemName: string
  transactions: DetailTransaction[]
  totalQty: number
  totalAmt: number
}
interface DetailResponse {
  groups: DetailGroup[]
  grandTotalQty: number
  grandTotalAmt: number
  error?: string
}

const commonStore = useCommonStore()
const apiBase = computed(() => commonStore.data.main_url)
const { bksqlAttached: dbAttached, checkStatus } = useBk35DbStatus()

function formatMoney(n: number | null | undefined) {
  if (n === null || n === undefined || isNaN(n)) return '0'
  return Number(n).toLocaleString(undefined, { maximumFractionDigits: 0 })
}
function formatQty(n: number | null | undefined) {
  if (n === null || n === undefined || isNaN(n)) return '0'
  return Number(n).toLocaleString(undefined, { maximumFractionDigits: 2 })
}

function todayStr() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
function firstOfMonthStr() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`
}
function openDatePicker(e: Event) {
  const el = e.target as HTMLInputElement & { showPicker?: () => void }
  el.showPicker?.()
}

// 快速選月：因為這幾張報表大部分時候都是抓「一整個月」，這個下拉會把
// 起訖日期直接改成該月第一天到最後一天，仍然共用同一組 dateFrom/dateTo，
// 使用者要自訂區間的話，改用日期欄位就好，不會互相打架。
function currentMonthStr() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}
const quickMonth = ref(currentMonthStr())

function applyQuickMonth() {
  const [y, m] = quickMonth.value.split('-').map(Number)
  const lastDay = new Date(y, m, 0).getDate()
  dateFrom.value = `${y}-${String(m).padStart(2, '0')}-01`
  dateTo.value = `${y}-${String(m).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`
  runAll()
}

function shiftQuickMonth(delta: number) {
  const [y, m] = quickMonth.value.split('-').map(Number)
  const d = new Date(y, m - 1 + delta, 1)
  quickMonth.value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
  applyQuickMonth()
}

const tab = ref<'inventory' | 'category' | 'detail'>('inventory')
const dateFrom = ref(firstOfMonthStr())
const dateTo = ref(todayStr())

// POSID 對照（業主已確認）：001=小舖、002=餐廳、003=市集。
// 只影響「類別銷售統計表」「單品明細統計表」（查 ORDERI/OCHECK）；
// 「期間進銷存彙總表」查 MATIO，沒有 POSID 欄位，不受此篩選影響。
const POSID_OPTIONS = [
  { value: '', label: '全部賣場' },
  { value: '002', label: '餐廳（002）' },
  { value: '001', label: '小舖（001）' },
  { value: '003', label: '市集（003）' }
]
const posId = ref('')

function switchTab(t: 'inventory' | 'category' | 'detail') {
  tab.value = t
  if (t === 'inventory' && !inventoryRows.value.length) runInventory()
  if (t === 'category' && !categoryGroups.value.length) runCategory()
  if (t === 'detail' && !detailGroups.value.length) runDetail()
}

function runAll() {
  if (tab.value === 'inventory') runInventory()
  else if (tab.value === 'category') runCategory()
  else runDetail()
}

// ══════════════════ ① 期間進銷存彙總表 ══════════════════

const invSearch = ref('')
const inventoryRows = ref<InventoryRow[]>([])
const inventoryTotals = ref<InventoryResponse['totals'] | null>(null)
const invLoading = ref(false)
const invError = ref('')

async function runInventory() {
  if (dbAttached.value === false) return
  invLoading.value = true
  invError.value = ''
  try {
    const res = await $fetch<InventoryResponse>(
      `${apiBase.value}/holy/bk35sql/sales-analysis/inventory-summary`,
      { credentials: 'include', query: { dateFrom: dateFrom.value, dateTo: dateTo.value, search: invSearch.value } }
    )
    if (res?.error) {
      invError.value = res.error
      inventoryRows.value = []
      inventoryTotals.value = null
    } else {
      inventoryRows.value = res?.rows ?? []
      inventoryTotals.value = res?.totals ?? null
    }
  } catch (e: any) {
    invError.value = e?.message ?? '載入失敗'
  } finally {
    invLoading.value = false
  }
}

function slashDate(d: string) {
  return d ? d.replaceAll('-', '/') : d
}
function posIdLabel() {
  const found = POSID_OPTIONS.find(o => o.value === posId.value)
  return found && found.value ? found.label : ''
}
// 對應原始報表的金額欄位格式：千分位逗號、含逗號時要加引號避免被 CSV 拆欄；
// 該欄位對應的數量為 0 時顯示空白（原始報表的慣例），數量非 0 才顯示金額（即使金額剛好是 0）。
function csvAmtCell(amt: number, qty: number) {
  if (!qty) return ''
  const s = Math.round(amt).toLocaleString()
  return s.includes(',') ? `"${s}"` : s
}
function csvTotalAmtCell(amt: number) {
  const s = Math.round(amt).toLocaleString()
  return s.includes(',') ? `"${s}"` : s
}

function exportInventoryCsv() {
  if (!inventoryRows.value.length) return
  const headers = ['物料名稱', '期初量', '入庫', '轉入', '轉出', '損耗', '銷售', '庫存量', '盤盈虧', '訂貨']
  const lines = [
    '期間進銷存彙總表',
    `列印期間:${slashDate(dateFrom.value)} - ${slashDate(dateTo.value)}`,
    headers.join(',')
  ]
  for (const r of inventoryRows.value) {
    lines.push([r.matName, r.beginQty, r.inQty, r.transferInQty, r.transferOutQty, r.scrapQty, r.saleQty, r.endQty, r.stocktakeQty, r.orderQty].join(','))
  }
  if (inventoryTotals.value) {
    const t = inventoryTotals.value
    lines.push(['合計', t.beginQty, t.inQty, t.transferInQty, t.transferOutQty, t.scrapQty, t.saleQty, t.endQty, t.stocktakeQty, t.orderQty].join(','))
  }
  downloadCsv(lines, `期間進銷存彙總表_${dateFrom.value}_${dateTo.value}.csv`)
}

// ══════════════════ ② 類別銷售統計表 ══════════════════

const categoryGroups = ref<CategoryGroup[]>([])
const grandTotalQty = ref(0)
const grandTotalAmt = ref(0)
const tier1TotalQty = ref(0)
const tier2TotalQty = ref(0)
const tier3TotalQty = ref(0)
const catLoading = ref(false)
const catError = ref('')

async function runCategory() {
  if (dbAttached.value === false) return
  catLoading.value = true
  catError.value = ''
  try {
    const res = await $fetch<CategoryResponse>(
      `${apiBase.value}/holy/bk35sql/sales-analysis/category-sales`,
      { credentials: 'include', query: { dateFrom: dateFrom.value, dateTo: dateTo.value, posId: posId.value || undefined } }
    )
    if (res?.error) {
      catError.value = res.error
      categoryGroups.value = []
    } else {
      categoryGroups.value = res?.categories ?? []
      grandTotalQty.value = res?.grandTotalQty ?? 0
      grandTotalAmt.value = res?.grandTotalAmt ?? 0
      tier1TotalQty.value = res?.tier1TotalQty ?? 0
      tier2TotalQty.value = res?.tier2TotalQty ?? 0
      tier3TotalQty.value = res?.tier3TotalQty ?? 0
    }
  } catch (e: any) {
    catError.value = e?.message ?? '載入失敗'
  } finally {
    catLoading.value = false
  }
}

function exportCategoryCsv() {
  if (!categoryGroups.value.length) return
  const headers = ['菜  式 名 稱', '數量', '金額', '員工', '金額(2)', '9折貴賓', '金額(3)', '本項數', '本項金額']
  const lines = [
    '類別銷售統計表' + (posIdLabel() ? `（${posIdLabel()}）` : ''),
    `統計日期: ${slashDate(dateFrom.value)} 至 ${slashDate(dateTo.value)}`
  ]
  for (const g of categoryGroups.value) {
    lines.push(`類　別: ${g.typeName}`)
    lines.push(headers.join(','))
    for (const it of g.items) {
      lines.push([
        it.itemName,
        it.qty,
        csvAmtCell(it.amt, it.qty),
        it.staffQty,
        csvAmtCell(it.staffAmt, it.staffQty),
        it.vipQty,
        csvAmtCell(it.vipAmt, it.vipQty),
        it.totalQty,
        csvTotalAmtCell(it.totalAmt)
      ].join(','))
    }
    lines.push([
      '　　　　合　計:',
      g.sumQty, g.sumAmt, g.sumStaffQty, g.sumStaffAmt, g.sumVipQty, g.sumVipAmt, g.totalQty, ''
    ].join(','))
    lines.push([
      '', '', '', '', '', '', '', '總計', csvTotalAmtCell(g.totalAmt)
    ].join(','))
  }
  lines.push(`價別1總數量: ${tier1TotalQty.value.toLocaleString()}`)
  lines.push(`價別2總數量: ${tier2TotalQty.value.toLocaleString()}`)
  lines.push(`價別3總數量: ${tier3TotalQty.value.toLocaleString()}`)
  lines.push(`總計數量: ${grandTotalQty.value.toLocaleString()}　總計金額: ${grandTotalAmt.value.toLocaleString()}`)
  downloadCsv(lines, `類別銷售統計表_${dateFrom.value}_${dateTo.value}.csv`)
}

// ══════════════════ ③ 單品明細統計表 ══════════════════
// 這張主要是印出來看的，所以不分頁：一次抓整個期間，依品項分組。

const detailSearch = ref('')
const detailGroups = ref<DetailGroup[]>([])
const detailGrandQty = ref(0)
const detailGrandAmt = ref(0)
const detailLoading = ref(false)
const detailError = ref('')

async function runDetail() {
  if (dbAttached.value === false) return
  detailLoading.value = true
  detailError.value = ''
  try {
    const res = await $fetch<DetailResponse>(
      `${apiBase.value}/holy/bk35sql/sales-analysis/item-detail`,
      { credentials: 'include', query: { dateFrom: dateFrom.value, dateTo: dateTo.value, search: detailSearch.value, posId: posId.value || undefined } }
    )
    if (res?.error) {
      detailError.value = res.error
      detailGroups.value = []
    } else {
      detailGroups.value = res?.groups ?? []
      detailGrandQty.value = res?.grandTotalQty ?? 0
      detailGrandAmt.value = res?.grandTotalAmt ?? 0
    }
  } catch (e: any) {
    detailError.value = e?.message ?? '載入失敗'
  } finally {
    detailLoading.value = false
  }
}

function formatDate(d: string) {
  if (!d) return '-'
  const dt = new Date(d)
  if (isNaN(dt.getTime())) return d
  return `${dt.getMonth() + 1}/${dt.getDate()}`
}

function exportDetailCsv() {
  if (!detailGroups.value.length) return
  const headers = ['日期', '班別', '帳單號', '客數', '桌號', '項目', '備註(VIP)', '數量', '金額']
  const lines = [
    '單品明細統計表' + (posIdLabel() ? `（${posIdLabel()}）` : ''),
    `營業期間: ${slashDate(dateFrom.value)} 至 ${slashDate(dateTo.value)}`
  ]
  for (const g of detailGroups.value) {
    lines.push(headers.join(','))
    for (const t of g.transactions) {
      lines.push([formatDate(t.date), t.shiftName ?? '', t.checkNo ?? '', t.custTotal ?? '', t.tblName ?? '', t.itemName, t.vipNote ?? '', t.qty, t.amt].join(','))
    }
    lines.push(['', '', '', '', '', `  ${g.itemName}`, '合計', g.totalQty, g.totalAmt].join(','))
    lines.push('')
  }
  lines.push(`總計數量: ${detailGrandQty.value.toLocaleString()}　總計金額: ${detailGrandAmt.value.toLocaleString()}`)
  downloadCsv(lines, `單品明細統計表_${dateFrom.value}_${dateTo.value}.csv`)
}

function printDetail() {
  window.print()
}

function downloadCsv(lines: string[], filename: string) {
  const blob = new Blob(['\uFEFF' + lines.join('\n')], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

onMounted(async () => {
  await checkStatus()
  runInventory()
})
</script>

<template>
  <div class="page-wrap">
    <div class="page-header no-print">
      <h1 class="page-title">銷售分析</h1>
      <div class="tab-switch">
        <button :class="['sw-tab', { active: tab === 'inventory' }]" @click="switchTab('inventory')">期間進銷存彙總表</button>
        <button :class="['sw-tab', { active: tab === 'category' }]" @click="switchTab('category')">類別銷售統計表</button>
        <button :class="['sw-tab', { active: tab === 'detail' }]" @click="switchTab('detail')">單品明細統計表</button>
      </div>
    </div>

    <div v-if="dbAttached === false" class="paused-banner no-print">
      ⏸ 資料庫目前已暫停（Detach），查詢功能暫時無法使用，請聯繫管理員開啟資料庫後再試。
    </div>

    <div class="section filter-section no-print">
      <div class="filter-bar">
        <label class="inline-label">
          <span class="form-label">快速選月</span>
          <button class="month-nav-btn" title="上個月" @click="shiftQuickMonth(-1)">‹</button>
          <input v-model="quickMonth" type="month" class="date-input" @change="applyQuickMonth">
          <button class="month-nav-btn" title="下個月" @click="shiftQuickMonth(1)">›</button>
        </label>

        <span class="filter-divider"></span>

        <label class="inline-label">
          <span class="form-label">起</span>
          <input v-model="dateFrom" type="date" class="date-input" @click="openDatePicker">
        </label>
        <label class="inline-label">
          <span class="form-label">迄</span>
          <input v-model="dateTo" type="date" class="date-input" @click="openDatePicker">
        </label>

        <label v-if="tab === 'category' || tab === 'detail'" class="inline-label">
          <span class="form-label">賣場</span>
          <select v-model="posId" class="date-input">
            <option v-for="o in POSID_OPTIONS" :key="o.value" :value="o.value">{{ o.label }}</option>
          </select>
        </label>

        <input
          v-if="tab === 'inventory'"
          v-model="invSearch"
          class="search-input"
          placeholder="搜尋物料名稱／料號／分類"
          @keyup.enter="runInventory"
        >
        <input
          v-if="tab === 'detail'"
          v-model="detailSearch"
          class="search-input"
          placeholder="搜尋品項名稱（可留空查全部）"
          @keyup.enter="runDetail"
        >

        <button class="btn-primary" @click="runAll">查詢</button>
      </div>
    </div>

    <!-- ══════════════════ ① 期間進銷存彙總表 ══════════════════ -->
    <template v-if="tab === 'inventory'">
      <div class="section-actions">
        <button class="btn-ghost small" :disabled="!inventoryRows.length" @click="exportInventoryCsv">匯出 CSV</button>
      </div>
      <p v-if="invLoading" class="loading">查詢中…</p>
      <p v-else-if="invError" class="error-box">{{ invError }}</p>

      <div v-else-if="inventoryRows.length" class="table-wrap">
        <table class="report-table">
          <thead>
          <tr>
            <th>物料名稱</th>
            <th class="num-cell">期初量</th>
            <th class="num-cell">入庫</th>
            <th class="num-cell">轉入</th>
            <th class="num-cell">轉出</th>
            <th class="num-cell">損耗</th>
            <th class="num-cell">銷售</th>
            <th class="num-cell">庫存量</th>
            <th class="num-cell">盤盈虧</th>
            <th class="num-cell">訂貨</th>
          </tr>
          </thead>
          <tbody>
          <tr v-for="r in inventoryRows" :key="r.matNo">
            <td>{{ r.matName }}</td>
            <td class="num-cell">{{ formatQty(r.beginQty) }}</td>
            <td class="num-cell">{{ formatQty(r.inQty) }}</td>
            <td class="num-cell">{{ formatQty(r.transferInQty) }}</td>
            <td class="num-cell">{{ formatQty(r.transferOutQty) }}</td>
            <td class="num-cell">{{ formatQty(r.scrapQty) }}</td>
            <td class="num-cell">{{ formatQty(r.saleQty) }}</td>
            <td class="num-cell total-cell">{{ formatQty(r.endQty) }}</td>
            <td class="num-cell">{{ formatQty(r.stocktakeQty) }}</td>
            <td class="num-cell">{{ formatQty(r.orderQty) }}</td>
          </tr>
          </tbody>
          <tfoot v-if="inventoryTotals">
          <tr class="totals-row">
            <td>合計</td>
            <td class="num-cell">{{ formatQty(inventoryTotals.beginQty) }}</td>
            <td class="num-cell">{{ formatQty(inventoryTotals.inQty) }}</td>
            <td class="num-cell">{{ formatQty(inventoryTotals.transferInQty) }}</td>
            <td class="num-cell">{{ formatQty(inventoryTotals.transferOutQty) }}</td>
            <td class="num-cell">{{ formatQty(inventoryTotals.scrapQty) }}</td>
            <td class="num-cell">{{ formatQty(inventoryTotals.saleQty) }}</td>
            <td class="num-cell total-cell">{{ formatQty(inventoryTotals.endQty) }}</td>
            <td class="num-cell">{{ formatQty(inventoryTotals.stocktakeQty) }}</td>
            <td class="num-cell">{{ formatQty(inventoryTotals.orderQty) }}</td>
          </tr>
          </tfoot>
        </table>
      </div>
      <p v-else class="empty-hint">請設定期間後按「查詢」</p>
    </template>

    <!-- ══════════════════ ② 類別銷售統計表 ══════════════════ -->
    <template v-if="tab === 'category'">
      <div class="section-actions">
        <span class="total-hint">總數量 {{ formatQty(grandTotalQty) }}　總金額 ${{ formatMoney(grandTotalAmt) }}</span>
        <button class="btn-ghost small" :disabled="!categoryGroups.length" @click="exportCategoryCsv">匯出 CSV</button>
      </div>
      <p v-if="catLoading" class="loading">查詢中…</p>
      <p v-else-if="catError" class="error-box">{{ catError }}</p>

      <div v-else-if="categoryGroups.length" class="category-groups">
        <div v-for="g in categoryGroups" :key="g.typeNo" class="table-wrap category-block">
          <div class="category-heading">類　別：{{ g.typeName }}</div>
          <table class="report-table">
            <thead>
            <tr>
              <th>菜式名稱</th>
              <th class="num-cell">數量</th>
              <th class="num-cell">金額</th>
              <th class="num-cell">員工</th>
              <th class="num-cell">金額(2)</th>
              <th class="num-cell">9折貴賓</th>
              <th class="num-cell">金額(3)</th>
              <th class="num-cell">本項數</th>
              <th class="num-cell">本項金額</th>
            </tr>
            </thead>
            <tbody>
            <tr v-for="it in g.items" :key="it.itemName">
              <td>{{ it.itemName }}</td>
              <td class="num-cell">{{ formatQty(it.qty) }}</td>
              <td class="num-cell">{{ formatMoney(it.amt) }}</td>
              <td class="num-cell">{{ formatQty(it.staffQty) }}</td>
              <td class="num-cell">{{ formatMoney(it.staffAmt) }}</td>
              <td class="num-cell">{{ formatQty(it.vipQty) }}</td>
              <td class="num-cell">{{ formatMoney(it.vipAmt) }}</td>
              <td class="num-cell total-cell">{{ formatQty(it.totalQty) }}</td>
              <td class="num-cell total-cell">{{ formatMoney(it.totalAmt) }}</td>
            </tr>
            </tbody>
            <tfoot>
            <tr class="totals-row">
              <td>合　計:</td>
              <td class="num-cell">{{ formatQty(g.sumQty) }}</td>
              <td class="num-cell">{{ formatMoney(g.sumAmt) }}</td>
              <td class="num-cell">{{ formatQty(g.sumStaffQty) }}</td>
              <td class="num-cell">{{ formatMoney(g.sumStaffAmt) }}</td>
              <td class="num-cell">{{ formatQty(g.sumVipQty) }}</td>
              <td class="num-cell">{{ formatMoney(g.sumVipAmt) }}</td>
              <td class="num-cell">{{ formatQty(g.totalQty) }}</td>
              <td></td>
            </tr>
            <tr class="totals-row">
              <td colspan="7"></td>
              <td class="num-cell">總計</td>
              <td class="num-cell total-cell">{{ formatMoney(g.totalAmt) }}</td>
            </tr>
            </tfoot>
          </table>
        </div>
        <div class="tier-footer">
          <span>價別1總數量: {{ formatQty(tier1TotalQty) }}</span>
          <span>價別2總數量: {{ formatQty(tier2TotalQty) }}</span>
          <span>價別3總數量: {{ formatQty(tier3TotalQty) }}</span>
        </div>
      </div>
      <p v-else class="empty-hint">請設定期間後按「查詢」</p>
    </template>
    <template v-if="tab === 'detail'">
      <div class="section-actions no-print">
        <span class="total-hint">共 {{ detailGroups.length }} 個品項　總數量 {{ formatQty(detailGrandQty) }}　總金額 ${{ formatMoney(detailGrandAmt) }}</span>
        <div class="btn-group">
          <button class="btn-ghost small" :disabled="!detailGroups.length" @click="printDetail">列印</button>
          <button class="btn-ghost small" :disabled="!detailGroups.length" @click="exportDetailCsv">匯出 CSV</button>
        </div>
      </div>
      <p v-if="detailLoading" class="loading no-print">查詢中，這張報表資料量較大，可能要等一下…</p>
      <p v-else-if="detailError" class="error-box no-print">{{ detailError }}</p>

      <div v-else-if="detailGroups.length" class="table-wrap print-area">
        <table class="report-table detail-table">
          <thead>
          <tr>
            <th>日期</th>
            <th>班別</th>
            <th>帳單號</th>
            <th class="num-cell">客數</th>
            <th>桌號</th>
            <th>項目</th>
            <th>備註(VIP)</th>
            <th class="num-cell">數量</th>
            <th class="num-cell">金額</th>
          </tr>
          </thead>
          <tbody>
          <template v-for="g in detailGroups" :key="g.itemName">
            <tr v-for="(t, i) in g.transactions" :key="g.itemName + '-' + i">
              <td>{{ formatDate(t.date) }}</td>
              <td>{{ t.shiftName || '' }}</td>
              <td>{{ t.checkNo || '' }}</td>
              <td class="num-cell">{{ t.custTotal ?? '' }}</td>
              <td>{{ t.tblName || '' }}</td>
              <td>{{ t.itemName }}</td>
              <td>{{ t.vipNote || '' }}</td>
              <td class="num-cell">{{ formatQty(t.qty) }}</td>
              <td class="num-cell">{{ formatMoney(t.amt) }}</td>
            </tr>
            <tr class="totals-row group-subtotal">
              <td colspan="5"></td>
              <td>{{ g.itemName }}</td>
              <td>合計</td>
              <td class="num-cell">{{ formatQty(g.totalQty) }}</td>
              <td class="num-cell total-cell">{{ formatMoney(g.totalAmt) }}</td>
            </tr>
          </template>
          </tbody>
        </table>
      </div>
      <p v-else class="empty-hint">請設定期間後按「查詢」</p>
    </template>
  </div>
</template>

<style scoped>
.page-wrap { padding: 20px; display: flex; flex-direction: column; gap: 12px; }
.page-header { display: flex; align-items: center; gap: 16px; flex-wrap: wrap; justify-content: space-between; }
.page-title { font-size: 20px; font-weight: 700; color: var(--text); margin: 0; }

.tab-switch { display: flex; border: 1px solid var(--border); border-radius: var(--radius-sm); overflow: hidden; flex-wrap: wrap; }
.sw-tab { padding: 7px 16px; font-size: 13px; border: none; background: var(--surface); color: var(--text-muted); cursor: pointer; white-space: nowrap; }
.sw-tab.active { background: var(--accent); color: #fff; }

.paused-banner { font-size: 13px; color: #92400e; background: #fef3c7; border: 1px solid #fde68a; border-radius: var(--radius-sm); padding: 12px 16px; }

.section { background: var(--surface); border: 1px solid var(--border-light); border-radius: var(--radius); padding: 14px 16px; }
.filter-section { padding: 12px 16px; }
.filter-bar { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; }
.filter-divider { width: 1px; align-self: stretch; background: var(--border-light); margin: 0 2px; }
.month-nav-btn { width: 26px; height: 30px; border: 1px solid var(--border); border-radius: var(--radius-sm); background: var(--surface); color: var(--text-muted); cursor: pointer; font-size: 14px; line-height: 1; }
.month-nav-btn:hover { background: var(--accent-light); border-color: var(--accent); color: var(--accent); }
.inline-label { display: flex; align-items: center; gap: 6px; }
.form-label { font-size: 12px; color: var(--text-muted); font-weight: 600; }
.date-input { padding: 6px 8px; font-size: 13px; border: 1px solid var(--border); border-radius: var(--radius-sm); background: var(--surface); color: var(--text); outline: none; }
.search-input { width: 220px; padding: 7px 12px; font-size: 13px; border: 1px solid var(--border); border-radius: var(--radius-sm); background: var(--surface); color: var(--text); outline: none; }
.search-input:focus, .date-input:focus { border-color: var(--accent); }

.btn-primary { padding: 7px 16px; background: var(--accent); color: #fff; border: none; border-radius: var(--radius-sm); font-size: 13px; cursor: pointer; }
.btn-ghost { padding: 7px 12px; background: transparent; color: var(--text-muted); border: 1px solid var(--border); border-radius: var(--radius-sm); font-size: 13px; cursor: pointer; }
.btn-ghost:disabled { opacity: 0.5; cursor: not-allowed; }
.btn-ghost.small { padding: 4px 10px; font-size: 12px; }

.section-actions { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.total-hint { font-size: 13px; color: var(--text-hint); }

.loading { color: var(--text-hint); font-size: 13px; margin: 8px 0; }
.error-box { color: #c0392b; font-size: 13px; background: #fdecea; border: 1px solid #f5c6cb; border-radius: var(--radius-sm); padding: 10px 14px; margin: 0; }
.empty-hint { color: var(--text-hint); font-size: 13px; padding: 24px 0; text-align: center; }

.table-wrap { display: inline-block; max-width: 100%; overflow-x: auto; border: 1px solid var(--border-light); border-radius: var(--radius); background: var(--surface); vertical-align: top; align-self: flex-start; }
.report-table { width: auto; border-collapse: collapse; font-size: 13px; }
.report-table th { background: var(--surface2); padding: 9px 16px; text-align: left; font-weight: 600; color: var(--text-muted); border-bottom: 1px solid var(--border-light); white-space: nowrap; }
.report-table td { padding: 8px 16px; border-bottom: 1px solid var(--border-light); color: var(--text); white-space: nowrap; }
.report-table tr:last-child td { border-bottom: none; }
.report-table tr:hover td { background: var(--accent-light); }
.num-cell { text-align: right; font-variant-numeric: tabular-nums; min-width: 90px; }
.total-cell { font-weight: 700; color: var(--accent); }
.totals-row td { font-weight: 700; background: var(--surface2); border-top: 2px solid var(--border); }

.category-groups { display: flex; flex-direction: column; gap: 14px; }
.category-block { padding-top: 0; }
.category-heading { font-size: 14px; font-weight: 700; color: var(--text); background: var(--surface2); padding: 8px 14px; border-bottom: 1px solid var(--border-light); }
.tier-footer { display: flex; gap: 20px; flex-wrap: wrap; font-size: 13px; color: var(--text-muted); padding: 4px 4px; }

.pagination { display: flex; align-items: center; gap: 12px; justify-content: center; }
.page-btn { padding: 6px 14px; background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius-sm); font-size: 13px; cursor: pointer; color: var(--text); }
.page-btn:hover:not(:disabled) { background: var(--accent-light); border-color: var(--accent); color: var(--accent); }
.page-btn:disabled { opacity: 0.4; cursor: not-allowed; }
.page-info { font-size: 13px; color: var(--text-muted); }

.btn-group { display: flex; gap: 8px; }
.group-subtotal td { font-weight: 700; background: var(--surface2); }

/* 單品明細統計表主要是印出來看的：列印時只留報表本身，其餘操作介面都隱藏，
   表頭用 thead { display: table-header-group } 讓瀏覽器每頁自動重複表頭。 */
@media print {
  .no-print { display: none !important; }
  .page-wrap { padding: 0; }
  .print-area { border: none; }
  .detail-table thead { display: table-header-group; }
  .detail-table tr { break-inside: avoid; }
}
</style>
