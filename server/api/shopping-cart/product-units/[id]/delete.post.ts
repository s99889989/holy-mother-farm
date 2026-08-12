// server/api/shopping-cart/product-units/[id]/delete.post.ts
// 對應「刪除」連結：admin_product_CL.php?act=unit_d&i={id}

export default defineEventHandler(async (event) => {
  const sessionCookie = requireUpstreamSession(event)
  const id = getRouterParam(event, 'id')

  if (!id) {
    throw createError({ statusCode: 400, statusMessage: '缺少單位 ID' })
  }

  const res = await fetchUpstream(
    sessionCookie,
    `admin_product_CL.php?act=unit_d&i=${encodeURIComponent(id)}`
  )

  const text = await res.text()
  return { ok: Boolean(text.trim()), raw: text }
})
