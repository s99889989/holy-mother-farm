/**
 * POST /api/internal-system/calendar/edit
 * 修改或刪除行事曆，proxy 到 edit_calendar.php
 *
 * 同 add.post.ts：原本直接打私有 IP，改走 internalSystemAgentRelayFetch 轉發。
 */
import { getInternalSystemSessionCookie } from '../../../utils/internal-system/phpProxy'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const cookie = getInternalSystemSessionCookie(event)

  if (!cookie) throw createError({ statusCode: 401, statusMessage: '未登入' })

  const formData = new URLSearchParams()

  const fields = [
    'calendar_id', 'action', 'mail_notice', 'mail_notice_date', 'classification',
    'publish_start', 'start_time', 'publish_end', 'end_time',
    'dean', 'area', 'use', 'place', 'place1', 'undertake_unit', 'undertaker',
    'lecturer', 'subject', 'note',
  ]
  fields.forEach((f) => {
    if (body[f] !== undefined) formData.append(f, body[f])
  })

  // 郵件收件人（多選）
  if (Array.isArray(body['e_mail[]'])) {
    body['e_mail[]'].forEach((email: string) => formData.append('e_mail[]', email))
  }

  formData.append('edit_calendar', '送出')

  const result = await internalSystemAgentRelayFetch(
      'POST',
      `${INTERNAL_SYSTEMS.A107}/edit_calendar.php`,
      {
        Cookie: cookie,
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'Mozilla/5.0',
      },
      formData.toString()
  )

  const text = result.bodyText

  // PHP 成功時回傳「資料修改成功」或「資料新增成功」或「資料刪除成功」
  const success = text.includes('資料修改成功') || text.includes('資料新增成功') || text.includes('資料刪除成功')
  const stayedOnForm = !success && (text.includes('name=edit_calendar') || text.includes('name="edit_calendar"'))
  const hasFormError = text.includes('請重新輸入') || text.includes('資料有誤')

  return {
    success,
    message: success ? '更新成功' : '更新失敗',
    _debug: {
      stayedOnForm,
      hasFormError,
      statusCode: result.status,
      preview: text.substring(0, 800),
    },
  }
})
