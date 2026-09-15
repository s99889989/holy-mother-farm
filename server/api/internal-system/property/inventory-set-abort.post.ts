/**
 * POST /api/internal-system/property/inventory-set-abort
 * body: { id: string|number }
 * 對應 api/inventory_set_CL.php?act=abort
 */
import { getInternalSystemSessionCookie } from '../../../utils/internal-system/phpProxy'
import { internalSystemPropertyPostJson } from '../../../utils/internal-system/phpPropertyProxy'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const cookie = getInternalSystemSessionCookie(event)
  return internalSystemPropertyPostJson('api/inventory_set_CL.php?act=abort', cookie, {
    d_id: body.id,
  })
})