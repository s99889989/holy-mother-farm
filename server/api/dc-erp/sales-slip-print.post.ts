// server/api/dc-erp/sales-slip-print.post.ts
//
// 銷貨單列表頁「列印」：對應原網站 PrintSubmit() 依選取結果時送出的
// POST /COAERP/SalesSlip/ViewListReport，欄位直接照 JS 原始碼讀出（不是
// 猜的）：
//   guid         已勾選訂單的 Guid，逗號分隔
//   reportid     報表代碼（由使用者選的樣式按鈕決定，可能是負數）
//   reportformat 'pdf' / 'excel' / 'csv'（同樣由按鈕決定，直接照按鈕文字對應的
//                onclick 參數帶，不做轉換）
//   tType        表頭：1=依單位名稱、2=依場別名稱
//   printtype    固定 '0'（依選取結果——本站只做這個模式，見
//                sales-slip-print-styles.get.ts 的說明）
//
// 前端（sales-slips.vue）用一個「真正的」<form method="post" target="_blank">
// 直接送到這支 route，瀏覽器原生表單送出，dc_upstream_session（httpOnly
// cookie）會自動帶上，不用另外處理。guids 用逗號分隔字串（不是陣列）傳入，
// 這樣原生表單一個 hidden input 就能帶，也剛好對應上游 guid 參數本來就是
// 逗號分隔字串的格式。
//
// 原網站回應可能是兩種（處理方式比照 sales-statistics-month.post.ts）：
//   1. 實際的報表檔案（PDF／Excel／CSV 二進位內容）→ 直接把 bytes 轉送
//      回去，連同原始 Content-Type／Content-Disposition，讓瀏覽器自己決定
//      下載還是另開檢視。
//   2. 一份 HTML（報表檢視器頁面，或條件不合法時的錯誤頁）→ 比照
//      page.get.ts 的做法，把頁內連結／資源改寫成繼續走 /api/dc-erp/page
//      代理，這樣報表檢視器頁面本身的按鈕、圖片才不會壞掉。
//
// 需要安裝 cheerio：npm install cheerio

import { load } from 'cheerio'

export default defineEventHandler(async (event) => {
  const sessionCookie = requireDcUpstreamSession(event)
  const body = await readBody(event)

  const guidsRaw = typeof body?.guids === 'string' ? body.guids : ''
  const guids = guidsRaw
    .split(',')
    .map((g: string) => g.trim())
    .filter(Boolean)

  const reportId = body?.reportId ? String(body.reportId) : ''
  const reportFormat = body?.reportFormat ? String(body.reportFormat) : ''
  const titleType = body?.titleType ? String(body.titleType) : '1'

  if (!guids.length) {
    throw createError({ statusCode: 400, statusMessage: '請至少選擇一張銷貨單' })
  }
  if (!reportId) {
    throw createError({ statusCode: 400, statusMessage: '缺少報表代碼（reportid）' })
  }

  const upstreamBody = new URLSearchParams({
    guid: guids.join(','),
    reportid: reportId,
    reportformat: reportFormat,
    tType: titleType,
    printtype: '0' // 依選取結果
  })

  const res = await fetchDcUpstream(sessionCookie, '/COAERP/SalesSlip/ViewListReport', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: upstreamBody.toString()
  })

  const contentType = res.headers.get('content-type') || ''

  // 非 HTML（PDF／Excel／CSV 等二進位檔案）：直接轉送 bytes + 原始的
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
  const targetUrl = new URL('/COAERP/SalesSlip/ViewListReport', `${DC_ORIGIN}/`)

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
