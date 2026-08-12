// server/utils/scUpstream.ts
//
// 共用的「購物車後台」原網站代理工具。Nuxt 會自動 import server/utils 底下的
// 函式到 server/api 各檔案，不需要另外手動 import。

export const SC_UPSTREAM_BASE = 'https://shopping.st-mary.org.tw/admincp'

export function requireUpstreamSession(event: any): string {
  const sessionCookie = getCookie(event, 'sc_upstream_session')
  if (!sessionCookie) {
    throw createError({ statusCode: 401, statusMessage: '尚未登入' })
  }
  return sessionCookie
}

export async function fetchUpstream(
  sessionCookie: string,
  path: string,
  init: RequestInit = {}
): Promise<Response> {
  let res: Response
  try {
    res = await fetch(`${SC_UPSTREAM_BASE}/${path}`, {
      redirect: 'manual',
      ...init,
      headers: {
        Cookie: sessionCookie,
        ...(init.headers || {})
      }
    })
  } catch (err) {
    throw createError({ statusCode: 502, statusMessage: '無法連線到原網站，請稍後再試' })
  }

  // session 過期時原網站會把請求導回 login.php
  if (res.status >= 300 && res.status < 400) {
    const location = res.headers.get('location') || ''
    if (location.includes('login.php')) {
      throw createError({ statusCode: 401, statusMessage: '登入已過期，請重新登入' })
    }
  }

  return res
}
