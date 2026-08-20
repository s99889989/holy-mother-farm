// middleware/holy-auth.global.ts
import { verifySession } from '~/composables/useSessionCheck'

const ADMIN_HOME = '/admin/admin-customer-management'

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
  // 節流、去重邏輯都在 useSessionCheck 裡，跟 layouts/staff.vue 的
  // visibilitychange 檢查共用同一份「上次驗證時間 / 是否驗證中」的狀態，
  // 避免兩邊在切回前景那一刻各打各的、彼此結果對不上造成畫面跳動。
  if (to.path.startsWith('/staff') && customerStore.isLoggedIn) {
    const commonStore = useCommonStore()
    const { loggedOut } = await verifySession(commonStore.data.main_url)
    if (loggedOut) return navigateTo('/')
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
