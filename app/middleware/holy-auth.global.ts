// middleware/holy-auth.global.ts
export default defineNuxtRouteMiddleware((to) => {
  if (import.meta.server) return

  if (to.path.startsWith('/front')) return
  if (to.path.startsWith('/book')) return
  if (to.path.startsWith('/book')) return
  if (to.path === '/login') return
  if (to.path === '/') return

  const auth = localStorage.getItem('holy_auth')
  if (!auth) {
    return navigateTo('/login')
  }
})
