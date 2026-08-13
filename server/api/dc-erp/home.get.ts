// server/api/dc-erp/home.get.ts
//
// 對應原網站「首頁」（/COAERP/News/IndexBrowse）。跟 sales-orders.get.ts 同一套
// 做法：把查詢表單 + 公告列表解析成 JSON，前端用自己的樣式重畫。
//
// 這頁比訂貨單維護多一個「待簽核清單」區塊：原網站是頁面載入後另外用 AJAX
// GET /COAERP/News/GetTodoList 拿一段現成的 HTML 字串塞進 #TodoList／
// #HarvestInfo，這裡比照原網站也用同一支 API 抓，直接把原始 HTML 字串傳給
// 前端用 v-html 顯示（仍然是伺服器端用登入 session 拿到的內容，不會外流）。
// 注意：這段 HTML 裡如果有連結，目前還沒特別重寫過，點了不會走我們的代理。
//
// 查詢邏輯比照原網站表單：
//   - 篩選送出 → POST /COAERP/News/IndexBrowse/0/{page}?pagesize={pagesize}
//   - 「列出全部」→ 原網站是先用 JS 清空欄位再送出同一個 POST（相當於全部條件留空）
//
// 需要安裝 cheerio：npm install cheerio

import { load } from 'cheerio'

export default defineEventHandler(async (event) => {
  const sessionCookie = requireDcUpstreamSession(event)
  const query = getQuery(event)

  const page = query.page ? String(query.page) : '1'
  const pagesize = query.pagesize ? String(query.pagesize) : '20'

  const body = new URLSearchParams({
    pagesize,
    SearchTitle: query.title ? String(query.title) : '',
    Sdate: query.sdate ? String(query.sdate) : '',
    Edate: query.edate ? String(query.edate) : '',
    ...(query.includeOutdated === 'true' ? { IsContainOutdated: 'true' } : {})
  })

  const res = await fetchDcUpstream(
    sessionCookie,
    `/COAERP/News/IndexBrowse/0/${encodeURIComponent(page)}?pagesize=${encodeURIComponent(pagesize)}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString()
    }
  )

  const html = await res.text()
  const $ = load(html)

  const items: Array<Record<string, any>> = []
  $('#TableList tr').each((i: number, tr: any) => {
    if (i === 0) return // 表頭列
    const $tds = $(tr).find('td')
    if ($tds.length < 6) return

    const $titleLink = $tds.eq(1).find('a')
    items.push({
      seq: $tds.eq(0).text().trim(),
      title: $titleLink.length ? $titleLink.text().trim() : $tds.eq(1).text().trim(),
      titleUrl: $titleLink.length ? toDcProxiedHref($titleLink.attr('href')) : '',
      workPlace: $tds.eq(2).text().trim(),
      startDate: $tds.eq(3).text().trim(),
      endDate: $tds.eq(4).text().trim(),
      isSign: $tds.eq(5).text().trim()
    })
  })

  const totalMatch = html.match(/總計([\d,]+)筆\/\s*總計([\d,]+)頁/)
  const totalCount = totalMatch ? Number(totalMatch[1].replace(/,/g, '')) : items.length
  const totalPages = totalMatch ? Number(totalMatch[2].replace(/,/g, '')) : 1

  // 首頁的麵包屑固定是「首頁」（NavigationBarJson 是空的），
  // 直接讀頁面上現成的文字比自己組更保險。
  const breadcrumbText = $('div.breadcrumb').first().text().trim() || '目前所在位置：首頁'

  // 待簽核清單：另外打一次原網站的 AJAX endpoint 拿現成 HTML 字串。
  let todoListHtml = ''
  let harvestInfoHtml = ''
  try {
    const todoRes = await fetchDcUpstream(sessionCookie, '/COAERP/News/GetTodoList')
    const todoJson: any = await todoRes.json()
    todoListHtml = todoJson?.TodoList || ''
    harvestInfoHtml = todoJson?.HarvestInfo || ''
  } catch {
    // 待辦清單抓不到就算了，不影響公告列表這個主要功能
  }

  return {
    items,
    totalCount,
    totalPages,
    page: Number(page),
    pagesize: Number(pagesize),
    breadcrumbText,
    todoListHtml,
    harvestInfoHtml
  }
})
