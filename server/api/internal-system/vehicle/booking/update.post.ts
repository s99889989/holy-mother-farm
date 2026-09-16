/**
 * POST /api/internal-system/vehicle/booking/update
 * 修改既有申請單（原網站編輯 modal 裡申請人/公務車/使用單位是唯讀，
 * 實際可改的只有駕駛、日期時間、前往地點、狀態、備註 —— 但這裡不特別
 * 擋前端傳來的欄位，交給舊系統本身的權限判斷）
 */
import { getInternalSystemSessionCookie } from '../../../../utils/internal-system/phpProxy'
import { updateVehicleBooking } from '../../../../utils/internal-system/phpVehicleProxy'

export default defineEventHandler(async (event) => {
  const cookie = getInternalSystemSessionCookie(event)
  if (!cookie) throw createError({ statusCode: 401, statusMessage: '未登入' })

  const body = await readBody(event)

  const fields = [
    'loan_record_id', 'employe', 'driver', 'car_id', 'department',
    'start_date', 'start_time', 'end_date', 'end_time', 'destination', 'st', 'note',
  ]
  const payload: Record<string, string> = {}
  fields.forEach((f) => {
    if (body[f] !== undefined) payload[f] = String(body[f])
  })

  return await updateVehicleBooking(cookie, payload)
})
