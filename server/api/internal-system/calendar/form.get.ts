import { getInternalSystemSessionCookie, internalSystemPhpGet, handleInternalSystemSessionExpired } from '../../../utils/internal-system/phpProxy'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const type = String(query.type ?? 'add')
  const cookie = getInternalSystemSessionCookie(event)

  let html = ''
  if (type === 'add') {
    const date = String(query.date ?? '')
    const params: Record<string, string> = {}
    if (date) params.andyy = date
    const res = await internalSystemPhpGet('add_calendar.php', cookie, params)
    if (res.sessionExpired) handleInternalSystemSessionExpired(event)
    html = res.html
  } else {
    const id = String(query.id ?? '')
    if (!id) throw createError({ statusCode: 400, statusMessage: 'Missing id' })
    const res = await internalSystemPhpGet('edit_calendar.php', cookie, { calendar_id: id })
    if (res.sessionExpired) handleInternalSystemSessionExpired(event)
    html = res.html
  }

  return parseFormData(html, type)
})

/** 取屬性值，支援有引號和無引號兩種格式 */
function attrVal(tag: string, attr: string): string {
  const quoted = new RegExp(`${attr}="([^"]*)"`, 'i').exec(tag)
  if (quoted) return quoted[1]
  const unquoted = new RegExp(`${attr}=([^\\s>"]+)`, 'i').exec(tag)
  if (unquoted) return unquoted[1]
  return ''
}

