// middleware/holy-auth.global.ts

import { usePermissionStore } from '~/stores/permission'

// 路由 → 所需 permission key（一頁一個 key）
const ROUTE_PERMISSIONS: Record<string, string> = {
  // 員工首頁
  '/staff/home': 'staff.home',

  // 人事
  '/staff/personnel/class-schedule': 'staff.class-schedule',
  '/staff/personnel/phone-directory': 'staff.phone-directory',
  '/staff/personnel/work-manual': 'staff.work-manual',

  // 列印中心
  '/staff/print/table-card-print': 'staff.table-card-print',
  '/staff/print/herbs-label-print': 'staff.herbs-label-print',

  // 營運管理
  '/staff/management/daily-menu': 'staff.daily-menu',
  '/staff/management/calendar': 'staff.calendar',
  '/staff/management/asset': 'staff.asset',
  '/staff/management/files': 'staff.files',

  // 訂單管理
  '/staff/order/black-cat-orders': 'staff.black-cat-orders',
  '/staff/order/soybean-orders': 'staff.soybean-orders',
  '/staff/order/lunch-orders': 'staff.lunch-orders',
  '/staff/order/booking-orders': 'staff.booking-orders',

  // 前台內容
  '/staff/content/news': 'staff.news',
  '/staff/content/product': 'staff.product',
  '/staff/content/production': 'staff.production',

  // 工具・系統
  '/staff/system/quick-links': 'staff.quick-links',
  '/staff/stock/cash-count': 'staff.cash-count'
}

const ADMIN_HOME = '/admin/customer-management'

// ── Cookie 驗證時間控制 ───────────────────────────────────────────
// 改用時間戳記取代 boolean flag：
// - 每次路由切換都檢查距上次驗證是否已超過 CHECK_INTERVAL
// - iOS 從後台回來後若超過間隔，下次切頁就會重驗
// - 避免 BFCache 讓 boolean 永遠卡在 true 的問題
const CHECK_INTERVAL = 10 * 60 * 1000 // 10 分鐘
let lastCheckedAt = 0

// 清除登入狀態並跳回首頁
async function forceLogout(customerStore: ReturnType<typeof useCustomerStore>, baseUrl: string) {
  lastCheckedAt = 0
  customerStore.clearCustomer()
  usePermissionStore().clear()
  // 盡力通知後端清 cookie，失敗無所謂
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

  if (to.path.startsWith('/staff') && !customerStore.isLoggedIn) {
    return navigateTo('/')
  }

  // ── Cookie 有效性驗證 ────────────────────────────────────────────
  // 修正：iOS Safari/Chrome 的 ITP 機制可能在 App 長時間放後台、
  // BFCache 回復、或跨分頁時丟掉 cookie，導致 localStorage（Pinia
  // persist）還有 isLoggedIn=true，但後端 session 已失效。
  // 改用時間戳記判斷：每 10 分鐘重驗一次，兼顧性能與安全性。
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

      // HTTP 層級失敗（401、403、500 …）→ cookie 一定失效，強制登出
      if (!res.ok) {
        return forceLogout(customerStore, commonStore.data.main_url)
      }

      // HTTP 200 但 body 帶 error（後端業務層封鎖）→ 同樣強制登出
      const data = await res.json()
      if (data.error) {
        return forceLogout(customerStore, commonStore.data.main_url)
      }
    } catch {
      // 純網路錯誤（DNS、逾時）：不清除狀態，讓使用者繼續使用
      // 重設時間戳讓下次切頁能再驗
      lastCheckedAt = 0
    }
  }

  // ── 取得所需 key（優先 definePageMeta，其次 ROUTE_PERMISSIONS）──
  const requiredKey = (to.meta.requiredPermission as string)
    ?? ROUTE_PERMISSIONS[to.path]

  if (!requiredKey) return

  const permissionStore = usePermissionStore()
  const commonStore = useCommonStore()

  if (!permissionStore.loaded) {
    const customerId = customerStore.isLoggedIn ? String(customerStore.customer.id) : null
    await permissionStore.load(customerId, commonStore.data.main_url)
  } else {
    const customerId = customerStore.isLoggedIn ? String(customerStore.customer.id) : null
    permissionStore.load(customerId, commonStore.data.main_url, true)
  }

  if (!permissionStore.can(requiredKey)) {
    return navigateTo('/')
  }
})
