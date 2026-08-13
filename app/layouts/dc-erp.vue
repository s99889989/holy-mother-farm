<script setup>
import { reactive, ref, provide, onMounted } from 'vue'

// 共用給所有「dc-erp」頁面（登入頁除外）的 layout，比照購物車後台的
// layouts/shopping-cart.vue 做法：只負責外殼（header + 頂部多層選單 + 左側
// accordion），實際內容交給各頁面自己的 <slot /> 決定。
//
// 跟購物車後台不同的是，這裡的選單本身是動態從原網站解析來的（不是寫死的
// NuxtLink 清單），所以選單資料（含使用者名稱、預設內容頁網址）在這個 layout
// 統一 fetch 一次，用 provide('dcErpMenu', ...) 往下傳給頁面用 inject 取用
// （例如 index.vue 要拿 contentUrl 顯示預設的 iframe），避免每個頁面都各自
// 重複打一次 /api/dc-erp/menu。
//
// 各頁面自己的 definePageMeta 要設定 layout: 'dc-erp' 才會套用。

const menu = reactive({
  userName: '',
  topMenu: [],
  sideSections: [],
  contentUrl: '',
  loading: true,
  errorMessage: ''
})

provide('dcErpMenu', menu)

const openSections = ref([])

async function loadMenu() {
  menu.loading = true
  menu.errorMessage = ''
  try {
    const data = await $fetch('/api/dc-erp/menu')
    menu.userName = data.userName
    menu.topMenu = data.topMenu
    menu.sideSections = data.sideSections
    menu.contentUrl = data.contentUrl
    openSections.value = data.sideSections.map((_, i) => i === 0)
  } catch (err) {
    if (err?.statusCode === 401 || err?.response?.status === 401) {
      await navigateTo('/staff/order/dc-erp/login')
      return
    }
    menu.errorMessage = err?.data?.statusMessage || '無法載入選單，請稍後再試'
  } finally {
    menu.loading = false
  }
}

async function handleLogout() {
  await $fetch('/api/dc-erp/logout', { method: 'POST' })
  await navigateTo('/staff/order/dc-erp/login')
}

function toggleSection(i) {
  openSections.value[i] = !openSections.value[i]
}

onMounted(loadMenu)
</script>

<template>
  <div class="flex h-screen flex-col bg-surface2">
    <!-- Header -->
    <header class="flex items-center justify-between border-b border-light-c bg-surface px-4 py-2">
      <div class="text-sm font-bold text-base-c md:text-base">
        財團法人聖母健康農莊 農業生產組織經營管理系統
      </div>
      <div class="flex items-center gap-3 text-sm text-muted-c">
        <span v-if="menu.userName">{{ menu.userName }} 您好!</span>
        <button class="text-red-600 hover:underline" @click="handleLogout">登出</button>
      </div>
    </header>

    <!-- Top multi-level menu -->
    <nav v-if="menu.topMenu.length" class="border-b border-light-c bg-surface px-2">
      <ul class="flex">
        <DcMenuNode v-for="(node, idx) in menu.topMenu" :key="idx" :node="node" :depth="0" />
      </ul>
    </nav>

    <div class="flex flex-1 overflow-hidden">
      <!-- Sidebar accordion -->
      <aside class="w-56 shrink-0 overflow-y-auto border-r border-light-c bg-surface">
        <div v-for="(section, i) in menu.sideSections" :key="i" class="border-b border-light-c">
          <button
            class="w-full px-3 py-2 text-left text-sm font-medium text-base-c hover:bg-surface2"
            @click="toggleSection(i)"
          >
            {{ section.title }}
          </button>
          <ul v-show="openSections[i]" class="pb-2">
            <li v-for="(link, j) in section.links" :key="j">
              <a
                :href="link.href"
                :target="link.target"
                class="block px-5 py-1.5 text-sm text-muted-c hover:text-green-700"
              >
                {{ link.label }}
              </a>
            </li>
          </ul>
        </div>
      </aside>

      <!-- Content -->
      <main class="flex-1 overflow-hidden bg-surface2">
        <p v-if="menu.loading" class="p-6 text-sm text-hint-c">載入中…</p>
        <p v-else-if="menu.errorMessage" class="p-6 text-sm text-red-600">{{ menu.errorMessage }}</p>
        <slot v-else />
      </main>
    </div>
  </div>
</template>
