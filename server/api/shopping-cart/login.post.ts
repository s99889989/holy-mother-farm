// server/api/shopping-cart/login.post.ts
//
// 對應原本 shopping.st-mary.org.tw/admincp/login.php?l=1 的表單登入。
// 這支 route 在「伺服器端」代替使用者送出帳密，把原網站回傳的 PHP session
// cookie 存成本站自己的 httpOnly cookie（sc_upstream_session），
// 瀏覽器端全程不會直接接觸原網站，避開 CORS 問題。
//
// 注意：這是把使用者帳密即時轉送給原網站做登入，沒有落地存放帳密本身。

const UPSTREAM_BASE = 'https://shopping.st-mary.org.tw/admincp'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const u = body?.u
  const p = body?.p

  if (!u || !p) {
    throw createError({ statusCode: 400, statusMessage: '請輸入帳號與密碼' })
  }

  let loginRes: Response
  try {
    loginRes = await fetch(`${UPSTREAM_BASE}/login.php?l=1`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({ u, p }).toString(),
      redirect: 'manual'
    })
  } catch (err) {
    throw createError({ statusCode: 502, statusMessage: '無法連線到原網站，請稍後再試' })
  }

  // 原網站登入成功／失敗都是用 302 導頁分辨：
  // 失敗會導回 login.php，成功會導到後台首頁（admin_order.php 等）
  const location = loginRes.headers.get('location') || ''
  const setCookieHeader = loginRes.headers.get('set-cookie')

  if (!setCookieHeader || location.includes('login.php')) {
    throw createError({ statusCode: 401, statusMessage: '帳號或密碼錯誤，請重新輸入' })
  }

  // 只取 cookie 的 name=value 部分，後續請求原封不動帶回去
  const sessionCookie = setCookieHeader.split(';')[0]

  setCookie(event, 'sc_upstream_session', sessionCookie, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    maxAge: 60 * 60 * 2, // 2 小時，配合原網站 session 存活時間可再調整
    path: '/'
  })

  return { ok: true }
})
