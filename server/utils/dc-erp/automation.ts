// server/utils/dc-erp/automation.ts
//
// 「自動化：簽核並轉銷＋列印下載」共用邏輯，給
// server/api/dc-erp/automation/run-customer.post.ts 呼叫。
//
// 這裡的 HTML 解析（訂貨單/銷貨單列表）是從 sales-orders.get.ts /
// sales-slips.get.ts 抽出「自動化用得到的欄位」重新寫一份精簡版，不是
// import 那兩支檔案共用——避免自動化邏輯跟一般畫面查詢邏輯耦合在一起、
// 改一邊誤動到另一邊。如果原網站列表 HTML 結構改了，這三個檔案要一起改。
//
// 登入方式：見 server/utils/dc-erp/autoLogin.ts（用驗證碼樣板比對分類器
// 自動登入），run-customer.post.ts 沒有瀏覽器 session 時會自動 fallback
// 過去，真正的排程觸發（Spring Boot @Scheduled → run-scheduled.post.ts）
// 也是靠它。
//
// 持久化：客戶清單、驗證碼樣板庫、產生的 PDF 都改存在 Spring Boot（見
// DcErpAutomationController.java）——Netlify 上的 Nitro serverless
// function 本機檔案系統不可靠（每次呼叫可能是全新環境，不會在多次呼叫
// 間保留，也不會在多個執行個體間共享），不能再寫本機檔案。
//
// 需要安裝 cheerio（其他 dc-erp API 已經在用，應該已經裝過了）。

import { load } from 'cheerio'

export interface AutomationOrderRow {
  guid: string
  code: string
  firmName: string
  deliveryDate: string
  signState: string
  canTransfer: boolean
  remark: string
  total: string

}

export interface AutomationSlipRow {
  guid: string
  code: string
  firmName: string
  deliveryDate: string
  remark: string
  total: string
}

export interface PrintStyleFormat {
  reportId: string
  format: string
  label: string
}

function parseOrderRows(html: string) {
  const $ = load(html)

  const signStateOptions: Array<{ value: string; label: string }> = []
  $('#SearchBySignState option').each((_: number, opt: any) => {
    const $opt = $(opt)
    signStateOptions.push({ value: $opt.attr('value') || '', label: $opt.text().trim() })
  })

  const rows: AutomationOrderRow[] = []
  $('#TableList tr').each((i: number, tr: any) => {
    if (i === 0) return // 表頭列
    const $tds = $(tr).find('td')
    if ($tds.length < 13) return

    const $codeLink = $($tds[2]).find('a')
    const editHref = $codeLink.attr('href') || ''
    const guidMatch = editHref.match(/Edit\/([0-9a-fA-F-]{36})/)

    // 「轉銷」欄判斷邏輯照抄 sales-orders.get.ts：文字節點/input value 都要看。
    const $transferCell = $($tds[9])
    const canTransfer =
      ($transferCell.text().trim() + ($transferCell.find('input').attr('value') || '')).trim().length > 0

    rows.push({
      guid: guidMatch ? guidMatch[1] : '',
      code: $codeLink.text().trim(),
      deliveryDate: $($tds[4]).text().trim(),
      firmName: $($tds[6]).text().trim(),
      signState: $($tds[8]).text().trim(),
      canTransfer,
      total: $($tds[10]).text().trim(),
      remark: $($tds[12]).find('.overFlowDiv').attr('title') || $($tds[12]).text().trim()
    })
  })

  const totalMatch = html.match(/總計([\d,]+)筆\/\s*總計([\d,]+)頁/)
  const totalPages = totalMatch ? Number(totalMatch[2].replace(/,/g, '')) : 1

  return { rows, signStateOptions, totalPages }
}

