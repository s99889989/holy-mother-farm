<template>
  <div class="sc-edit-page">
    <div class="sc-breadcrumb">
      <NuxtLink to="/front/shopping-cart/users">會員管理</NuxtLink>
      <span class="sc-sep">/</span>
      <span class="sc-current">
        修改 [{{ form?.account }} - {{ form?.name }}] 會員資料
      </span>
    </div>

    <p v-if="toast" class="sc-toast" :class="toast.type">{{ toast.message }}</p>

    <div v-if="loading" class="sc-loading">從原網站抓取資料中…</div>
    <p v-else-if="loadError" class="sc-load-error">{{ loadError }}</p>

    <div v-else-if="form" class="sc-panel">
      <div class="sc-panel-heading">會員 {{ form.account }} - {{ form.name }} 基本資料</div>
      <div class="sc-panel-body">
        <div class="sc-field-row">
          <span class="sc-field-label"><span class="red">*</span>ERP代號</span>
          <div class="sc-erp-group">
            <input
              v-model="form.erp"
              type="text"
              class="sc-input"
              :placeholder="form.erpSuggested"
            />
            <label class="sc-checkbox-inline">
              <input v-model="useCustomErp" type="checkbox" @change="onToggleCustomErp" />
              自訂代號
            </label>
          </div>
        </div>

        <div class="sc-field-row">
          <span class="sc-field-label">帳號</span>
          <span class="sc-readonly-value">{{ form.account }}</span>
        </div>

        <div class="sc-field-row">
          <span class="sc-field-label"><span class="red">*</span>密碼</span>
          <input
            v-model="password"
            type="password"
            class="sc-input"
            placeholder="留空代表不修改密碼"
          />
        </div>

        <div class="sc-field-row">
          <span class="sc-field-label"><span class="red">*</span>電子郵件</span>
          <input v-model="form.email" type="text" class="sc-input" />
        </div>

        <div class="sc-field-row">
          <span class="sc-field-label"><span class="red">*</span>姓名</span>
          <input v-model="form.name" type="text" class="sc-input" />
        </div>

        <div class="sc-field-row">
          <span class="sc-field-label">性別</span>
          <div class="sc-radio-group">
            <label><input v-model="form.gender" type="radio" value="1" /> 先生</label>
            <label><input v-model="form.gender" type="radio" value="0" /> 小姐</label>
          </div>
        </div>

        <div class="sc-field-row">
          <span class="sc-field-label">生日</span>
          <input v-model="form.birthday" type="date" class="sc-input" />
        </div>

        <div class="sc-field-row">
          <span class="sc-field-label">(<span class="red">*</span>)市話</span>
          <div class="sc-phone-group">
            <input v-model="form.phoneArea" type="text" class="sc-input-sm" placeholder="區碼" />
            <span>-</span>
            <input v-model="form.phoneNumber" type="text" class="sc-input-md" placeholder="電話" />
            <span>#</span>
            <input v-model="form.phoneExt" type="text" class="sc-input-sm" placeholder="分機" />
          </div>
        </div>

        <div class="sc-field-row">
          <span class="sc-field-label">傳真</span>
          <div class="sc-phone-group">
            <input v-model="form.faxArea" type="text" class="sc-input-sm" placeholder="區碼" />
            <span>-</span>
            <input v-model="form.faxNumber" type="text" class="sc-input-md" placeholder="號碼" />
          </div>
        </div>

        <div class="sc-field-row">
          <span class="sc-field-label">(<span class="red">*</span>)手機</span>
          <input v-model="form.mobile" type="text" class="sc-input" />
        </div>

        <div class="sc-field-row">
          <span class="sc-field-label"><span class="red">*</span>郵遞區號</span>
          <input v-model="form.zipcode" type="text" class="sc-input-sm" />
        </div>

        <div class="sc-field-row">
          <span class="sc-field-label"><span class="red">*</span>郵寄地址</span>
          <input v-model="form.address" type="text" class="sc-input" />
        </div>

        <div class="sc-field-row">
          <span class="sc-field-label">備註</span>
          <textarea v-model="form.note" rows="4" class="sc-input"></textarea>
        </div>

        <div class="sc-submit-row">
          <button class="sc-btn-primary" :disabled="submitting" @click="submitUpdate">
            {{ submitting ? '儲存中…' : '儲存會員資料' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'

// 呼叫本專案自己的 server API route（server/api/shopping-cart/users/[id]/*），
// 對應原網站 admin_users_update.php 的表單，送出到 admin_users_CL.php?act=u。
definePageMeta({
  layout: 'shopping-cart'
})

const route = useRoute()
const memberId = route.params.id

const form = ref(null)
const password = ref('')
const useCustomErp = ref(false)
const loading = ref(false)
const loadError = ref('')
const submitting = ref(false)
const toast = ref(null)

function showToast(message, type = 'success') {
  toast.value = { message, type }
  setTimeout(() => {
    toast.value = null
  }, 2500)
}

async function fetchEdit() {
  loading.value = true
  loadError.value = ''
  try {
    form.value = await $fetch(`/api/shopping-cart/users/${memberId}/edit`)
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

function onToggleCustomErp() {
  // 對應原本 cpids()：勾選「自訂代號」就帶入建議代號，取消就清空
  form.value.erp = useCustomErp.value ? form.value.erpSuggested : ''
}

async function submitUpdate() {
  // 對應原本必填檢查（erp / e / n / p1 / p2 / m / a）
  if (
    !form.value.erp ||
    !form.value.email ||
    !form.value.name ||
    !form.value.phoneArea ||
    !form.value.phoneNumber ||
    !form.value.mobile ||
    !form.value.address
  ) {
    showToast('必填欄位尚未填寫完整', 'error')
    return
  }

  submitting.value = true
  try {
    const res = await $fetch(`/api/shopping-cart/users/${memberId}/update`, {
      method: 'POST',
      body: {
        erp: form.value.erp,
        password: password.value,
        email: form.value.email,
        name: form.value.name,
        gender: form.value.gender,
        birthday: form.value.birthday,
        phoneArea: form.value.phoneArea,
        phoneNumber: form.value.phoneNumber,
        phoneExt: form.value.phoneExt,
        faxArea: form.value.faxArea,
        faxNumber: form.value.faxNumber,
        mobile: form.value.mobile,
        zipcode: form.value.zipcode,
        address: form.value.address,
        note: form.value.note,
        memberId: form.value.memberId
      }
    })
    showToast(res.ok ? '儲存成功' : '儲存失敗，請確認資料是否有誤', res.ok ? 'success' : 'error')
    password.value = ''
  } catch (err) {
    showToast(err?.data?.statusMessage || '儲存失敗，請確認資料是否有誤', 'error')
  } finally {
    submitting.value = false
  }
}

onMounted(fetchEdit)
</script>

<style scoped>
.sc-edit-page {
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

.sc-toast {
  position: sticky;
  top: 10px;
  z-index: 10;
  padding: 8px 14px;
  border-radius: 4px;
  font-size: 13px;
  margin-bottom: 12px;
}

.sc-toast.success {
  background: #dff0d8;
  color: #3c763d;
}

.sc-toast.error {
  background: #f2dede;
  color: #a94442;
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

.red {
  color: #d9534f;
}

.sc-panel {
  border: 1px solid #ddd;
  border-radius: 4px;
  overflow: hidden;
}

.sc-panel-heading {
  background: #dff0d8;
  color: #3c763d;
  padding: 10px 16px;
  font-weight: 600;
  border-bottom: 1px solid #ddd;
}

.sc-panel-body {
  padding: 20px;
}

.sc-field-row {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 10px 0;
  border-bottom: 1px solid #f0f0f0;
  font-size: 14px;
}

.sc-field-label {
  flex: 0 0 140px;
  color: #666;
  padding-top: 6px;
}

.sc-readonly-value {
  padding-top: 6px;
  color: #333;
  font-weight: 600;
}

.sc-input {
  flex: 1;
  padding: 6px 10px;
  border: 1px solid #ccc;
  border-radius: 4px;
  font-size: 14px;
}

.sc-input-sm {
  width: 70px;
  padding: 6px 8px;
  border: 1px solid #ccc;
  border-radius: 4px;
  text-align: center;
}

.sc-input-md {
  width: 120px;
  padding: 6px 8px;
  border: 1px solid #ccc;
  border-radius: 4px;
  text-align: center;
}

.sc-phone-group {
  display: flex;
  align-items: center;
  gap: 6px;
}

.sc-erp-group {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 12px;
}

.sc-checkbox-inline {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 13px;
  color: #666;
  white-space: nowrap;
}

.sc-radio-group {
  display: flex;
  gap: 12px;
  font-size: 13px;
}

.sc-radio-group label {
  display: flex;
  align-items: center;
  gap: 4px;
  font-weight: normal;
}

.sc-submit-row {
  text-align: center;
  margin-top: 20px;
}

.sc-btn-primary {
  padding: 10px 28px;
  font-size: 15px;
  background: #3d7a52;
  color: #fff;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.sc-btn-primary:hover:not(:disabled) {
  background: #2f6141;
}

.sc-btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
