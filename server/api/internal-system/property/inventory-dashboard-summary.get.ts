/**
 * GET /api/internal-system/property/inventory-dashboard-summary?in=xxx
 * 對應 api/inventory_dashboard_CL.php?act=summary_page&in=xxx
 */
import { getInternalSystemSessionCookie } from '../../../utils/internal-system/phpProxy'
import { internalSystemPropertyGetJson } from '../../../utils/internal-system/phpPropertyProxy'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const inventoryNo = String(query.in ?? '')
  const cookie = getInternalSystemSessionCookie(event)
  return internalSystemPropertyGetJson('api/inventory_dashboard_CL.php', cookie, {
    act: 'summary_page',
    in: inventoryNo,
  })
})