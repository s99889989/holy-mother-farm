<script setup>
import {reactive, ref, computed, onMounted} from 'vue'

// 這頁呼叫的是本專案自己的 server API route（server/api/shopping-cart/login.post.ts），
// 由該 route 在伺服器端拿這組帳密去登入 shopping.st-mary.org.tw 的 admincp，
// 並把拿到的原網站 session 存成 httpOnly cookie。
// 瀏覽器端全程不會直接接觸原網站，避開 CORS。
//
// 注意：這是「購物車原網站」的獨立登入（跟 staff 的 Google 登入是兩回事），
// 但仍套用 staff layout，讓上方導覽列維持顯示。
definePageMeta({
  layout: 'staff'
})

const REMEMBER_KEY = 'sc_remember_login'

const form = reactive({
  u: '',
  p: ''
})

const rememberMe = ref(false)
const loading = ref(false)
const errorMessage = ref('')
const currentYear = computed(() => new Date().getFullYear())

onMounted(() => {
  try {
    const saved = localStorage.getItem(REMEMBER_KEY)
    if (saved) {
      const parsed = JSON.parse(saved)
      form.u = parsed.u || ''
      form.p = parsed.p || ''
      rememberMe.value = true
    }
  } catch (err) {
    // localStorage 讀取失敗（例如無痕模式）就當作沒記住，不影響登入
  }
})

async function handleSubmit() {
  errorMessage.value = ''

  if (!form.u || !form.p) {
    errorMessage.value = '請輸入帳號與密碼'
    return
  }

  loading.value = true
  try {
    await $fetch('/api/shopping-cart/login', {
      method: 'POST',
      body: {u: form.u, p: form.p}
    })

    try {
      if (rememberMe.value) {
        localStorage.setItem(REMEMBER_KEY, JSON.stringify({u: form.u, p: form.p}))
      } else {
        localStorage.removeItem(REMEMBER_KEY)
      }
    } catch (err) {
      // 存不進去就算了，不影響登入流程
    }

    await navigateTo('/staff/order/shopping-cart')
  } catch (err) {
    errorMessage.value =
      err?.data?.statusMessage || err?.data?.message || '帳號或密碼錯誤，請重新輸入'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="min-h-full flex flex-col items-center justify-center bg-surface2 p-6 transition-colors duration-300">
    <div class="w-full max-w-md bg-surface rounded-2xl border border-light-c shadow-sm p-8">
      <div class="flex justify-center mb-5">
        <div class="w-14 h-14 rounded-2xl bg-green-800 flex items-center justify-center text-white text-xl font-bold">
          購
        </div>
      </div>

      <h1 class="text-center text-lg font-bold text-base-c mb-1">購物車後台登入</h1>
      <p class="text-center text-xs text-hint-c mb-6 pb-4 border-b border-light-c">
        登入資訊會即時轉送給原網站驗證，不會另外儲存帳密。
      </p>

      <form class="space-y-4" @submit.prevent="handleSubmit">
        <div class="space-y-1.5">
          <label for="u" class="text-sm font-medium text-muted-c">
            <span class="text-red-500 mr-0.5">*</span>帳號
          </label>
          <input
            id="u"
            v-model.trim="form.u"
            type="text"
            placeholder="帳號"
            autocomplete="username"
            class="w-full px-3 py-2.5 text-sm rounded-xl border border-light-c bg-surface text-base-c outline-none focus:ring-2 focus:ring-green-400"
          >
        </div>

        <div class="space-y-1.5">
          <label for="p" class="text-sm font-medium text-muted-c">
            <span class="text-red-500 mr-0.5">*</span>密碼
          </label>
          <input
            id="p"
            v-model="form.p"
            type="password"
            placeholder="密碼"
            autocomplete="current-password"
            class="w-full px-3 py-2.5 text-sm rounded-xl border border-light-c bg-surface text-base-c outline-none focus:ring-2 focus:ring-green-400"
          >
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
          <p class="text-xs text-hint-c text-center">若忘記密碼！請聯絡網站管理員！</p>
        </div>
      </form>
    </div>

    <footer class="mt-6 text-xs text-hint-c">
      © 2015 - {{ currentYear }}
      <a href="http://st-mary.org.tw" target="_blank" rel="noopener"
         class="text-green-700 dark:text-green-400 hover:underline">
        台東聖母醫院
      </a>
    </footer>
  </div>
</template>
