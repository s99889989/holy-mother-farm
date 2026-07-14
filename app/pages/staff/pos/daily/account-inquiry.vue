<script setup lang="ts">
definePageMeta({ layout: 'staff', requiredPermission: 'pos.account-inquiry' })

interface DataResponse {
  columns: string[]
  rows: Record<string, any>[]
  total: number
  page: number
  pageSize: number
  totalPages: number
  error?: string
}

interface InvoiceCol {
  key: string
  label: string
  type?: 'date' | 'datetime' | 'money'
}

// 對照 dbo.INVOICE 實際欄位（來自 SSMS 截圖）
const invoiceColumns: InvoiceCol[] = [
  { key: 'RNo', label: '序號' },
  { key: 'DelMark', label: '作廢' },
  { key: 'InvNo', label: '發票號碼' },
  { key: 'BNo', label: '客戶統編' },
  { key: 'CheckNo', label: '帳單號' },
  { key: 'InvMonth', label: '發票月份' },
  { key: 'InvDate', label: '發票日期', type: 'date' },
  { key: 'InvType', label: '類別' },
  { key: 'OPDate', label: '營業日期', type: 'date' },
  { key: 'SCharge', label: '服務費', type: 'money' },
  { key: 'InvAmt', label: '發票金額', type: 'money' },
  { key: 'UserID', label: '作業人員' },
  { key: 'Remark', label: '備註說明' },
  { key: 'CardType', label: '卡別' },
  { key: 'POSID', label: 'POSID' },
  { key: 'FileDate', label: '建檔時間', type: 'datetime' }
]

// 帳單瀏覽欄位中文對照表 —— 已依實際 BKSQL schema（dbo.OCHECK）確認欄位名稱，非猜測。
// 依 卡爾 指定的欄位清單與順序精簡顯示，只保留下面這些欄位：
// 營業日期、帳單號碼、結帳時間、小計、結帳金額、現金、付款別、客戶編號、會員編號、
// 付款金額1~4（實際意義分別是信用卡/宅配代收/宅配匯款/機關簽帳）、作業人員、POSID、備註說明、建檔時間、更修時間。
interface CheckColMeta {
  label: string
  type?: 'date' | 'datetime' | 'money' | 'posid'
}
const CHECK_COLUMN_META: Record<string, CheckColMeta> = {
  OPDate: { label: '營業日期', type: 'date' },
  CheckNo: { label: '帳單號碼' },
  BillTime: { label: '結帳時間' },
  OrderAmt: { label: '小計', type: 'money' },
  CheckAmt: { label: '結帳金額', type: 'money' },
  CashAmt: { label: '現金', type: 'money' },
  PayType: { label: '付款別' },
  CustNo: { label: '客戶編號' },
  VIPNo: { label: '會員編號' },
  PayAmt1: { label: '信用卡', type: 'money' },
  PayAmt2: { label: '宅配代收', type: 'money' },
  PayAmt3: { label: '宅配匯款', type: 'money' },
  PayAmt4: { label: '機關簽帳', type: 'money' },
  UserID: { label: '作業人員' },
  POSID: { label: 'POSID', type: 'posid' },
  Remark: { label: '備註說明' },
  FileDate: { label: '建檔時間', type: 'datetime' },
  UpdDate: { label: '更修時間', type: 'datetime' }
}

// POSID 對照的店別名稱
const POSID_LABELS: Record<string, string> = {
  '001': '小舖',
  '002': '餐廳',
  '003': '市集'
}
const CHECK_COLUMN_ORDER = Object.keys(CHECK_COLUMN_META)

// 只顯示 CHECK_COLUMN_META 對照表中有定義、且後端真的有回傳的欄位，並依對照表的順序排列
// （不再 fallback 顯示未列在對照表中的原始欄位，讓畫面比照舊系統精簡呈現）
const displayCheckColumns = computed(() => {
  return CHECK_COLUMN_ORDER.filter(key => columns.value.includes(key))
})

function checkColLabel(key: string) {
  return CHECK_COLUMN_META[key]?.label ?? key
}

function formatCheckCell(row: Record<string, any>, key: string) {
  const raw = row[key]
  if (raw === null || raw === undefined || raw === '') return '-'
  const type = CHECK_COLUMN_META[key]?.type
  if (type === 'date') {
    const d = new Date(raw)
    if (isNaN(d.getTime())) return raw
    return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`
  }
  if (type === 'datetime') {
    const d = new Date(raw)
    if (isNaN(d.getTime())) return raw
    return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')} `
      + `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`
  }
  if (type === 'money') {
    const n = Number(raw)
    return isNaN(n) ? raw : n.toLocaleString()
  }
  if (type === 'posid') {
    const name = POSID_LABELS[String(raw)]
    return name ? `${raw} ${name}` : raw
  }
  return raw
}

