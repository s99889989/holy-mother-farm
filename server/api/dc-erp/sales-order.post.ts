// server/api/dc-erp/sales-order.post.ts
//
// 訂貨單「儲存」動作，整合原網站分成兩段的儲存流程：
//   1. 表頭：正常表單 POST 到 /COAERP/SalesOrder/Create（新增）或
//      /COAERP/SalesOrder/Edit/{guid}（編輯）
//   2. 明細：AJAX POST 到 /COAERP/SalesOrder/DetailSave（帶 jsonstring 明細
//      陣列 + purchaseid + workplaceid + firmid），刪除的列另外 POST
//      /COAERP/SalesOrder/DetailDelete
//
// 原網站前端（SalesOrderModify.js 的 SaveSubmit()）是先存明細、成功後才送出
// 表頭表單（GoIndexOrAddAfterSave）。這裡刻意反過來：**先確保表頭存在且拿到
// 確定的 Guid，才動明細**——尤其新增訂貨單時，原本表頭 Guid 是空字串，我們
// 沒有看到「明細存到一個還不存在的表頭」這一步原網站實際上怎麼處理（沒有
// 對應的 Network 記錄可以核對），與其照抄有風險的流程，不如反過來：表頭先
// 存檔問到真正的 Guid，明細一定接在一個已確定存在的訂貨單底下，邏輯上更
// 站得住腳，也比較好排查問題。
//
// 金額/稅金相關欄位（Num／ReceiveNum／Total／Tax／TaxExcluded／OriginalTotal）
// 不相信前端算好的值，這裡依 SalesOrderModify.js 的
// CalculateRowReceiveNum／CalculateRowTax 公式在伺服器端重新算一次——只支援
// 「搭贈方式：無」（GiftWay=1，本站畫面上這幾個搭贈欄位本來就是 hidden，
// 幾乎不會用到），如果之後需要搭贈功能要再另外處理。
//
// 需要安裝 cheerio：不需要，這支只送表單/JSON，不解析 HTML（除非表頭儲存
// 失敗要把錯誤訊息撈出來）。

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

  // ---------- 第一步：表頭 ----------
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

  let confirmedGuid = guidIn

  if (headerRes.status >= 300 && headerRes.status < 400) {
    // 成功：原網站存檔後會導頁。新增時導去 Edit/{新Guid}，把新 Guid 撈出來；
    // 編輯時導去的網址不一定含 Guid，沿用原本傳進來的 guidIn。
    const location = headerRes.headers.get('location') || ''
    const guidMatch = location.match(/Edit\/([0-9a-fA-F-]{36})/)
    if (guidMatch) confirmedGuid = guidMatch[1]
  } else {
    // 沒有導頁，通常代表原網站表單驗證失敗、把同一頁連錯誤訊息一起吐回來。
    const html = await headerRes.text()
    const $ = load(html)
    const errMsg = $('.sys-message').text().trim() || $('.field-validation-error').first().text().trim()
    throw createError({
      statusCode: 422,
      statusMessage: errMsg || '訂貨單表頭儲存失敗，原網站沒有回傳導頁，可能是必填欄位驗證沒過'
    })
  }

  if (!confirmedGuid) {
    throw createError({ statusCode: 500, statusMessage: '表頭已送出但無法確認訂貨單 Guid，明細未儲存，請重新整理後確認訂貨單是否已建立' })
  }

  // ---------- 第二步：刪除明細列 ----------
  if (deletedGuids.length) {
    await fetchDcUpstream(sessionCookie, '/COAERP/SalesOrder/DetailDelete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ ids: deletedGuids.join(',') }).toString()
    })
  }

  // ---------- 第三步：儲存明細列 ----------
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
        TitleGUID: confirmedGuid,
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
        Remark: d.remark || ''
      }
    })

    const detailBody = 'jsonstring=' + encodeURIComponent(JSON.stringify(rows)) +
      '&purchaseid=' + encodeURIComponent(confirmedGuid) +
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
        statusMessage: `表頭已儲存（訂貨單號：${confirmedGuid}），但明細儲存失敗：${detailMessage}`
      })
    }
  }

  return { success: true, guid: confirmedGuid }
})