function parseSlipRows(html: string): AutomationSlipRow[] {
  const $ = load(html)
  const rows: AutomationSlipRow[] = []
  $('#TableList tr').each((i: number, tr: any) => {
    if (i === 0) return
    const $tds = $(tr).find('td')
    if ($tds.length < 16) return
    const $codeLink = $($tds[2]).find('a')
    const editHref = $codeLink.attr('href') || ''
    const guidMatch = editHref.match(/Edit\/([0-9a-fA-F-]{36})/)
    rows.push({
      guid: guidMatch ? guidMatch[1] : '',
      code: $codeLink.text().trim(),
      deliveryDate: $($tds[3]).text().trim(),
      firmName: $($tds[4]).text().trim(),
      total: $($tds[7]).text().trim(),
      remark: $($tds[14]).text().trim()
    })
  })
  return rows
}

async function fetchOrderPage(sessionCookie: string, firmCode: string, signStateValue: string, page: number) {
  const body = new URLSearchParams({
    pagesize: '100',
    WorkPlace: '0',
    WHSearch: 'whatever',
    KeyWord: '',
    Sdate: '',
    Edate: '',
    SearchBySignState: signStateValue,
    SearchByType: '-1',
    SearchByReceivingState: '-1',
    Sdate2: '',
    Edate2: '',
    SCode: '',
    ECode: '',
    SearchFirmCode: firmCode
  })
  const res = await fetchDcUpstream(sessionCookie, `/COAERP/SalesOrder/index/0/${page}?pagesize=100`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString()
  })
  const html = await res.text()
  return parseOrderRows(html)
}

async function fetchSlipPage(sessionCookie: string, firmCode: string, page: number): Promise<AutomationSlipRow[]> {
  const body = new URLSearchParams({
    pagesize: '50',
    IsUsingFA: 'True',
    WorkPlace: '0',
    WHSearch: 'whatever',
    KeyWord: '',
    Sdate: '',
    Edate: '',
    SearchByType: '-1',
    SignType: '-1',
    SCode: '',
    ECode: '',
    Temperature: '-1',
    SearchFirmCode: firmCode,
    ParentFirm: '0',
    CustomerCategory: '不拘',
    SearchInvoiceCode: '',
    IsCreateInvoice: '0',
    IsPrintReceipt: '0'
  })
  const res = await fetchDcUpstream(sessionCookie, `/COAERP/SalesSlip/index/0/${page}?pagesize=50`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString()
  })
  const html = await res.text()
  return parseSlipRows(html)
}

// 查「指定客戶、尚未簽核」的訂貨單（全部頁）。「未簽核」實際的
// SearchBySignState value 不寫死猜——先打一次拿下拉選單真正的選項清單，
// 找 label 含「未簽核」那個的 value 再用，跟 sales-orders.get.ts 同樣邏輯。
// 查「指定客戶、尚未簽核」的訂貨單（全部頁）。「未簽核」實際的
// SearchBySignState value 不寫死猜——先打一次拿下拉選單真正的選項清單，
// 找 label 含「未簽核」那個的 value 再用，跟 sales-orders.get.ts 同樣邏輯。
//
// remarkKeyword（選填）：同一個客戶代號底下可能混著完全不同種類的訂單
// （例如同一個「會館-廚房」客戶代號 100015，備註分別是「藥草」「豆腐」
// 「麵包」「乾貨」「雞蛋*1箱」等），只靠客戶代號篩會把不相干的訂單也一起
// 簽核轉銷。有給 remarkKeyword 時，只留備註「包含」這些關鍵字其中之一的
// 訂單；可以用逗號（半形 , 或全形 ，）分隔填多個關鍵字，例如
// "藥草,茶葉" 代表備註只要含「藥草」或「茶葉」任一個就算符合。留空就跟
// 以前一樣不篩，整個客戶代號底下都處理。
// 如果同一個客戶代號要分成好幾組各自獨立跑（各自分開簽核/轉銷/列印），
// 不要把好幾組關鍵字塞在同一筆——「設定」頁可以對同一個客戶代號新增
// 好幾筆，各自填不同的備註名稱＋關鍵字即可，彼此獨立執行。
// 原網站日期格式是民國年「115/09/17」，轉成可比較的 {year, month, day}
// （year 已經加回 1911，變西元年）。格式不對就回傳 null。
function parseRocDate(s: string): { year: number; month: number; day: number } | null {
  const m = s.trim().match(/^(\d+)\/(\d{1,2})\/(\d{1,2})$/)
  if (!m) return null
  return { year: Number(m[1]) + 1911, month: Number(m[2]), day: Number(m[3]) }
}

