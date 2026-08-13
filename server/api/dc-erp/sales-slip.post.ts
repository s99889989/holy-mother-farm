// server/api/dc-erp/sales-slip.post.ts
//
// 銷貨單「儲存」動作，架構完全比照 sales-order.post.ts（先存明細、後存
// 表頭，新增時明細的 purchaseid/TitleGUID 傳空字串），只是路徑前綴換成
// SalesSlip。DetailSave/DetailDelete 的路徑跟明細列 JSON 欄位名稱是依訂貨單
// 那邊已經核對過真實 Payload 的結果類推過來的（銷貨單明細 Grid 跟訂貨單共用
// 同一支 SalesGrid.js），沒有另外針對銷貨單實測核對過，如果存檔後金額或
// 明細不對，麻煩比照訂貨單那次的方式，直接在原網站按一次「儲存」，把
// DetailSave 那筆請求的真實 Payload 貼給我核對。
//
// 銷貨單編輯頁存檔前會先呼叫 JudgeOffsetRecord/{guid} 檢查有沒有沖銷記錄
// （原網站 FormSave() 的邏輯：有沖銷記錄不能存檔），這裡也照做——但只在
// 編輯模式（guidIn 非空）才檢查，新增時還沒有 guid，跳過這一步。
//
// 需要安裝 cheerio：只有表頭儲存失敗要把驗證錯誤訊息從 HTML 撈出來才用到。

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

  // ---------- 第零步：沖銷記錄檢查（只有編輯既有單據時才做） ----------
  if (guidIn) {
    const judgeRes = await fetchDcUpstream(sessionCookie, `/COAERP/SalesSlip/JudgeOffsetRecord/${encodeURIComponent(guidIn)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: ''
    })
    const judgeText = (await judgeRes.text()).trim()
    if (judgeText !== 'OK') {
      throw createError({ statusCode: 422, statusMessage: judgeText || '此銷貨單已有沖銷記錄，無法儲存' })
    }
  }

  // ---------- 第一步：刪除明細列 ----------
  if (deletedGuids.length) {
    await fetchDcUpstream(sessionCookie, '/COAERP/SalesSlip/DetailDelete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ ids: deletedGuids.join(',') }).toString()
    })
  }

  // ---------- 第二步：儲存明細列（新增時 purchaseid 傳空字串） ----------
  if (details.length) {
    const taxTypeIsTaxed = (t: string) => t === '4'

    const rows = details.map((d, idx) => {
      const originalNum = Number(d.originalNum) || 0
      const price = Number(d.price) || 0
      const num = originalNum
      const receiveNum = originalNum
      const originalTotal = originalNum * price
      const total = receiveNum * price
      let tax = 0
      let taxExcluded = total
      if (taxTypeIsTaxed(String(d.taxType))) {
        if (taxInputType === '1') {
          tax = total - total / 1.05
          taxExcluded = total - tax
        } else {
          tax = total * 0.05
          taxExcluded = total
        }
      }

      return {
        GUID: d.guid && d.guid !== '' ? d.guid : '00000000-0000-0000-0000-000000000000',
        TitleGUID: guidIn,
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

    const detailRes = await fetchDcUpstream(sessionCookie, '/COAERP/SalesSlip/DetailSave', {
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
    DocumentCode: 'SalesSlip',
    IsEditPayee: 'False',
    PriceType: '1',
    Code: body.code ? String(body.code) : '',
    WorkPlaceID: workPlaceID,
    PrimaryDate: body.primaryDate ? String(body.primaryDate) : '',
    Type: body.type ? String(body.type) : '1',
    FirmID: firmID,
    FirmCode: body.firmCode ? String(body.firmCode) : '',
    FirmName: body.firmName ? String(body.firmName) : '',
    FirmCodeTextBox: body.firmCode ? String(body.firmCode) : '',
    PayeeID: firmID,
    PayeeCode: body.firmCode ? String(body.firmCode) : '',
    PayeeName: body.firmName ? String(body.firmName) : '',
    RelationCode: body.relationCode ? String(body.relationCode) : '',
    IsFinish: 'true',
    Address: body.address ? String(body.address) : '',
    PayWay: body.payWay ? String(body.payWay) : '1',
    TaxInputType: taxInputType,
    Currency: '新台幣',
    CurrencyRate: '1',
    Remark: body.remark ? String(body.remark) : '',
    OperatorID: body.operatorID ? String(body.operatorID) : '',
    OperatorCode: body.operatorCode ? String(body.operatorCode) : ''
  })

  const headerPath = guidIn
    ? `/COAERP/SalesSlip/Edit/${encodeURIComponent(guidIn)}`
    : '/COAERP/SalesSlip/Create'

  const headerRes = await fetchDcUpstream(sessionCookie, headerPath, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: headerBody.toString()
  })

  if (!(headerRes.status >= 300 && headerRes.status < 400)) {
    const html = await headerRes.text()
    const $ = load(html)
    const errMsg = $('.sys-message').text().trim() || $('.field-validation-error').first().text().trim()
    throw createError({
      statusCode: 422,
      statusMessage: errMsg || '明細已儲存，但表頭儲存失敗（原網站沒有回傳導頁，可能是必填欄位驗證沒過），請重新整理後確認'
    })
  }

  // 盡量撈出確定的 Guid，抓不到不算失敗（明細跟表頭都已經確定存進去了）。
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
        // 跟過去失敗就算了
      }
    }
    if (!confirmedGuid) {
      try {
        const listRes = await fetchDcUpstream(sessionCookie, '/COAERP/SalesSlip/index')
        const listHtml = await listRes.text()
        const $$ = load(listHtml)
        const $firstRow = $$('#TableList tr').eq(1)
        const $tds = $firstRow.find('td')
        const editHref = $tds.eq(2).find('a').attr('href') || ''
        const rowGuidMatch = editHref.match(/Edit\/([0-9a-fA-F-]{36})/)
        const candidateGuid = rowGuidMatch ? rowGuidMatch[1] : ''
        const candidateFirmName = $tds.eq(4).text().trim()
        const candidateRemark = $tds.eq(14).text().trim()
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
