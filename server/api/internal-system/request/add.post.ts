/**
 * POST /api/internal-system/request/add
 * body: 完整表單欄位（見 app/pages/request/index.vue 的 form 物件）
 * 對應 sys_request_CL.php?act=add
 */
import { getInternalSystemSessionCookie } from '../../../utils/internal-system/phpProxy'
import { internalSystemRequestPostJson } from '../../../utils/internal-system/phpRequestProxy'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const cookie = getInternalSystemSessionCookie(event)
  return internalSystemRequestPostJson('sys_request_CL.php?act=add', cookie, body ?? {})
})