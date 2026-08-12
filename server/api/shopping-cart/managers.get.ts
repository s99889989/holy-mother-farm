// server/api/shopping-cart/managers.get.ts
// 對應原本 admin_manager.php 的管理員清單（DataTable 全撈整批）

import { load } from 'cheerio'

export default defineEventHandler(async (event) => {
  const sessionCookie = requireUpstreamSession(event)

  const res = await fetchUpstream(sessionCookie, 'admin_manager.php')
  const html = await res.text()
  const $ = load(html)

  // 這個表格在原始 HTML 沒有寫死 id（不像 #ordertable），
  // #DataTables_Table_0 是 DataTables 這個 jQuery 套件在瀏覽器執行 JS 後
  // 才動態產生的，純 HTML 抓取永遠不會有這個 id，改用 class 選取
  const table = $('table.DataTable')

  if (table.length === 0) {
    const looksLikeLoginPage = html.includes('name="u"') && html.includes('name="p"') && html.includes('管理員登入')
    throw createError({
      statusCode: looksLikeLoginPage ? 401 : 502,
      statusMessage: looksLikeLoginPage
        ? '登入已過期，請重新登入'
        : '抓不到管理員清單表格，這個帳號可能沒有「設定 > 管理員」頁面的權限'
    })
  }

  const items: Array<Record<string, any>> = []

  table.find('tbody tr').each((_, el) => {
    const tds = $(el).find('td')
    if (tds.length < 7) return

    const statusLink = $(tds[4]).find('a')
    const statusIsEnabled = statusLink.text().includes('啟用')
    const statusHref = statusLink.attr('href') || ''
    const idMatch = statusHref.match(/i=(\d+)/)
    const managerId = idMatch ? idMatch[1] : ''

    const editHref = $(tds[5]).find('a').attr('href') || ''
    const deleteHref = $(tds[6]).find('a').attr('href') || ''

    items.push({
      managerId,
      seq: $(tds[0]).text().trim(),
      account: $(tds[1]).text().trim(),
      name: $(tds[2]).text().trim(),
      note: $(tds[3]).text().trim(),
      statusEnabled: statusIsEnabled,
      editUrl: editHref ? `${SC_UPSTREAM_BASE}/${editHref}` : '',
      deleteHref
    })
  })

  return { total: items.length, items }
})
