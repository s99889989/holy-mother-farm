/**
 * GET /api/internal-system/property/view?id=xxx
 * 對應 api/property_search_CL.php?act=view_page&id=xxx
 */
import { getInternalSystemSessionCookie } from '../../../utils/internal-system/phpProxy'
import { internalSystemPropertyGetJson } from '../../../utils/internal-system/phpPropertyProxy'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const id = String(query.id ?? '')
  const cookie = getInternalSystemSessionCookie(event)
  return internalSystemPropertyGetJson('api/property_search_CL.php', cookie, {
    act: 'view_page',
    id,
  })
})