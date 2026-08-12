// server/api/shopping-cart/orders/[orderNo]/edit.get.ts
//
// 抓 admin_order_update.php?f=1&i={orderNo} 並解析成可編輯表單用的 JSON。
// 需要安裝 cheerio：npm install cheerio

import { load } from 'cheerio'

export default defineEventHandler(async (event) => {
  const sessionCookie = requireUpstreamSession(event)
  const orderNo = getRouterParam(event, 'orderNo')
  if (!orderNo) {
    throw createError({ statusCode: 400, statusMessage: '缺少訂單單號' })
  }

  const res = await fetchUpstream(
    sessionCookie,
    `admin_order_update.php?f=1&i=${encodeURIComponent(orderNo)}`
  )
  const html = await res.text()
  const $ = load(html)

  // ── 購物清單（含每項數量欄位的原始 name，如 p5951，供後續更新用）──
  const productSections: Array<{
    category: string
    items: Array<{
      seq: string
      name: string
      tempZone: string
      price: string
      fieldName: string
      qty: string
      subtotal: string
    }>
    summary: { count: number; amount: number }
  }> = []

  $('.product-title').each((_, h2) => {
    const category = $(h2).text().trim()
    const table = $(h2).next('table')
    const items: any[] = []
    const summary = { count: 0, amount: 0 }

    table.find('tbody > tr').each((__, tr) => {
      const tds = $(tr).find('td')
      if (tds.length === 0) return

      const firstText = $(tds[0]).text().trim()
      if (!firstText) {
        const spans = $(tr).find('span.odmyc')
        summary.count = Number($(spans[0]).text().trim()) || 0
        summary.amount = Number($(spans[1]).text().trim()) || 0
        return
      }

      const qtyInput = $(tds[4]).find('input')

      items.push({
        seq: firstText,
        name: $(tds[1]).text().trim(),
        tempZone: $(tds[2]).text().trim(),
        price: $(tds[3]).text().trim(),
        fieldName: qtyInput.attr('name') || '',
        qty: qtyInput.attr('value') || '0',
        subtotal: $(tds[5]).text().trim()
      })
    })

    productSections.push({ category, items, summary })
  })

  const statusCode = $('#ost option[selected]').attr('value') ?? ''
  const paymentMethod = $('input[name="classpay"][checked]').attr('value') || '1'

  // twzipcode 是前端 JS 套件在瀏覽器動態設定選單，靜態 HTML 抓不到已選中的縣市/鄉鎮，
  // 改從內嵌 script 的 zipcodeSel 直接取郵遞區號數字
  const zipMatch = html.match(/zipcodeSel['"]?\s*:\s*['"](\d+)['"]/)
  const genderChecked = $('input[name="s"][checked]').attr('value')

  let receiptType = '1'
  if ($('#receipt1[checked]').length) receiptType = '1'
  else if ($('#receipt2[checked]').length) receiptType = '2'
  else if ($('#receipt3[checked]').length) receiptType = '3'

  return {
    orderNo,
    hiddenFields: {
      i: $('#i').attr('value') || orderNo,
      aid: $('#aid').attr('value') || '',
      an: $('#an').attr('value') || ''
    },
    deliverDate: $('#o_deliverdate').attr('value') || '',
    statusCode,
    productSections,
    paymentMethod,
    costSummary: {
      price: $('#price').attr('value') || '0',
      pricehome: $('#pricehome').attr('value') || '0',
      totalprice: $('#totalprice').attr('value') || '0'
    },
    receiver: {
      name: $('#n').attr('value') || '',
      gender: genderChecked === '1' ? '1' : genderChecked === '0' ? '0' : '',
      phoneArea: $('#c1').attr('value') || '',
      phoneNumber: $('#c2').attr('value') || '',
      phoneExt: $('#c3').attr('value') || '',
      mobile: $('#m').attr('value') || '',
      zipcode: zipMatch ? zipMatch[1] : '',
      address: $('#a').attr('value') || '',
      note: $('#t1').text().trim()
    },
    invoice: {
      type: receiptType,
      companyName: $('#companyname').attr('value') || '',
      companyId: $('#companyid').attr('value') || '',
      receiptNumber: $('#receiptnumber').attr('value') || ''
    }
  }
})
