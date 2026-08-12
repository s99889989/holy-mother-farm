// server/api/shopping-cart/orders/[orderNo]/status.post.ts
// 對應原本 #btnchst 的 AJAX：admin_order_CL.php?act=chst

export default defineEventHandler(async (event) => {
  const sessionCookie = requireUpstreamSession(event)
  const orderNo = getRouterParam(event, 'orderNo')
  const body = await readBody(event)
  const status = body?.status

  if (!orderNo || status === undefined || status === null || status === '') {
    throw createError({ statusCode: 400, statusMessage: '缺少訂單狀態' })
  }

  const res = await fetchUpstream(sessionCookie, 'admin_order_CL.php?act=chst', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ sv: String(status), id: orderNo }).toString()
  })

  const text = await res.text()
  return { ok: Boolean(text.trim()), raw: text }
})
