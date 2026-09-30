// server/utils/dc-erp/salesStatisticsList.ts
//
// 「銷貨統計明細」（原網站 統計報表 > 銷貨統計報表 > 銷貨統計明細，
// /COAERP/SalesStatistics/SearchSalesStatisticsList）共用工具。
//
// 原網站機制（已用頁面原始碼 + StatisticsSearch.js 核對）：
//   - 查詢頁是一張 <form id="inputFrom" method="post" target="_blank">，
//     action 就是頁面本身 /COAERP/SalesStatistics/SearchSalesStatisticsList。
//     target="_blank" 是在新視窗送出，所以原分頁 DevTools 抓不到這筆請求。
//   - 每個報表的「列印」「EXCEL」按鈕都是呼叫 SetReportID(reportid, filepath, outType)，
//     只做三件事：#reportformat = outType（EXCEL 或空字串）、#ReportID = reportid、
//     #FilePath = filepath，然後把整張表單送出。
//   - 客戶日期銷售品項明細表-(A4)：ReportID=7698、FilePath=SalesStatisticsList16。
//   - 對象編號：SetFirmInfo() 只填 FirmCodeS/E（代號），不會填 FirmIDS/E，
//     原網站是靠代號查詢，FirmIDS/E 送空字串。
//   - 場別：WorkPlaceCodeS/E 跟 WorkPlaceSelectS/E 是連動的（選單改變時把
//     值寫進 Code 欄位），兩個欄位送同一個值。
//   - 單據來源勾選框是 ASP.NET MVC 的 checkbox 寫法：勾選時送
//     SaleSlipData=true&SaleSlipData=false，沒勾只送 SaleSlipData=false。
//   - 日期：原網站頁面預設值是西元 yyyy/MM/dd（2026/09/01），這裡照送西元。
//     下載的 Excel 表頭有「銷售日期：115/09/01至115/09/30」，解析時會一起
//     回傳 periodText，畫面上顯示出來，可以核對原網站實際套用的期間。
//
// Excel 解析需要安裝 SheetJS：npm install xlsx
//
// 注意：xlsx 一定要用檔案開頭的「靜態 import」。曾試過改成函式內動態
// import('xlsx')（想讓沒裝套件時只壞這一支 API），但 Nitro dev 在 Windows
// 會把動態 import 的套件路徑改寫成 C:\... 絕對路徑，Node ESM loader 不吃，
// 直接噴「Only URLs with a scheme in: file, data, and node are supported」。
// 靜態 import 在 dev 跟 build（會被 Nitro 追蹤打包進 .output）都正常。
// 代價是：沒安裝 xlsx 時整個後端都會啟動失敗（所有頁面都打不開），
// 看到「Cannot find package 'xlsx'」就是忘了 npm install xlsx。

import * as XLSX from 'xlsx'

export const SALES_STATISTICS_LIST_PATH = '/COAERP/SalesStatistics/SearchSalesStatisticsList'

// 目前只做「客戶日期銷售品項明細表-(A4)」
export const CUSTOMER_DATE_PRODUCT_REPORT = {
  reportId: '7698',
  filePath: 'SalesStatisticsList16',
  name: '客戶日期銷售品項明細表'
}

export interface SalesStatisticsListQuery {
  companyId?: string
  dateS: string // yyyy/MM/dd
  dateE: string // yyyy/MM/dd
  firmCodeS?: string
  firmCodeE?: string
  workPlaceS?: string
  workPlaceE?: string
  prodCodeS?: string
  prodCodeE?: string
  parentFirmID?: string
  firmType?: string
  saleSlipData?: boolean
  saleReturnData?: boolean
  signState?: string
  formType?: string
}

