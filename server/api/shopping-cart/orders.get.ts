// server/api/shopping-cart/orders.get.ts
//
// 帶著 login.post.ts 存下的 sc_upstream_session，向原網站的
// admin_order.php 要 HTML，解析出 <table id="ordertable"> 裡的每一列，
// 轉成前端要用的 JSON。
//
// 注意：原網站是「一次把整個狀態篩選後的結果全部渲染出來」，
// 分頁/搜尋/排序都是原本 DataTables 在瀏覽器端做的 —
// 所以這支 route 回傳「該狀態篩選下的全部訂單」，
// 分頁/搜尋/排序交給前端頁面在拿到資料後自己做（跟原網站行為一致）。
//
// 需要安裝 cheerio：npm install cheerio

import { load } from 'cheerio'

const UPSTREAM_BASE = 'https://shopping.st-mary.org.tw/admincp'

function statusCodeFromLabel(label: string): number {
  switch (label) {
    case '新訂單':
      return 0
    case '訂單成立':
      return 1
    case '備貨':
      return 2
    case '出貨':
      return 3
    default:
      return -1
  }
}

export default defineEventHandler(async (event) => {
  const sessionCookie = getCookie(event, 'sc_upstream_session')
  if (!sessionCookie) {
    throw createError({ statusCode: 401, statusMessage: '尚未登入' })
  }

  const query = getQuery(event)
  const status = query.status ? String(query.status) : ''

  const url = status
    ? `${UPSTREAM_BASE}/admin_order.php?os=${encodeURIComponent(status)}`
    : `${UPSTREAM_BASE}/admin_order.php`

  let res: Response
  try {
    res = await fetch(url, {
      headers: { Cookie: sessionCookie },
      redirect: 'manual'
    })
  } catch (err) {
    throw createError({ statusCode: 502, statusMessage: '無法連線到原網站，請稍後再試' })
  }

  // session 過期時原網站會把請求導回 login.php
  if (res.status >= 300 && res.status < 400) {
    const location = res.headers.get('location') || ''
    if (location.includes('login.php')) {
      throw createError({ statusCode: 401, statusMessage: '登入已過期，請重新登入' })
    }
  }

  const html = await res.text()
  const $ = load(html)

  const items: Array<Record<string, any>> = []

  $('#ordertable tbody tr').each((_, el) => {
    const tds = $(el).find('td')
    if (tds.length < 14) return // 略過空列 / DataTables 的「查無資料」列

    const statusText = $(tds[10]).find('.label').text().trim()
    const updateHref = $(tds[12]).find('a').attr('href') || ''
    const exportHref = $(tds[13]).find('a').attr('href') || ''
    const buyerHref = $(tds[4]).find('a').attr('href') || ''
    const buyerIdMatch = buyerHref.match(/i=(\d+)/)

    items.push({
      seq: $(tds[0]).text().trim(),
      orderDate: $(tds[1]).text().trim(),
      orderNo: $(tds[2]).find('a').text().trim(),
      shipDate: $(tds[3]).text().trim(),
      buyerId: buyerIdMatch ? buyerIdMatch[1] : '',
      buyerName: $(tds[4]).find('a').text().trim(),
      receiverName: $(tds[5]).text().trim(),
      receiverPhone: $(tds[6]).text().trim(),
      receiverMobile: $(tds[7]).text().trim(),
      receiverAddress: $(tds[8]).text().trim(),
      totalAmount: $(tds[9]).text().trim(),
      statusCode: statusCodeFromLabel(statusText),
      statusText,
      handlerName: $(tds[11]).text().trim(),
      // 原網站的相對連結，前端組回絕對網址供「開啟原頁面」使用
      updateUrl: updateHref ? `${UPSTREAM_BASE}/${updateHref}` : '',
      exportUrl: exportHref ? `${UPSTREAM_BASE}/${exportHref}` : ''
    })
  })

  return { total: items.length, items }
})
