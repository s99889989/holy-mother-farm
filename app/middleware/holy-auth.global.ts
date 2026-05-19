// middleware/holy-auth.global.ts
//
// 權限優先順序：
//   1. 後台帳密登入（holy_auth）→ 全部頁面直接放行，不受 Google 權限系統控管
//   2. / 和 /login → 永遠放行
//   3. Google 登入 STAFF/EDITOR/ADMIN → /staff 區域直接放行
//   4. Google 登入用戶（其他）→ 查 permissionStore（後端 permissions.yml）決定是否可進
//   5. 未登入訪客 → 查 permissionStore，套預設群組（guest）權限決定是否可進

import { usePermissionStore } from '~/stores/permission'

export default defineNuxtRouteMiddleware(async (to) => {
  // /staff 根路徑自動導向 /staff/home
  if (to.path === '/staff') return navigateTo('/staff/home')

  // Server side 不執行（localStorage 只在 client）
  if (import.meta.server) return

  // ── 1. 後台帳密登入者 → 全部放行 ─────────────────────────────────
  if (localStorage.getItem('holy_auth')) return

  // ── 2. 根路徑 / 登入頁 → 永遠放行 ───────────────────────────────
  if (to.path === '/' || to.path === '/login') return

  const customerStore  = useCustomerStore()
  const permissionStore = usePermissionStore()
  const commonStore    = useCommonStore()

  // ── 3. Google 登入 STAFF → /staff 區域直接放行 ───────────────────
  if (to.path.startsWith('/staff') && customerStore.isLoggedIn && customerStore.isStaff) return

  // ── 4 & 5. 載入權限（登入用戶帶 customerId，訪客不帶，後端套預設群組）──
  if (!permissionStore.loaded) {
    const customerId = customerStore.isLoggedIn ? customerStore.customer.id : null
    await permissionStore.load(customerId, commonStore.data.main_url)
  }

  // 沒有此頁面的權限 → 回首頁
  if (!permissionStore.canAccess(to.path)) {
    return navigateTo('/')
  }
})
