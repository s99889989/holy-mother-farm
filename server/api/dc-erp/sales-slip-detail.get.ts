// server/api/dc-erp/sales-slip-detail.get.ts
//
// 對應銷貨單明細 Grid 的讀取來源：GET /COAERP/SalesSlip/DetailSource?
// purchaseid={guid}。銷貨單明細 Grid 跟訂貨單共用同一支 SalesGrid.js，
// 這支端點路徑是照 SalesOrder/DetailSource 的命名慣例（前綴換成
// SalesSlip）推斷的，還沒有實測樣本核對過欄位——訂貨單那邊有拿到真實
// DetailSource 回應核對過欄位名稱，這裡先沿用同一組欄位（品項代號/品名/
// 單位/數量/單價/小計/件重/倉庫/課稅別/備註），如果讀出來的明細資料看起來
// 不對，麻煩把這支請求在瀏覽器 Network 的真實 Response 貼給我核對。

export default defineEventHandler(async (event) => {
  const sessionCookie = requireDcUpstreamSession(event)
  const query = getQuery(event)
  const purchaseId = query.purchaseid ? String(query.purchaseid) : ''

  const res = await fetchDcUpstream(
    sessionCookie,
    `/COAERP/SalesSlip/DetailSource?purchaseid=${encodeURIComponent(purchaseId)}`
  )

  let parsed: any
  try {
    parsed = await res.json()
  } catch {
    throw createError({ statusCode: 502, statusMessage: '原網站明細資料格式異常' })
  }

  const rows = Array.isArray(parsed?.data) ? parsed.data : []

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
    taxType: r.TaxType != null ? String(r.TaxType) : '',
    remark: r.Remark || ''
  }))

  return { items, totalCount: parsed?.totalCount ?? items.length }
})
