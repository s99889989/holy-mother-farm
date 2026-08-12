// server/api/shopping-cart/product-categories/create.post.ts
// 對應「新增分類」表單：admin_product_CL.php?act=class_a

export default defineEventHandler(async (event) => {
  const sessionCookie = requireUpstreamSession(event)
  const body = await readBody(event)
  const { name, feeGroup } = body || {}

  if (!name) {
    throw createError({ statusCode: 400, statusMessage: '分類名稱為必填' })
  }

  const res = await fetchUpstream(sessionCookie, 'admin_product_CL.php?act=class_a', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ n: name, fgid: feeGroup || 'N' }).toString()
  })

  const text = await res.text()
  return { ok: Boolean(text.trim()), raw: text }
})
