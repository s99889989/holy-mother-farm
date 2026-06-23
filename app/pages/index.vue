<script setup>
import { useCustomerStore } from '~/stores/customer.js'
import { usePermissionStore } from '~/stores/permission.js'
import { useCommonStore } from '~/stores/common.js'

definePageMeta({ layout: 'loginl' })
useSiteHead({
  title: '聖母農莊管理系統',
  description: '員工專區',
  ogTitle: '聖母農莊管理系統',
  ogDescription: '員工專區',
  ogImage: 'https://holymotherfarm.netlify.app/images/home/index_og.jpg',
  twitterImage: 'https://holymotherfarm.netlify.app/images/home/index_og.jpg'
})

const commonStore = useCommonStore()
const customerStore = useCustomerStore()
const permissionStore = usePermissionStore()

const BASE = computed(() => commonStore.data.main_url + '/holy/customer')
const GOOGLE_CLIENT_ID = computed(() => commonStore.data.google_client_id)

// ── WebView 偵測 ─────────────────────────────────────────────────
// Google OAuth / GSI 禁止在 in-app browser（LINE、FB、IG 等）內使用，
// 偵測到 WebView 時顯示提示，引導使用者改用外部瀏覽器。
const isWebView = ref(false)

function detectWebView() {
  if (!import.meta.client) return false
  const ua = navigator.userAgent

  // LINE
  if (/Line\//i.test(ua)) return true
  // Facebook (FBAN / FBAV / FB_IAB)
  if (/FBAN|FBAV|FB_IAB/i.test(ua)) return true
  // Instagram
  if (/Instagram/i.test(ua)) return true
  // WeChat
  if (/MicroMessenger/i.test(ua)) return true
  // Android WebView（Chrome with wv flag）
  if (/Android/.test(ua) && /wv\b/.test(ua)) return true
  // iOS 上非 Safari（無 Safari/ token，但有 AppleWebKit）
  if (/iPhone|iPad|iPod/.test(ua) && /AppleWebKit/.test(ua) && !/Safari\//.test(ua)) return true

  return false
}

// ── 初始化 ──────────────────────────────────────────────────────
onMounted(async () => {
  isWebView.value = detectWebView()

  await fetchMe()

  // WebView 內不載入 GSI，避免出現 Google disallowed_useragent 錯誤
  if (isWebView.value) return

  if (!document.getElementById('google-gsi-script')) {
    const script = document.createElement('script')
    script.id = 'google-gsi-script'
    script.src = 'https://accounts.google.com/gsi/client'
    script.async = true
    script.defer = true
    script.onload = () => initGoogle()
    document.head.appendChild(script)
  } else {
    initGoogle()
  }
})

const initGoogle = (attempt = 0) => {
  if (!window.google) {
    if (attempt < 20) setTimeout(() => initGoogle(attempt + 1), 300)
    return
  }
  if (!GOOGLE_CLIENT_ID.value) return
  window.google.accounts.id.initialize({
    client_id: GOOGLE_CLIENT_ID.value,
    callback: handleCredential,
    auto_select: false,
  })
  const el = document.getElementById('google-signin-btn')
  if (el) {
    window.google.accounts.id.renderButton(el, {
      theme: 'filled_black',
      size: 'large',
      text: 'signin_with',
      locale: 'zh-TW',
      width: 280,
    })
  }
}

const loading = ref(false)
const error = ref('')

const handleCredential = async (response) => {
  loading.value = true
  error.value = ''
  try {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 15000)

    const res = await fetch(`${BASE.value}/google-login`, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      credentials: 'include',
      signal: controller.signal,
      body: JSON.stringify({credential: response.credential}),
    })
    clearTimeout(timer)

    const data = await res.json()
    if (!data.error) {
      console.log('權限' + data.role)
      const allowedRoles = ['STAFF', 'EDITOR', 'ADMIN', 'CUSTOMER']
      if (!allowedRoles.includes(data.role)) {
        error.value = '此帳號非員工帳號，無法登入員工後台'
        // 確保未授權帳號不會留下登入態
        await fetch(`${BASE.value}/logout`, {method: 'POST', credentials: 'include'})
        return
      }
      customerStore.setCustomer(data)
      await permissionStore.load(data.id, commonStore.data.main_url)
      navigateTo('/staff/home')
    } else {
      error.value = data.error === 'Google token 驗證失敗'
        ? 'Google 驗證失敗，請重新登入'
        : '登入失敗，請再試一次'
    }
  } catch (e) {
    error.value = e.name === 'AbortError'
      ? '連線逾時（15秒），請確認網路後再試'
      : '連線失敗，請確認網路後再試'
  } finally {
    loading.value = false
  }
}

