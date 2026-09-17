/**
 * PHP Backend Proxy Utility — 公務車管理系統 (A114)
 *
 * 這個系統大部分頁面沒有乾淨的 JSON API，是傳統 PHP 伺服器渲染頁面
 * （選單/下拉選單選項、站點負責人清單都直接嵌在 HTML 裡）。作法比照購物車
 * 後台：打舊系統拿整頁 HTML，用 cheerio 解析出結構化資料再回傳給前端。
 *
 * 已完成：首頁（最新消息／站點負責人清單）、公務車線上申請「查看行事曆
 * ＋編輯／刪除既有預約」。
 *
 * 還沒做（原網站對應頁面的 Response 還沒拿到）：
 * - 新增預約：日曆空白處點擊會導去 public_car_calendar_car.php，這頁還沒有內容
 * - 公務車申請單管理列表：public_car_calendar_list.php
 * - 批量申請：public_car_calendar_multi_add.php
 *
 * 權限判斷（原網站是把目前登入者的員編直接寫死在 PHP 模板輸出的 JS 裡，
 * 例如 `site_manager == 'F00228'`）在這裡改成伺服器端用登入時存的
 * employee_id cookie 比對，見 fetchVehicleBookingEvents 的 editable 欄位，
 * 前端不用也不該自己判斷權限。
 */
import * as cheerio from 'cheerio'

const BASE_URL = INTERNAL_SYSTEMS.A114

function isSessionExpired(html: string): boolean {
  return (
    html.includes('login.php') ||
    html.includes('請輸入你的帳號和密碼') ||
    html.includes('flogin')
  )
}

export interface VehicleHeadStaff {
  name: string
  email: string
}

export interface VehicleSiteStaff {
  site: string
  main: string
  /** 行政負責人；未設定時原樣保留「尚未設定 行政負責人」文字，前端自行判斷樣式 */
  admin: string
}

export interface VehicleHomeData {
  newsHtml: string
  headStaff: VehicleHeadStaff[]
  siteStaff: VehicleSiteStaff[]
}

/** 抓首頁（最新消息 + 各站點負責人清單），解析成結構化資料 */
export async function fetchVehicleHome(cookie: string): Promise<VehicleHomeData> {
  const result = await internalSystemAgentRelayFetch(
    'GET',
    `${BASE_URL}/index.php`,
    {
      Cookie: cookie,
      'User-Agent': 'Mozilla/5.0',
    }
  )

  const html = result.bodyText
  if (isSessionExpired(html)) {
    throw createError({ statusCode: 401, statusMessage: 'Session 已過期，請重新登入' })
  }

  const $ = cheerio.load(html)

  const newsHtml = $('#newsArea').html()?.trim() ?? ''

  const tables = $('#site table')

  const headStaff: VehicleHeadStaff[] = []
  $(tables[0])
    .find('tbody tr')
    .each((_, tr) => {
      const tds = $(tr).find('td')
      const name = $(tds[0]).text().trim()
      const email = $(tds[1]).text().trim()
      if (name) headStaff.push({ name, email })
    })

  const siteStaff: VehicleSiteStaff[] = []
  $(tables[1])
    .find('tbody tr')
    .each((_, tr) => {
      const tds = $(tr).find('td')
      const site = $(tds[0]).text().trim()
      const main = $(tds[1]).text().replace(/\s+/g, ' ').trim()
      const admin = $(tds[2]).text().replace(/\s+/g, ' ').trim()
      if (site) siteStaff.push({ site, main, admin })
    })

  return { newsHtml, headStaff, siteStaff }
}

/* =========================================================
 * 公務車線上申請 — 行事曆 / 編輯 / 刪除
 * =======================================================*/

export interface VehicleOption {
  value: string
  label: string
}

export interface VehicleSiteTab {
  /** 例如 st001 */
  id: string
  label: string
}

export interface VehicleBookingMeta {
  carOptions: VehicleOption[]
  /** 申請人清單（#employe），跟駕駛清單人數/內容不完全一樣，分開存 */
  applicantOptions: VehicleOption[]
  driverOptions: VehicleOption[]
  departmentOptions: VehicleOption[]
  sites: VehicleSiteTab[]
}

function parseSelectOptions($: cheerio.CheerioAPI, selector: string): VehicleOption[] {
  const options: VehicleOption[] = []
  $(selector)
    .find('option')
    .each((_, opt) => {
      const value = $(opt).attr('value') ?? ''
      const label = $(opt).text().trim()
      if (value && label) options.push({ value, label })
    })
  return options
}

