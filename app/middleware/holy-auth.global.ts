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
  // 個人頁面（需登入）
  '/front/profile/booking':       'profile.view',
  '/front/profile/log':           'profile.view',
  '/front/profile/lunch':         'profile.view',
  '/front/profile/settings':      'profile.view',

  // 員工區
  '/staff/home':                  'staff.home',
  '/staff/booking':               'staff.booking',
  '/staff/calendar':              'staff.calendar',
  '/staff/cash-count':            'staff.cash-count',
  '/staff/quick-links':           'staff.quick-links',
  '/staff/work-record':           'staff.work-record',
  '/staff/menu':                  'staff.menu',
  '/staff/news':                  'staff.news',
  '/staff/product':               'staff.product',
  '/staff/production':            'staff.production',
  '/staff/image':                 'staff.image',
  '/staff/inventory':             'staff.inventory',
  '/staff/asset':                 'staff.asset',
  '/staff/customer':              'staff.customer',
  // 從 admin 搬來的管理頁面（路徑不變，仍在 /admin，但用 staff key 控管）
  '/admin/management/BookIndex':           'staff.booking',
  '/admin/management/DailyMenu':           'staff.menu',
  '/admin/management/News':                'staff.news',
  '/admin/management/Product':             'staff.product',
  '/admin/management/ProductionItem':      'staff.production',
  '/admin/management/ImageLibrary':        'staff.image',
  '/admin/management/CustomerManagement':  'staff.customer',
  '/admin/management/AssetRegistry':       'staff.asset',
  '/admin/management/admin-calendar':      'staff.calendar',
  '/admin/items/CashCount':                'staff.cash-count',
}

export default defineNuxtRouteMiddleware(async (to) => {
  // /staff 根路徑自動導向 /staff/home
  if (to.path === '/staff') return navigateTo('/staff/home')

  // Server side 不執行
  if (import.meta.server) return

  // ── 1. 後台帳密登入者 → 全部放行 ─────────────────────────────────
  if (localStorage.getItem('holy_auth')) return

  // ── 2. 根路徑 / 登入頁 → 永遠放行 ───────────────────────────────
  if (to.path === '/' || to.path === '/login') return

  // ── 3. 此路由不需要權限檢查 → 放行 ──────────────────────────────
  const requiredKey = (to.meta.requiredPermission as string)
    ?? ROUTE_PERMISSIONS[to.path]

  if (!requiredKey) return

  // ── 4. 載入權限 ───────────────────────────────────────────────────
  const customerStore   = useCustomerStore()
  const permissionStore = usePermissionStore()
  const commonStore     = useCommonStore()

  if (!permissionStore.loaded) {
    const customerId = customerStore.isLoggedIn ? customerStore.customer.id : null
    await permissionStore.load(customerId, commonStore.data.main_url)
  }

  // ── 5. 檢查權限 ───────────────────────────────────────────────────
  if (!permissionStore.can(requiredKey)) {
    // 需要登入才有的權限 → 導到登入頁
    if (!customerStore.isLoggedIn &&
      (requiredKey.startsWith('profile.') || requiredKey.startsWith('staff.'))) {
      return navigateTo('/login')
    }
    return navigateTo('/')
  }
})
