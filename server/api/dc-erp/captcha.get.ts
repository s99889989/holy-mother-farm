// server/api/dc-erp/captcha.get.ts
//
// 對應「先 GET 登入頁」這一步：
// 向原網站要一份新的登入頁 HTML，解析出 __RequestVerificationToken 和 ImageKey，
// 並把這次 GET 拿到的 Set-Cookie 存成本站暫存的 httpOnly cookie（dc_prelogin_session），
// 之後的驗證碼圖片請求、登入 POST 都要帶著同一組暫存 cookie 才會對得上。
//
// 需要安裝 cheerio：npm install cheerio

import { load } from 'cheerio'

export default defineEventHandler(async (event) => {
  let res: Response
  try {
    res = await fetch(`${DC_BASE}/Account/Login`, {
      redirect: 'manual'
    })
  } catch (err) {
    throw createError({ statusCode: 502, statusMessage: '無法連線到原網站，請稍後再試' })
  }

  const setCookies = getAllSetCookies(res)
  if (setCookies.length === 0) {
    throw createError({ statusCode: 502, statusMessage: '原網站未回傳 session，請稍後再試' })
  }

  let preloginCookie = ''
  for (const sc of setCookies) {
    preloginCookie = mergeSetCookie(preloginCookie, sc)
  }

  const html = await res.text()
  const $ = load(html)

  const token = $('input[name="__RequestVerificationToken"]').attr('value') || ''
  const imageKey = $('#ImageKey').attr('value') || ''

  if (!token || !imageKey) {
    throw createError({ statusCode: 502, statusMessage: '無法取得登入頁驗證資訊，請稍後再試' })
  }

  setCookie(event, 'dc_prelogin_session', preloginCookie, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    maxAge: 60 * 5, // 驗證碼通常幾分鐘就會失效，暫存 cookie 給 5 分鐘
    path: '/'
  })

  return { token, imageKey }
})
