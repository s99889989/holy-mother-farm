/**
 * POST /api/internal-system/request/user-data
 * body: { id: string }
 * 對應 sys_request_CL.php?act=UserData（清單頁「承辦人」連結彈出的處理人資訊）
 */
import { getInternalSystemSessionCookie } from '../../../utils/internal-system/phpProxy'
import { internalSystemRequestPostJson } from '../../../utils/internal-system/phpRequestProxy'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const cookie = getInternalSystemSessionCookie(event)
  return internalSystemRequestPostJson('sys_request_CL.php?act=UserData', cookie, { id: body?.id })
})