const commonStore = useCommonStore()
const apiBase = computed(() => commonStore.data.main_url)

// BKSQL 資料庫裡的表：發票資料 -> INVOICE，帳單瀏覽 -> OCHECK（已依實際 schema 確認，非 M_CHECK）
const TABLE_MAP: Record<string, string> = {
  invoice: 'INVOICE',
  check: 'OCHECK'
}

// 各頁籤用來做時段篩選、也用來做預設排序依據的日期欄位
// （後端 /holy/bk35sql/data/:table 已支援 dateColumn + dateFrom/dateTo + sortOrder，見 Bk35SqlServerController）
const DATE_COLUMN_MAP: Record<string, string> = {
  invoice: 'InvDate',
  check: 'OPDate'
}

// 帳單瀏覽為預設頁籤
const view = ref<'invoice' | 'check'>('check')
const search = ref('')
const page = ref(1)
const totalPages = ref(1)
const total = ref(0)
const columns = ref<string[]>([])
const rows = ref<Record<string, any>[]>([])
const loading = ref(false)
const error = ref('')

// 時段篩選（依 InvDate / OPDate 或後端對應的主要日期欄位）
const dateFrom = ref('')
const dateTo = ref('')

// 排序方向：預設 desc（新增資料顯示在最前面）。直接交給後端的 sortOrder 參數處理，
// 後端會依 DATE_COLUMN_MAP 對應的日期欄位（找不到就退回該表第一欄）做 ROW_NUMBER() 排序分頁。
const sortOrder = ref<'desc' | 'asc'>('desc')

// 跳頁輸入（頁首快速跳頁用）
const pageJumpInput = ref('')

// 資料庫暫停/開啟狀態（跨頁面共用快取，見 composables/useBk35DbStatus.ts）
const { bksqlAttached: dbAttached, checkStatus } = useBk35DbStatus()

async function recheckStatus() {
  await checkStatus(true)
  if (dbAttached.value !== false) {
    fetchData(1)
  }
}

async function fetchServerPage(serverPage: number): Promise<DataResponse> {
  return await $fetch<DataResponse>(
    `${apiBase.value}/holy/bk35sql/data/${TABLE_MAP[view.value]}`,
    {
      credentials: 'include',
      query: {
        db: 'BKSQL',
        page: serverPage,
        search: search.value,
        dateColumn: DATE_COLUMN_MAP[view.value],
        dateFrom: dateFrom.value || undefined,
        dateTo: dateTo.value || undefined,
        sortOrder: sortOrder.value
      }
    }
  )
}

async function fetchData(uiPage: number) {
  if (dbAttached.value === false) {
    // 資料庫已暫停，不用實際打 API 等它逾時，畫面上會顯示暫停 banner
    return
  }
  loading.value = true
  error.value = ''
  page.value = uiPage
  try {
    const res = await fetchServerPage(uiPage)

    if (res?.error) {
      error.value = res.error
      columns.value = []
      rows.value = []
      total.value = 0
      totalPages.value = 1
    } else {
      columns.value = res?.columns ?? []
      rows.value = res?.rows ?? []
      total.value = res?.total ?? 0
      totalPages.value = res?.totalPages ?? 1
      if (page.value > totalPages.value) page.value = totalPages.value
    }
  } catch (e: any) {
    error.value = e?.message ?? '載入資料失敗'
  } finally {
    loading.value = false
  }
}

function switchView(v: 'invoice' | 'check') {
  view.value = v
  search.value = ''
  fetchData(1)
}

function resetSearch() {
  search.value = ''
  dateFrom.value = ''
  dateTo.value = ''
  sortOrder.value = 'desc'
  fetchData(1)
}

function toggleSortOrder() {
  sortOrder.value = sortOrder.value === 'desc' ? 'asc' : 'desc'
  fetchData(1)
}

function goFirstPage() {
  if (page.value !== 1) fetchData(1)
}

function goLastPage() {
  if (page.value !== totalPages.value) fetchData(totalPages.value)
}

function jumpToPage() {
  const p = parseInt(pageJumpInput.value, 10)
  if (!isNaN(p) && p >= 1 && p <= totalPages.value && p !== page.value) {
    fetchData(p)
  }
  pageJumpInput.value = ''
}

function formatInvoiceCell(row: Record<string, any>, col: InvoiceCol) {
  const raw = row[col.key]
  if (raw === null || raw === undefined || raw === '') return '-'

  if (col.type === 'date') {
    const d = new Date(raw)
    if (isNaN(d.getTime())) return raw
    return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`
  }
  if (col.type === 'datetime') {
    const d = new Date(raw)
    if (isNaN(d.getTime())) return raw
    return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')} `
      + `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`
  }
  if (col.type === 'money') {
    const n = Number(raw)
    return isNaN(n) ? raw : n.toLocaleString()
  }
  return raw
}

