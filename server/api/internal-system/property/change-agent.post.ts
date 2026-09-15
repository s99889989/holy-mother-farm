/**
 * POST /api/internal-system/property/change-agent
 * body: { agent, role, name, sn }
 * 對應 login_CL.php?act=change_agent
 *
 * 注意：舊系統前端是用 ajaxPost(url, plainObject)（沒有 JSON.stringify），
 * 送的是 form-urlencoded body，不是 JSON body——跟 borrow-update 那類
 * 端點不一樣，所以這裡用 internalSystemPropertyPost（不是 internalSystemPropertyPostJson）再自己
 * parse JSON，避免像維修單那次醫用氣體選單一樣因為 body 格式送錯而壞掉。
 */
import { getInternalSystemSessionCookie } from '../../../utils/internal-system/phpProxy'
import { internalSystemPropertyPost } from '../../../utils/internal-system/phpPropertyProxy'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const cookie = getInternalSystemSessionCookie(event)

  const { text } = await internalSystemPropertyPost('login_CL.php?act=change_agent', cookie, {
    agent: body?.agent ?? '',
    role: body?.role ?? '',
    name: body?.name ?? '',
    sn: body?.sn ?? '',
  })

  // 注意：這支端點「成功」回應本身就長得像 {"rs":"1",...,"url":"login.php"}——
  // url 欄位剛好包含字串 "login.php"（原本用途是切換身分後要導去重新登入），
  // 共用的 isSessionExpired() 判斷會誤把這個成功回應當成過期擋下來，
  // 所以這裡不能用 internalSystemPropertyPost 附帶的 sessionExpired 判斷，改成先嘗試
  // JSON.parse，能解析出來（且有 rs 欄位）就直接當作正常回應處理。
  try {
    const json = JSON.parse(text)
    if (json && typeof json === 'object' && 'rs' in json) {
      return json
    }
  } catch {
    // 不是 JSON，落到下面用文字內容判斷是否真的過期
  }

  if (text.includes('請輸入你的帳號和密碼') || text.includes('flogin')) {
    throw createError({ statusCode: 401, statusMessage: 'Session 已過期，請重新登入' })
  }
  throw createError({ statusCode: 502, statusMessage: '舊系統回應格式非預期(非 JSON)' })
})