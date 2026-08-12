// server/api/shopping-cart/shipping-fees/[id]/update.post.ts
// 對應「更新運費」：a_pricehome_CL.php?act=update

export default defineEventHandler(async (event) => {
  const sessionCookie = requireUpstreamSession(event)
  const id = getRouterParam(event, 'id')
  const body = await readBody(event)
  const { temp, price, pricehome, state } = body || {}

  if (!id || temp === undefined || pricehome === undefined) {
    throw createError({ statusCode: 400, statusMessage: '缺少必要參數' })
  }

  const res = await fetchUpstream(sessionCookie, 'a_pricehome_CL.php?act=update', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      ph_id: id,
      temp: String(temp),
      price: price !== undefined ? String(price) : '',
      pricehome: String(pricehome),
      state: state !== undefined ? String(state) : '1'
    }).toString()
  })

  const json = await res.json().catch(() => ({ status: 'error' }))
  return { ok: json.status !== 'error', ...json }
})
