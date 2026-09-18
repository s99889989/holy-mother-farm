// server/api/dc-erp/automation/run-customer.post.ts
//
// 自動化執行入口：settings.vue「預覽」／「立即執行」按鈕打這支。
//
// body: { firmCode: string, dryRun?: boolean }
//   dryRun=true  只查「目前有哪些未簽核的訂貨單」，不簽核也不轉銷——先
//                確認篩到的單是不是你要的，再放心按「立即執行」。
//   dryRun=false 實際跑：簽核 → 重查可轉銷狀態 → 逐筆轉銷 → 在銷貨單找
//                對應單 → 下載「中一刀-半長」PDF。任一筆訂單中途失敗不會
//                中斷其他筆，每一步的成敗都記在回傳的 results 裡。
//
// 目前只能手動觸發：見 automation.ts 開頭「重要限制」說明（COAERP 登入要
// 人工輸入圖形驗證碼，這裡沒有自動登入能力，還做不到真排程）。

export default defineEventHandler(async (event) => {
  const sessionCookie = requireDcUpstreamSession(event)
  const body = await readBody(event)
  const firmCode = body?.firmCode ? String(body.firmCode).trim() : ''
  const dryRun = !!body?.dryRun

  if (!firmCode) {
    throw createError({ statusCode: 400, statusMessage: '缺少客戶代號' })
  }

  const targetOrders = await findUnsignedOrders(sessionCookie, firmCode)

  if (dryRun) {
    return {
      dryRun: true,
      matchedCount: targetOrders.length,
      orders: targetOrders.map((o) => ({
        code: o.code,
        deliveryDate: o.deliveryDate,
        firmName: o.firmName,
        total: o.total
      }))
    }
  }

  if (!targetOrders.length) {
    return { dryRun: false, matchedCount: 0, results: [] }
  }

  const results = targetOrders.map((o) => ({
    code: o.code,
    firmName: o.firmName,
    deliveryDate: o.deliveryDate,
    total: o.total,
    signOk: false,
    transferOk: false,
    matchedSlipCode: '',
    printOk: false,
    fileName: '',
    transferError: '',
    printError: ''
  }))

  // 一次批次簽核所有未簽核的單（跟 sales-orders.vue 的「簽核並轉銷」同一套
  // 呼叫方式）。簽核本身失敗就整批中止，不逐筆嘗試轉銷。
  try {
    await signOrders(sessionCookie, targetOrders.map((o) => o.guid))
    results.forEach((r) => { r.signOk = true })
  } catch (err: any) {
    results.forEach((r) => { r.transferError = '簽核失敗，未進行轉銷：' + (err?.message || '') })
    return { dryRun: false, matchedCount: targetOrders.length, results }
  }

  const transferableGuids = await refetchTransferableGuids(
    sessionCookie,
    firmCode,
    targetOrders.map((o) => o.guid)
  )

  let printFmt: PrintStyleFormat | null = null

  for (let i = 0; i < targetOrders.length; i++) {
    const order = targetOrders[i]
    const result = results[i]

    if (!transferableGuids.has(order.guid)) {
      result.transferError = '簽核後目前不符合轉銷條件（原網站規則不完全確定，不是單純已核准就會顯示），已略過'
      continue
    }

    try {
      await transferOrder(sessionCookie, order.guid)
      result.transferOk = true
    } catch (err: any) {
      result.transferError = err?.message || '轉入銷貨單失敗'
      continue
    }

    const slip = await findMatchingSlip(sessionCookie, firmCode, order)
    if (!slip) {
      result.transferError = '已轉銷，但在銷貨單列表找不到「唯一」符合的對應單，請自行到銷貨單核對並手動列印'
      continue
    }
    result.matchedSlipCode = slip.code

    try {
      if (!printFmt) printFmt = await findMatchingPrintFormat(sessionCookie)
      const saved = await downloadSlipPdf(sessionCookie, slip.guid, printFmt, `${order.code}_${slip.code}`)
      result.printOk = true
      result.fileName = saved.fileName
    } catch (err: any) {
      result.printError = err?.message || 'PDF 下載失敗'
    }
  }

  return { dryRun: false, matchedCount: targetOrders.length, results }
})
