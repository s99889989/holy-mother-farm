/**
 * POST /api/internal-system/vehicle/multi-add/submit
 * body: { employe, driver, car_id, department, start_time, end_time, destination, note, select_date: string[] }
 */
import { getInternalSystemSessionCookie } from '../../../../utils/internal-system/phpProxy'
import { submitVehicleMultiAdd } from '../../../../utils/internal-system/phpVehicleProxy'

export default defineEventHandler(async (event) => {
  const cookie = getInternalSystemSessionCookie(event)
  if (!cookie) throw createError({ statusCode: 401, statusMessage: '未登入' })

  const body = await readBody(event)
  const selectDate = Array.isArray(body.select_date) ? body.select_date.map(String) : []

  if (selectDate.length === 0) {
    throw createError({ statusCode: 400, statusMessage: '請至少選擇一個日期' })
  }

  return await submitVehicleMultiAdd(cookie, {
    employe: String(body.employe ?? ''),
    driver: String(body.driver ?? ''),
    car_id: String(body.car_id ?? ''),
    department: String(body.department ?? ''),
    start_time: String(body.start_time ?? ''),
    end_time: String(body.end_time ?? ''),
    destination: String(body.destination ?? ''),
    note: String(body.note ?? ''),
    select_date: selectDate,
  })
})
