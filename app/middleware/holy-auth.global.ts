// middleware/holy-auth.global.ts

import { usePermissionStore } from '~/stores/permission'

const ROUTE_PERMISSIONS: Record<string, string> = {
  // ── 個人頁面（需登入）──────────────────────────────────────────
  '/front/profile/booking': 'profile.view',
  '/front/profile/log': 'profile.view',
  '/front/profile/lunch': 'profile.view',
  '/front/profile/settings': 'profile.view',

  // ── 員工首頁 ────────────────────────────────────────────────────
  '/staff/home': 'staff.home',

  // ── 庫存・財務 ──────────────────────────────────────────────────
  '/staff/stock/cash-count-view': 'staff.cash-count',
  '/staff/stock/cash-count-edit': 'staff.cash-count.edit',

  // ── 營運管理 ────────────────────────────────────────────────────
  '/staff/management/booking-view': 'staff.booking',
  '/staff/management/booking-edit': 'staff.booking.edit',
  '/staff/management/menu-view': 'staff.menu',
  '/staff/management/menu-edit': 'staff.menu.edit',
  '/staff/management/calendar-view': 'staff.calendar',
  '/staff/management/calendar-edit': 'staff.calendar.edit',
  '/staff/management/asset-view': 'staff.asset',
  '/staff/management/asset-edit': 'staff.asset.edit',
  '/staff/management/files-view': 'staff.files',
  '/staff/management/files-edit': 'staff.files.edit',
  '/staff/task/task-board': 'staff.task',
  '/staff/task/task-manager': 'staff.task.manage',

  // ── 前台內容 ────────────────────────────────────────────────────
  '/staff/front/news-edit': 'staff.news.edit',
  '/staff/front/product-edit': 'staff.product.edit',
  '/staff/front/production-edit': 'staff.production.edit',

  // ── 工具・系統 ──────────────────────────────────────────────────
  '/staff/system/quick-links-view': 'staff.quick-links',
  '/staff/system/quick-links-edit': 'staff.quick-links.edit'
}

const ADMIN_HOME = '/admin/management/PermissionManagement'

export default defineNuxtRouteMiddleware(async (to) => {
  // /staff 根路徑自動導向 /staff/home
  if (to.path === '/staff') return navigateTo('/staff/home')

  // ── /book 底下全部放行 ────────────────────────────────────────────
  if (to.path.startsWith('/book')) return

  // ── /admin 路徑 ───────────────────────────────────────────────────
  // server side 一律擋（無法讀 localStorage）
  if (to.path.startsWith('/admin')) {
    if (import.meta.server) return navigateTo('/login')
    return localStorage.getItem('holy_auth')
      ? undefined
      : navigateTo('/login')
  }

  // server side 以下不執行
  if (import.meta.server) return

  const hasAdminAuth = !!localStorage.getItem('holy_auth')
  const customerStore = useCustomerStore()

  // ── /login ────────────────────────────────────────────────────────
  // 已有 holy_auth → 跳後台
  if (to.path === '/login') {
    if (hasAdminAuth) return navigateTo(ADMIN_HOME)
    return
  }

  // ── 前台公開頁面 / 根路徑 → 放行 ─────────────────────────────────
  if (to.path === '/') return

  // ── holy_auth 登入者 → 全部放行 ──────────────────────────────────
  if (hasAdminAuth) return

  // ── /staff 路徑 ───────────────────────────────────────────────────
  // 未登入 → 跳 /
  if (to.path.startsWith('/staff') && !customerStore.isLoggedIn) {
    return navigateTo('/')
  }

  // ── 載入權限並檢查 ────────────────────────────────────────────────
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
    // /staff 頁面沒權限 → 跳 /staff/home（而不是登入頁）
    if (to.path.startsWith('/staff') && to.path !== '/staff/home') {
      return navigateTo('/staff/home')
    }
    return navigateTo('/')
  }
})
