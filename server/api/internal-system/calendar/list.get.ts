import { getInternalSystemSessionCookie, internalSystemPhpGet, handleInternalSystemSessionExpired } from '../../../utils/internal-system/phpProxy'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const cookie = getInternalSystemSessionCookie(event)

  const params: Record<string, string> = {}
  if (query.m) params.m = String(query.m)
  if (query.y) params.y = String(query.y)

  const { html, sessionExpired } = await internalSystemPhpGet('edit_calendar_list.php', cookie, params)
  if (sessionExpired) handleInternalSystemSessionExpired(event)

  return parseCalendarList(html)
})

function stripTags(html: string): string {
  return html.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim()
}

function parseEvent(anchorHtml: string, type: 'view' | 'edit', calendarId: string): EventData {
  // edit 活動有外層 <font color=ff0000> 包住整段，先剝掉
  let html = anchorHtml.trim()
  const outerFont = html.match(/^<font\s[^>]*color=(?:"?)ff0000(?:"?)[^>]*>([\s\S]*)<\/font>\s*$/i)
  if (outerFont) html = outerFont[1].trim()

  // 抓地點 font（color=ff0000）
  let location = ''
  let locationCode = ''
  const locFont = html.match(/<font\s[^>]*color=(?:"?)ff0000(?:"?)[^>]*>([\s\S]*?)<\/font>/i)
  if (locFont) {
    // 去掉空格：原始可能是 "P0I10201 水電實習廠" 或 " P0I10201 水電實習廠"
    const locContent = locFont[1].trim()
    const locParts = locContent.split(/\s+/).filter(Boolean)
    if (locParts.length >= 2) {
      locationCode = locParts[0]
      location = locParts.slice(1).join(' ')
    } else {
      location = locContent
    }
  }

  // 去掉所有 font 標籤，取純文字
  const rawText = html
      .replace(/<font[^>]*>[\s\S]*?<\/font>/gi, '')
      .replace(/<[^>]+>/g, '')
      .replace(/\s+/g, ' ')
      .trim()

  // 時間
  const timeMatch = rawText.match(/^(\d{2}:\d{2})-(\d{2}:\d{2})/)
  const startTime = timeMatch?.[1] ?? ''
  const endTime = timeMatch?.[2] ?? ''

  // 單位（末尾中文）
  const unitMatch = rawText.match(/(醫院|園區|芳心|太麻里|大溪|嘉蘭|池上|小馬|泰源|東河|綠島|蘭嶼|成功|大武|都蘭)\s*$/)
  const unit = unitMatch?.[1] ?? ''

  // 人名：最後一個 ( 和 ) 之間
  const personMatch = rawText.match(/\(([^()]+)\)[^()]*$/)
  const person = personMatch ? personMatch[1].trim() : ''

  // 標題：時間後到 ( 之前（去掉省略號）
  let title = rawText
  if (timeMatch) title = title.slice(timeMatch[0].length).trim()
  title = title.replace(/\s*\.+\s*\(.*$/s, '').replace(/\s*\(.*$/s, '').trim()

  return { calendarId, type, startTime, endTime, title, person, location, locationCode, unit, isEditable: type === 'edit' }
}

function parseCalendarList(html: string) {
  const result = { year: 0, month: 0, days: [] as DayData[], remarks: [] as string[] }

  // 年月
  const titleMatch = html.match(/(\d{4})年(\d{1,2})月/)
  if (titleMatch) {
    result.year = parseInt(titleMatch[1])
    result.month = parseInt(titleMatch[2])
  }

  // 因為 HTML 結構混亂（有無引號、嵌套錯誤），改用全域搜尋活動連結
  // 先找所有日期連結（add_calendar）取得日期和位置
  // 格式：href=add_calendar.php?andyy= 2026-07-01 或 href="add_calendar.php?andyy=2026-06-01"
  const addLinkRegex = /href=(?:"?)add_calendar\.php\?(?:andyy=\s*(\d{4}-\d{2}-\d{2})|y=(\d{4})&(?:amp;)?m=(\d+)&(?:amp;)?i=(\d+))[^>]*>[\s\S]*?<font[^>]*>\s*(\d+)\s*<\/font>/gi
  const dayPositions: { day: number; date: string; index: number }[] = []
  let m

  while ((m = addLinkRegex.exec(html)) !== null) {
    let date = ''
    if (m[1]) {
      date = m[1].trim()
    } else if (m[2] && m[3] && m[4]) {
      // y=2026&m=6&i=15 格式
      date = `${m[2]}-${String(parseInt(m[3])).padStart(2, '0')}-${String(parseInt(m[4])).padStart(2, '0')}`
    }
    const day = parseInt(m[5])
    if (day && date) {
      dayPositions.push({ day, date, index: m.index })
    }
  }

  // 找所有活動連結（calendar_detail 或 edit_calendar）
  // 格式：href=calendar_detail.php?calendar_id= 14322 或 href="calendar_detail.php?calendar_id=14239"
  const eventRegex = /href=(?:"?)(calendar_detail|edit_calendar)\.php\?calendar_id=\s*(\d+)(?:"?)[^>]*>([\s\S]*?)<\/a>/gi
  const allEvents: { type: 'view' | 'edit'; calendarId: string; innerHtml: string; index: number }[] = []

  while ((m = eventRegex.exec(html)) !== null) {
    allEvents.push({
      type: m[1] === 'edit_calendar' ? 'edit' : 'view',
      calendarId: m[2].trim(),
      innerHtml: m[3],
      index: m.index,
    })
  }

  // 把活動分配到對應的日期
  // 原則：活動的位置 > 該日期連結的位置，且 < 下一個日期連結的位置
  for (let i = 0; i < dayPositions.length; i++) {
    const dayPos = dayPositions[i]
    const nextDayPos = dayPositions[i + 1]
    const startIdx = dayPos.index
    const endIdx = nextDayPos ? nextDayPos.index : html.length

    const dayEvents = allEvents
        .filter(ev => ev.index > startIdx && ev.index < endIdx)
        .map(ev => parseEvent(ev.innerHtml, ev.type, ev.calendarId))

    // 今天（bgcolor=00ffff 在該日期格子附近）
    const surroundHtml = html.slice(Math.max(0, startIdx - 50), startIdx + 100)
    const isToday = /bgcolor=(?:"?)00ffff(?:"?)/i.test(surroundHtml)

    result.days.push({ day: dayPos.day, date: dayPos.date, events: dayEvents, isToday })
  }

  // 備註
  const remarkRegex = /<font\s[^>]*color=(?:"?)black(?:"?)[^>]*>([\s\S]*?)<\/font>/gi
  while ((m = remarkRegex.exec(html)) !== null) {
    const text = stripTags(m[1]).trim()
    if (text) result.remarks.push(text)
  }

  return result
}

interface EventData {
  calendarId: string
  type: 'view' | 'edit'
  startTime: string
  endTime: string
  title: string
  person: string
  location: string
  locationCode: string
  unit: string
  isEditable: boolean
}

interface DayData {
  day: number
  date: string
  events: EventData[]
  isToday: boolean
}