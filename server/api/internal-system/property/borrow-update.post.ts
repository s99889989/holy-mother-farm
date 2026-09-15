/**
 * POST /api/internal-system/property/borrow-update
 * body: { id: string|number, type: 'confirm' | 'cancel' }
 * 對應 api/borrow_property_CL.php?act=update_status
 */
import { getInternalSystemSessionCookie } from '../../../utils/internal-system/phpProxy'
import { internalSystemPropertyPostJson } from '../../../utils/internal-system/phpPropertyProxy'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const cookie = getInternalSystemSessionCookie(event)
  return internalSystemPropertyPostJson('api/borrow_property_CL.php?act=update_status', cookie, {
    m_id: body.id,
    m_type: body.type,
  })
})