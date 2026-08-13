// server/api/dc-erp/products.get.ts
//
// 對應原網站「基本資料 > 品項資料管理」（/COAERP/Prod/index）。跟
// sales-orders.get.ts／sales-slips.get.ts 同一套做法：把原網站的查詢表單
// 和列表資料解析成 JSON，前端自己重畫。
//
//   - 篩選送出 → POST /COAERP/Prod/index/0/{page}?pagesize={pagesize}，
//     帶欄位 name 直接對應原表單（WHSearch／KeyWord）
//   - 「列出全部」→ GET /COAERP/Prod/index?all=true&pagesize={pagesize}
//
// 【尚未實作，先跳過】原網站查詢表單還有「依所屬類別」三層連動下拉
// （ClassSelect1/2/3，透過 ProductClass/GetParentSelect AJAX 動態產生選項，
// 不是寫死在 HTML 裡）跟「依是否停用」。「依是否停用」的選項是靜態 HTML，
// 已經解析；「依所屬類別」連動下拉因為沒有 GetParentSelect 真實回應樣本，
// 這裡先不做——如果要加這個篩選，麻煩在原網站選第一層類別時，把該次
// AJAX 請求的 Network 記錄（Request URL + Response）貼給我核對。
//
// 需要安裝 cheerio：npm install cheerio

import { load } from 'cheerio'

export default defineEventHandler(async (event) => {
  const sessionCookie = requireDcUpstreamSession(event)
  const query = getQuery(event)

  const page = query.page ? String(query.page) : '1'
  const pagesize = query.pagesize ? String(query.pagesize) : '20'
  const isAll = query.all === 'true' || query.all === '1'

  let res: Response
  if (isAll) {
    res = await fetchDcUpstream(
      sessionCookie,
      `/COAERP/Prod/index?all=true&pagesize=${encodeURIComponent(pagesize)}`
    )
  } else {
    const body = new URLSearchParams({
      pagesize,
      WHSearch: query.whSearch ? String(query.whSearch) : 'whatever',
      KeyWord: query.keyword ? String(query.keyword) : '',
      SelectDisable: query.selectDisable ? String(query.selectDisable) : 'whatever'
    })

    res = await fetchDcUpstream(
      sessionCookie,
      `/COAERP/Prod/index/0/${encodeURIComponent(page)}?pagesize=${encodeURIComponent(pagesize)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: body.toString()
      }
    )
  }

  const html = await res.text()
  const $ = load(html)

  function parseSelectOptions($select: any) {
    const options: Array<{ value: string, label: string, selected: boolean }> = []
    $select.find('option').each((_: number, opt: any) => {
      const $opt = $(opt)
      options.push({
        value: $opt.attr('value') || '',
        label: $opt.text().trim(),
        selected: $opt.attr('selected') !== undefined
      })
    })
    return options
  }

  const filters = {
    whSearchField: parseSelectOptions($('select[name="WHSearch"]')),
    selectDisable: parseSelectOptions($('select[name="SelectDisable"]'))
  }

  const items: Array<Record<string, any>> = []
  $('#TableList tr').each((i: number, tr: any) => {
    if (i === 0) return // 表頭列
    const $tds = $(tr).find('td')
    if ($tds.length < 9) return // 略過空列 / 非資料列

    const $codeLink = $($tds[2]).find('a')
    const editHref = $codeLink.attr('href') || ''
    const idMatch = editHref.match(/Prod\/Edit\/(\d+)/)
    const id = idMatch ? idMatch[1] : ''

    items.push({
      id,
      seq: $($tds[1]).text().trim(),
      code: $codeLink.text().trim(),
      editUrl: id ? `/staff/order/dc-erp/product-form?id=${id}` : '',
      name: $($tds[3]).find('a').text().trim() || $($tds[3]).text().trim(),
      unitName: $($tds[4]).text().trim(),
      saveDays: $($tds[5]).text().trim(),
      // 備註在原網站是 <span title="完整內容">截斷顯示...</span>，title 屬性才是完整內容。
      remark: $($tds[6]).find('span').attr('title') || $($tds[6]).text().trim(),
      productClass: $($tds[7]).text().trim(),
      isDisable: $($tds[8]).text().trim()
    })
  })

  // 「總計4174筆/ 總計209頁」是頁面上的純文字，直接對整份 HTML 做正則比對。
  const totalMatch = html.match(/總計([\d,]+)筆\/\s*總計([\d,]+)頁/)
  const totalCount = totalMatch ? Number(totalMatch[1].replace(/,/g, '')) : items.length
  const totalPages = totalMatch ? Number(totalMatch[2].replace(/,/g, '')) : 1

  let breadcrumb: string[] = []
  const breadcrumbMatch = html.match(/NavigationBarJson\s*=\s*\$\.parseJSON\('(.+?)'\)/)
  if (breadcrumbMatch) {
    try {
      const arr = JSON.parse(breadcrumbMatch[1])
      breadcrumb = arr.map((x: any) => x.Name).reverse()
    } catch {
      // 解析失敗就算了，麵包屑不影響主要功能
    }
  }

  return {
    filters,
    items,
    totalCount,
    totalPages,
    page: Number(page),
    pagesize: Number(pagesize),
    breadcrumb
  }
})