// 用「台灣時間現在幾點」算「今天」，不管這台伺服器（Netlify Functions）
// 本身的系統時區是什麼，都用固定 UTC+8 位移換算，避免半夜時段因為伺服器
// 用 UTC 時間，算出來的「今天」早或晚了一天。
function todayInTaiwan(): { year: number; month: number; day: number } {
  const taiwanNow = new Date(Date.now() + 8 * 60 * 60 * 1000)
  return { year: taiwanNow.getUTCFullYear(), month: taiwanNow.getUTCMonth() + 1, day: taiwanNow.getUTCDate() }
}

function isTodayOrLater(rocDateStr: string): boolean {
  const parsed = parseRocDate(rocDateStr)
  if (!parsed) return false // 日期解析失敗就保守排除，不猜
  const today = todayInTaiwan()
  if (parsed.year !== today.year) return parsed.year > today.year
  if (parsed.month !== today.month) return parsed.month > today.month
  return parsed.day >= today.day
}

export async function findUnsignedOrders(
  sessionCookie: string,
  firmCode: string,
  remarkKeyword = ''
): Promise<AutomationOrderRow[]> {
  const probe = await fetchOrderPage(sessionCookie, firmCode, '-1', 1)
  const unsignedOption = probe.signStateOptions.find((o) => o.label.includes('未簽核'))
  if (!unsignedOption) {
    throw new Error('原網站「簽核狀態」下拉選單找不到「未簽核」選項，可能改版了，請通知開發者核對')
  }

  const first = await fetchOrderPage(sessionCookie, firmCode, unsignedOption.value, 1)
  const all = [...first.rows]
  for (let p = 2; p <= first.totalPages; p++) {
    const page = await fetchOrderPage(sessionCookie, firmCode, unsignedOption.value, p)
    all.push(...page.rows)
  }
  // 只處理交貨日期是「今天或之後」的單——過去日期的單就算還沒簽核，也
  // 大機率是漏處理的舊單，應該人工確認，不要自動簽核轉銷。
  const withGuid = all.filter((r) => r.guid && isTodayOrLater(r.deliveryDate))

  const keywords = remarkKeyword
    .split(/[,，]/)
    .map((k) => k.trim())
    .filter(Boolean)
  if (!keywords.length) return withGuid
  return withGuid.filter((r) => keywords.some((k) => r.remark.includes(k)))
}

export async function signOrders(sessionCookie: string, guids: string[]): Promise<void> {
  const joined = guids.join(',')
  const res = await fetchDcUpstream(sessionCookie, '/COAERP/SalesOrder/MultiSign', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ CurrentPage: '1', StoreCheckedItemJSON: joined, DelChk: joined }).toString()
  })
  const isSuccessRedirect = res.status >= 300 && res.status < 400
  if (!isSuccessRedirect && !res.ok) {
    throw new Error('簽核失敗，原網站回應異常')
  }
}

// 銷貨單自己的簽核，跟上面訂貨單的簽核是兩件事：訂貨單簽核是轉銷前的必要
// 步驟，這個是轉銷＋實際列印之後才要做的——只有「確定有列印成功」才會呼叫
// 這個函式（見 runCustomerPipeline），跟 sales-slip-sign.post.ts 同一套
// 參數格式（POST /COAERP/SalesSlip/MultiSign，CurrentPage/
// StoreCheckedItemJSON/DelChk）。
export async function signSlip(sessionCookie: string, slipGuid: string): Promise<void> {
  const res = await fetchDcUpstream(sessionCookie, '/COAERP/SalesSlip/MultiSign', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ CurrentPage: '1', StoreCheckedItemJSON: slipGuid, DelChk: slipGuid }).toString()
  })
  const isSuccessRedirect = res.status >= 300 && res.status < 400
  if (!isSuccessRedirect && !res.ok) {
    throw new Error('銷貨單簽核失敗，原網站回應異常')
  }
}

