/**
 * POST /api/internal-system/request/dr-mail
 * body: { requestUseDepartment: string, organization: string }
 * 對應 request_category_CL.php?act=dr_mail（叫修單位主管(主任) 清單）
 */
import { getInternalSystemSessionCookie } from '../../../utils/internal-system/phpProxy'
import { internalSystemRequestPostFormJson } from '../../../utils/internal-system/phpRequestProxy'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const cookie = getInternalSystemSessionCookie(event)
  return internalSystemRequestPostFormJson('request_category_CL.php?act=dr_mail', cookie, {
    request_use_department: body?.requestUseDepartment ?? '',
    organization: body?.organization ?? '',
  })
})