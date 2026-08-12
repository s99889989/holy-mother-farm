<template>
  <div class="sc-detail-page">
    <div class="sc-breadcrumb">
      <NuxtLink to="/front/shopping-cart/users">會員管理</NuxtLink>
      <span class="sc-sep">/</span>
      <span class="sc-current">會員資料 ： {{ detail?.name }}</span>
    </div>

    <div v-if="loading" class="sc-loading">從原網站抓取資料中…</div>
    <p v-else-if="loadError" class="sc-load-error">{{ loadError }}</p>

    <div v-else-if="detail" class="sc-panel">
      <div class="sc-panel-heading">會員 {{ detail.account }} - {{ detail.name }} 基本資料</div>
      <div class="sc-panel-body">
        <div class="sc-field-row">
          <span class="sc-field-label">ERP客戶代號</span>
          <span>{{ detail.erp || '-' }}</span>
        </div>
        <div class="sc-field-row">
          <span class="sc-field-label">帳號</span>
          <span>{{ detail.account }}</span>
        </div>
        <div class="sc-field-row">
          <span class="sc-field-label">電子郵件</span>
          <span>{{ detail.email || '-' }}</span>
        </div>
        <div class="sc-field-row">
          <span class="sc-field-label">姓名</span>
          <span>{{ detail.name }}</span>
        </div>
        <div class="sc-field-row">
          <span class="sc-field-label">性別</span>
          <span>{{ detail.gender || '-' }}</span>
        </div>
        <div class="sc-field-row">
          <span class="sc-field-label">生日</span>
          <span>{{ detail.birthday || '未設定' }}</span>
        </div>
        <div class="sc-field-row">
          <span class="sc-field-label">市話</span>
          <span>
            <template v-if="detail.phoneArea || detail.phoneNumber">
              {{ detail.phoneArea || '-' }} - {{ detail.phoneNumber || '-' }}
              <template v-if="detail.phoneExt"># {{ detail.phoneExt }}</template>
            </template>
            <template v-else>-</template>
          </span>
        </div>
        <div class="sc-field-row">
          <span class="sc-field-label">傳真</span>
          <span>
            <template v-if="detail.faxArea || detail.faxNumber">
              {{ detail.faxArea || '-' }} - {{ detail.faxNumber || '-' }}
            </template>
            <template v-else>-</template>
          </span>
        </div>
        <div class="sc-field-row">
          <span class="sc-field-label">手機</span>
          <span>{{ detail.mobile || '-' }}</span>
        </div>
        <div class="sc-field-row">
          <span class="sc-field-label">郵遞區號</span>
          <span>{{ detail.zipcode || '-' }}</span>
        </div>
        <div class="sc-field-row">
          <span class="sc-field-label">郵寄地址</span>
          <span>{{ detail.address || '-' }}</span>
        </div>
        <div class="sc-field-row">
          <span class="sc-field-label">備註</span>
          <span class="sc-note">{{ detail.note || '-' }}</span>
        </div>

        <div class="sc-edit-link-row">
          <NuxtLink :to="`/front/shopping-cart/users/${detail.memberId}/edit`">修改這位會員資料 →</NuxtLink>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'

// 呼叫本專案自己的 server API route（server/api/shopping-cart/users/[id].get.ts），
// 由該 route 帶著登入 session 抓原網站 admin_users_view.php 並解析成 JSON。
definePageMeta({
  layout: 'shopping-cart'
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
      loadError.value = '登入已過期，請重新登入'
      await navigateTo('/front/shopping-cart/login')
    } else {
      loadError.value = err?.data?.statusMessage || '抓取原網站資料失敗，請稍後再試'
    }
  } finally {
    loading.value = false
  }
}

onMounted(fetchDetail)
</script>

<style scoped>
.sc-detail-page {
  padding: 20px;
  color: #333;
  max-width: 800px;
  margin: 0 auto;
}

.sc-breadcrumb {
  font-size: 13px;
  color: #888;
  margin-bottom: 16px;
}

.sc-breadcrumb a {
  color: #337ab7;
  text-decoration: none;
}

.sc-breadcrumb .sc-sep {
  margin: 0 6px;
}

.sc-breadcrumb .sc-current {
  color: #555;
}

.sc-loading,
.sc-load-error {
  padding: 24px;
  text-align: center;
  color: #999;
}

.sc-load-error {
  color: #d9534f;
}

.sc-panel {
  border: 1px solid #ddd;
  border-radius: 4px;
  overflow: hidden;
}

.sc-panel-heading {
  background: #f5f5f5;
  padding: 10px 16px;
  font-weight: 600;
  border-bottom: 1px solid #ddd;
}

.sc-panel-body {
  padding: 20px;
}

.sc-field-row {
  display: flex;
  gap: 10px;
  padding: 10px 0;
  border-bottom: 1px solid #f0f0f0;
  font-size: 14px;
}

.sc-field-label {
  flex: 0 0 140px;
  color: #666;
}

.sc-note {
  white-space: pre-line;
}

.sc-edit-link-row {
  margin-top: 20px;
  text-align: right;
}

.sc-edit-link-row a {
  color: #3d7a52;
  text-decoration: none;
  font-size: 14px;
}

.sc-edit-link-row a:hover {
  text-decoration: underline;
}
</style>
