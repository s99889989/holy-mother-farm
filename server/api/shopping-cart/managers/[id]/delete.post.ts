// server/api/shopping-cart/managers/[id]/delete.post.ts
// 對應原本「刪除」連結：admin_manager_CL.php?act=d&i={id}

export default defineEventHandler(async (event) => {
  const sessionCookie = requireUpstreamSession(event)
  const id = getRouterParam(event, 'id')

  if (!id) {
    throw createError({ statusCode: 400, statusMessage: '缺少管理員 ID' })
  }

  const res = await fetchUpstream(
    sessionCookie,
    `admin_manager_CL.php?act=d&i=${encodeURIComponent(id)}`
  )

  const text = await res.text()
  return { ok: Boolean(text.trim()), raw: text }
})
