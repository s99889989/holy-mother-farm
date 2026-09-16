/**
 * GET /api/internal-system/vehicle/home
 * 公務車管理系統首頁：最新消息 + 各站點負責人清單
 */
import { getInternalSystemSessionCookie } from '../../../utils/internal-system/phpProxy'
import { fetchVehicleHome } from '../../../utils/internal-system/phpVehicleProxy'

export default defineEventHandler(async (event) => {
  const cookie = getInternalSystemSessionCookie(event)
  if (!cookie) throw createError({ statusCode: 401, statusMessage: '未登入' })

  return await fetchVehicleHome(cookie)
})
