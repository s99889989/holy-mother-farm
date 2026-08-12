// server/api/shopping-cart/shipping-fees/[id]/delete.post.ts
// 對應「刪除運費」：a_pricehome_CL.php?act=delete&ph_id={id}
// 原本是 GET 請求（帶 query string），這裡照原樣用 GET 呼叫上游

export default defineEventHandler(async (event) => {
  const sessionCookie = requireUpstreamSession(event)
  const id = getRouterParam(event, 'id')

  if (!id) {
    throw createError({ statusCode: 400, statusMessage: '缺少運費 ID' })
  }

  const res = await fetchUpstream(
    sessionCookie,
    `a_pricehome_CL.php?act=delete&ph_id=${encodeURIComponent(id)}`
  )

  const json = await res.json().catch(() => ({ status: 'error' }))
  return { ok: json.status !== 'error', ...json }
})