await checkStatus()
await fetchData(1)
</script>

<template>
  <div class="page-wrap">
    <div class="page-header">
      <h1 class="page-title">
        帳務查詢
      </h1>
      <div class="tab-switch">
        <button
          :class="['sw-tab', { active: view === 'check' }]"
          @click="switchView('check')"
        >
          帳單瀏覽
        </button>
        <button
          :class="['sw-tab', { active: view === 'invoice' }]"
          @click="switchView('invoice')"
        >
          發票資料
        </button>
      </div>
    </div>

    <div
      v-if="dbAttached === false"
      class="paused-banner"
    >
      ⏸ 資料庫目前已暫停（Detach），查詢功能暫時無法使用，請聯繫管理員開啟資料庫後再試。
      <button
        class="btn-ghost small"
        @click="recheckStatus"
      >
        重新檢查
      </button>
    </div>

    <template v-else>
      <p
        v-if="view === 'check'"
        class="hint-banner"
      >
        「帳單瀏覽」使用 OCHECK 表，欄位已依指定清單精簡並重新命名（付款金額1~4 分別顯示為信用卡/宅配代收/宅配匯款/機關簽帳，POSID 會附上店別名稱）。
      </p>

      <div class="filter-bar">
        <input
          v-model="search"
          placeholder="搜尋內容…"
          class="search-input"
          @keyup.enter="fetchData(1)"
        >

        <div class="date-range">
          <span class="date-range-label">時段</span>
          <input
            v-model="dateFrom"
            type="date"
            class="date-input"
          >
          <span class="date-range-sep">～</span>
          <input
            v-model="dateTo"
            type="date"
            class="date-input"
          >
        </div>

        <button
          class="btn-primary"
          @click="fetchData(1)"
        >
          查詢
        </button>
        <button
          class="btn-ghost"
          @click="resetSearch"
        >
          清除
        </button>
        <button
          class="btn-ghost"
          title="切換排序方向"
          @click="toggleSortOrder"
        >
          {{ sortOrder === 'desc' ? '新→舊' : '舊→新' }}
        </button>

        <span class="total-hint">共 {{ total }} 筆</span>

        <div
          v-if="totalPages > 1"
          class="page-jump-group"
        >
          <span class="page-jump-label">跳至第</span>
          <input
            v-model="pageJumpInput"
            type="number"
            min="1"
            :max="totalPages"
            class="page-jump-input"
            :placeholder="String(page)"
            @keyup.enter="jumpToPage"
          >
          <span class="page-jump-label">頁 / 共 {{ totalPages }} 頁</span>
          <button
            class="btn-ghost small"
            @click="jumpToPage"
          >
            前往
          </button>
        </div>
      </div>

      <div
        v-if="loading"
        class="loading"
      >
        載入中…
      </div>
      <div
        v-else-if="error"
        class="error-box"
      >
        {{ error }}
      </div>

      <!-- 發票資料：固定欄位 + 中文表頭，對應舊系統畫面 -->
      <div
        v-else-if="view === 'invoice'"
        class="table-wrap"
      >
        <table class="data-table">
          <thead>
          <tr>
            <th
              v-for="col in invoiceColumns"
              :key="col.key"
            >
              {{ col.label }}
            </th>
          </tr>
          </thead>
          <tbody>
          <tr
            v-for="(row, i) in rows"
            :key="i"
          >
            <td
              v-for="col in invoiceColumns"
              :key="col.key"
            >
              {{ formatInvoiceCell(row, col) }}
            </td>
          </tr>
          <tr v-if="rows.length === 0">
            <td
              :colspan="invoiceColumns.length"
              class="empty-cell"
            >
              查無資料
            </td>
          </tr>
          </tbody>
        </table>
      </div>

      <!-- 帳單瀏覽：依 CHECK_COLUMN_META 對照表顯示中文標題與格式化後的內容 -->
      <div
        v-else
        class="table-wrap"
      >
        <table class="data-table">
          <thead>
          <tr>
            <th
              v-for="col in displayCheckColumns"
              :key="col"
            >
              {{ checkColLabel(col) }}
            </th>
          </tr>
          </thead>
          <tbody>
          <tr
            v-for="(row, i) in rows"
            :key="i"
          >
            <td
              v-for="col in displayCheckColumns"
              :key="col"
            >
              {{ formatCheckCell(row, col) }}
            </td>
          </tr>
          <tr v-if="rows.length === 0">
            <td
              :colspan="displayCheckColumns.length || 1"
              class="empty-cell"
            >
              查無資料
            </td>
          </tr>
          </tbody>
        </table>
      </div>

      <div
        v-if="totalPages > 1"
        class="pagination"
      >
        <button
          :disabled="page === 1"
          class="page-btn"
          title="第一頁"
          @click="goFirstPage"
        >
          « 第一頁
        </button>
        <button
          :disabled="page === 1"
          class="page-btn"
          @click="fetchData(page - 1)"
        >
          ‹ 上一頁
        </button>
        <span class="page-info">第 {{ page }} / {{ totalPages }} 頁</span>
        <button
          :disabled="page === totalPages"
          class="page-btn"
          @click="fetchData(page + 1)"
        >
          下一頁 ›
        </button>
        <button
          :disabled="page === totalPages"
          class="page-btn"
          title="最後一頁"
          @click="goLastPage"
        >
          最後一頁 »
        </button>
      </div>
    </template>
  </div>
