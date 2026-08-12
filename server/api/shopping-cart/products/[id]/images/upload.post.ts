// server/api/shopping-cart/products/[id]/images/upload.post.ts
// 對應「新增圖片」表單：admin_product_image_add.php?a=1&i={id}
// 注意這支跟其他動作不一樣，不是走 admin_product_CL.php，而是直接 POST
// 回同一支頁面，且是 multipart/form-data（最多 6 個檔案，欄位名都是 upload[]）。

export default defineEventHandler(async (event) => {
  const sessionCookie = requireUpstreamSession(event)
  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: '缺少商品 ID' })
  }

  const parts = await readMultipartFormData(event)
  const files = (parts || []).filter((p) => p.filename)

  if (files.length === 0) {
    throw createError({ statusCode: 400, statusMessage: '請選擇至少一張圖片' })
  }

  const upstreamForm = new FormData()
  for (const file of files) {
    upstreamForm.append(
      'upload[]',
      new Blob([file.data], { type: file.type || 'image/jpeg' }),
      file.filename
    )
  }

  const res = await fetchUpstream(
    sessionCookie,
    `admin_product_image_add.php?a=1&i=${encodeURIComponent(id)}`,
    {
      method: 'POST',
      body: upstreamForm
    }
  )

  // 這支頁面成功後原網站是回傳整頁 HTML（跳轉/重新整理），沒有簡單的成功旗標，
  // 所以只要沒有連線錯誤或跳回登入頁，就視為已送出。
  await res.text()
  return { ok: true }
})
