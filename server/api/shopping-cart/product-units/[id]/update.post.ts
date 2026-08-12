// server/api/shopping-cart/product-units/[id]/update.post.ts
// 對應「更新」按鈕：admin_product_CL.php?act=unit_u

export default defineEventHandler(async (event) => {
  const sessionCookie = requireUpstreamSession(event)
  const id = getRouterParam(event, 'id')
  const body = await readBody(event)
  const { name } = body || {}

  if (!id || !name) {
    throw createError({ statusCode: 400, statusMessage: '單位名稱為必填' })
  }

  const res = await fetchUpstream(sessionCookie, 'admin_product_CL.php?act=unit_u', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ n: name, i: id }).toString()
  })

  const text = await res.text()
  return { ok: Boolean(text.trim()), raw: text }
})
