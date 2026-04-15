<template>
  <div class="min-h-screen flex items-center justify-center px-4"
    style="background-color: #f5f0e8;">

    <div class="w-full max-w-sm">

      <!-- Logo -->
      <div class="text-center mb-8">
        <img src="/images/global/healthfarm_logo.png" alt="台東聖母健康農莊" class="h-20 mx-auto mb-3" />
        <p class="text-sm text-gray-500">後台管理系統</p>
      </div>

      <!-- 登入卡片 -->
      <div class="bg-white rounded-2xl shadow-sm border-2 border-dashed p-8" style="border-color: #b8d8d0;">

        <h1 class="text-lg font-bold text-gray-800 text-center mb-6">管理員登入</h1>

        <div class="space-y-4">

          <!-- 帳號 -->
          <div>
            <label class="block text-sm font-medium text-gray-600 mb-1.5">帳號</label>
            <input
              v-model="username"
              type="text"
              placeholder="請輸入帳號"
              @keydown.enter="login"
              class="w-full px-4 py-3 rounded-xl border text-sm text-gray-800 outline-none transition-all"
              :class="error ? 'border-red-300 bg-red-50' : 'border-gray-200 focus:border-teal-400 focus:ring-2 focus:ring-teal-100'"
            />
          </div>

          <!-- 密碼 -->
          <div>
            <label class="block text-sm font-medium text-gray-600 mb-1.5">密碼</label>
            <input
              v-model="password"
              type="password"
              placeholder="請輸入密碼"
              @keydown.enter="login"
              class="w-full px-4 py-3 rounded-xl border text-sm text-gray-800 outline-none transition-all"
              :class="error ? 'border-red-300 bg-red-50' : 'border-gray-200 focus:border-teal-400 focus:ring-2 focus:ring-teal-100'"
            />
          </div>

          <!-- 錯誤訊息 -->
          <p v-if="error" class="text-sm text-red-500 text-center">{{ error }}</p>

          <!-- 登入按鈕 -->
          <button
            @click="login"
            :disabled="loading"
            class="w-full py-3 rounded-xl text-sm font-semibold text-white transition-all mt-2"
            style="background-color: #5bbfbf;"
            @mouseover="$event.target.style.backgroundColor='#3a9a8a'"
            @mouseout="$event.target.style.backgroundColor='#5bbfbf'"
          >
            <span v-if="loading" class="flex items-center justify-center gap-2">
              <span class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
              登入中…
            </span>
            <span v-else>登入</span>
          </button>
        </div>
      </div>

      <!-- 回前台 -->
      <div class="text-center mt-5">
        <NuxtLink to="/" class="text-sm text-gray-400 hover:text-teal-600 transition-colors">
          ← 回到農莊網站
        </NuxtLink>
      </div>

    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'

definePageMeta({ layout: false })  // 不套用任何 layout

const router   = useRouter()
const username = ref('')
const password = ref('')
const loading  = ref(false)
const error    = ref('')

const login = async () => {
  if (!username.value || !password.value) {
    error.value = '請輸入帳號和密碼'
    return
  }
  if (loading.value) return

  loading.value = true
  error.value   = ''

  try {
    await $fetch('/api/holy/login', {
      method: 'POST',
      body: { username: username.value, password: password.value },
    })
    router.push('/management/DailyMenu')
  } catch {
    error.value = '帳號或密碼錯誤，請再試一次'
    password.value = ''
  } finally {
    loading.value = false
  }
}
</script>
