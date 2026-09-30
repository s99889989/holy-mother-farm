// server/api/dc-erp/sales-slip-detail.get.ts
//
// 對應銷貨單明細 Grid 的讀取來源：GET /COAERP/SalesSlip/DetailSource?
// purchaseid={guid}。欄位名稱已用使用者提供的真實 DetailSource 回應核對過
// （2026/09，銷貨單 115093086633 與 11509282 轉出的銷貨單）。
//
// 【重要】「訂貨單關聯」欄位：
// 從訂貨單轉銷出來的銷貨單，每一列明細都帶著指回訂貨單的關聯欄位：
//   - SalesOrderGUID        訂貨單表頭 GUID
//   - SalesOrderDetailsGUID 訂貨單「那一列明細」的 GUID（原網站靠這個判斷
//                           訂貨單那一列出貨了沒，斷掉的話訂貨單就會重新出現「轉銷」）
//   - SalesOrderCode        訂貨單號
//   - SalesOrderNum         訂貨單原本的數量（原網站用來把跟訂貨單不同的數量標紅字）
//   - SalesOrderProduct     訂貨單全部品項 ID（逗號分隔）
// 之前這支沒有把它們傳給前端，存檔時也就沒送回去，導致在本站改過銷貨單
// 明細再存檔後，原網站把這些列當成手動新增、跟訂貨單斷開。現在一律原樣
// 帶出，存檔時原樣送回（見 sales-slip.post.ts）。
//
// 另外銷貨單明細有一些本站畫面沒有編輯、但原網站有值的欄位（溫層、損耗量、
// 遺失量、出貨人、司機、相關費用、保存天數、製造日期、其他款項…），之前
// 存檔時會被蓋成固定預設值（例如溫層一律變 3）。現在放進 extra 原樣帶出、
// 存檔時原樣送回，本站沒有編輯的欄位就不會被改掉。

// 本站畫面沒有編輯、但存檔時要原樣送回的欄位
const PASSTHROUGH_FIELDS = [
  'WasteNum',
  'WasteReason',
  'LossNum',
  'LossReason',
  'TemperatureLevel',
  'ShipperPersonal',
  'Fees',
  'TraceabilityCode',
  'PurchaseReceivingJSON',
  'PurchaseReceivingCode',
  'OtherFunds1',
  'OtherFunds2',
  'OtherFunds3',
  'OtherFunds4',
  'OtherFunds5',
  'OtherFunds6',
  'OtherFunds7',
  'OtherFunds8',
  'OtherFunds9',
  'OtherFunds10',
  'DriverName',
  'MakeDate',
  'SaveDays'
]

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

  const items = rows.map((r: any) => {
    const extra: Record<string, any> = {}
    for (const key of PASSTHROUGH_FIELDS) {
      if (key in r) extra[key] = r[key]
    }

    return {
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
      remark: r.Remark || '',

      // 訂貨單關聯（沒有關聯時原網站回 null / "" / 0，這裡統一成 null / '' / 0）
      salesOrderGUID: r.SalesOrderGUID || null,
      salesOrderDetailsGUID: r.SalesOrderDetailsGUID || null,
      salesOrderCode: r.SalesOrderCode || null,
      salesOrderNum: Number(r.SalesOrderNum) || 0,
      salesOrderProduct: r.SalesOrderProduct || '',

      extra
    }
  })

  return { items, totalCount: parsed?.totalCount ?? items.length }
})
