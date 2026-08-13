// server/api/dc-erp/sales-order-delete.post.ts
//
// 刪除整張訂貨單，對應原網站編輯頁（或列表頁）刪除功能：
// POST /COAERP/SalesOrder/Delete/{guid}，不帶任何 Payload（Content-Length: 0），
// 回應是很短的一段文字（實測 2 bytes，內容像是 "OK"），成功後原網站導回
// 列表頁——這裡不特別去解析回應內容是什麼，只要 HTTP 狀態正常（非 401/5xx）
// 就當作成功，跟原網站導回列表頁的行為一致（前端收到成功後自己導回列表）。
//
// 需要安裝 cheerio：不需要，這支不解析 HTML。

export default defineEventHandler(async (event) => {
  const sessionCookie = requireDcUpstreamSession(event)
  const body = await readBody(event)
  const guid = body?.guid ? String(body.guid) : ''

  if (!guid) {
    throw createError({ statusCode: 400, statusMessage: '缺少訂貨單 Guid' })
  }

  const res = await fetchDcUpstream(sessionCookie, `/COAERP/SalesOrder/Delete/${encodeURIComponent(guid)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: ''
  })

  if (!res.ok) {
    throw createError({ statusCode: 502, statusMessage: '刪除訂貨單失敗，原網站回應異常' })
  }

  return { success: true }
})