const fetchMe = async () => {
  try {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 10000)
    const res = await fetch(`${BASE.value}/me`, {
      credentials: 'include',
      signal: controller.signal,
    })
    clearTimeout(timer)
    const data = await res.json()
    if (!data.error) {
      const allowedRoles = ['STAFF', 'EDITOR', 'ADMIN']
      if (!allowedRoles.includes(data.role)) return
      customerStore.setCustomer(data)
      await permissionStore.load(data.id, commonStore.data.main_url)
      navigateTo('/staff/home')
    }
  } catch {
    // 未登入，靜默留在頁面
  }
}
</script>

<template>
  <div class="login-root">
    <!-- ── Navbar ─────────────────────────────────────────── -->
    <nav class="login-nav">
      <div class="login-nav-inner">
        <div class="login-nav-brand">
          <img
            src="/images/global/healthfarm_logo.png"
            alt="台東聖母健康農莊"
            class="login-logo"
          >
          <div class="login-nav-titles">
            <span class="login-nav-name">台東聖母健康農莊</span>
            <span class="login-nav-sub">Holy Mother Health Farm</span>
          </div>
        </div>
      </div>
    </nav>

    <!-- ── 主體 ─────────────────────────────────────────── -->
    <main class="login-main">
      <div class="login-card-wrap">

        <!-- 卡片頂部色帶（簽名元素） -->
        <div class="login-accent-bar"/>

        <div class="login-card">
          <!-- 標題區 -->
          <div class="login-header">
            <div class="login-badge">員</div>
            <div>
              <h1 class="login-title">員工登入</h1>
              <p class="login-subtitle">Staff Portal</p>
            </div>
          </div>

          <!-- 說明文字 -->
          <p class="login-desc">
            請使用農莊授權的 Google 帳號登入
          </p>

          <!-- 按鈕區 -->
          <div class="login-btn-area">
            <!-- WebView 提示（LINE / FB / IG 等 in-app browser） -->
            <div v-if="isWebView" class="webview-warning">
              <svg class="webview-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="8" x2="12" y2="12"/>
                <line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              <p class="webview-title">請用外部瀏覽器開啟</p>
              <p class="webview-hint">
                目前在 App 內建瀏覽器中，Google 登入無法使用。<br>
                請點選右上角選單，選擇「在瀏覽器中開啟」後再登入。
              </p>
            </div>

            <!-- 正常登入按鈕 -->
            <template v-else>
              <div v-if="loading" class="login-loading">
                <span class="login-spinner"/>
                <span>登入中…</span>
              </div>
              <div v-show="!loading" id="google-signin-btn"/>
            </template>
          </div>

          <!-- 錯誤訊息 -->
          <p v-if="error" class="login-error">
            <svg viewBox="0 0 20 20" fill="currentColor" class="error-icon">
              <path fill-rule="evenodd"
                    d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                    clip-rule="evenodd"/>
            </svg>
            {{ error }}
          </p>
        </div>

        <p class="login-footer">
          僅限農莊內部員工使用
        </p>
      </div>
    </main>
  </div>
</template>

<style scoped>
/* ── CSS 變數：深色模式 ─────────────────────────────────── */
.login-root {
  --bg: #1a1f1b;
  --nav-bg: #212720;
  --nav-border: #2e352e;
  --card-bg: #252b25;
  --card-border: #323832;
  --card-shadow: 0 2px 20px 0 rgba(0, 0, 0, 0.35);
  --accent-1: #52b788;
  --accent-2: #2d6a4f;
  --accent-3: #1b4332;
  --badge-bg: #52b788;
  --badge-text: #1a2e1e;
  --title: #e8ede8;
  --subtitle: #7a8a7a;
  --desc: #909a90;
  --footer: #4a524a;
  --error-bg: #2d1515;
  --error-border: #7f1d1d;
  --error-text: #fca5a5;
  --spinner: #52b788;
  --nav-name: #c8d4c8;
  --nav-sub: #5a6a5a;
  --webview-bg: #1e2d2a;
  --webview-border: #2a4a3e;
  --webview-icon: #52b788;
  --webview-title: #d4e8d4;
  --webview-hint: #7a9a7a;

  min-height: 100dvh;
  background: var(--bg);
  display: flex;
  flex-direction: column;
}