// 簽核後原網站的「可轉銷」規則不完全確定（不是單純已核准就一定顯示，見
// sales-order-form.vue 的說明），這裡簽核完重新查一次目前實際的
// canTransfer 狀態，不用猜的。
export async function refetchTransferableGuids(
  sessionCookie: string,
  firmCode: string,
  guids: string[]
): Promise<Set<string>> {
  const first = await fetchOrderPage(sessionCookie, firmCode, '-1', 1)
  const all = [...first.rows]
  for (let p = 2; p <= first.totalPages; p++) {
    const page = await fetchOrderPage(sessionCookie, firmCode, '-1', p)
    all.push(...page.rows)
  }
  const set = new Set<string>()
  for (const row of all) {
    if (guids.includes(row.guid) && row.canTransfer) set.add(row.guid)
  }
  return set
}

export async function transferOrder(sessionCookie: string, guid: string): Promise<void> {
  const res = await fetchDcUpstream(sessionCookie, `/COAERP/SalesOrder/TransSalesSlip/${encodeURIComponent(guid)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: ''
  })
  const text = (await res.text()).trim()
  if (text !== 'True') {
    throw new Error(text && text !== 'False' ? text : '轉入銷貨單失敗')
  }
}

// 轉銷後 COAERP 不會直接回傳新建銷貨單的 Guid，這裡用「同客戶＋交貨日期
// 相同＋金額相同」在銷貨單列表第一頁（預設應該是新的在前面）比對，只有
// 「剛好唯一符合一筆」才採用——找不到或找到多筆都不猜，回傳 null，該筆
// 訂單就不自動列印，交給使用者自己到銷貨單列表核對，比印錯單安全。
// 只查第一頁（最多 50 筆）：這是抓「剛轉銷、理論上最新」的那筆，正常情況
// 不需要往後翻頁；如果同一客戶短時間內轉銷量很大導致漏頁，之後可以再加。
export async function findMatchingSlip(
  sessionCookie: string,
  firmCode: string,
  order: AutomationOrderRow
): Promise<AutomationSlipRow | null> {
  const rows = await fetchSlipPage(sessionCookie, firmCode, 1)
  const candidates = rows.filter(
    (r) => r.firmName === order.firmName && r.deliveryDate === order.deliveryDate && r.total === order.total
  )
  return candidates.length === 1 ? candidates[0] : null
}

// 找「中一刀-半長」樣式的 PDF 列印格式，比對邏輯跟 sales-slips.vue 的
// COMMON_PRINT_STYLE_MATCH 一致（用 includes 而不是完全比對，避免原網站
// 樣式名稱多一個空格/全形符號就整個匹配不到）。
export async function findMatchingPrintFormat(sessionCookie: string): Promise<PrintStyleFormat> {
  const query = new URLSearchParams({
    guid: '',
    doccode: 'SalesSlip',
    pagecode: 'SalesSlip',
    selected: 'false',
    modal: 'false',
    ispost: 'true',
    crosspage: 'true',
    KeepThis: 'true'
  })
  const res = await fetchDcUpstream(
    sessionCookie,
    `/COAERP/ReportPrint/SelectListReportBySalesSlip?${query.toString()}`,
    { method: 'GET' }
  )
  const html = await res.text()
  const $ = load(html)

  let found: PrintStyleFormat | null = null
  $('table#Table1 tr').each((_: number, tr: any) => {
    if (found) return
    const $tds = $(tr).find('td')
    if (!$tds.length) return
    const name = $tds.eq(0).text().trim()
    if (!(name.includes('中一刀') && name.includes('半長'))) return
    $tds.eq(1).find('a').each((__: number, a: any) => {
      if (found) return
      const $a = $(a)
      const onclick = $a.attr('onclick') || ''
      const match = onclick.match(/PrintSubmit\('([^']*)','([^']*)'\)/)
      if (match && match[2] === 'pdf') {
        found = { reportId: match[1], format: match[2], label: $a.text().trim() }
      }
    })
  })

  if (!found) {
    throw new Error('找不到「中一刀-半長」的 PDF 列印樣式，可能改版了，請通知開發者核對')
  }
  return found
}

// 下載 PDF，上傳到 Spring Boot（DcErpAutomationController）存放——Netlify
// 上的 Nitro serverless function 本機檔案系統不可靠，不能寫本機再靠本機
// 讀回，見檔頭說明。回傳的 url 是可以直接下載/預覽的完整網址。
// shouldPrint=true 時，Spring Boot 存檔成功後會緊接著送去「新中一刀」
// 印表機列印（見 DcErpAutomationController 的 dispatchAutomationPrint()），
// 印表機離線/卡紙等問題不會讓這支拋錯——PDF 存檔成功比較重要，列印的
// 成敗另外用 printOk/printError 回傳。
// ⚠️ printOk 現在是「送出去沒有立即出錯」，不是「確認印表機真的回應成功」
// ——Spring Boot 那邊改成只等很短時間（幾秒）確認 Agent 有沒有連線，不會
// 等印表機實際回應才回傳，避免整條自動化流程等太久被 Netlify 判定逾時、
// 回應 504。真正的列印結果（成功/失敗）記在 Spring Boot 自己的 log，
// 不會反映在這裡的 printOk。
export async function downloadSlipPdf(
  sessionCookie: string,
  slipGuid: string,
  fmt: PrintStyleFormat,
  fileLabel: string,
  shouldPrint: boolean
): Promise<{ fileName: string; url: string; printOk: boolean; printError: string }> {
  const body = new URLSearchParams({
    guid: slipGuid,
    reportid: fmt.reportId,
    reportformat: fmt.format,
    tType: '1',
    printtype: '0' // 依選取結果
  })
  const res = await fetchDcUpstream(sessionCookie, '/COAERP/SalesSlip/ViewListReport', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString()
  })

  const contentType = res.headers.get('content-type') || ''
  if (contentType.includes('text/html')) {
    throw new Error('原網站沒有回傳 PDF（回傳了 HTML），可能是條件不符或報表樣式改版了')
  }

  const buffer = Buffer.from(await res.arrayBuffer())
  // 檔名避免特殊符號：只留單號/時間戳
  const safeLabel = fileLabel.replace(/[^\w-]/g, '_')
  const fileName = `${safeLabel}_${Date.now()}.pdf`

  const apiBase = useRuntimeConfig().public.apiBase
  const uploadRes = await fetch(
    `${apiBase}/holy/dc-erp/automation/pdf/${encodeURIComponent(fileName)}?print=${shouldPrint}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/pdf' },
      body: buffer
    }
  )
  if (!uploadRes.ok) {
    throw new Error('PDF 上傳到後端失敗')
  }
  const uploaded = await uploadRes.json()
  return {
    fileName,
    url: `${apiBase}${uploaded.url}`,
    printOk: shouldPrint ? !!uploaded.printOk : false,
    printError: shouldPrint ? (uploaded.printError || '') : ''
  }
}

