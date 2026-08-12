// server/api/shopping-cart/managers/[id]/update.post.ts
// 對應原本「更新」按鈕：admin_manager_CL.php?act=u
// 密碼欄位留空代表不修改密碼（原網站表單上就寫「密碼若不修改請保留空白」）

export default defineEventHandler(async (event) => {
  const sessionCookie = requireUpstreamSession(event)
  const id = getRouterParam(event, 'id')
  const body = await readBody(event)
  const { account, password, name, note } = body || {}

  if (!id || !account || !name) {
    throw createError({ statusCode: 400, statusMessage: '帳號、姓名為必填' })
  }

  const params = new URLSearchParams()
  params.append('u', account)
  if (password) params.append('p', password)
  params.append('n', name)
  params.append('c', note || '')
  params.append('i', id)

  const res = await fetchUpstream(sessionCookie, 'admin_manager_CL.php?act=u', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString()
  })

  const text = await res.text()
  return { ok: Boolean(text.trim()), raw: text }
})
