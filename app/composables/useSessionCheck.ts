// composables/useSessionCheck.ts
//
// 原本 middleware/holy-auth.global.ts 的 10 分鐘週期檢查，跟
// layouts/staff.vue 的 visibilitychange（iOS 從背景切回）檢查，
// 是兩套各自獨立、互不知情的「打 /holy/customer/me 驗證 cookie」邏輯。
//
// 手機從背景切回前景那一刻最容易出事：
//   1. visibilitychange 先觸發一次驗證，這時網路堆疊可能還沒完全就緒。
//   2. 使用者幾乎同時觸發了一次路由導覽，middleware 自己的 10 分鐘
//      計時器（不知道剛剛才驗證過）又整個重新打一次 /me。
//   3. 兩次結果對不上，畫面就在「原頁面 → 被踢回首頁 → 又能進去」
//      之間跳，也就是「登入檢查體驗不好、切來跳去」的來源。
//
// 把驗證邏輯與「最後驗證時間 / 是否正在驗證中」的狀態抽到這裡共用，
// 兩邊都不會重複打，也不會因為對方剛驗證過又馬上再驗一次。
import { useCustomerStore } from '~/stores/customer'
import { usePermissionStore } from '~/stores/permission'

const CHECK_INTERVAL = 10 * 60 * 1000 // 10 分鐘
let lastCheckedAt = 0
let checking = false

async function callMe(mainUrl: string) {
  return fetch(`${mainUrl}/holy/customer/me`, { credentials: 'include' })
}

// reason 是給除錯面板看的，用來分辨這次登出是從哪個判斷路徑觸發的
// （data.error 明確登出 / 連續 401/403 / 使用者手動按登出），
// 之後如果又遇到 customer 莫名變 null，可以直接從這個記錄回推成因，
// 不用再靠猜的。
async function doLogout(mainUrl: string, reason: string) {
  lastCheckedAt = 0
  const customerStore = useCustomerStore()
  customerStore.clearCustomer(reason)
  usePermissionStore().clear()
  try {
    await fetch(`${mainUrl}/holy/customer/logout`, { method: 'POST', credentials: 'include' })
  } catch { /* ignore */ }
}

interface VerifyOptions {
  // 忽略 10 分鐘節流，一定重新驗證一次（例如 iOS 從背景切回時）
  force?: boolean
  // 第一次失敗時，延遲後再試一次，避免把「網路還沒就緒」
  // 誤判成「session 失效」（比照 permission.js 的重試策略）
  retryOnFail?: boolean
}

// ── 單次 /me 呼叫（內部用）─────────────────────────────────────────
// 不管是網路例外（fetch 拋錯）還是 HTTP 狀態碼本身，一律往上丟，
// 交給 verifySession() 統一決定要不要重試。過去的寫法只在 fetch
// 拋例外時重試，401 這種「回應本身」卻直接判定登出——但 iOS 從背景
// 切回前景那一刻，cookie 常常還沒正確帶上，這種情況產生的 401 只是
// 暫時性的，不代表真的登出，需要跟 permission.js 一樣重試後才能採信。
async function fetchMe(mainUrl: string) {
  const res = await callMe(mainUrl)
  if (res.status === 401 || res.status === 403) {
    const err = new Error(`me ${res.status}`)
    ;(err as any).status = res.status
    throw err
  }
  return res
}

