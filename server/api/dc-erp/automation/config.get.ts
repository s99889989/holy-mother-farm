// server/api/dc-erp/automation/config.get.ts
//
// 讀回自動化功能設定的客戶清單，見 automationConfig.ts。

export default defineEventHandler(async (event) => {
  requireDcUpstreamSession(event)
  const customers = await loadAutomationCustomers()
  return { customers }
})
