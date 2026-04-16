<template>
  <div>
    <!-- 已登入：顯示帳號資訊 -->
    <div v-if="customerStore.customer"
      class="flex items-center gap-3 px-4 py-3 rounded-xl" style="background-color:#eef7f5;">
      <div class="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
        style="background-color:#1FC29C;">
        {{ customerStore.customer.name?.charAt(0)?.toUpperCase() || '?' }}
      </div>
      <div class="min-w-0">
        <p class="text-sm font-semibold text-gray-700 truncate">{{ customerStore.customer.name }}</p>
        <p class="text-xs text-gray-400 truncate">{{ customerStore.customer.email }}</p>
      </div>
    </div>

    <!-- 未登入：Google 按鈕（由 site.vue 的 SDK 渲染） -->
    <div v-else class="flex flex-col items-center gap-2">
      <p class="text-sm text-gray-500">登入 Google 帳號可自動填入資料並查詢歷史紀錄</p>
      <div :id="btnId"></div>
    </div>
  </div>
</template>

<script setup>
import { onMounted } from 'vue'
import { useCustomerStore } from '~/stores/customer.js'

const props = defineProps({
  btnId: { type: String, default: 'google-login-btn' }
})

const customerStore = useCustomerStore()

onMounted(() => {
  // SDK 已由 site.vue 初始化，這裡只渲染按鈕
  if (!customerStore.customer && window.google) {
    window.google.accounts.id.renderButton(
      document.getElementById(props.btnId),
      { theme: 'outline', size: 'large', text: 'signin_with', locale: 'zh-TW', width: 280 }
    )
  }
})
</script>
