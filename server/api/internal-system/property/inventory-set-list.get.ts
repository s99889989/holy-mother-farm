/**
 * GET /api/internal-system/property/inventory-set-list
 * 對應 api/inventory_set_CL.php?act=list_page
 */
import { getInternalSystemSessionCookie } from '../../../utils/internal-system/phpProxy'
import { internalSystemPropertyGetJson } from '../../../utils/internal-system/phpPropertyProxy'

export default defineEventHandler(async (event) => {
  const cookie = getInternalSystemSessionCookie(event)
  return internalSystemPropertyGetJson('api/inventory_set_CL.php', cookie, { act: 'list_page' })
})