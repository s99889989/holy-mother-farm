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
// 登入方式：跟 run-scheduled.post.ts 一樣，每次都無條件重新自動登入，
// 不沿用瀏覽器的 dc_upstream_session cookie。
//
// 這是修過一輪的結果，記錄一下走過的彎路：一開始的寫法是「先看瀏覽器有
// 沒有 cookie，有就直接拿來用」，這會在 cookie 過期（COAERP session 存
// 活 2 小時）時整段跑到最後才噴出「登入已過期」；改成「先試舊 cookie，
// 過期了再重新登入重跑一次」之後，等於最壞情況要「跑一次失敗＋完整重新
// 登入（含驗證碼最多 3 次）＋再跑一次」，反而把整條流程拖到超過 Netlify
// 的執行時間上限，變成另一種逾時失敗。排程那條路（run-scheduled.post.ts）
// 因為本來就是每次無條件重新登入、不會有「先試註定失敗的舊 cookie」這段
// 浪費時間的步驟，反而一直穩定——所以這裡直接比照排程的做法，兩條路徑
// 徹底一致，不再有「立即執行」獨有的過期/重試問題。
//
// 找帳密的順序（automationCredentials.ts 的 resolveAutomationCredentials()）：
// 環境變數優先，沒設定才用「設定」頁存在 Spring Boot 的那組；兩邊都沒設
// 定的話才會是「尚未登入」的錯誤。
//
// 每次執行（不管預覽還是真的跑）都會記一筆執行紀錄到 Spring Boot（見
// automationLog.ts），「設定」頁的「執行紀錄」區塊會顯示。

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

  const creds = await resolveAutomationCredentials()
  if (!creds) {
    throw createError({
      statusCode: 401,
      statusMessage: '未設定自動登入帳密（環境變數 DC_ERP_AUTO_ACCOUNT/PASSWORD 或「設定」頁的自動登入帳密）'
    })
  }

  let sessionCookie: string
  try {
    const login = await attemptAutoLogin(creds.account, creds.password)
    sessionCookie = login.sessionCookie
    // 順便設成 cookie，純粹是為了如果你之後手動在瀏覽器操作 dc-erp 其他
    // 頁面時能沿用這組 session，不用再手動登入一次；這支路由本身不會讀
    // 這個 cookie。
    setCookie(event, 'dc_upstream_session', sessionCookie, {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      maxAge: 60 * 60 * 2,
      path: '/'
    })
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
      error: '自動登入失敗：' + (err?.message || '')
    })
    throw createError({ statusCode: 502, statusMessage: '自動登入失敗：' + (err?.message || '') })
  }

  try {
    const result = await runCustomerPipeline(sessionCookie, firmCode, dryRun, remarkKeyword, printEnabled)
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
