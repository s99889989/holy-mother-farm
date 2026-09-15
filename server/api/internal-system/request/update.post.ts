/**
 * POST /api/internal-system/request/update
 * body: 完整表單欄位 + request_id
 * 對應 sys_request_CL.php?act=update
 */
import { getInternalSystemSessionCookie } from '../../../utils/internal-system/phpProxy'
import { internalSystemRequestPostJson } from '../../../utils/internal-system/phpRequestProxy'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const cookie = getInternalSystemSessionCookie(event)
  return internalSystemRequestPostJson('sys_request_CL.php?act=update', cookie, body ?? {})
})