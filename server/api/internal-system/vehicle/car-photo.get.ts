/**
 * GET /api/internal-system/vehicle/car-photo?name=xxx.jpg
 * 轉發公司內網「選擇公務車」頁面用的車輛照片（原網站路徑 upload/car/<檔名>）。
 * 瀏覽器連不到公司內網私有 IP，所以圖片也要透過這支代理轉出來，不能直接組原網址給 <img> 用。
 */
import { getInternalSystemSessionCookie } from '../../../utils/internal-system/phpProxy'
import { internalSystemAgentRelayFetch } from '../../../utils/internal-system/agentRelay'

const BASE_URL = INTERNAL_SYSTEMS.A114

const EXT_CONTENT_TYPE: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  gif: 'image/gif',
  webp: 'image/webp',
}

export default defineEventHandler(async (event) => {
  const cookie = getInternalSystemSessionCookie(event)
  if (!cookie) throw createError({ statusCode: 401, statusMessage: '未登入' })

  const query = getQuery(event)
  const name = String(query.name ?? '')
  // 只允許純檔名，擋掉 ../ 之類的路徑跳脫
  if (!name || name.includes('/') || name.includes('\\') || name.includes('..')) {
    throw createError({ statusCode: 400, statusMessage: '檔名不合法' })
  }

  const result = await internalSystemAgentRelayFetch(
    'GET',
    `${BASE_URL}/upload/car/${encodeURIComponent(name)}`,
    { Cookie: cookie, 'User-Agent': 'Mozilla/5.0' }
  )

  if (result.status !== 200 || !result.bodyBase64) {
    throw createError({ statusCode: 404, statusMessage: '找不到照片' })
  }

  const ext = name.split('.').pop()?.toLowerCase() ?? ''
  setHeader(event, 'Content-Type', EXT_CONTENT_TYPE[ext] ?? 'application/octet-stream')
  setHeader(event, 'Cache-Control', 'private, max-age=3600')
  return Buffer.from(result.bodyBase64, 'base64')
})