export async function verifySession(mainUrl: string, options: VerifyOptions = {}) {
  const { force = false, retryOnFail = false } = options
  const customerStore = useCustomerStore()

  if (!customerStore.isLoggedIn) return { loggedOut: false, skipped: false }

  // 已經有另一邊在驗證中 → 這次直接跳過，不要重複打 /me
  if (checking) return { loggedOut: false, skipped: true }

  const now = Date.now()
  if (!force && now - lastCheckedAt <= CHECK_INTERVAL) {
    return { loggedOut: false, skipped: true }
  }

  checking = true
  try {
    let lastErr: any = null

    for (let attempt = 0; attempt < 2; attempt++) {
      if (attempt === 1) {
        // 第一次失敗後，稍等一下再試一次，讓網路/cookie 有機會恢復
        await new Promise(resolve => setTimeout(resolve, 1200))
      }
      try {
        const res = await fetchMe(mainUrl)

        if (!res.ok) {
          // 5xx / 502 / 503 / 504 等閘道逾時，跟登入狀態無關，不強制登出，
          // 只重置 lastCheckedAt，讓下次導覽/切回前景再驗證一次
          lastCheckedAt = 0
          return { loggedOut: false, skipped: false }
        }

        const data = await res.json()
        if (data.error) {
          // 後端明確表示「沒有這個登入」，不是暫時性的，直接判定登出
          await doLogout(mainUrl, `verifySession: /me 回傳 data.error（${JSON.stringify(data.error)}）`)
          return { loggedOut: true, skipped: false }
        }

        lastCheckedAt = now
        return { loggedOut: false, skipped: false }
      } catch (err) {
        lastErr = err
        if (!retryOnFail) break
      }
    }

    // 兩次都失敗（或 retryOnFail=false 時的單次失敗）
    const status = lastErr?.status
    if (status === 401 || status === 403) {
      // 連續兩次都明確是 401/403，才視為真的 session 失效
      await doLogout(mainUrl, `verifySession: /me 連續回傳 ${status}（retryOnFail=${retryOnFail}）`)
      return { loggedOut: true, skipped: false }
    }

    // 網路斷線 / timeout 等暫時性錯誤：不登出，等下次再檢查
    lastCheckedAt = 0
    return { loggedOut: false, skipped: false }
  } finally {
    checking = false
  }
}

// ── 嘗試恢復登入狀態（customer 是 null 時使用）───────────────────
// 過去的邏輯：只要 customerStore.isLoggedIn 是 false，verifySession()
// 一開始就直接放棄（見上面 `if (!customerStore.isLoggedIn) return`），
// 從來沒有機會去問後端「session cookie 其實是不是還有效」。
//
// 但實測發現：即使 localStorage 裡的 customer 資料整個消失（例如
// iOS Safari 的 ITP 機制，在網站一段時間沒被判定為「主要使用」時，
// 會清掉該網站的 localStorage），session cookie 本身不一定跟著失效
// ——這兩者是各自獨立的儲存機制。過去的寫法把「localStorage 有沒有
// customer 資料」直接當成「有沒有登入」的唯一依據，一旦 localStorage
// 被清掉，即使 cookie 還有效，也永遠沒有自我恢復的機會，只能被迫
// 重新登入。
//
// 這個函式在 customer 是 null 時主動打一次 /me，如果後端說 session
// 其實還有效，就把 customer 補回來，不用整個踢回登入頁。
// 回傳 { restored: true } 代表補回來了，可以照常繼續；
// 回傳 { restored: false } 代表 session 真的失效了，需要重新登入。
export async function tryRestoreSession(mainUrl: string) {
  const customerStore = useCustomerStore()

  // 已經有 customer 了，不需要恢復
  if (customerStore.isLoggedIn) return { restored: true }

  // 已經有另一邊在驗證中 → 這次直接跳過，避免搶著打 /me
  if (checking) return { restored: false }

  checking = true
  try {
    for (let attempt = 0; attempt < 2; attempt++) {
      if (attempt === 1) {
        await new Promise(resolve => setTimeout(resolve, 1200))
      }
      try {
        const res = await callMe(mainUrl)
        if (!res.ok) continue // 5xx/401 等，再試一次或放棄

        const data = await res.json()
        // 後端明確表示「沒有這個登入」，或回傳的資料不像是有效的
        // customer 物件（沒有 id），代表 session 真的沒有效，不用再試
        if (!data || data.error || !data.id) {
          return { restored: false }
        }

        // session 其實還有效：把 customer 補回來
        customerStore.setCustomer(data)
        lastCheckedAt = Date.now()
        return { restored: true }
      } catch {
        // 網路例外，等下一次 attempt 重試
      }
    }
    return { restored: false }
  } finally {
    checking = false
  }
}
