// server/api/dc-erp/captcha-image.get.ts
//
// 驗證碼圖片本身也要帶著 captcha.get.ts 存下的 dc_prelogin_session 才能拿到
// 對應 key 的圖片，所以不能讓瀏覽器直接連去原網站，改由這支 route 代理圖片 bytes。
//
// 重要：原網站在回傳驗證碼圖片這次請求時，有可能一併核發新的 Set-Cookie
// （例如把這次產生的驗證碼答案寫進更新過的 session 狀態）。如果我們沒有把這個
// 新 Set-Cookie 合併回暫存 cookie，之後登入 POST 用的還是「拿圖片之前」的舊 cookie，
// 就會跟「圖片當下實際存驗證碼答案」的 session 對不上，造成怎麼輸入都顯示「驗證碼錯誤」。
// 所以這裡跟 captcha.get.ts / login.post.ts 一樣，統一用 getAllSetCookies + mergeSetCookie
// 把回應裡的 Set-Cookie（如果有的話）疊加回 dc_prelogin_session。

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const key = query.key ? String(query.key) : ''
  const preloginCookie = getCookie(event, 'dc_prelogin_session')

  if (!key || !preloginCookie) {
    throw createError({ statusCode: 400, statusMessage: '驗證碼已失效，請重新整理' })
  }

  let res: Response
  try {
    res = await fetch(`${DC_BASE}/Account/OutputImg?key=${encodeURIComponent(key)}`, {
      headers: { ...BROWSER_LIKE_HEADERS, Cookie: preloginCookie }
    })
  } catch (err) {
    throw createError({ statusCode: 502, statusMessage: '無法取得驗證碼圖片' })
  }

  if (!res.ok) {
    throw createError({ statusCode: 502, statusMessage: '無法取得驗證碼圖片' })
  }

  const setCookies = getAllSetCookies(res)
  if (setCookies.length > 0) {
    let merged = preloginCookie
    for (const sc of setCookies) {
      merged = mergeSetCookie(merged, sc)
    }
    setCookie(event, 'dc_prelogin_session', merged, {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      maxAge: 60 * 5,
      path: '/'
    })
    console.log('[dc-erp/captcha-image] 原網站在要驗證碼圖片時核發了新 cookie，已合併', {
      count: setCookies.length
    })
  }

  const buffer = Buffer.from(await res.arrayBuffer())
  setResponseHeader(event, 'Content-Type', res.headers.get('content-type') || 'image/png')
  setResponseHeader(event, 'Cache-Control', 'no-store')
  return buffer
})