/** 抓「公務車線上申請」頁面的下拉選單選項＋站點分頁清單（車輛、申請人、駕駛、使用單位都是舊系統伺服器渲染的固定選項，不是另外打 API） */
export async function fetchVehicleBookingMeta(cookie: string): Promise<VehicleBookingMeta> {
  const result = await internalSystemAgentRelayFetch(
    'GET',
    `${BASE_URL}/public_car_calendar.php`,
    {
      Cookie: cookie,
      'User-Agent': 'Mozilla/5.0',
    }
  )

  const html = result.bodyText
  if (isSessionExpired(html)) {
    throw createError({ statusCode: 401, statusMessage: 'Session 已過期，請重新登入' })
  }

  const $ = cheerio.load(html)

  const carOptions = parseSelectOptions($, '#sort_car')
  const applicantOptions = parseSelectOptions($, '#employe')
  const driverOptions = parseSelectOptions($, '#driver')
  const departmentOptions = parseSelectOptions($, '#department')

  const sites: VehicleSiteTab[] = []
  $('.nav-tabs li a[data-toggle="tab"]').each((_, a) => {
    const id = $(a).attr('id') ?? ''
    if (!id.startsWith('btnst')) return // 排除「全部」(btnAll，對應 #calendar 而不是特定站點)
    const siteId = id.replace('btn', '')
    const label = $(a).text().trim()
    if (siteId && label) sites.push({ id: siteId, label })
  })

  return { carOptions, applicantOptions, driverOptions, departmentOptions, sites }
}

/**
 * 一筆公務車申請單事件。欄位是照 public_car_calendar.php 裡 eventClick
 * handler 讀取 calEvent.xxx 的用法反推出來的，原網站沒給過實際 JSON
 * 範例，所以用 [key: string]: unknown 保底，避免漏欄位或猜錯欄位名稱
 * 導致資料整個消失；editable 是這裡額外算出來附加的，原網站沒有這個欄位。
 */
export interface VehicleBookingEvent {
  id?: string
  /** 申請人員編（已用實際 API 回應核對過：title 裡顯示的姓名對應這個欄位，不是 employee_user_id） */
  employee_id?: string
  /** 駕駛員編 */
  employee_user_id?: string
  applicant_department?: string
  department_name?: string
  start_date?: string
  end_date?: string
  start_time?: string
  end_time?: string
  car_id?: string
  public_car_name?: string
  destination?: string
  st?: string
  note?: string
  site_manager?: string
  site_manager_sec?: string
  /** 「-結束時間(車牌) 申請人姓名」，原網站搭配 FullCalendar 自動補開始時間前綴一起顯示 */
  title?: string
  editable: boolean
  /** 是否為目前登入者本人的申請單（比照原網站「顯示其他申請單」篩選邏輯：employee_user_id 或 employee_id 等於自己） */
  isOwn: boolean
  [key: string]: unknown
}

/**
 * 抓某個站點（或 'All' 全部）在指定日期範圍內的申請單事件。
 * editable 判斷比照原網站 eventClick 裡的邏輯：申請日期 >= 今天，且
 * 目前登入者是該筆的站點管理員（site_manager / site_manager_sec）或
 * 申請人本人（employee_user_id）——原網站是把員編直接寫死在 PHP 輸出的
 * JS 裡判斷，這裡改成伺服器端拿登入時存的 employee_id cookie 比對，
 * 前端不用（也不該）自己做這個判斷。
 */
export async function fetchVehicleBookingEvents(
  cookie: string,
  site: string,
  start: string,
  end: string,
  myEmployeeId: string
): Promise<VehicleBookingEvent[]> {
  const url = new URL(`${BASE_URL}/public_car_calendar_CL.php`)
  url.searchParams.set('act', `search${site}`)
  url.searchParams.set('start', start)
  url.searchParams.set('end', end)

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

  const today = new Date().toISOString().slice(0, 10)

  return raw.map((ev) => {
    const siteManager = String(ev.site_manager ?? '')
    const siteManagerSec = String(ev.site_manager_sec ?? '')
    const employeeUserId = String(ev.employee_user_id ?? '')
    const employeeId = String(ev.employee_id ?? '')
    const startDate = String(ev.start_date ?? '')

    const isOwn = Boolean(
      myEmployeeId && (employeeUserId === myEmployeeId || employeeId === myEmployeeId)
    )

    const isManaged = Boolean(
      myEmployeeId && (siteManager === myEmployeeId || siteManagerSec === myEmployeeId)
    )

    const editable = Boolean((isOwn || isManaged) && startDate >= today)

    return { ...ev, editable, isOwn } as VehicleBookingEvent
  })
}

