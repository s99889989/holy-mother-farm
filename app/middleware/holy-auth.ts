// middleware/holy-auth.ts
// 套用到所有後台頁面（非 /site/* 和非 /login）

export default defineNuxtRouteMiddleware(async (to) => {
  // 前台和登入頁不需要驗證
  if (to.path.startsWith('/site')) return
  if (to.path === '/login') return
  if (to.path === '/') return

  try {
    const res = await $fetch<{ ok: boolean }>('/api/holy/check')
    if (!res.ok) return navigateTo('/login')
  } catch {
    return navigateTo('/login')
  }
})
