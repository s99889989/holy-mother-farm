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

  const topMenu = parseMenuList($('#Top-Menu > ul.jd_menu'))

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

  const contentFrameSrc = $('#contentFrame').attr('src') || ''

  return {
    userName,
    topMenu,
    sideSections,
    contentUrl: toProxiedHref(contentFrameSrc)
  }
})
