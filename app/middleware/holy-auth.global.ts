// middleware/holy-auth.global.ts

import { usePermissionStore } from '~/stores/permission'

const ADMIN_HOME = '/admin/customer-management'

// ── Cookie 驗證時間控制 ───────────────────────────────────────────
const CHECK_INTERVAL = 10 * 60 * 1000 // 10 分鐘
let lastCheckedAt = 0

async function forceLogout(customerStore: ReturnType<typeof useCustomerStore>, baseUrl: string) {
  lastCheckedAt = 0
  customerStore.clearCustomer()
  usePermissionStore().clear()
  try { await fetch(`${baseUrl}/holy/customer/logout`, { method: 'POST', credentials: 'include' }) } catch { /* ignore */ }
  return navigateTo('/')
}

export default defineNuxtRouteMiddleware(async (to) => {
  if (to.path === '/staff') return navigateTo('/staff/home')

  // ── /admin 路徑 ──────────────────────────────────────────────────
  if (to.path.startsWith('/admin')) {
    if (import.meta.server) return
    return localStorage.getItem('holy_auth')
      ? undefined
      : navigateTo('/login')
  }

  if (import.meta.server) return

  const hasAdminAuth = !!localStorage.getItem('holy_auth')
  const customerStore = useCustomerStore()

  if (to.path === '/login') {
    if (hasAdminAuth) return navigateTo(ADMIN_HOME)
    return
  }

  if (to.path === '/') return

  if (hasAdminAuth) return

  if (to.path.startsWith('/staff')) {
    // 未登入 → 一律擋
    if (!customerStore.isLoggedIn) return navigateTo('/')

    // 已登入但登入後端不再擋 guest（course 報名等前台功能需要 guest 也能登入），
    // 所以這裡要補上「guest 不能進 /staff」的判斷，不能只靠 nav 選單隱藏，
    // 否則 guest 直接打網址還是能看到頁面內容。
    // guest 本來就不該待在這個員工後台專案裡，直接導去真正的對外官網。
    if (customerStore.group === 'guest') {
      return navigateTo('https://holyfarm.netlify.app/', { external: true })
    }
  }

  // ── Cookie 有效性驗證 ────────────────────────────────────────────
  const now = Date.now()
  const needCheck = to.path.startsWith('/staff')
    && customerStore.isLoggedIn
    && (now - lastCheckedAt > CHECK_INTERVAL)

  if (needCheck) {
    lastCheckedAt = now
    const commonStore = useCommonStore()
    try {
      const res = await fetch(commonStore.data.main_url + '/holy/customer/me', {
        credentials: 'include'
      })

      // 後端明確表示「沒有這個登入」，才是真的 session 失效
      if (res.status === 401 || res.status === 403) {
        return forceLogout(customerStore, commonStore.data.main_url)
      }

      if (!res.ok) {
        // 5xx / 502 / 503 / 504 等閘道逾時，通常是行動網路訊號差、
        // 連線還沒就緒造成的暫時性問題，跟登入狀態無關。
        // 不強制登出，只重置 lastCheckedAt，讓下次導覽再驗證一次。
        lastCheckedAt = 0
      } else {
        const data = await res.json()
        if (data.error) return forceLogout(customerStore, commonStore.data.main_url)
      }
    } catch {
      // fetch 本身失敗（離線、逾時）：同樣不強制登出，等下次再檢查
      lastCheckedAt = 0
    }
  }

  // ── 取得所需 key（由各頁面 definePageMeta 宣告）─────────────────
  // const requiredKey = to.meta.requiredPermission as string | undefined
  // if (!requiredKey) return
  //
  // const permissionStore = usePermissionStore()
  // const commonStore = useCommonStore()
  // const customerId = customerStore.isLoggedIn ? String(customerStore.customer.id) : null
  //
  // if (!permissionStore.loaded) {
  //   await permissionStore.load(customerId, commonStore.data.main_url)
  // } else {
  //   permissionStore.load(customerId, commonStore.data.main_url, true)
  // }
  //
  // if (!permissionStore.can(requiredKey)) {
  //   return navigateTo('/')
  // }
})
