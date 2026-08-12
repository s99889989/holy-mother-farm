// server/api/shopping-cart/users/[id]/toggle-status.post.ts
// 對應原本「啟用/停用」連結：admin_users_CL.php?act=s&sw={0|1}&i={id}
// 連結文字顯示的是「目前狀態」，點下去是切換成相反狀態，
// 所以這裡直接吃前端算好的目標狀態 sw（0=改成停用，1=改成啟用）

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
    `admin_users_CL.php?act=s&sw=${encodeURIComponent(sw)}&i=${encodeURIComponent(id)}`
  )

  const text = await res.text()
  return { ok: Boolean(text.trim()), raw: text }
})
