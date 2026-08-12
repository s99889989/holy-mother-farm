// server/api/shopping-cart/product-units.get.ts
// 對應 admin_product_unit.php

import { load } from 'cheerio'

export default defineEventHandler(async (event) => {
  const sessionCookie = requireUpstreamSession(event)

  const res = await fetchUpstream(sessionCookie, 'admin_product_unit.php')
  const html = await res.text()
  const $ = load(html)

  const table = $('table.DataTable')
  if (table.length === 0) {
    const looksLikeLoginPage = html.includes('管理員登入')
    throw createError({
      statusCode: looksLikeLoginPage ? 401 : 502,
      statusMessage: looksLikeLoginPage ? '登入已過期，請重新登入' : '抓不到商品單位表格'
    })
  }

  const items: Array<Record<string, any>> = []

  table.find('tbody tr').each((_, el) => {
    const tds = $(el).find('td')
    if (tds.length < 5) return

    const orderInput = $(tds[2]).find('input')
    const editHref = $(tds[3]).find('a').attr('href') || ''
    const deleteHref = $(tds[4]).find('a').attr('href') || ''
    const idMatch = deleteHref.match(/i=(\d+)/)
    const unitId = idMatch ? idMatch[1] : ''

    items.push({
      unitId,
      seq: $(tds[0]).text().trim(),
      name: $(tds[1]).text().trim(),
      orderFieldName: orderInput.attr('name') || '',
      orderValue: orderInput.attr('value') || '',
      editUrl: editHref ? `${SC_UPSTREAM_BASE}/${editHref}` : '',
      deleteHref
    })
  })

  return { total: items.length, items }
})
