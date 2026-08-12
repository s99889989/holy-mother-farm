<script setup>
import ScHeader from '~/components/shopping-cart/ScHeader.vue'
import { ref, onMounted } from 'vue'

// 呼叫本專案自己的 server API route（server/api/shopping-cart/users/[id]/*），
// 對應原網站 admin_users_update.php 的表單，送出到 admin_users_CL.php?act=u。
definePageMeta({
  layout: 'staff'
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
      loadError.value = 'unauthorized'
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

<template>
  <div class="min-h-full bg-surface2 transition-colors duration-300">
    <ScHeader :title="form ? `修改 ${form.account} - ${form.name}` : '修改會員資料'" :show-tabs="false" />

    <div class="max-w-2xl mx-auto px-3 sm:px-4 py-4 sm:py-6 space-y-4">
      <NuxtLink to="/staff/order/shopping-cart/users" class="text-sm text-green-700 dark:text-green-400 hover:underline">
        ← 返回會員管理
      </NuxtLink>

      <p
        v-if="toast"
        class="text-sm px-4 py-2 rounded-xl"
        :class="toast.type === 'error'
          ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
          : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'"
      >
        {{ toast.message }}
      </p>

      <div v-if="loading" class="text-center py-10 text-hint-c">從原網站抓取資料中…</div>
      <div v-else-if="loadError === 'unauthorized'" class="bg-surface rounded-xl border border-light-c p-6 text-center space-y-3">
        <p class="text-muted-c text-sm">尚未登入購物車後台。</p>
        <NuxtLink to="/staff/order/shopping-cart/login" class="inline-block px-4 py-2 text-sm bg-green-700 text-white rounded-xl hover:bg-green-800 transition-colors">
          前往登入購物車後台
        </NuxtLink>
      </div>
      <p v-else-if="loadError" class="text-red-600 dark:text-red-400 text-sm">{{ loadError }}</p>

      <div v-else-if="form" class="bg-surface rounded-xl border border-light-c overflow-hidden">
        <div class="bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400 px-4 py-2.5 font-semibold text-sm border-b border-light-c">
          會員 {{ form.account }} - {{ form.name }} 基本資料
        </div>
        <div class="p-4 space-y-3">
          <div class="flex items-start gap-3">
            <span class="w-28 flex-none text-sm text-muted-c text-right pt-2"><span class="text-red-500">*</span>ERP代號</span>
            <div class="flex-1 flex items-center gap-3">
              <input v-model="form.erp" type="text" :placeholder="form.erpSuggested" class="flex-1 px-3 py-2 text-sm rounded-xl border border-light-c bg-surface text-base-c outline-none focus:ring-2 focus:ring-green-400">
              <label class="flex items-center gap-1.5 text-xs text-muted-c whitespace-nowrap">
                <input v-model="useCustomErp" type="checkbox" @change="onToggleCustomErp">
                自訂代號
              </label>
            </div>
          </div>

          <div class="flex items-start gap-3">
            <span class="w-28 flex-none text-sm text-muted-c text-right pt-2">帳號</span>
            <span class="pt-2 text-sm text-base-c font-semibold">{{ form.account }}</span>
          </div>

          <div class="flex items-start gap-3">
            <span class="w-28 flex-none text-sm text-muted-c text-right pt-2"><span class="text-red-500">*</span>密碼</span>
            <input v-model="password" type="password" placeholder="留空代表不修改密碼" class="flex-1 px-3 py-2 text-sm rounded-xl border border-light-c bg-surface text-base-c outline-none focus:ring-2 focus:ring-green-400">
          </div>

          <div class="flex items-start gap-3">
            <span class="w-28 flex-none text-sm text-muted-c text-right pt-2"><span class="text-red-500">*</span>電子郵件</span>
            <input v-model="form.email" type="text" class="flex-1 px-3 py-2 text-sm rounded-xl border border-light-c bg-surface text-base-c outline-none focus:ring-2 focus:ring-green-400">
          </div>

          <div class="flex items-start gap-3">
            <span class="w-28 flex-none text-sm text-muted-c text-right pt-2"><span class="text-red-500">*</span>姓名</span>
            <input v-model="form.name" type="text" class="flex-1 px-3 py-2 text-sm rounded-xl border border-light-c bg-surface text-base-c outline-none focus:ring-2 focus:ring-green-400">
          </div>

          <div class="flex items-start gap-3">
            <span class="w-28 flex-none text-sm text-muted-c text-right pt-2">性別</span>
            <div class="flex gap-3 pt-2 text-sm text-base-c">
              <label class="flex items-center gap-1"><input v-model="form.gender" type="radio" value="1"> 先生</label>
              <label class="flex items-center gap-1"><input v-model="form.gender" type="radio" value="0"> 小姐</label>
            </div>
          </div>

          <div class="flex items-start gap-3">
            <span class="w-28 flex-none text-sm text-muted-c text-right pt-2">生日</span>
            <input v-model="form.birthday" type="date" class="flex-1 px-3 py-2 text-sm rounded-xl border border-light-c bg-surface text-base-c">
          </div>

          <div class="flex items-start gap-3">
            <span class="w-28 flex-none text-sm text-muted-c text-right pt-2">(<span class="text-red-500">*</span>)市話</span>
            <div class="flex items-center gap-1.5 pt-1">
              <input v-model="form.phoneArea" type="text" placeholder="區碼" class="w-16 text-center px-2 py-1.5 rounded-lg border border-light-c bg-surface text-base-c">
              <span class="text-muted-c">-</span>
              <input v-model="form.phoneNumber" type="text" placeholder="電話" class="w-28 text-center px-2 py-1.5 rounded-lg border border-light-c bg-surface text-base-c">
              <span class="text-muted-c">#</span>
              <input v-model="form.phoneExt" type="text" placeholder="分機" class="w-16 text-center px-2 py-1.5 rounded-lg border border-light-c bg-surface text-base-c">
            </div>
          </div>

          <div class="flex items-start gap-3">
            <span class="w-28 flex-none text-sm text-muted-c text-right pt-2">傳真</span>
            <div class="flex items-center gap-1.5 pt-1">
              <input v-model="form.faxArea" type="text" placeholder="區碼" class="w-16 text-center px-2 py-1.5 rounded-lg border border-light-c bg-surface text-base-c">
              <span class="text-muted-c">-</span>
              <input v-model="form.faxNumber" type="text" placeholder="號碼" class="w-28 text-center px-2 py-1.5 rounded-lg border border-light-c bg-surface text-base-c">
            </div>
          </div>

          <div class="flex items-start gap-3">
            <span class="w-28 flex-none text-sm text-muted-c text-right pt-2">(<span class="text-red-500">*</span>)手機</span>
            <input v-model="form.mobile" type="text" class="flex-1 px-3 py-2 text-sm rounded-xl border border-light-c bg-surface text-base-c outline-none focus:ring-2 focus:ring-green-400">
          </div>

          <div class="flex items-start gap-3">
            <span class="w-28 flex-none text-sm text-muted-c text-right pt-2"><span class="text-red-500">*</span>郵遞區號</span>
            <input v-model="form.zipcode" type="text" class="w-24 text-center px-2 py-1.5 rounded-lg border border-light-c bg-surface text-base-c">
          </div>

          <div class="flex items-start gap-3">
            <span class="w-28 flex-none text-sm text-muted-c text-right pt-2"><span class="text-red-500">*</span>郵寄地址</span>
            <input v-model="form.address" type="text" class="flex-1 px-3 py-2 text-sm rounded-xl border border-light-c bg-surface text-base-c outline-none focus:ring-2 focus:ring-green-400">
          </div>

          <div class="flex items-start gap-3">
            <span class="w-28 flex-none text-sm text-muted-c text-right pt-2">備註</span>
            <textarea v-model="form.note" rows="4" class="flex-1 px-3 py-2 text-sm rounded-xl border border-light-c bg-surface text-base-c outline-none focus:ring-2 focus:ring-green-400"></textarea>
          </div>

          <div class="text-center pt-3">
            <button :disabled="submitting" class="px-8 py-2.5 text-sm font-medium bg-green-700 text-white rounded-xl hover:bg-green-800 disabled:opacity-50 transition-colors" @click="submitUpdate">
              {{ submitting ? '儲存中…' : '儲存會員資料' }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