export interface VehicleBookingActionResult {
  rs: string
  msg: string
  url?: string
}

/** 修改申請單。原網站的編輯 modal 裡申請人/公務車/使用單位是唯讀的，實際可改的只有駕駛、日期時間、前往地點、狀態、備註 */
export async function updateVehicleBooking(
  cookie: string,
  payload: Record<string, string>
): Promise<VehicleBookingActionResult> {
  const formData = new URLSearchParams()
  Object.entries(payload).forEach(([k, v]) => formData.append(k, v ?? ''))

  const result = await internalSystemAgentRelayFetch(
    'POST',
    `${BASE_URL}/public_car_calendar_CL.php?act=update`,
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
  try {
    return JSON.parse(result.bodyText)
  } catch {
    throw createError({ statusCode: 502, statusMessage: '舊系統回應格式非預期(非 JSON)' })
  }
}

export async function deleteVehicleBooking(
  cookie: string,
  loanRecordId: string
): Promise<VehicleBookingActionResult> {
  const result = await internalSystemAgentRelayFetch(
    'POST',
    `${BASE_URL}/public_car_calendar_CL.php?act=del`,
    {
      Cookie: cookie,
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent': 'Mozilla/5.0',
    },
    `loan_record_id=${encodeURIComponent(loanRecordId)}`
  )

  if (isSessionExpired(result.bodyText)) {
    throw createError({ statusCode: 401, statusMessage: 'Session 已過期，請重新登入' })
  }
  try {
    return JSON.parse(result.bodyText)
  } catch {
    throw createError({ statusCode: 502, statusMessage: '舊系統回應格式非預期(非 JSON)' })
  }
}

/* =========================================================
 * 公務車線上申請 — 新增預約（選擇公務車頁）
 * =======================================================*/

/** 從 public_car_calendar_car.php 內嵌的 `employeeDep['A00003'] = 'H|H1';` 這種 JS 賦值解析出「申請人 -> 使用單位代碼」對照表（原網站用來在選申請人時自動帶出使用單位） */
function parseEmployeeDepartmentMap(html: string): Record<string, string> {
  const map: Record<string, string> = {}
  const regex = /employeeDep\['([^']+)'\]\s*=\s*'([^']*)'/g
  let match: RegExpExecArray | null
  while ((match = regex.exec(html)) !== null) {
    map[match[1]] = match[2]
  }
  return map
}

export interface VehicleAddMeta {
  applicantOptions: VehicleOption[]
  driverOptions: VehicleOption[]
  departmentOptions: VehicleOption[]
  /** 申請人員編 -> 使用單位代碼，選申請人時自動帶出使用單位用 */
  employeeDepartmentMap: Record<string, string>
}

/** 抓「新增預約」頁面的下拉選單選項＋申請人-使用單位對照表 */
export async function fetchVehicleAddMeta(cookie: string): Promise<VehicleAddMeta> {
  const result = await internalSystemAgentRelayFetch(
    'GET',
    `${BASE_URL}/public_car_calendar_car.php`,
    {
      Cookie: cookie,
      'User-Agent': 'Mozilla/5.0',
    }
  )

  const html = result.bodyText
  if (isSessionExpired(html)) {
    throw createError({ statusCode: 401, statusMessage: 'Session 已過期，請重新登入' })
  }

  const $ = cheerio.load(html)

  return {
    applicantOptions: parseSelectOptions($, '#employe'),
    driverOptions: parseSelectOptions($, '#driver'),
    departmentOptions: parseSelectOptions($, '#department'),
    employeeDepartmentMap: parseEmployeeDepartmentMap(html),
  }
}

/**
 * 一筆可借用公務車。原網站前端是把整個 row 物件（扣掉數字 key、砍掉前 3 個
 * 值）硬塞進 DataTable 欄位，沒有拿到過乾淨的欄位對照表，所以除了 car_id /
 * public_car_name / photo_name1（前端 JS 明確用到的這三個）以外的欄位名稱
 * 是不確定的，用 [key: string]: unknown 保底全部帶過去，前端頁面顯示不完整
 * 的話要請使用者回報 Network 分頁裡這支 API 的實際回應內容再補。
 */
export interface VehicleAvailableCar {
  car_id?: string
  public_car_name?: string
  photo_name1?: string
  [key: string]: unknown
}

/** 查詢指定時間範圍內可借用的公務車（public_car_calendar_car.php 的搜尋表單送出時打的 API） */
export async function searchAvailableCars(
  cookie: string,
  startDateTime: string,
  endDateTime: string
): Promise<VehicleAvailableCar[]> {
  const formData = new URLSearchParams()
  formData.append('startDateTime', startDateTime)
  formData.append('endDateTime', endDateTime)

  const result = await internalSystemAgentRelayFetch(
    'POST',
    `${BASE_URL}/public_car_calendar_CL.php?act=searchCar`,
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

  let parsed: { rs?: string | number; msg?: string; data?: VehicleAvailableCar[] }
  try {
    parsed = JSON.parse(result.bodyText)
  } catch {
    throw createError({ statusCode: 502, statusMessage: '舊系統回應格式非預期(非 JSON)' })
  }

  // 這支 API 舊系統回的 rs 是數字 1（不像其他支 API 是字串 "1"），用 == 寬鬆比對兩種都吃
  if (parsed.rs != 1) {
    const raw = result.bodyText.slice(0, 500)
    throw createError({
      statusCode: 400,
      statusMessage: parsed.msg || `查詢失敗（舊系統無訊息文字，原始回應：${raw}）`,
    })
  }
  return Array.isArray(parsed.data) ? parsed.data : []
}

/** 新增申請單（原網站「補登紀錄」「跨日借用」這兩個選項目前對這個帳號是隱藏的，所以這裡固定走單日借用流程，不支援跨日／補登） */
export async function addVehicleBooking(
  cookie: string,
  payload: Record<string, string>
): Promise<VehicleBookingActionResult> {
  const formData = new URLSearchParams()
  Object.entries(payload).forEach(([k, v]) => formData.append(k, v ?? ''))

  const result = await internalSystemAgentRelayFetch(
    'POST',
    `${BASE_URL}/public_car_calendar_CL.php?act=add`,
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
  try {
    return JSON.parse(result.bodyText)
  } catch {
    throw createError({ statusCode: 502, statusMessage: '舊系統回應格式非預期(非 JSON)' })
  }
}

/* =========================================================
 * 公務車線上申請 — 批量申請
 * =======================================================*/

export interface VehicleMultiAddMeta {
  applicantOptions: VehicleOption[]
  driverOptions: VehicleOption[]
  departmentOptions: VehicleOption[]
  /** 這頁的公務車選擇是一份獨立的固定清單（原網站只列了 13 台車），跟「選擇公務車」頁那個依時間查詢出來的完整清單是兩回事 */
  carOptions: VehicleOption[]
  employeeDepartmentMap: Record<string, string>
}

/** 抓「公務車批量申請」頁面的下拉選單選項＋申請人-使用單位對照表 */
export async function fetchVehicleMultiAddMeta(cookie: string): Promise<VehicleMultiAddMeta> {
  const result = await internalSystemAgentRelayFetch(
    'GET',
    `${BASE_URL}/public_car_calendar_multi_add.php`,
    {
      Cookie: cookie,
      'User-Agent': 'Mozilla/5.0',
    }
  )

  const html = result.bodyText
  if (isSessionExpired(html)) {
    throw createError({ statusCode: 401, statusMessage: 'Session 已過期，請重新登入' })
  }

  const $ = cheerio.load(html)

  return {
    applicantOptions: parseSelectOptions($, '#employe'),
    driverOptions: parseSelectOptions($, '#driver'),
    departmentOptions: parseSelectOptions($, '#department'),
    carOptions: parseSelectOptions($, '#car_id'),
    employeeDepartmentMap: parseEmployeeDepartmentMap(html),
  }
}

/** 批量新增申請單：同一台車/同一段時間，一次對多個選取的日期各建一張申請單 */
export async function submitVehicleMultiAdd(
  cookie: string,
  payload: {
    employe: string
    driver: string
    car_id: string
    department: string
    start_time: string
    end_time: string
    destination: string
    note: string
    select_date: string[]
  }
): Promise<VehicleBookingActionResult> {
  const formData = new URLSearchParams()
  formData.append('employe', payload.employe)
  formData.append('driver', payload.driver)
  formData.append('car_id', payload.car_id)
  formData.append('department', payload.department)
  formData.append('start_time', payload.start_time)
  formData.append('end_time', payload.end_time)
  formData.append('destination', payload.destination)
  formData.append('note', payload.note)
  // 原網站前端是 JSON.stringify(selectedDates) 當成單一欄位送出，不是逐筆 append
  formData.append('select_date', JSON.stringify(payload.select_date))

  const result = await internalSystemAgentRelayFetch(
    'POST',
    `${BASE_URL}/public_car_calendar_CL.php?act=multiAdd`,
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
  try {
    return JSON.parse(result.bodyText)
  } catch {
    throw createError({ statusCode: 502, statusMessage: '舊系統回應格式非預期(非 JSON)' })
  }
}

/* =========================================================
 * 公務車線上申請 — 申請單管理列表
 * =======================================================*/

/**
 * 一筆申請單管理列表資料。這頁的 JS 裡有明確用到具名欄位（跟前面幾頁只能
 * 靠猜的不一樣），欄位名稱取自 eventClick/`data-xxx` 綁定：applicant_id、
 * driver_id、applicant_department、car_id、startDate、startTime、endDate、
 * endTime、destination、notes、loan_st、site_manager、site_manager_sec、
 * loan_record_id。「車輛所屬站點」這欄原網站是拿來做分頁篩選用，沒有明確
 * 欄位名稱來源，這裡沒有實作站點分頁篩選（跟「選擇公務車」頁同樣的限制）。
 */
export interface VehicleLoanRecord {
  loan_record_id?: string
  applicant_id?: string
  driver_id?: string
  applicant_department?: string
  car_id?: string
  startDate?: string
  startTime?: string
  endDate?: string
  endTime?: string
  destination?: string
  notes?: string
  loan_st?: string
  site_manager?: string
  site_manager_sec?: string
  editable: boolean
  [key: string]: unknown
}

/**
 * 查詢申請單管理列表。editable 判斷比照原網站（原網站還有「最高管理員/
 * 總站負責人可編輯任意單」這條規則，但這裡沒有辦法知道目前登入者是不是
 * admin 等級角色，所以只保留「站點負責人/站點行政負責人可編輯自己站點
 * 尚未開始的申請單」這條，較保守，不會讓不該編輯的人多看到編輯權限）
 */
export async function searchVehicleLoanRecords(
  cookie: string,
  startDate: string,
  endDate: string,
  myEmployeeId: string
): Promise<VehicleLoanRecord[]> {
  const formData = new URLSearchParams()
  formData.append('startDate', startDate)
  formData.append('endDate', endDate)

  const result = await internalSystemAgentRelayFetch(
    'POST',
    `${BASE_URL}/public_car_calendar_CL.php?act=searchUselist`,
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

  let parsed: { rs?: string; msg?: string; data?: Record<string, unknown>[] }
  try {
    parsed = JSON.parse(result.bodyText)
  } catch {
    throw createError({ statusCode: 502, statusMessage: '舊系統回應格式非預期(非 JSON)' })
  }

  if (parsed.rs !== '1') {
    throw createError({ statusCode: 400, statusMessage: parsed.msg ?? '查詢失敗' })
  }

  const rows = Array.isArray(parsed.data) ? parsed.data : []
  const today = new Date().toISOString().slice(0, 10)

  return rows.map((row) => {
    const siteManager = String(row.site_manager ?? '')
    const siteManagerSec = String(row.site_manager_sec ?? '')
    const startDateVal = String(row.startDate ?? '')

    const isManaged = Boolean(
      myEmployeeId && (siteManager === myEmployeeId || siteManagerSec === myEmployeeId)
    )
    const editable = Boolean(isManaged && startDateVal >= today)

    return { ...row, editable } as VehicleLoanRecord
  })
}

/** 一鍵停用查詢結果中的所有申請單（selectSite 這裡固定傳空字串，因為沒實作站點分頁篩選） */
export async function disableAllVehicleLoanResults(
  cookie: string,
  payload: { startDate: string; endDate: string; selectCar: string; selectSite: string }
): Promise<VehicleBookingActionResult> {
  const formData = new URLSearchParams()
  formData.append('startDate', payload.startDate)
  formData.append('endDate', payload.endDate)
  formData.append('selectCar', payload.selectCar)
  formData.append('selectSite', payload.selectSite)

  const result = await internalSystemAgentRelayFetch(
    'POST',
    `${BASE_URL}/public_car_calendar_CL.php?act=disableAllResult`,
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
  try {
    return JSON.parse(result.bodyText)
  } catch {
    throw createError({ statusCode: 502, statusMessage: '舊系統回應格式非預期(非 JSON)' })
  }
}
