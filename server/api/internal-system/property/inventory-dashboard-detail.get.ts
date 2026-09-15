/**
 * GET /api/internal-system/property/inventory-dashboard-detail?in=xxx&uid=xxx
 * 對應 api/inventory_dashboard_CL.php?act=detail_page&in=xxx&id=xxx
 */
import { getInternalSystemSessionCookie } from '../../../utils/internal-system/phpProxy'
import { internalSystemPropertyGetJson } from '../../../utils/internal-system/phpPropertyProxy'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const inventoryNo = String(query.in ?? '')
  const custody = String(query.uid ?? '')
  const cookie = getInternalSystemSessionCookie(event)
  return internalSystemPropertyGetJson('api/inventory_dashboard_CL.php', cookie, {
    act: 'detail_page',
    in: inventoryNo,
    id: custody,
  })
})