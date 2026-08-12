<template>
  <div class="sc-login-page">
    <div class="sc-login-card">
      <div class="sc-login-logo">
        <img src="/img/toplogo.png" alt="聖母健康農莊" />
      </div>

      <h1 class="sc-login-title">購物車後台登入</h1>
      <p class="sc-login-sub">登入資訊會即時轉送給原網站驗證，不會另外儲存帳密。</p>

      <form class="sc-login-form" @submit.prevent="handleSubmit">
        <div class="sc-form-group">
          <label for="u"><span class="sc-required">*</span> 帳號</label>
          <input
            id="u"
            v-model.trim="form.u"
            type="text"
            placeholder="帳號"
            autocomplete="username"
          />
        </div>

        <div class="sc-form-group">
          <label for="p"><span class="sc-required">*</span> 密碼</label>
          <input
            id="p"
            v-model="form.p"
            type="password"
            placeholder="密碼"
            autocomplete="current-password"
          />
        </div>

        <p v-if="errorMessage" class="sc-error-message">{{ errorMessage }}</p>

        <label class="sc-remember-row">
          <input v-model="rememberMe" type="checkbox" />
          記住我的帳號密碼
        </label>

        <div class="sc-form-actions">
          <button type="submit" class="sc-btn-submit" :disabled="loading">
            {{ loading ? '登入中…' : '登入' }}
          </button>
          <p class="sc-forgot-hint">若忘記密碼！請聯絡網站管理員！</p>
        </div>
      </form>
    </div>

    <footer class="sc-login-footer">
      © 2015 - {{ currentYear }}
      <a href="http://st-mary.org.tw" target="_blank" rel="noopener">台東聖母醫院</a>
    </footer>
  </div>
</template>

<script setup>
import { reactive, ref, computed, onMounted } from 'vue'

// 這頁呼叫的是本專案自己的 server API route（server/api/shopping-cart/login.post.ts），
// 由該 route 在伺服器端拿這組帳密去登入 shopping.st-mary.org.tw 的 admincp，
// 並把拿到的原網站 session 存成 httpOnly cookie。
// 瀏覽器端全程不會直接接觸原網站，避開 CORS。
definePageMeta({
  layout: false
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

// 頁面載入時，如果之前有勾選「記住我」，把帳密帶回輸入框
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

  // 對應原本 JS：帳號或密碼為空則阻擋送出
  if (!form.u || !form.p) {
    errorMessage.value = '請輸入帳號與密碼'
    return
  }

  loading.value = true
  try {
    await $fetch('/api/shopping-cart/login', {
      method: 'POST',
      body: { u: form.u, p: form.p }
    })

    // 依「記住我」勾選狀態存或清除本機帳密
    try {
      if (rememberMe.value) {
        localStorage.setItem(REMEMBER_KEY, JSON.stringify({ u: form.u, p: form.p }))
      } else {
        localStorage.removeItem(REMEMBER_KEY)
      }
    } catch (err) {
      // 存不進去就算了，不影響登入流程
    }

    await navigateTo('/front/shopping-cart')
  } catch (err) {
    errorMessage.value =
      err?.data?.statusMessage || err?.data?.message || '帳號或密碼錯誤，請重新輸入'
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.sc-login-page {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: #f4f5f7;
  padding: 24px;
}

.sc-login-card {
  width: 100%;
  max-width: 420px;
  background: #fff;
  border-radius: 10px;
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.08);
  padding: 36px 32px;
}

.sc-login-logo {
  display: flex;
  justify-content: center;
  margin-bottom: 20px;
}

.sc-login-logo img {
  max-height: 64px;
}

.sc-login-title {
  text-align: center;
  font-size: 20px;
  font-weight: 600;
  color: #1a3d28;
  margin: 0 0 8px;
}

.sc-login-sub {
  text-align: center;
  font-size: 12px;
  color: #999;
  margin: 0 0 24px;
  border-bottom: 1px solid #dce8d8;
  padding-bottom: 16px;
}

.sc-login-form {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.sc-form-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.sc-form-group label {
  font-size: 14px;
  color: #555;
}

.sc-required {
  color: #d9534f;
  margin-right: 2px;
}

.sc-form-group input {
  padding: 10px 12px;
  font-size: 14px;
  border: 1px solid #ccc;
  border-radius: 4px;
  outline: none;
  transition: border-color 0.15s;
}

.sc-form-group input:focus {
  border-color: #3d7a52;
}

.sc-error-message {
  margin: 0;
  color: #d9534f;
  font-size: 13px;
}

.sc-remember-row {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: #555;
  cursor: pointer;
  user-select: none;
}

.sc-remember-row input {
  width: 14px;
  height: 14px;
  cursor: pointer;
}

.sc-form-actions {
  margin-top: 6px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.sc-btn-submit {
  padding: 10px;
  font-size: 15px;
  color: #fff;
  background: #3d7a52;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  transition: background 0.15s;
}

.sc-btn-submit:hover:not(:disabled) {
  background: #2f6141;
}

.sc-btn-submit:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.sc-forgot-hint {
  margin: 0;
  font-size: 12px;
  color: #888;
  text-align: center;
}

.sc-login-footer {
  margin-top: 24px;
  font-size: 12px;
  color: #999;
}

.sc-login-footer a {
  color: #3d7a52;
  text-decoration: none;
}
</style>
