/**
 * GET /api/internal-system/property/borrow-list
 * 對應 api/borrow_property_CL.php?act=index_page
 */
import { getInternalSystemSessionCookie } from '../../../utils/internal-system/phpProxy'
import { internalSystemPropertyGetJson } from '../../../utils/internal-system/phpPropertyProxy'

export default defineEventHandler(async (event) => {
  const cookie = getInternalSystemSessionCookie(event)
  return internalSystemPropertyGetJson('api/borrow_property_CL.php', cookie, { act: 'index_page' })
})