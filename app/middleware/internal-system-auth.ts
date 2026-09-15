/**
 * middleware/internal-system-auth.ts
 * 保護有套用此 middleware 的頁面，未登入跳回登入頁 /staff/content/internal-system/login
 */
export default defineNuxtRouteMiddleware(() => {
  if (import.meta.client) {
    // 用非 httpOnly 的 logged_in flag 判斷（PHPSESSID 是 httpOnly 前端讀不到）
    const loggedIn = useCookie('logged_in')
    if (!loggedIn.value) {
      return navigateTo('/staff/content/internal-system/login')
    }
  }
})