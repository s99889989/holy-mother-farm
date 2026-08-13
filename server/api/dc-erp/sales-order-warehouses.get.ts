// server/api/dc-erp/sales-order-warehouses.get.ts
//
// 明細列「倉庫」欄位的下拉選項來源，對應 SalesGrid.js 的 Warehousecombo_Store
// （url: WarehouseAjax/GetAllSelectListExt，帶 workplaceid 參數）。
// 商品搜尋燈箱選商品時已經會帶一個預設倉庫（GetMultipleProdSpecInfoByProdSpecId2
// 回傳的 WarehouseID/Code/Name），這支 API 是讓使用者事後在明細列上「改」
// 倉庫用的下拉選項。

export default defineEventHandler(async (event) => {
  const sessionCookie = requireDcUpstreamSession(event)
  const query = getQuery(event)
  const workPlaceId = query.workPlaceId ? String(query.workPlaceId) : ''

  if (!workPlaceId || workPlaceId === '0') {
    throw createError({ statusCode: 400, statusMessage: '請先選擇場別' })
  }

  const res = await fetchDcUpstream(
    sessionCookie,
    `/COAERP/WarehouseAjax/GetAllSelectListExt?workplaceid=${encodeURIComponent(workPlaceId)}`
  )

  let json: any
  try {
    json = await res.json()
  } catch {
    throw createError({ statusCode: 502, statusMessage: '原網站倉庫資料格式異常' })
  }

  const rows = Array.isArray(json?.data) ? json.data : (Array.isArray(json) ? json : [])

  const items = rows.map((w: any) => ({
    id: w.id != null ? String(w.id) : '',
    code: w.code || '',
    name: w.name || ''
  }))

  return { items }
})
