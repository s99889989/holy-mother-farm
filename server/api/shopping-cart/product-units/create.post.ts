// server/api/shopping-cart/product-units/create.post.ts
// 對應「新增分類」（其實是新增單位）表單：admin_product_CL.php?act=unit_a

export default defineEventHandler(async (event) => {
  const sessionCookie = requireUpstreamSession(event)
  const body = await readBody(event)
  const { name } = body || {}

  if (!name) {
    throw createError({ statusCode: 400, statusMessage: '單位名稱為必填' })
  }

  const res = await fetchUpstream(sessionCookie, 'admin_product_CL.php?act=unit_a', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ n: name }).toString()
  })

  const text = await res.text()
  return { ok: Boolean(text.trim()), raw: text }
})