</template>

<style scoped>
.page-wrap { padding: 24px; display: flex; flex-direction: column; gap: 16px; }
.page-header { display: flex; align-items: center; gap: 16px; flex-wrap: wrap; }
.page-title { font-size: 20px; font-weight: 700; color: var(--text); margin: 0; }

.tab-switch { display: flex; border: 1px solid var(--border); border-radius: var(--radius-sm); overflow: hidden; }
.sw-tab { padding: 6px 16px; font-size: 13px; border: none; background: var(--surface); color: var(--text-muted); cursor: pointer; }
.sw-tab.active { background: var(--accent); color: #fff; }

.hint-banner { font-size: 12px; color: var(--text-hint); background: var(--surface2); border: 1px solid var(--border-light); border-radius: var(--radius-sm); padding: 8px 12px; margin: 0; }
.paused-banner { display: flex; align-items: center; gap: 12px; font-size: 13px; color: #92400e; background: #fef3c7; border: 1px solid #fde68a; border-radius: var(--radius-sm); padding: 12px 16px; }
.btn-ghost.small { padding: 4px 10px; font-size: 12px; }

.filter-bar { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
.search-input { width: 220px; padding: 7px 12px; font-size: 13px; border: 1px solid var(--border); border-radius: var(--radius-sm); background: var(--surface); color: var(--text); outline: none; }
.search-input:focus { border-color: var(--accent); }

.date-range { display: flex; align-items: center; gap: 6px; }
.date-range-label { font-size: 13px; color: var(--text-muted); }
.date-range-sep { font-size: 13px; color: var(--text-hint); }
.date-input { padding: 6px 8px; font-size: 13px; border: 1px solid var(--border); border-radius: var(--radius-sm); background: var(--surface); color: var(--text); outline: none; }
.date-input:focus { border-color: var(--accent); }

.btn-primary { padding: 7px 16px; background: var(--accent); color: #fff; border: none; border-radius: var(--radius-sm); font-size: 13px; cursor: pointer; }
.btn-ghost { padding: 7px 12px; background: transparent; color: var(--text-muted); border: 1px solid var(--border); border-radius: var(--radius-sm); font-size: 13px; cursor: pointer; }
.total-hint { font-size: 13px; color: var(--text-hint); }

.page-jump-group { display: flex; align-items: center; gap: 6px; margin-left: auto; }
.page-jump-label { font-size: 12px; color: var(--text-hint); white-space: nowrap; }
.page-jump-input { width: 56px; padding: 6px 8px; font-size: 13px; border: 1px solid var(--border); border-radius: var(--radius-sm); background: var(--surface); color: var(--text); outline: none; text-align: center; }
.page-jump-input:focus { border-color: var(--accent); }

.loading { color: var(--text-hint); font-size: 14px; }
.error-box { color: #c0392b; font-size: 13px; background: #fdecea; border: 1px solid #f5c6cb; border-radius: var(--radius-sm); padding: 10px 14px; }
.empty-cell { text-align: center; color: var(--text-hint); padding: 24px 0 !important; }

.table-wrap { overflow-x: auto; border: 1px solid var(--border-light); border-radius: var(--radius); background: var(--surface); }
.data-table { width: 100%; border-collapse: collapse; font-size: 13px; }
.data-table th { background: var(--surface2); padding: 10px 14px; text-align: left; font-weight: 600; color: var(--text-muted); border-bottom: 1px solid var(--border-light); white-space: nowrap; }
.data-table td { padding: 9px 14px; border-bottom: 1px solid var(--border-light); color: var(--text); white-space: nowrap; }
.data-table tr:last-child td { border-bottom: none; }
.data-table tr:hover td { background: var(--accent-light); }
.text-muted { color: var(--text-muted); font-size: 12px; }

.pagination { display: flex; align-items: center; gap: 12px; justify-content: center; }
.page-btn { padding: 6px 14px; background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius-sm); font-size: 13px; cursor: pointer; color: var(--text); }
.page-btn:hover:not(:disabled) { background: var(--accent-light); border-color: var(--accent); color: var(--accent); }
.page-btn:disabled { opacity: 0.4; cursor: not-allowed; }
.page-info { font-size: 13px; color: var(--text-muted); }
</style>
