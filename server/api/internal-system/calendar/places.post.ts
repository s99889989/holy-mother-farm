/**
 * POST /api/internal-system/calendar/places
 * body: { area: string, use: string }
 * 對應 calendar_CL.php?act=get
 *
 * 同 add/edit：原本直接打私有 IP，改走 internalSystemAgentRelayFetch 轉發。
 */
import { getInternalSystemSessionCookie } from '../../../utils/internal-system/phpProxy'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const cookie = getInternalSystemSessionCookie(event)

  // 原網站用 JSON.stringify 送出，PHP 用 php://input 接收
  const result = await internalSystemAgentRelayFetch(
      'POST',
      `${INTERNAL_SYSTEMS.A107}/calendar_CL.php?act=get`,
      {
        Cookie: cookie,
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0',
      },
      JSON.stringify({
        area: body.area ?? '',
        use: body.use ?? '',
      })
  )

  return JSON.parse(result.bodyText)
})
