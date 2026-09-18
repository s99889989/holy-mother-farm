// server/api/dc-erp/automation/config.post.ts
//
// 儲存自動化功能設定的客戶清單，body: { customers: AutomationCustomer[] }
// 前端整份陣列送過來直接覆蓋存檔（清單通常只有幾筆，不用做細部 diff）。

import { randomUUID } from 'node:crypto'

export default defineEventHandler(async (event) => {
  requireDcUpstreamSession(event)
  const body = await readBody(event)
  const raw = Array.isArray(body?.customers) ? body.customers : []

  const cleaned = raw
    .map((c: any) => ({
      id: c?.id ? String(c.id) : randomUUID(),
      firmCode: String(c?.firmCode || '').trim(),
      label: String(c?.label || '').trim(),
      enabled: !!c?.enabled
    }))
    .filter((c: any) => c.firmCode)

  await saveAutomationCustomers(cleaned)
  return { customers: cleaned }
})
