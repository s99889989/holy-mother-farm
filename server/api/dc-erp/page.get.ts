// server/api/dc-erp/page.get.ts
//
// 通用的「登入後頁面」代理：帶著 dc_upstream_session 去原網站要任何一頁
// （HTML、CSS、JS、圖片…），回傳給前端的 iframe／資源請求。
//
// 原網站不是像購物車後台那樣只有少數幾支要特別解析成 JSON 的清單頁，
// 而是一整套傳統 ASP.NET MVC 頁面（品項、客戶、銷貨單、會計傳票…上百個畫面），
// 逐一重寫成 Vue 頁面成本太高，所以先用「整頁代理」的方式讓使用者能在本站內
// 完整操作原本的畫面，session 全程留在伺服器端、瀏覽器拿不到。
//
// HTML 頁面會被重寫：所有指回原網站的 <link>/<script>/<img>/<a>/<form> 都改成
// 走這支 route 代理，這樣使用者在 iframe 裡點連結、原頁面載入 CSS/JS 時，
// 才不會直接打到原網站（也就不需要在瀏覽器端帶 cookie）。
// 非 HTML（圖片、CSS、JS、字型等）就直接原封不動把 bytes 轉送回去。
//
// 安全性：只允許代理 DC_ORIGIN 底下的路徑，避免被當成開放式代理打其他任意網址。
//
// 需要安裝 cheerio：npm install cheerio

import { load } from 'cheerio'

export default defineEventHandler(async (event) => {
  const sessionCookie = requireDcUpstreamSession(event)

  const query = getQuery(event)
  const path = query.path ? String(query.path) : ''
  if (!path) {
    throw createError({ statusCode: 400, statusMessage: '缺少 path 參數' })
  }

  let targetUrl: URL
  try {
    targetUrl = new URL(path, `${DC_ORIGIN}/`)
  } catch {
    throw createError({ statusCode: 400, statusMessage: '無效的路徑' })
  }

  if (targetUrl.origin !== DC_ORIGIN) {
    throw createError({ statusCode: 400, statusMessage: '不支援代理外部網址' })
  }

  const res = await fetchDcUpstream(sessionCookie, targetUrl.pathname + targetUrl.search)
  const contentType = res.headers.get('content-type') || ''

  // 非 HTML 的靜態資源（CSS/JS/圖片/字型）直接轉送原始 bytes
  if (!contentType.includes('text/html')) {
    const buffer = Buffer.from(await res.arrayBuffer())
    setResponseHeader(event, 'Content-Type', contentType || 'application/octet-stream')
    return buffer
  }

  let html = await res.text()
  let $ = load(html)

  // 有些畫面直接用網址打開（而不是從既有的 frame 內部載入）時，原網站會判斷
  // 「這不是從 frame 載入的」，整頁導回一份完整外殼（含頂部選單/側邊欄，
  // 裡面再包一個 #contentFrame iframe 指向真正要看的內容）。我們的代理如果照單
  // 全收，會變成我們自己的 iframe 裡又疊了一層原網站自己的選單外殼。
  // 這裡偵測到回來的頁面本身又是一份 frameset（帶 #contentFrame）就自動改抓
  // 內層 iframe 真正的網址，最多追 3 層避免不小心無窮迴圈。
  let hops = 0
  while ($('#contentFrame').length && hops < 3) {
    const innerSrc = $('#contentFrame').attr('src')
    if (!innerSrc) break

    let innerUrl: URL
    try {
      innerUrl = new URL(innerSrc, targetUrl)
    } catch {
      break
    }
    if (innerUrl.origin !== DC_ORIGIN) break

    const innerRes = await fetchDcUpstream(sessionCookie, innerUrl.pathname + innerUrl.search)
    const innerContentType = innerRes.headers.get('content-type') || ''
    if (!innerContentType.includes('text/html')) break

    html = await innerRes.text()
    $ = load(html)
    targetUrl = innerUrl
    hops++
  }

  const rewriteAttr = (selector: string, attr: string) => {
    $(selector).each((_: number, el: any) => {
      const $el = $(el)
      const val = $el.attr(attr)
      if (!val || val.startsWith('data:') || val.startsWith('#') || val.toLowerCase().startsWith('javascript:')) {
        return
      }

      let abs: URL
      try {
        abs = new URL(val, targetUrl)
      } catch {
        return
      }

      if (abs.origin !== DC_ORIGIN) return

      const rel = abs.pathname + abs.search
      $el.attr(attr, `/api/dc-erp/page?path=${encodeURIComponent(rel)}`)
    })
  }

  rewriteAttr('link[rel="stylesheet"]', 'href')
  rewriteAttr('script[src]', 'src')
  rewriteAttr('img[src]', 'src')
  rewriteAttr('a[href]', 'href')
  rewriteAttr('form', 'action')
  rewriteAttr('iframe[src]', 'src')

  setResponseHeader(event, 'Content-Type', 'text/html; charset=utf-8')
  return $.html()
})
