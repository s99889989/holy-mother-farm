<script setup>
definePageMeta({ layout: 'staff' })

const commonStore   = useCommonStore()
const customerStore = useCustomerStore()
const BASE          = computed(() => commonStore.data.main_url + '/holy/customer')
const customer      = computed(() => customerStore.customer)

// ── 表單 ─────────────────────────────────────────────────────────
const form = reactive({ mobile: '', landline: '', address: '', birthday: '', note: '' })
const loading      = ref(false)
const saving       = ref(false)
const saved        = ref(false)
const error        = ref('')
const mobileError  = ref('')
const landlineError = ref('')

// ── 電話驗證 ─────────────────────────────────────────────────────
const validateMobile   = (c) => /^09\d{8}$/.test(c)
const validateLandline = (c) => {
  if (/^02\d{8}$/.test(c))   return true
  if (/^0[3-8]\d{7,8}$/.test(c)) return true
  if (/^037\d{6}$/.test(c))  return true
  if (/^049\d{6}$/.test(c))  return true
  if (/^089\d{6}$/.test(c))  return true
  if (/^082[36]\d{6}$/.test(c)) return true
  if (/^0836\d{6}$/.test(c)) return true
  return false
}

const onMobileInput = () => {
  if (!form.mobile) { mobileError.value = ''; return }
  const c = form.mobile.replace(/[-\s]/g, '')
  mobileError.value = validateMobile(c) ? '' : '請輸入正確的手機號碼（09xxxxxxxx）'
}
const onLandlineInput = () => {
  if (!form.landline) { landlineError.value = ''; return }
  const c = form.landline.replace(/[-\s]/g, '')
  landlineError.value = validateLandline(c) ? '' : '請輸入正確的市話（如 02-12345678、07-1234567）'
}

// ── 載入資料 ─────────────────────────────────────────────────────
const fetchProfile = async () => {
  loading.value = true
  try {
    const data = await fetch(`${BASE.value}/profile?customerId=${customer.value?.id ?? ''}`).then(r => r.json())
    if (!data.error) {
      form.mobile   = data.mobile   || ''
      form.landline = data.landline || ''
      form.address  = data.address  || ''
      form.birthday = data.birthday || ''
      form.note     = data.note     || ''
    }
  } catch { /* ignore */ } finally {
    loading.value = false
  }
}

// ── 儲存 ─────────────────────────────────────────────────────────
const saveProfile = async () => {
  if (form.mobile) {
    const c = form.mobile.replace(/[-\s]/g, '')
    mobileError.value = validateMobile(c) ? '' : '請輸入正確的手機號碼（09xxxxxxxx）'
  } else { mobileError.value = '' }
  if (form.landline) {
    const c = form.landline.replace(/[-\s]/g, '')
    landlineError.value = validateLandline(c) ? '' : '請輸入正確的市話（如 02-12345678、07-1234567）'
  } else { landlineError.value = '' }
  if (mobileError.value || landlineError.value) return

  saving.value = true
  saved.value  = false
  error.value  = ''
  try {
    const res = await fetch(`${BASE.value}/profile`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ customerId: customer.value?.id ?? '', ...form }),
    })
    if (!res.ok) throw new Error()
    saved.value = true
    setTimeout(() => saved.value = false, 3000)
  } catch {
    error.value = '儲存失敗，請稍後再試。'
  } finally {
    saving.value = false
  }
}

onMounted(() => {
  if (customer.value) fetchProfile()
})
</script>

