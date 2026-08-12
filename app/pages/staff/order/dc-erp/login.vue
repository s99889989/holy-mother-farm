<script setup>
import { reactive, ref, computed, onMounted } from 'vue'

// 這頁對應原網站 https://dc.st-mary.org.tw/COAERP 的登入。
// 跟購物車後台不同，這個原網站是 ASP.NET MVC，登入除了帳密還需要：
//   1. __RequestVerificationToken（防偽 token，隨登入頁一起產生，登入時要原封不動帶回去）
//   2. 圖形驗證碼（Code），圖片本身也是經由本站伺服器代理拿回來的，
//      瀏覽器全程不會直接接觸原網站，避開 CORS，也不會落地存帳密。
//
// 「記住帳號密碼」比照購物車後台 login.vue 的做法：只存在使用者自己瀏覽器的
// localStorage，勾選才存、取消勾選會清掉，不會送到本站伺服器或另外落地保存。
// 驗證碼每次都要重新輸入，不在記住範圍內。
definePageMeta({
  layout: false
})

const REMEMBER_KEY = 'dc_erp_remember_login'

const form = reactive({
  account: '',
  password: '',
  code: ''
})

const rememberMe = ref(false)
const showPassword = ref(false)
const token = ref('')
const captchaSrc = ref('')
const loading = ref(false)
const captchaLoading = ref(false)
const errorMessage = ref('')
const currentYear = computed(() => new Date().getFullYear())

onMounted(() => {
  try {
    const saved = localStorage.getItem(REMEMBER_KEY)
    if (saved) {
      const parsed = JSON.parse(saved)
      form.account = parsed.account || ''
      form.password = parsed.password || ''
      rememberMe.value = true
    }
  } catch (err) {
    // localStorage 讀取失敗（例如無痕模式）就當作沒記住，不影響登入
  }
})

async function loadCaptcha() {
  captchaLoading.value = true
  try {
    const data = await $fetch('/api/dc-erp/captcha')
    token.value = data.token
    captchaSrc.value = `/api/dc-erp/captcha-image?key=${encodeURIComponent(data.imageKey)}&t=${Date.now()}`
  } catch (err) {
    errorMessage.value = '驗證碼載入失敗，請重新整理頁面'
  } finally {
    captchaLoading.value = false
  }
}

async function handleSubmit() {
  errorMessage.value = ''

  if (!form.account || !form.password || !form.code) {
    errorMessage.value = '請輸入帳號、密碼與驗證碼'
    return
  }

  loading.value = true
  try {
    await $fetch('/api/dc-erp/login', {
      method: 'POST',
      body: {
        account: form.account,
        password: form.password,
        code: form.code,
        token: token.value
      }
    })

    try {
      if (rememberMe.value) {
        localStorage.setItem(REMEMBER_KEY, JSON.stringify({ account: form.account, password: form.password }))
      } else {
        localStorage.removeItem(REMEMBER_KEY)
      }
    } catch (err) {
      // 存不進去就算了，不影響登入流程
    }

    await navigateTo('/staff/order/dc-erp')
  } catch (err) {
    errorMessage.value =
      err?.data?.statusMessage || err?.data?.message || '帳號、密碼或驗證碼錯誤，請重新輸入'
    form.code = ''
    await loadCaptcha()
  } finally {
    loading.value = false
  }
}

onMounted(loadCaptcha)
</script>

<template>
  <div class="min-h-screen flex flex-col items-center justify-center bg-surface2 p-6 transition-colors duration-300">
    <div class="w-full max-w-md bg-surface rounded-2xl border border-light-c shadow-sm p-8">
      <div class="flex justify-center mb-5">
        <div class="w-14 h-14 rounded-2xl bg-green-800 flex items-center justify-center text-white text-xl font-bold">
          農
        </div>
      </div>

      <h1 class="text-center text-lg font-bold text-base-c mb-1">農業生產組織經營管理系統登入</h1>
      <p class="text-center text-xs text-hint-c mb-6 pb-4 border-b border-light-c">
        登入資訊會即時轉送給原網站驗證，不會另外儲存帳密。
      </p>

      <form class="space-y-4" @submit.prevent="handleSubmit">
        <div class="space-y-1.5">
          <label for="account" class="text-sm font-medium text-muted-c">
            <span class="text-red-500 mr-0.5">*</span>帳號
          </label>
          <input
            id="account"
            v-model.trim="form.account"
            type="text"
            placeholder="帳號"
            autocomplete="username"
            class="w-full px-3 py-2.5 text-sm rounded-xl border border-light-c bg-surface text-base-c outline-none focus:ring-2 focus:ring-green-400"
          >
        </div>

        <div class="space-y-1.5">
          <label for="password" class="text-sm font-medium text-muted-c">
            <span class="text-red-500 mr-0.5">*</span>密碼
          </label>
          <div class="relative">
            <input
              id="password"
              v-model="form.password"
              :type="showPassword ? 'text' : 'password'"
              placeholder="密碼"
              autocomplete="current-password"
              class="w-full px-3 py-2.5 pr-10 text-sm rounded-xl border border-light-c bg-surface text-base-c outline-none focus:ring-2 focus:ring-green-400"
            >
            <button
              type="button"
              class="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-hint-c hover:text-muted-c"
              :aria-label="showPassword ? '隱藏密碼' : '顯示密碼'"
              @click="showPassword = !showPassword"
            >
              {{ showPassword ? '隱藏' : '顯示' }}
            </button>
          </div>
        </div>

        <div class="space-y-1.5">
          <label for="code" class="text-sm font-medium text-muted-c">
            <span class="text-red-500 mr-0.5">*</span>驗證碼
          </label>
          <div class="flex items-center gap-2">
            <input
              id="code"
              v-model.trim="form.code"
              type="text"
              placeholder="請輸入右方圖片數字"
              autocomplete="off"
              class="flex-1 px-3 py-2.5 text-sm rounded-xl border border-light-c bg-surface text-base-c outline-none focus:ring-2 focus:ring-green-400"
            >
            <button
              type="button"
              class="shrink-0 rounded-lg overflow-hidden border border-light-c disabled:opacity-50"
              title="看不清楚？點擊圖片重新產生"
              :disabled="captchaLoading"
              @click="loadCaptcha"
            >
              <img v-if="captchaSrc" :src="captchaSrc" alt="驗證碼" class="block h-[35px] w-[110px]">
              <span v-else class="flex h-[35px] w-[110px] items-center justify-center text-xs text-hint-c">
                載入中
              </span>
            </button>
          </div>
          <p class="text-xs text-hint-c">看不清楚可點擊圖片重新產生</p>
        </div>

        <p v-if="errorMessage" class="text-red-600 dark:text-red-400 text-sm">
          {{ errorMessage }}
        </p>

        <label class="flex items-center gap-2 text-sm text-muted-c cursor-pointer select-none">
          <input v-model="rememberMe" type="checkbox" class="w-3.5 h-3.5">
          記住我的帳號密碼
        </label>

        <div class="pt-1 space-y-2">
          <button
            type="submit"
            :disabled="loading"
            class="w-full py-2.5 text-sm font-medium bg-green-700 text-white rounded-xl hover:bg-green-800 disabled:opacity-50 transition-colors"
          >
            {{ loading ? '登入中…' : '登入' }}
          </button>
        </div>
      </form>
    </div>

    <footer class="mt-6 text-xs text-hint-c">
      財團法人聖母健康農莊 © {{ currentYear }}
    </footer>
  </div>
</template>
