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
// ⚠️ 重要限制（先看這段再串排程）：
// COAERP 登入需要人工輸入圖形驗證碼（見 login.post.ts），dc_upstream_session
// 這個 cookie 目前存活 2 小時。這支自動化沒有「自己登入」的能力，一定要
// 有人已經在瀏覽器登入過 dc-erp、session 還沒過期，呼叫這裡的函式才會
// 成功——目前還做不到真正無人值守的「週一早上 8 點自動觸發」，只能先做
// 成「登入後手動按一次」。要接上真正排程，得先解決「自動登入」（例如
// 驗證碼辨識，或想辦法延長/保活 session），這部分還沒做。
//
// 需要安裝 cheerio（其他 dc-erp API 已經在用，應該已經裝過了）。

import { load } from 'cheerio'
import { writeFile, mkdir } from 'node:fs/promises'
import { join } from 'node:path'

export const AUTOMATION_OUTPUT_DIR = join(process.cwd(), 'data', 'dc-erp-automation')

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
export async function findUnsignedOrders(sessionCookie: string, firmCode: string): Promise<AutomationOrderRow[]> {
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
  return all.filter((r) => r.guid)
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

// 下載 PDF 存到 data/dc-erp-automation/ 底下（不在 public/，避免被靜態網址
// 直接讀到），回傳檔名給 download.get.ts 讀回。
export async function downloadSlipPdf(
  sessionCookie: string,
  slipGuid: string,
  fmt: PrintStyleFormat,
  fileLabel: string
): Promise<{ filePath: string; fileName: string }> {
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
  await mkdir(AUTOMATION_OUTPUT_DIR, { recursive: true })
  // 檔名避免特殊符號：只留單號/時間戳
  const safeLabel = fileLabel.replace(/[^\w-]/g, '_')
  const fileName = `${safeLabel}_${Date.now()}.pdf`
  const filePath = join(AUTOMATION_OUTPUT_DIR, fileName)
  await writeFile(filePath, buffer)
  return { filePath, fileName }
}
