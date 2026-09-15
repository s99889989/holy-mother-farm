/**
 * POST /api/internal-system/request/tl-mail
 * body: { requestUseDepartment: string, organization: string }
 * 對應 request_category_CL.php?act=tl_mail
 * 依「申請單位＋申請機構」載入該單位人員清單。
 * 舊系統把這份清單同時用在「叫修單位主管(組長)」跟「叫修人」兩個下拉選單
 * （見 tl_hbs / applicant_hbs），這裡沿用同一支 API。
 */
import { getInternalSystemSessionCookie } from '../../../utils/internal-system/phpProxy'
import { internalSystemRequestPostFormJson } from '../../../utils/internal-system/phpRequestProxy'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const cookie = getInternalSystemSessionCookie(event)
  return internalSystemRequestPostFormJson('request_category_CL.php?act=tl_mail', cookie, {
    request_use_department: body?.requestUseDepartment ?? '',
    organization: body?.organization ?? '',
  })
})