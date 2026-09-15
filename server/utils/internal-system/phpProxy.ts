/**
 * PHP Backend Proxy Utility — 行事曆系統 (A107)
 * 所有對 192.168.181.249/A107 的請求都透過這裡（實際發送交給
 * internalSystemAgentRelayFetch，見 server/utils/agentRelay.ts）。
 */

const BASE_URL = INTERNAL_SYSTEMS.A107

/** 判斷 PHP 是否已 session 過期（回傳登入頁） */
function isSessionExpired(html: string): boolean {
  return (
    html.includes('login.php') ||
    html.includes('請輸入你的帳號和密碼') ||
    html.includes('flogin') ||
    // PHP session 過期通常會 302 redirect 回首頁，首頁有登入框
    (html.includes('input') && html.includes('password') && !html.includes('行事曆'))
  )
}

export async function internalSystemPhpGet(
  path: string,
  cookie: string,
  params?: Record<string, string>
): Promise<{ html: string; cookies: string[]; sessionExpired: boolean }> {
  const url = new URL(`${BASE_URL}/${path}`)
  if (params) {
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v))
  }

  const result = await internalSystemAgentRelayFetch('GET', url.toString(), {
    Cookie: cookie,
    'User-Agent': 'Mozilla/5.0',
  })

  return {
    html: result.bodyText,
    cookies: getInternalSystemRelaySetCookies(result),
    sessionExpired: isSessionExpired(result.bodyText),
  }
}

export async function internalSystemPhpPost(
  path: string,
  cookie: string,
  body: Record<string, string | string[]>
): Promise<{ text: string; cookies: string[]; sessionExpired: boolean }> {
  const formData = new URLSearchParams()
  Object.entries(body).forEach(([k, v]) => {
    if (Array.isArray(v)) {
      v.forEach((item) => formData.append(k, item))
    } else {
      formData.append(k, v)
    }
  })

  const result = await internalSystemAgentRelayFetch(
    'POST',
    `${BASE_URL}/${path}`,
    {
      Cookie: cookie,
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent': 'Mozilla/5.0',
    },
    formData.toString()
  )

  return {
    text: result.bodyText,
    cookies: getInternalSystemRelaySetCookies(result),
    sessionExpired: isSessionExpired(result.bodyText),
  }
}

/** 從 event 的 cookie header 取得 PHPSESSID */
export function getInternalSystemSessionCookie(event: any): string {
  const cookies = parseCookies(event)
  const sessid = cookies['PHPSESSID'] ?? ''
  return sessid ? `PHPSESSID=${sessid}` : ''
}

/** session 過期時清除 cookie 並拋出 401 */
export function handleInternalSystemSessionExpired(event: any): never {
  deleteCookie(event, 'PHPSESSID', { path: '/' })
  deleteCookie(event, 'logged_in', { path: '/' })
  throw createError({ statusCode: 401, statusMessage: 'Session 已過期，請重新登入' })
}