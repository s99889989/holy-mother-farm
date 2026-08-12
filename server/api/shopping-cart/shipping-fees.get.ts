// server/api/shopping-cart/shipping-fees.get.ts
// 對應 a_pricehome.php ——這頁是新版介面，跟其他 admincp 舊頁不同，
// 表格本身有寫死的 id="pricehomeTable"（不是 DataTables 動態產生的），
// 而且「修改」按鈕的 data-* 屬性就直接帶著完整原始資料，比解析顯示文字更準確可靠。

import { load } from 'cheerio'

export default defineEventHandler(async (event) => {
  const sessionCookie = requireUpstreamSession(event)

  const res = await fetchUpstream(sessionCookie, 'a_pricehome.php')
  const html = await res.text()
  const $ = load(html)

  const table = $('#pricehomeTable')
  if (table.length === 0) {
    const looksLikeLoginPage = html.includes('管理員登入')
    throw createError({
      statusCode: looksLikeLoginPage ? 401 : 502,
      statusMessage: looksLikeLoginPage ? '登入已過期，請重新登入' : '抓不到商品運費表格'
    })
  }

  const items: Array<Record<string, any>> = []

  table.find('tbody tr').each((_, el) => {
    const editBtn = $(el).find('button[data-phid]')
    if (editBtn.length === 0) return

    const state = editBtn.attr('data-state') || '1'
    const deleteBtn = $(el).find('button[data-toggle="modal"][data-target="#deleteModal"]')

    items.push({
      phId: editBtn.attr('data-phid') || '',
      seq: $($(el).find('td')[0]).text().trim(),
      temp: editBtn.attr('data-temp') === '1' ? '常溫' : '低溫',
      tempValue: editBtn.attr('data-temp') || '',
      price: editBtn.attr('data-price') || '0',
      pricehome: editBtn.attr('data-pricehome') || '0',
      // state: 1=啟用 0=停用 2=基本運費（基本運費不可刪除、不可停用）
      state,
      isBaseFee: state === '2',
      canDelete: deleteBtn.length > 0
    })
  })

  return { total: items.length, items }
})
