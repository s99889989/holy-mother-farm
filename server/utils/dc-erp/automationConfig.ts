// server/utils/dc-erp/automationConfig.ts
//
// 自動化功能的客戶清單設定——改存在 Spring Boot 那台一直開著、有持久
// 儲存的主機（DcErpAutomationController.java，/holy/dc-erp/automation/
// customers），不再寫本機檔案：Netlify 上的 Nitro serverless function
// 每次呼叫可能是全新環境，本機檔案系統不會在多次呼叫間保留，也不會在
// 多個執行個體間共享，跟「設置所屬類別」那份 product_images.yml 是同一
// 個道理，所以比照它的做法，直打 Spring Boot。

export interface AutomationCustomer {
  id: string
  firmCode: string
  label: string
  enabled: boolean
  remarkKeyword: string
  printEnabled: boolean
}

function apiBase(): string {
  return useRuntimeConfig().public.apiBase
}

export async function loadAutomationCustomers(): Promise<AutomationCustomer[]> {
  try {
    const res = await fetch(`${apiBase()}/holy/dc-erp/automation/customers`)
    if (!res.ok) return []
    return await res.json()
  } catch {
    return [] // 後端連不到就先當空清單，不擋頁面其他功能
  }
}

// 整份覆蓋（客戶清單通常只有幾筆，不用做細部 diff，跟 Spring 端
// saveCustomers() 的行為一致）。
export async function saveAutomationCustomers(list: AutomationCustomer[]): Promise<AutomationCustomer[]> {
  const res = await fetch(`${apiBase()}/holy/dc-erp/automation/customers`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json;charset=UTF-8' },
    body: JSON.stringify(list)
  })
  if (!res.ok) throw new Error('客戶清單儲存失敗，請稍後再試')
  return await res.json()
}
