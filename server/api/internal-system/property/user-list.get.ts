/**
 * GET /api/internal-system/property/user-list
 * 對應 api/property_user_CL.php?act=index_page
 */
import { getInternalSystemSessionCookie } from '../../../utils/internal-system/phpProxy'
import { internalSystemPropertyGetJson } from '../../../utils/internal-system/phpPropertyProxy'

export default defineEventHandler(async (event) => {
  const cookie = getInternalSystemSessionCookie(event)
  return internalSystemPropertyGetJson('api/property_user_CL.php', cookie, { act: 'index_page' })
})