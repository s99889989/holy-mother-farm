/**
 * GET /api/internal-system/attendance/employees?org=xxx&department=xxx
 * 依機構＋單位代碼查詢員工清單
 */
import { getInternalSystemSessionCookie } from '../../../utils/internal-system/phpProxy'
import { fetchHrEmployees } from '../../../utils/internal-system/phpHrProxy'

export default defineEventHandler(async (event) => {
  const cookie = getInternalSystemSessionCookie(event)
  if (!cookie) throw createError({ statusCode: 401, statusMessage: '未登入' })

  const query = getQuery(event)
  const org = String(query.org ?? '')
  const department = String(query.department ?? '')
  if (!org || !department) throw createError({ statusCode: 400, statusMessage: '缺少機構或單位代碼' })

  return await fetchHrEmployees(cookie, org, department)
})
