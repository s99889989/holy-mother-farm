/**
 * GET /api/internal-system/vehicle/add/meta
 * 新增預約：申請人/駕駛/使用單位下拉選單 + 申請人-使用單位對照表 + 自己的員編（前端拿來預設選取申請人/駕駛用）
 */
import { getInternalSystemSessionCookie, getInternalSystemEmployeeId } from '../../../../utils/internal-system/phpProxy'
import { fetchVehicleAddMeta } from '../../../../utils/internal-system/phpVehicleProxy'

export default defineEventHandler(async (event) => {
  const cookie = getInternalSystemSessionCookie(event)
  if (!cookie) throw createError({ statusCode: 401, statusMessage: '未登入' })

  const meta = await fetchVehicleAddMeta(cookie)
  return { ...meta, myEmployeeId: getInternalSystemEmployeeId(event) }
})
