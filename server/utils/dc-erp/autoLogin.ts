// server/utils/dc-erp/autoLogin.ts
//
// 用「驗證碼樣板比對分類器」自動完成 COAERP 登入，取代人工看圖輸入驗證碼
// 這一步——這是排程/自動化能不能真正「無人值守」的關鍵，之前
// settings.vue 自動化區塊那段「目前只能手動觸發」的限制，就是靠這支解掉。
//
// ⚠️ 帳密風險，务必看完再接排程：
// 這裡用的是「真的」COAERP 帳號密碼（跟 login.post.ts 幫使用者代轉的性質
// 不一樣，是伺服器自己主動登入），每一次重試都是對真實帳號的一次登入
// 嘗試。原網站有沒有登入失敗鎖定機制不確定，DEFAULT_MAX_RETRIES 故意設
// 低（3 次），不要調太高；如果驗證碼連續猜錯，代表樣板庫在這批字元上還
// 不夠準，讓它失敗、看 log 決定要不要人工介入，不要無限重試狂打真帳號。
//
// 帳密請用環境變數 DC_ERP_AUTO_ACCOUNT / DC_ERP_AUTO_PASSWORD 提供，不要
// 寫死在程式碼、不要存進 settings.vue 或任何會被看到的設定檔／資料庫。

import { load } from 'cheerio'

const DEFAULT_MAX_RETRIES = 3

export interface AutoLoginResult {
  sessionCookie: string
  attempts: number
}

export async function attemptAutoLogin(
  account: string,
  password: string,
  maxRetries = DEFAULT_MAX_RETRIES
): Promise<AutoLoginResult> {
  const library = await loadCaptchaLibrary()

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    // 1. GET 登入頁：拿 token/imageKey + 一組「登入前」暫存 cookie
    const pageRes = await fetch(`${DC_BASE}/Account/Login`, { redirect: 'manual', headers: BROWSER_LIKE_HEADERS })
    let cookie = ''
    for (const sc of getAllSetCookies(pageRes)) cookie = mergeSetCookie(cookie, sc)
    const pageHtml = await pageRes.text()
    const $page = load(pageHtml)
    const token = $page('input[name="__RequestVerificationToken"]').attr('value') || ''
    const imageKey = $page('#ImageKey').attr('value') || ''
    if (!token || !imageKey || !cookie) {
      throw new Error('登入頁解析失敗（token/imageKey/cookie 缺一），可能原網站改版了')
    }

    // 2. GET 驗證碼圖片
    const imgRes = await fetch(`${DC_BASE}/Account/OutputImg?key=${encodeURIComponent(imageKey)}`, {
      headers: { ...BROWSER_LIKE_HEADERS, Cookie: cookie }
    })
    if (!imgRes.ok) throw new Error(`驗證碼圖片取得失敗，status=${imgRes.status}`)
    for (const sc of getAllSetCookies(imgRes)) cookie = mergeSetCookie(cookie, sc)
    const buffer = Buffer.from(await imgRes.arrayBuffer())

    // 3. 用目前的樣板庫猜答案
    const { guess, boxCount, glyphs } = await classifyCaptcha(buffer, library)
    if (boxCount !== 4) {
      // 切字數不對（不是 4 個），這張再猜也沒意義，直接當這次嘗試失敗，
      // 換下一輪重新要一張新的驗證碼。
      continue
    }

    // 4. 用真帳密 + 猜的驗證碼送出登入
    const loginRes = await fetch(`${DC_BASE}/Account/Login`, {
      method: 'POST',
      redirect: 'manual',
      headers: { ...BROWSER_LIKE_HEADERS, 'Content-Type': 'application/x-www-form-urlencoded', Cookie: cookie },
      body: new URLSearchParams({
        __RequestVerificationToken: token,
        Account: account,
        Password: password,
        Code: guess,
        ImageKey: imageKey
      }).toString()
    })

    const isRedirect = loginRes.status >= 300 && loginRes.status < 400
    const location = loginRes.headers.get('location') || ''
    const failedBackToLogin = isRedirect && location.includes('/Account/Login')
    const setCookies = getAllSetCookies(loginRes)
    const loginSucceeded = isRedirect && !failedBackToLogin && setCookies.length > 0

    if (loginSucceeded) {
      let merged = cookie
      for (const sc of setCookies) merged = mergeSetCookie(merged, sc)
      // 真的登入成功了，代表這次猜的驗證碼保證是對的——把這 4 個字元的
      // 樣本加進樣板庫，這是最可靠的訓練資料來源（比之前用假帳密探測還
      // 準，因為這裡的「成功」就是原網站唯一在乎的那個成功）。
      const confirmed = guess.split('').map((label, i) => ({ label, feat: Array.from(glyphs[i]) }))
      await appendConfirmedGlyphs(confirmed)
      return { sessionCookie: merged, attempts: attempt }
    }

    // 沒成功：解析原網站訊息判斷是「驗證碼錯」還是「帳密錯」。跟
    // bootstrap-captcha-ocr.mjs 實測核對過的判斷依據一樣：訊息裡提到
    // 「帳號」代表驗證碼其實過了，是帳密真的不對；只提「驗證碼」才是
    // 驗證碼猜錯。
    const html = await loginRes.text()
    const $ = load(html)
    const messageText = $('#Message_validationMessage').text().trim()
    const accountOrPasswordWrong = messageText.includes('帳號')

    if (accountOrPasswordWrong) {
      // 驗證碼過了，帳密是真的錯——不是驗證碼問題，繼續重試也沒用，
      // 直接丟錯誤，不要一直打同一個真帳號增加被鎖的風險。
      throw new Error(`帳號或密碼錯誤（驗證碼已通過，不是驗證碼問題）：${messageText}`)
    }
    // 否則視為驗證碼猜錯，迴圈換下一輪、重新要一張新的驗證碼再試。
  }

  throw new Error(`自動登入失敗：驗證碼連續猜錯 ${maxRetries} 次，可能樣板庫在這批字元上還不夠準，建議之後用 bootstrap-captcha-ocr.mjs 再多跑幾輪讓樣板庫變大`)
}
