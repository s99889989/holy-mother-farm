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
  // 消費券生日券合併成單一欄，改用另一支「單品明細統計表」API
  // （/holy/bk35sql/sales-analysis/item-detail）以品項名稱關鍵字「員工消費券」
  // 「員工生日券」查詢並依日期加總金額，自動帶入（見 fetchCouponBirthdayAutoMap）。
  // 每一列「總計」不再是固定數字，而是即時加總各分類欄位（rowTotal）。
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
    couponBirthday: number // 消費券生日券合併欄位，自動從單品明細抓取
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
    { key: 'couponBirthday', label: '消費券生日券', manual: true, color: 'coupon' }
  ]

  // 分類色系對照（匯出 Excel 儲存格底色）：每個分類都用不重複的顏色，總計欄再另外獨立一色
  const CATEGORY_COLOR_HEX: Record<ReportColorGroup, string> = {
    restaurant: 'E1BEE7', // 紫：餐廳現金/信用卡
    market: 'B3E5FC', // 淺藍：市集(現金)/信用卡
    shop: 'FFE0B2', // 橘：小舖(現金)/信用卡
    delegated: 'C8E6C9', // 綠：宅配代收款/宅配匯款
    creditAccount: 'F8BBD0', // 粉：簽帳(除帳)
    discount: 'D7CCC8', // 灰褐：折讓
    coupon: 'FFF59D', // 黃：消費券生日券
    total: 'B2DFDB' // 青綠：總計（跟消費券生日券的黃色區分開）
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
  const view = ref<'invoice' | 'check' | 'report' | 'staffMeal' | 'daily'>('check')
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

  // 該月實際抓到的原始欄位清單（用來判斷折讓等欄位是否存在）
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

  // 依 dateFrom/dateTo 用「單品明細統計表」API（/holy/bk35sql/sales-analysis/item-detail）
  // 以品項名稱關鍵字「消費券」「生日」查詢，把符合的品項交易依日期加總金額，
  // 自動算出每天的消費券生日券金額。
  // 這是另一支後端（Bk35SalesAnalysisController），如果還沒部署，這裡會 catch 掉錯誤，
  // 自動退回「該天顯示 0，卡爾可以手動輸入覆蓋」的舊行為，不會讓整張月報表掛掉。
  const COUPON_BIRTHDAY_KEYWORDS = ['消費券', '生日']

  async function fetchCouponBirthdayAutoMap(year: number, month: number): Promise<Record<string, number>> {
    const mm = String(month).padStart(2, '0')
    const lastDay = new Date(year, month, 0).getDate()
    const from = `${year}-${mm}-01`
    const to = `${year}-${mm}-${String(lastDay).padStart(2, '0')}`

    const dailyTotals: Record<string, number> = {}

    for (const keyword of COUPON_BIRTHDAY_KEYWORDS) {
      try {
        const res = await $fetch<any>(
          `${apiBase.value}/holy/bk35sql/sales-analysis/item-detail`,
            {
              credentials: 'include',
              query: { dateFrom: from, dateTo: to, search: keyword }
            }
        )
        if (res?.error) continue
        const groups = res?.groups ?? []
        for (const g of groups) {
          for (const t of g.transactions ?? []) {
            if (!t?.date) continue
            const d = new Date(t.date)
            if (isNaN(d.getTime())) continue
            const dateKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
            dailyTotals[dateKey] = (dailyTotals[dateKey] ?? 0) + Math.abs(Number(t.amt) || 0)
          }
        }
      } catch {
        // 這支 API 還沒上線或查詢失敗時，忽略該關鍵字，不影響其他關鍵字或整張報表
      }
    }

    return dailyTotals
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

  function buildEmptyReportRow(dateLabel: string, weekday: string, dateKey: string): MonthlyReportRow {
    const row: any = { date: dateLabel, weekday, dateKey }
    for (const cat of REPORT_CATEGORIES) row[cat.key] = 0
    return row as MonthlyReportRow
  }

  // 把整月原始帳單資料依「日期 + POSID」彙總成畫面用的月報表列（含沒有交易的日期，顯示 0）
  // 消費券生日券不從帳單(OCHECK)資料計算，直接採用 autoCouponMap（單品明細自動抓取的金額）。
  function aggregateMonthlyReport(
    rawRows: Record<string, any>[],
    autoCouponMap: Record<string, number>,
    year: number,
    month: number
  ): MonthlyReportRow[] {
    const lastDay = new Date(year, month, 0).getDate()
    const dayMap = new Map<number, MonthlyReportRow>()

    for (let d = 1; d <= lastDay; d++) {
      const weekday = WEEKDAY_LABELS[new Date(year, month - 1, d).getDay()]
      const dateKey = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`
      const row = buildEmptyReportRow(`${month}/${d}`, weekday, dateKey)
      row.couponBirthday = autoCouponMap[dateKey] ?? 0
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
        if (cat.manual) continue // 消費券生日券另外用單品明細自動抓取，不從帳單資料覆蓋
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
      const [rawRows, autoCouponMap] = await Promise.all([
        fetchAllCheckRowsForMonth(reportYear.value, reportMonth.value),
        fetchCouponBirthdayAutoMap(reportYear.value, reportMonth.value)
      ])
      reportRecordCount.value = rawRows.length
      monthlyRows.value = aggregateMonthlyReport(rawRows, autoCouponMap, reportYear.value, reportMonth.value)
    } catch (e: any) {
      monthlyError.value = e?.message ?? '載入月報表失敗'
      monthlyRows.value = []
    } finally {
      monthlyLoading.value = false
    }
  }

  // 找出目前抓不到對應原始欄位的分類（折讓最有可能對不到），畫面上會提醒卡爾確認正確欄位名稱
  // 消費券生日券改用單品明細自動抓取，不需要（也無法）比對 OCHECK 欄位，排除在提醒之外。
  const unresolvedCategories = computed(() => {
    if (reportColumns.value.length === 0) return []
    return REPORT_CATEGORIES.filter(cat => !cat.manual && !(cat.fields ?? []).some(f => reportColumns.value.includes(f)))
  })

  // 單一列的「總計」：即時加總各分類欄位
  function rowTotal(row: MonthlyReportRow): number {
    return REPORT_CATEGORIES.reduce((sum, cat) => sum + (Number((row as any)[cat.key]) || 0), 0)
  }

  // 逐欄合計（依畫面上目前每一列的數值即時加總）
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

      // 列印設定：橫向、縮放至單頁寬高，並明確指定列印範圍，避免多印出空白的第二張
      const lastColLetter = colLetter(totalColIndex)
      ws.pageSetup = {
        orientation: 'landscape',
        fitToPage: true,
        fitToWidth: 1,
        fitToHeight: 1,
        margins: { left: 0.3, right: 0.3, top: 0.4, bottom: 0.3, header: 0, footer: 0 },
        printArea: `A1:${lastColLetter}${totalsRowIndex}`,
        horizontalCentered: true
      } as any

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

  function switchView(v: 'invoice' | 'check' | 'report' | 'staffMeal' | 'daily') {
    view.value = v
    if (v === 'report') {
      if (monthlyRows.value.length === 0 && !monthlyLoading.value) {
        fetchMonthlyReport()
      }
    } else if (v === 'staffMeal') {
      loadStaffMonth()
    } else if (v === 'daily') {
      loadDailyReport()
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

  // ------------------------------------------------------------------
  // 包月員工：對照紙本「田園餐廳 OOO年OO月 包月員工名單」表格
  // （序號／姓名／繳費日期／繳費方式／帳單號碼／發票號碼）。
  // 資料來源：跟月報表的消費券生日券一樣，用「單品明細統計表」API
  // （/holy/bk35sql/sales-analysis/item-detail）以品項名稱關鍵字「包月」查詢，
  // 抓到的每筆交易（帳單號碼、日期、金額）就是一位員工的包月繳費紀錄；
  // 再用帳單號碼去比對「帳單瀏覽」(OCHECK) 判斷用什麼方式付款（現金/信用卡/…），
  // 比對「發票資料」(INVOICE) 抓對應發票號碼，姓名取該筆帳單的 VIPNo（會員編號）。
  // 純顯示、不快取：每次切換月份都直接重新比對，確保資料永遠是最新的，不會有舊資料殘留。
  // ------------------------------------------------------------------
  interface MonthlyStaffEntry {
    id: string
    seq: number
    name: string
    payDate: string // 繳費日期，例如 '7/2'
    payMethod: string // 繳費方式（金額），例如 '現1000'、'現500 卡500'
    checkNo: string // 帳單號碼
    invoiceNo: string // 發票號碼，沒有可填 'X'
  }

  const STAFF_MEAL_ITEM_KEYWORD = '包月'

  // 依 dateFrom/dateTo 把整個月的「發票資料」全部分頁抓完（用來比對帳單號碼 -> 發票號碼）
  async function fetchAllInvoiceRowsForMonth(year: number, month: number): Promise<Record<string, any>[]> {
    const mm = String(month).padStart(2, '0')
    const lastDay = new Date(year, month, 0).getDate()
    const from = `${year}-${mm}-01`
    const to = `${year}-${mm}-${String(lastDay).padStart(2, '0')}`

    let allRows: Record<string, any>[] = []
    let currentPage = 1
    let totalPagesLocal = 1
    const MAX_PAGES = 200

    do {
      const res = await $fetch<DataResponse>(
        `${apiBase.value}/holy/bk35sql/account-inquiry/invoice`,
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
      allRows = allRows.concat(res?.rows ?? [])
      totalPagesLocal = res?.totalPages ?? 1
      currentPage++
    } while (currentPage <= totalPagesLocal && currentPage <= MAX_PAGES)

    return allRows
  }

  // 依帳單的 CashAmt/PayAmt1~4 組出「繳費方式」文字。包月費用固定，現金/信用卡（及其他已知
  // 付款欄位）沒付到的差額，視為用「員工消費券」折抵，例如「現200 消費券800」「卡500 消費券500」。
  function describeStaffPayMethod(checkRow: Record<string, any> | undefined, packageAmt: number): string {
    const cash = Number(checkRow?.CashAmt) || 0
    const credit = Number(checkRow?.PayAmt1) || 0
    const delegatedCollect = Number(checkRow?.PayAmt2) || 0
    const delegatedRemit = Number(checkRow?.PayAmt3) || 0
    const creditAccount = Number(checkRow?.PayAmt4) || 0

    const parts: string[] = []
    if (cash) parts.push(`現${cash.toLocaleString()}`)
    if (credit) parts.push(`卡${credit.toLocaleString()}`)
    if (delegatedCollect) parts.push(`宅收${delegatedCollect.toLocaleString()}`)
    if (delegatedRemit) parts.push(`宅匯${delegatedRemit.toLocaleString()}`)
    if (creditAccount) parts.push(`簽${creditAccount.toLocaleString()}`)

    const knownPaid = cash + credit + delegatedCollect + delegatedRemit + creditAccount
    const coupon = Math.round((packageAmt - knownPaid) * 100) / 100
    if (coupon > 0) parts.push(`消費券${coupon.toLocaleString()}`)

    return parts.join(' ')
  }

  // 用「單品明細統計表」抓品項名稱包含「包月」的交易，比對帳單瀏覽/發票資料，組出整月包月員工名單
  async function fetchStaffMealAutoRows(year: number, month: number): Promise<MonthlyStaffEntry[]> {
    const mm = String(month).padStart(2, '0')
    const lastDay = new Date(year, month, 0).getDate()
    const from = `${year}-${mm}-01`
    const to = `${year}-${mm}-${String(lastDay).padStart(2, '0')}`

    const [itemRes, checkRows, invoiceRows] = await Promise.all([
      $fetch<any>(`${apiBase.value}/holy/bk35sql/sales-analysis/item-detail`, {
        credentials: 'include',
        query: { dateFrom: from, dateTo: to, search: STAFF_MEAL_ITEM_KEYWORD }
      }),
      fetchAllCheckRowsForMonth(year, month),
      fetchAllInvoiceRowsForMonth(year, month)
    ])

    if (itemRes?.error) throw new Error(itemRes.error)

    const checkByNo = new Map<string, Record<string, any>>()
    for (const r of checkRows) {
      if (r.CheckNo) checkByNo.set(String(r.CheckNo), r)
    }
    const invoiceByCheckNo = new Map<string, string>()
    for (const r of invoiceRows) {
      if (r.CheckNo) invoiceByCheckNo.set(String(r.CheckNo), String(r.InvNo ?? '') || 'X')
    }

    const entries: MonthlyStaffEntry[] = []
    const seenCheckNo = new Set<string>()
    let seq = 1
    const groups = itemRes?.groups ?? []
    for (const g of groups) {
      for (const t of g.transactions ?? []) {
        if (!t?.date || !t?.checkNo) continue
        const checkNo = String(t.checkNo)
        if (seenCheckNo.has(checkNo)) continue // 帳單號碼重複（資料庫本身的重複資料），只留第一筆
        seenCheckNo.add(checkNo)

        const d = new Date(t.date)
        const dateLabel = isNaN(d.getTime()) ? String(t.date) : `${d.getMonth() + 1}/${d.getDate()}`
        const checkRow = checkByNo.get(checkNo)
        entries.push({
          id: checkNo,
          seq: seq++,
          name: checkRow?.VIPNo ? String(checkRow.VIPNo) : '',
          payDate: dateLabel,
          payMethod: describeStaffPayMethod(checkRow, Number(t.amt) || 0),
          checkNo,
          invoiceNo: invoiceByCheckNo.get(checkNo) ?? 'X'
        })
      }
    }

    return entries
  }

  const staffYear = ref(new Date().getFullYear())
  const staffMonth = ref(new Date().getMonth() + 1)
  const staffEntries = ref<MonthlyStaffEntry[]>([])
  const staffRocYear = computed(() => staffYear.value - 1911)
  const staffLoading = ref(false)
  const staffError = ref('')

  const staffMonthInputValue = computed({
    get: () => `${staffYear.value}-${String(staffMonth.value).padStart(2, '0')}`,
    set: (v: string) => {
      if (!v) return
      const [y, m] = v.split('-').map(Number)
      if (y && m) {
        staffYear.value = y
        staffMonth.value = m
        loadStaffMonth()
      }
    }
  })

  function staffPrevMonth() {
    if (staffMonth.value === 1) {
      staffMonth.value = 12
      staffYear.value -= 1
    } else {
      staffMonth.value -= 1
    }
    loadStaffMonth()
  }

  function staffNextMonth() {
    if (staffMonth.value === 12) {
      staffMonth.value = 1
      staffYear.value += 1
    } else {
      staffMonth.value += 1
    }
    loadStaffMonth()
  }

  function staffThisMonth() {
    staffYear.value = new Date().getFullYear()
    staffMonth.value = new Date().getMonth() + 1
    loadStaffMonth()
  }

  // 載入該月名單：每次切換月份、進入頁籤都直接重新從系統比對，不快取，
  // 確保姓名/繳費方式等欄位一定是根據目前帳單瀏覽/發票資料最新算出來的，不會有舊資料。
  async function loadStaffMonth() {
    if (dbAttached.value === false) return

    staffLoading.value = true
    staffError.value = ''
    try {
      staffEntries.value = await fetchStaffMealAutoRows(staffYear.value, staffMonth.value)
    } catch (e: any) {
      staffError.value = e?.message ?? '自動比對失敗，請確認網路或稍後再試'
      staffEntries.value = []
    } finally {
      staffLoading.value = false
    }
  }

  // 匯出這個月的包月員工名單（Excel，比照紙本表格欄位）
  async function downloadStaffMealReport() {
    downloading.value = true
    try {
      const ExcelJS = (await import('exceljs')).default
      const wb = new ExcelJS.Workbook()
      const ws = wb.addWorksheet('包月員工名單')

      ws.mergeCells(1, 1, 1, 6)
      const titleCell = ws.getCell(1, 1)
      titleCell.value = `田園餐廳　民國 ${staffRocYear.value} 年 ${staffMonth.value} 月　包月員工名單`
      titleCell.font = { bold: true, size: 14 }
      titleCell.alignment = { horizontal: 'center', vertical: 'middle' }
      ws.getRow(1).height = 24

      const headers = ['序號', '姓名', '繳費日期', '繳費方式', '帳單號碼', '發票號碼']
      headers.forEach((h, i) => {
        const cell = ws.getCell(2, i + 1)
        cell.value = h
        cell.font = { bold: true }
        cell.alignment = { horizontal: 'center', vertical: 'middle' }
        cell.border = THIN_BORDER as any
      })

      staffEntries.value.forEach((e, idx) => {
        const r = 3 + idx
        const values = [e.seq, e.name, e.payDate, e.payMethod, e.checkNo, e.invoiceNo || 'X']
        values.forEach((v, ci) => {
          const cell = ws.getCell(r, ci + 1)
          cell.value = v as any
          cell.alignment = { horizontal: ci === 1 ? 'left' : 'center' }
          cell.border = THIN_BORDER as any
        })
      })

      ws.getColumn(1).width = 8
      ws.getColumn(2).width = 14
      ws.getColumn(3).width = 12
      ws.getColumn(4).width = 16
      ws.getColumn(5).width = 20
      ws.getColumn(6).width = 16

      const lastRow = 2 + staffEntries.value.length
      ws.pageSetup = {
        orientation: 'portrait',
        fitToPage: true,
        fitToWidth: 1,
        fitToHeight: 1,
        margins: { left: 0.4, right: 0.4, top: 0.4, bottom: 0.3, header: 0, footer: 0 },
        printArea: `A1:F${lastRow}`,
        horizontalCentered: true
      } as any

      const buffer = await wb.xlsx.writeBuffer()
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
      triggerBlobDownload(blob, `${staffRocYear.value}年${staffMonth.value}月份包月員工名單.xlsx`)
    } finally {
      downloading.value = false
    }
  }

  // ------------------------------------------------------------------
  // 日報表：對照 POS 匯出的「日報表YYYYMMDD.csv」格式（部門別營收、折價項目、
  // 帳單/發票統計、逐筆明細），完全由「帳單瀏覽」「發票資料」「單品明細統計表」
  // 這三個既有資料源比對組出，不需要新的後端 API。已用實際範例驗證：
  // 折價項目（單品明細裡金額為負數的品項）加總，跟月報表消費券生日券欄位對得起來；
  // 部門別營收合計，跟月報表當天的總計欄位對得起來。
  // 明細表格對照：帳單瀏覽逐筆資料 + 帳單號碼比對發票號碼 + 帳單號碼比對單品明細
  // 折抵金額（券/抵扣）。原始報表的「單號」「桌別」「班」「桌菜」欄位系統無對應資料，
  // 這裡略過；「券/抵扣」是用單品明細負數品項依帳單號碼加總出來的，非原始欄位。
  // ------------------------------------------------------------------
  interface DailyCategoryRow {
    typeName: string
    amt: number
    percent: number
  }

  interface DailyDiscountRow {
    itemName: string
    qty: number
    amt: number // 負值
  }

  interface DailyDetailRow {
    checkNo: string
    invoiceNo: string
    vip: string
    total: number
    cash: number
    credit: number
    delegatedCollect: number
    delegatedRemit: number
    other: number
    coupon: number
  }

  interface DailySummary {
    dateStr: string // 'YYYY-MM-DD'
    dateLabel: string // '2026/07/01(三)'
    categories: DailyCategoryRow[]
    categoryTotal: number
    dedupedRevenueTotal: number // 用去重複後的單品明細重新加總的營收，供比對用
    revenueMismatch: boolean // categoryTotal 跟 dedupedRevenueTotal 對不起來（可能後端聚合有重複列）
    discounts: DailyDiscountRow[]
    discountTotal: number // 負值
    netRevenue: number
    checkCount: number
    avgAmount: number
    posTotal: number
    invoiceCount: number
    invoiceVoidCount: number
    invoiceTotalAmt: number
    invoiceCashAmt: number
    invoiceCreditAmt: number
    invoiceOtherAmt: number
    invoiceRanges: string[]
    details: DailyDetailRow[]
  }

  const dailyDate = ref(todayDateStr())
  const dailyLoading = ref(false)
  const dailyError = ref('')
  const dailySummary = ref<DailySummary | null>(null)

  function todayDateStr() {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  }

  function dailyPrevDay() {
    const d = new Date(dailyDate.value)
    d.setDate(d.getDate() - 1)
    dailyDate.value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    loadDailyReport()
  }

  function dailyNextDay() {
    const d = new Date(dailyDate.value)
    d.setDate(d.getDate() + 1)
    dailyDate.value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    loadDailyReport()
  }

  function dailyToday() {
    dailyDate.value = todayDateStr()
    loadDailyReport()
  }

  // 依 dateFrom/dateTo 把「帳單瀏覽」或「發票資料」全部分頁抓完（通用版，供日報表使用單日區間）
  async function fetchAllRowsForRange(viewName: 'check' | 'invoice', from: string, to: string): Promise<Record<string, any>[]> {
    let allRows: Record<string, any>[] = []
    let currentPage = 1
    let totalPagesLocal = 1
    const MAX_PAGES = 200

    do {
      const res = await $fetch<DataResponse>(
        `${apiBase.value}/holy/bk35sql/account-inquiry/${viewName}`,
          {
            credentials: 'include',
            query: { page: currentPage, search: '', dateFrom: from, dateTo: to, sortOrder: 'asc' }
          }
      )
      if (res?.error) throw new Error(res.error)
      allRows = allRows.concat(res?.rows ?? [])
      totalPagesLocal = res?.totalPages ?? 1
      currentPage++
    } while (currentPage <= totalPagesLocal && currentPage <= MAX_PAGES)

    return allRows
  }

  // 把發票號碼（例如 DQ06213300）依前綴＋連續數字分組成範圍字串（例如 DQ06213300-06213305）
  function buildInvoiceRanges(invNos: string[]): string[] {
    interface Parsed { raw: string; prefix: string; numStr: string; num: number }
    const parsed: Parsed[] = []
    for (const inv of invNos) {
      const m = String(inv).match(/^([A-Za-z]+)(\d+)$/)
      if (!m) continue
      parsed.push({ raw: inv, prefix: m[1], numStr: m[2], num: parseInt(m[2], 10) })
    }
    parsed.sort((a, b) => (a.prefix === b.prefix ? a.num - b.num : a.prefix.localeCompare(b.prefix)))

    const ranges: string[] = []
    let i = 0
    while (i < parsed.length) {
      let j = i
      while (j + 1 < parsed.length && parsed[j + 1].prefix === parsed[i].prefix && parsed[j + 1].num === parsed[j].num + 1) {
        j++
      }
      ranges.push(i === j ? parsed[i].raw : `${parsed[i].prefix}${parsed[i].numStr}-${parsed[j].numStr}`)
      i = j + 1
    }
    return ranges
  }

  const WEEKDAY_LABELS_FULL = ['日', '一', '二', '三', '四', '五', '六']

  // ---- 部門代碼對照：查 xxCODE 資料表（CodeType=KPTYPE），對應 database-setting.vue
  // 用的通用查表端點 /holy/bk35sql/data/{table}?db=...&search=...。
  // category-sales 回傳的 typeName 如果已經是「代碼-中文名稱」（含中文字），直接沿用；
  // 如果只有純代碼，就用這份對照表補上中文名稱。抓不到就原樣顯示代碼，不影響其他功能。
  let deptCodeMapCache: Record<string, string> | null = null

  async function fetchDeptCodeMap(): Promise<Record<string, string>> {
    if (deptCodeMapCache) return deptCodeMapCache
    try {
      let allRows: Record<string, any>[] = []
      let currentPage = 1
      let totalPagesLocal = 1
      const MAX_PAGES = 20
      do {
        const res = await $fetch<DataResponse>(
          `${apiBase.value}/holy/bk35sql/data/xxCODE`,
            { credentials: 'include', query: { db: 'BKSQL', page: currentPage, search: 'KPTYPE' } }
        )
        if (res?.error) throw new Error(res.error)
        allRows = allRows.concat(res?.rows ?? [])
        totalPagesLocal = res?.totalPages ?? 1
        currentPage++
      } while (currentPage <= totalPagesLocal && currentPage <= MAX_PAGES)

      const map: Record<string, string> = {}
      for (const r of allRows) {
        if (String(r.CodeType ?? '').trim() !== 'KPTYPE') continue // search 可能是模糊比對，篩選確保只留部門代碼
        const code = String(r.Code ?? '').trim()
        const dscp = String(r.Dscp ?? '').trim()
        if (code) map[code] = dscp
      }
      deptCodeMapCache = map
      return map
    } catch {
      return {} // 查不到（例如這支端點還沒對這個 db 開放）就沿用原本的 typeName，不影響其他功能
    }
  }

  // 卡爾確認：部門代碼欄位是 RefKPType（對應 ORDERI.RefKPType），不是 typeNo（那個是
  // category-sales 內部的分類序號，純數字，跟 KPTYPE 代碼對不起來）。因為不確定後端
  // 這支 API 實際回傳的欄位大小寫（RefKPType／refKPType／refKpType 都有可能），
  // 呼叫端會把這幾種寫法都傳進來，這裡依序嘗試，第一個有值的採用。
  // typeName 已解析成功時是中文名稱（例如「烘焙」），解析不出來時後端會回傳
  // 「（未分類 TypeNo=N)」這種本身就含中文字的佔位字串——這裡要先排除這種佔位字串，
  // 不能只憑「有沒有中文字」判斷是不是已經是正常名稱，否則會誤判成功放行。
  function resolveDeptName(refKPType: any, typeNo: any, typeName: string, deptMap: Record<string, string>): string {
    const trimmedName = (typeName ?? '').trim()
    const isPlaceholder = /未分類/.test(trimmedName) || trimmedName === ''

    const codeFromRefKPType = refKPType !== undefined && refKPType !== null ? String(refKPType).trim() : ''
    if (codeFromRefKPType && deptMap[codeFromRefKPType]) return `${codeFromRefKPType}-${deptMap[codeFromRefKPType]}`

    if (!isPlaceholder && /[\u4e00-\u9fff]/.test(trimmedName)) return trimmedName // 已經是正常的中文名稱，直接用

    const codeFromNo = typeNo !== undefined && typeNo !== null ? String(typeNo).trim() : ''
    if (codeFromNo && deptMap[codeFromNo]) return `${codeFromNo}-${deptMap[codeFromNo]}`
    if (!isPlaceholder && trimmedName && deptMap[trimmedName]) return `${trimmedName}-${deptMap[trimmedName]}`

    const fallbackCode = codeFromRefKPType || codeFromNo
    return fallbackCode ? `未分類(代碼=${fallbackCode})` : (trimmedName || '未分類')
  }

  async function loadDailyReport() {
    if (dbAttached.value === false) return
    dailyLoading.value = true
    dailyError.value = ''
    dailySummary.value = null
    try {
      const dateStr = dailyDate.value
      const [categoryRes, itemRes, checkRows, invoiceRows, deptMap] = await Promise.all([
        $fetch<any>(`${apiBase.value}/holy/bk35sql/sales-analysis/category-sales`, {
          credentials: 'include',
          query: { dateFrom: dateStr, dateTo: dateStr }
        }),
        $fetch<any>(`${apiBase.value}/holy/bk35sql/sales-analysis/item-detail`, {
          credentials: 'include',
          query: { dateFrom: dateStr, dateTo: dateStr, search: '' }
        }),
        fetchAllRowsForRange('check', dateStr, dateStr),
        fetchAllRowsForRange('invoice', dateStr, dateStr),
        fetchDeptCodeMap()
      ])

      if (categoryRes?.error) throw new Error(categoryRes.error)
      if (itemRes?.error) throw new Error(itemRes.error)

      // ---- 部門別營收 ----
      // category-sales 實測發現會把「折價」也當成一筆未分類項目一起回傳（金額為負數，
      // 跟折價項目的金額對得起來），這在語意上不該算進部門別營收，這裡直接排除負數項目
      // （折價已經在下面「折價項目」區塊單獨呈現），categoryTotal 只加總真正的部門營收。
      const rawCategories = ((categoryRes?.categories ?? []) as any[]).filter(c => (Number(c.totalAmt) || 0) > 0)
      const categoryTotal = rawCategories.reduce((s, c) => s + (Number(c.totalAmt) || 0), 0)
      const categories: DailyCategoryRow[] = rawCategories
        .map(c => ({
          typeName: resolveDeptName(c.RefKPType ?? c.refKPType ?? c.refKpType, c.typeNo, String(c.typeName ?? ''), deptMap),
          amt: Number(c.totalAmt) || 0,
          percent: categoryTotal > 0 ? (Number(c.totalAmt) || 0) / categoryTotal * 100 : 0
        }))
        .filter(c => c.amt !== 0)

      // ---- 單品明細去重複：ORDERI 原始資料觀察到會有完全相同的重複列（同帳單號碼、同品項、
      // 同金額、同數量、同時間戳記），用組合鍵去重複，只算第一筆，比照包月員工頁籤的做法 ----
      const seenItemTxKeys = new Set<string>()
      const dedupedTransactions: { checkNo: string; itemName: string; amt: number; qty: number }[] = []
      const groups = (itemRes?.groups ?? []) as any[]
      for (const g of groups) {
        for (const t of g.transactions ?? []) {
          const itemName = String(g.itemName ?? t?.itemName ?? '')
          const amt = Number(t?.amt) || 0
          const qty = Number(t?.qty) || 0
          const checkNo = t?.checkNo ? String(t.checkNo) : ''
          const txKey = `${checkNo}|${itemName}|${amt}|${qty}|${t?.date ?? ''}`
          if (seenItemTxKeys.has(txKey)) continue // 重複列，只算第一筆
          seenItemTxKeys.add(txKey)
          dedupedTransactions.push({ checkNo, itemName, amt, qty })
        }
      }

      // ---- 折價項目：去重複後的單品明細裡金額為負數的品項，依品項名稱分組；同時記錄每筆帳單號碼對應的折抵金額 ----
      const discountMap = new Map<string, { qty: number; amt: number }>()
      const discountByCheckNo = new Map<string, number>()
      for (const t of dedupedTransactions) {
        if (t.amt >= 0) continue
        const entry = discountMap.get(t.itemName) ?? { qty: 0, amt: 0 }
        entry.qty += t.qty
        entry.amt += t.amt
        discountMap.set(t.itemName, entry)

        if (t.checkNo) {
          discountByCheckNo.set(t.checkNo, (discountByCheckNo.get(t.checkNo) ?? 0) + Math.abs(t.amt))
        }
      }
      const discounts: DailyDiscountRow[] = Array.from(discountMap.entries()).map(([itemName, v]) => ({
        itemName,
        qty: v.qty,
        amt: v.amt
      }))
      const discountTotal = discounts.reduce((s, d) => s + d.amt, 0)

      // ---- 用去重複後的單品明細重新加總一次當天總營收，跟 category-sales 回傳的總額比對 ----
      // category-sales 是後端已經 SUM 好的數字，前端拿不到逐筆明細沒辦法反過去去重複；
      // 這裡只能做「總數對不對得起來」的驗證，對不起來就提醒卡爾去查後端聚合邏輯是否也有重複列問題。
      const dedupedRevenueTotal = dedupedTransactions.filter(t => t.amt > 0).reduce((s, t) => s + t.amt, 0)

      // ---- 帳單瀏覽統計 ----
      const checkCount = checkRows.length
      const posTotal = checkRows.reduce((s, r) => s + (Number(r.CheckAmt) || 0), 0)
      const avgAmount = checkCount > 0 ? posTotal / checkCount : 0

      // ---- 發票資料統計 ----
      const isVoid = (r: Record<string, any>) => {
        const v = String(r.DelMark ?? '').trim().toUpperCase()
        return v === 'Y' || v === '1' || v === 'TRUE'
      }
      const invoiceCount = invoiceRows.length
      const invoiceVoidCount = invoiceRows.filter(isVoid).length
      const validInvoiceRows = invoiceRows.filter(r => !isVoid(r))
      const invoiceTotalAmt = validInvoiceRows.reduce((s, r) => s + (Number(r.InvAmt) || 0), 0)

      const checkByNo = new Map<string, Record<string, any>>()
      for (const r of checkRows) {
        if (r.CheckNo) checkByNo.set(String(r.CheckNo), r)
      }
      let invoiceCashAmt = 0
      let invoiceCreditAmt = 0
      let invoiceOtherAmt = 0
      for (const r of validInvoiceRows) {
        const cr = r.CheckNo ? checkByNo.get(String(r.CheckNo)) : undefined
        const amt = Number(r.InvAmt) || 0
        const cash = Number(cr?.CashAmt) || 0
        const credit = Number(cr?.PayAmt1) || 0
        if (cash >= credit && cash > 0) invoiceCashAmt += amt
        else if (credit > 0) invoiceCreditAmt += amt
        else invoiceOtherAmt += amt
      }
      const invoiceRanges = buildInvoiceRanges(validInvoiceRows.map(r => String(r.InvNo ?? '')).filter(Boolean))

      // ---- 逐筆明細（帳單瀏覽為主，比對發票號碼、單品明細折抵金額） ----
      const invoiceByCheckNo = new Map<string, string>()
      for (const r of invoiceRows) {
        if (r.CheckNo) invoiceByCheckNo.set(String(r.CheckNo), String(r.InvNo ?? '') || 'X')
      }
      const details: DailyDetailRow[] = checkRows
        .map(r => {
          const checkNo = String(r.CheckNo ?? '')
          return {
            checkNo,
            invoiceNo: invoiceByCheckNo.get(checkNo) ?? 'X',
            vip: r.VIPNo ? String(r.VIPNo) : '',
            total: Number(r.CheckAmt) || 0,
            cash: Number(r.CashAmt) || 0,
            credit: Number(r.PayAmt1) || 0,
            delegatedCollect: Number(r.PayAmt2) || 0,
            delegatedRemit: Number(r.PayAmt3) || 0,
            other: Number(r.PayAmt4) || 0,
            coupon: discountByCheckNo.get(checkNo) ?? 0
          }
        })
        .sort((a, b) => a.checkNo.localeCompare(b.checkNo))

      const d = new Date(dateStr)
      const dateLabel = isNaN(d.getTime())
        ? dateStr
        : `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}(${WEEKDAY_LABELS_FULL[d.getDay()]})`

      // 容許 1 元以內的四捨五入誤差，超過才視為真的對不起來
      const revenueMismatch = Math.abs(categoryTotal - dedupedRevenueTotal) > 1

      dailySummary.value = {
        dateStr,
        dateLabel,
        categories,
        categoryTotal,
        dedupedRevenueTotal,
        revenueMismatch,
        discounts,
        discountTotal,
        netRevenue: categoryTotal + discountTotal,
        checkCount,
        avgAmount,
        posTotal,
        invoiceCount,
        invoiceVoidCount,
        invoiceTotalAmt,
        invoiceCashAmt,
        invoiceCreditAmt,
        invoiceOtherAmt,
        invoiceRanges,
        details
      }
    } catch (e: any) {
      dailyError.value = e?.message ?? '載入日報表失敗'
    } finally {
      dailyLoading.value = false
    }
  }

  function formatDailyMoney(v: number) {
    return Math.round(v).toLocaleString()
  }

  // 匯出日報表（Excel，比照 POS 匯出格式的段落結構，並加上標題/顏色/框線）
  async function downloadDailyReport() {
    const s = dailySummary.value
    if (!s) return
    downloading.value = true
    try {
      const ExcelJS = (await import('exceljs')).default
      const wb = new ExcelJS.Workbook()
      const ws = wb.addWorksheet('日報表')

      let row = 1
      const titleCell = ws.getCell(row, 1)
      ws.mergeCells(row, 1, row, 3)
      titleCell.value = `日報表　營業日: ${s.dateLabel}`
      titleCell.font = { bold: true, size: 14 }
      titleCell.alignment = { horizontal: 'center' }
      row += 2

      ws.getCell(row, 1).value = '部門別'
      ws.getCell(row, 2).value = '金額'
      ws.getCell(row, 3).value = '比率'
      ws.getRow(row).font = { bold: true }
      row++
      for (const c of s.categories) {
        ws.getCell(row, 1).value = c.typeName
        ws.getCell(row, 2).value = c.amt
        ws.getCell(row, 2).numFmt = '#,##0'
        ws.getCell(row, 3).value = `${String(Math.round(c.percent)).padStart(2, '0')}%`
        row++
      }
      ws.getCell(row, 1).value = '各部門合計'
      ws.getCell(row, 2).value = s.categoryTotal
      ws.getCell(row, 2).numFmt = '#,##0'
      ws.getRow(row).font = { bold: true }
      row += 2

      if (s.discounts.length > 0) {
        ws.getCell(row, 1).value = '折價項目'
        ws.getCell(row, 2).value = '數量'
        ws.getCell(row, 3).value = '金額'
        ws.getRow(row).font = { bold: true }
        row++
        for (const dItem of s.discounts) {
          ws.getCell(row, 1).value = dItem.itemName
          ws.getCell(row, 2).value = dItem.qty
          ws.getCell(row, 3).value = dItem.amt
          ws.getCell(row, 3).numFmt = '#,##0'
          row++
        }
        ws.getCell(row, 1).value = '折價合計'
        ws.getCell(row, 3).value = s.discountTotal
        ws.getCell(row, 3).numFmt = '#,##0'
        ws.getRow(row).font = { bold: true }
        row += 2
      }

      const summaryLines: [string, number | string][] = [
        ['營收淨額', s.netRevenue],
        ['帳單數', s.checkCount],
        ['平均金額', Math.round(s.avgAmount)],
        ['POS結帳總額', s.posTotal],
        ['發票張數(含作廢)', s.invoiceCount],
        ['作廢張數', s.invoiceVoidCount],
        ['發票總計金額', s.invoiceTotalAmt],
        ['現金發票金額', s.invoiceCashAmt],
        ['刷卡發票金額', s.invoiceCreditAmt],
        ['其它發票金額', s.invoiceOtherAmt]
      ]
      for (const [label, val] of summaryLines) {
        ws.getCell(row, 1).value = label
        ws.getCell(row, 1).font = { bold: true }
        ws.getCell(row, 2).value = val
        if (typeof val === 'number') ws.getCell(row, 2).numFmt = '#,##0'
        row++
      }
      row++

      if (s.invoiceRanges.length > 0) {
        ws.getCell(row, 1).value = '發票起迄號碼'
        ws.getRow(row).font = { bold: true }
        row++
        for (const range of s.invoiceRanges) {
          ws.getCell(row, 1).value = range
          row++
        }
        row++
      }

      const detailHeaderRow = row
      const detailHeaders = ['帳單號碼', '發票號', 'VIP', '收款金額', '現金', '信用卡', '宅配代收', '宅配匯款', '其它', '券/抵扣']
      detailHeaders.forEach((h, i) => {
        const cell = ws.getCell(detailHeaderRow, i + 1)
        cell.value = h
        cell.font = { bold: true }
        cell.alignment = { horizontal: 'center' }
        cell.border = THIN_BORDER as any
      })
      row++
      for (const d of s.details) {
        const values = [d.checkNo, d.invoiceNo, d.vip, d.total, d.cash, d.credit, d.delegatedCollect, d.delegatedRemit, d.other, d.coupon]
        values.forEach((v, i) => {
          const cell = ws.getCell(row, i + 1)
          cell.value = v as any
          if (i >= 3) cell.numFmt = '#,##0'
          cell.border = THIN_BORDER as any
        })
        row++
      }
      const detailTotalsRow = row
      ws.getCell(detailTotalsRow, 1).value = '合計'
      ws.getCell(detailTotalsRow, 1).font = { bold: true }
      const sumCols: (keyof DailyDetailRow)[] = ['total', 'cash', 'credit', 'delegatedCollect', 'delegatedRemit', 'other', 'coupon']
      sumCols.forEach((key, i) => {
        const cell = ws.getCell(detailTotalsRow, 4 + i)
        cell.value = s.details.reduce((sum, d) => sum + (d[key] as number), 0)
        cell.numFmt = '#,##0'
        cell.font = { bold: true }
      })

      ws.getColumn(1).width = 16
      ws.getColumn(2).width = 14
      ws.getColumn(3).width = 12
      for (let i = 4; i <= 10; i++) ws.getColumn(i).width = 12

      ws.pageSetup = {
        orientation: 'portrait',
        fitToPage: true,
        fitToWidth: 1,
        fitToHeight: 0,
        margins: { left: 0.3, right: 0.3, top: 0.3, bottom: 0.3, header: 0, footer: 0 }
      } as any

      const buffer = await wb.xlsx.writeBuffer()
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
      triggerBlobDownload(blob, `日報表${s.dateStr.replaceAll('-', '')}.xlsx`)
    } finally {
      downloading.value = false
    }
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
        <button
          :class="['sw-tab', { active: view === 'staffMeal' }]"
          @click="switchView('staffMeal')"
        >
          包月員工
        </button>
        <button
          :class="['sw-tab', { active: view === 'daily' }]"
          @click="switchView('daily')"
        >
          日報表
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
        v-if="view === 'check' || view === 'invoice'"
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
        v-if="(view === 'check' || view === 'invoice') && posidFilter"
        class="hint-banner"
      >
        已依 POSID（{{ POSID_LABELS[posidFilter] }}）篩選：系統會先抓取符合搜尋/時段條件的完整資料再依 POSID 篩選及分頁，若時段範圍很大讀取會較久。
      </p>

      <div
        v-if="view === 'check' || view === 'invoice'"
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
          「消費券生日券」欄位會自動從「單品明細統計表」抓取品項名稱包含「消費券」「生日」的交易金額加總（模糊比對）。
        </p>

        <div class="download-bar">
          <span class="legend-label">下載報表（Excel，含標題/顏色/合計公式）：</span>
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
                {{ formatReportMoney((row as any)[cat.key]) }}
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

      <!-- 包月員工：自動比對品項明細 + 帳單瀏覽 + 發票資料，純顯示，不快取 -->
      <div
        v-else-if="view === 'staffMeal'"
        class="report-panel"
      >
        <div class="month-switch">
          <button
            class="btn-ghost small"
            title="上個月"
            @click="staffPrevMonth"
          >
            ‹ 上月
          </button>
          <input
            v-model="staffMonthInputValue"
            type="month"
            class="month-input"
          >
          <button
            class="btn-ghost small"
            title="下個月"
            @click="staffNextMonth"
          >
            下月 ›
          </button>
          <button
            class="btn-ghost small"
            @click="staffThisMonth"
          >
            本月
          </button>
          <span
            v-if="!staffLoading"
            class="record-count-hint"
          >（共 {{ staffEntries.length }} 人）</span>
        </div>

        <p class="hint-banner">
          「繳費日期/帳單號碼/金額」自動用「單品明細統計表」比對品項名稱含「包月」的交易取得，
          「發票號碼」比對發票資料，「姓名」取帳單瀏覽(OCHECK)的會員編號(VIPNo)帶入；如果該筆帳單
          沒有登記會員編號，姓名會是空白。「繳費方式」用帳單的現金/信用卡欄位組出，包月費用（品項金額）
          扣掉現金/信用卡付的部分，差額視為用員工消費券折抵，例如「現200 消費券800」。
          每次切換月份都會重新比對，資料永遠是最新的。
        </p>

        <p
          v-if="staffError"
          class="hint-banner warn-banner"
        >
          ⚠️ {{ staffError }}
        </p>

        <div class="download-bar">
          <button
            class="btn-ghost small"
            :disabled="staffLoading"
            @click="loadStaffMonth"
          >
            {{ staffLoading ? '比對中…' : '重新整理' }}
          </button>
          <button
            class="btn-primary small"
            :disabled="downloading || staffEntries.length === 0"
            @click="downloadStaffMealReport"
          >
            {{ downloading ? '產生中…' : '下載本月名單（Excel）' }}
          </button>
        </div>

        <div
          v-if="staffLoading"
          class="loading"
        >
          比對中…
        </div>

        <div
          v-else
          class="table-wrap"
        >
          <table class="data-table report-table staff-meal-table">
            <thead>
            <tr>
              <th>序號</th>
              <th>姓名</th>
              <th>繳費日期</th>
              <th>繳費方式</th>
              <th>帳單號碼</th>
              <th>發票號碼</th>
            </tr>
            </thead>
            <tbody>
            <tr
              v-for="entry in staffEntries"
              :key="entry.id"
            >
              <td class="seq-cell">
                {{ entry.seq }}
              </td>
              <td>{{ entry.name || '-' }}</td>
              <td>{{ entry.payDate }}</td>
              <td>{{ entry.payMethod }}</td>
              <td>{{ entry.checkNo }}</td>
              <td>{{ entry.invoiceNo }}</td>
            </tr>
            <tr v-if="staffEntries.length === 0">
              <td
                colspan="6"
                class="empty-cell"
              >
                本月尚無包月繳費紀錄
              </td>
            </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- 日報表：比對帳單瀏覽/發票資料/單品明細組出，比照 POS 匯出格式 -->
      <div
        v-else-if="view === 'daily'"
        class="report-panel"
      >
        <div class="month-switch">
          <button
            class="btn-ghost small"
            title="前一天"
            @click="dailyPrevDay"
          >
            ‹ 前一天
          </button>
          <input
            v-model="dailyDate"
            type="date"
            class="month-input"
            @change="loadDailyReport"
          >
          <button
            class="btn-ghost small"
            title="後一天"
            @click="dailyNextDay"
          >
            後一天 ›
          </button>
          <button
            class="btn-ghost small"
            @click="dailyToday"
          >
            今天
          </button>
        </div>

        <p class="hint-banner">
          此頁完全由「帳單瀏覽」「發票資料」「單品明細統計表」比對組出，非原始 POS 日報表匯出檔：
          部門別營收來自類別銷售統計（已排除金額為負數的項目，那是折價，不是部門，改顯示在下面「折價項目」），
          名稱是用 RefKPType 部門代碼查 xxCODE 資料表（CodeType=KPTYPE）補上中文名稱，查不到會顯示
          「未分類(代碼=X)」，代表這個代碼在 xxCODE 裡沒有對應資料，需要請後端/資料庫確認；折價項目是
          單品明細裡金額為負的品項，明細表格的「券/抵扣」是依帳單號碼加總折價品項算出的，原始報表的
          「單號」「桌別」「班」「桌菜」欄位無對應資料來源，這裡沒有呈現。
        </p>

        <p
          v-if="dailyError"
          class="hint-banner warn-banner"
        >
          ⚠️ {{ dailyError }}
        </p>

        <p
          v-if="dailySummary && dailySummary.revenueMismatch"
          class="hint-banner warn-banner"
        >
          ⚠️ 部門別營收合計（{{ formatDailyMoney(dailySummary.categoryTotal) }}）跟用單品明細去重複後重新加總的營收
          （{{ formatDailyMoney(dailySummary.dedupedRevenueTotal) }}）對不起來，差 {{ formatDailyMoney(Math.abs(dailySummary.categoryTotal - dailySummary.dedupedRevenueTotal)) }} 元。
          折價項目已經去重複，但「部門別營收」是後端 category-sales 直接算好的總數，前端沒有逐筆資料可以去重複，
          可能是後端聚合時也把重複列一起算進去了，建議請後端檢查 ORDERI 這天是否有重複資料。
        </p>

        <div class="download-bar">
          <button
            class="btn-ghost small"
            :disabled="dailyLoading"
            @click="loadDailyReport"
          >
            {{ dailyLoading ? '載入中…' : '重新整理' }}
          </button>
          <button
            class="btn-primary small"
            :disabled="downloading || !dailySummary"
            @click="downloadDailyReport"
          >
            {{ downloading ? '產生中…' : '下載日報表（Excel）' }}
          </button>
        </div>

        <div
          v-if="dailyLoading"
          class="loading"
        >
          載入中…
        </div>

        <template v-else-if="dailySummary">
          <h3 class="daily-section-title">
            部門別營收
          </h3>
          <div class="table-wrap">
            <table class="data-table report-table">
              <thead>
              <tr>
                <th>部門別</th>
                <th>金額</th>
                <th>比率</th>
              </tr>
              </thead>
              <tbody>
              <tr
                v-for="c in dailySummary.categories"
                :key="c.typeName"
              >
                <td class="text-left">
                  {{ c.typeName }}
                </td>
                <td>{{ formatDailyMoney(c.amt) }}</td>
                <td>{{ Math.round(c.percent) }}%</td>
              </tr>
              <tr v-if="dailySummary.categories.length === 0">
                <td
                  colspan="3"
                  class="empty-cell"
                >
                  當天無營收資料
                </td>
              </tr>
              </tbody>
              <tfoot v-if="dailySummary.categories.length > 0">
              <tr class="totals-row">
                <td class="text-left">
                  各部門合計
                </td>
                <td>{{ formatDailyMoney(dailySummary.categoryTotal) }}</td>
                <td></td>
              </tr>
              </tfoot>
            </table>
          </div>

          <template v-if="dailySummary.discounts.length > 0">
            <h3 class="daily-section-title">
              折價項目
            </h3>
            <div class="table-wrap">
              <table class="data-table report-table">
                <thead>
                <tr>
                  <th>項目</th>
                  <th>數量</th>
                  <th>金額</th>
                </tr>
                </thead>
                <tbody>
                <tr
                  v-for="dItem in dailySummary.discounts"
                  :key="dItem.itemName"
                >
                  <td class="text-left">
                    {{ dItem.itemName }}
                  </td>
                  <td>{{ dItem.qty }}</td>
                  <td>{{ formatDailyMoney(dItem.amt) }}</td>
                </tr>
                </tbody>
                <tfoot>
                <tr class="totals-row">
                  <td
                    colspan="2"
                    class="text-left"
                  >
                    折價合計
                  </td>
                  <td>{{ formatDailyMoney(dailySummary.discountTotal) }}</td>
                </tr>
                </tfoot>
              </table>
            </div>
          </template>

          <h3 class="daily-section-title">
            營收總覽
          </h3>
          <div class="daily-summary-grid">
            <div class="daily-summary-item">
              <span class="daily-summary-label">營收淨額</span>
              <span class="daily-summary-value">{{ formatDailyMoney(dailySummary.netRevenue) }}</span>
            </div>
            <div class="daily-summary-item">
              <span class="daily-summary-label">帳單數</span>
              <span class="daily-summary-value">{{ dailySummary.checkCount }}</span>
            </div>
            <div class="daily-summary-item">
              <span class="daily-summary-label">平均金額</span>
              <span class="daily-summary-value">{{ formatDailyMoney(dailySummary.avgAmount) }}</span>
            </div>
            <div class="daily-summary-item">
              <span class="daily-summary-label">POS結帳總額</span>
              <span class="daily-summary-value">{{ formatDailyMoney(dailySummary.posTotal) }}</span>
            </div>
            <div class="daily-summary-item">
              <span class="daily-summary-label">發票張數(含作廢)</span>
              <span class="daily-summary-value">{{ dailySummary.invoiceCount }}</span>
            </div>
            <div class="daily-summary-item">
              <span class="daily-summary-label">作廢張數</span>
              <span class="daily-summary-value">{{ dailySummary.invoiceVoidCount }}</span>
            </div>
            <div class="daily-summary-item">
              <span class="daily-summary-label">發票總計金額</span>
              <span class="daily-summary-value">{{ formatDailyMoney(dailySummary.invoiceTotalAmt) }}</span>
            </div>
            <div class="daily-summary-item">
              <span class="daily-summary-label">現金發票金額</span>
              <span class="daily-summary-value">{{ formatDailyMoney(dailySummary.invoiceCashAmt) }}</span>
            </div>
            <div class="daily-summary-item">
              <span class="daily-summary-label">刷卡發票金額</span>
              <span class="daily-summary-value">{{ formatDailyMoney(dailySummary.invoiceCreditAmt) }}</span>
            </div>
            <div class="daily-summary-item">
              <span class="daily-summary-label">其它發票金額</span>
              <span class="daily-summary-value">{{ formatDailyMoney(dailySummary.invoiceOtherAmt) }}</span>
            </div>
          </div>

          <template v-if="dailySummary.invoiceRanges.length > 0">
            <h3 class="daily-section-title">
              發票起迄號碼
            </h3>
            <div class="invoice-ranges">
              <span
                v-for="range in dailySummary.invoiceRanges"
                :key="range"
                class="invoice-range-chip"
              >{{ range }}</span>
            </div>
          </template>

          <h3 class="daily-section-title">
            明細（{{ dailySummary.details.length }} 筆）
          </h3>
          <div class="table-wrap">
            <table class="data-table report-table">
              <thead>
              <tr>
                <th>帳單號碼</th>
                <th>發票號</th>
                <th>VIP</th>
                <th>收款金額</th>
                <th>現金</th>
                <th>信用卡</th>
                <th>宅配代收</th>
                <th>宅配匯款</th>
                <th>其它</th>
                <th>券/抵扣</th>
              </tr>
              </thead>
              <tbody>
              <tr
                v-for="d in dailySummary.details"
                :key="d.checkNo"
              >
                <td>{{ d.checkNo }}</td>
                <td>{{ d.invoiceNo }}</td>
                <td>{{ d.vip || '-' }}</td>
                <td>{{ formatDailyMoney(d.total) }}</td>
                <td>{{ formatDailyMoney(d.cash) }}</td>
                <td>{{ formatDailyMoney(d.credit) }}</td>
                <td>{{ formatDailyMoney(d.delegatedCollect) }}</td>
                <td>{{ formatDailyMoney(d.delegatedRemit) }}</td>
                <td>{{ formatDailyMoney(d.other) }}</td>
                <td>{{ formatDailyMoney(d.coupon) }}</td>
              </tr>
              <tr v-if="dailySummary.details.length === 0">
                <td
                  colspan="10"
                  class="empty-cell"
                >
                  當天無帳單資料
                </td>
              </tr>
              </tbody>
            </table>
          </div>
        </template>
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
        v-if="(view === 'check' || view === 'invoice') && totalPages > 1"
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

  .staff-meal-table th, .staff-meal-table td { text-align: center; }
  .staff-meal-table .seq-cell { font-weight: 600; color: var(--text-muted); }

  .text-left { text-align: left !important; }
  .daily-section-title { margin: 4px 0 0; font-size: 15px; font-weight: 700; color: var(--text); }
  .daily-summary-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap: 8px; }
  .daily-summary-item { display: flex; flex-direction: column; gap: 2px; padding: 10px 12px; background: var(--surface2); border: 1px solid var(--border-light); border-radius: var(--radius-sm); }
  .daily-summary-label { font-size: 12px; color: var(--text-hint); }
  .daily-summary-value { font-size: 16px; font-weight: 700; color: var(--text); }
  .invoice-ranges { display: flex; flex-wrap: wrap; gap: 6px; }
  .invoice-range-chip { font-size: 12px; padding: 4px 10px; background: var(--surface2); border: 1px solid var(--border-light); border-radius: 999px; color: var(--text-muted); font-variant-numeric: tabular-nums; }


  .pagination { display: flex; align-items: center; gap: 12px; justify-content: center; }
  .page-btn { padding: 6px 14px; background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius-sm); font-size: 13px; cursor: pointer; color: var(--text); }
  .page-btn:hover:not(:disabled) { background: var(--accent-light); border-color: var(--accent); color: var(--accent); }
  .page-btn:disabled { opacity: 0.4; cursor: not-allowed; }
  .page-info { font-size: 13px; color: var(--text-muted); }
</style>
