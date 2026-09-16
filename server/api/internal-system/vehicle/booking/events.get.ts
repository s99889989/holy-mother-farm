/**
 * GET /api/internal-system/vehicle/booking/events?site=All|st001...&start=YYYY-MM-DD&end=YYYY-MM-DD
 */
import { getInternalSystemSessionCookie, getInternalSystemEmployeeId } from '../../../../utils/internal-system/phpProxy'
import { fetchVehicleBookingEvents } from '../../../../utils/internal-system/phpVehicleProxy'

export default defineEventHandler(async (event) => {
  const cookie = getInternalSystemSessionCookie(event)
  if (!cookie) throw createError({ statusCode: 401, statusMessage: '未登入' })

  const query = getQuery(event)
  const site = String(query.site ?? 'All')
  const start = String(query.start ?? '')
  const end = String(query.end ?? '')
  const myEmployeeId = getInternalSystemEmployeeId(event)

  return await fetchVehicleBookingEvents(cookie, site, start, end, myEmployeeId)
})
