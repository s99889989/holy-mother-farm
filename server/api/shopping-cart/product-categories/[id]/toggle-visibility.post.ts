// server/api/shopping-cart/product-categories/[id]/toggle-visibility.post.ts
// 對應「顯示/隱藏」連結：admin_product_CL.php?act=class_on&s={0|1}&i={id}

export default defineEventHandler(async (event) => {
  const sessionCookie = requireUpstreamSession(event)
  const id = getRouterParam(event, 'id')
  const body = await readBody(event)
  const sw = body?.sw

  if (!id || sw === undefined || sw === null || sw === '') {
    throw createError({ statusCode: 400, statusMessage: '缺少必要參數' })
  }

  const res = await fetchUpstream(
    sessionCookie,
    `admin_product_CL.php?act=class_on&s=${encodeURIComponent(sw)}&i=${encodeURIComponent(id)}`
  )

  const text = await res.text()
  return { ok: Boolean(text.trim()), raw: text }
})
