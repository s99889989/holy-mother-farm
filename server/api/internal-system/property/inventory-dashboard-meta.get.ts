/**
 * GET /api/internal-system/property/inventory-dashboard-meta
 * 對應 api/inventory_dashboard_CL.php?act=list_page
 */
import { getInternalSystemSessionCookie } from '../../../utils/internal-system/phpProxy'
import { internalSystemPropertyGetJson } from '../../../utils/internal-system/phpPropertyProxy'

export default defineEventHandler(async (event) => {
  const cookie = getInternalSystemSessionCookie(event)
  return internalSystemPropertyGetJson('api/inventory_dashboard_CL.php', cookie, { act: 'list_page' })
})