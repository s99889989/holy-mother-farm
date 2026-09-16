/**
 * POST /api/internal-system/vehicle/add/submit
 */
import { getInternalSystemSessionCookie } from '../../../../utils/internal-system/phpProxy'
import { addVehicleBooking } from '../../../../utils/internal-system/phpVehicleProxy'

export default defineEventHandler(async (event) => {
  const cookie = getInternalSystemSessionCookie(event)
  if (!cookie) throw createError({ statusCode: 401, statusMessage: '未登入' })

  const body = await readBody(event)

  const fields = [
    'employee_id', 'driver', 'applicant_department', 'car_id',
    'start_date', 'start_time', 'end_date', 'end_time', 'destination', 'notes',
  ]
  const payload: Record<string, string> = {}
  fields.forEach((f) => {
    if (body[f] !== undefined) payload[f] = String(body[f])
  })

  return await addVehicleBooking(cookie, payload)
})