// 把前端 query（字串）整理成查詢條件，並檢查必填
export function readSalesStatisticsListQuery(query: Record<string, any>): SalesStatisticsListQuery {
  const str = (v: any) => (v == null ? '' : String(v).trim())
  const bool = (v: any, def: boolean) => (v == null || v === '' ? def : v === true || v === 'true' || v === '1')

  // 前端 <input type="date"> 是 yyyy-MM-dd，原網站要 yyyy/MM/dd
  const toSlash = (v: string) => v.replace(/-/g, '/')

  const q: SalesStatisticsListQuery = {
    companyId: str(query.companyId),
    dateS: toSlash(str(query.dateS)),
    dateE: toSlash(str(query.dateE)),
    firmCodeS: str(query.firmCodeS),
    firmCodeE: str(query.firmCodeE),
    workPlaceS: str(query.workPlaceS),
    workPlaceE: str(query.workPlaceE),
    prodCodeS: str(query.prodCodeS),
    prodCodeE: str(query.prodCodeE),
    parentFirmID: str(query.parentFirmID) || '0',
    firmType: str(query.firmType) || '不拘',
    saleSlipData: bool(query.saleSlipData, true),
    saleReturnData: bool(query.saleReturnData, true),
    signState: query.signState == null ? 'sign' : str(query.signState),
    formType: str(query.formType) || '-1'
  }

  if (!q.dateS || !q.dateE) {
    throw createError({ statusCode: 400, statusMessage: '期間必填' })
  }
  if (!q.saleSlipData && !q.saleReturnData) {
    throw createError({ statusCode: 400, statusMessage: '單據來源至少要勾選一個（銷貨單或銷貨退回單）' })
  }
  return q
}

// 組出跟原網站表單送出時一樣的 form body
function buildFormBody(q: SalesStatisticsListQuery, reportId: string, filePath: string, format: string) {
  const b = new URLSearchParams()
  b.append('CompanyId', q.companyId || '')
  b.append('ReportID', reportId)
  b.append('FilePath', filePath)
  b.append('reportformat', format)
  b.append('DateS', q.dateS)
  b.append('DateE', q.dateE)
  b.append('FirmIDS', '')
  b.append('FirmCodeS', q.firmCodeS || '')
  b.append('FirmIDE', '')
  b.append('FirmCodeE', q.firmCodeE || '')
  b.append('WorkPlaceCodeS', q.workPlaceS || '')
  b.append('WorkPlaceSelectS', q.workPlaceS || '')
  b.append('WorkPlaceCodeE', q.workPlaceE || '')
  b.append('WorkPlaceSelectE', q.workPlaceE || '')
  b.append('ProdCodeS', q.prodCodeS || '')
  b.append('ProdCodeE', q.prodCodeE || '')
  b.append('ParentFirmID', q.parentFirmID || '0')
  b.append('FirmType', q.firmType || '不拘')
  if (q.saleSlipData) b.append('SaleSlipData', 'true')
  b.append('SaleSlipData', 'false')
  if (q.saleReturnData) b.append('SaleReturnData', 'true')
  b.append('SaleReturnData', 'false')
  b.append('SignState', q.signState || '')
  b.append('FormType', q.formType || '-1')
  return b.toString()
}

function looksLikeExcel(buf: Buffer, contentType: string) {
  // .xls（OLE2 / CDFV2）開頭是 D0 CF 11 E0；.xlsx 是 zip，開頭 PK
  if (buf.length >= 4 && buf[0] === 0xd0 && buf[1] === 0xcf && buf[2] === 0x11 && buf[3] === 0xe0) return true
  if (buf.length >= 2 && buf[0] === 0x50 && buf[1] === 0x4b) return true
  return /excel|spreadsheet/i.test(contentType)
}

function filenameFromDisposition(disposition: string) {
  const star = disposition.match(/filename\*\s*=\s*(?:UTF-8'')?([^;]+)/i)
  if (star) {
    try { return decodeURIComponent(star[1].trim().replace(/^"|"$/g, '')) } catch { /* ignore */ }
  }
  const plain = disposition.match(/filename\s*=\s*"?([^";]+)"?/i)
  if (plain) {
    try { return decodeURIComponent(plain[1].trim()) } catch { return plain[1].trim() }
  }
  return ''
}

