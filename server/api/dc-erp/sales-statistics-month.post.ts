// server/api/dc-erp/sales-statistics-month.post.ts
//
// 對應原網站按下「列印」「EXCEL」時的動作：把整份查詢表單（含 ReportID／
// FilePath／reportformat 三個由按鈕決定的隱藏欄位）POST 到
// /COAERP/SalesStatistics/SearchSalesStatisticsMonth。
//
// 前端（sales-statistics-month.vue）用一個「真正的」<form method="post"
// target="_blank"> 直接送到這支 route，瀏覽器原生表單送出，
// dc_upstream_session（httpOnly cookie）會自動帶上，不用另外處理。
//
// 原網站回應可能是兩種：
//   1. 實際的報表檔案（PDF／Excel 等二進位內容）→ 直接把 bytes 轉送回去，
//      瀏覽器依 Content-Disposition／Content-Type 下載或另開檢視。
//   2. 一份 HTML（報表檢視器頁面，或條件不合法時的錯誤頁）→ 比照
//      page.get.ts 的做法，把頁內連結／資源改寫成繼續走 /api/dc-erp/page
//      代理，這樣報表檢視器頁面本身的按鈕、圖片才不會壞掉。
//
// 重要假設（沒有拿到原網站另一支 StatisticsSearch.js 的原始碼，只能從
// 畫面上 onclick="SetReportID(...)" 的參數反推）：
//   - ReportID／FilePath 就是 SetReportID() 的第一、二個參數
//   - reportformat：「列印」送空字串，「EXCEL」送 'EXCEL'
// 如果實際送出後報表不正確，麻煩到原網站按「列印」時，把瀏覽器 DevTools
// Network 那筆 POST 請求的 Form Data 貼給我核對調整。
//
// 需要安裝 cheerio：npm install cheerio

import { load } from 'cheerio'

export default defineEventHandler(async (event) => {
  const sessionCookie = requireDcUpstreamSession(event)
  const body = await readBody(event)

  const reportId = body.reportId ? String(body.reportId) : ''
  if (!reportId) {
    throw createError({ statusCode: 400, statusMessage: '缺少報表代碼（ReportID）' })
  }

  const boolField = (v: any) => (v === 'true' || v === true ? 'true' : 'false')

  const upstreamBody = new URLSearchParams({
    CompanyId: body.companyId ? String(body.companyId) : '',
    ReportID: reportId,
    FilePath: body.reportName ? String(body.reportName) : '',
    reportformat: body.format ? String(body.format) : '',
    StartY: body.startY ? String(body.startY) : '',
    StartM: body.startM ? String(body.startM) : '1',
    EndM: body.endM ? String(body.endM) : '12',
    FirmCodeS: body.firmCodeS ? String(body.firmCodeS) : '',
    FirmCodeE: body.firmCodeE ? String(body.firmCodeE) : '',
    PeopleKeyWord: body.peopleKeyWord ? String(body.peopleKeyWord) : '',
    IsCustomer: 'true', // 原網站固定勾選且 disabled，無法取消
    IsSupplier: boolField(body.isSupplier),
    IsFarmer: boolField(body.isFarmer),
    IsAssociator: boolField(body.isAssociator),
    WorkPlaceCodeS: body.workPlaceCodeS ? String(body.workPlaceCodeS) : '',
    WorkPlaceSelectS: body.workPlaceSelectS ? String(body.workPlaceSelectS) : '',
    WorkPlaceCodeE: body.workPlaceCodeE ? String(body.workPlaceCodeE) : '',
    WorkPlaceSelectE: body.workPlaceSelectE ? String(body.workPlaceSelectE) : '',
    ProdCodeS: body.prodCodeS ? String(body.prodCodeS) : '',
    ProdCodeE: body.prodCodeE ? String(body.prodCodeE) : '',
    FirmType: body.firmType ? String(body.firmType) : '不拘',
    SaleSlipData: boolField(body.saleSlipData ?? 'true'),
    SaleReturnData: boolField(body.saleReturnData ?? 'true')
  })

  const res = await fetchDcUpstream(sessionCookie, '/COAERP/SalesStatistics/SearchSalesStatisticsMonth', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: upstreamBody.toString()
  })

  const contentType = res.headers.get('content-type') || ''

  // 非 HTML（PDF／Excel／其他二進位檔案）：直接轉送 bytes + 原始的
  // Content-Type／Content-Disposition，讓瀏覽器自己決定下載還是預覽。
  if (!contentType.includes('text/html')) {
    const buffer = Buffer.from(await res.arrayBuffer())
    setResponseHeader(event, 'Content-Type', contentType || 'application/octet-stream')
    const disposition = res.headers.get('content-disposition')
    if (disposition) setResponseHeader(event, 'Content-Disposition', disposition)
    return buffer
  }

  // HTML：比照 page.get.ts，把頁內指回原網站的連結／資源改寫成繼續走代理。
  const html = await res.text()
  const $ = load(html)
  const targetUrl = new URL('/COAERP/SalesStatistics/SearchSalesStatisticsMonth', `${DC_ORIGIN}/`)

  const rewriteAttr = (selector: string, attr: string) => {
    $(selector).each((_: number, el: any) => {
      const $el = $(el)
      const val = $el.attr(attr)
      if (!val || val.startsWith('data:') || val.startsWith('#') || val.toLowerCase().startsWith('javascript:')) {
        return
      }

      let abs: URL
      try {
        abs = new URL(val, targetUrl)
      } catch {
        return
      }

      if (abs.origin !== DC_ORIGIN) return

      const rel = abs.pathname + abs.search
      $el.attr(attr, `/api/dc-erp/page?path=${encodeURIComponent(rel)}`)
    })
  }

  rewriteAttr('link[rel="stylesheet"]', 'href')
  rewriteAttr('script[src]', 'src')
  rewriteAttr('img[src]', 'src')
  rewriteAttr('a[href]', 'href')
  rewriteAttr('form', 'action')
  rewriteAttr('iframe[src]', 'src')

  setResponseHeader(event, 'Content-Type', 'text/html; charset=utf-8')
  return $.html()
})
