// server/api/shopping-cart/managers/create.post.ts
// 對應原本「新增管理員」表單：admin_manager_CL.php?act=a

export default defineEventHandler(async (event) => {
  const sessionCookie = requireUpstreamSession(event)
  const body = await readBody(event)
  const { account, password, name, note } = body || {}

  if (!account || !password || !name) {
    throw createError({ statusCode: 400, statusMessage: '帳號、密碼、姓名為必填' })
  }

  const res = await fetchUpstream(sessionCookie, 'admin_manager_CL.php?act=a', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      u: account,
      p: password,
      n: name,
      c: note || ''
    }).toString()
  })

  const text = await res.text()
  return { ok: Boolean(text.trim()), raw: text }
})
