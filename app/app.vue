<script setup>

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

// ── 找到選單持續空白的真正原因 ────────────────────────────────────
// permission.js 特地把 perms persist 到 localStorage，註解寫得很清楚：
// 「重整/重開時 navbar 有舊值先撐著，拉完再更新」。
// 但這裡原本無條件呼叫 permissionStore.clear()，等於每次 app 完整
// 重新啟動（包含 iOS Safari 背景太久把分頁整頁丟棄重載的情況）都會
// 先把剛從 localStorage 復原的 perms 洗成空的，逼著畫面從零開始，
// 完全依賴這次網路請求要成功——訊號不好時就會卡在空選單，跟
// StaffNavbar / permission store 裡做了多少次重試都無關。
// 登出時已經在各自的 logout 流程裡明確呼叫 permissionStore.clear()
// (見 layouts/staff.vue、StaffNavbar.vue、middleware/holy-auth.global.ts)，
// 這裡不需要、也不應該再重複清一次，所以直接移除這行與相關 import。

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
