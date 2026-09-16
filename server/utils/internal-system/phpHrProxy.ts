/**
 * PHP Backend Proxy Utility — 員工出勤查詢系統 (A110)
 *
 * 這個系統跟公務車系統類似，機構/單位/姓名三層下拉是原網站在 hr_menu.php
 * 首次載入時直接伺服器渲染成一長串 <option>（單位/姓名選單甚至沒有依機構
 * 分開，是全部機構混在一起的完整清單），选完機構/單位後才改用
 * api/hr_CL.php 的 JSON API 重新查詢，回傳格式明確（不用猜），所以這裡
 * 直接打 JSON API，不需要像公務車系統那樣 cheerio 解析 HTML。
 *
 * 機構代碼是固定的 11 種（原網站寫死在 hr_menu.php 的 <option> 裡，不是
 * 查資料庫來的），所以沒有對應的 fetch 函式，直接在前端頁面寫死清單即可。
 */

const BASE_URL = INTERNAL_SYSTEMS.A110

function isSessionExpired(text: string): boolean {
  return (
    text.includes('login.php') ||
    text.includes('請輸入你的帳號和密碼') ||
    text.includes('flogin')
  )
}

export interface HrOption {
  value: string
  label: string
}

/** 依機構代碼查詢單位清單（對應原網站 #org change → act=search_dep） */
export async function fetchHrDepartments(cookie: string, org: string): Promise<HrOption[]> {
  const url = new URL(`${BASE_URL}/api/hr_CL.php`)
  url.searchParams.set('act', 'search_dep')
  url.searchParams.set('i', org)

  const result = await internalSystemAgentRelayFetch('GET', url.toString(), {
    Cookie: cookie,
    'User-Agent': 'Mozilla/5.0',
  })

  if (isSessionExpired(result.bodyText)) {
    throw createError({ statusCode: 401, statusMessage: 'Session 已過期，請重新登入' })
  }

  let raw: Record<string, unknown>[]
  try {
    const parsed = JSON.parse(result.bodyText)
    raw = Array.isArray(parsed) ? parsed : []
  } catch {
    throw createError({ statusCode: 502, statusMessage: '舊系統回應格式非預期(非 JSON)' })
  }

  return raw
      .map((d) => ({
        value: String(d.department_number ?? ''),
        label: String(d.department_names ?? ''),
      }))
      .filter((d) => d.value && d.label)
}

/** 依機構＋單位代碼查詢員工清單（對應原網站 #department_number change → act=search_name） */
export async function fetchHrEmployees(cookie: string, org: string, department: string): Promise<HrOption[]> {
  const url = new URL(`${BASE_URL}/api/hr_CL.php`)
  url.searchParams.set('act', 'search_name')
  url.searchParams.set('o', org)
  url.searchParams.set('i', department)

  const result = await internalSystemAgentRelayFetch('GET', url.toString(), {
    Cookie: cookie,
    'User-Agent': 'Mozilla/5.0',
  })

  if (isSessionExpired(result.bodyText)) {
    throw createError({ statusCode: 401, statusMessage: 'Session 已過期，請重新登入' })
  }

  let raw: Record<string, unknown>[]
  try {
    const parsed = JSON.parse(result.bodyText)
    raw = Array.isArray(parsed) ? parsed : []
  } catch {
    throw createError({ statusCode: 502, statusMessage: '舊系統回應格式非預期(非 JSON)' })
  }

  return raw
      .map((d) => {
        const id = String(d.employee_id ?? '')
        const name = String(d.employee_name ?? '')
        return { value: id, label: id && name ? `${id}(${name})` : id || name }
      })
      .filter((d) => d.value)
}

/**
 * 一筆出勤打卡紀錄。欄位取自原網站 hbs 樣板（hbs/hr/hr_search.hbs）：
 * employee_name / employee_number / login_date / login_time / class_type
 * （1~6，對應上班/下班/休息開始/休息結束/假日加班開始/假日加班結束）/
 * card_number。「星期」原網站是樣板裡的 {{week login_date}} 算出來的，
 * 不是後端回傳欄位，前端自己從 login_date 算。
 */
export interface HrAttendanceRecord {
  employee_name: string
  employee_number: string
  login_date: string
  login_time: string
  class_type: string
  card_number: string
}

export interface HrSearchPayload {
  /** 機構代碼，對應表單欄位 org */
  org: string
  /** 單位代碼，對應表單欄位 ID */
  ID: string
  /** 員工編號，對應表單欄位 number */
  number: string
  /** 查詢起日，對應表單欄位 beg */
  beg: string
  /** 查詢迄日，對應表單欄位 end */
  end: string
}

/** 查詢出勤紀錄（對應原網站表單送出 → act=search_hr，整個 form serialize 送出） */
export async function searchHrAttendance(
    cookie: string,
    payload: HrSearchPayload
): Promise<HrAttendanceRecord[]> {
  const formData = new URLSearchParams()
  formData.append('org', payload.org)
  formData.append('ID', payload.ID)
  formData.append('number', payload.number)
  formData.append('beg', payload.beg)
  formData.append('end', payload.end)

  const result = await internalSystemAgentRelayFetch(
      'POST',
      `${BASE_URL}/api/hr_CL.php?act=search_hr`,
      {
        Cookie: cookie,
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'Mozilla/5.0',
      },
      formData.toString()
  )

  if (isSessionExpired(result.bodyText)) {
    throw createError({ statusCode: 401, statusMessage: 'Session 已過期，請重新登入' })
  }

  let raw: Record<string, unknown>[]
  try {
    const parsed = JSON.parse(result.bodyText)
    raw = Array.isArray(parsed) ? parsed : []
  } catch {
    throw createError({ statusCode: 502, statusMessage: '舊系統回應格式非預期(非 JSON)' })
  }

  return raw.map((r) => ({
    employee_name: String(r.employee_name ?? ''),
    employee_number: String(r.employee_number ?? ''),
    login_date: String(r.login_date ?? ''),
    login_time: String(r.login_time ?? ''),
    class_type: String(r.class_type ?? ''),
    card_number: String(r.card_number ?? ''),
  }))
}
