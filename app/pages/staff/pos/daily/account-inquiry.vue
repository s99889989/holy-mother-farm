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
    type?: 'date' | 'datetime' | 'money' | 'posid'
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
    { key: 'POSID', label: 'POSID', type: 'posid' },
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
  const POSID_LIST = Object.entries(POSID_LABELS)
  const CHECK_COLUMN_ORDER = Object.keys(CHECK_COLUMN_META)

  // ------------------------------------------------------------------
  // 月報表（總報表）：完全前端處理，不需新增後端 API。
  // 做法：沿用既有的「帳單瀏覽」端點 /holy/bk35sql/account-inquiry/check，
  // 用 dateFrom/dateTo 帶入該月第一天～最後一天，把所有分頁抓完後，
  // 在前端依 OPDate（日）＋ POSID（001小舖/002餐廳/003市集）彙總金額。
  // 欄位對照：現金=CashAmt、信用卡=PayAmt1、宅配代收=PayAmt2、
  // 宅配匯款=PayAmt3、簽帳(除帳)=PayAmt4。
  // 折讓目前系統中沒有確認過的欄位名稱，先放常見候選欄位（見 REPORT_CATEGORIES
  // 的 fields），抓不到會在畫面上顯示提醒，之後卡爾確認正確欄位名稱後改 fields 陣列即可。
  // 消費券／生日券系統完全沒有資料來源，合併成單一欄「消費券/生日券」，
  // 每日金額由卡爾手動輸入，存在瀏覽器 localStorage（key 見 MANUAL_STORAGE_KEY），
  // 換月份/切換頁籤都不會遺失，但僅存在該台瀏覽器（無後端，無法跨裝置同步）。
  // 每一列「總計」不再是固定數字，而是即時加總各分類欄位（rowTotal），
  // 這樣手動改消費券/生日券數字時，畫面上的總計與合計會立即跟著變。
  // ------------------------------------------------------------------
  type ReportColorGroup = 'restaurant' | 'market' | 'shop' | 'delegated' | 'creditAccount' | 'discount' | 'coupon' | 'total'

  interface MonthlyReportRow {
    date: string
    weekday: string
    dateKey: string // 'YYYY-MM-DD'，用來對應手動輸入的 localStorage 資料
    restaurantCash: number
    restaurantCredit: number
    marketCash: number
    marketCredit: number
    shopCash: number
    shopCredit: number
    delegatedCollect: number
    delegatedRemit: number
    creditAccount: number
    discount: number
    couponBirthday: number // 消費券 + 生日券合併欄位，手動輸入
  }

  interface ReportCategory {
    key: keyof Omit<MonthlyReportRow, 'date' | 'weekday' | 'dateKey'>
    label: string
    posid?: string
    // 對應原始 OCHECK 欄位名稱候選清單，依序嘗試，第一個有值的採用（manual 欄位不適用）
    fields?: string[]
    manual?: boolean
    color: ReportColorGroup
  }

  const REPORT_CATEGORIES: ReportCategory[] = [
    { key: 'restaurantCash', label: '餐廳現金', posid: '002', fields: ['CashAmt'], color: 'restaurant' },
    { key: 'restaurantCredit', label: '餐廳信用卡', posid: '002', fields: ['PayAmt1'], color: 'restaurant' },
    { key: 'marketCash', label: '市集(現金)', posid: '003', fields: ['CashAmt'], color: 'market' },
    { key: 'marketCredit', label: '市集信用卡', posid: '003', fields: ['PayAmt1'], color: 'market' },
    { key: 'shopCash', label: '小舖(現金)', posid: '001', fields: ['CashAmt'], color: 'shop' },
    { key: 'shopCredit', label: '小舖信用卡', posid: '001', fields: ['PayAmt1'], color: 'shop' },
    { key: 'delegatedCollect', label: '宅配代收款', fields: ['PayAmt2'], color: 'delegated' },
    { key: 'delegatedRemit', label: '宅配匯款', fields: ['PayAmt3'], color: 'delegated' },
    { key: 'creditAccount', label: '簽帳(除帳)', fields: ['PayAmt4'], color: 'creditAccount' },
    { key: 'discount', label: '折讓', fields: ['DiscAmt', 'DiscountAmt', 'Discount'], color: 'discount' },
    { key: 'couponBirthday', label: '消費券/生日券', manual: true, color: 'coupon' }
  ]

  // 分類色系對照（匯出 Excel 儲存格底色）：每個分類都用不重複的顏色，總計欄再另外獨立一色
  const CATEGORY_COLOR_HEX: Record<ReportColorGroup, string> = {
    restaurant: 'E1BEE7', // 紫：餐廳現金/信用卡
    market: 'B3E5FC', // 淺藍：市集(現金)/信用卡
    shop: 'FFE0B2', // 橘：小舖(現金)/信用卡
    delegated: 'C8E6C9', // 綠：宅配代收款/宅配匯款
    creditAccount: 'F8BBD0', // 粉：簽帳(除帳)
    discount: 'D7CCC8', // 灰褐：折讓
    coupon: 'FFF59D', // 黃：消費券/生日券
    total: 'B2DFDB' // 青綠：總計（跟消費券/生日券的黃色區分開）
  }



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

  // 帳務查詢固定用 BKSQL 資料庫，後端已依頁籤名稱各自開好專屬端點：
  // /holy/bk35sql/account-inquiry/check、/holy/bk35sql/account-inquiry/invoice
  // （見 Bk35AccountInquiryController），table 名稱與日期欄位對應都收斂在後端，
  // 前端不再需要維護 TABLE_MAP / DATE_COLUMN_MAP。

  // 帳單瀏覽為預設頁籤
  const view = ref<'invoice' | 'check' | 'report'>('check')
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
  // 後端固定依該頁籤的日期欄位（check 用 OPDate、invoice 用 InvDate）做 ROW_NUMBER() 排序分頁。
  const sortOrder = ref<'desc' | 'asc'>('desc')

  // 跳頁輸入（頁首快速跳頁用）
  const pageJumpInput = ref('')

  // ---------------- 帳單瀏覽／發票資料共用：快速選月 + POSID 分類篩選 ----------------
  // POSID 在後端目前沒有對應的篩選參數，因此篩選啟用時改成「把符合搜尋/時段條件的
  // 全部分頁資料抓回來，再依 POSID 做前端篩選＋前端分頁」，資料仍然正確涵蓋所有分頁，
  // 只是時間範圍很大時讀取會比較久。
  const posidFilter = ref('')
  const CLIENT_PAGE_SIZE = 50
  const quickYear = ref(new Date().getFullYear())
  const quickMonth = ref(new Date().getMonth() + 1)

  const quickMonthInputValue = computed({
    get: () => `${quickYear.value}-${String(quickMonth.value).padStart(2, '0')}`,
    set: (v: string) => {
      if (!v) return
      const [y, m] = v.split('-').map(Number)
      if (y && m) {
        quickYear.value = y
        quickMonth.value = m
        applyQuickMonth()
      }
    }
  })

  function setMonthRange(year: number, month: number) {
    const mm = String(month).padStart(2, '0')
    const lastDay = new Date(year, month, 0).getDate()
    dateFrom.value = `${year}-${mm}-01`
    dateTo.value = `${year}-${mm}-${String(lastDay).padStart(2, '0')}`
  }

  function applyQuickMonth() {
    setMonthRange(quickYear.value, quickMonth.value)
    fetchData(1)
  }

  function quickPrevMonth() {
    if (quickMonth.value === 1) {
      quickMonth.value = 12
      quickYear.value -= 1
    } else {
      quickMonth.value -= 1
    }
    applyQuickMonth()
  }

  function quickNextMonth() {
    if (quickMonth.value === 12) {
      quickMonth.value = 1
      quickYear.value += 1
    } else {
      quickMonth.value += 1
    }
    applyQuickMonth()
  }

  function quickThisMonth() {
    quickYear.value = new Date().getFullYear()
    quickMonth.value = new Date().getMonth() + 1
    applyQuickMonth()
  }

  function setPosidFilter(code: string) {
    posidFilter.value = code
    fetchData(1)
  }

  // 依目前搜尋/時段/排序條件，把「帳單瀏覽」或「發票資料」的全部分頁資料抓回來（供 POSID 篩選使用）
  async function fetchAllRowsForView(viewName: 'check' | 'invoice'): Promise<{ rows: Record<string, any>[]; columns: string[] }> {
    let allRows: Record<string, any>[] = []
    let cols: string[] = []
    let currentPage = 1
    let totalPagesLocal = 1
    const MAX_PAGES = 200 // 安全上限，避免資料異常時無限迴圈打 API

    do {
      const res = await $fetch<DataResponse>(
        `${apiBase.value}/holy/bk35sql/account-inquiry/${viewName}`,
          {
            credentials: 'include',
            query: {
              page: currentPage,
              search: search.value,
              dateFrom: dateFrom.value || undefined,
              dateTo: dateTo.value || undefined,
              sortOrder: sortOrder.value
            }
          }
      )
      if (res?.error) throw new Error(res.error)
      if (currentPage === 1) cols = res?.columns ?? []
      allRows = allRows.concat(res?.rows ?? [])
      totalPagesLocal = res?.totalPages ?? 1
      currentPage++
    } while (currentPage <= totalPagesLocal && currentPage <= MAX_PAGES)

    return { rows: allRows, columns: cols }
  }

  // 資料庫暫停/開啟狀態（跨頁面共用快取，見 composables/useBk35DbStatus.ts）
  const { bksqlAttached: dbAttached, checkStatus } = useBk35DbStatus()

  async function recheckStatus() {
    await checkStatus(true)
    if (dbAttached.value !== false) {
      if (view.value === 'report') {
        fetchMonthlyReport()
      } else {
        fetchData(1)
      }
    }
  }

  // ---------------- 月報表（總報表）狀態與邏輯 ----------------
  const now = new Date()
  const reportYear = ref(now.getFullYear())
  const reportMonth = ref(now.getMonth() + 1)
  const monthlyLoading = ref(false)
  const monthlyError = ref('')
  const monthlyRows = ref<MonthlyReportRow[]>([])

  // 民國年顯示（配合舊系統 Excel「YYY年M月營收」標題習慣）
  const rocYear = computed(() => reportYear.value - 1911)

  // <input type="month"> 雙向綁定用
  const monthInputValue = computed({
    get: () => `${reportYear.value}-${String(reportMonth.value).padStart(2, '0')}`,
    set: (v: string) => {
      if (!v) return
      const [y, m] = v.split('-').map(Number)
      if (y && m) {
        reportYear.value = y
        reportMonth.value = m
        fetchMonthlyReport()
      }
    }
  })

  function prevMonth() {
    if (reportMonth.value === 1) {
      reportMonth.value = 12
      reportYear.value -= 1
    } else {
      reportMonth.value -= 1
    }
    fetchMonthlyReport()
  }

  function nextMonth() {
    if (reportMonth.value === 12) {
      reportMonth.value = 1
      reportYear.value += 1
    } else {
      reportMonth.value += 1
    }
    fetchMonthlyReport()
  }

  function thisMonth() {
    reportYear.value = now.getFullYear()
    reportMonth.value = now.getMonth() + 1
    fetchMonthlyReport()
  }

  // 該月實際抓到的原始欄位清單（用來判斷折讓/消費券/生日券等欄位是否存在）
  const reportColumns = ref<string[]>([])
  // 該月彙總用到的原始帳單筆數（顯示用，讓卡爾知道有沒有抓到資料）
  const reportRecordCount = ref(0)

  const WEEKDAY_LABELS = ['日', '一', '二', '三', '四', '五', '六']

  // 依 dateFrom/dateTo 把整個月的帳單瀏覽（check）資料全部分頁抓完
  async function fetchAllCheckRowsForMonth(year: number, month: number): Promise<Record<string, any>[]> {
    const mm = String(month).padStart(2, '0')
    const lastDay = new Date(year, month, 0).getDate()
    const from = `${year}-${mm}-01`
    const to = `${year}-${mm}-${String(lastDay).padStart(2, '0')}`

    let allRows: Record<string, any>[] = []
    let currentPage = 1
    let totalPagesLocal = 1
    const MAX_PAGES = 200 // 安全上限，避免資料異常時無限迴圈打 API

    do {
      const res = await $fetch<DataResponse>(
        `${apiBase.value}/holy/bk35sql/account-inquiry/check`,
          {
            credentials: 'include',
            query: {
              page: currentPage,
              search: '',
              dateFrom: from,
              dateTo: to,
              sortOrder: 'asc'
            }
          }
      )
      if (res?.error) throw new Error(res.error)
      if (currentPage === 1) reportColumns.value = res?.columns ?? []
      allRows = allRows.concat(res?.rows ?? [])
      totalPagesLocal = res?.totalPages ?? 1
      currentPage++
    } while (currentPage <= totalPagesLocal && currentPage <= MAX_PAGES)

    return allRows
  }

  // 依 fields 候選清單，找出這筆原始資料中第一個有值的欄位金額
  function pickFieldValue(row: Record<string, any>, fields: string[]): number {
    for (const f of fields) {
      if (row[f] !== undefined && row[f] !== null && row[f] !== '') {
        const n = Number(row[f])
        if (!isNaN(n)) return n
      }
    }
    return 0
  }

  // ---------------- 消費券/生日券手動輸入：存在瀏覽器 localStorage ----------------
  const MANUAL_STORAGE_KEY = 'posAccountInquiry.couponBirthdayManualEntries.v1'

  function loadManualEntries(): Record<string, number> {
    if (typeof window === 'undefined') return {}
    try {
      const raw = window.localStorage.getItem(MANUAL_STORAGE_KEY)
      return raw ? JSON.parse(raw) : {}
    } catch {
      return {}
    }
  }

  function saveManualEntry(dateKey: string, value: number) {
    if (typeof window === 'undefined') return
    try {
      const all = loadManualEntries()
      all[dateKey] = value
      window.localStorage.setItem(MANUAL_STORAGE_KEY, JSON.stringify(all))
    } catch {
      // 忽略寫入失敗（例如無痕模式關閉了 localStorage）
    }
  }

  // 手動輸入「消費券/生日券」欄位時觸發：更新畫面並立即存檔
  function onCouponBirthdayChange(row: MonthlyReportRow, raw: string | number) {
    const n = Number(raw)
    row.couponBirthday = isNaN(n) ? 0 : n
    saveManualEntry(row.dateKey, row.couponBirthday)
  }

  function buildEmptyReportRow(dateLabel: string, weekday: string, dateKey: string): MonthlyReportRow {
    const row: any = { date: dateLabel, weekday, dateKey }
    for (const cat of REPORT_CATEGORIES) row[cat.key] = 0
    return row as MonthlyReportRow
  }

  // 把整月原始帳單資料依「日期 + POSID」彙總成畫面用的月報表列（含沒有交易的日期，顯示 0）
  // 消費券/生日券欄位不從帳單資料計算，改套用 localStorage 中先前手動輸入的值。
  function aggregateMonthlyReport(rawRows: Record<string, any>[], year: number, month: number): MonthlyReportRow[] {
    const lastDay = new Date(year, month, 0).getDate()
    const dayMap = new Map<number, MonthlyReportRow>()
    const manualEntries = loadManualEntries()

    for (let d = 1; d <= lastDay; d++) {
      const weekday = WEEKDAY_LABELS[new Date(year, month - 1, d).getDay()]
      const dateKey = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`
      const row = buildEmptyReportRow(`${month}/${d}`, weekday, dateKey)
      row.couponBirthday = manualEntries[dateKey] ?? 0
      dayMap.set(d, row)
    }

    for (const row of rawRows) {
      const opRaw = row.OPDate
      if (!opRaw) continue
      const d = new Date(opRaw)
      if (isNaN(d.getTime())) continue
      const entry = dayMap.get(d.getDate())
      if (!entry) continue

      const posid = String(row.POSID ?? '')
      for (const cat of REPORT_CATEGORIES) {
        if (cat.manual) continue // 消費券/生日券手動輸入，不從帳單資料覆蓋
        if (cat.posid && cat.posid !== posid) continue
        const val = pickFieldValue(row, cat.fields ?? [])
        ;(entry as any)[cat.key] += val
      }
    }

    return Array.from(dayMap.values())
  }

  async function fetchMonthlyReport() {
    if (dbAttached.value === false) return
    monthlyLoading.value = true
    monthlyError.value = ''
    try {
      const rawRows = await fetchAllCheckRowsForMonth(reportYear.value, reportMonth.value)
      reportRecordCount.value = rawRows.length
      monthlyRows.value = aggregateMonthlyReport(rawRows, reportYear.value, reportMonth.value)
    } catch (e: any) {
      monthlyError.value = e?.message ?? '載入月報表失敗'
      monthlyRows.value = []
    } finally {
      monthlyLoading.value = false
    }
  }

  // 找出目前抓不到對應原始欄位的分類（折讓最有可能對不到），畫面上會提醒卡爾確認正確欄位名稱
  // 消費券/生日券是手動輸入欄位，不需要（也無法）比對後端欄位，排除在提醒之外。
  const unresolvedCategories = computed(() => {
    if (reportColumns.value.length === 0) return []
    return REPORT_CATEGORIES.filter(cat => !cat.manual && !(cat.fields ?? []).some(f => reportColumns.value.includes(f)))
  })

  // 單一列的「總計」：即時加總各分類欄位，手動改消費券/生日券數字時會立即反映
  function rowTotal(row: MonthlyReportRow): number {
    return REPORT_CATEGORIES.reduce((sum, cat) => sum + (Number((row as any)[cat.key]) || 0), 0)
  }

  // 逐欄合計（依畫面上目前每一列的數值即時加總，包含手動輸入的消費券/生日券）
  const monthlyTotals = computed(() => {
    const t: Record<string, number> = {}
    for (const cat of REPORT_CATEGORIES) t[cat.key] = 0
    for (const row of monthlyRows.value) {
      for (const cat of REPORT_CATEGORIES) {
        t[cat.key] += Number((row as any)[cat.key]) || 0
      }
    }
    t.total = REPORT_CATEGORIES.reduce((sum, cat) => sum + t[cat.key], 0)
    return t
  })

  function formatReportMoney(v: any) {
    const n = Number(v) || 0
    return n.toLocaleString()
  }

  // ---------------- Excel 下載（標題 + 顏色分區 + SUM 公式） ----------------
  // 需要專案安裝 exceljs：npm install exceljs（純前端產生 .xlsx，不需要後端）
  const downloading = ref(false)

  function colLetter(n: number): string {
    let s = ''
    while (n > 0) {
      const rem = (n - 1) % 26
      s = String.fromCharCode(65 + rem) + s
      n = Math.floor((n - 1) / 26)
    }
    return s
  }

  const THIN_BORDER = {
    top: { style: 'thin' },
    left: { style: 'thin' },
    bottom: { style: 'thin' },
    right: { style: 'thin' }
  } as const

    function fillFor(color: ReportColorGroup) {
    return {
      type: 'pattern' as const,
      pattern: 'solid' as const,
      fgColor: { argb: `FF${CATEGORY_COLOR_HEX[color]}` }
    }
  }

  function triggerBlobDownload(blob: Blob, filename: string) {
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  }

  // 下載檔名用：例如「115年4月份農莊」，後面依報表類型接上「總營收報表」/「總計報表」/「{項目}報表」
  const reportFileLabel = computed(() => `${rocYear.value}年${reportMonth.value}月份農莊`)
  const reportTitleText = computed(() => `總報表　民國 ${rocYear.value} 年 ${reportMonth.value} 月營收`)

  // 單一項目下載（餐廳現金 / 餐廳信用卡 / 小舖現金 ... 每項各自標題、色塊、SUM 公式合計）
  async function downloadCategoryReport(cat: ReportCategory) {
    downloading.value = true
    try {
      const ExcelJS = (await import('exceljs')).default
      const wb = new ExcelJS.Workbook()
      const ws = wb.addWorksheet(cat.label.replace(/[\\/*?:[\]]/g, ''))

      ws.mergeCells(1, 1, 1, 3)
      const titleCell = ws.getCell(1, 1)
      titleCell.value = `${cat.label}　民國 ${rocYear.value} 年 ${reportMonth.value} 月營收`
      titleCell.font = { bold: true, size: 14 }
      titleCell.alignment = { horizontal: 'center', vertical: 'middle' }
      ws.getRow(1).height = 24

      const headerRowIndex = 2
      ;['日期', '星期', cat.label].forEach((h, i) => {
        const cell = ws.getCell(headerRowIndex, i + 1)
        cell.value = h
        cell.font = { bold: true }
        cell.alignment = { horizontal: 'center', vertical: 'middle' }
        cell.fill = fillFor(cat.color)
        cell.border = THIN_BORDER as any
      })

      const dataStartRow = 3
      monthlyRows.value.forEach((row, idx) => {
        const r = dataStartRow + idx
        ws.getCell(r, 1).value = row.date
        ws.getCell(r, 2).value = row.weekday
        const valCell = ws.getCell(r, 3)
        valCell.value = Number((row as any)[cat.key]) || 0
        valCell.numFmt = '#,##0'
        valCell.fill = fillFor(cat.color)
        valCell.border = THIN_BORDER as any
        ws.getCell(r, 1).border = THIN_BORDER as any
        ws.getCell(r, 2).border = THIN_BORDER as any
      })

      const totalsRowIndex = dataStartRow + monthlyRows.value.length
      ws.mergeCells(totalsRowIndex, 1, totalsRowIndex, 2)
      const labelCell = ws.getCell(totalsRowIndex, 1)
      labelCell.value = '合計'
      labelCell.font = { bold: true }
      labelCell.alignment = { horizontal: 'center' }
      labelCell.border = THIN_BORDER as any
      const sumCell = ws.getCell(totalsRowIndex, 3)
      sumCell.value = { formula: `SUM(C${dataStartRow}:C${totalsRowIndex - 1})` } as any
      sumCell.numFmt = '#,##0'
      sumCell.font = { bold: true }
      sumCell.fill = fillFor(cat.color)
      sumCell.border = THIN_BORDER as any

      ws.getColumn(1).width = 10
      ws.getColumn(2).width = 6
      ws.getColumn(3).width = 16

      const buffer = await wb.xlsx.writeBuffer()
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
      triggerBlobDownload(blob, `${reportFileLabel.value}${cat.label.replace(/\//g, '_')}報表.xlsx`)
    } finally {
      downloading.value = false
    }
  }

  // 總計欄位下載（合計用 SUM 公式加總本欄所有日期）
  async function downloadTotalReport() {
    downloading.value = true
    try {
      const ExcelJS = (await import('exceljs')).default
      const wb = new ExcelJS.Workbook()
      const ws = wb.addWorksheet('總計')

      ws.mergeCells(1, 1, 1, 3)
      const titleCell = ws.getCell(1, 1)
      titleCell.value = reportTitleText.value
      titleCell.font = { bold: true, size: 14 }
      titleCell.alignment = { horizontal: 'center', vertical: 'middle' }
      ws.getRow(1).height = 24

      const headerRowIndex = 2
      ;['日期', '星期', '總計'].forEach((h, i) => {
        const cell = ws.getCell(headerRowIndex, i + 1)
        cell.value = h
        cell.font = { bold: true }
        cell.alignment = { horizontal: 'center', vertical: 'middle' }
        cell.fill = fillFor('total')
        cell.border = THIN_BORDER as any
      })

      const dataStartRow = 3
      monthlyRows.value.forEach((row, idx) => {
        const r = dataStartRow + idx
        ws.getCell(r, 1).value = row.date
        ws.getCell(r, 2).value = row.weekday
        ws.getCell(r, 1).border = THIN_BORDER as any
        ws.getCell(r, 2).border = THIN_BORDER as any
        const cell = ws.getCell(r, 3)
        cell.value = rowTotal(row)
        cell.numFmt = '#,##0'
        cell.fill = fillFor('total')
        cell.border = THIN_BORDER as any
      })

      const totalsRowIndex = dataStartRow + monthlyRows.value.length
      ws.mergeCells(totalsRowIndex, 1, totalsRowIndex, 2)
      const labelCell = ws.getCell(totalsRowIndex, 1)
      labelCell.value = '合計'
      labelCell.font = { bold: true }
      labelCell.alignment = { horizontal: 'center' }
      labelCell.border = THIN_BORDER as any
      const sumCell = ws.getCell(totalsRowIndex, 3)
      sumCell.value = { formula: `SUM(C${dataStartRow}:C${totalsRowIndex - 1})` } as any
      sumCell.numFmt = '#,##0'
      sumCell.font = { bold: true }
      sumCell.fill = fillFor('total')
      sumCell.border = THIN_BORDER as any

      ws.getColumn(1).width = 10
      ws.getColumn(2).width = 6
      ws.getColumn(3).width = 16

      const buffer = await wb.xlsx.writeBuffer()
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
      triggerBlobDownload(blob, `${reportFileLabel.value}總計報表.xlsx`)
    } finally {
      downloading.value = false
    }
  }

  // 完整總報表下載（標題 + 各分類色塊 + 每列/合計列皆用 SUM 公式，改任一數字都會自動重算）
  async function downloadFullReport() {
    downloading.value = true
    try {
      const ExcelJS = (await import('exceljs')).default
      const wb = new ExcelJS.Workbook()
      const ws = wb.addWorksheet('總報表')

      const catCount = REPORT_CATEGORIES.length
      const lastCatColIndex = 2 + catCount
      const totalColIndex = lastCatColIndex + 1

      ws.mergeCells(1, 1, 1, totalColIndex)
      const titleCell = ws.getCell(1, 1)
      titleCell.value = reportTitleText.value
      titleCell.font = { bold: true, size: 16 }
      titleCell.alignment = { horizontal: 'center', vertical: 'middle' }
      ws.getRow(1).height = 30

      const headerRowIndex = 2
      const headers = ['日期', '星期', ...REPORT_CATEGORIES.map(c => c.label), '總計']
      headers.forEach((h, i) => {
        const cell = ws.getCell(headerRowIndex, i + 1)
        cell.value = h
        cell.font = { bold: true }
        cell.alignment = { horizontal: 'center', vertical: 'middle' }
        cell.border = THIN_BORDER as any
        if (i >= 2 && i < 2 + catCount) {
          cell.fill = fillFor(REPORT_CATEGORIES[i - 2].color)
        } else if (i === headers.length - 1) {
          cell.fill = fillFor('total')
        }
      })

      const dataStartRow = 3
      const startColLetter = colLetter(3)
      const endColLetter = colLetter(lastCatColIndex)

      monthlyRows.value.forEach((row, idx) => {
        const r = dataStartRow + idx
        ws.getCell(r, 1).value = row.date
        ws.getCell(r, 2).value = row.weekday
        ws.getCell(r, 1).border = THIN_BORDER as any
        ws.getCell(r, 2).border = THIN_BORDER as any

        REPORT_CATEGORIES.forEach((cat, ci) => {
          const cell = ws.getCell(r, 3 + ci)
          cell.value = Number((row as any)[cat.key]) || 0
          cell.numFmt = '#,##0'
          cell.fill = fillFor(cat.color)
          cell.border = THIN_BORDER as any
        })

        const totalCell = ws.getCell(r, totalColIndex)
        totalCell.value = { formula: `SUM(${startColLetter}${r}:${endColLetter}${r})` } as any
        totalCell.numFmt = '#,##0'
        totalCell.font = { bold: true }
        totalCell.fill = fillFor('total')
        totalCell.border = THIN_BORDER as any
      })

      const totalsRowIndex = dataStartRow + monthlyRows.value.length
      ws.mergeCells(totalsRowIndex, 1, totalsRowIndex, 2)
      const labelCell = ws.getCell(totalsRowIndex, 1)
      labelCell.value = '合計'
      labelCell.font = { bold: true }
      labelCell.alignment = { horizontal: 'center' }
      labelCell.border = THIN_BORDER as any

      REPORT_CATEGORIES.forEach((cat, ci) => {
        const colIdx = 3 + ci
        const letter = colLetter(colIdx)
        const cell = ws.getCell(totalsRowIndex, colIdx)
        cell.value = { formula: `SUM(${letter}${dataStartRow}:${letter}${totalsRowIndex - 1})` } as any
        cell.numFmt = '#,##0'
        cell.font = { bold: true }
        cell.fill = fillFor(cat.color)
        cell.border = THIN_BORDER as any
      })

      const totalLetter = colLetter(totalColIndex)
      const grandTotalCell = ws.getCell(totalsRowIndex, totalColIndex)
      grandTotalCell.value = { formula: `SUM(${totalLetter}${dataStartRow}:${totalLetter}${totalsRowIndex - 1})` } as any
      grandTotalCell.numFmt = '#,##0'
      grandTotalCell.font = { bold: true }
      grandTotalCell.fill = fillFor('total')
      grandTotalCell.border = THIN_BORDER as any

      ws.getColumn(1).width = 10
      ws.getColumn(2).width = 6
      for (let i = 3; i <= totalColIndex; i++) ws.getColumn(i).width = 13

      const buffer = await wb.xlsx.writeBuffer()
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
      triggerBlobDownload(blob, `${reportFileLabel.value}總營收報表.xlsx`)
    } finally {
      downloading.value = false
    }
  }

  async function fetchServerPage(serverPage: number): Promise<DataResponse> {
    return await $fetch<DataResponse>(
      `${apiBase.value}/holy/bk35sql/account-inquiry/${view.value}`,
        {
          credentials: 'include',
          query: {
            page: serverPage,
            search: search.value,
            dateFrom: dateFrom.value || undefined,
            dateTo: dateTo.value || undefined,
            sortOrder: sortOrder.value
          }
        }
    )
  }

  // POSID 篩選啟用時：抓完整批資料、依 POSID 篩選，再依 CLIENT_PAGE_SIZE 做前端分頁
  async function fetchDataWithPosidFilter(uiPage: number) {
    loading.value = true
    error.value = ''
    try {
      const { rows: allRows, columns: cols } = await fetchAllRowsForView(view.value as 'check' | 'invoice')
      columns.value = cols
      const filtered = allRows.filter(r => String(r.POSID ?? '') === posidFilter.value)
      total.value = filtered.length
      totalPages.value = Math.max(1, Math.ceil(filtered.length / CLIENT_PAGE_SIZE))
      page.value = Math.min(uiPage, totalPages.value)
      const start = (page.value - 1) * CLIENT_PAGE_SIZE
      rows.value = filtered.slice(start, start + CLIENT_PAGE_SIZE)
    } catch (e: any) {
      error.value = e?.message ?? '載入資料失敗'
      rows.value = []
      columns.value = []
      total.value = 0
      totalPages.value = 1
    } finally {
      loading.value = false
    }
  }

  async function fetchData(uiPage: number) {
    if (dbAttached.value === false) {
      // 資料庫已暫停，不用實際打 API 等它逾時，畫面上會顯示暫停 banner
      return
    }
    if (view.value !== 'report' && posidFilter.value) {
      page.value = uiPage
      await fetchDataWithPosidFilter(uiPage)
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

  function switchView(v: 'invoice' | 'check' | 'report') {
    view.value = v
    if (v === 'report') {
      if (monthlyRows.value.length === 0 && !monthlyLoading.value) {
        fetchMonthlyReport()
      }
    } else {
      search.value = ''
      fetchData(1)
    }
  }

  function resetSearch() {
    search.value = ''
    dateFrom.value = ''
    dateTo.value = ''
    sortOrder.value = 'desc'
    posidFilter.value = ''
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
    if (col.type === 'posid') {
      const name = POSID_LABELS[String(raw)]
      return name ? `${raw} ${name}` : raw
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
        <button
          :class="['sw-tab', { active: view === 'report' }]"
          @click="switchView('report')"
        >
          月報表
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

      <div
        v-if="view !== 'report'"
        class="quick-tools"
      >
        <div class="month-switch">
          <span class="legend-label">快速選月：</span>
          <button
            class="btn-ghost small"
            title="上個月"
            @click="quickPrevMonth"
          >
            ‹ 上月
          </button>
          <input
            v-model="quickMonthInputValue"
            type="month"
            class="month-input"
          >
          <button
            class="btn-ghost small"
            title="下個月"
            @click="quickNextMonth"
          >
            下月 ›
          </button>
          <button
            class="btn-ghost small"
            @click="quickThisMonth"
          >
            本月
          </button>
        </div>

        <div class="posid-filter">
          <span class="legend-label">POSID 分類：</span>
          <button
            :class="['posid-chip-btn', { active: posidFilter === '' }]"
            @click="setPosidFilter('')"
          >
            全部
          </button>
          <button
            v-for="[code, label] in POSID_LIST"
            :key="code"
            :class="['posid-chip-btn', { active: posidFilter === code }]"
            @click="setPosidFilter(code)"
          >
            {{ code }}．{{ label }}
          </button>
        </div>
      </div>

      <p
        v-if="view !== 'report' && posidFilter"
        class="hint-banner"
      >
        已依 POSID（{{ POSID_LABELS[posidFilter] }}）篩選：系統會先抓取符合搜尋/時段條件的完整資料再依 POSID 篩選及分頁，若時段範圍很大讀取會較久。
      </p>

      <div
        v-if="view !== 'report'"
        class="filter-bar"
      >
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

      <!-- 月報表（總報表）：依日彙總，並依 POSID 分類顯示各店別現金/信用卡收入 -->
      <div
        v-else-if="view === 'report'"
        class="report-panel"
      >
        <div class="month-switch">
          <button
            class="btn-ghost small"
            title="上個月"
            @click="prevMonth"
          >
            ‹ 上月
          </button>
          <input
            v-model="monthInputValue"
            type="month"
            class="month-input"
          >
          <button
            class="btn-ghost small"
            title="下個月"
            @click="nextMonth"
          >
            下月 ›
          </button>
          <button
            class="btn-ghost small"
            @click="thisMonth"
          >
            本月
          </button>
          <span
            v-if="!monthlyLoading && !monthlyError"
            class="record-count-hint"
          >（共彙總 {{ reportRecordCount }} 筆帳單）</span>
        </div>

        <p
          v-if="unresolvedCategories.length > 0"
          class="hint-banner warn-banner"
        >
          ⚠️ 帳單資料中目前找不到「{{ unresolvedCategories.map(c => c.label).join('、') }}」對應的欄位，暫以 0 顯示。
          請告訴我實際欄位名稱，我再更新對照表即可。
        </p>

        <p class="hint-banner">
          「消費券/生日券」欄位為手動輸入（系統無此資料來源），輸入後會自動存在這台瀏覽器（localStorage），
          切換月份/頁籤都不會遺失；但僅存在這台裝置，換電腦或清除瀏覽器資料需要重新輸入。
        </p>

        <div class="download-bar">
          <span class="legend-label">下載報表（Excel，含標題/顏色/合計公式）：</span>
          <button
            v-for="cat in REPORT_CATEGORIES"
            :key="cat.key"
            class="btn-ghost small"
            :disabled="downloading"
            @click="downloadCategoryReport(cat)"
          >
            {{ cat.label }}
          </button>
          <button
            class="btn-ghost small"
            :disabled="downloading"
            @click="downloadTotalReport"
          >
            總計
          </button>
          <button
            class="btn-primary small"
            :disabled="downloading"
            @click="downloadFullReport"
          >
            {{ downloading ? '產生中…' : '下載完整報表' }}
          </button>
        </div>

        <div
          v-if="monthlyLoading"
          class="loading"
        >
          載入中…
        </div>
        <div
          v-else-if="monthlyError"
          class="error-box"
        >
          {{ monthlyError }}
        </div>

        <div
          v-else
          class="table-wrap"
        >
          <table class="data-table report-table">
            <thead>
            <tr>
              <th>日期</th>
              <th>星期</th>
              <th
                v-for="cat in REPORT_CATEGORIES"
                :key="cat.key"
              >
                {{ cat.label }}
              </th>
              <th>
                總計
              </th>
            </tr>
            </thead>
            <tbody>
            <tr
              v-for="(row, i) in monthlyRows"
              :key="i"
            >
              <td>{{ row.date }}</td>
              <td>{{ row.weekday }}</td>
              <td
                v-for="cat in REPORT_CATEGORIES"
                :key="cat.key"
              >
                <input
                  v-if="cat.manual"
                  type="number"
                  class="manual-input"
                  :value="(row as any)[cat.key]"
                  @change="onCouponBirthdayChange(row, ($event.target as HTMLInputElement).value)"
                >
                <template v-else>
                  {{ formatReportMoney((row as any)[cat.key]) }}
                </template>
              </td>
              <td class="col-total">
                {{ formatReportMoney(rowTotal(row)) }}
              </td>
            </tr>
            <tr v-if="monthlyRows.length === 0">
              <td
                :colspan="REPORT_CATEGORIES.length + 3"
                class="empty-cell"
              >
                查無資料
              </td>
            </tr>
            </tbody>
            <tfoot v-if="monthlyRows.length > 0">
            <tr class="totals-row">
              <td colspan="2">
                合計
              </td>
              <td
                v-for="cat in REPORT_CATEGORIES"
                :key="cat.key"
              >
                {{ formatReportMoney(monthlyTotals[cat.key]) }}
              </td>
              <td class="col-total">
                {{ formatReportMoney(monthlyTotals.total) }}
              </td>
            </tr>
            </tfoot>
          </table>
        </div>
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
        v-if="view !== 'report' && totalPages > 1"
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

  .quick-tools { display: flex; align-items: center; gap: 20px; flex-wrap: wrap; padding: 8px 12px; background: var(--surface2); border: 1px solid var(--border-light); border-radius: var(--radius-sm); }
  .posid-filter { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
  .posid-chip-btn { padding: 3px 10px; font-size: 12px; border: 1px solid var(--border); border-radius: 999px; background: var(--surface); color: var(--text-muted); cursor: pointer; }
  .posid-chip-btn.active { background: var(--accent); border-color: var(--accent); color: #fff; }

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

  .report-panel { display: flex; flex-direction: column; gap: 14px; }

  .month-switch { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
  .month-input { padding: 6px 10px; font-size: 13px; border: 1px solid var(--border); border-radius: var(--radius-sm); background: var(--surface); color: var(--text); outline: none; }
  .month-input:focus { border-color: var(--accent); }
  .record-count-hint { font-size: 12px; color: var(--text-hint); }
  .warn-banner { color: #92400e; background: #fef3c7; border-color: #fde68a; }

  .download-bar { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
  .legend-label { font-size: 12px; color: var(--text-hint); white-space: nowrap; }

  .download-bar { padding: 10px 12px; background: var(--surface2); border: 1px solid var(--border-light); border-radius: var(--radius-sm); }
  .btn-ghost.small, .btn-primary.small { padding: 5px 10px; font-size: 12px; }
  .btn-ghost:disabled, .btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }

  .report-table th, .report-table td { text-align: right; }
  .report-table th:nth-child(1), .report-table th:nth-child(2),
  .report-table td:nth-child(1), .report-table td:nth-child(2) { text-align: center; }
  .report-table .col-total { font-weight: 700; color: var(--accent); }
  .report-table tfoot .totals-row td { font-weight: 700; background: var(--surface2); border-top: 2px solid var(--border); }

  .manual-input { width: 84px; padding: 4px 6px; font-size: 13px; text-align: right; border: 1px solid var(--border); border-radius: 4px; background: var(--surface); color: var(--text); }
  .manual-input:focus { border-color: var(--accent); outline: none; }

  .pagination { display: flex; align-items: center; gap: 12px; justify-content: center; }
  .page-btn { padding: 6px 14px; background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius-sm); font-size: 13px; cursor: pointer; color: var(--text); }
  .page-btn:hover:not(:disabled) { background: var(--accent-light); border-color: var(--accent); color: var(--accent); }
  .page-btn:disabled { opacity: 0.4; cursor: not-allowed; }
  .page-info { font-size: 13px; color: var(--text-muted); }
</style>
