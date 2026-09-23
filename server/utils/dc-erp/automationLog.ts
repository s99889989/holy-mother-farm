// server/utils/dc-erp/automationLog.ts
//
// 自動化每次執行（手動按「立即執行」／排程觸發）的結果紀錄，存在 Spring
// Boot（跟客戶清單/樣板庫/PDF 同一台一直開著、有持久儲存的主機，原因
// 一樣：Netlify 的 Nitro serverless function 本機檔案系統不可靠）。
//
// 只存「摘要數字」（配對幾張/簽核幾張/轉銷幾張/PDF幾張/列印幾張/錯誤幾
// 張），不存每張單的完整明細——紀錄是給「掃一眼有沒有出錯、大概出在哪」
// 用的，真的要查某一次執行的完整明細，手動觸發的當下畫面上本來就看得
// 到，排程觸發的話目前還沒存明細（如果之後真的需要，再擴充）。

export interface AutomationLogEntry {
  timestamp: string // ISO 字串，呼叫端不用自己組，交給 logAutomationRun 內部處理
  source: 'manual' | 'scheduled'
  firmCode: string
  label: string
  dryRun: boolean
  matchedCount: number
  signCount: number
  transferCount: number
  pdfCount: number
  printCount: number
  slipSignCount: number
  errorCount: number
  error: string // 整批執行本身就失敗的話（例如自動登入失敗），放這裡；單張單的錯誤只算在 errorCount
}

function apiBase(): string {
  return useRuntimeConfig().public.apiBase
}

// 呼叫端不用管失敗——記錄紀錄本身失敗，不應該讓自動化這次執行被判定失敗，
// 所以這裡吞掉錯誤，最多在 server log 留一行，不往外拋。
export async function logAutomationRun(entry: Omit<AutomationLogEntry, 'timestamp'>): Promise<void> {
  try {
    await fetch(`${apiBase()}/holy/dc-erp/automation/log`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json;charset=UTF-8' },
      body: JSON.stringify({ ...entry, timestamp: new Date().toISOString() })
    })
  } catch (err) {
    console.error('[dc-erp automation] 寫入執行紀錄失敗（不影響本次自動化結果）：', err)
  }
}

export async function getAutomationLog(limit = 50): Promise<AutomationLogEntry[]> {
  try {
    const res = await fetch(`${apiBase()}/holy/dc-erp/automation/log?limit=${limit}`)
    if (!res.ok) return []
    return await res.json()
  } catch {
    return []
  }
}
