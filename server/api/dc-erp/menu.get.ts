// server/api/dc-erp/menu.get.ts
//
// 帶著登入後存下的 dc_upstream_session，向原網站的 /COAERP/Menu/index 要 HTML，
// 解析出：
//   - 使用者姓名（.UserName）
//   - 頂部多層選單（#Top-Menu ul.jd_menu，最深可能到 3 層）
//   - 左側常用功能／系統操作導覽／相關系統資訊…等 accordion（.arrowlistmenu）
//   - 主要內容 iframe 預設頁面（#contentFrame 的 src，例如 /COAERP/News/IndexBrowse）
//
// 原網站是傳統 frameset 風格（頂部/側邊選單是靜態頁面，點連結時用 target="contentFrame"
// 把內容載進中間的 iframe），這裡把選單結構轉成 JSON 交給 Vue 重新畫，
// 但每個連結的 href 一律改寫成走 /api/dc-erp/page 代理，瀏覽器端才不需要（也拿不到）
// dc_upstream_session cookie，session 全程留在伺服器端。
//
// 需要安裝 cheerio：npm install cheerio

import { load } from 'cheerio'

interface MenuNode {
  label: string
  href: string
  target: string
  children: MenuNode[]
}

function toProxiedHref(href: string | undefined): string {
  if (!href || href === '#') return ''
  const abs = resolveDcUpstreamAsset(href)
  if (!abs.startsWith(DC_ORIGIN)) return ''
  const rel = abs.slice(DC_ORIGIN.length)
  return `/api/dc-erp/page?path=${encodeURIComponent(rel)}`
}

export default defineEventHandler(async (event) => {
  const sessionCookie = requireDcUpstreamSession(event)

  const res = await fetchDcUpstream(sessionCookie, '/COAERP/Menu/index')
  const html = await res.text()
  const $ = load(html)

  const userName = $('.UserName').first().text().trim()

  // 頁首右上角那排功能連結（回首頁／聯繫我們／修改個人資料…），
  // 「登出」不收進來（我們自己有一顆登出鈕，只清本站的 dc_upstream_session，
  // 不特別呼叫原網站的 /Account/Logout），mailto: 連結保留原樣不用走代理。
  const utilityLinks: Array<{ label: string, href: string, target: string }> = []
  $('.Submenu ul li a[href]').each((_: number, a: any) => {
    const $a = $(a)
    const rawHref = $a.attr('href') || ''
    if (!rawHref || rawHref.includes('/Account/Logout')) return

    const isMailto = rawHref.startsWith('mailto:')
    utilityLinks.push({
      label: $a.text().trim(),
      href: isMailto ? rawHref : toProxiedHref(rawHref),
      target: isMailto ? '_self' : ($a.attr('target') || 'contentFrame')
    })
  })

  function parseMenuList($ul: any): MenuNode[] {
    const items: MenuNode[] = []
    $ul.children('li').each((_: number, li: any) => {
      const $li = $(li)
      const $a = $li.children('a').first()
      const $childUl = $li.children('ul').first()

      items.push({
        label: $a.text().trim(),
        href: toProxiedHref($a.attr('href')),
        target: $a.attr('target') || 'contentFrame',
        children: $childUl.length ? parseMenuList($childUl) : []
      })
    })
    return items
  }

  // 頂部多層選單：主要選擇器抓不到（可能原網站排版有微調、或多層 iframe 代理後
  // 結構跟預期有落差）時，依序退回更寬鬆的選擇器，確保至少抓得到一份。
  let $topMenuRoot = $('#Top-Menu ul.jd_menu').first()
  if (!$topMenuRoot.length) $topMenuRoot = $('ul.jd_menu').first()
  if (!$topMenuRoot.length) $topMenuRoot = $('#Top-Menu > ul').first()
  const topMenu = parseMenuList($topMenuRoot)

  const sideSections: Array<{ title: string, links: Array<{ label: string, href: string, target: string }> }> = []
  $('.arrowlistmenu h3.menuheader').each((_: number, h3: any) => {
    const title = $(h3).text().trim()
    const $content = $(h3).next('.categoryitems')
    const links: Array<{ label: string, href: string, target: string }> = []

    $content.find('a').each((__: number, a: any) => {
      const $a = $(a)
      links.push({
        label: $a.text().trim(),
        href: toProxiedHref($a.attr('href')),
        target: $a.attr('target') || 'contentFrame'
      })
    })

    sideSections.push({ title, links })
  })

  // #contentFrame 主要選擇器抓不到時，退回用 name 屬性找、再退回頁面上第一個
  // 有 src 的 iframe。
  let contentFrameSrc = $('#contentFrame').attr('src') || ''
  if (!contentFrameSrc) contentFrameSrc = $('iframe[name="contentFrame"]').attr('src') || ''
  if (!contentFrameSrc) contentFrameSrc = $('iframe[src]').first().attr('src') || ''

  // 原網站的 #contentFrame 在「原始」HTML 裡 src 其實是空字串（src=""）——
  // 真正的網址是頁面載入完成後才由 jQuery 補上去的（$(window).load 裡
  // $("#contentFrame").attr('src', '/COAERP/News/IndexBrowse')），伺服器端
  // 解析 HTML 不會執行這段 JS，所以永遠抓到空的。這裡直接比照原網站那段 JS
  // 的預設邏輯，抓不到就自己補上同一個預設頁。
  if (!contentFrameSrc) contentFrameSrc = '/COAERP/News/IndexBrowse'

  // 開發除錯用：把關鍵選擇器的比對結果印出來，之後如果又抓空了，
  // 直接看這行 log 就知道是哪個選擇器沒對到，不用再靠螢幕截圖用猜的。
  console.log('[dc-erp/menu] 解析結果', {
    htmlLength: html.length,
    hasTopMenuDiv: $('#Top-Menu').length,
    jdMenuCount: $('ul.jd_menu').length,
    topMenuItemCount: topMenu.length,
    hasContentFrameById: $('#contentFrame').length,
    iframeCount: $('iframe').length,
    contentFrameSrc,
    sideSectionCount: sideSections.length,
    userName
  })

  return {
    userName,
    utilityLinks,
    topMenu,
    sideSections,
    contentUrl: toProxiedHref(contentFrameSrc)
  }
})
