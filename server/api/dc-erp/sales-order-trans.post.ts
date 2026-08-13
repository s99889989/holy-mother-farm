// server/api/dc-erp/sales-order-trans.post.ts
//
// 訂貨單「轉銷」（轉入銷貨單），對應原網站 SalesOrderModify.js 的
// TransSlipClick(guid)：POST /COAERP/SalesOrder/TransSalesSlip/{guid}，
// 成功回傳字串 "True"，失敗回傳 "False" 或其他錯誤訊息文字（原網站前端邏輯：
// r == "True" 才算成功，否則 alert(r || "轉入失敗")）——這裡照樣的邏輯判斷。
//
// 已拿到使用者實測的真實 Network 記錄核對過（Response 是 "True"）。

export default defineEventHandler(async (event) => {
  const sessionCookie = requireDcUpstreamSession(event)
  const body = await readBody(event)
  const guid = body?.guid ? String(body.guid) : ''

  if (!guid) {
    throw createError({ statusCode: 400, statusMessage: '缺少訂貨單 Guid' })
  }

  const res = await fetchDcUpstream(sessionCookie, `/COAERP/SalesOrder/TransSalesSlip/${encodeURIComponent(guid)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: ''
  })

  const text = (await res.text()).trim()
  if (text !== 'True') {
    throw createError({
      statusCode: 422,
      statusMessage: text && text !== 'False' ? text : '轉入銷貨單失敗'
    })
  }

  return { success: true }
})
