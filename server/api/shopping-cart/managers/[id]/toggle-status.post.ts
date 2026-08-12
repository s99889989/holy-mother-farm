// server/api/shopping-cart/managers/[id]/toggle-status.post.ts
// 對應原本「啟用/停用」連結：admin_manager_CL.php?act=s&s={0|1}&i={id}

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
    `admin_manager_CL.php?act=s&s=${encodeURIComponent(sw)}&i=${encodeURIComponent(id)}`
  )

  const text = await res.text()
  return { ok: Boolean(text.trim()), raw: text }
})
