// server/api/shopping-cart/orders/[orderNo]/quantity.post.ts
// 對應原本商品數量欄位 change 事件的 AJAX：admin_order_CL.php?act=nv

export default defineEventHandler(async (event) => {
  const sessionCookie = requireUpstreamSession(event)
  const orderNo = getRouterParam(event, 'orderNo')
  const body = await readBody(event)
  const { field, value } = body || {}

  if (!orderNo || !field || value === undefined || value === null || value === '') {
    throw createError({ statusCode: 400, statusMessage: '缺少必要參數' })
  }
  if (Number.isNaN(Number(value))) {
    throw createError({ statusCode: 400, statusMessage: '數量必須是數字' })
  }

  // 注意：原網站這支 AJAX 本身就寫死帶 classpay: 1，沒有依實際付費方式判斷，
  // 這裡照原樣還原這個行為（疑似原網站既有的小瑕疵，非我方新增的問題）
  const res = await fetchUpstream(sessionCookie, 'admin_order_CL.php?act=nv', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      id: orderNo,
      classpay: '1',
      n: field,
      v: String(value)
    }).toString()
  })

  const text = await res.text()
  return { ok: Boolean(text.trim()), raw: text }
})
