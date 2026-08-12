// server/api/shopping-cart/managers/[id]/edit.get.ts
//
// 原網站的編輯表單跟清單是同一頁：admin_manager.php?act=up&i={id}
// 會在頁面上方多出一個預填資料的「編輯」表單（id="fu"），下面清單不變。
// 這裡只解析那個編輯表單的欄位。

import { load } from 'cheerio'

export default defineEventHandler(async (event) => {
  const sessionCookie = requireUpstreamSession(event)
  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: '缺少管理員 ID' })
  }

  const res = await fetchUpstream(
    sessionCookie,
    `admin_manager.php?act=up&i=${encodeURIComponent(id)}`
  )
  const html = await res.text()
  const $ = load(html)

  const form = $('#fu')
  if (form.length === 0) {
    throw createError({ statusCode: 502, statusMessage: '抓不到編輯表單，請確認這個管理員是否存在' })
  }

  return {
    managerId: form.find('#i').attr('value') || id,
    account: form.find('#u').attr('value') || '',
    name: form.find('#n').attr('value') || '',
    note: form.find('#c').attr('value') || ''
  }
})
