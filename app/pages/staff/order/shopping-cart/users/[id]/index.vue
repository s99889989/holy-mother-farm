<script setup>
import ScHeader from '~/components/shopping-cart/ScHeader.vue'
import { ref, onMounted } from 'vue'

// 呼叫本專案自己的 server API route（server/api/shopping-cart/users/[id].get.ts），
// 由該 route 帶著登入 session 抓原網站 admin_users_view.php 並解析成 JSON。
definePageMeta({
  layout: 'staff'
})

const route = useRoute()
const memberId = route.params.id

const detail = ref(null)
const loading = ref(false)
const loadError = ref('')

async function fetchDetail() {
  loading.value = true
  loadError.value = ''
  try {
    detail.value = await $fetch(`/api/shopping-cart/users/${memberId}`)
  } catch (err) {
    if (err?.statusCode === 401 || err?.response?.status === 401) {
      await navigateTo('/staff/order/shopping-cart/login')
      return
    } else {
      loadError.value = err?.data?.statusMessage || '抓取原網站資料失敗，請稍後再試'
    }
  } finally {
    loading.value = false
  }
}

onMounted(fetchDetail)
</script>

<template>
  <div class="min-h-full bg-surface2 transition-colors duration-300">
    <ScHeader :title="detail ? `會員資料 ${detail.name}` : '會員資料'" :show-tabs="false" />

    <div class="max-w-2xl mx-auto px-3 sm:px-4 py-4 sm:py-6 space-y-4">
      <NuxtLink to="/staff/order/shopping-cart/users" class="text-sm text-green-700 dark:text-green-400 hover:underline">
        ← 返回會員管理
      </NuxtLink>

      <div v-if="loading" class="text-center py-10 text-hint-c">從原網站抓取資料中…</div>
      <p v-else-if="loadError" class="text-red-600 dark:text-red-400 text-sm">{{ loadError }}</p>

      <div v-else-if="detail" class="bg-surface rounded-xl border border-light-c overflow-hidden">
        <div class="bg-surface2 px-4 py-2.5 font-semibold text-base-c text-sm border-b border-light-c">
          會員 {{ detail.account }} - {{ detail.name }} 基本資料
        </div>
        <div class="p-4">
          <div class="flex gap-2.5 py-2.5 border-b border-light-c text-sm text-base-c">
            <span class="text-muted-c flex-none w-32">ERP客戶代號</span>
            <span>{{ detail.erp || '-' }}</span>
          </div>
          <div class="flex gap-2.5 py-2.5 border-b border-light-c text-sm text-base-c">
            <span class="text-muted-c flex-none w-32">帳號</span>
            <span>{{ detail.account }}</span>
          </div>
          <div class="flex gap-2.5 py-2.5 border-b border-light-c text-sm text-base-c">
            <span class="text-muted-c flex-none w-32">電子郵件</span>
            <span>{{ detail.email || '-' }}</span>
          </div>
          <div class="flex gap-2.5 py-2.5 border-b border-light-c text-sm text-base-c">
            <span class="text-muted-c flex-none w-32">姓名</span>
            <span>{{ detail.name }}</span>
          </div>
          <div class="flex gap-2.5 py-2.5 border-b border-light-c text-sm text-base-c">
            <span class="text-muted-c flex-none w-32">性別</span>
            <span>{{ detail.gender || '-' }}</span>
          </div>
          <div class="flex gap-2.5 py-2.5 border-b border-light-c text-sm text-base-c">
            <span class="text-muted-c flex-none w-32">生日</span>
            <span>{{ detail.birthday || '未設定' }}</span>
          </div>
          <div class="flex gap-2.5 py-2.5 border-b border-light-c text-sm text-base-c">
            <span class="text-muted-c flex-none w-32">市話</span>
            <span>
              <template v-if="detail.phoneArea || detail.phoneNumber">
                {{ detail.phoneArea || '-' }} - {{ detail.phoneNumber || '-' }}
                <template v-if="detail.phoneExt"># {{ detail.phoneExt }}</template>
              </template>
              <template v-else>-</template>
            </span>
          </div>
          <div class="flex gap-2.5 py-2.5 border-b border-light-c text-sm text-base-c">
            <span class="text-muted-c flex-none w-32">傳真</span>
            <span>
              <template v-if="detail.faxArea || detail.faxNumber">
                {{ detail.faxArea || '-' }} - {{ detail.faxNumber || '-' }}
              </template>
              <template v-else>-</template>
            </span>
          </div>
          <div class="flex gap-2.5 py-2.5 border-b border-light-c text-sm text-base-c">
            <span class="text-muted-c flex-none w-32">手機</span>
            <span>{{ detail.mobile || '-' }}</span>
          </div>
          <div class="flex gap-2.5 py-2.5 border-b border-light-c text-sm text-base-c">
            <span class="text-muted-c flex-none w-32">郵遞區號</span>
            <span>{{ detail.zipcode || '-' }}</span>
          </div>
          <div class="flex gap-2.5 py-2.5 border-b border-light-c text-sm text-base-c">
            <span class="text-muted-c flex-none w-32">郵寄地址</span>
            <span>{{ detail.address || '-' }}</span>
          </div>
          <div class="flex gap-2.5 py-2.5 text-sm text-base-c">
            <span class="text-muted-c flex-none w-32">備註</span>
            <span class="whitespace-pre-line">{{ detail.note || '-' }}</span>
          </div>

          <div class="mt-4 text-right">
            <NuxtLink :to="`/staff/order/shopping-cart/users/${detail.memberId}/edit`" class="text-sm text-green-700 dark:text-green-400 hover:underline">
              修改這位會員資料 →
            </NuxtLink>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
