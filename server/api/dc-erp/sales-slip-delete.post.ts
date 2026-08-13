// server/api/dc-erp/sales-slip-delete.post.ts
//
// 刪除整張銷貨單。編輯頁「刪除」按鈕的 onclick 是 Delete('guid')，對應的
// API 路徑沒有實測樣本，是照訂貨單那邊已經核對過的
// POST SalesOrder/Delete/{guid} 命名慣例類推過來的（POST SalesSlip/Delete/
// {guid}，不帶 Payload）。如果刪除失敗，麻煩在原網站按一次刪除，把那筆
// 請求的真實 Network 記錄貼給我核對。

export default defineEventHandler(async (event) => {
  const sessionCookie = requireDcUpstreamSession(event)
  const body = await readBody(event)
  const guid = body?.guid ? String(body.guid) : ''

  if (!guid) {
    throw createError({ statusCode: 400, statusMessage: '缺少銷貨單 Guid' })
  }

  const res = await fetchDcUpstream(sessionCookie, `/COAERP/SalesSlip/Delete/${encodeURIComponent(guid)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: ''
  })

  if (!res.ok) {
    throw createError({ statusCode: 502, statusMessage: '刪除銷貨單失敗，原網站回應異常' })
  }

  return { success: true }
})
