// server/api/shopping-cart/users.get.ts
//
// 對應原本 admin_users.php + DataTables。跟訂單清單一樣，原網站是把
// 全部會員一次渲染出來，分頁/搜尋是前端 DataTables 處理的 —
// 這裡回傳全部會員清單，分頁/搜尋交給前端頁面自己做。
//
// 需要安裝 cheerio：npm install cheerio

import { load } from 'cheerio'

export default defineEventHandler(async (event) => {
  const sessionCookie = requireUpstreamSession(event)

  const res = await fetchUpstream(sessionCookie, 'admin_users.php')
  const html = await res.text()
  const $ = load(html)

  const items: Array<Record<string, any>> = []

  $('#ordertable tbody tr').each((_, el) => {
    const tds = $(el).find('td')
    if (tds.length < 12) return // 略過空列

    const nameLink = $(tds[3]).find('a')
    const nameHref = nameLink.attr('href') || ''
    const idMatch = nameHref.match(/i=(\d+)/)
    const memberId = idMatch ? idMatch[1] : ''

    const updateHref = $(tds[8]).find('a').attr('href') || ''

    // 郵件啟用欄：已驗證顯示純文字「啟用」，未驗證顯示「停用」+ 認證連結
    const mailCell = $(tds[9])
    const mailVerified = !mailCell.find('a').length
    const verifyHref = mailCell.find('a').attr('href') || ''

    // 停啟用欄：帳號目前啟用中會顯示可點擊的「啟用」連結（點了會停用），
    // 反之顯示「停用」連結（點了會啟用）——連結文字剛好是「目前狀態」
    const statusLink = $(tds[10]).find('a')
    const statusIsEnabled = statusLink.length ? statusLink.text().includes('啟用') : true
    const toggleHref = statusLink.attr('href') || ''

    const exportHref = $(tds[11]).find('a').attr('href') || ''

    items.push({
      memberId,
      seq: $(tds[0]).text().trim(),
      customerCode: $(tds[1]).text().trim(),
      account: $(tds[2]).text().trim(),
      name: nameLink.text().trim(),
      phone: $(tds[4]).text().trim(),
      mobile: $(tds[5]).text().trim(),
      address: $(tds[6]).text().trim(),
      tempCode: $(tds[7]).text().trim(),
      updateUrl: updateHref ? `${SC_UPSTREAM_BASE}/${updateHref}` : '',
      mailVerified,
      verifyUrl: verifyHref,
      statusEnabled: statusIsEnabled,
      toggleUrl: toggleHref,
      exportUrl: exportHref
    })
  })

  return { total: items.length, items }
})
