// server/api/shopping-cart/product-units/[id]/reorder.post.ts
// 對應排序輸入框 change 事件：admin_product_CL.php?act=unit_order
// 注意 i 參數帶的是完整欄位名稱（例如 u5），不是純數字 id

export default defineEventHandler(async (event) => {
  const sessionCookie = requireUpstreamSession(event)
  const body = await readBody(event)
  const { fieldName, value } = body || {}

  if (!fieldName || value === undefined || value === null || value === '') {
    throw createError({ statusCode: 400, statusMessage: '缺少必要參數' })
  }

  const res = await fetchUpstream(sessionCookie, 'admin_product_CL.php', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      act: 'unit_order',
      i: fieldName,
      n: String(value)
    }).toString()
  })

  const text = await res.text()
  return { ok: Boolean(text.trim()), raw: text }
})
