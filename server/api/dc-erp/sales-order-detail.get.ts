// server/api/dc-erp/sales-order-detail.get.ts
//
// 對應原網站訂貨單明細 Grid 的讀取來源：GET /COAERP/SalesOrder/DetailSource?
// purchaseid={guid}。原網站用 ExtJS 的 DynamicJsonReader/DynamicColumnModel，
// 回傳格式是 { fields: [...攔位定義...], data: [...實際資料...] }，欄位定義
// 是伺服器動態決定的（理論上不同單位設定可能不同），但這裡實際抓到一份真實
// 回應後，比對本站（233 使用單位）目前顯示的欄位，固定成下面這組已知欄位，
// 不逐筆轉發原始 fields 定義（我們自己的 Vue 頁面是固定版面，不需要動態欄位）。
//
// purchaseid 可以是空字串（新增訂貨單、還沒有 Guid 時），此時原網站回傳空
// 列表，這裡一樣直接轉發空陣列。
//
// 需要安裝 cheerio：不需要，這支是 JSON API，直接轉發解析後的 JSON。

export default defineEventHandler(async (event) => {
  const sessionCookie = requireDcUpstreamSession(event)
  const query = getQuery(event)
  const purchaseId = query.purchaseid ? String(query.purchaseid) : ''

  const res = await fetchDcUpstream(
    sessionCookie,
    `/COAERP/SalesOrder/DetailSource?purchaseid=${encodeURIComponent(purchaseId)}`
  )

  let parsed: any
  try {
    parsed = await res.json()
  } catch {
    throw createError({ statusCode: 502, statusMessage: '原網站明細資料格式異常' })
  }

  const rows = Array.isArray(parsed?.data) ? parsed.data : []

  // 只挑出我們已知會用到的欄位（比對過真實回應），其餘（DelChk 之類的
  // UI 專用欄位）不轉發。金額/數量類欄位轉成 number，避免前端拿到字串。
  const items = rows.map((r: any) => ({
    guid: r.GUID || '00000000-0000-0000-0000-000000000000',
    titleGuid: r.TitleGUID || '',
    sort: Number(r.Sort) || 0,
    productID: r.ProductID != null ? String(r.ProductID) : '',
    productCode: r.ProductCode || '',
    productName: r.ProductName || '',
    productSpecificationID: r.ProductSpecificationID != null ? String(r.ProductSpecificationID) : '',
    productSpecificationCode: r.ProductSpecificationCode || '',
    correspondNoID: r.CorrespondNoID != null ? String(r.CorrespondNoID) : '0',
    correspondNoCode: r.CorrespondNoCode || '',
    specificationUnitID: r.SpecificationUnitID != null ? String(r.SpecificationUnitID) : '',
    specificationUnitCode: r.SpecificationUnitCode || '',
    specificationUnitName: r.SpecificationUnitName || '',
    warehouseID: r.WarehouseID != null ? String(r.WarehouseID) : '',
    warehouseCode: r.WarehouseCode || '',
    warehouseName: r.WarehouseName || '',
    productLevel: r.ProductLevel || '無',
    originalNum: Number(r.OriginalNum) || 0,
    price: Number(r.Price) || 0,
    weight: Number(r.Weight) || 0,
    originalTotal: Number(r.OriginalTotal) || 0,
    giftWay: r.GiftWay != null ? Number(r.GiftWay) : 1,
    giftPrice: Number(r.GiftPrice) || 0,
    giftNum: Number(r.GiftNum) || 0,
    giftTotal: Number(r.GiftTotal) || 0,
    receiveNum: Number(r.ReceiveNum) || 0,
    num: Number(r.Num) || 0,
    total: Number(r.Total) || 0,
    taxType: r.TaxType != null ? String(r.TaxType) : '',
    remark: r.Remark || '',
    tax: Number(r.Tax) || 0,
    taxExcluded: Number(r.TaxExcluded) || 0,
    receivingState: r.ReceivingState != null ? Number(r.ReceivingState) : null
  }))

  return { items, totalCount: parsed?.totalCount ?? items.length }
})
