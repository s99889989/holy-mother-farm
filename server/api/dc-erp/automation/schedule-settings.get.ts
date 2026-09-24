// server/api/dc-erp/automation/schedule-settings.get.ts
//
// 給「設定」頁顯示目前的排程設定（星期幾/幾點/有沒有啟用），實際存在
// Spring Boot（DcErpAutomationController /holy/dc-erp/automation/
// schedule-settings），真正的觸發是 Spring Boot 的 DcErpAutomationScheduler
// 每分鐘輪詢這份設定。

export default defineEventHandler(async (event) => {
  requireDcUpstreamSession(event)
  const apiBase = useRuntimeConfig().public.apiBase
  const res = await fetch(`${apiBase}/holy/dc-erp/automation/schedule-settings`)
  if (!res.ok) return { enabled: true, weekday: 'MONDAY', hour: 8, minute: 0 }
  return await res.json()
})