// 「查未簽核 → 簽核 → 轉銷 → 找對應單 → 下載 PDF」整套流程，抽成一個函式
// 讓 run-customer.post.ts（瀏覽器手動觸發）跟排程/外部 cron 觸發的入口
// （server/tasks/dc-erp-weekly-automation.ts、
// server/api/dc-erp/automation/run-scheduled.post.ts）共用同一份邏輯，
// 不要各寫一份、之後改一邊忘了改另一邊。
export interface CustomerRunResult {
  dryRun: boolean
  matchedCount: number
  orders?: Array<{ code: string; deliveryDate: string; firmName: string; total: string; remark: string }>
  results?: Array<{
    code: string
    firmName: string
    deliveryDate: string
    total: string
    signOk: boolean
    transferOk: boolean
    matchedSlipCode: string
    pdfOk: boolean
    fileName: string
    url: string
    printOk: boolean
    slipSignOk: boolean
    transferError: string
    pdfError: string
    printError: string
    slipSignError: string
  }>
}

export async function runCustomerPipeline(
  sessionCookie: string,
  firmCode: string,
  dryRun: boolean,
  remarkKeyword = '',
  printEnabled = false
): Promise<CustomerRunResult> {
  const targetOrders = await findUnsignedOrders(sessionCookie, firmCode, remarkKeyword)

  if (dryRun) {
    return {
      dryRun: true,
      matchedCount: targetOrders.length,
      orders: targetOrders.map((o) => ({
        code: o.code,
        deliveryDate: o.deliveryDate,
        firmName: o.firmName,
        total: o.total,
        remark: o.remark
      }))
    }
  }

  if (!targetOrders.length) {
    return { dryRun: false, matchedCount: 0, results: [] }
  }

  const results = targetOrders.map((o) => ({
    code: o.code,
    firmName: o.firmName,
    deliveryDate: o.deliveryDate,
    total: o.total,
    signOk: false,
    transferOk: false,
    matchedSlipCode: '',
    pdfOk: false,
    fileName: '',
    url: '',
    printOk: false,
    slipSignOk: false,
    transferError: '',
    pdfError: '',
    printError: '',
    slipSignError: ''
  }))

  try {
    await signOrders(sessionCookie, targetOrders.map((o) => o.guid))
    results.forEach((r) => { r.signOk = true })
  } catch (err: any) {
    results.forEach((r) => { r.transferError = '簽核失敗，未進行轉銷：' + (err?.message || '') })
    return { dryRun: false, matchedCount: targetOrders.length, results }
  }

  const transferableGuids = await refetchTransferableGuids(
    sessionCookie,
    firmCode,
    targetOrders.map((o) => o.guid)
  )

  let printFmt: PrintStyleFormat | null = null

  for (let i = 0; i < targetOrders.length; i++) {
    const order = targetOrders[i]
    const result = results[i]

    if (!transferableGuids.has(order.guid)) {
      result.transferError = '簽核後目前不符合轉銷條件（原網站規則不完全確定，不是單純已核准就會顯示），已略過'
      continue
    }

    try {
      await transferOrder(sessionCookie, order.guid)
      result.transferOk = true
    } catch (err: any) {
      result.transferError = err?.message || '轉入銷貨單失敗'
      continue
    }

    const slip = await findMatchingSlip(sessionCookie, firmCode, order)
    if (!slip) {
      result.transferError = '已轉銷，但在銷貨單列表找不到「唯一」符合的對應單，請自行到銷貨單核對並手動列印'
      continue
    }
    result.matchedSlipCode = slip.code

    try {
      if (!printFmt) printFmt = await findMatchingPrintFormat(sessionCookie)
      const saved = await downloadSlipPdf(sessionCookie, slip.guid, printFmt, `${order.code}_${slip.code}`, printEnabled)
      result.pdfOk = true
      result.fileName = saved.fileName
      result.url = saved.url
      result.printOk = saved.printOk
      result.printError = saved.printError

      // 只有「確定有列印成功」才簽核銷貨單——沒開列印、或列印失敗（印表機
      // 離線/卡紙等），都不簽，避免單子被標記成已處理但其實沒真的印出來。
      if (result.printOk) {
        try {
          await signSlip(sessionCookie, slip.guid)
          result.slipSignOk = true
        } catch (err: any) {
          result.slipSignError = err?.message || '銷貨單簽核失敗'
        }
      }
    } catch (err: any) {
      result.pdfError = err?.message || 'PDF 下載失敗'
    }
  }

  return { dryRun: false, matchedCount: targetOrders.length, results }
}

// 把一次執行結果算成幾個數字，給 automationLog.ts 存執行紀錄用——只留
// 「發生了幾件」這種摘要，不把整份 results（含每張單的 PDF 網址等）都存
// 進紀錄裡，紀錄太肥、之後查起來也不方便。
export function summarizeRunResult(result: CustomerRunResult) {
  const results = result.results || []
  return {
    matchedCount: result.matchedCount,
    signCount: results.filter((r) => r.signOk).length,
    transferCount: results.filter((r) => r.transferOk).length,
    pdfCount: results.filter((r) => r.pdfOk).length,
    printCount: results.filter((r) => r.printOk).length,
    slipSignCount: results.filter((r) => r.slipSignOk).length,
    errorCount: results.filter(
      (r) => r.transferError || r.pdfError || r.printError || r.slipSignError
    ).length
  }
}
