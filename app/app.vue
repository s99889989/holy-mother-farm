<script setup>
import {usePermissionStore} from '~/stores/permission.js'

useHead({
  meta: [
    {name: 'viewport', content: 'width=device-width, initial-scale=1'}
  ],
  link: [
    {rel: 'icon', href: '/favicon.ico'}
  ],
  htmlAttrs: {
    lang: 'tw'
  }
})

const title = '台東聖母健康農莊'
const description = ''

useSeoMeta({
  title,
  description,
  ogTitle: title,
  ogDescription: description,
  ogImage: 'https://ui.nuxt.com/assets/templates/nuxt/starter-light.png',
  twitterImage: 'https://ui.nuxt.com/assets/templates/nuxt/starter-light.png',
  twitterCard: 'summary_large_image'
})

const permissionStore = usePermissionStore()
permissionStore.clear()

const router = useRouter()
router.beforeEach((to, from) => {
  // 定義各「區域」
  const zone = (path) => {
    if (path.startsWith('/staff')) return 'staff'
    if (path.startsWith('/admin')) return 'admin'
    if (path === '/login') return 'login'
    return 'front'
  }

  // 跨區域一律用 window.location.href 強制完整重載，避免 CSS 殘留
  if (zone(to.path) !== zone(from.path)) {
    window.location.href = to.fullPath
    return false
  }
})
</script>

<template>
  <NuxtLayout>
    <NuxtPage/>
  </NuxtLayout>
</template>
