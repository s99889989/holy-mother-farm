/**
 * GET /api/internal-system/vehicle/booking/meta
 * 公務車線上申請：車輛/申請人/駕駛/使用單位下拉選單選項 + 站點分頁清單
 */
import { getInternalSystemSessionCookie } from '../../../../utils/internal-system/phpProxy'
import { fetchVehicleBookingMeta } from '../../../../utils/internal-system/phpVehicleProxy'

export default defineEventHandler(async (event) => {
  const cookie = getInternalSystemSessionCookie(event)
  if (!cookie) throw createError({ statusCode: 401, statusMessage: '未登入' })

  return await fetchVehicleBookingMeta(cookie)
})
