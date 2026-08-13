// server/api/dc-erp/sales-order-firm.get.ts
//
// 訂貨單表頭「客戶」欄位：原網站是用燈箱（thickbox）選客戶，選完後透過
// 同頁 JS 回填 FirmID/FirmCode/FirmName。我們沒有拿到那個客戶選擇燈箱頁面
// 本身的內容，所以先不重做那個燈箱，改成比照本站其他頁面已經在用的模式
// （訂貨單/銷貨單查詢頁的「依客戶」都是純文字輸入客戶代號）：這裡讓使用者
// 直接輸入客戶代號，用這支 API 查詢客戶基本資料（依代號查詢，對應
// FirmAjax/GetByKeyCode，SalesOrderModify.js 的 DeliveryDefault() 裡有用到
// 同一支 API 拿 CellPhone/TelPhone）。
//
// 注意：這支 API 實際回應裡 FirmID/FirmName 用的確切欄位名稱，目前沒有拿到
// 真實回應樣本核對過（只確認過 Data.CellPhone/Data.TelPhone 這兩個欄位存
// 在），下面用常見欄位名稱做防禦性嘗試；如果查到的客戶名稱一直是空的，
// 麻煩把這支 API 在瀏覽器 Network 面板的真實 Response 貼給我核對調整。

export default defineEventHandler(async (event) => {
  const sessionCookie = requireDcUpstreamSession(event)
  const query = getQuery(event)
  const code = query.code ? String(query.code).trim() : ''

  if (!code) {
    throw createError({ statusCode: 400, statusMessage: '請輸入客戶代號' })
  }

  const res = await fetchDcUpstream(sessionCookie, '/COAERP/FirmAjax/GetByKeyCode', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ code, firmtype: 'customer' }).toString()
  })

  let json: any
  try {
    json = await res.json()
  } catch {
    throw createError({ statusCode: 502, statusMessage: '原網站客戶資料格式異常' })
  }

  const d = json?.Data || json?.data || {}
  const firmID = d.FirmID ?? d.ID ?? d.Id ?? ''
  const firmName = d.FirmName ?? d.Name ?? ''

  if (!firmID || String(firmID) === '-1' || String(firmID) === '0') {
    throw createError({ statusCode: 404, statusMessage: '查無此客戶代號' })
  }

  return {
    firmID: String(firmID),
    firmCode: d.FirmCode ?? code,
    firmName: String(firmName),
    payWay: d.PayWay != null ? String(d.PayWay) : null,
    receiptType: d.ReceiptType != null ? String(d.ReceiptType) : null,
    receiptMode: d.ReceiptMode != null ? String(d.ReceiptMode) : null,
    // 除錯用：查到但辨識不出上面欄位時，前端可以把這個原始物件印出來看
    raw: d
  }
})
