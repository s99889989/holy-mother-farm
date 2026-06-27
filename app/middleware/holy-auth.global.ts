// middleware/holy-auth.global.ts

import { usePermissionStore } from '~/stores/permission'

// 路由 → 所需 permission key（一頁一個 key）
const ROUTE_PERMISSIONS: Record<string, string> = {
  // 員工首頁
  '/staff/home': 'staff.home',

  // 人事
  '/staff/personnel/class-schedule':  'staff.class-schedule',
  '/staff/personnel/phone-directory': 'staff.phone-directory',
  '/staff/personnel/work-manual':     'staff.work-manual',

  // 列印中心
  '/staff/print/table-card-print':  'staff.table-card-print',
  '/staff/print/herbs-label-print': 'staff.herbs-label-print',

  // 營運管理
  '/staff/management/daily-menu': 'staff.daily-menu',
  '/staff/management/calendar':   'staff.calendar',
  '/staff/management/asset':      'staff.asset',
  '/staff/management/files':      'staff.files',

  // 訂單管理
  '/staff/order/black-cat-orders': 'staff.black-cat-orders',
  '/staff/order/soybean-orders':   'staff.soybean-orders',
  '/staff/order/lunch-orders':     'staff.lunch-orders',
  '/staff/order/booking-orders':   'staff.booking-orders',

  // 前台內容
  '/staff/content/news':       'staff.news',
  '/staff/content/product':    'staff.product',
  '/staff/content/production': 'staff.production',

  // 工具・系統
  '/staff/system/quick-links': 'staff.quick-links',
  '/staff/stock/cash-count':   'staff.cash-count',
}

const ADMIN_HOME = '/admin/customer-management'

let blockedChecked = false

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

  // 已登入但帳號被封鎖（每個 session 只驗一次）
  if (to.path.startsWith('/staff') && customerStore.isLoggedIn && !blockedChecked) {
    blockedChecked = true
    const commonStore = useCommonStore()
    try {
      const res = await fetch(commonStore.data.main_url + '/holy/customer/me', { credentials: 'include' })
      const data = await res.json()
      if (data.error) {
        blockedChecked = false
        customerStore.clearCustomer()
        return navigateTo('/')
      }
    } catch (e) {
      blockedChecked = false
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
