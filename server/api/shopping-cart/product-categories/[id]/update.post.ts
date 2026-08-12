// server/api/shopping-cart/product-categories/[id]/update.post.ts
// 對應「更新」按鈕：admin_product_CL.php?act=class_u
// （原網站的新增/編輯是同一支表單，act=class_u 同時處理新增與更新，
// 差別在有沒有帶 i 這個隱藏欄位；這裡既然是編輯，i 一定要帶）

export default defineEventHandler(async (event) => {
  const sessionCookie = requireUpstreamSession(event)
  const id = getRouterParam(event, 'id')
  const body = await readBody(event)
  const { name, feeGroup } = body || {}

  if (!id || !name) {
    throw createError({ statusCode: 400, statusMessage: '分類名稱為必填' })
  }

  const res = await fetchUpstream(sessionCookie, 'admin_product_CL.php?act=class_u', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ n: name, i: id, fgid: feeGroup || 'N' }).toString()
  })

  const text = await res.text()
  return { ok: Boolean(text.trim()), raw: text }
})
