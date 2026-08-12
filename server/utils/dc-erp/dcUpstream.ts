// server/utils/dc-erp/dcUpstream.ts
//
// 共用的「dc-erp（COAERP 農業生產組織經營管理系統）」原網站代理工具。
//
// 跟購物車後台（shopping.st-mary.org.tw/admincp，PHP + 帳密即可登入）不同，
// 這個原網站 https://dc.st-mary.org.tw/COAERP 是 ASP.NET MVC，登入時多兩個關卡：
//   1. __RequestVerificationToken（ASP.NET 防偽 token，隨登入頁 GET 一起產生，
//      綁定當時拿到的 session cookie，登入 POST 時要原封不動帶回去）
//   2. 圖形驗證碼（Code + ImageKey，圖片來自 /COAERP/Account/OutputImg?key=xxx）
// 所以登入流程比購物車後台多一步：
//   GET 登入頁（拿 token + 驗證碼圖片，存一個「登入前」的暫存 cookie）
//   → 使用者輸入驗證碼
//   → POST 帳密 + token + 驗證碼（帶著暫存 cookie）
//   → 成功後把新的 Set-Cookie 疊加存成正式登入 session
//
// Nuxt 會自動 import server/utils 底下的函式到 server/api 各檔案，不需要另外手動 import。

export const DC_ORIGIN = 'https://dc.st-mary.org.tw'
export const DC_BASE = `${DC_ORIGIN}/COAERP`

export function requireDcUpstreamSession(event: any): string {
  const sessionCookie = getCookie(event, 'dc_upstream_session')
  if (!sessionCookie) {
    throw createError({ statusCode: 401, statusMessage: '尚未登入' })
  }
  return sessionCookie
}

// 原網站的連結大多是 "/COAERP/xxx" 這種從網站根目錄算起的絕對路徑
// （不像購物車後台的相對路徑要小心解析），這裡統一用 origin 解析成完整網址。
export function resolveDcUpstreamAsset(path: string): string {
  if (!path) return ''
  try {
    return new URL(path, `${DC_ORIGIN}/`).toString()
  } catch {
    return ''
  }
}

export async function fetchDcUpstream(
  sessionCookie: string,
  path: string,
  init: RequestInit = {}
): Promise<Response> {
  let res: Response
  try {
    res = await fetch(`${DC_ORIGIN}${path.startsWith('/') ? path : `/${path}`}`, {
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

  // session 過期時原網站會把請求導回 Account/Login
  if (res.status >= 300 && res.status < 400) {
    const location = res.headers.get('location') || ''
    if (location.includes('/Account/')) {
      throw createError({ statusCode: 401, statusMessage: '登入已過期，請重新登入' })
    }
  }

  return res
}

// 從 fetch Response 拿出所有 Set-Cookie（Node 18+ undici 支援 headers.getSetCookie()，
// 拿不到就退回只取第一個，避免多組 cookie 只存到一組）。
export function getAllSetCookies(res: Response): string[] {
  const headersAny = res.headers as any
  if (typeof headersAny.getSetCookie === 'function') {
    return headersAny.getSetCookie()
  }
  const single = res.headers.get('set-cookie')
  return single ? [single] : []
}

// 把新的 Set-Cookie 疊加進既有的 cookie 字串（同名覆蓋，其餘保留），
// 回傳可以直接放進後續請求 Cookie 標頭的字串。
export function mergeSetCookie(existing: string, setCookieHeader: string): string {
  const nameValue = setCookieHeader.split(';')[0]
  const [name] = nameValue.split('=')
  const existingParts = existing ? existing.split('; ').filter(Boolean) : []
  const filtered = existingParts.filter((p) => !p.startsWith(`${name}=`))
  filtered.push(nameValue)
  return filtered.join('; ')
}
