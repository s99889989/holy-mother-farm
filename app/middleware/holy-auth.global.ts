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

  if (to.path.startsWith('/staff') && !customerStore.isLoggedIn) {
    return navigateTo('/')
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
      if (!res.ok) return forceLogout(customerStore, commonStore.data.main_url)
      const data = await res.json()
      if (data.error) return forceLogout(customerStore, commonStore.data.main_url)
    } catch {
      lastCheckedAt = 0
    }
  }

  // ── 取得所需 key（由各頁面 definePageMeta 宣告）─────────────────
  const requiredKey = to.meta.requiredPermission as string | undefined
  if (!requiredKey) return

  const permissionStore = usePermissionStore()
  const commonStore = useCommonStore()
  const customerId = customerStore.isLoggedIn ? String(customerStore.customer.id) : null

  if (!permissionStore.loaded) {
    await permissionStore.load(customerId, commonStore.data.main_url)
  } else {
    permissionStore.load(customerId, commonStore.data.main_url, true)
  }

  if (!permissionStore.can(requiredKey)) {
    return navigateTo('/')
  }
})
