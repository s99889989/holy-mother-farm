// server/api/dc-erp/captcha-image.get.ts
//
// 驗證碼圖片本身也要帶著 captcha.get.ts 存下的 dc_prelogin_session 才能拿到
// 對應 key 的圖片，所以不能讓瀏覽器直接連去原網站，改由這支 route 代理圖片 bytes。

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
      headers: { Cookie: preloginCookie }
    })
  } catch (err) {
    throw createError({ statusCode: 502, statusMessage: '無法取得驗證碼圖片' })
  }

  if (!res.ok) {
    throw createError({ statusCode: 502, statusMessage: '無法取得驗證碼圖片' })
  }

  const buffer = Buffer.from(await res.arrayBuffer())
  setResponseHeader(event, 'Content-Type', res.headers.get('content-type') || 'image/png')
  setResponseHeader(event, 'Cache-Control', 'no-store')
  return buffer
})
