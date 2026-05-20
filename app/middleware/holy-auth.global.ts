// middleware/holy-auth.global.ts
//
// 權限優先順序：
//   1. 後台帳密登入（holy_auth）→ 全部放行
//   2. / 和 /login             → 永遠放行
//   3. /front/*（非 profile）  → 永遠放行
//   4. 任何人（含未登入）       → 載入 permissionStore，依 permission key 判斷
//      - 未登入   → 套預設群組（guest）
//      - Google 登入 → 套個人群組 + 覆蓋

import { usePermissionStore } from '~/stores/permission'

// 路由 → 需要的 permission key
// 沒有列在這裡的路由一律放行（前台公開頁面）
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

  // ── 前台內容 ────────────────────────────────────────────────────
  '/staff/front/news-edit': 'staff.news.edit',
  '/staff/front/product-edit': 'staff.product.edit',
  '/staff/front/production-edit': 'staff.production.edit',

  // ── 工具・系統 ──────────────────────────────────────────────────
  '/staff/system/quick-links-view': 'staff.quick-links',
  '/staff/system/quick-links-edit': 'staff.quick-links.edit'
}

export default defineNuxtRouteMiddleware(async (to) => {
  // /staff 根路徑自動導向 /staff/home
  if (to.path === '/staff') return navigateTo('/staff/home')

  // Server side 不執行
  if (import.meta.server) return

  // ── 1. 後台帳密登入者 → 全部放行 ─────────────────────────────────
  if (localStorage.getItem('holy_auth')) return

  // ── 2. 根路徑 / 登入頁 → 永遠放行（但已登入者離開登入頁）────────
  const customerStore = useCustomerStore()
  if (to.path === '/login') {
    if (customerStore.isLoggedIn) return navigateTo('/staff/home')
    return
  }
  if (to.path === '/') return

  // ── 3. 此路由不需要權限檢查 → 放行 ──────────────────────────────
  const requiredKey = (to.meta.requiredPermission as string)
    ?? ROUTE_PERMISSIONS[to.path]

  if (!requiredKey) return

  // ── 4. 載入權限 ───────────────────────────────────────────────────
  const permissionStore = usePermissionStore()
  const commonStore = useCommonStore()

  if (!permissionStore.loaded) {
    const customerId = customerStore.isLoggedIn ? String(customerStore.customer.id) : null
    await permissionStore.load(customerId, commonStore.data.main_url)
  } else {
    // 已有快取 → 背景靜默更新，不擋頁面
    const customerId = customerStore.isLoggedIn ? String(customerStore.customer.id) : null
    permissionStore.load(customerId, commonStore.data.main_url, true) // 不 await
  }

  // ── 5. 檢查權限 ───────────────────────────────────────────────────
  // if (!permissionStore.can(requiredKey)) {
  //   // 需要登入才有的權限 → 導到登入頁
  //   if (!customerStore.isLoggedIn
  //     && (requiredKey.startsWith('profile.') || requiredKey.startsWith('staff.'))) {
  //     return navigateTo('/login')
  //   }
  //   return navigateTo('/login')
  // }
})
