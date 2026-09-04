// middleware/holy-auth.global.ts
import { verifySession, tryRestoreSession } from '~/composables/useSessionCheck'

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

  const commonStore = useCommonStore()

  if (to.path.startsWith('/staff')) {
    // customer 是 null，不代表 session 真的失效——很可能只是 iOS Safari
    // 的 ITP 機制把 localStorage 清掉了（實測證實過：localStorage 裡
    // 連 customer 這個 key 都不存在，但也沒有任何 clearCustomer() 被
    // 呼叫過，代表不是被登出，是資料本來就消失了），session cookie
    // 不一定跟著失效。過去的寫法一律直接踢回首頁，逼使用者重新登入，
    // 即使 cookie 其實還有效。這裡先試著跟後端確認一次，能恢復就恢復，
    // 不用整個踢回登入頁。
    if (!customerStore.isLoggedIn) {
      const { restored } = await tryRestoreSession(commonStore.data.main_url)
      if (!restored) return navigateTo('/')
    }

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
  //
  // retryOnFail: true 是必要的，不能省略——這裡是「每次導覽到 /staff」
  // 都會經過的路徑，iOS 從背景切回、觸發第一次導覽時最容易撞上網路
  // 堆疊還沒就緒的空窗期。沒有這個選項時，verifySession 遇到單次
  // 401/403 會直接呼叫 doLogout() 清空 customer——即使 cookie 其實
  // 只是還沒完全就緒、幾百毫秒後就會恢復正常。加上 retryOnFail，才會
  // 跟 layouts/staff.vue 的 checkSessionOnVisible 一樣，先等 1.2 秒
  // 讓網路/cookie 有機會恢復，再重試一次，兩次都真的失敗才判定登出。
  if (to.path.startsWith('/staff') && customerStore.isLoggedIn) {
    const { loggedOut } = await verifySession(commonStore.data.main_url, { retryOnFail: true })
    if (loggedOut) return navigateTo('/')
  }

  // ── 取得所需 key（由各頁面 definePageMeta 宣告）─────────────────
  // const requiredKey = to.meta.requiredPermission as string | undefined
  // if (!requiredKey) return
  //
  // const permissionStore = usePermissionStore()
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
