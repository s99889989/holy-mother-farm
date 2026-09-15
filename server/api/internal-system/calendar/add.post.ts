/**
 * POST /api/internal-system/calendar/add
 * 新增行事曆，proxy 到 add_calendar.php
 *
 * 原始版本直接 fetch('http://192.168.181.249/A107/...')，只有在公司內網才連得到，
 * 部署到 Netlify 後會連線逾時。改走 internalSystemAgentRelayFetch（跟 list/detail/form
 * 三支一致），透過家裡 Hub → 公司 Agent 轉發。
 */
import { getInternalSystemSessionCookie } from '../../../utils/internal-system/phpProxy'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const cookie = getInternalSystemSessionCookie(event)

  if (!cookie) throw createError({ statusCode: 401, statusMessage: '未登入' })

  const formData = new URLSearchParams()

  // 一般欄位
  const fields = [
    'mail_notice_date', 'classification', 'publish_name', 'publish_employee_id',
    'publish_start', 'start_h', 'start_m', 'publish_end', 'end_h', 'end_m',
    'dean', 'area', 'use', 'place', 'place1', 'undertake_unit', 'undertaker',
    'lecturer', 'subject', 'note', 'course_id',
  ]
  fields.forEach((f) => {
    if (body[f] !== undefined) formData.append(f, body[f])
  })

  // 郵件收件人（多選）
  if (Array.isArray(body['e_mail[]'])) {
    body['e_mail[]'].forEach((email: string) => formData.append('e_mail[]', email))
  }

  formData.append('add_calendar', '送出')

  const result = await internalSystemAgentRelayFetch(
      'POST',
      `${INTERNAL_SYSTEMS.A107}/add_calendar.php`,
      {
        Cookie: cookie,
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'Mozilla/5.0',
      },
      formData.toString()
  )

  const text = result.bodyText

  // 判斷是否成功（原系統通常會跳回列表或顯示成功訊息）
  const success = !text.includes('error') && !text.includes('錯誤')
  return { success, message: success ? '新增成功' : '新增失敗' }
})
