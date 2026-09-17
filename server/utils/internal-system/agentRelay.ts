/**
 * 打公司內網私有 IP（192.168.181.249）的共用底層函式。
 *
 * 這台伺服器連不到公司內網，實際請求是透過家裡 Hub（Spring Boot）轉給
 * 公司端常駐的 Agent 代為發送，Agent 人在公司網路內，連得到那些私有 IP。
 *
 * method/url/headers/body 直接對應原本 fetch() 的參數，回傳補上已解碼的
 * bodyText，跟完整 response headers（含 set-cookie），讓呼叫端可以沿用
 * 原本手動處理 cookie 的邏輯，不用大改既有程式碼。
 */

const HUB_URL = 'https://madustrialtd.asuscomm.com:8080'

export interface InternalSystemAgentRelayResult {
  status: number
  headers: Record<string, string[]>
  bodyText: string
  /** 原始 base64，二進位內容（圖片等）要用這個，不能用 bodyText（會被 UTF-8 解碼弄壞） */
  bodyBase64: string
}

interface RelayResponseRaw {
  status: number
  headers?: Record<string, string[]>
  bodyBase64?: string
  success?: boolean
  error?: string
}

export async function internalSystemAgentRelayFetch(
  method: string,
  url: string,
  headers: Record<string, string>,
  body?: string
): Promise<InternalSystemAgentRelayResult> {
  const bodyBase64 = body ? Buffer.from(body, 'utf-8').toString('base64') : undefined

  const res = await fetch(`${HUB_URL}/holy/agent/relay`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ method, url, headers, bodyBase64 }),
  })

  const result = (await res.json()) as RelayResponseRaw
  if (result.success === false) {
    throw createError({ statusCode: 502, statusMessage: result.error ?? '轉發失敗' })
  }

  const bodyText = result.bodyBase64
    ? Buffer.from(result.bodyBase64, 'base64').toString('utf-8')
    : ''

  return {
    status: result.status,
    headers: result.headers ?? {},
    bodyText,
    bodyBase64: result.bodyBase64 ?? '',
  }
}

/** 從轉發結果的 headers 裡取出 set-cookie（不分大小寫 key，可能有多個）。 */
export function getInternalSystemRelaySetCookies(result: InternalSystemAgentRelayResult): string[] {
  const key = Object.keys(result.headers).find((k) => k.toLowerCase() === 'set-cookie')
  return key ? result.headers[key] : []
}
