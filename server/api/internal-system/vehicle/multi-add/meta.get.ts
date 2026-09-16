/**
 * GET /api/internal-system/vehicle/multi-add/meta
 */
import { getInternalSystemSessionCookie, getInternalSystemEmployeeId } from '../../../../utils/internal-system/phpProxy'
import { fetchVehicleMultiAddMeta } from '../../../../utils/internal-system/phpVehicleProxy'

export default defineEventHandler(async (event) => {
  const cookie = getInternalSystemSessionCookie(event)
  if (!cookie) throw createError({ statusCode: 401, statusMessage: '未登入' })

  const meta = await fetchVehicleMultiAddMeta(cookie)
  return { ...meta, myEmployeeId: getInternalSystemEmployeeId(event) }
})
