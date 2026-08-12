// server/api/shopping-cart/shipping-fees/[id]/toggle-state.post.ts
// 對應「啟用/停用」：a_pricehome_CL.php?act=state&state={0|1}&ph_id={id}
// 原本也是 GET 請求

export default defineEventHandler(async (event) => {
  const sessionCookie = requireUpstreamSession(event)
  const id = getRouterParam(event, 'id')
  const body = await readBody(event)
  const state = body?.state

  if (!id || state === undefined || state === null || state === '') {
    throw createError({ statusCode: 400, statusMessage: '缺少必要參數' })
  }

  const res = await fetchUpstream(
    sessionCookie,
    `a_pricehome_CL.php?act=state&state=${encodeURIComponent(state)}&ph_id=${encodeURIComponent(id)}`
  )

  const json = await res.json().catch(() => ({ status: 'error' }))
  return { ok: json.status !== 'error', ...json }
})
