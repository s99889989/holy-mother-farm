// server/api/shopping-cart/orders/[orderNo]/update.post.ts
// 對應原本「更新訂單資料」按鈕的 AJAX：admin_order_CL.php?act=u（$("#f").serialize()）
//
// 原表單裡的縣市/鄉鎮下拉選單值是靠前端 twzipcode 套件動態設定的，
// 我們沒有重建那套下拉選單邏輯，這裡只送出「郵遞區號」文字欄位，
// county/district 留空——如果原網站後端有強制檢查這兩個欄位必填，
// 可能需要另外處理。

export default defineEventHandler(async (event) => {
  const sessionCookie = requireUpstreamSession(event)
  const orderNo = getRouterParam(event, 'orderNo')
  const body = await readBody(event)

  if (!orderNo || !body) {
    throw createError({ statusCode: 400, statusMessage: '缺少更新資料' })
  }

  const params = new URLSearchParams()

  // 商品數量欄位（如 p5951），由前端把 { fieldName: value } 整包送過來
  const quantities = body.quantities || {}
  for (const [field, value] of Object.entries(quantities)) {
    params.append(field, String(value))
  }

  params.append('classpay', body.classpay ?? '1')
  params.append('n', body.name ?? '')
  params.append('s', body.gender ?? '')
  params.append('c1', body.phoneArea ?? '')
  params.append('c2', body.phoneNumber ?? '')
  params.append('c3', body.phoneExt ?? '')
  params.append('m', body.mobile ?? '')
  params.append('zipcode', body.zipcode ?? '')
  params.append('a', body.address ?? '')
  params.append('t1', body.note ?? '')
  params.append('receipt', body.receiptType ?? '1')
  params.append('companyname', body.companyName ?? '')
  params.append('companyid', body.companyId ?? '')
  params.append('receiptnumber', body.receiptNumber ?? '')
  params.append('i', body.hiddenFields?.i ?? orderNo)
  params.append('aid', body.hiddenFields?.aid ?? '')
  params.append('an', body.hiddenFields?.an ?? '')

  const res = await fetchUpstream(sessionCookie, 'admin_order_CL.php?act=u', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString()
  })

  const text = await res.text()
  return { ok: Boolean(text.trim()), raw: text }
})
