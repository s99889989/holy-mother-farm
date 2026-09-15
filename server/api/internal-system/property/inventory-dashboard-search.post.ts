/**
 * POST /api/internal-system/property/inventory-dashboard-search
 * body: { instSelect?, startYear?, endYear?, statusSelect? }
 * 對應 api/inventory_dashboard_CL.php?act=search_data
 */
import { getInternalSystemSessionCookie } from '../../../utils/internal-system/phpProxy'
import { internalSystemPropertyPostJson } from '../../../utils/internal-system/phpPropertyProxy'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const cookie = getInternalSystemSessionCookie(event)
  return internalSystemPropertyPostJson('api/inventory_dashboard_CL.php?act=search_data', cookie, body ?? {})
})