/**
 * PHP Backend Proxy Utility — 財產管理系統 (A113)
 * 所有對 192.168.181.249/A113 的請求都透過這裡，實際發送交給 internalSystemAgentRelayFetch
 * （見 server/utils/agentRelay.ts）代為打到公司內網。
 */

const BASE_URL = INTERNAL_SYSTEMS.A113

/** 判斷 PHP 是否已 session 過期（回傳登入頁） */
function isSessionExpired(html: string): boolean {
  return (
      html.includes('login.php') ||
      html.includes('請輸入你的帳號和密碼') ||
      html.includes('flogin') ||
      (html.includes('input') && html.includes('password') && !html.includes('財產管理系統'))
  )
}

export async function internalSystemPropertyGet(
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

export async function internalSystemPropertyPost(
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

/**
 * 這幾個 *_CL.php?act=xxx 端點本身回傳 JSON（不是 HTML 頁面）。
 */
export async function internalSystemPropertyGetJson<T>(
    path: string,
    cookie: string,
    params?: Record<string, string>
): Promise<T> {
  const { html, sessionExpired } = await internalSystemPropertyGet(path, cookie, params)
  if (sessionExpired) {
    throw createError({ statusCode: 401, statusMessage: 'Session 已過期，請重新登入' })
  }
  try {
    return JSON.parse(html) as T
  } catch {
    throw createError({ statusCode: 502, statusMessage: '舊系統回應格式非預期(非 JSON)' })
  }
}

export async function internalSystemPropertyPostJson<T>(
    path: string,
    cookie: string,
    body: Record<string, unknown>
): Promise<T> {
  const result = await internalSystemAgentRelayFetch(
      'POST',
      `${BASE_URL}/${path}`,
      {
        Cookie: cookie,
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0',
      },
      JSON.stringify(body)
  )

  if (isSessionExpired(result.bodyText)) {
    throw createError({ statusCode: 401, statusMessage: 'Session 已過期，請重新登入' })
  }
  try {
    return JSON.parse(result.bodyText) as T
  } catch {
    throw createError({ statusCode: 502, statusMessage: '舊系統回應格式非預期(非 JSON)' })
  }
}