/**
 * POST /api/internal-system/vehicle/list/search
 * body: { startDate: string, endDate: string }
 */
import { getInternalSystemSessionCookie, getInternalSystemEmployeeId } from '../../../../utils/internal-system/phpProxy'
import { searchVehicleLoanRecords } from '../../../../utils/internal-system/phpVehicleProxy'

export default defineEventHandler(async (event) => {
  const cookie = getInternalSystemSessionCookie(event)
  if (!cookie) throw createError({ statusCode: 401, statusMessage: '未登入' })

  const body = await readBody(event)
  const startDate = String(body.startDate ?? '')
  const endDate = String(body.endDate ?? '')
  const myEmployeeId = getInternalSystemEmployeeId(event)

  return await searchVehicleLoanRecords(cookie, startDate, endDate, myEmployeeId)
})
