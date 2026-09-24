// server/api/dc-erp/automation/run-customer.post.ts
//
// 自動化執行入口：settings.vue「預覽」／「立即執行」按鈕打這支。
//
// body: { firmCode: string, dryRun?: boolean, remarkKeyword?: string, printEnabled?: boolean, label?: string }
//   dryRun=true  只查「目前有哪些未簽核的訂貨單」，不簽核也不轉銷。
//   remarkKeyword 選填：同一個客戶代號底下可能混著不同種類的訂單（例如
//                同一個客戶代號下有藥草/豆腐/麵包/雞蛋等備註不同的單），
//                有給的話只處理備註「包含」這個關鍵字的訂單（逗號分隔可
//                填多個，符合任一個即算），沒給就跟以前一樣整個客戶代號
//                底下都處理。
//   printEnabled=true 時，PDF 存檔成功後會緊接著送去「新中一刀」印表機
//                實際列印（見 automation.ts 的 downloadSlipPdf()）；預設
//                false，只下載 PDF 不印，方便測試不浪費紙。
//   label 選填，純粹給執行紀錄用（見 automationLog.ts），不影響執行邏輯。
//   dryRun=false 實際跑：簽核 → 重查可轉銷狀態 → 逐筆轉銷 → 在銷貨單找
//                對應單 → 下載「中一刀-半長」PDF。核心邏輯在
//                automation.ts 的 runCustomerPipeline，跟排程觸發
//                （run-scheduled.post.ts）共用同一份。
//
// 登入方式：先看瀏覽器有沒有 dc_upstream_session cookie，有就先拿來試——
// 但「有 cookie」不代表「這個 session 還有效」（COAERP session 存活 2
// 小時，過期後 cookie 還在，只是失效了）。以前的寫法只檢查「有沒有
// cookie」，帶著過期的 cookie 照樣往下跑，跑到一半才在 automation.ts 深處
// 噴出「登入已過期，請重新登入」，跟排程那條路（每次都無條件重新登入，
// 不會有這個問題）行為對不起來。現在改成：如果執行過程中真的收到「登入
// 已過期」，會自動用帳密重新登入一次、再重跑一次——不管一開始有沒有
// cookie、cookie 是不是已經過期，最終都會自動處理，不需要人工介入。
//
// 找帳密的順序（automationCredentials.ts 的 resolveAutomationCredentials()）：
// 環境變數優先，沒設定才用「設定」頁存在 Spring Boot 的那組；兩邊都沒設
// 定的話才會是「尚未登入」的錯誤。
//
// 每次執行（不管預覽還是真的跑）都會記一筆執行紀錄到 Spring Boot（見
// automationLog.ts），「設定」頁的「執行紀錄」區塊會顯示。

async function getSessionCookie(event: any, forceRelogin: boolean): Promise<string> {
  if (!forceRelogin) {
    const existing = getCookie(event, 'dc_upstream_session')
    if (existing) return existing
  }

  const creds = await resolveAutomationCredentials()
  if (!creds) {
    throw createError({
      statusCode: 401,
      statusMessage: '尚未登入，且未設定自動登入帳密（環境變數 DC_ERP_AUTO_ACCOUNT/PASSWORD 或「設定」頁的自動登入帳密）'
    })
  }
  try {
    const login = await attemptAutoLogin(creds.account, creds.password)
    setCookie(event, 'dc_upstream_session', login.sessionCookie, {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      maxAge: 60 * 60 * 2,
      path: '/'
    })
    return login.sessionCookie
  } catch (err: any) {
    throw createError({ statusCode: 502, statusMessage: '自動登入失敗：' + (err?.message || '') })
  }
}

function isSessionExpiredError(err: any): boolean {
  return err?.statusCode === 401 || String(err?.message || err?.statusMessage || '').includes('登入已過期')
}

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const firmCode = body?.firmCode ? String(body.firmCode).trim() : ''
  const dryRun = !!body?.dryRun
  const remarkKeyword = body?.remarkKeyword ? String(body.remarkKeyword).trim() : ''
  const printEnabled = !!body?.printEnabled
  const label = body?.label ? String(body.label).trim() : firmCode

  if (!firmCode) {
    throw createError({ statusCode: 400, statusMessage: '缺少客戶代號' })
  }

  try {
    let sessionCookie = await getSessionCookie(event, false)

    let result
    try {
      result = await runCustomerPipeline(sessionCookie, firmCode, dryRun, remarkKeyword, printEnabled)
    } catch (err: any) {
      if (!isSessionExpiredError(err)) throw err
      // session 過期：強制重新登入一次，再重跑一次整個流程。
      sessionCookie = await getSessionCookie(event, true)
      result = await runCustomerPipeline(sessionCookie, firmCode, dryRun, remarkKeyword, printEnabled)
    }

    await logAutomationRun({
      source: 'manual',
      firmCode,
      label,
      dryRun,
      error: '',
      ...summarizeRunResult(result)
    })
    return result
  } catch (err: any) {
    await logAutomationRun({
      source: 'manual',
      firmCode,
      label,
      dryRun,
      matchedCount: 0,
      signCount: 0,
      transferCount: 0,
      pdfCount: 0,
      printCount: 0,
      slipSignCount: 0,
      errorCount: 0,
      error: err?.message || err?.statusMessage || '執行失敗'
    })
    throw err
  }
})
