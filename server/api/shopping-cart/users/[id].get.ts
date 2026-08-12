// server/api/shopping-cart/users/[id].get.ts
//
// 抓 admin_users_view.php?i={id}（唯讀版本，跟 users/[id]/edit.get.ts
// 對應的修改頁不同）並解析成 JSON。
// 需要安裝 cheerio：npm install cheerio

import { load } from 'cheerio'

export default defineEventHandler(async (event) => {
  const sessionCookie = requireUpstreamSession(event)
  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: '缺少會員 ID' })
  }

  const res = await fetchUpstream(sessionCookie, `admin_users_view.php?i=${encodeURIComponent(id)}`)
  const html = await res.text()
  const $ = load(html)

  const zipMatch = html.match(/zipcodeSel['"]?\s*:\s*['"](\d+)['"]/)
  const genderChecked = $('input[name="s"][checked]').attr('value')

  // 帳號欄位是唯讀 label，用「帳號：」這個欄位標題定位對應的值
  let account = ''
  $('.form-group').each((_, el) => {
    const labelText = $(el).find('> label.control-label').first().text().trim()
    if (labelText === '帳號：') {
      account = $(el).find('label.form-control').first().text().trim()
    }
  })

  const birthday = $('#b').attr('value') || ''

  return {
    memberId: id,
    account,
    erp: $('#erp').attr('value') || '',
    email: $('#e').attr('value') || '',
    name: $('#n').attr('value') || '',
    gender: genderChecked === '1' ? '先生' : genderChecked === '0' ? '小姐' : '',
    birthday: birthday === '0000-00-00' ? '' : birthday,
    phoneArea: $('#p1').attr('value') || '',
    phoneNumber: $('#p2').attr('value') || '',
    phoneExt: $('#p3').attr('value') || '',
    faxArea: $('#f1').attr('value') || '',
    faxNumber: $('#f2').attr('value') || '',
    mobile: $('#m').attr('value') || '',
    zipcode: zipMatch ? zipMatch[1] : '',
    address: $('#a').attr('value') || '',
    note: $('#t1').text().trim()
  }
})
