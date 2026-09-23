// server/api/dc-erp/automation/print-settings.get.ts
//
// 給「設定」頁顯示目前的列印方向設定（auto/landscape/portrait），實際
// 存在 Spring Boot（DcErpAutomationController /holy/dc-erp/automation/
// print-settings）。

export default defineEventHandler(async (event) => {
  requireDcUpstreamSession(event)
  const apiBase = useRuntimeConfig().public.apiBase
  const res = await fetch(`${apiBase}/holy/dc-erp/automation/print-settings`)
  if (!res.ok) return { orientation: 'auto' }
  return await res.json()
})
