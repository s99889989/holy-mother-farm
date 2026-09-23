// server/utils/dc-erp/captchaLibrary.ts
//
// 登入驗證碼樣板庫——改存在 Spring Boot（DcErpAutomationController.java，
// /holy/dc-erp/automation/captcha-library），原因跟 automationConfig.ts
// 一樣：Netlify 的 serverless function 本機檔案系統不可靠，這份資料又是
// 「猜對/真的登入成功時才長大」的長期累積資料，更不能弄丟。

export interface CaptchaTemplateEntry {
  label: string
  feat: number[]
}

export interface CaptchaLibraryStats {
  total: number
  counts: Record<string, number>
}

function apiBase(): string {
  return useRuntimeConfig().public.apiBase
}

// 給 autoLogin.ts 的分類器用：完整樣板庫（含每筆的 feat 陣列），量會隨
// 使用時間變大。畫面顯示用統計數字，不要呼叫這支，改呼叫下面的
// getCaptchaLibraryStats()。
export async function loadCaptchaLibrary(): Promise<CaptchaTemplateEntry[]> {
  try {
    const res = await fetch(`${apiBase()}/holy/dc-erp/automation/captcha-library`)
    if (!res.ok) return []
    return await res.json()
  } catch {
    return []
  }
}

// 猜對/真的登入成功時呼叫（見 autoLogin.ts）：用「合併」（append）存進
// Spring Boot，不會清掉伺服器現有的樣本。回傳 Spring 端算好的最新統計，
// 不用另外再拉一次完整庫回來算。
export async function appendConfirmedGlyphs(entries: CaptchaTemplateEntry[]): Promise<CaptchaLibraryStats & { imported: number }> {
  const res = await fetch(`${apiBase()}/holy/dc-erp/automation/captcha-library/import`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json;charset=UTF-8' },
    body: JSON.stringify(entries)
  })
  if (!res.ok) throw new Error('樣板庫寫入失敗')
  return await res.json()
}

// 給「設定」頁顯示用：只拿總數＋各數字分布，不用把整份大陣列傳給畫面。
export async function getCaptchaLibraryStats(): Promise<CaptchaLibraryStats> {
  try {
    const res = await fetch(`${apiBase()}/holy/dc-erp/automation/captcha-library/stats`)
    if (!res.ok) return { total: 0, counts: {} }
    return await res.json()
  } catch {
    return { total: 0, counts: {} }
  }
}
