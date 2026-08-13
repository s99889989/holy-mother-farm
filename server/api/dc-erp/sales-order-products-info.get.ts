// server/api/dc-erp/sales-order-products-info.get.ts
//
// 對應原網站商品搜尋燈箱按下「確認選取」時呼叫的
// /COAERP/ProductAjax/GetMultipleProdSpecInfoByProdSpecId2，依選取的商品
// 規格 ID（可多筆，逗號分隔）取得完整資訊（品名/單位/單價/倉庫/課稅別/
// 件重…），對應到 SalesGrid.js 的 ProdListMultipleCallBack() 怎麼用這份
// 資料組明細列——欄位名稱是照那支函式裡讀取 ProdJson.XXX 的寫法對應過來的
// （ProductID/ProductCode/ProductName/ID/Code/UnitID/UnitCode/UnitName/
// Price/WarehouseID/WarehouseCode/WarehouseName/TaxType/ProductWeight/
// CorrespondNoID/CorrespondNoCode），沒有其他真實回應樣本可以核對，如果
// 欄位對不上，前端會直接看到空值/NaN，不會是抓錯資料。

export default defineEventHandler(async (event) => {
  const sessionCookie = requireDcUpstreamSession(event)
  const query = getQuery(event)

  const ids = query.ids ? String(query.ids) : ''
  const firmId = query.firmId ? String(query.firmId) : ''
  const workPlaceId = query.workPlaceId ? String(query.workPlaceId) : ''
  const selectDate = query.selectDate ? String(query.selectDate) : ''

  if (!ids) {
    throw createError({ statusCode: 400, statusMessage: '缺少商品規格 ID' })
  }

  const qs = new URLSearchParams({
    multipleprodspecid: ids,
    firmid: firmId,
    firmtype: '4',
    selectdate: selectDate,
    workplaceid: workPlaceId
  })

  const res = await fetchDcUpstream(
    sessionCookie,
    `/COAERP/ProductAjax/GetMultipleProdSpecInfoByProdSpecId2?${qs.toString()}`
  )

  let data: any
  try {
    data = await res.json()
  } catch {
    throw createError({ statusCode: 502, statusMessage: '原網站商品資訊格式異常' })
  }

  const rows = Array.isArray(data) ? data : (Array.isArray(data?.Data) ? data.Data : [])

  const items = rows.map((p: any) => ({
    productID: p.ProductID != null ? String(p.ProductID) : '',
    productCode: p.ProductCode || '',
    productName: p.ProductName || '',
    productSpecificationID: p.ID != null ? String(p.ID) : '',
    productSpecificationCode: p.Code || '',
    correspondNoID: p.CorrespondNoID != null && p.CorrespondNoID !== '' ? String(p.CorrespondNoID) : '0',
    correspondNoCode: p.CorrespondNoCode || '',
    unitID: p.UnitID != null ? String(p.UnitID) : '',
    unitCode: p.UnitCode || '',
    unitName: p.UnitName || '',
    price: Number(p.Price) || 0,
    warehouseID: p.WarehouseID != null ? String(p.WarehouseID) : '',
    warehouseCode: p.WarehouseCode || '',
    warehouseName: p.WarehouseName || '',
    taxType: p.TaxType != null ? String(p.TaxType) : '',
    weight: Number(p.ProductWeight) || 0
  }))

  return { items }
})
