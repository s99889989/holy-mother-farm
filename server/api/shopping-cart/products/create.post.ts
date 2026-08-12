// server/api/shopping-cart/products/create.post.ts
// 對應「新增商品」表單：admin_product_CL.php?act=a
// 原網站表單另外帶了固定的隱藏欄位 s=1（可訂購）、o=1（顯示），
// 新增商品一律以這兩個預設值送出，跟原網站行為一致。

export default defineEventHandler(async (event) => {
  const sessionCookie = requireUpstreamSession(event)
  const body = await readBody(event)
  const { categoryId, name, no, originalPrice, price, unit, tempZone, sort, description } = body || {}

  if (!categoryId || !name || !no || !price || !unit) {
    throw createError({ statusCode: 400, statusMessage: '分類目錄、商品名稱、商品資材碼、商品售價、商品單位皆為必填' })
  }

  const res = await fetchUpstream(sessionCookie, 'admin_product_CL.php?act=a', {
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
      psort: sort || '9',
      c: description || '',
      s: '1',
      o: '1'
    }).toString()
  })

  const text = await res.text()
  return { ok: Boolean(text.trim()), raw: text }
})
