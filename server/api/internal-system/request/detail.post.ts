/**
 * POST /api/internal-system/request/detail
 * body: { id: string }
 * 對應 sys_request_CL.php?act=GetData（編輯時載入單筆完整資料）
 */
import { getInternalSystemSessionCookie } from '../../../utils/internal-system/phpProxy'
import { internalSystemRequestPostJson } from '../../../utils/internal-system/phpRequestProxy'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const cookie = getInternalSystemSessionCookie(event)
  return internalSystemRequestPostJson('sys_request_CL.php?act=GetData', cookie, { id: body?.id })
})