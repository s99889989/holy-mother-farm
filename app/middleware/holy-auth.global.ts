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
  //
  // retryOnFail: true 是必要的，不能省略——這裡是「每次導覽到 /staff」
  // 都會經過的路徑，iOS 從背景切回、觸發第一次導覽時最容易撞上網路
  // 堆疊還沒就緒的空窗期。沒有這個選項時，verifySession 遇到單次
  // 401/403 會直接呼叫 doLogout() 清空 customer——即使 cookie 其實
  // 只是還沒完全就緒、幾百毫秒後就會恢復正常。加上 retryOnFail，才會
  // 跟 layouts/staff.vue 的 checkSessionOnVisible 一樣，先等 1.2 秒
  // 讓網路/cookie 有機會恢復，再重試一次，兩次都真的失敗才判定登出。
  //
  // （這正是「customer 被清空、但幾乎同時 permission 又抓到正確資料」
  // 這種矛盾狀態的成因：這裡誤判登出把 customer 清空之後，
  // layouts/staff.vue 的 onMounted 又獨立打了一次 my-perms，這時
  // cookie 已經恢復正常，權限就抓到了，但沒有人把 customer 補回來。）
  if (to.path.startsWith('/staff') && customerStore.isLoggedIn) {
    const commonStore = useCommonStore()
    const { loggedOut } = await verifySession(commonStore.data.main_url, { retryOnFail: true })
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
