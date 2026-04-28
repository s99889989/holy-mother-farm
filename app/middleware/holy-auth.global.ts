export default defineNuxtRouteMiddleware((to) => {
  // ✅ 移到最上面，server/client 都執行
  if (to.path === '/staff') return navigateTo('/staff/home')

  if (import.meta.server) return

  if (to.path.startsWith('/front')) return
  if (to.path.startsWith('/book')) return
  if (to.path === '/login') return
  if (to.path === '/') return

  const auth = localStorage.getItem('holy_auth')
  if (!auth) {
    return navigateTo('/login')
  }
})
