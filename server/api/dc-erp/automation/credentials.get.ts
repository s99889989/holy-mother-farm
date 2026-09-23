// server/api/dc-erp/automation/credentials.get.ts
//
// 給「設定」頁顯示目前自動登入帳密的來源（環境變數 or「設定」頁存的）
// 跟帳號，不會回傳密碼本身。

export default defineEventHandler(async (event) => {
  requireDcUpstreamSession(event)
  return await getAutomationCredentialsInfo()
})
