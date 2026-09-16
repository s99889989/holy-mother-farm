/**
 * GET /api/internal-system/attendance/departments?org=xxx
 * 依機構代碼查詢單位清單
 */
import { getInternalSystemSessionCookie } from '../../../utils/internal-system/phpProxy'
import { fetchHrDepartments } from '../../../utils/internal-system/phpHrProxy'

export default defineEventHandler(async (event) => {
  const cookie = getInternalSystemSessionCookie(event)
  if (!cookie) throw createError({ statusCode: 401, statusMessage: '未登入' })

  const query = getQuery(event)
  const org = String(query.org ?? '')
  if (!org) throw createError({ statusCode: 400, statusMessage: '缺少機構代碼' })

  return await fetchHrDepartments(cookie, org)
})
