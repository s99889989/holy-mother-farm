/**
 * PHP Backend Proxy Utility — 維修管理系統 (A117)
 * 所有對 192.168.181.249/A117 的請求都透過這裡（實際發送交給
 * internalSystemAgentRelayFetch，見 server/utils/agentRelay.ts）。
 *
 * 注意：CL.php 端點路徑是依照舊系統前端 sys_request.php / sys_request_ae.hbs
 * 裡 ajaxGet/ajaxPost 的相對路徑呼叫方式（例如
 * ajaxGet("sys_request_CL.php?act=getFnList")）推測為 A117 根目錄下，
 * 不是像財產系統 (phpPropertyProxy.ts) 那樣在 /api/ 子資料夾。
 * 若實際路徑不同（例如其實也在 api/ 底下）請告知我調整。
 */

const BASE_URL = INTERNAL_SYSTEMS.A117

/** 判斷 PHP 是否已 session 過期（回傳登入頁） */
function isSessionExpired(html: string): boolean {
  return (
      html.includes('login.php') ||
      html.includes('請輸入你的帳號和密碼') ||
      html.includes('flogin') ||
      // PHP session 過期通常會 302 redirect 回登入頁，登入頁不含系統標題
      (html.includes('input') && html.includes('password') && !html.includes('維修管理系統'))
  )
}

export async function internalSystemRequestGet(
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

/** form-urlencoded POST（舊系統 request_category_CL.php 系列走這個，回傳 JSON 字串） */
export async function internalSystemRequestPost(
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

export async function internalSystemRequestGetJson<T>(
    path: string,
    cookie: string,
    params?: Record<string, string>
): Promise<T> {
  const { html, sessionExpired } = await internalSystemRequestGet(path, cookie, params)
  if (sessionExpired) {
    throw createError({ statusCode: 401, statusMessage: 'Session 已過期，請重新登入' })
  }
  try {
    return JSON.parse(html) as T
  } catch {
    throw createError({ statusCode: 502, statusMessage: '舊系統回應格式非預期(非 JSON)' })
  }
}

/**
 * JSON body POST（舊系統 sys_request_CL.php 的 add/update/GetData/UserData
 * 都是用 ajaxPost(url, JSON.stringify(data)) 送的，是 JSON body）
 */
export async function internalSystemRequestPostJson<T>(
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

/**
 * form-urlencoded body POST + JSON 解析回傳（舊系統 request_category_CL.php
 * 系列是用 ajaxPost(url, plainObject)（沒有 JSON.stringify）送的，是
 * form-urlencoded body，跟上面的 internalSystemRequestPostJson 不一樣，容易搞混）
 */
export async function internalSystemRequestPostFormJson<T>(
    path: string,
    cookie: string,
    body: Record<string, string | string[]>
): Promise<T> {
  const { text, sessionExpired } = await internalSystemRequestPost(path, cookie, body)
  if (sessionExpired) {
    throw createError({ statusCode: 401, statusMessage: 'Session 已過期，請重新登入' })
  }
  try {
    return JSON.parse(text) as T
  } catch {
    throw createError({ statusCode: 502, statusMessage: '舊系統回應格式非預期(非 JSON)' })
  }
}