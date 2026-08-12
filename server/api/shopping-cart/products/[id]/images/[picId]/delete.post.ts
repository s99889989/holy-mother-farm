// server/api/shopping-cart/products/[id]/images/[picId]/delete.post.ts
// 對應「刪除」連結：admin_product_CL.php?act=pic_d&i={productId}&pi={picId}

export default defineEventHandler(async (event) => {
  const sessionCookie = requireUpstreamSession(event)
  const id = getRouterParam(event, 'id')
  const picId = getRouterParam(event, 'picId')

  if (!id || !picId) {
    throw createError({ statusCode: 400, statusMessage: '缺少商品 ID 或圖片 ID' })
  }

  const res = await fetchUpstream(
    sessionCookie,
    `admin_product_CL.php?act=pic_d&i=${encodeURIComponent(id)}&pi=${encodeURIComponent(picId)}`
  )

  const text = await res.text()
  return { ok: Boolean(text.trim()), raw: text }
})
