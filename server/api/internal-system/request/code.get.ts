/**
 * GET /api/internal-system/request/code
 * 對應 sys_request_CL.php?act=getCode
 * 回傳新增/編輯表單需要的所有基礎代碼資料
 * （request_speed / department / organization / call_department /
 *   team_leader / director / user）
 */
import { getInternalSystemSessionCookie } from '../../../utils/internal-system/phpProxy'
import { internalSystemRequestGetJson } from '../../../utils/internal-system/phpRequestProxy'

export default defineEventHandler(async (event) => {
  const cookie = getInternalSystemSessionCookie(event)
  return internalSystemRequestGetJson('sys_request_CL.php', cookie, { act: 'getCode' })
})