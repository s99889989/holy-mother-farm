// server/api/shopping-cart/orders/[orderNo]/delivery-date.post.ts
// 對應原本 #deliverbtn 的 AJAX：admin_order_CL.php?act=setOD

export default defineEventHandler(async (event) => {
  const sessionCookie = requireUpstreamSession(event)
  const orderNo = getRouterParam(event, 'orderNo')
  const body = await readBody(event)
  const date = body?.date

  if (!orderNo || !date) {
    throw createError({ statusCode: 400, statusMessage: '缺少出貨日期' })
  }

  const res = await fetchUpstream(sessionCookie, 'admin_order_CL.php?act=setOD', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ v: date, id: orderNo }).toString()
  })

  const text = await res.text()
  return { ok: Boolean(text.trim()), raw: text }
})
