// server/api/dc-erp/sales-order.post.ts
//
// 訂貨單「儲存」動作，整合原網站分成兩段的儲存流程：
//   1. 明細：AJAX POST 到 /COAERP/SalesOrder/DetailSave（帶 jsonstring 明細
//      陣列 + purchaseid + workplaceid + firmid），刪除的列另外 POST
//      /COAERP/SalesOrder/DetailDelete
//   2. 表頭：正常表單 POST 到 /COAERP/SalesOrder/Create（新增）或
//      /COAERP/SalesOrder/Edit/{guid}（編輯）
//
// 順序跟原網站前端（SalesOrderModify.js 的 SaveSubmit()）一致：**先存明細、
// 後存表頭**。之前這裡刻意反過來（先存表頭），是因為當時沒看到「新增訂貨單
// 時明細怎麼存到一個還不存在的表頭」這一步的真實 Network 記錄，怕存錯改用
// 猜測的順序——後來拿到使用者直接在原網站測試存檔時的真實 DetailSave 請求，
// 證實新增訂貨單時 purchaseid 跟 TitleGUID 都是傳空字串，原網站後端顯然是
// 依這個空字串自己建立表頭草稿（session 追蹤），所以改回原網站真正的順序：
// 先存明細（新增時 purchaseid 傳空字串，編輯時傳已知的 guidIn），再送表頭。
// 這樣新增訂貨單再也不需要「猜表頭存檔後導去哪裡撈新 Guid」這種不可靠的
// 步驟——表頭 POST 之後如果抓不到新 Guid，也只是前端沒辦法馬上導去編輯頁
// 而已，明細已經確定存進去了，不是空的。
//
// 明細列 JSON 每個欄位名稱是照這份真實 DetailSave payload 核對過的（比先前
// 從 SalesOrderModify.js 反推的欄位定義多了一個 SaveDays 欄位，已經補上）。
//
// 金額/稅金相關欄位（Num／ReceiveNum／Total／Tax／TaxExcluded／OriginalTotal）
// 不相信前端算好的值，這裡依 SalesOrderModify.js 的
// CalculateRowReceiveNum／CalculateRowTax 公式在伺服器端重新算一次——只支援
// 「搭贈方式：無」（GiftWay=1，本站畫面上這幾個搭贈欄位本來就是 hidden，
// 幾乎不會用到），如果之後需要搭贈功能要再另外處理。
//
// 需要安裝 cheerio：不需要（除非表頭儲存失敗要把驗證錯誤訊息從 HTML 撈
// 出來，或表頭存檔成功後想順便找出新 Guid 才會用到）。

import { load } from 'cheerio'

interface DetailInput {
  guid?: string
  productID: string
  productCode: string
  productName: string
  productSpecificationID?: string
  productSpecificationCode?: string
  correspondNoID?: string
  correspondNoCode?: string
  specificationUnitID: string
  specificationUnitCode: string
  specificationUnitName: string
  warehouseID: string
  warehouseCode: string
  warehouseName: string
  productLevel?: string
  originalNum: number
  price: number
  weight?: number
  taxType: string
  remark?: string
}

