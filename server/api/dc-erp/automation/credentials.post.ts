// server/api/dc-erp/automation/credentials.post.ts
//
// 儲存自動登入帳密（存進 Spring Boot，見 automationCredentials.ts）。
// body: { account: string, password: string }
// password 留空字串代表「不變更密碼」，只改帳號時不用重打一次密碼。
//
// 注意：如果伺服器有設定環境變數 DC_ERP_AUTO_ACCOUNT /
// DC_ERP_AUTO_PASSWORD，這裡存的帳密不會生效（環境變數優先），存了也只
// 是先備著，等環境變數移除才會換這組。

export default defineEventHandler(async (event) => {
  requireDcUpstreamSession(event)
  const body = await readBody(event)
  const account = String(body?.account || '').trim()
  const password = String(body?.password || '')

  if (!account) {
    throw createError({ statusCode: 400, statusMessage: '缺少帳號' })
  }

  return await saveAutomationCredentials(account, password)
})
