// server/api/shopping-cart/users/[id]/edit.get.ts
//
// 抓 admin_users_update.php?f=1&i={id} 並解析成可編輯表單用的 JSON。
// 需要安裝 cheerio：npm install cheerio

import { load } from 'cheerio'

export default defineEventHandler(async (event) => {
  const sessionCookie = requireUpstreamSession(event)
  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: '缺少會員 ID' })
  }

  const res = await fetchUpstream(
    sessionCookie,
    `admin_users_update.php?f=1&i=${encodeURIComponent(id)}`
  )
  const html = await res.text()
  const $ = load(html)

  // twzipcode 前端套件動態設定選單，靜態 HTML 抓不到已選中的縣市/鄉鎮，
  // 改從內嵌 script 的 zipcodeSel 直接取郵遞區號數字
  const zipMatch = html.match(/zipcodeSel['"]?\s*:\s*['"](\d+)['"]/)
  const genderChecked = $('input[name="s"][checked]').attr('value')

  // 帳號欄位是唯讀 label，跟 ERP 區塊的「沒有對應資料」label 用同一個 class，
  // 不能直接抓第一個 label.form-control，改用「帳號：」這個欄位標題去定位對應的值
  let account = ''
  $('.form-group').each((_, el) => {
    const labelText = $(el).find('> label.control-label').first().text().trim()
    if (labelText === '帳號：') {
      account = $(el).find('label.form-control').first().text().trim()
    }
  })

  return {
    memberId: $('#i').attr('value') || id,
    account,
    erp: $('#erp').attr('value') || '',
    erpSuggested: $('#tmpid').attr('value') || $('#erp').attr('placeholder') || '',
    email: $('#e').attr('value') || '',
    name: $('#n').attr('value') || '',
    gender: genderChecked === '1' ? '1' : genderChecked === '0' ? '0' : '',
    birthday: $('#b').attr('value') || '',
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
