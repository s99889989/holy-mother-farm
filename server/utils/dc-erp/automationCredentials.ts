// server/utils/dc-erp/automationCredentials.ts
//
// 自動登入用的帳密——優先用環境變數 DC_ERP_AUTO_ACCOUNT /
// DC_ERP_AUTO_PASSWORD（比較安全，不會出現在任何畫面或資料庫），沒設定
// 才 fallback 用「設定」頁存進 Spring Boot 的帳密（DcErpAutomationController
// /holy/dc-erp/automation/credentials，方便不想碰 Netlify 環境變數設定畫
// 面的人直接在「設定」頁填）。兩邊都沒設定就是還不能自動登入。

export interface AutomationCredentialsInfo {
  source: 'env' | 'stored' | 'none'
  account: string
}

function apiBase(): string {
  return useRuntimeConfig().public.apiBase
}

// 給 settings.vue 顯示用：知道目前是哪個來源在生效、帳號是什麼，但不會
// 拿到密碼本身。
export async function getAutomationCredentialsInfo(): Promise<AutomationCredentialsInfo> {
  const envAccount = process.env.DC_ERP_AUTO_ACCOUNT
  const envPassword = process.env.DC_ERP_AUTO_PASSWORD
  if (envAccount && envPassword) {
    return { source: 'env', account: envAccount }
  }
  try {
    const res = await fetch(`${apiBase()}/holy/dc-erp/automation/credentials`)
    if (res.ok) {
      const data = await res.json()
      if (data.account && data.passwordConfigured) {
        return { source: 'stored', account: data.account }
      }
    }
  } catch {
    // 後端連不到就當還沒設定
  }
  return { source: 'none', account: '' }
}

// 存到 Spring Boot（「設定」頁的表單用）。password 留空字串代表「不變更
// 密碼」（只改帳號時不用重打一次密碼），跟 Spring 端邏輯一致。
export async function saveAutomationCredentials(account: string, password: string): Promise<AutomationCredentialsInfo> {
  const res = await fetch(`${apiBase()}/holy/dc-erp/automation/credentials`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json;charset=UTF-8' },
    body: JSON.stringify({ account, password })
  })
  if (!res.ok) throw new Error('帳密儲存失敗，請稍後再試')
  const data = await res.json()
  return { source: 'stored', account: data.account }
}

// 給 autoLogin 呼叫端（run-customer.post.ts、run-scheduled.post.ts）解析
// 實際要用的帳密明文；回傳 null 代表兩邊都沒設定，還不能自動登入。
export async function resolveAutomationCredentials(): Promise<{ account: string; password: string } | null> {
  const envAccount = process.env.DC_ERP_AUTO_ACCOUNT
  const envPassword = process.env.DC_ERP_AUTO_PASSWORD
  if (envAccount && envPassword) {
    return { account: envAccount, password: envPassword }
  }
  try {
    const res = await fetch(`${apiBase()}/holy/dc-erp/automation/credentials/secret`)
    if (!res.ok) return null
    const data = await res.json()
    if (!data.account || !data.password) return null
    return { account: data.account, password: data.password }
  } catch {
    return null
  }
}