export default defineEventHandler(async (event) => {
  const sessionCookie = requireDcUpstreamSession(event)
  const body = await readBody(event)

  const guidIn = body.guid ? String(body.guid) : ''
  const workPlaceID = body.workPlaceID ? String(body.workPlaceID) : ''
  const firmID = body.firmID ? String(body.firmID) : ''
  const taxInputType = body.taxInputType ? String(body.taxInputType) : '1'
  const details: DetailInput[] = Array.isArray(body.details) ? body.details : []
  const deletedGuids: string[] = Array.isArray(body.deletedGuids) ? body.deletedGuids : []

  if (!workPlaceID || workPlaceID === '0') {
    throw createError({ statusCode: 400, statusMessage: '請選擇場別' })
  }
  if (!firmID || firmID === '0') {
    throw createError({ statusCode: 400, statusMessage: '請輸入客戶' })
  }

  // ---------- 第一步：刪除明細列 ----------
  if (deletedGuids.length) {
    await fetchDcUpstream(sessionCookie, '/COAERP/SalesOrder/DetailDelete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ ids: deletedGuids.join(',') }).toString()
    })
  }

  // ---------- 第二步：儲存明細列（新增訂貨單時 purchaseid 傳空字串） ----------
  if (details.length) {
    const taxTypeIsTaxed = (t: string) => t === '4' // 4 = 應稅（比對 TaxTypeList 選項）

    const rows = details.map((d, idx) => {
      const originalNum = Number(d.originalNum) || 0
      const price = Number(d.price) || 0
      // 無搭贈（GiftWay=1）：實出量=數量、對帳量=數量、小計=數量*單價、
      // 對帳金額=對帳量*單價 —— 比對 CalculateRowReceiveNum / CalculateRowTax。
      const num = originalNum
      const receiveNum = originalNum
      const originalTotal = originalNum * price
      const total = receiveNum * price
      let tax = 0
      let taxExcluded = total
      if (taxTypeIsTaxed(String(d.taxType))) {
        if (taxInputType === '1') { // 內含
          tax = total - total / 1.05
          taxExcluded = total - tax
        } else { // 外加
          tax = total * 0.05
          taxExcluded = total
        }
      }

      return {
        GUID: d.guid && d.guid !== '' ? d.guid : '00000000-0000-0000-0000-000000000000',
        TitleGUID: guidIn, // 新增時是空字串，編輯時是已知的訂貨單 Guid
        Sort: idx + 1,
        ProductID: d.productID,
        ProductCode: d.productCode,
        ProductName: d.productName,
        ProductSpecificationID: d.productSpecificationID || '',
        ProductSpecificationCode: d.productSpecificationCode || '',
        CorrespondNoID: d.correspondNoID || '0',
        CorrespondNoCode: d.correspondNoCode || '',
        SpecificationUnitID: d.specificationUnitID,
        SpecificationUnitCode: d.specificationUnitCode,
        SpecificationUnitName: d.specificationUnitName,
        ProductLevel: d.productLevel || '無',
        Num: num,
        Price: price,
        Total: total,
        GiftPrice: price,
        GiftWay: 1,
        GiftNum: 0,
        GiftTotal: 0,
        WarehouseID: d.warehouseID,
        WarehouseCode: d.warehouseCode,
        WarehouseName: d.warehouseName,
        TaxType: d.taxType,
        Tax: Math.round(tax * 100) / 100,
        TaxExcluded: Math.round(taxExcluded * 100) / 100,
        WasteNum: 0,
        LossNum: 0,
        ReceiveNum: receiveNum,
        OriginalNum: originalNum,
        OriginalTotal: originalTotal,
        ShipperPersonal: '',
        Discount: 0,
        DiscountPrice: price,
        Cost: 0,
        Fees: 0,
        TemperatureLevel: 3,
        Weight: d.weight || 0,
        DriverName: '',
        SaveDays: 99999,
        Remark: d.remark || ''
      }
    })

    const detailBody = 'jsonstring=' + encodeURIComponent(JSON.stringify(rows)) +
      '&purchaseid=' + encodeURIComponent(guidIn) +
      '&workplaceid=' + encodeURIComponent(workPlaceID) +
      '&firmid=' + encodeURIComponent(firmID)

    const detailRes = await fetchDcUpstream(sessionCookie, '/COAERP/SalesOrder/DetailSave', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: detailBody
    })

    const detailMessage = (await detailRes.text()).trim()
    if (detailMessage) {
      throw createError({
        statusCode: 422,
        statusMessage: `明細儲存失敗，表頭尚未送出：${detailMessage}`
      })
    }
  }

  // ---------- 第三步：表頭 ----------
  const headerBody = new URLSearchParams({
    Guid: guidIn,
    DocumentCode: 'SalesOrder',
    IsEditPayee: 'True',
    PriceType: '1',
    Code: body.code ? String(body.code) : '',
    WorkPlaceID: workPlaceID,
    PrimaryDate: body.primaryDate ? String(body.primaryDate) : '',
    ReceivingDate: body.receivingDate ? String(body.receivingDate) : '',
    FirmID: firmID,
    FirmCode: body.firmCode ? String(body.firmCode) : '',
    FirmName: body.firmName ? String(body.firmName) : '',
    FirmCodeTextBox: body.firmCode ? String(body.firmCode) : '',
    PurchaseDept: body.purchaseDept ? String(body.purchaseDept) : '',
    PayeeID: firmID, // 原網站「收款對象」欄位預設等同客戶，本站畫面上此區塊是 display:none
    PayeeCode: body.firmCode ? String(body.firmCode) : '',
    PayeeName: body.firmName ? String(body.firmName) : '',
    Type: body.type ? String(body.type) : '1',
    CustomerDocCode: body.customerDocCode ? String(body.customerDocCode) : '',
    Address: body.address ? String(body.address) : '',
    PayWay: body.payWay ? String(body.payWay) : '1',
    TaxInputType: taxInputType,
    Currency: '新台幣',
    CurrencyRate: '1',
    ReceiptType: body.receiptType ? String(body.receiptType) : '1',
    ReceiptMode: body.receiptMode ? String(body.receiptMode) : '1',
    Remark: body.remark ? String(body.remark) : '',
    OperatorID: body.operatorID ? String(body.operatorID) : '',
    OperatorCode: body.operatorCode ? String(body.operatorCode) : '',
    DeliveryCompnay: body.deliveryCompany ? String(body.deliveryCompany) : '黑貓宅急便',
    DeliveryPeriod: body.deliveryPeriod ? String(body.deliveryPeriod) : '1',
    TemperatureLevel: body.temperatureLevel ? String(body.temperatureLevel) : '1',
    DeliveryPersonal: body.deliveryPersonal ? String(body.deliveryPersonal) : '',
    DeliveryAddress: body.deliveryAddress ? String(body.deliveryAddress) : '',
    DeliveryCellPhone: body.deliveryCellPhone ? String(body.deliveryCellPhone) : '',
    DeliveryTelPhone: body.deliveryTelPhone ? String(body.deliveryTelPhone) : '',
    DeliveryRemark: body.deliveryRemark ? String(body.deliveryRemark) : '',
    Number: body.number ? String(body.number) : '0',
    CollectionMoney: '0'
  })

  const headerPath = guidIn
    ? `/COAERP/SalesOrder/Edit/${encodeURIComponent(guidIn)}`
    : '/COAERP/SalesOrder/Create'

  const headerRes = await fetchDcUpstream(sessionCookie, headerPath, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: headerBody.toString()
  })

  if (!(headerRes.status >= 300 && headerRes.status < 400)) {
    // 沒有導頁，通常代表原網站表單驗證失敗、把同一頁連錯誤訊息一起吐回來。
    // 注意：明細這時候已經確定存進去了（第二步已經成功），只是表頭這次沒
    // 存成功，不是整張單都沒存到。
    const html = await headerRes.text()
    const $ = load(html)
    const errMsg = $('.sys-message').text().trim() || $('.field-validation-error').first().text().trim()
    throw createError({
      statusCode: 422,
      statusMessage: errMsg || '明細已儲存，但表頭儲存失敗（原網站沒有回傳導頁，可能是必填欄位驗證沒過），請重新整理後確認'
    })
  }

  // 表頭存檔成功，接著盡量把確定的 Guid 撈出來給前端導頁用——這步只是為了
  // UX（讓使用者存完能直接停在編輯頁），不是為了確認資料有沒有存到，資料
  // 前面兩步已經確定存進去了，這裡就算抓不到 Guid 也不是失敗。
  let confirmedGuid = guidIn
  if (!confirmedGuid) {
    const location = headerRes.headers.get('location') || ''
    const quickMatch = location.match(/[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/)
    if (quickMatch) {
      confirmedGuid = quickMatch[0]
    } else if (location) {
      try {
        const u = new URL(location, DC_ORIGIN)
        const followRes = await fetchDcUpstream(sessionCookie, u.pathname + u.search)
        const followHtml = await followRes.text()
        const $$ = load(followHtml)
        const followedGuid = $$('#Guid').attr('value')
        if (followedGuid) confirmedGuid = followedGuid
      } catch {
        // 跟過去失敗就算了，反正不影響資料有沒有存到
      }
    }
    if (!confirmedGuid) {
      try {
        const listRes = await fetchDcUpstream(sessionCookie, '/COAERP/SalesOrder/index')
        const listHtml = await listRes.text()
        const $$ = load(listHtml)
        const $firstRow = $$('#TableList tr').eq(1)
        const $tds = $firstRow.find('td')
        const editHref = $tds.eq(2).find('a').attr('href') || ''
        const rowGuidMatch = editHref.match(/Edit\/([0-9a-fA-F-]{36})/)
        const candidateGuid = rowGuidMatch ? rowGuidMatch[1] : ''
        const candidateFirmName = $tds.eq(6).text().trim()
        const candidateRemark = $tds.eq(12).text().trim()
        const expectedRemark = body.remark ? String(body.remark).trim() : ''
        const matches = expectedRemark
          ? candidateRemark === expectedRemark
          : candidateFirmName.includes(String(body.firmName || '').trim())
        if (candidateGuid && matches) confirmedGuid = candidateGuid
      } catch {
        // 查列表也失敗就算了
      }
    }
  }

  return { success: true, guid: confirmedGuid || null }
})

