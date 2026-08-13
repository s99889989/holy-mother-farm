// server/api/dc-erp/sales-slip-sign.post.ts
//
// 銷貨單「簽核」／「簽退」，跟訂貨單那支 sales-order-sign.post.ts 完全同一套
// 邏輯，只是換成 SalesSlip 前綴：
//   - 簽核：POST /COAERP/SalesSlip/MultiSign
//   - 簽退：POST /COAERP/SalesSlip/MultiSignReturn
// 帶 CurrentPage／StoreCheckedItemJSON／DelChk（後兩者是勾選單據的 Guid，
// 逗號分隔）。已拿到使用者實測的真實 Network 記錄核對過（單選情況，回應
// 302 導回列表頁），多選格式一樣沒有實測樣本，先用逗號分隔嘗試。
//
// 同時給編輯頁單張、列表頁批次共用。

export default defineEventHandler(async (event) => {
  const sessionCookie = requireDcUpstreamSession(event)
  const body = await readBody(event)

  const guids: string[] = Array.isArray(body?.guids) ? body.guids.filter(Boolean) : []
  const action = body?.action === 'return' ? 'return' : 'sign'

  if (!guids.length) {
    throw createError({ statusCode: 400, statusMessage: '請至少選擇一張銷貨單' })
  }

  const joined = guids.join(',')
  const formBody = new URLSearchParams({
    CurrentPage: '1',
    StoreCheckedItemJSON: joined,
    DelChk: joined
  })

  const path = action === 'return' ? '/COAERP/SalesSlip/MultiSignReturn' : '/COAERP/SalesSlip/MultiSign'

  const res = await fetchDcUpstream(sessionCookie, path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: formBody.toString()
  })

  const isSuccessRedirect = res.status >= 300 && res.status < 400
  if (!isSuccessRedirect && !res.ok) {
    throw createError({ statusCode: 502, statusMessage: `${action === 'return' ? '簽退' : '簽核'}失敗，原網站回應異常` })
  }

  return { success: true }
})
