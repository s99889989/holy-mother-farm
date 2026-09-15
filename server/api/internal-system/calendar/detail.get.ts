import { getInternalSystemSessionCookie, internalSystemPhpGet, handleInternalSystemSessionExpired } from '../../../utils/internal-system/phpProxy'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const id = String(query.id ?? '')
  if (!id) throw createError({ statusCode: 400, statusMessage: 'Missing id' })

  const cookie = getInternalSystemSessionCookie(event)
  const { html, sessionExpired } = await internalSystemPhpGet('calendar_detail.php', cookie, { calendar_id: id })

  if (sessionExpired) handleInternalSystemSessionExpired(event)

  return parseDetail(html)
})

function parseDetail(html: string) {
  const fields: Record<string, string> = {}

  const rowRegex = /<td[^>]*class="td11"[^>]*><strong>([^<]+)<\/strong><\/td>\s*<td[^>]*class="td21"[^>]*>([\s\S]*?)<\/td>/g
  let m
  while ((m = rowRegex.exec(html)) !== null) {
    const label = m[1].replace(/\*/g, '').replace(/&nbsp;/g, '').trim()
    const value = m[2].replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').trim()
    fields[label] = value
  }

  const subjectMatch = html.match(/name="subject"[^>]*>([\s\S]*?)<\/textarea>/)
  const noteMatch = html.match(/name="note"[^>]*>([\s\S]*?)<\/textarea>/)
  if (subjectMatch) fields['主題'] = subjectMatch[1].trim()
  if (noteMatch) fields['備註'] = noteMatch[1].trim()

  return { fields }
}