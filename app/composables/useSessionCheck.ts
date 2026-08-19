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

async function doLogout(mainUrl: string) {
  lastCheckedAt = 0
  const customerStore = useCustomerStore()
  customerStore.clearCustomer()
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
          await doLogout(mainUrl)
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
      await doLogout(mainUrl)
      return { loggedOut: true, skipped: false }
    }

    // 網路斷線 / timeout 等暫時性錯誤：不登出，等下次再檢查
    lastCheckedAt = 0
    return { loggedOut: false, skipped: false }
  } finally {
    checking = false
  }
}
