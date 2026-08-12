// server/api/shopping-cart/product-units/[id]/edit.get.ts
//
// 原網站的編輯表單跟清單是同一頁：admin_product_unit.php?act=u&sn={id}
// 會把「新增分類」（其實是新增單位）表單（id="fu"）預填成該筆單位的資料，
// 下面清單不變。這裡只解析那個表單的欄位。

import { load } from 'cheerio'

export default defineEventHandler(async (event) => {
  const sessionCookie = requireUpstreamSession(event)
  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: '缺少單位 ID' })
  }

  const res = await fetchUpstream(
    sessionCookie,
    `admin_product_unit.php?act=u&sn=${encodeURIComponent(id)}`
  )
  const html = await res.text()
  const $ = load(html)

  const form = $('#fu')
  if (form.length === 0) {
    throw createError({ statusCode: 502, statusMessage: '抓不到編輯表單，請確認這個單位是否存在' })
  }

  return {
    unitId: form.find('#i').attr('value') || id,
    name: form.find('#n').attr('value') || ''
  }
})
