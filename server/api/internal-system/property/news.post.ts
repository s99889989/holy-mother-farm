/**
 * POST /api/internal-system/property/news
 * body: { html: string }
 * 對應 api/index_CL.php?act=newsUpdate
 */
import { getInternalSystemSessionCookie, handleInternalSystemSessionExpired } from '../../../utils/internal-system/phpProxy'
import { internalSystemPropertyPost } from '../../../utils/internal-system/phpPropertyProxy'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const cookie = getInternalSystemSessionCookie(event)

  const { text, sessionExpired } = await internalSystemPropertyPost('api/index_CL.php?act=newsUpdate', cookie, {
    index_message: body.html ?? '',
  })

  if (sessionExpired) {
    handleInternalSystemSessionExpired(event)
  }

  try {
    return JSON.parse(text)
  } catch {
    return { rs: '0', msg: '回應格式錯誤' }
  }
})