function parseFormData(html: string, type: string) {
  // 郵件收件人（無引號格式：name=e_mail[] value=xxx@...）
  const emailList: { name: string; email: string; checked: boolean }[] = []
  const emailRegex = /<input[^>]*name=(?:"e_mail\[\]"|e_mail\[\])[^>]*>/gi
  let m
  while ((m = emailRegex.exec(html)) !== null) {
    const tag = m[0]
    const email = attrVal(tag, 'value')
    if (!email) continue
    const checked = /\bchecked\b/i.test(tag)
    const afterTag = html.slice(m.index + tag.length, m.index + tag.length + 200)
    const fontMatch = afterTag.match(/<font[^>]*>([\s\S]*?)<\/font>/i)
    const fontText = fontMatch ? fontMatch[1].replace(/<[^>]+>/g, '').trim() : ''
    const nameMatch = fontText.match(/^([^(]+)\(/)
    const name = nameMatch ? nameMatch[1].trim() : fontText
    if (email && name) emailList.push({ email, name, checked })
  }

  // 承辦單位
  const units: { value: string; label: string; selected: boolean }[] = []
  const unitSection = html.match(/name=(?:"undertake_unit"|undertake_unit)[\s\S]+?<\/select>/i)?.[0] ?? ''
  const unitRegex = /(<option(?:\s[^>]*)?>)([^<\n]+)/gi
  while ((m = unitRegex.exec(unitSection)) !== null) {
    const tag = m[1]
    const label = m[2].trim()
    const valMatch = tag.match(/value=(?:"([^"]*)"|'([^']*)'|([^\s>'"][^\s>]*))/)
    const value = (valMatch?.[1] ?? valMatch?.[2] ?? valMatch?.[3] ?? '').trim()
    if (!value || !label) continue
    units.push({ value, label, selected: /\bselected\b/i.test(tag) })
  }

  // area
  const areas: { value: string; label: string; selected: boolean }[] = []
  const areaSection = html.match(/name=(?:"area"|area)[\s\S]+?<\/select>/i)?.[0] ?? ''
  const areaRegex = /(<option(?:\s[^>]*)?>)([^<\n]+)/gi
  while ((m = areaRegex.exec(areaSection)) !== null) {
    const tag = m[1]
    const label = m[2].trim()
    const valMatch = tag.match(/value=(?:"([^"]*)"|'([^']*)'|([^\s>'"][^\s>]*))/)
    const value = (valMatch?.[1] ?? valMatch?.[2] ?? valMatch?.[3] ?? '').trim()
    if (!label) continue
    const isSelected = /\bselected\b/i.test(tag)
    areas.push({ value, label, selected: isSelected })
  }

  // place
  const places: { value: string; label: string; selected: boolean }[] = []
  const placeSection = html.match(/id=(?:"place"|place)[\s\S]+?<\/select>/i)?.[0] ?? ''
  const placeRegex = /(<option(?:\s[^>]*)?>)([^<\n]+)/gi
  while ((m = placeRegex.exec(placeSection)) !== null) {
    const tag = m[1]
    const label = m[2].trim()
    const valMatch = tag.match(/value=(?:"([^"]*)"|'([^']*)'|([^\s>'"][^\s>]*))/)
    const value = (valMatch?.[1] ?? valMatch?.[2] ?? valMatch?.[3] ?? '').trim()
    if (!value || !label) continue
    const isSelected = /\bselected\b/i.test(tag)
    places.push({ value, label, selected: isSelected })
  }

  // 承辦人
  const undertakers: { value: string; label: string; selected: boolean }[] = []
  const undertakerSection = html.match(/name=(?:"undertaker"|undertaker)[\s\S]+?<\/select>/i)?.[0] ?? ''
  const undertakerRegex = /(<option(?:\s[^>]*)?>)([^<\n]+)/gi
  while ((m = undertakerRegex.exec(undertakerSection)) !== null) {
    const tag = m[1]
    const label = m[2].trim()
    const valMatch = tag.match(/value=(?:"([^"]*)"|'([^']*)'|([^\s>'"][^\s>]*))/)
    const value = (valMatch?.[1] ?? valMatch?.[2] ?? valMatch?.[3] ?? '').trim()
    if (!label) continue
    undertakers.push({ value, label, selected: /\bselected\b/i.test(tag) })
  }

  const prefill: Record<string, string> = {}

  // 通用：同時支援有無引號的 input value
  function getInputVal(name: string): string {
    const r = html.match(new RegExp(`name=(?:"${name}"|${name})[^>]*value=(?:"([^"]+)"|([^\\s>"]+))`, 'i'))
    return r ? (r[1] || r[2] || '') : ''
  }
  function getInputValAlt(name: string): string {
    // value 在 name 前面的情況
    const r = html.match(new RegExp(`value=(?:"([^"]+)"|([^\\s>"]+))[^>]*name=(?:"${name}"|${name})`, 'i'))
    return r ? (r[1] || r[2] || '') : ''
  }

  if (type === 'edit') {
    const idM = html.match(/name=(?:"calendar_id"|calendar_id)[^>]*value=(?:"(\d+)"|(\d+))/i)
    if (idM) prefill.calendar_id = idM[1] || idM[2]

    prefill.publish_start = getInputVal('publish_start')
    prefill.publish_end = getInputVal('publish_end')
    prefill.lecturer = getInputVal('lecturer')
    prefill.mail_notice_date = getInputVal('mail_notice_date')

    const startTime = html.match(/name=(?:"start_time"|start_time)[^>]*>([\s\S]*?)<\/textarea>/i)
    if (startTime) prefill.start_time = startTime[1].trim()
    const endTime = html.match(/name=(?:"end_time"|end_time)[^>]*>([\s\S]*?)<\/textarea>/i)
    if (endTime) prefill.end_time = endTime[1].trim()
    const subject = html.match(/name=(?:"subject"|subject)[^>]*>([\s\S]*?)<\/textarea>/i)
    if (subject) prefill.subject = subject[1].trim()
    const note = html.match(/name=(?:"note"|note)[^>]*>([\s\S]*?)<\/textarea>/i)
    if (note) prefill.note = note[1].trim()

    const cls = html.match(/name=(?:"classification"|classification)[^>]*value=(?:"([^"]+)"|'([^']+)'|([^\s>'"]+))[^>]*checked/i)
    if (cls) prefill.classification = cls[1] || cls[2] || cls[3]
    const dean = html.match(/name=(?:"dean"|dean)[^>]*value=(?:"([01])"|'([01])'|([01]))[^>]*checked/i)
    if (dean) prefill.dean = dean[1] || dean[2] || dean[3]
    const use = html.match(/name=(?:"use"|use)[^>]*value=(?:"([123])"|'([123])'|([123]))[^>]*checked/i)
    if (use) prefill.use = use[1] || use[2] || use[3]

    const pub = html.match(/發佈人姓名[\s\S]*?<td[^>]*>([\s\S]*?)<input/i)
    if (pub) prefill.publisher = pub[1].replace(/<[^>]+>/g, '').trim()

    const selUnit = units.find(u => u.selected)
    if (selUnit) prefill.undertake_unit = selUnit.value

    const selUndertaker = undertakers.find(u => u.selected)
    if (selUndertaker) prefill.undertaker = selUndertaker.value

    // area select 在此版 PHP HTML 不帶 selected attribute
    // place value 格式為 "P0F20101 森林好食光"，前兩碼為 area code，從中反推
    const selArea = areas.find(a => a.selected)
    if (selArea) {
      prefill.area = selArea.value
    } else if (places.length > 0) {
      // 所有 place 都屬於同一個 area，取第一筆的前兩碼
      const firstPlaceVal = (places.find(p => p.value) ?? places[0])?.value ?? ''
      if (firstPlaceVal) {
        const areaCode = firstPlaceVal.substring(0, 2)
        const matchedArea = areas.find(a => a.value === areaCode)
        if (matchedArea) prefill.area = matchedArea.value
      }
    }

    // place：抓有 selected 的；若都沒有，從 place value 前兩碼反推 area 後取第一個
    const selPlace = places.find(p => p.selected) ?? places.find(p => p.value)
    if (selPlace) {
      prefill.place = selPlace.value
      // 若 area 還沒有值，從 place value 前兩碼補
      if (!prefill.area && selPlace.value) {
        const areaCode = selPlace.value.substring(0, 2)
        const matchedArea = areas.find(a => a.value === areaCode)
        if (matchedArea) prefill.area = matchedArea.value
      }
    }

  } else {
    prefill.publish_start = getInputVal('publish_start') || getInputValAlt('publish_start')
    prefill.publish_end = getInputVal('publish_end') || getInputValAlt('publish_end')
    prefill.publish_name = getInputVal('publish_name') || getInputValAlt('publish_name')
    prefill.publish_employee_id = getInputVal('publish_employee_id') || getInputValAlt('publish_employee_id')

    // start_h：<option selected value=08> 或 <option value=08 selected>
    const shM = html.match(/<select[^>]*name=(?:"start_h"|start_h)[\s\S]*?<option\s+selected\s+value=(?:"([^"]+)"|([^\s>"]+))/i)
        || html.match(/<select[^>]*name=(?:"start_h"|start_h)[\s\S]*?<option[^>]*value=(?:"([^"]+)"|([^\s>"]+))[^>]*selected/i)
    if (shM) prefill.start_h = shM[1] || shM[2] || shM[3] || shM[4]

    const smM = html.match(/<select[^>]*name=(?:"start_m"|start_m)[\s\S]*?<option\s+selected\s+value=(?:"([^"]+)"|([^\s>"]+))/i)
        || html.match(/<select[^>]*name=(?:"start_m"|start_m)[\s\S]*?<option[^>]*value=(?:"([^"]+)"|([^\s>"]+))[^>]*selected/i)
    if (smM) prefill.start_m = smM[1] || smM[2] || smM[3] || smM[4]
  }

  return {
    emailList, units, areas, places, undertakers, prefill,
    _debug: {
      areaSection: areaSection.substring(0, 300),
      placeSection: placeSection.substring(0, 300),
      selectedArea: areas.find((a: any) => a.selected),
      selectedPlace: places.find((p: any) => p.selected),
    }
  }
}