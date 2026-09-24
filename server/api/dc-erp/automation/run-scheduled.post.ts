// server/api/dc-erp/automation/run-scheduled.post.ts
//
// 給「外部排程」呼叫的入口——目前是 Spring Boot 那邊的
// DcErpAutomationScheduler 主動打過來（觸發時間是「設定」頁的「排程」
// 區塊設定的星期幾/幾點，不是寫死的），因為 Netlify Functions 是
// serverless，沒有內建、可靠的排程器，排程改放在一直開著的 Spring Boot
// 主機那邊觸發。
//
// 用一組共用密鑰驗證（環境變數 DC_ERP_AUTOMATION_SECRET，要跟 Spring Boot
// 那邊 application.properties 的 dc-erp.automation.secret 完全一樣），
// 呼叫時要帶 header：x-automation-secret: <密鑰>。沒設定這個環境變數的
// 話，這支路由直接回 403——這支會自動登入公司帳號並實際簽核/轉銷/列印
// 下載，不能讓任何人都打得到，一定要設密鑰。
//
// 每個客戶的執行結果都會記一筆執行紀錄到 Spring Boot（見
// automationLog.ts），「設定」頁的「執行紀錄」區塊會顯示，排程半夜自己
// 跑完，隔天可以直接看有沒有出錯。

export default defineEventHandler(async (event) => {
  const secret = process.env.DC_ERP_AUTOMATION_SECRET
  if (!secret || getHeader(event, 'x-automation-secret') !== secret) {
    throw createError({ statusCode: 403, statusMessage: '未授權' })
  }

  const creds = await resolveAutomationCredentials()
  if (!creds) {
    throw createError({
      statusCode: 500,
      statusMessage: '未設定自動登入帳密（環境變數 DC_ERP_AUTO_ACCOUNT/PASSWORD 或「設定」頁的自動登入帳密）'
    })
  }

  let sessionCookie: string
  try {
    const login = await attemptAutoLogin(creds.account, creds.password)
    sessionCookie = login.sessionCookie
  } catch (err: any) {
    // 連自動登入都失敗，整批客戶都跑不了，記一筆整體失敗的紀錄。
    await logAutomationRun({
      source: 'scheduled',
      firmCode: '',
      label: '（自動登入）',
      dryRun: false,
      matchedCount: 0,
      signCount: 0,
      transferCount: 0,
      pdfCount: 0,
      printCount: 0,
      slipSignCount: 0,
      errorCount: 0,
      error: '自動登入失敗：' + (err?.message || '')
    })
    throw createError({ statusCode: 502, statusMessage: '自動登入失敗：' + (err?.message || '') })
  }

  const customers = (await loadAutomationCustomers()).filter((c) => c.enabled)
  const summary: Array<{ firmCode: string; label: string; matchedCount?: number; error?: string }> = []

  for (const customer of customers) {
    try {
      const res = await runCustomerPipeline(sessionCookie, customer.firmCode, false, customer.remarkKeyword, customer.printEnabled)
      summary.push({ firmCode: customer.firmCode, label: customer.label, matchedCount: res.matchedCount })
      await logAutomationRun({
        source: 'scheduled',
        firmCode: customer.firmCode,
        label: customer.label,
        dryRun: false,
        error: '',
        ...summarizeRunResult(res)
      })
    } catch (err: any) {
      summary.push({ firmCode: customer.firmCode, label: customer.label, error: err?.message || '執行失敗' })
      await logAutomationRun({
        source: 'scheduled',
        firmCode: customer.firmCode,
        label: customer.label,
        dryRun: false,
        matchedCount: 0,
        signCount: 0,
        transferCount: 0,
        pdfCount: 0,
        printCount: 0,
        slipSignCount: 0,
        errorCount: 0,
        error: err?.message || '執行失敗'
      })
    }
  }

  return { summary }
})
