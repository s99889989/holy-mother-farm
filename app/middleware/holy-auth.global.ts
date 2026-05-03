// middleware/holy-auth.global.ts
//
// 權限優先順序：
//   1. 後台帳密登入（holy_auth）→ 全部頁面直接放行，不受 Google 權限系統控管
//   2. Google 登入用戶 → 查 permissionStore（後端 permissions.yml）決定是否可進
//   3. 未登入 → 只能進 / 和 /login

import {usePermissionStore} from "~/stores/permission";

export default defineNuxtRouteMiddleware(async (to) => {
  // /staff 根路徑自動導向 /staff/home
  if (to.path === '/staff') return navigateTo('/staff/home')

  // Server side 不執行（localStorage 只在 client）
  if (import.meta.server) return

  // ── 1. 後台帳密登入者 → 全部放行 ─────────────────────────────────
  if (localStorage.getItem('holy_auth')) return

  // ── 2. 根路徑 / 登入頁 → 永遠放行 ───────────────────────────────
  if (to.path === '/' || to.path === '/login') return

  // ── 3. Google 登入 + 權限檢查 ────────────────────────────────────
  const customerStore   = useCustomerStore()
  const permissionStore = usePermissionStore()
  const commonStore     = useCommonStore()

  // 未 Google 登入 → 回首頁
  if (!customerStore.isLoggedIn) {
    return navigateTo('/')
  }

  // 還沒載入過權限 → 先去後端拉
  if (!permissionStore.loaded) {
    await permissionStore.load(
      customerStore.customer.id,
      commonStore.data.main_url
    )
  }

  // 沒有此頁面的權限 → 回首頁
  if (!permissionStore.canAccess(to.path)) {
    return navigateTo('/')
  }
})
