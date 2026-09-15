/**
 * GET /api/internal-system/property/site-list
 * 對應 api/put_site_CL.php?act=search_data
 */
import { getInternalSystemSessionCookie } from '../../../utils/internal-system/phpProxy'
import { internalSystemPropertyGetJson } from '../../../utils/internal-system/phpPropertyProxy'

export default defineEventHandler(async (event) => {
  const cookie = getInternalSystemSessionCookie(event)
  return internalSystemPropertyGetJson('api/put_site_CL.php', cookie, { act: 'search_data' })
})