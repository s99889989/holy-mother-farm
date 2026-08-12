// server/api/shopping-cart/users/[id]/verify-mail.post.ts
// 對應原本「認證」連結：admin_users_CL.php?act=ma&i={id}

export default defineEventHandler(async (event) => {
  const sessionCookie = requireUpstreamSession(event)
  const id = getRouterParam(event, 'id')

  if (!id) {
    throw createError({ statusCode: 400, statusMessage: '缺少會員 ID' })
  }

  const res = await fetchUpstream(
    sessionCookie,
    `admin_users_CL.php?act=ma&i=${encodeURIComponent(id)}`
  )

  const text = await res.text()
  return { ok: Boolean(text.trim()), raw: text }
})
