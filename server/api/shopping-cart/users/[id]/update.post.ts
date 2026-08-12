// server/api/shopping-cart/users/[id]/update.post.ts
// 對應原本「儲存會員資料」的表單送出：admin_users_CL.php?act=u&i={id}
//
// 原表單有一個「驗證碼」欄位（隨機兩位數加法），但檢查邏輯完全寫在前端 JS
// （$("#c").val() != n 這段），後端 admin_users_CL.php 本身不驗證這個值，
// 純粹是原網站防呆用的前端提示，這裡略過不送這個欄位。
//
// 密碼欄位留空代表「不修改密碼」——只有使用者真的填了新密碼才會送出。

export default defineEventHandler(async (event) => {
  const sessionCookie = requireUpstreamSession(event)
  const id = getRouterParam(event, 'id')
  const body = await readBody(event)

  if (!id || !body) {
    throw createError({ statusCode: 400, statusMessage: '缺少更新資料' })
  }

  const params = new URLSearchParams()
  params.append('erp', body.erp ?? '')
  if (body.password) params.append('p', body.password)
  params.append('e', body.email ?? '')
  params.append('n', body.name ?? '')
  params.append('s', body.gender ?? '')
  params.append('b', body.birthday ?? '')
  params.append('p1', body.phoneArea ?? '')
  params.append('p2', body.phoneNumber ?? '')
  params.append('p3', body.phoneExt ?? '')
  params.append('f1', body.faxArea ?? '')
  params.append('f2', body.faxNumber ?? '')
  params.append('m', body.mobile ?? '')
  params.append('zipcode', body.zipcode ?? '')
  params.append('a', body.address ?? '')
  params.append('t1', body.note ?? '')
  params.append('i', body.memberId ?? id)

  const res = await fetchUpstream(sessionCookie, `admin_users_CL.php?act=u&i=${encodeURIComponent(id)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString()
  })

  const text = await res.text()
  return { ok: Boolean(text.trim()), raw: text }
})
