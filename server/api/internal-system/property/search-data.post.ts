/**
 * POST /api/internal-system/property/search-data
 * 對應 api/property_search_CL.php?act=search_data
 * body 直接透傳前端組好的查詢條件物件
 */
import { getInternalSystemSessionCookie } from '../../../utils/internal-system/phpProxy'
import { internalSystemPropertyPostJson } from '../../../utils/internal-system/phpPropertyProxy'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const cookie = getInternalSystemSessionCookie(event)
  return internalSystemPropertyPostJson('api/property_search_CL.php?act=search_data', cookie, body ?? {})
})