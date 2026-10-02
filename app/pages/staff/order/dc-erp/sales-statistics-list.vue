<script setup>
  import { reactive, ref, computed, onMounted, onBeforeUnmount } from 'vue'

  // 「銷貨統計明細」：對應原網站 統計報表 > 銷貨統計報表 > 銷貨統計明細
  // （/COAERP/SalesStatistics/SearchSalesStatisticsList），目前只做
  // 「客戶日期銷售品項明細表-(A4)」這一張報表。
  //
  // 原網站這張報表只提供「列印」「EXCEL」兩種輸出，沒有資料 API，所以：
  //   - 網頁顯示：後端用查詢條件跟原網站要 Excel，解析成 JSON 再畫表格
  //     （sales-statistics-list.get.ts）
  //   - 下載 Excel：後端把原網站的 Excel 原封不動轉給瀏覽器
  //     （sales-statistics-list-excel.get.ts），跟原網站下載的檔案一模一樣
  //   - 列印 / 存 PDF（整理版）：用畫面上已查詢到的資料（含品項篩選、目前的
  //     逐筆明細/依品項彙總檢視）產生一份 A4 列印用的頁面，交給瀏覽器的列印
  //     對話框，選「另存為 PDF」就是 PDF。版面跟網頁一致（依客戶分組、小計、
  //     總計），不再打原網站。不用 jsPDF 之類的套件直接產生 PDF 檔，是因為
  //     中文需要另外嵌入好幾 MB 的字型；交給瀏覽器列印，文字可選取、檔案小、
  //     中文也不會變方塊。
  //   - 常用組合：把「客戶代號＋所屬類別」存成常用（localStorage），下個月
  //     選好月份後按「下載常用 Excel」，就依序把每個常用組合的原網站 Excel
  //     抓回來，打包成一個 zip 下載（用 JSZip，只在瀏覽器端動態載入）。
  //     打包成 zip 而不是連續觸發多個下載，是因為瀏覽器會擋連續自動下載。
  //   - 顯示常用：依序查詢每個常用組合，結果依組合分段顯示在同一頁（一邊查
  //     一邊顯示），每段預設收合只顯示標題與小計，點標題展開明細；品項篩選、
  //     逐筆/彙總切換、列印/存 PDF 都適用（列印一律印完整內容，不管畫面上
  //     有沒有展開），列印時每個組合從新的一頁開始，方便分開交給不同人。
  //   - 存成常用：直接用「客戶代號｜類別」當名稱存，不跳輸入框。
  // 表單欄位、報表代碼、Excel 格式的核對說明見
  // server/utils/dc-erp/salesStatisticsList.ts。
  //
  // 查詢條件比照原網站表單；選項（場別/母公司/客戶類別/簽核狀態/單據類型）
  // 跟預設期間從原網站查詢頁解析（sales-statistics-list-options.get.ts）。
  // 日期用瀏覽器原生日期選單（西元），送到原網站時轉成 yyyy/MM/dd。
  //
  // 「所屬類別」：原網站這張報表沒有類別條件，只有品項代號起迄。這裡用
  // 「進階品項管理」設置的本地類別快取（跟訂貨單新增品項燈箱同一份，
  // Spring Boot DcErpProductImageController /holy/dc-erp/product-image/list，
  // 格式 { code: { images, productClass } }）列出類別，選了之後把這個類別
  // 底下所有品項代號的最小/最大值帶入「品項代號」起迄，交給原網站查詢。
  //   - 選大類（例如「a乾料類」）會包含底下所有小類（「a乾料類>aa米類」…）
  //   - 代號比大小不分大小寫（AA021 跟 aa002 同一類），跟原網站資料庫一樣
  //   - 起迄是一個範圍，如果範圍中間夾到別類的品項代號，會在下面提示有幾個，
  //     那些品項也會出現在結果裡（目前觀察同類代號共用字首，通常不會夾到）
  //   - 帶入後仍可手動修改代號；要先在「進階品項管理」按過「設置所屬類別」
  //     才有類別資料
  definePageMeta({
    layout: 'staff',
    requiredPermission: 'order.dc-erp'
  })

  const filters = reactive({
    dateS: '',
    dateE: '',
    // 客戶代號只做單一客戶：送出時起迄都帶同一個代號（空白＝全部客戶）
    firmCode: '',
    workPlaceS: '',
    workPlaceE: '',
    prodCodeS: '',
    prodCodeE: '',
    parentFirmID: '0',
    firmType: '不拘',
    saleSlipData: true,
    saleReturnData: true,
    signState: 'sign',
    formType: '-1'
  })

  const options = reactive({
    workPlace: [],
    parentFirm: [],
    firmType: [],
    signState: [],
    formType: []
  })
  const companyId = ref('')

  const filterExpanded = ref(false)
  const optionsLoading = ref(true)
  const loading = ref(false)
  const downloading = ref(false)
  const errorMessage = ref('')

  const report = ref(null) // { title, periodText, customers, grandTotal }
  // 「顯示常用」模式：依常用組合分段顯示（見 handleShowPresets）
  const showingPresets = ref(false)
  const presetResults = ref([]) // [{ preset, report, error }]
  const presetLoadingText = ref('')
  // 顯示常用時已展開的段落 key（預設全部收合）
  const expandedKeys = ref([])
  const isExpanded = key => expandedKeys.value.includes(key)
  function toggleSection(key) {
    expandedKeys.value = isExpanded(key)
      ? expandedKeys.value.filter(k => k !== key)
      : [...expandedKeys.value, key]
  }
  const viewMode = ref('detail') // 'detail' 逐筆明細 | 'summary' 依品項彙總
  const keyword = ref('') // 前端篩選：品項名稱

  function selectedValue(list, fallback) {
    const s = list.find(o => o.selected)
    return s ? s.value : fallback
  }

  async function loadOptions() {
    optionsLoading.value = true
    try {
      const data = await $fetch('/api/dc-erp/sales-statistics-list-options')
      companyId.value = data.companyId
      Object.assign(options, data.options)
      filters.dateS = data.dateS || filters.dateS
      filters.dateE = data.dateE || filters.dateE
      filters.parentFirmID = selectedValue(options.parentFirm, '0')
      filters.firmType = selectedValue(options.firmType, '不拘')
      filters.signState = selectedValue(options.signState, 'sign')
      filters.formType = selectedValue(options.formType, '-1')
    } catch (err) {
      if (err?.statusCode === 401 || err?.response?.status === 401) {
        await navigateTo('/staff/order/dc-erp/login')
        return
      }
      errorMessage.value = err?.data?.statusMessage || '無法載入查詢條件，請稍後再試'
    } finally {
      optionsLoading.value = false
    }
  }

  // ---------- 客戶代號使用紀錄（localStorage） ----------
  // 跟訂貨單列表「客戶名稱」、銷貨單列表關鍵字、新增訂貨單「客戶」共用同一把
  // key（純字串陣列，最新一筆在最前面，最多 10 筆，跟 DcErpKeywordSearchInput
  // 內部格式一樣），所以在任何一頁用過的客戶代號，這裡的下拉建議也會出現。
  // 送出查詢、下載 Excel、列印時都會記錄；頁面開啟時自動帶入最近一筆。
  const CUSTOMER_HISTORY_KEY = 'dc-erp-sales-orders-customer-name-history'
  const MAX_CUSTOMER_HISTORY = 10

  function loadCustomerHistory() {
    if (typeof window === 'undefined') return []
    try {
      const raw = window.localStorage.getItem(CUSTOMER_HISTORY_KEY)
      const list = raw ? JSON.parse(raw) : []
      return Array.isArray(list) ? list : []
    } catch {
      return []
    }
  }

  function saveCustomerHistory(value) {
    const v = (value || '').trim()
    if (!v || typeof window === 'undefined') return
    try {
      const next = [v, ...loadCustomerHistory().filter(c => c !== v)].slice(0, MAX_CUSTOMER_HISTORY)
      window.localStorage.setItem(CUSTOMER_HISTORY_KEY, JSON.stringify(next))
    } catch {
      // 存不進去（例如無痕模式空間滿了）就算了，不影響查詢本身
    }
  }

  // ---------- 月份 ↔ 期間 ----------
  // 基本條件用月份（<input type="month">，值 yyyy-MM），選了就把期間設成
  // 該月 1 日～月底。「更多條件」裡仍可自訂期間；自訂的期間剛好是某個完整
  // 月份時，月份欄會顯示那個月，不是完整月份就顯示空白。
  const pad2 = n => String(n).padStart(2, '0')
  const month = computed({
    get() {
      const m = /^(\d{4})-(\d{2})-01$/.exec(filters.dateS)
      if (!m) return ''
      const last = new Date(Number(m[1]), Number(m[2]), 0).getDate()
      return filters.dateE === `${m[1]}-${m[2]}-${pad2(last)}` ? `${m[1]}-${m[2]}` : ''
    },
    set(v) {
      const m = /^(\d{4})-(\d{2})$/.exec(v || '')
      if (!m) return
      const last = new Date(Number(m[1]), Number(m[2]), 0).getDate()
      filters.dateS = `${m[1]}-${m[2]}-01`
      filters.dateE = `${m[1]}-${m[2]}-${pad2(last)}`
    }
  })

  // 品項起始代號輸入後，迄止還空著就自動帶入同一個代號
  // （查單一客戶最常見；要查區間再自己改迄止），比照原網站日期起始填完
  // 自動帶入結束日的做法。
  function fillEndIfEmpty(startKey, endKey) {
    if (filters[startKey] && !filters[endKey]) filters[endKey] = filters[startKey]
  }

  function validate() {
    if (!filters.dateS || !filters.dateE) {
      errorMessage.value = '請填寫期間'
      return false
    }
    if (filters.dateS > filters.dateE) {
      errorMessage.value = '期間起始日不能晚於結束日'
      return false
    }
    if (!filters.saleSlipData && !filters.saleReturnData) {
      errorMessage.value = '單據來源至少要勾選一個'
      return false
    }
    return true
  }

  // overrides：常用組合批次下載時，用組合自己的客戶代號／品項代號範圍
  // 覆蓋畫面上的值，其他條件（月份、簽核狀態…）沿用畫面設定
  function buildQuery(overrides = {}) {
    const firmCode = (overrides.firmCode ?? filters.firmCode).trim()
    return {
      companyId: companyId.value,
      dateS: filters.dateS,
      dateE: filters.dateE,
      firmCodeS: firmCode,
      firmCodeE: firmCode,
      workPlaceS: filters.workPlaceS,
      workPlaceE: filters.workPlaceE,
      prodCodeS: (overrides.prodCodeS ?? filters.prodCodeS).trim(),
      prodCodeE: (overrides.prodCodeE ?? filters.prodCodeE).trim(),
      parentFirmID: filters.parentFirmID,
      firmType: filters.firmType,
      saleSlipData: String(filters.saleSlipData),
      saleReturnData: String(filters.saleReturnData),
      signState: filters.signState,
      formType: filters.formType
    }
  }

  async function handleSearch() {
    errorMessage.value = ''
    if (!validate()) return
    saveCustomerHistory(filters.firmCode)
    showingPresets.value = false
    loading.value = true
    try {
      report.value = await $fetch('/api/dc-erp/sales-statistics-list', { query: buildQuery() })
    } catch (err) {
      if (err?.statusCode === 401 || err?.response?.status === 401) {
        await navigateTo('/staff/order/dc-erp/login')
        return
      }
      report.value = null
      errorMessage.value = err?.data?.statusMessage || '查詢失敗，請稍後再試'
    } finally {
      loading.value = false
    }
  }

  // 下載用原生 fetch 拿 blob：失敗時可以把錯誤訊息顯示在頁面上，
  // 不會跳到一頁 JSON 錯誤；檔名照原網站回傳的 Content-Disposition。
  // 跟後端拿原網站的 Excel（blob + 原網站給的檔名），失敗時丟出帶訊息的 Error
  async function fetchExcelBlob(query) {
    const qs = new URLSearchParams(query).toString()
    const res = await fetch(`/api/dc-erp/sales-statistics-list-excel?${qs}`, { credentials: 'include' })
    if (res.status === 401) {
      const err = new Error('登入已逾時，請重新登入')
      err.unauthorized = true
      throw err
    }
    if (!res.ok) {
      let msg = '下載失敗，請稍後再試'
      try {
        const data = await res.json()
        msg = data?.statusMessage || data?.message || msg
      } catch { /* 不是 JSON 就用預設訊息 */ }
      throw new Error(msg)
    }
    const blob = await res.blob()
    const disposition = res.headers.get('content-disposition') || ''
    let filename = '客戶日期銷售品項明細表.xls'
    const star = disposition.match(/filename\*=UTF-8''([^;]+)/i)
    if (star) {
      try { filename = decodeURIComponent(star[1]) } catch { /* 用預設檔名 */ }
    }
    return { blob, filename }
  }

  function saveBlob(blob, filename) {
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    a.remove()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }

  // 下載用原生 fetch 拿 blob：失敗時可以把錯誤訊息顯示在頁面上，
  // 不會跳到一頁 JSON 錯誤；檔名照原網站回傳的 Content-Disposition。
  async function handleDownload() {
    errorMessage.value = ''
    if (!validate()) return
    saveCustomerHistory(filters.firmCode)
    downloading.value = true
    try {
      const { blob, filename } = await fetchExcelBlob(buildQuery())
      saveBlob(blob, filename)
    } catch (err) {
      if (err?.unauthorized) {
        await navigateTo('/staff/order/dc-erp/login')
        return
      }
      errorMessage.value = err?.message || '下載失敗，請稍後再試'
    } finally {
      downloading.value = false
    }
  }

  // ---------- 列印 / 存 PDF（整理版） ----------
  // 做法：把報表組成一份獨立的 HTML（固定淺色、A4 版面），寫進隱藏的
  // iframe 再呼叫 print()。瀏覽器列印對話框選「另存為 PDF」即可存檔，
  // 預設檔名會用 iframe 的 <title>。
  const printing = ref(false)

  const esc = v => String(v ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')

  function buildPrintHtml() {
    const customers = visibleCustomers.value
    const total = visibleTotal.value
    const isSummary = viewMode.value === 'summary'

    const conds = []
    if (showingPresets.value) {
      conds.push(`常用組合 ${sections.value.length} 組`)
    } else {
      if (filters.firmCode.trim()) conds.push(`客戶代號 ${esc(filters.firmCode.trim())}`)
      if (productClass.value) conds.push(`所屬類別 ${esc(productClass.value)}`)
    }
    if (keyword.value.trim()) conds.push(`品項篩選「${esc(keyword.value.trim())}」`)
    conds.push(isSummary ? '依品項彙總' : '逐筆明細')

    const now = new Date()
    const printedAt = `${now.getFullYear() - 1911}/${pad2(now.getMonth() + 1)}/${pad2(now.getDate())} ${pad2(now.getHours())}:${pad2(now.getMinutes())}`

    const giftCell = n => (n ? fmtQty(n) : '')

    const renderCustomer = (c) => {
      let head
      let body
      if (isSummary) {
        head = '<tr><th>品項</th><th>單位</th><th class="r">出貨天數</th><th class="r">總數量</th><th class="r">總搭量</th><th class="r">總金額</th></tr>'
        body = summarize(c.items).map(g => `<tr>
          <td>${esc(g.product)}</td><td class="m">${esc(g.unit)}</td>
          <td class="r m">${g.days}</td><td class="r">${fmtQty(g.qty)}</td>
          <td class="r m">${giftCell(g.giftNum)}</td><td class="r b">${fmtMoney(g.amount)}</td>
        </tr>`).join('')
      } else {
        head = '<tr><th>銷售日期</th><th>品項</th><th class="r">數量</th><th class="r">搭量</th><th>單位</th><th class="r">單價</th><th class="r">金額</th></tr>'
        body = c.items.map((i, idx) => {
          const newDay = idx === 0 || c.items[idx - 1].date !== i.date
          return `<tr class="${newDay && idx > 0 ? 'day' : ''}">
            <td class="nw ${newDay ? 'm' : 'dim'}">${esc(i.date)}</td><td>${esc(i.product)}</td>
            <td class="r">${fmtQty(i.qty)}</td><td class="r m">${giftCell(i.giftNum)}</td>
            <td class="m nw">${esc(i.unit)}</td><td class="r">${fmtPrice(i.price)}</td>
            <td class="r b">${fmtMoney(i.amount)}</td>
          </tr>`
        }).join('')
      }
      const sub = `數量 ${fmtQty(c.subtotal.qty)}${c.subtotal.giftNum ? `｜搭量 ${fmtQty(c.subtotal.giftNum)}` : ''}｜合計 <b>${fmtMoney(c.subtotal.amount)}</b>`
      const cols = isSummary ? 6 : 7
      // 客戶列放在 <thead> 裡：同一位客戶跨頁時，每頁開頭都會重複客戶名稱與欄位名稱
      return `<section>
        <table><thead>
          <tr class="custrow"><th colspan="${cols}"><div class="cust"><span>${esc(c.firmCode)} ${esc(c.firmName)}</span><span>${sub}</span></div></th></tr>
          ${head}
        </thead><tbody>${body}</tbody></table>
      </section>`
    }

    // 顯示常用時每個組合一段，從新的一頁開始（第一段除外）
    const sectionsHtml = sections.value.map((sec, idx) => {
      const customersHtml = sec.customers.map(renderCustomer).join('')
      if (!sec.title) return customersHtml
      const secTotal = `數量 ${fmtQty(sec.total.qty)}${sec.total.giftNum ? `｜搭量 ${fmtQty(sec.total.giftNum)}` : ''}｜金額 <b>${fmtMoney(sec.total.amount)}</b>`
      const content = sec.error
        ? `<p class="err">${esc(sec.error)}</p>`
        : (customersHtml || '<p class="m">這段期間查無銷售資料</p>')
      return `<div class="preset${idx > 0 ? ' newpage' : ''}">
        <h2><span>${esc(sec.title)}</span><span class="h2sub">${esc(sec.sub)}${sec.error ? '' : `｜${secTotal}`}</span></h2>
        ${content}
      </div>`
    }).join('')

    const grand = customers.length > 1
      ? `<div class="grand"><span>${keyword.value.trim() ? '篩選後總計' : '總計'}</span><span>數量 ${fmtQty(total.qty)}</span>${total.giftNum ? `<span>搭量 ${fmtQty(total.giftNum)}</span>` : ''}<span class="b">金額 ${fmtMoney(total.amount)}</span></div>`
      : ''

    const title = printFileTitle()

    return `<!DOCTYPE html><html lang="zh-Hant"><head><meta charset="utf-8"><title>${esc(title)}</title>
<style>
  @page { size: A4; margin: 12mm 10mm 14mm; @bottom-center { content: counter(page) " / " counter(pages); font-size: 9pt; color: #888; } }
  * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  body { margin: 0; color: #111; font-family: "Noto Sans TC", "Microsoft JhengHei", "PingFang TC", sans-serif; font-size: 10pt; }
  h1 { font-size: 15pt; margin: 0 0 2mm; }
  .meta { display: flex; flex-wrap: wrap; justify-content: space-between; gap: 2mm 6mm; color: #555; font-size: 9pt; margin-bottom: 1mm; }
  .sum { font-size: 10pt; margin: 2mm 0 4mm; padding-bottom: 2mm; border-bottom: 1.5px solid #333; }
  section { margin-bottom: 5mm; }
  tr.custrow th { padding: 0; border: 0; }
  .cust { display: flex; justify-content: space-between; gap: 4mm; background: #eef2ee; padding: 1.5mm 2.5mm; font-weight: 600; font-size: 10pt; color: #111; }
  .cust span:last-child { font-weight: 400; color: #333; }
  table { width: 100%; border-collapse: collapse; }
  thead { display: table-header-group; }
  th { text-align: left; font-weight: 500; color: #666; font-size: 9pt; border-bottom: 1px solid #bbb; padding: 1.2mm 2mm; }
  td { border-bottom: 1px solid #e3e3e3; padding: 1mm 2mm; vertical-align: top; }
  tr { break-inside: avoid; }
  tr.day td { border-top: 1.5px solid #c9c9c9; }
  .r { text-align: right; }
  .m { color: #666; }
  .dim { color: #c4c4c4; }
  .b { font-weight: 600; }
  .nw { white-space: nowrap; }
  h2 { display: flex; justify-content: space-between; align-items: baseline; gap: 4mm; font-size: 12pt; margin: 0 0 3mm; padding: 1.5mm 0; border-bottom: 2px solid #2f6b3a; }
  .h2sub { font-size: 9pt; font-weight: 400; color: #444; }
  .newpage { break-before: page; }
  .err { color: #b91c1c; }
  .grand { display: flex; justify-content: flex-end; gap: 6mm; border-top: 1.5px solid #333; padding-top: 2mm; font-size: 11pt; }
</style></head><body>
  <h1>${esc(headerTitle.value)}</h1>
  <div class="meta"><span>銷售日期 ${esc(headerPeriod.value)}</span><span>${conds.join('｜')}</span><span>列印時間 ${printedAt}</span></div>
  <div class="sum">${visibleCustomerCount.value} 位客戶｜數量 ${fmtQty(total.qty)}${total.giftNum ? `｜搭量 ${fmtQty(total.giftNum)}` : ''}｜金額 <b>${fmtMoney(total.amount)}</b></div>
  ${sectionsHtml}
  ${grand}
</body></html>`
  }

  // 列印對話框「另存為 PDF」的預設檔名
  function printFileTitle() {
    const customers = visibleCustomers.value
    const period = headerPeriod.value.replace(/\//g, '').replace(/\s*~\s*/, '至')
    if (showingPresets.value) {
      const mode0 = viewMode.value === 'summary' ? '_彙總' : ''
      const kw0 = keyword.value.trim() ? `_篩選-${keyword.value.trim()}` : ''
      return `銷貨統計明細_常用_${period}${mode0}${kw0}`.replace(/[\\/:*?"<>|]/g, '_')
    }
    const who = customers.length === 1 ? `_${customers[0].firmName || customers[0].firmCode}` : ''
    const cls = productClass.value ? `_${productClass.value.split('>').pop()}` : ''
    const kwNote = keyword.value.trim() ? `_篩選-${keyword.value.trim()}` : ''
    const mode = viewMode.value === 'summary' ? '_彙總' : ''
    return `銷貨統計明細${who}${cls}_${period}${mode}${kwNote}`.replace(/[\\/:*?"<>|]/g, '_')
  }

  function handlePrintPdf() {
    if (!hasResult.value || !visibleCustomers.value.length || printing.value) return
    printing.value = true
    errorMessage.value = ''
    saveCustomerHistory(filters.firmCode)

    const iframe = document.createElement('iframe')
    iframe.setAttribute('aria-hidden', 'true')
    iframe.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden;'
    document.body.appendChild(iframe)

    const cleanup = () => {
      printing.value = false
      setTimeout(() => iframe.remove(), 1000)
    }

    try {
      const doc = iframe.contentWindow.document
      doc.open()
      doc.write(buildPrintHtml())
      doc.close()
      // 等字型與版面排好再列印
      setTimeout(() => {
        try {
          iframe.contentWindow.focus()
          iframe.contentWindow.addEventListener('afterprint', cleanup, { once: true })
          iframe.contentWindow.print()
          // 有些瀏覽器不會觸發 afterprint，保險起見過一段時間也清掉狀態
          setTimeout(() => { printing.value = false }, 3000)
        } catch (err) {
          errorMessage.value = `開啟列印失敗：${err?.message || err}`
          cleanup()
        }
      }, 300)
    } catch (err) {
      errorMessage.value = `開啟列印失敗：${err?.message || err}`
      cleanup()
    }
  }

  // ---------- 所屬類別 → 品項代號起迄 ----------
  const commonStore = useCommonStore()
  const productClassMap = ref({}) // { code: productClass }
  const productClass = ref('')

  async function loadProductClassMap() {
    try {
      const res = await fetch(`${commonStore.data.main_url}/holy/dc-erp/product-image/list`)
      const data = await res.json()
      const map = {}
      for (const [code, entry] of Object.entries(data || {})) {
        if (entry?.productClass) map[code] = entry.productClass
      }
      productClassMap.value = map
    } catch {
      productClassMap.value = {}
    }
  }

  // 類別選項：除了實際出現的類別，也把上層類別（「>」前面的部分）列出來
  const productClassOptions = computed(() => {
    const set = new Set()
    for (const cls of Object.values(productClassMap.value)) {
      const parts = cls.split('>')
      for (let i = 1; i <= parts.length; i++) set.add(parts.slice(0, i).join('>'))
    }
    return Array.from(set).sort()
  })

  const inClass = (cls, target) => cls === target || cls.startsWith(`${target}>`)
  const codeKey = code => code.toLowerCase()

  // 選類別 → 帶入代號起迄
  // 類別 → 該類別底下品項代號的最小／最大值（沒有品項回 null）
  function codeRangeForClass(cls) {
    const codes = Object.entries(productClassMap.value)
      .filter(([, c]) => inClass(c, cls))
      .map(([code]) => code)
      .sort((a, b) => codeKey(a).localeCompare(codeKey(b)))
    if (!codes.length) return null
    return { s: codes[0], e: codes[codes.length - 1] }
  }

  function applyProductClass() {
    if (!productClass.value) {
      filters.prodCodeS = ''
      filters.prodCodeE = ''
      return
    }
    const range = codeRangeForClass(productClass.value)
    if (!range) return
    filters.prodCodeS = range.s
    filters.prodCodeE = range.e
  }

  // ---------- 常用組合（客戶代號＋所屬類別）----------
  // 存在 Spring Boot 後端（DcErpReportPresetController，
  // /holy/dc-erp/report-preset，資料檔 report_presets.yml），不同電腦／瀏覽器
  // 共用同一份。跟所屬類別快取一樣是前端直接打 Spring Boot，不經 Nuxt
  // server/api，也跟 COAERP 無關。
  // 只存客戶代號與類別名稱，品項代號範圍在查詢/下載當下才從類別快取重新
  // 計算，所以之後類別底下新增品項，常用組合也會自動涵蓋，不用重存。
  //
  // 舊版存在 localStorage（key 見 LEGACY_PRESETS_KEY）：第一次載入時如果
  // 後端還沒有任何常用、但這台瀏覽器有舊資料，會自動搬上後端，搬完清掉。
  const PRESET_REPORT = 'sales-statistics-list'
  const LEGACY_PRESETS_KEY = 'dc-erp-sales-statistics-list-presets'
  const presetApi = path => `${commonStore.data.main_url}/holy/dc-erp/report-preset${path}`
  const presets = ref([]) // [{ id, name, firmCode, productClass, createdAt }]
  const presetsLoading = ref(false)
  const presetSaving = ref(false)
  const batchDownloading = ref(false)
  const batchProgress = ref('')

  async function presetRequest(path, options = {}) {
    const res = await fetch(presetApi(path), options)
    if (!res.ok) throw new Error(`常用組合伺服器回應異常（${res.status}）`)
    const data = await res.json()
    if (data && !Array.isArray(data) && data.error) throw new Error(data.error)
    return data
  }

  function addPresetRequest(preset) {
    return presetRequest(`/add?report=${PRESET_REPORT}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json;charset=UTF-8' },
      body: JSON.stringify({ name: preset.name, firmCode: preset.firmCode, productClass: preset.productClass })
    })
  }

  async function loadPresets() {
    presetsLoading.value = true
    try {
      const list = await presetRequest(`/list?report=${PRESET_REPORT}`)
      presets.value = Array.isArray(list) ? list : []
      await migrateLegacyPresets()
    } catch (err) {
      errorMessage.value = `無法載入常用組合：${err?.message || err}`
    } finally {
      presetsLoading.value = false
    }
  }

  // 舊版 localStorage 常用組合搬上後端（只在後端還是空的時候做一次）
  async function migrateLegacyPresets() {
    let legacy = []
    try {
      const raw = window.localStorage.getItem(LEGACY_PRESETS_KEY)
      legacy = raw ? JSON.parse(raw) : []
    } catch { /* 讀不到就當沒有 */ }
    if (!Array.isArray(legacy) || !legacy.length) return
    if (presets.value.length) {
      // 後端已經有資料（可能別台電腦存過），不覆蓋，只清掉這台的舊資料
      window.localStorage.removeItem(LEGACY_PRESETS_KEY)
      return
    }
    for (const p of legacy) {
      if (!p?.firmCode && !p?.productClass) continue
      const data = await addPresetRequest({ name: p.name, firmCode: p.firmCode || '', productClass: p.productClass || '' })
      presets.value = data.presets || presets.value
    }
    window.localStorage.removeItem(LEGACY_PRESETS_KEY)
    showPresetNotice(`已把這台瀏覽器的 ${legacy.length} 個常用組合搬到伺服器`)
  }

  function presetLabel(firmCode, cls) {
    const who = firmCode || '全部客戶'
    const what = cls ? cls.split('>').pop() : '全部類別'
    return `${who}｜${what}`
  }

  // 存成常用：不跳輸入框，直接用「客戶代號｜類別」當名稱；已經存過同一組
  // （客戶代號＋類別都一樣）後端不會重複新增。結果在常用那排短暫提示。
  const presetNotice = ref('')
  let presetNoticeTimer = null
  function showPresetNotice(msg) {
    presetNotice.value = msg
    clearTimeout(presetNoticeTimer)
    presetNoticeTimer = setTimeout(() => { presetNotice.value = '' }, 2500)
  }

  async function handleSavePreset() {
    const firmCode = filters.firmCode.trim()
    const cls = productClass.value
    if (!firmCode && !cls) {
      errorMessage.value = '請先填客戶代號或選所屬類別，再存成常用'
      return
    }
    errorMessage.value = ''
    const existing = presets.value.find(p => p.firmCode === firmCode && p.productClass === cls)
    if (existing) {
      showPresetNotice(`「${existing.name}」已經在常用裡`)
      return
    }
    presetSaving.value = true
    try {
      const name = presetLabel(firmCode, cls)
      const data = await addPresetRequest({ name, firmCode, productClass: cls })
      presets.value = data.presets || presets.value
      showPresetNotice(data.exists ? `「${name}」已經在常用裡` : `已存成常用「${name}」`)
    } catch (err) {
      errorMessage.value = `存成常用失敗：${err?.message || err}`
    } finally {
      presetSaving.value = false
    }
  }

  function applyPreset(preset) {
    filters.firmCode = preset.firmCode
    productClass.value = preset.productClass
    applyProductClass()
  }

  // 刪除常用：先開確認 Modal（不用瀏覽器內建 confirm），按「刪除」才真的刪
  const deletingPreset = ref(null) // 目前要刪除的組合（Modal 開著時有值）
  const presetDeleting = ref(false)
  const presetDeleteError = ref('')

  function removePreset(preset) {
    deletingPreset.value = preset
    presetDeleteError.value = ''
  }

  function closeDeleteModal() {
    if (presetDeleting.value) return
    deletingPreset.value = null
  }

  // Modal 開著時按 Esc 關閉
  function onKeydown(e) {
    if (e.key === 'Escape' && deletingPreset.value) closeDeleteModal()
  }

  async function confirmRemovePreset() {
    const preset = deletingPreset.value
    if (!preset || presetDeleting.value) return
    presetDeleting.value = true
    presetDeleteError.value = ''
    try {
      const data = await presetRequest(`/remove/${encodeURIComponent(preset.id)}?report=${PRESET_REPORT}`, { method: 'DELETE' })
      presets.value = data.presets || presets.value.filter(p => p.id !== preset.id)
      deletingPreset.value = null
      showPresetNotice(`已刪除常用「${preset.name}」`)
    } catch (err) {
      presetDeleteError.value = `刪除失敗：${err?.message || err}`
    } finally {
      presetDeleting.value = false
    }
  }

  const safeName = v => String(v).replace(/[\\/:*?"<>|]/g, '_')

  // 顯示常用：依序查詢每個常用組合（不並發，避免同時打原網站同一個
  // session），每查完一個就加進結果，畫面一邊查一邊顯示。
  async function handleShowPresets() {
    if (!presets.value.length || loading.value) return
    errorMessage.value = ''
    if (!validate()) return

    loading.value = true
    showingPresets.value = true
    presetResults.value = []
    expandedKeys.value = []
    try {
      for (let i = 0; i < presets.value.length; i++) {
        const preset = presets.value[i]
        presetLoadingText.value = `查詢中 ${i + 1}/${presets.value.length}：${preset.name}（原網站產生報表需要幾秒鐘）`

        let range = { s: '', e: '' }
        if (preset.productClass) {
          range = codeRangeForClass(preset.productClass)
          if (!range) {
            presetResults.value.push({ preset, report: null, error: `類別「${preset.productClass}」目前沒有品項資料` })
            continue
          }
        }

        try {
          const rep = await $fetch('/api/dc-erp/sales-statistics-list', {
            query: buildQuery({ firmCode: preset.firmCode, prodCodeS: range.s, prodCodeE: range.e })
          })
          presetResults.value.push({ preset, report: rep, error: '' })
        } catch (err) {
          if (err?.statusCode === 401 || err?.response?.status === 401) {
            await navigateTo('/staff/order/dc-erp/login')
            return
          }
          presetResults.value.push({ preset, report: null, error: err?.data?.statusMessage || '查詢失敗' })
        }
      }
    } finally {
      loading.value = false
      presetLoadingText.value = ''
    }
  }

  // 依序下載每個常用組合的原網站 Excel，打包成一個 zip。
  // 逐一呼叫（不並發）避免同時打原網站同一個 session；單一組合失敗會記下來
  // 繼續下一個，最後 zip 裡附一份「下載失敗清單.txt」並在畫面上提示。
  async function handleBatchDownload() {
    if (!presets.value.length || batchDownloading.value) return
    errorMessage.value = ''
    if (!validate()) return

    batchDownloading.value = true
    const period = month.value || `${filters.dateS}~${filters.dateE}`
    const failed = []
    let okCount = 0

    try {
      const mod = await import('jszip')
      const JSZip = mod.default || mod
      const zip = new JSZip()

      for (let i = 0; i < presets.value.length; i++) {
        const preset = presets.value[i]
        batchProgress.value = `下載中 ${i + 1}/${presets.value.length}：${preset.name}`

        let range = { s: '', e: '' }
        if (preset.productClass) {
          range = codeRangeForClass(preset.productClass)
          if (!range) {
            failed.push(`${preset.name}（類別「${preset.productClass}」目前沒有品項資料）`)
            continue
          }
        }

        try {
          const { blob, filename } = await fetchExcelBlob(buildQuery({
            firmCode: preset.firmCode,
            prodCodeS: range.s,
            prodCodeE: range.e
          }))
          const ext = (filename.match(/\.[^.]+$/) || ['.xls'])[0]
          zip.file(`${safeName(preset.name)}_${period}${ext}`, blob)
          okCount++
        } catch (err) {
          if (err?.unauthorized) {
            await navigateTo('/staff/order/dc-erp/login')
            return
          }
          failed.push(`${preset.name}（${err?.message || '下載失敗'}）`)
        }
      }

      if (!okCount) {
        errorMessage.value = `常用組合全部下載失敗：${failed.join('、')}`
        return
      }
      if (failed.length) zip.file('下載失敗清單.txt', failed.join('\r\n'))

      batchProgress.value = '打包中…'
      const out = await zip.generateAsync({ type: 'blob' })
      saveBlob(out, `銷貨統計明細_常用_${period}.zip`)

      if (failed.length) {
        errorMessage.value = `已下載 ${okCount} 個，以下 ${failed.length} 個失敗：${failed.join('、')}`
      }
    } catch (err) {
      errorMessage.value = err?.message ? `批次下載失敗：${err.message}` : '批次下載失敗，請稍後再試'
    } finally {
      batchDownloading.value = false
      batchProgress.value = ''
    }
  }

  // 目前代號起迄範圍內，有幾個「不屬於所選類別」的品項（夾到別類）
  const productClassRangeNote = computed(() => {
    if (!productClass.value || !filters.prodCodeS || !filters.prodCodeE) return ''
    const s = codeKey(filters.prodCodeS)
    const e = codeKey(filters.prodCodeE)
    let inside = 0
    const others = []
    for (const [code, cls] of Object.entries(productClassMap.value)) {
      const k = codeKey(code)
      if (k < s || k > e) continue
      if (inClass(cls, productClass.value)) inside++
      else others.push(code)
    }
    if (!others.length) return `此類別共 ${inside} 個品項`
    const sample = others.slice(0, 5).join('、')
    return `此類別共 ${inside} 個品項；代號範圍內另夾到 ${others.length} 個其他類別的品項（${sample}${others.length > 5 ? '…' : ''}），也會出現在結果裡`
  })

  function handleReset() {
    productClass.value = ''
    Object.assign(filters, {
      firmCode: '',
      workPlaceS: '',
      workPlaceE: '',
      prodCodeS: '',
      prodCodeE: '',
      parentFirmID: selectedValue(options.parentFirm, '0'),
      firmType: selectedValue(options.firmType, '不拘'),
      saleSlipData: true,
      saleReturnData: true,
      signState: selectedValue(options.signState, 'sign'),
      formType: selectedValue(options.formType, '-1')
    })
  }

  // ---------- 顯示：前端篩選 + 彙總 ----------
  const kw = computed(() => keyword.value.trim().toLowerCase())

  // 套用品項關鍵字後的客戶清單；有關鍵字時小計改成前端重算
  function filterCustomers(customers) {
    return customers
      .map((c) => {
        if (!kw.value) return c
        const items = c.items.filter(i => i.product.toLowerCase().includes(kw.value))
        return {
          ...c,
          items,
          subtotal: {
            qty: items.reduce((s, i) => s + i.qty, 0),
            giftNum: items.reduce((s, i) => s + i.giftNum, 0),
            amount: items.reduce((s, i) => s + i.amount, 0)
          }
        }
      })
      .filter(c => c.items.length)
  }

  function sumCustomers(customers) {
    return customers.reduce((t, c) => ({
      qty: t.qty + c.subtotal.qty,
      giftNum: t.giftNum + c.subtotal.giftNum,
      amount: t.amount + c.subtotal.amount
    }), { qty: 0, giftNum: 0, amount: 0 })
  }

  // 畫面與列印共用的分段資料：一般查詢是一段（沒有標題）；
  // 「顯示常用」是每個常用組合一段（標題是組合名稱）
  const sections = computed(() => {
    if (showingPresets.value) {
      return presetResults.value.map((r) => {
        const customers = r.report ? filterCustomers(r.report.customers) : []
        return {
          key: r.preset.id,
          title: r.preset.name,
          sub: `客戶代號 ${r.preset.firmCode || '全部'}｜所屬類別 ${r.preset.productClass || '全部'}`,
          error: r.error,
          customers,
          total: sumCustomers(customers)
        }
      })
    }
    if (!report.value) return []
    const customers = filterCustomers(report.value.customers)
    return [{ key: 'single', title: '', sub: '', error: '', customers, total: sumCustomers(customers) }]
  })

  const visibleCustomers = computed(() => sections.value.flatMap(sec => sec.customers))
  const visibleTotal = computed(() => sumCustomers(visibleCustomers.value))
  const visibleCustomerCount = computed(() => new Set(visibleCustomers.value.map(c => c.firmCode || c.firmName)).size)

  const hasResult = computed(() => (showingPresets.value ? presetResults.value.length > 0 : !!report.value))
  const headerReport = computed(() =>
    showingPresets.value ? (presetResults.value.find(r => r.report)?.report || null) : report.value
  )
  const headerTitle = computed(() => headerReport.value?.title || '客戶日期銷售品項明細表')
  const headerPeriod = computed(() => headerReport.value?.periodText || `${filters.dateS} ~ ${filters.dateE}`)

  // 依品項彙總：同一客戶、同品項＋單位合併，算總數量/總金額/出貨天數
  function summarize(items) {
    const map = new Map()
    for (const i of items) {
      const key = `${i.product}__${i.unit}`
      if (!map.has(key)) map.set(key, { product: i.product, unit: i.unit, qty: 0, giftNum: 0, amount: 0, dates: new Set() })
      const g = map.get(key)
      g.qty += i.qty
      g.giftNum += i.giftNum
      g.amount += i.amount
      g.dates.add(i.date)
    }
    return Array.from(map.values())
      .map(g => ({ ...g, days: g.dates.size }))
      .sort((a, b) => b.amount - a.amount)
  }

  const fmtQty = n => Number(n || 0).toLocaleString('zh-TW', { minimumFractionDigits: 0, maximumFractionDigits: 2 })
  const fmtMoney = n => Number(n || 0).toLocaleString('zh-TW', { maximumFractionDigits: 0 })
  const fmtPrice = n => Number(n || 0).toLocaleString('zh-TW', { minimumFractionDigits: 0, maximumFractionDigits: 2 })

  onBeforeUnmount(() => window.removeEventListener('keydown', onKeydown))

  onMounted(() => {
    window.addEventListener('keydown', onKeydown)
    // 自動帶入最近用過的客戶代號（跟訂貨單/銷貨單列表一致）
    filters.firmCode = loadCustomerHistory()[0] || ''
    loadPresets()
    loadOptions()
    loadProductClassMap()
  })
</script>

<template>
  <div class="p-2 sm:p-4">
    <DcErpShell>
      <div class="space-y-3 p-2 sm:p-4">
        <!-- 查詢條件 -->
        <div class="space-y-2 rounded-xl border border-light-c bg-surface p-3 text-base">
          <!-- 基本條件：月份、客戶代號、所屬類別 -->
          <div class="flex flex-wrap items-center gap-2">
            <label class="text-muted-c">月份：</label>
            <input
              v-model="month"
              type="month"
              class="rounded border border-light-c bg-surface px-2 py-1"
            >
            <span v-if="!month && filters.dateS" class="text-xs text-hint-c">
              （自訂期間 {{ filters.dateS }} ~ {{ filters.dateE }}）
            </span>

            <label class="ml-2 text-muted-c">客戶代號：</label>
            <DcErpKeywordSearchInput
              v-model="filters.firmCode"
              :storage-key="CUSTOMER_HISTORY_KEY"
              placeholder="空白＝全部"
              width-class="w-28"
              @enter="handleSearch"
            />

            <label class="ml-2 text-muted-c">所屬類別：</label>
            <select
              v-model="productClass"
              class="max-w-56 rounded border border-light-c bg-surface px-2 py-1"
              @change="applyProductClass"
            >
              <option value="">不拘</option>
              <option v-for="c in productClassOptions" :key="c" :value="c">{{ c }}</option>
            </select>

            <button
              class="rounded-lg bg-green-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-green-800 disabled:opacity-50"
              :disabled="loading || optionsLoading"
              @click="handleSearch"
            >
              {{ loading ? '查詢中…' : '送出查詢' }}
            </button>
            <button
              class="rounded-lg border border-light-c px-3 py-1.5 text-sm font-medium text-muted-c hover:bg-surface2 disabled:opacity-50"
              :disabled="downloading || optionsLoading"
              @click="handleDownload"
            >
              {{ downloading ? '下載中…' : '下載 Excel' }}
            </button>
            <button
              class="rounded-lg border border-light-c px-3 py-1.5 text-sm font-medium text-muted-c hover:bg-surface2 disabled:opacity-50"
              :disabled="!hasResult || !visibleCustomers.length || printing || loading"
              :title="hasResult ? '依目前畫面（逐筆明細／依品項彙總、品項篩選）產生 A4 版面，列印對話框選「另存為 PDF」即可存檔' : '請先送出查詢'"
              @click="handlePrintPdf"
            >
              {{ printing ? '準備中…' : '列印 / 存 PDF' }}
            </button>
            <button
              class="ml-auto rounded-lg border border-light-c px-3 py-1.5 text-sm text-muted-c hover:bg-surface2"
              @click="filterExpanded = !filterExpanded"
            >
              {{ filterExpanded ? '收起條件 ▲' : '更多條件 ▼' }}
            </button>
          </div>
          <p v-if="productClassRangeNote" class="text-xs text-hint-c">
            {{ productClassRangeNote }}（品項代號 {{ filters.prodCodeS }} ~ {{ filters.prodCodeE }}）
          </p>
          <p v-else-if="!optionsLoading && !productClassOptions.length" class="text-xs text-hint-c">
            沒有類別資料：要先在「進階品項管理」按過「設置所屬類別」，這裡才能依類別選擇。
          </p>

          <!-- 常用組合 -->
          <div class="flex flex-wrap items-center gap-2 border-t border-light-c pt-2">
            <span class="text-sm text-muted-c">常用：</span>
            <span v-if="presetsLoading" class="text-xs text-hint-c">載入常用組合中…</span>
            <span v-else-if="!presets.length" class="text-xs text-hint-c">
              尚無常用組合。選好客戶代號／所屬類別後按「存成常用」。
            </span>
            <span
              v-for="p in presets"
              :key="p.id"
              class="flex items-center rounded-full border border-light-c text-sm"
              :class="p.firmCode === filters.firmCode.trim() && p.productClass === productClass ? 'border-green-600 bg-green-50 text-green-800' : 'text-base-c'"
            >
              <button
                class="rounded-l-full px-2.5 py-0.5 hover:bg-surface2"
                :title="`客戶代號：${p.firmCode || '全部'}｜所屬類別：${p.productClass || '全部'}（點一下帶入）`"
                @click="applyPreset(p)"
              >
                {{ p.name }}
              </button>
              <button
                class="rounded-r-full px-1.5 py-0.5 text-hint-c hover:bg-surface2 hover:text-red-600"
                title="刪除這個常用組合"
                @click="removePreset(p)"
              >
                ×
              </button>
            </span>

            <button
              class="rounded-lg border border-light-c px-2.5 py-1 text-sm text-muted-c hover:bg-surface2 disabled:opacity-50"
              :disabled="presetSaving || presetsLoading"
              @click="handleSavePreset"
            >
              {{ presetSaving ? '儲存中…' : '＋ 存成常用' }}
            </button>
            <span v-if="presetNotice" class="text-xs text-green-700">{{ presetNotice }}</span>
            <button
              class="ml-auto rounded-lg border border-green-700 px-3 py-1.5 text-sm font-medium text-green-700 hover:bg-green-50 disabled:opacity-50"
              :disabled="!presets.length || loading || optionsLoading"
              :title="`依目前選的月份（${month || '自訂期間'}），查詢所有常用組合並依組合分段顯示`"
              @click="handleShowPresets"
            >
              {{ loading && showingPresets ? '查詢中…' : `顯示常用（${presets.length}）` }}
            </button>
            <button
              class="rounded-lg bg-green-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-green-800 disabled:opacity-50"
              :disabled="!presets.length || batchDownloading || optionsLoading"
              :title="`依目前選的月份（${month || '自訂期間'}），把所有常用組合的 Excel 打包成一個 zip 下載`"
              @click="handleBatchDownload"
            >
              {{ batchDownloading ? (batchProgress || '下載中…') : `下載常用 Excel（${presets.length}）` }}
            </button>
          </div>

          <!-- 更多條件 -->
          <div v-if="filterExpanded" class="space-y-2 border-t border-light-c pt-2">
            <div class="flex flex-wrap items-center gap-2">
              <label class="text-muted-c">自訂期間：</label>
              <input v-model="filters.dateS" type="date" class="rounded border border-light-c bg-surface px-2 py-1">
              <span class="text-hint-c">~</span>
              <input v-model="filters.dateE" type="date" class="rounded border border-light-c bg-surface px-2 py-1">

              <label class="ml-2 text-muted-c">品項代號：</label>
              <input
                v-model="filters.prodCodeS"
                type="text"
                placeholder="起始"
                class="w-28 rounded border border-light-c bg-surface px-2 py-1"
                @blur="fillEndIfEmpty('prodCodeS', 'prodCodeE')"
              >
              <span class="text-hint-c">~</span>
              <input v-model="filters.prodCodeE" type="text" placeholder="迄止" class="w-28 rounded border border-light-c bg-surface px-2 py-1">
            </div>

            <div class="flex flex-wrap items-center gap-2">
              <label class="text-muted-c">場別：</label>
              <select v-model="filters.workPlaceS" class="rounded border border-light-c bg-surface px-2 py-1">
                <option v-for="opt in options.workPlace" :key="`s${opt.value}`" :value="opt.value">{{ opt.label }}</option>
              </select>
              <span class="text-hint-c">~</span>
              <select v-model="filters.workPlaceE" class="rounded border border-light-c bg-surface px-2 py-1">
                <option v-for="opt in options.workPlace" :key="`e${opt.value}`" :value="opt.value">{{ opt.label }}</option>
              </select>

              <label class="ml-2 text-muted-c">母公司：</label>
              <select v-model="filters.parentFirmID" class="rounded border border-light-c bg-surface px-2 py-1">
                <option v-for="opt in options.parentFirm" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
              </select>

              <label class="ml-2 text-muted-c">客戶類別：</label>
              <select v-model="filters.firmType" class="rounded border border-light-c bg-surface px-2 py-1">
                <option v-for="opt in options.firmType" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
              </select>
            </div>

            <div class="flex flex-wrap items-center gap-2">
              <label class="text-muted-c">簽核狀態：</label>
              <select v-model="filters.signState" class="rounded border border-light-c bg-surface px-2 py-1">
                <option v-for="opt in options.signState" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
              </select>

              <label class="ml-2 text-muted-c">單據類型：</label>
              <select v-model="filters.formType" class="rounded border border-light-c bg-surface px-2 py-1">
                <option v-for="opt in options.formType" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
              </select>

              <span class="ml-2 text-muted-c">單據來源：</span>
              <label class="flex items-center gap-1">
                <input v-model="filters.saleSlipData" type="checkbox"> 銷貨單
              </label>
              <label class="flex items-center gap-1">
                <input v-model="filters.saleReturnData" type="checkbox"> 銷貨退回單
              </label>

              <button
                class="ml-auto rounded-lg border border-light-c px-3 py-1 text-sm text-muted-c hover:bg-surface2"
                @click="handleReset"
              >
                清除條件
              </button>
            </div>
          </div>
        </div>

        <p v-if="errorMessage" class="rounded-xl border border-red-200 bg-red-50 p-3 text-base text-red-600">
          {{ errorMessage }}
        </p>

        <!-- 結果 -->
        <div class="overflow-hidden rounded-xl border border-light-c bg-surface">
          <p v-if="loading" class="border-b border-light-c p-4 text-base text-hint-c">
            {{ presetLoadingText || '查詢中…（原網站產生報表需要幾秒鐘）' }}
          </p>
          <p v-else-if="!hasResult" class="p-6 text-base text-hint-c">
            選擇月份（可加客戶代號、所屬類別）後按「送出查詢」，或直接「下載 Excel」；有存常用組合的話，可以按「顯示常用」一次看全部。
          </p>

          <template v-if="hasResult && (showingPresets || !loading)">
            <div class="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-light-c px-3 py-2">
              <div class="text-base font-bold text-base-c">
                {{ headerTitle }}
                <span v-if="showingPresets" class="ml-1 rounded bg-green-50 px-1.5 py-0.5 text-xs font-medium text-green-800">常用 {{ presetResults.length }} 組</span>
                <button
                  v-if="showingPresets && sections.length"
                  class="ml-1 rounded border border-light-c px-1.5 py-0.5 text-xs font-normal text-muted-c hover:bg-surface2"
                  @click="expandedKeys = expandedKeys.length === sections.length ? [] : sections.map(sec => sec.key)"
                >
                  {{ expandedKeys.length === sections.length ? '全部收合' : '全部展開' }}
                </button>
              </div>
              <div class="text-sm text-muted-c">
                銷售日期 {{ headerPeriod }}
              </div>
              <div class="text-sm text-muted-c">
                {{ visibleCustomerCount }} 位客戶｜數量 {{ fmtQty(visibleTotal.qty) }}｜金額
                <span class="font-bold text-base-c">{{ fmtMoney(visibleTotal.amount) }}</span>
              </div>

              <div class="ml-auto flex flex-wrap items-center gap-2">
                <input
                  v-model="keyword"
                  type="text"
                  placeholder="篩選品項名稱"
                  class="w-40 rounded border border-light-c bg-surface px-2 py-1 text-sm"
                >
                <div class="flex items-center gap-0.5 rounded-lg border border-light-c p-0.5 text-xs">
                  <button
                    class="rounded px-2 py-0.5"
                    :class="viewMode === 'detail' ? 'bg-surface2 font-medium text-base-c' : 'text-muted-c hover:bg-surface2'"
                    @click="viewMode = 'detail'"
                  >
                    逐筆明細
                  </button>
                  <button
                    class="rounded px-2 py-0.5"
                    :class="viewMode === 'summary' ? 'bg-surface2 font-medium text-base-c' : 'text-muted-c hover:bg-surface2'"
                    @click="viewMode = 'summary'"
                  >
                    依品項彙總
                  </button>
                </div>
              </div>
            </div>

            <template v-for="sec in sections" :key="sec.key">
              <!-- 常用組合的段落標題（一般查詢沒有） -->
              <div
                v-if="sec.title"
                class="flex cursor-pointer select-none flex-wrap items-center justify-between gap-2 border-b-2 border-green-700 px-3 pb-1.5 pt-3 hover:bg-surface2"
                :title="isExpanded(sec.key) ? '點一下收合' : '點一下展開明細'"
                @click="toggleSection(sec.key)"
              >
                <div class="text-base font-bold text-green-800">
                  <span class="mr-1 inline-block w-3 text-xs text-muted-c">{{ isExpanded(sec.key) ? '▼' : '▶' }}</span>
                  {{ sec.title }}
                  <span class="ml-1 text-xs font-normal text-muted-c">{{ sec.sub }}</span>
                </div>
                <div v-if="!sec.error" class="text-sm text-muted-c">
                  數量 {{ fmtQty(sec.total.qty) }}
                  <template v-if="sec.total.giftNum">｜搭量 {{ fmtQty(sec.total.giftNum) }}</template>
                  ｜金額 <span class="font-bold text-base-c">{{ fmtMoney(sec.total.amount) }}</span>
                </div>
              </div>

              <p v-if="sec.error" class="border-b border-light-c px-3 py-3 text-sm text-red-600">
                {{ sec.error }}
              </p>
              <template v-else-if="!sec.title || isExpanded(sec.key)">
                <p v-if="!sec.customers.length" class="border-b border-light-c p-4 text-center text-base text-hint-c">
                  {{ keyword ? '沒有符合的品項' : '這段期間查無銷售資料' }}
                </p>

                <div
                  v-for="c in sec.customers"
                  :key="`${sec.key}-${c.firmCode || c.firmName}`"
                  class="border-b border-light-c last:border-b-0"
                >
                  <div class="flex flex-wrap items-center justify-between gap-2 bg-surface2 px-3 py-1.5">
                    <div class="font-medium text-base-c">
                      {{ c.firmCode }} {{ c.firmName }}
                    </div>
                    <div class="text-sm text-muted-c">
                      數量 {{ fmtQty(c.subtotal.qty) }}
                      <template v-if="c.subtotal.giftNum">｜搭量 {{ fmtQty(c.subtotal.giftNum) }}</template>
                      ｜合計 <span class="font-bold text-base-c">{{ fmtMoney(c.subtotal.amount) }}</span>
                    </div>
                  </div>

                  <!-- 逐筆明細 -->
                  <div v-if="viewMode === 'detail'" class="overflow-x-auto">
                    <table class="w-full text-base">
                      <thead>
                      <tr class="border-b border-light-c text-left text-sm text-muted-c">
                        <th class="px-3 py-1.5">銷售日期</th>
                        <th class="px-3 py-1.5">品項</th>
                        <th class="px-3 py-1.5 text-right">數量</th>
                        <th class="px-3 py-1.5 text-right">搭量</th>
                        <th class="px-3 py-1.5">單位</th>
                        <th class="px-3 py-1.5 text-right">單價</th>
                        <th class="px-3 py-1.5 text-right">金額</th>
                      </tr>
                      </thead>
                      <tbody>
                      <tr
                        v-for="(i, idx) in c.items"
                        :key="idx"
                        class="border-b border-light-c last:border-b-0 hover:bg-surface2"
                        :class="idx > 0 && c.items[idx - 1].date !== i.date ? 'border-t-2' : ''"
                      >
                        <td class="whitespace-nowrap px-3 py-1 text-muted-c">
                          <!-- 同一天連續的列只在第一列顯示日期，比較好分辨是哪一天出的貨 -->
                          {{ idx === 0 || c.items[idx - 1].date !== i.date ? i.date : '' }}
                        </td>
                        <td class="px-3 py-1">{{ i.product }}</td>
                        <td class="px-3 py-1 text-right">{{ fmtQty(i.qty) }}</td>
                        <td class="px-3 py-1 text-right text-hint-c">{{ i.giftNum ? fmtQty(i.giftNum) : '' }}</td>
                        <td class="whitespace-nowrap px-3 py-1 text-muted-c">{{ i.unit }}</td>
                        <td class="px-3 py-1 text-right">{{ fmtPrice(i.price) }}</td>
                        <td class="px-3 py-1 text-right font-medium">{{ fmtMoney(i.amount) }}</td>
                      </tr>
                      </tbody>
                    </table>
                  </div>

                  <!-- 依品項彙總 -->
                  <div v-else class="overflow-x-auto">
                    <table class="w-full text-base">
                      <thead>
                      <tr class="border-b border-light-c text-left text-sm text-muted-c">
                        <th class="px-3 py-1.5">品項</th>
                        <th class="px-3 py-1.5">單位</th>
                        <th class="px-3 py-1.5 text-right">出貨天數</th>
                        <th class="px-3 py-1.5 text-right">總數量</th>
                        <th class="px-3 py-1.5 text-right">總搭量</th>
                        <th class="px-3 py-1.5 text-right">總金額</th>
                      </tr>
                      </thead>
                      <tbody>
                      <tr
                        v-for="g in summarize(c.items)"
                        :key="`${g.product}${g.unit}`"
                        class="border-b border-light-c last:border-b-0 hover:bg-surface2"
                      >
                        <td class="px-3 py-1">{{ g.product }}</td>
                        <td class="whitespace-nowrap px-3 py-1 text-muted-c">{{ g.unit }}</td>
                        <td class="px-3 py-1 text-right text-muted-c">{{ g.days }}</td>
                        <td class="px-3 py-1 text-right">{{ fmtQty(g.qty) }}</td>
                        <td class="px-3 py-1 text-right text-hint-c">{{ g.giftNum ? fmtQty(g.giftNum) : '' }}</td>
                        <td class="px-3 py-1 text-right font-medium">{{ fmtMoney(g.amount) }}</td>
                      </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </template>
            </template>

            <div
              v-if="visibleCustomers.length > 1"
              class="flex flex-wrap items-center justify-end gap-3 border-t border-light-c bg-surface2 px-3 py-2 text-sm"
            >
              <span class="text-muted-c">{{ keyword ? '篩選後總計' : '總計' }}</span>
              <span>數量 {{ fmtQty(visibleTotal.qty) }}</span>
              <span v-if="visibleTotal.giftNum">搭量 {{ fmtQty(visibleTotal.giftNum) }}</span>
              <span class="font-bold text-base-c">金額 {{ fmtMoney(visibleTotal.amount) }}</span>
            </div>
          </template>
        </div>
      </div>
    </DcErpShell>

    <!-- 刪除常用組合確認 Modal -->
    <Teleport to="body">
      <div
        v-if="deletingPreset"
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
        @click.self="closeDeleteModal"
      >
        <div class="w-full max-w-sm rounded-xl border border-light-c bg-surface p-4 shadow-xl" role="dialog" aria-modal="true">
          <div class="text-base font-bold text-base-c">
            刪除常用組合
          </div>
          <p class="mt-2 text-base text-base-c">
            確定要刪除「<span class="font-medium">{{ deletingPreset.name }}</span>」嗎？
          </p>
          <p class="mt-1 text-sm text-muted-c">
            客戶代號：{{ deletingPreset.firmCode || '全部' }}｜所屬類別：{{ deletingPreset.productClass || '全部' }}
          </p>
          <p class="mt-2 text-sm text-hint-c">
            常用組合存在伺服器，所有電腦都會一起刪除。
          </p>
          <p v-if="presetDeleteError" class="mt-2 text-sm text-red-600">
            {{ presetDeleteError }}
          </p>
          <div class="mt-4 flex justify-end gap-2">
            <button
              class="rounded-lg border border-light-c px-3 py-1.5 text-sm text-muted-c hover:bg-surface2 disabled:opacity-50"
              :disabled="presetDeleting"
              @click="closeDeleteModal"
            >
              取消
            </button>
            <button
              class="rounded-lg bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
              :disabled="presetDeleting"
              @click="confirmRemovePreset"
            >
              {{ presetDeleting ? '刪除中…' : '刪除' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>
