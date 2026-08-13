// server/api/dc-erp/login.post.ts
//
// 對應原網站 POST /COAERP/Account/Login。
// 帶著 captcha.get.ts 存下的 dc_prelogin_session，把帳密 + __RequestVerificationToken +
// 使用者輸入的驗證碼一起送出。
//
// 原網站對登入失敗的處理跟購物車後台不太一樣：
//   - 帳密/驗證碼錯誤時，通常是 200 直接重新渲染登入頁（帶錯誤訊息），不是 302
//   - 成功時才會是 302 導到選單首頁，並且會新增 Set-Cookie（正式登入 session）
// 這支 route 用「有沒有 302 + 有沒有新的 Set-Cookie」來判斷成功與否。
// 失敗時會嘗試從重新渲染的登入頁 HTML 裡撈出原網站實際顯示的驗證錯誤文字
// （帳號/密碼/驗證碼三個 <span class="field-validation-valid"> 區塊），
// 直接顯示給使用者，而不是用我們自己猜的通用訊息 —
// 這樣才分得出到底是帳密錯、驗證碼錯，還是其他原因（例如被防火牆擋掉）。
//
// 注意：這是把使用者帳密即時轉送給原網站做登入，沒有落地存放帳密本身。

import { load } from 'cheerio'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const account = body?.account
  const password = body?.password
  const code = body?.code
  const token = body?.token
  const imageKey = body?.imageKey

  if (!account || !password || !code || !token || !imageKey) {
    throw createError({ statusCode: 400, statusMessage: '請輸入帳號、密碼與驗證碼' })
  }

  const preloginCookie = getCookie(event, 'dc_prelogin_session')
  if (!preloginCookie) {
    throw createError({ statusCode: 400, statusMessage: '驗證碼已逾時，請重新整理頁面再試' })
  }

  let loginRes: Response
  try {
    loginRes = await fetch(`${DC_BASE}/Account/Login`, {
      method: 'POST',
      headers: {
        ...BROWSER_LIKE_HEADERS,
        'Content-Type': 'application/x-www-form-urlencoded',
        Cookie: preloginCookie
      },
      body: new URLSearchParams({
        __RequestVerificationToken: token,
        Account: account,
        Password: password,
        Code: code,
        ImageKey: imageKey
      }).toString(),
      redirect: 'manual'
    })
  } catch (err) {
    throw createError({ statusCode: 502, statusMessage: '無法連線到原網站，請稍後再試' })
  }

  const isRedirect = loginRes.status >= 300 && loginRes.status < 400
  const location = loginRes.headers.get('location') || ''
  const failedBackToLogin = isRedirect && location.includes('/Account/Login')
  const setCookies = getAllSetCookies(loginRes)
  const loginSucceeded = isRedirect && !failedBackToLogin && setCookies.length > 0

  if (!loginSucceeded) {
    // 開發時方便對照：把原網站實際回應的狀態碼/導頁位置印到伺服器 log
    console.error('[dc-erp/login] 登入失敗，原網站回應：', {
      status: loginRes.status,
      location
    })

    let upstreamMessage = ''
    try {
      const html = await loginRes.text()
      const $ = load(html)
      const parts = [
        $('#Message_validationMessage').text().trim(),
        $('#Account_validationMessage').text().trim(),
        $('#Password_validationMessage').text().trim()
      ].filter(Boolean)
      upstreamMessage = parts.join('；')
    } catch {
      // 解析失敗就算了，退回用通用訊息
    }

    throw createError({
      statusCode: 401,
      statusMessage: upstreamMessage || '帳號、密碼或驗證碼錯誤，請重新輸入'
    })
  }

  let merged = preloginCookie
  for (const sc of setCookies) {
    merged = mergeSetCookie(merged, sc)
  }

  setCookie(event, 'dc_upstream_session', merged, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    maxAge: 60 * 60 * 2, // 2 小時，配合原網站 session 存活時間可再調整
    path: '/'
  })

  deleteCookie(event, 'dc_prelogin_session', { path: '/' })

  return { ok: true }
})

