// server/api/dc-erp/sales-slip-print-styles.get.ts
//
// 銷貨單列表頁「列印」燈箱：代理 ReportPrint/SelectListReportBySalesSlip，
// 解析出可選的報表樣式清單。每列樣式底下的格式按鈕（列印/EXCEL/CSV），
// 其 reportid 與格式代碼一律直接從原始 onclick="PrintSubmit(reportid,format)"
// 讀出，不用另外猜規則——這也是為什麼有些樣式（reportid 為負數，例如
// -1/-3/-5）只有 EXCEL 或 CSV、沒有列印按鈕：因為原始頁面上那一列本來就
// 只有一顆 <a>，我們照樣只回傳那一顆。
//
// 表頭（依單位名稱／依場別名稱）下拉選項一併回傳，供畫面上的表頭選單使用。
//
// 「資料範圍」（依選取結果／依查詢結果）本站固定用「依選取結果」——
// 也就是列表頁目前已勾選的訂單清單。「依查詢結果」需要把整個查詢表單
// 條件一起送出，原網站邏輯複雜很多，先不做，此 API 也就不解析這個欄位。
//
// 需要安裝 cheerio：npm install cheerio（其他 dc-erp API 已經在用，應該
// 已經裝過了）。

import { load } from 'cheerio'

export default defineEventHandler(async (event) => {
  const sessionCookie = requireDcUpstreamSession(event)

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

  if (!res.ok) {
    throw createError({ statusCode: 502, statusMessage: '無法載入列印樣式清單，原網站回應異常' })
  }

  const html = await res.text()
  const $ = load(html)

  const styles: Array<{
    name: string
    formats: Array<{ label: string; reportId: string; format: string }>
  }> = []

  $('table#Table1 tr').each((_: number, tr: any) => {
    const $tr = $(tr)
    const $tds = $tr.find('td')
    if (!$tds.length) return // 表頭列是 <th>，沒有 <td>，跳過

    const name = $tds.eq(0).text().trim()
    const formats: Array<{ label: string; reportId: string; format: string }> = []

    $tds.eq(1).find('a').each((__: number, a: any) => {
      const $a = $(a)
      const onclick = $a.attr('onclick') || ''
      const match = onclick.match(/PrintSubmit\('([^']*)','([^']*)'\)/)
      if (!match) return
      formats.push({
        label: $a.text().trim(),
        reportId: match[1],
        format: match[2]
      })
    })

    if (name && formats.length) {
      styles.push({ name, formats })
    }
  })

  const titleTypeOptions: Array<{ value: string; label: string; selected: boolean }> = []
  $('select#ReportTitleType option').each((_: number, opt: any) => {
    const $opt = $(opt)
    titleTypeOptions.push({
      value: $opt.attr('value') || '',
      label: $opt.text().trim(),
      selected: $opt.attr('selected') !== undefined
    })
  })

  return { styles, titleTypeOptions }
})
