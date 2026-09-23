// server/api/dc-erp/automation/print-settings.post.ts
//
// 儲存列印方向設定，body: { orientation: 'auto' | 'landscape' | 'portrait' }
// 「新中一刀」（EPSON LQ-310 點陣機）自動列印時每次都會去讀這個值，改了
// 立刻生效，不用重新部署 Agent。

export default defineEventHandler(async (event) => {
  requireDcUpstreamSession(event)
  const body = await readBody(event)
  const orientation = ['auto', 'landscape', 'portrait'].includes(body?.orientation) ? body.orientation : 'auto'

  const apiBase = useRuntimeConfig().public.apiBase
  const res = await fetch(`${apiBase}/holy/dc-erp/automation/print-settings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json;charset=UTF-8' },
    body: JSON.stringify({ orientation })
  })
  if (!res.ok) {
    throw createError({ statusCode: 502, statusMessage: '儲存失敗' })
  }
  return await res.json()
})
