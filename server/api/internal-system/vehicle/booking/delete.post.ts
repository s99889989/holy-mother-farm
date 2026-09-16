/**
 * POST /api/internal-system/vehicle/booking/delete
 * body: { loan_record_id: string }
 */
import { getInternalSystemSessionCookie } from '../../../../utils/internal-system/phpProxy'
import { deleteVehicleBooking } from '../../../../utils/internal-system/phpVehicleProxy'

export default defineEventHandler(async (event) => {
  const cookie = getInternalSystemSessionCookie(event)
  if (!cookie) throw createError({ statusCode: 401, statusMessage: '未登入' })

  const body = await readBody(event)
  const loanRecordId = String(body.loan_record_id ?? '')
  if (!loanRecordId) throw createError({ statusCode: 400, statusMessage: '缺少 loan_record_id' })

  return await deleteVehicleBooking(cookie, loanRecordId)
})