async function followRedirects(sessionCookie: string, res: Response) {
  for (let i = 0; i < 3 && res.status >= 300 && res.status < 400; i++) {
    const location = res.headers.get('location')
    if (!location) break
    const u = new URL(location, DC_ORIGIN)
    res = await fetchDcUpstream(sessionCookie, u.pathname + u.search)
  }
  return res
}

// 跟原網站要 Excel 檔（原封不動的檔案內容）
export async function fetchSalesStatisticsListExcel(
  sessionCookie: string,
  q: SalesStatisticsListQuery,
  report = CUSTOMER_DATE_PRODUCT_REPORT
) {
  let res = await fetchDcUpstream(sessionCookie, SALES_STATISTICS_LIST_PATH, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: buildFormBody(q, report.reportId, report.filePath, 'EXCEL')
  })
  res = await followRedirects(sessionCookie, res)

  let contentType = res.headers.get('content-type') || ''
  let disposition = res.headers.get('content-disposition') || ''
  let buf = Buffer.from(await res.arrayBuffer())

  // 保險：如果原網站不是直接回檔案，而是回一頁 HTML 再導去暫存檔，
  // 從 HTML 裡找 .xls/.xlsx 的連結再抓一次。
  if (!looksLikeExcel(buf, contentType)) {
    const html = buf.toString('utf8')
    const m = html.match(/["'(=]\s*([^"'()\s<>]*\.xlsx?(?:\?[^"'()\s<>]*)?)\s*["')]/i)
    if (m) {
      const u = new URL(m[1], new URL(SALES_STATISTICS_LIST_PATH, DC_ORIGIN))
      let fileRes = await fetchDcUpstream(sessionCookie, u.pathname + u.search)
      fileRes = await followRedirects(sessionCookie, fileRes)
      contentType = fileRes.headers.get('content-type') || ''
      disposition = fileRes.headers.get('content-disposition') || disposition
      buf = Buffer.from(await fileRes.arrayBuffer())
    }
  }

  if (!looksLikeExcel(buf, contentType)) {
    const snippet = buf.toString('utf8').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 200)
    throw createError({
      statusCode: 502,
      statusMessage: `原網站沒有回傳 Excel 檔${snippet ? `：${snippet}` : ''}`
    })
  }

  const filename = filenameFromDisposition(disposition) ||
    `${report.name}_${q.dateS.replace(/\//g, '')}-${q.dateE.replace(/\//g, '')}.xls`

  return { buffer: buf, filename, contentType: contentType || 'application/vnd.ms-excel' }
}

// ---------- 解析「客戶日期銷售品項明細表」Excel ----------
//
// 已用真實下載檔（rptSalesStatisticsList16_20260930.xls）核對格式：
//   - 前幾列是表頭（機構名、製表日期、報表名稱、頁數），接著一列
//     「銷售日期：115/09/01至115/09/30」
//   - 欄位列：客戶編號｜客戶｜銷售日期｜品項｜數量｜搭量｜單位｜單價｜金額
//     （有合併儲存格，值在合併範圍左上角，所以用欄位列的文字定位欄號，不寫死）
//   - 客戶編號/客戶只出現在該客戶的第一列，之後同客戶的列是空白，要往下沿用
//   - 每個客戶結束有一列「合計：」，最後一列「總計：」（寫在品項欄）
//   - 多頁時表頭/欄位列可能重複出現，遇到就略過

export interface SalesStatisticsListRow {
  date: string
  product: string
  qty: number
  giftNum: number
  unit: string
  price: number
  amount: number
}

export interface SalesStatisticsListCustomer {
  firmCode: string
  firmName: string
  items: SalesStatisticsListRow[]
  subtotal: { qty: number, giftNum: number, amount: number }
}

