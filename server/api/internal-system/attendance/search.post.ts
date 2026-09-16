/**
 * POST /api/internal-system/attendance/search
 * body: { org, ID, number, beg, end }
 * 查詢出勤打卡紀錄（org/ID/number 可留空字串代表「全部」，比照原網站表單）
 */
import { getInternalSystemSessionCookie } from '../../../utils/internal-system/phpProxy'
import { searchHrAttendance } from '../../../utils/internal-system/phpHrProxy'

export default defineEventHandler(async (event) => {
  const cookie = getInternalSystemSessionCookie(event)
  if (!cookie) throw createError({ statusCode: 401, statusMessage: '未登入' })

  const body = await readBody(event)
  const beg = String(body?.beg ?? '')
  const end = String(body?.end ?? '')
  if (!beg || !end) throw createError({ statusCode: 400, statusMessage: '請輸入查詢起訖日期' })

  return await searchHrAttendance(cookie, {
    org: String(body?.org ?? ''),
    ID: String(body?.ID ?? ''),
    number: String(body?.number ?? ''),
    beg,
    end,
  })
})
