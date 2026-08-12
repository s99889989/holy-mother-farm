// server/api/shopping-cart/orders/[orderNo].get.ts
//
// 帶著 sc_upstream_session，向原網站的 admin_order_view.php?i={orderNo}
// 要 HTML，解析出：購物清單（常溫/低溫分類）、付費方式、費用總計、
// 收件人資料、發票資料。
//
// 需要安裝 cheerio：npm install cheerio

import { load } from 'cheerio'

const UPSTREAM_BASE = 'https://shopping.st-mary.org.tw/admincp'

export default defineEventHandler(async (event) => {
  const sessionCookie = getCookie(event, 'sc_upstream_session')
  if (!sessionCookie) {
    throw createError({ statusCode: 401, statusMessage: '尚未登入' })
  }

  const orderNo = getRouterParam(event, 'orderNo')
  if (!orderNo) {
    throw createError({ statusCode: 400, statusMessage: '缺少訂單單號' })
  }

  const url = `${UPSTREAM_BASE}/admin_order_view.php?i=${encodeURIComponent(orderNo)}`

  let res: Response
  try {
    res = await fetch(url, {
      headers: { Cookie: sessionCookie },
      redirect: 'manual'
    })
  } catch (err) {
    throw createError({ statusCode: 502, statusMessage: '無法連線到原網站，請稍後再試' })
  }

  if (res.status >= 300 && res.status < 400) {
    const location = res.headers.get('location') || ''
    if (location.includes('login.php')) {
      throw createError({ statusCode: 401, statusMessage: '登入已過期，請重新登入' })
    }
  }

  const html = await res.text()
  const $ = load(html)

  // ── 1、購物清單（常溫商品／低溫商品）─────────────────────────
  const productSections: Array<{
    category: string
    items: Array<{ seq: string; name: string; tempZone: string; price: string; qty: string; subtotal: string }>
    summary: { count: number; amount: number }
  }> = []

  $('.product-title').each((_, h2) => {
    const category = $(h2).text().trim()
    const table = $(h2).next('table')
    const items: any[] = []
    const summary = { count: 0, amount: 0 }

    table.find('tbody > tr').each((__, tr) => {
      const tds = $(tr).find('td')
      if (tds.length === 0) return // 表頭是 <th>，略過

      const firstText = $(tds[0]).text().trim()
      if (!firstText) {
        // 總計列
        const spans = $(tr).find('span.odmyc')
        summary.count = Number($(spans[0]).text().trim()) || 0
        summary.amount = Number($(spans[1]).text().trim()) || 0
        return
      }

      items.push({
        seq: firstText,
        name: $(tds[1]).text().trim(),
        tempZone: $(tds[2]).text().trim(),
        price: $(tds[3]).text().trim(),
        qty: $(tds[4]).text().trim(),
        subtotal: $(tds[5]).text().trim()
      })
    })

    productSections.push({ category, items, summary })
  })

  // ── 2、付費方式與費用總計 ─────────────────────────────────
  const paymentMethod = $('input[name="pc"][checked]').attr('value') === '2'
    ? '金融卡轉帳或電匯'
    : '貨到付款'

  let productAmount = ''
  let shippingAmount = ''
  let totalCost = ''

  $('table.table-bordered').each((_, table) => {
    const tableText = $(table).text()
    if (!tableText.includes('商品金額')) return

    $(table)
      .find('tr')
      .each((__, tr) => {
        const ths = $(tr).find('th')
        if (ths.length < 3) return
        const label = $(ths[1]).text().trim()
        if (label === '商品金額') productAmount = $(ths[2]).text().trim()
        if (label === '運費金額') shippingAmount = $(ths[2]).text().trim()
      })

    totalCost = $(table).find('span.odmyc').first().text().trim()
  })

  // ── 3、收件人資料 ─────────────────────────────────────────
  // 郵遞區號實際上是原網站用 twzipcode 這個前端 JS 套件在瀏覽器端動態帶入的，
  // 靜態 HTML 抓不到已選中的縣市/鄉鎮，改從內嵌 script 裡的 zipcodeSel 直接取值。
  const zipMatch = html.match(/zipcodeSel['"]?\s*:\s*['"](\d+)['"]/)

  const genderChecked = $('input[name="s"][checked]').attr('value')

  const receiver = {
    name: $('#n').attr('value') || '',
    gender: genderChecked === '1' ? '先生' : genderChecked === '0' ? '小姐' : '',
    phoneArea: $('#c1').attr('value') || '',
    phoneNumber: $('#c2').attr('value') || '',
    phoneExt: $('#c3').attr('value') || '',
    mobile: $('#m').attr('value') || '',
    zipcode: zipMatch ? zipMatch[1] : '',
    address: $('#a').attr('value') || '',
    note: $('#t1').text().trim()
  }

  // ── 4、發票抬頭 ───────────────────────────────────────────
  let receiptType = ''
  if ($('#receipt1[checked]').length) receiptType = '一般發票'
  else if ($('#receipt2[checked]').length) receiptType = '二聯式 (紙本)'
  else if ($('#receipt3[checked]').length) receiptType = '三聯式 (紙本)'

  const invoice = {
    type: receiptType,
    companyName: $('#companyname').attr('value') || '',
    companyId: $('#companyid').attr('value') || '',
    receiptNumber: $('#receiptnumber').attr('value') || ''
  }

  return {
    orderNo,
    shipDate: $('#o_deliverdate').attr('value') || '',
    productSections,
    paymentMethod,
    costSummary: {
      productAmount,
      shippingAmount,
      totalCost
    },
    receiver,
    invoice
  }
})
