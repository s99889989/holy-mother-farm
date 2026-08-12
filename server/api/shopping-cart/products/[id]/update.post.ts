// server/api/shopping-cart/products/[id]/update.post.ts
// 對應「更新商品」按鈕：admin_product_CL.php?act=u&i={id}

export default defineEventHandler(async (event) => {
  const sessionCookie = requireUpstreamSession(event)
  const id = getRouterParam(event, 'id')
  const body = await readBody(event)
  const {
    categoryId,
    name,
    no,
    originalPrice,
    price,
    unit,
    tempZone,
    orderable,
    visible,
    sort,
    description
  } = body || {}

  if (!id || !categoryId || !name || !no || !price || !unit) {
    throw createError({ statusCode: 400, statusMessage: '分類目錄、商品名稱、商品資材碼、商品售價、商品單位皆為必填' })
  }

  const res = await fetchUpstream(sessionCookie, `admin_product_CL.php?act=u&i=${encodeURIComponent(id)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      d: categoryId,
      n: name,
      no,
      op: originalPrice || '',
      p: price,
      u: unit,
      t: tempZone ?? '1',
      s: orderable ?? '1',
      o: visible ?? '1',
      psort: sort || '',
      c: description || '',
      de: ''
    }).toString()
  })

  const text = await res.text()
  return { ok: Boolean(text.trim()), raw: text }
})
