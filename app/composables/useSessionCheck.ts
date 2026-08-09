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
  // 第一次 fetch 失敗時，延遲後再試一次，避免把「網路還沒就緒」
  // 誤判成「session 失效」（比照 permission.js 的重試策略）
  retryOnFail?: boolean
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
    let res: Response
    try {
      res = await callMe(mainUrl)
    } catch {
      if (retryOnFail) {
        await new Promise(resolve => setTimeout(resolve, 1200))
        try {
          res = await callMe(mainUrl)
        } catch {
          // 重試也失敗：離線/逾時，不登出，等下次再檢查
          lastCheckedAt = 0
          return { loggedOut: false, skipped: false }
        }
      } else {
        lastCheckedAt = 0
        return { loggedOut: false, skipped: false }
      }
    }

    // 後端明確表示「沒有這個登入」，才是真的 session 失效
    if (res.status === 401 || res.status === 403) {
      await doLogout(mainUrl)
      return { loggedOut: true, skipped: false }
    }

    if (!res.ok) {
      // 5xx / 502 / 503 / 504 等閘道逾時，跟登入狀態無關，不強制登出，
      // 只重置 lastCheckedAt，讓下次導覽/切回前景再驗證一次
      lastCheckedAt = 0
      return { loggedOut: false, skipped: false }
    }

    const data = await res.json()
    if (data.error) {
      await doLogout(mainUrl)
      return { loggedOut: true, skipped: false }
    }

    lastCheckedAt = now
    return { loggedOut: false, skipped: false }
  } finally {
    checking = false
  }
}
