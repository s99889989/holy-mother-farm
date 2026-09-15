/**
 * POST /api/internal-system/property/inventory-dashboard-finish
 * body: { inventoryNo: string }
 * 對應 api/inventory_dashboard_CL.php?act=finsh
 */
import { getInternalSystemSessionCookie } from '../../../utils/internal-system/phpProxy'
import { internalSystemPropertyPostJson } from '../../../utils/internal-system/phpPropertyProxy'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const cookie = getInternalSystemSessionCookie(event)
  return internalSystemPropertyPostJson('api/inventory_dashboard_CL.php?act=finsh', cookie, {
    m_id: body.inventoryNo ?? '',
    codecas: body.inventoryNo ?? '',
  })
})