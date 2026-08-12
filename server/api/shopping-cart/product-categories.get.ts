// server/api/shopping-cart/product-categories.get.ts
// 對應 admin_product_class.php
//
// 跟 managers.get.ts 同樣的教訓：不依賴 DataTables 動態產生的
// #DataTables_Table_0，改用 class 選取表格。

import { load } from 'cheerio'

export default defineEventHandler(async (event) => {
  const sessionCookie = requireUpstreamSession(event)

  const res = await fetchUpstream(sessionCookie, 'admin_product_class.php')
  const html = await res.text()
  const $ = load(html)

  const table = $('table.DataTable')
  if (table.length === 0) {
    const looksLikeLoginPage = html.includes('管理員登入')
    throw createError({
      statusCode: looksLikeLoginPage ? 401 : 502,
      statusMessage: looksLikeLoginPage ? '登入已過期，請重新登入' : '抓不到商品分類表格'
    })
  }

  // 新增分類表單的「運費群組」下拉選單，動態抓，避免寫死選項
  const feeGroupOptions: Array<{ value: string; label: string }> = []
  $('#fgid option').each((_, opt) => {
    feeGroupOptions.push({
      value: $(opt).attr('value') || '',
      label: $(opt).text().trim()
    })
  })

  const items: Array<Record<string, any>> = []

  table.find('tbody tr').each((_, el) => {
    const tds = $(el).find('td')
    if (tds.length < 7) return

    const orderInput = $(tds[2]).find('input')
    const visibleLink = $(tds[4]).find('a')
    // 連結文字代表「目前狀態」（顯示＝目前是顯示中，隱藏＝目前是隱藏中），
    // href 裡的 s= 參數則是點下去後會變成的目標狀態（跟目前相反）
    const isVisible = visibleLink.text().includes('顯示')
    const editHref = $(tds[5]).find('a').attr('href') || ''
    const deleteHref = $(tds[6]).find('a').attr('href') || ''

    const toggleHref = visibleLink.attr('href') || ''
    const idMatch = toggleHref.match(/i=(\d+)/)
    const categoryId = idMatch ? idMatch[1] : ''

    items.push({
      categoryId,
      seq: $(tds[0]).text().trim(),
      name: $(tds[1]).text().trim(),
      orderFieldName: orderInput.attr('name') || '',
      orderValue: orderInput.attr('value') || '',
      feeGroup: $(tds[3]).text().trim(),
      visible: isVisible,
      editUrl: editHref ? `${SC_UPSTREAM_BASE}/${editHref}` : '',
      deleteHref
    })
  })

  return { total: items.length, items, feeGroupOptions }
})
