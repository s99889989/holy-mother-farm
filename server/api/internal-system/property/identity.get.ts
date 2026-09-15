/**
 * GET /api/internal-system/property/identity
 *
 * 舊系統沒有提供「代理人清單」的 JSON API（已跟你確認過，點「更改代理身分」
 * 只送出 change_agent，沒有另外的清單 API），這份清單是伺服器端渲染時
 * 直接寫進 index.php 的 HTML 裡（<select id="agSelect">…</select>），
 * 所以這支改成抓 index.php 整頁 HTML 後用正規表達式解析出來。
 *
 * 風險：如果舊系統改版動到這段 HTML 的屬性順序或結構，這支就要跟著調整。
 * 目前假設的結構（照你貼的原始碼）：
 *   <button ...>目前登入身份：吳宣澔(財產管理專人)</button>
 *   <select id="agSelect">
 *     <option value="F00228" data-sn="68" data-role="5" data-name="吳宣澔" selected>
 *       吳宣澔 (原身分)
 *     </option>
 *     ...
 *   </select>
 */
import { getInternalSystemSessionCookie } from '../../../utils/internal-system/phpProxy'
import { internalSystemPropertyGet } from '../../../utils/internal-system/phpPropertyProxy'

export interface AgentOption {
  value: string
  sn: string
  role: string
  name: string
  label: string
  selected: boolean
}

export interface IdentityResponse {
  currentLabel: string
  options: AgentOption[]
}

function decodeEntities(s: string): string {
  return s
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#0?39;/g, "'")
}

export default defineEventHandler(async (event): Promise<IdentityResponse> => {
  const cookie = getInternalSystemSessionCookie(event)
  const { html, sessionExpired } = await internalSystemPropertyGet('index.php', cookie)
  if (sessionExpired) {
    throw createError({ statusCode: 401, statusMessage: 'Session 已過期，請重新登入' })
  }

  const currentMatch = html.match(/目前登入身份[：:]\s*([^<]+?)\s*<\/button>/)
  const currentLabel = currentMatch ? decodeEntities(currentMatch[1].trim()) : ''

  const selectMatch = html.match(/<select[^>]*id=["']agSelect["'][^>]*>([\s\S]*?)<\/select>/)
  const options: AgentOption[] = []

  if (selectMatch) {
    const optionRe =
        /<option\s+value=["']([^"']*)["']\s+data-sn=["']([^"']*)["']\s+data-role=["']([^"']*)["']\s+data-name=["']([^"']*)["']([^>]*)>([\s\S]*?)<\/option>/g
    let m: RegExpExecArray | null
    while ((m = optionRe.exec(selectMatch[1])) !== null) {
      options.push({
        value: m[1],
        sn: m[2],
        role: m[3],
        name: decodeEntities(m[4]),
        selected: /selected/.test(m[5]),
        label: decodeEntities(m[6].trim()),
      })
    }
  }

  return { currentLabel, options }
})