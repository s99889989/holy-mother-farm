/**
 * GET /api/internal-system/property/todo
 * 對應 api/todo_property_CL.php
 */
import { getInternalSystemSessionCookie, handleInternalSystemSessionExpired } from '../../../utils/internal-system/phpProxy'

const BASE_URL = INTERNAL_SYSTEMS.A113

interface TodoItem {
  level: 'danger' | 'warning' | 'info' | 'success'
  url: string
  title: string
  count: number
}

export default defineEventHandler(async (event) => {
  const cookie = getInternalSystemSessionCookie(event)

  const result = await internalSystemAgentRelayFetch('GET', `${BASE_URL}/api/todo_property_CL.php`, {
    Cookie: cookie,
    'User-Agent': 'Mozilla/5.0',
  })

  try {
    const json = JSON.parse(result.bodyText) as { total: number; items: TodoItem[] }
    return json
  } catch {
    // 回傳的不是 JSON，通常代表 session 過期被導回登入頁
    handleInternalSystemSessionExpired(event)
  }
})