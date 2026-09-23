// server/api/dc-erp/automation/schedule-settings.post.ts
//
// 儲存排程設定，body: { enabled: boolean, weekday: 'MONDAY'..'SUNDAY', hour: 0~23 }
// Spring Boot 那邊的排程觸發器每分鐘會讀最新值，改了不用重新部署就會生效。

const VALID_WEEKDAYS = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY']

export default defineEventHandler(async (event) => {
  requireDcUpstreamSession(event)
  const body = await readBody(event)

  const enabled = body?.enabled !== false
  const weekday = VALID_WEEKDAYS.includes(body?.weekday) ? body.weekday : 'MONDAY'
  const hour = Math.max(0, Math.min(23, Number.isFinite(Number(body?.hour)) ? Number(body.hour) : 8))

  const apiBase = useRuntimeConfig().public.apiBase
  const res = await fetch(`${apiBase}/holy/dc-erp/automation/schedule-settings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json;charset=UTF-8' },
    body: JSON.stringify({ enabled, weekday, hour })
  })
  if (!res.ok) {
    throw createError({ statusCode: 502, statusMessage: '儲存失敗' })
  }
  return await res.json()
})
