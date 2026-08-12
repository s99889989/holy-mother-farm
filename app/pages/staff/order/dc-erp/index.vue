<script setup>
import { ref, onMounted } from 'vue'

// 這頁重現原網站登入後的 frameset 外觀：頂部多層選單 + 左側 accordion 導覽 +
// 中間 iframe 顯示實際內容頁。選單資料來自 /api/dc-erp/menu（伺服器端解析原網站
// Menu/index 的 HTML），每個連結都已經改寫成走 /api/dc-erp/page 代理，
// 所以這裡的 <a target="contentFrame"> 可以直接用瀏覽器原生的 frame 導頁，不用額外寫 JS。
definePageMeta({
  layout: false,
  requiredPermission: 'order.dc-erp'
})

const userName = ref('')
const topMenu = ref([])
const sideSections = ref([])
const contentUrl = ref('')
const openSections = ref([])
const loading = ref(true)
const errorMessage = ref('')

async function loadMenu() {
  loading.value = true
  errorMessage.value = ''
  try {
    const data = await $fetch('/api/dc-erp/menu')
    userName.value = data.userName
    topMenu.value = data.topMenu
    sideSections.value = data.sideSections
    contentUrl.value = data.contentUrl
    openSections.value = data.sideSections.map((_, i) => i === 0)
  } catch (err) {
    if (err?.statusCode === 401 || err?.response?.status === 401) {
      await navigateTo('/staff/order/dc-erp/login')
      return
    }
    errorMessage.value = err?.data?.statusMessage || '無法載入選單，請稍後再試'
  } finally {
    loading.value = false
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
        <span v-if="userName">{{ userName }} 您好!</span>
        <button class="text-red-600 hover:underline" @click="handleLogout">登出</button>
      </div>
    </header>

    <!-- Top multi-level menu -->
    <nav v-if="topMenu.length" class="border-b border-light-c bg-surface px-2">
      <ul class="flex">
        <DcMenuNode v-for="(node, idx) in topMenu" :key="idx" :node="node" :depth="0" />
      </ul>
    </nav>

    <div class="flex flex-1 overflow-hidden">
      <!-- Sidebar accordion -->
      <aside class="w-56 shrink-0 overflow-y-auto border-r border-light-c bg-surface">
        <div v-for="(section, i) in sideSections" :key="i" class="border-b border-light-c">
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
      <main class="flex-1 bg-surface2">
        <p v-if="loading" class="p-6 text-sm text-hint-c">載入中…</p>
        <p v-else-if="errorMessage" class="p-6 text-sm text-red-600">{{ errorMessage }}</p>
        <iframe
          v-else-if="contentUrl"
          :src="contentUrl"
          name="contentFrame"
          class="h-full w-full border-0"
        />
      </main>
    </div>
  </div>
</template>
