// server/api/shopping-cart/products/[id]/copy.post.ts
// 對應「複製」連結：admin_product_CL.php?act=cp&i={id}&dir=1&di={categoryId}
// 原網站的複製固定是複製到「目前所在的分類」（di 就是當時清單頁選的分類 id）。

export default defineEventHandler(async (event) => {
  const sessionCookie = requireUpstreamSession(event)
  const id = getRouterParam(event, 'id')
  const body = await readBody(event)
  const { categoryId } = body || {}

  if (!id || !categoryId) {
    throw createError({ statusCode: 400, statusMessage: '缺少商品 ID 或分類 ID' })
  }

  const res = await fetchUpstream(
    sessionCookie,
    `admin_product_CL.php?act=cp&i=${encodeURIComponent(id)}&dir=1&di=${encodeURIComponent(categoryId)}`
  )

  const text = await res.text()
  return { ok: Boolean(text.trim()), raw: text }
})