/* ── Navbar ────────────────────────────────────────── */
.login-nav {
  background: var(--nav-bg);
  border-bottom: 1px solid var(--nav-border);
  padding: 0 1.25rem;
  height: 52px;
}

.login-nav-inner {
  max-width: 480px;
  margin: 0 auto;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.login-nav-brand {
  display: flex;
  align-items: center;
  gap: 0.6rem;
}

.login-logo {
  height: 28px;
  width: auto;
}

.login-nav-titles {
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.login-nav-name {
  font-size: 0.8rem;
  font-weight: 700;
  color: var(--nav-name);
  line-height: 1;
}

.login-nav-sub {
  font-size: 0.65rem;
  color: var(--nav-sub);
  line-height: 1;
  letter-spacing: 0.02em;
}

/* ── 主體 ───────────────────────────────────────────── */
.login-main {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2.5rem 1rem;
}

.login-card-wrap {
  width: 100%;
  max-width: 360px;
  display: flex;
  flex-direction: column;
  align-items: center;
}

/* ── 簽名色帶 ──────────────────────────────────────── */
.login-accent-bar {
  width: 100%;
  height: 5px;
  border-radius: 4px 4px 0 0;
  background: linear-gradient(90deg, var(--accent-1) 0%, var(--accent-2) 55%, var(--accent-3) 100%);
}

/* ── 卡片 ──────────────────────────────────────────── */
.login-card {
  width: 100%;
  background: var(--card-bg);
  border: 1px solid var(--card-border);
  border-top: none;
  border-radius: 0 0 14px 14px;
  box-shadow: var(--card-shadow);
  padding: 2rem 2rem 1.75rem;
}

/* ── 標題區 ─────────────────────────────────────────── */
.login-header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 1.25rem;
}

.login-badge {
  width: 36px;
  height: 36px;
  border-radius: 9px;
  background: var(--badge-bg);
  color: var(--badge-text);
  font-size: 0.85rem;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.login-title {
  font-size: 1rem;
  font-weight: 700;
  color: var(--title);
  line-height: 1.1;
  margin: 0;
}

.login-subtitle {
  font-size: 0.7rem;
  color: var(--subtitle);
  margin-top: 2px;
  letter-spacing: 0.06em;
}

/* ── 說明文字 ────────────────────────────────────────── */
.login-desc {
  font-size: 0.82rem;
  color: var(--desc);
  text-align: center;
  margin: 0 0 1.25rem;
  line-height: 1.55;
}

/* ── 按鈕區 ─────────────────────────────────────────── */
.login-btn-area {
  display: flex;
  justify-content: center;
  min-height: 44px;
}

.login-loading {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.82rem;
  color: var(--desc);
}

.login-spinner {
  width: 16px;
  height: 16px;
  border: 2px solid var(--spinner);
  border-top-color: transparent;
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg)
  }
}

/* ── WebView 提示 ────────────────────────────────────── */
.webview-warning {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  padding: 1rem 1.25rem;
  border-radius: 10px;
  background: var(--webview-bg);
  border: 1px solid var(--webview-border);
  text-align: center;
  width: 100%;
}

.webview-icon {
  width: 28px;
  height: 28px;
  color: var(--webview-icon);
  flex-shrink: 0;
}

.webview-title {
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--webview-title);
  margin: 0;
}

.webview-hint {
  font-size: 0.75rem;
  color: var(--webview-hint);
  margin: 0;
  line-height: 1.6;
}

/* ── 錯誤訊息 ────────────────────────────────────────── */
.login-error {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  margin-top: 1rem;
  padding: 0.6rem 0.75rem;
  border-radius: 8px;
  background: var(--error-bg);
  border: 1px solid var(--error-border);
  font-size: 0.78rem;
  color: var(--error-text);
  line-height: 1.4;
}

.error-icon {
  width: 15px;
  height: 15px;
  flex-shrink: 0;
}

/* ── 頁尾 ───────────────────────────────────────────── */
.login-footer {
  margin-top: 1.1rem;
  font-size: 0.7rem;
  color: var(--footer);
  text-align: center;
}
</style>