<template>
  <div class="min-h-screen bg-stone-50 dark:bg-zinc-900 py-8 px-4">
    <div class="max-w-xl mx-auto">

      <!-- 頁面標題 -->
      <div class="mb-6">
        <h1 class="text-lg font-bold text-stone-800 dark:text-stone-100">個人設定</h1>
        <p class="text-xs text-stone-400 mt-0.5">管理您的聯絡資訊與偏好設定</p>
      </div>

      <!-- 未登入 -->
      <div
        v-if="!customer"
        class="bg-white dark:bg-zinc-800 rounded-2xl border border-dashed border-stone-300 dark:border-stone-600 p-12 text-center"
      >
        <div class="text-4xl mb-3">🔒</div>
        <p class="text-sm text-stone-500 dark:text-stone-400">請先登入 Google 帳號</p>
        <button
          class="mt-4 px-5 py-2 text-sm font-medium rounded-xl bg-green-700 text-white hover:bg-green-800 transition-colors"
          @click="navigateTo('/login')"
        >前往登入</button>
      </div>

      <!-- 已登入 -->
      <template v-else>

        <!-- Google 帳號資訊卡 -->
        <div class="bg-white dark:bg-zinc-800 rounded-2xl border border-stone-200 dark:border-stone-700 p-4 mb-4 flex items-center gap-3">
          <img
            v-if="customer.picture"
            :src="customer.picture"
            class="w-12 h-12 rounded-full object-cover flex-shrink-0"
          >
          <div
            v-else
            class="w-12 h-12 rounded-full bg-green-600 flex items-center justify-center text-white font-bold text-lg flex-shrink-0"
          >
            {{ customer.name?.charAt(0) || '?' }}
          </div>
          <div class="min-w-0">
            <p class="text-sm font-semibold text-stone-800 dark:text-stone-100 truncate">{{ customer.name }}</p>
            <p class="text-xs text-stone-400 truncate">{{ customer.email }}</p>
            <span class="inline-block mt-1 text-xs font-medium px-2 py-0.5 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400">
              {{ customer.role || 'CUSTOMER' }}
            </span>
          </div>
        </div>

        <!-- 表單卡 -->
        <div class="bg-white dark:bg-zinc-800 rounded-2xl border border-stone-200 dark:border-stone-700 overflow-hidden">
          <div class="px-5 py-3.5 border-b border-stone-100 dark:border-zinc-700">
            <h2 class="text-sm font-semibold text-stone-700 dark:text-stone-200">聯絡資訊</h2>
          </div>

          <!-- 載入中 -->
          <div v-if="loading" class="flex items-center justify-center py-16 text-stone-400 text-sm gap-2">
            <div class="w-4 h-4 border-2 border-green-600 border-t-transparent rounded-full animate-spin" />
            載入中…
          </div>

          <!-- 表單 -->
          <div v-else class="p-5 space-y-4">

            <!-- 手機 -->
            <div>
              <label class="block text-xs font-semibold text-stone-600 dark:text-stone-300 mb-1.5">手機號碼</label>
              <input
                v-model="form.mobile"
                type="tel"
                placeholder="09xx-xxx-xxx"
                class="w-full px-4 py-2.5 rounded-xl border text-sm text-stone-800 dark:text-stone-100 dark:bg-zinc-700 outline-none transition-all"
                :class="mobileError
                  ? 'border-red-300 dark:border-red-600 bg-red-50 dark:bg-red-900/20'
                  : 'border-stone-200 dark:border-stone-600 focus:border-green-500 focus:ring-2 focus:ring-green-100 dark:focus:ring-green-900/30'"
                @input="onMobileInput"
              >
              <p v-if="mobileError" class="text-xs text-red-500 mt-1">{{ mobileError }}</p>
            </div>

            <!-- 市話 -->
            <div>
              <label class="block text-xs font-semibold text-stone-600 dark:text-stone-300 mb-1.5">市話</label>
              <input
                v-model="form.landline"
                type="tel"
                placeholder="02-xxxxxxxx 或 07-xxxxxxx"
                class="w-full px-4 py-2.5 rounded-xl border text-sm text-stone-800 dark:text-stone-100 dark:bg-zinc-700 outline-none transition-all"
                :class="landlineError
                  ? 'border-red-300 dark:border-red-600 bg-red-50 dark:bg-red-900/20'
                  : 'border-stone-200 dark:border-stone-600 focus:border-green-500 focus:ring-2 focus:ring-green-100 dark:focus:ring-green-900/30'"
                @input="onLandlineInput"
              >
              <p v-if="landlineError" class="text-xs text-red-500 mt-1">{{ landlineError }}</p>
            </div>

            <!-- 地址 -->
            <div>
              <label class="block text-xs font-semibold text-stone-600 dark:text-stone-300 mb-1.5">地址</label>
              <input
                v-model="form.address"
                type="text"
                placeholder="縣市 + 詳細地址"
                class="w-full px-4 py-2.5 rounded-xl border border-stone-200 dark:border-stone-600 text-sm text-stone-800 dark:text-stone-100 dark:bg-zinc-700 outline-none focus:border-green-500 focus:ring-2 focus:ring-green-100 dark:focus:ring-green-900/30 transition-all"
              >
            </div>

            <!-- 生日 -->
            <div>
              <label class="block text-xs font-semibold text-stone-600 dark:text-stone-300 mb-1.5">生日</label>
              <input
                v-model="form.birthday"
                type="date"
                class="w-full px-4 py-2.5 rounded-xl border border-stone-200 dark:border-stone-600 text-sm text-stone-800 dark:text-stone-100 dark:bg-zinc-700 outline-none focus:border-green-500 focus:ring-2 focus:ring-green-100 dark:focus:ring-green-900/30 transition-all"
              >
            </div>

            <!-- 備註 -->
            <div>
              <label class="block text-xs font-semibold text-stone-600 dark:text-stone-300 mb-1.5">其他備註</label>
              <textarea
                v-model="form.note"
                rows="3"
                placeholder="過敏食材、特殊飲食需求…"
                class="w-full px-4 py-2.5 rounded-xl border border-stone-200 dark:border-stone-600 text-sm text-stone-800 dark:text-stone-100 dark:bg-zinc-700 outline-none focus:border-green-500 focus:ring-2 focus:ring-green-100 dark:focus:ring-green-900/30 transition-all resize-none"
              />
            </div>

            <!-- 錯誤提示 -->
            <p v-if="error" class="text-xs text-red-500 bg-red-50 dark:bg-red-900/20 rounded-xl px-4 py-2.5">
              {{ error }}
            </p>

            <!-- 儲存按鈕 -->
            <div class="flex justify-end pt-1">
              <button
                :disabled="saving"
                class="px-6 py-2.5 rounded-xl text-sm font-semibold text-white transition-all disabled:opacity-60 flex items-center gap-2"
                :class="saved
                  ? 'bg-emerald-600 hover:bg-emerald-700'
                  : 'bg-green-700 hover:bg-green-800'"
                @click="saveProfile"
              >
                <div v-if="saving" class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span v-if="saving">儲存中…</span>
                <span v-else-if="saved">✓ 已儲存</span>
                <span v-else>儲存設定</span>
              </button>
            </div>

          </div>
        </div>

        <!-- 回員工首頁 -->
        <div class="mt-5 text-center">
          <button
            class="text-sm text-stone-400 dark:text-stone-500 hover:text-green-600 dark:hover:text-green-400 transition-colors"
            @click="navigateTo('/staff/home')"
          >
            ← 回到員工首頁
          </button>
        </div>

      </template>
    </div>
  </div>
</template>
