/**
 * POST /api/internal-system/vehicle/list/disable-all
 * body: { startDate: string, endDate: string, selectCar: string }
 */
import { getInternalSystemSessionCookie } from '../../../../utils/internal-system/phpProxy'
import { disableAllVehicleLoanResults } from '../../../../utils/internal-system/phpVehicleProxy'

export default defineEventHandler(async (event) => {
  const cookie = getInternalSystemSessionCookie(event)
  if (!cookie) throw createError({ statusCode: 401, statusMessage: '未登入' })

  const body = await readBody(event)

  return await disableAllVehicleLoanResults(cookie, {
    startDate: String(body.startDate ?? ''),
    endDate: String(body.endDate ?? ''),
    selectCar: String(body.selectCar ?? ''),
    selectSite: '', // 沒實作站點分頁篩選，固定傳空字串（=不篩站點）
  })
})
