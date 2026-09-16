/**
 * POST /api/internal-system/vehicle/add/search-cars
 * body: { startDateTime: string, endDateTime: string }  (格式 'YYYY-MM-DD HH:mm')
 */
import { getInternalSystemSessionCookie } from '../../../../utils/internal-system/phpProxy'
import { searchAvailableCars } from '../../../../utils/internal-system/phpVehicleProxy'

export default defineEventHandler(async (event) => {
  const cookie = getInternalSystemSessionCookie(event)
  if (!cookie) throw createError({ statusCode: 401, statusMessage: '未登入' })

  const body = await readBody(event)
  const startDateTime = String(body.startDateTime ?? '')
  const endDateTime = String(body.endDateTime ?? '')

  return await searchAvailableCars(cookie, startDateTime, endDateTime)
})
