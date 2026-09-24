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
// 不沿用瀏覽器的 dc_upstream_session cookie（詳見前面幾輪修正的說明，
// 這裡不重複貼）。
//
// 找帳密的順序（automationCredentials.ts 的 resolveAutomationCredentials()）：
// 環境變數優先，沒設定才用「設定」頁存在 Spring Boot 的那組；兩邊都沒設
// 定的話才會是「尚未登入」的錯誤。
//
// 每次執行（不管預覽還是真的跑）都會記一筆執行紀錄到 Spring Boot（見
// automationLog.ts），「設定」頁的「執行紀錄」區塊會顯示。
//
// ⚠️ 最外層包了一層防護網（見最下面的 outer try/catch）：Netlify 的
// 執行環境（AWS Lambda）如果在我們自己的 try/catch 都還沒機會處理之前
// 就整個函式崩潰（例如記憶體不足、模組載入階段就出錯、非同步排程之外
// 的未預期例外），前端看到的會是完全沒有資訊量的
// {"errorType":"Error","errorMessage":"An unknown error has occurred"}，
// 這種情況下我們自己寫的 statusMessage 根本沒機會被送出去。外層防護網
// 至少能把「有沒有執行到這支函式」跟「崩潰前執行到哪裡」的線索留在
// console.error（Netlify 後台「Functions」分頁點進單次呼叫可以看到這些
// log，比前端 Response 內容更完整，如果之後又看到那種空白錯誤，麻煩去
// 那邊翻 log 貼給我）。

async function handleRunCustomer(event: any) {
  console.log(`[dc-erp automation] ${new Date().toISOString()} run-customer 收到請求`)
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
    console.log(`[dc-erp automation] ${new Date().toISOString()} run-customer 開始自動登入`)
    const login = await attemptAutoLogin(creds.account, creds.password)
    console.log(`[dc-erp automation] ${new Date().toISOString()} run-customer 自動登入完成`)
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
}

export default defineEventHandler(async (event) => {
  try {
    return await handleRunCustomer(event)
  } catch (err: any) {
    // 已經是我們自己拋出的、格式正確的錯誤（createError 產生的），直接
    // 原樣往外丟，不要在這裡包一層蓋掉原本的 statusMessage。
    if (err?.statusCode) throw err

    // 走到這裡代表是「沒被預期到」的例外——記完整技術細節到 console.error
    // （Netlify 後台看得到），前端至少也給一個看得懂錯誤類型的訊息，不要
    // 讓 Lambda 自己那個沒有資訊量的保底訊息蓋過去。
    console.error('[dc-erp automation] run-customer 未預期例外：', err)
    const detail = err?.name && err?.message ? `${err.name}: ${err.message}` : String(err)
    throw createError({ statusCode: 500, statusMessage: '執行時發生未預期錯誤：' + detail })
  }
})
