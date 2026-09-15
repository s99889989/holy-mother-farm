/**
 * GET /api/internal-system/property/news
 * 對應 index.php — 原系統的最新消息內容是伺服器端直接渲染在頁面裡，
 * 沒有獨立的 JSON API，所以這裡抓原始 HTML 後解析 #newsArea 區塊。
 */
import { getInternalSystemSessionCookie, handleInternalSystemSessionExpired } from '../../../utils/internal-system/phpProxy'
import { internalSystemPropertyGet } from '../../../utils/internal-system/phpPropertyProxy'

export default defineEventHandler(async (event) => {
  const cookie = getInternalSystemSessionCookie(event)
  const { html, sessionExpired } = await internalSystemPropertyGet('index.php', cookie)

  if (sessionExpired) {
    handleInternalSystemSessionExpired(event)
  }

  const newsMatch = html.match(/<div id="newsArea">([\s\S]*?)<\/div>\s*<div id="editAera"/)
  const news = newsMatch ? newsMatch[1].trim() : ''

  const identityMatch = html.match(/目前登入身份：([^<]*)</)
  const identity = identityMatch ? identityMatch[1].trim() : ''

  return { news, identity }
})