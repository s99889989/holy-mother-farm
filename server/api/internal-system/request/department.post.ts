/**
 * POST /api/internal-system/request/department
 * body: { organization: string }
 * 對應 request_category_CL.php?act=department（依「申請機構」載入「申請單位」清單）
 */
import { getInternalSystemSessionCookie } from '../../../utils/internal-system/phpProxy'
import { internalSystemRequestPostFormJson } from '../../../utils/internal-system/phpRequestProxy'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const cookie = getInternalSystemSessionCookie(event)
  return internalSystemRequestPostFormJson('request_category_CL.php?act=department', cookie, {
    organization: body?.organization ?? '',
  })
})