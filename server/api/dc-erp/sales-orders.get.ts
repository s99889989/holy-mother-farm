// server/api/dc-erp/sales-orders.get.ts
//
// 對應原網站「進銷存 > 銷貨管理 > 訂貨單維護」（/COAERP/SalesOrder/index）。
// 跟 menu.get.ts／page.get.ts 的整頁代理不同，這支 route 把原網站的查詢表單
// 和列表資料解析成 JSON，前端用自己的 Vue／Tailwind 畫面重畫，不吃原網站的
// 排版（allcss.css／jQuery UI 那套）。
//
// 查詢邏輯比照原網站表單：
//   - 篩選送出 → POST /COAERP/SalesOrder/index/0/{page}?pagesize={pagesize}，
//     帶所有篩選欄位（field name 直接對應原表單的 name，例如 WorkPlace、WHSearch）
//   - 「列出全部」→ GET /COAERP/SalesOrder/index?all=true&pagesize={pagesize}
// 五個下拉選單（依場別／依欄位／簽核狀態／單據種類／訂單狀態）的選項也一併
// 從頁面解析出來回傳，前端用回傳的選項動態畫下拉，不用寫死，原網站選項異動時
// 也不用改前端。
//
// 「訂貨單號」連結、右上角「新增」按鈕已經改連到自己重畫的
// sales-order-form.vue（見該頁與 sales-order.post.ts 開頭註解），不再走
// /api/dc-erp/page 整頁代理。
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
      `/COAERP/SalesOrder/index?all=true&pagesize=${encodeURIComponent(pagesize)}`
    )
  } else {
    const body = new URLSearchParams({
      pagesize,
      WorkPlace: query.workPlace ? String(query.workPlace) : '0',
      WHSearch: query.whSearch ? String(query.whSearch) : 'whatever',
      KeyWord: query.keyword ? String(query.keyword) : '',
      Sdate: query.sdate ? String(query.sdate) : '',
      Edate: query.edate ? String(query.edate) : '',
      SearchBySignState: query.signState ? String(query.signState) : '-1',
      SearchByType: query.orderType ? String(query.orderType) : '-1',
      SearchByReceivingState: query.receivingState ? String(query.receivingState) : '-1',
      Sdate2: query.sdate2 ? String(query.sdate2) : '',
      Edate2: query.edate2 ? String(query.edate2) : '',
      SCode: query.scode ? String(query.scode) : '',
      ECode: query.ecode ? String(query.ecode) : '',
      SearchFirmCode: query.firmCode ? String(query.firmCode) : ''
    })

    res = await fetchDcUpstream(
      sessionCookie,
      `/COAERP/SalesOrder/index/0/${encodeURIComponent(page)}?pagesize=${encodeURIComponent(pagesize)}`,
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
    workPlace: parseSelectOptions($('#WorkPlace')),
    whSearchField: parseSelectOptions($('select[name="WHSearch"]')),
    signState: parseSelectOptions($('#SearchBySignState')),
    orderType: parseSelectOptions($('#SearchByType')),
    receivingState: parseSelectOptions($('#SearchByReceivingState'))
  }

  const items: Array<Record<string, any>> = []
  $('#TableList tr').each((i: number, tr: any) => {
    if (i === 0) return // 表頭列
    const $tds = $(tr).find('td')
    if ($tds.length < 13) return // 略過空列 / 非資料列

    // Guid 直接從「訂貨單號」連結本身的 href 解析出來（連結本來就是連去
    // /COAERP/SalesOrder/Edit/{guid}），比之前假設勾選框 value 存了 Guid
    // 可靠——那個假設實測是錯的，導致點訂貨單號進去變成新增頁而不是編輯頁。
    const $codeLink = $($tds[2]).find('a')
    const editHref = $codeLink.attr('href') || ''
    const guidMatch = editHref.match(/Edit\/([0-9a-fA-F-]{36})/)
    const guid = guidMatch ? guidMatch[1] : ''

    items.push({
      guid,
      seq: $($tds[1]).text().trim(),
      code: $codeLink.text().trim(),
      editUrl: toDcProxiedHref(editHref),
      orderDate: $($tds[3]).text().trim(),
      deliveryDate: $($tds[4]).text().trim(),
      workPlace: $($tds[5]).find('.overFlowDiv').text().trim() || $($tds[5]).text().trim(),
      firmName: $($tds[6]).text().trim(),
      receivingState: $($tds[7]).text().trim(),
      signState: $($tds[8]).text().trim(),
      // td[9] 是「轉銷」欄，原網站只有在符合某些條件（不只是已核准，實測
      // 同樣是「待出貨/已核准」的列，也不一定會顯示這顆按鈕，確切規則不
      // 確定，這裡不猜規則，直接照原網站這欄實際有沒有東西來決定）才會顯示
      // 「轉銷」文字/按鈕，這裡直接照這一欄實際有沒有內容來判斷要不要顯示
      // 我們自己的「轉銷」按鈕，不猜規則。
      // 原本只用 .text() 判斷，結果永遠是空的——比對原網站畫面後發現「轉銷」
      // 是 <input type="button" value="轉銷"> 這種按鈕（畫面上黃底的樣式跟
      // 「送出查詢」「列出全部」那兩顆按鈕是同一種 squarebutton），按鈕的
      // 文字放在 value 屬性，不是文字節點，.text() 抓不到，這裡改成同時看
      // 文字節點、input 的 value、跟 a 連結的文字。
      canTransfer: (() => {
        const $cell = $($tds[9])
        const text = $cell.text().trim()
        const inputValue = $cell.find('input').attr('value') || ''
        return (text + inputValue).trim().length > 0
      })(),
      total: $($tds[10]).text().trim(),
      purchaseDept: $($tds[11]).text().trim(),
      remark: $($tds[12]).find('.overFlowDiv').attr('title') || $($tds[12]).text().trim()
    })
  })

  // 「總計40261筆/ 總計2014頁」是頁面上的純文字，不在特定 DOM 節點裡，
  // 直接對整份 HTML 做正則比對比較省事。
  const totalMatch = html.match(/總計([\d,]+)筆\/\s*總計([\d,]+)頁/)
  const totalCount = totalMatch ? Number(totalMatch[1].replace(/,/g, '')) : items.length
  const totalPages = totalMatch ? Number(totalMatch[2].replace(/,/g, '')) : 1

  // 麵包屑：頁面用一段 inline script 塞了 NavigationBarJson，一樣直接正則拉出來。
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
    breadcrumb,
    // 「新增」跟每列的「編輯」不再走整頁代理，改連到自己重畫的
    // sales-order-form.vue（見該頁與 sales-order.post.ts 開頭註解）。
    createUrl: '/staff/order/dc-erp/sales-order-form'
  }
})