const toNum = (v: any) => {
  const n = Number(String(v ?? '').replace(/,/g, '').trim())
  return Number.isFinite(n) ? n : 0
}

export async function parseCustomerDateProductExcel(buf: Buffer) {
  const wb = XLSX.read(buf, { type: 'buffer' })

  let title = ''
  let periodText = ''
  const customers: SalesStatisticsListCustomer[] = []
  let grandTotal: { qty: number, giftNum: number, amount: number } | null = null

  for (const sheetName of wb.SheetNames) {
    const rows: any[][] = XLSX.utils.sheet_to_json(wb.Sheets[sheetName], { header: 1, raw: false, defval: '' })

    let col: Record<string, number> | null = null
    let current: SalesStatisticsListCustomer | null = null

    for (const r of rows) {
      const cells = r.map((c: any) => String(c ?? '').trim())
      const joined = cells.join('')
      if (!joined) continue

      if (!title && cells.includes(CUSTOMER_DATE_PRODUCT_REPORT.name)) title = CUSTOMER_DATE_PRODUCT_REPORT.name
      if (!periodText) {
        const p = cells.find(c => c.startsWith('銷售日期：'))
        if (p) periodText = p.replace('銷售日期：', '')
      }

      // 欄位列（第一次出現時定位欄號；之後重複出現就略過）
      const codeIdx = cells.indexOf('客戶編號')
      if (codeIdx > -1) {
        if (!col) {
          const find = (label: string) => cells.indexOf(label)
          col = {
            code: codeIdx,
            name: find('客戶'),
            date: find('銷售日期'),
            product: find('品項'),
            qty: find('數量'),
            giftNum: find('搭量'),
            unit: find('單位'),
            price: find('單價'),
            amount: find('金額')
          }
        }
        continue
      }
      if (!col) continue

      const get = (key: string) => (col![key] > -1 ? cells[col![key]] || '' : '')
      const product = get('product')

      if (product.startsWith('合計')) {
        if (current) {
          current.subtotal = { qty: toNum(get('qty')), giftNum: toNum(get('giftNum')), amount: toNum(get('amount')) }
        }
        continue
      }
      if (product.startsWith('總計')) {
        grandTotal = { qty: toNum(get('qty')), giftNum: toNum(get('giftNum')), amount: toNum(get('amount')) }
        continue
      }

      const date = get('date')
      if (!date || !product) continue // 表尾（主管/製表人）等非資料列

      const code = get('code')
      const name = get('name')
      if (code && (!current || current.firmCode !== code)) {
        current = { firmCode: code, firmName: name, items: [], subtotal: { qty: 0, giftNum: 0, amount: 0 } }
        customers.push(current)
      }
      if (!current) {
        current = { firmCode: '', firmName: '', items: [], subtotal: { qty: 0, giftNum: 0, amount: 0 } }
        customers.push(current)
      }

      current.items.push({
        date,
        product,
        qty: toNum(get('qty')),
        giftNum: toNum(get('giftNum')),
        unit: get('unit'),
        price: toNum(get('price')),
        amount: toNum(get('amount'))
      })
    }
  }

  // 萬一檔案裡沒有合計列，自己加總補上
  for (const c of customers) {
    if (!c.subtotal.qty && !c.subtotal.amount && c.items.length) {
      c.subtotal = {
        qty: c.items.reduce((s, i) => s + i.qty, 0),
        giftNum: c.items.reduce((s, i) => s + i.giftNum, 0),
        amount: c.items.reduce((s, i) => s + i.amount, 0)
      }
    }
  }
  if (!grandTotal) {
    grandTotal = {
      qty: customers.reduce((s, c) => s + c.subtotal.qty, 0),
      giftNum: customers.reduce((s, c) => s + c.subtotal.giftNum, 0),
      amount: customers.reduce((s, c) => s + c.subtotal.amount, 0)
    }
  }

  return { title: title || CUSTOMER_DATE_PRODUCT_REPORT.name, periodText, customers, grandTotal }
}
