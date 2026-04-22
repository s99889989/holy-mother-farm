<script setup>
import {ref, computed, onMounted, onUnmounted, nextTick} from 'vue'
import {useCommonStore} from '~/stores/common.js'
import {useCustomerStore} from '~/stores/customer.js'

const isOpen = ref(false)
const route = useRoute()

// 換頁時自動關閉選單
watch(() => route.path, () => {
  isOpen.value = false
})

function toggleMenu() {
  isOpen.value = !isOpen.value
}

// ── 頭像下拉 ──────────────────────────────────────────────────────
const commonStore = useCommonStore()
const customerStore = useCustomerStore()
const BASE = computed(() => commonStore.data.main_url + '/holy/customer')
const GOOGLE_CLIENT_ID = computed(() => commonStore.data.google_client_id)

const avatarOpen = ref(false)
const avatarRef = ref(null)
const customer = computed(() => customerStore.customer)

const toggleAvatar = () => {
  avatarOpen.value = !avatarOpen.value
  if (avatarOpen.value && !customer.value) {
    nextTick(() => renderGoogleBtn('nav-google-btn'))
  }
}
const closeAvatar = () => {
  avatarOpen.value = false
}

const onClickOutside = (e) => {
  if (avatarRef.value && !avatarRef.value.contains(e.target)) {
    avatarOpen.value = false
  }
}

// ── Google 登入 ───────────────────────────────────────────────────
const initGoogle = () => {
  if (!window.google) return
  window.google.accounts.id.initialize({
    client_id: GOOGLE_CLIENT_ID.value,
    callback: handleCredential,
    auto_select: false,
  })
}

const renderGoogleBtn = (elId) => {
  if (!window.google) return
  const el = document.getElementById(elId)
  if (!el) return
  window.google.accounts.id.renderButton(el, {
    theme: 'outline', size: 'medium', text: 'signin_with', locale: 'zh-TW', width: 220,
  })
}

const handleCredential = async (response) => {
  try {
    const res = await fetch(`${BASE.value}/google-login`, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      credentials: 'include',
      body: JSON.stringify({credential: response.credential})
    })
    const data = await res.json()
    if (!data.error) {
      customerStore.setCustomer(data)
      avatarOpen.value = false
    }
  } catch {
  }
}

const logout = async () => {
  await fetch(`${BASE.value}/logout`, {method: 'POST', credentials: 'include'})
  customerStore.clearCustomer()
  avatarOpen.value = false
}

const fetchMe = async () => {
  try {
    const data = await (await fetch(`${BASE.value}/me`, {credentials: 'include'})).json()
    if (!data.error) customerStore.setCustomer(data)
  } catch {
  }
}

onMounted(async () => {
  await fetchMe()
  document.addEventListener('click', onClickOutside)

  if (!document.getElementById('google-gsi-script')) {
    const script = document.createElement('script')
    script.id = 'google-gsi-script'
    script.src = 'https://accounts.google.com/gsi/client'
    script.async = true
    script.defer = true
    script.onload = () => initGoogle()
    document.head.appendChild(script)
  } else if (window.google) {
    initGoogle()
  }
})

onUnmounted(() => {
  document.removeEventListener('click', onClickOutside)
})
</script>

<template>
  <!-- Mobile / Pad Navbar -->
  <nav
    class="nav d-xl-none nav-shadow"
    :class="{ open: isOpen }"
    style="background: url(/images/global/nav-bg.png);"
  >
    <div class="nav-header">
      <div class="navLogo">
        <NuxtLink class="navbar-brand mob-logo" to="/">
          <img src="/images/global/healthfarm_logo.png" alt="聖母健康農莊">
        </NuxtLink>
      </div>
      <div class="navToggle" :class="{ open: isOpen }" @click="toggleMenu">
        <div class="icon"></div>
      </div>
    </div>
    <ul
      id="menu-menu-principale-1"
      class="vertical menu por"
      role="menu"
      aria-multiselectable="true"
    >
      <li>
        <NuxtLink to="/">首頁</NuxtLink>
        <span>
          <a href="https://www.facebook.com/st.maryhealthfarm/" target="_blank">
            <i class="fab fa-facebook-square" style="transform: scale(1.3) translateX(200%); color:#fff"></i>
          </a>
        </span>
        <span>
          <a href="mailto:healthfarm@st-mary.com.tw">
            <i class="fas fa-envelope" style="transform: scale(1.3) translateX(250%); color:#fff"></i>
          </a>
        </span>
      </li>
      <li id="mob-menu">
        <NuxtLink to="/front/news">最新消息</NuxtLink>
      </li>
      <li>
        <NuxtLink to="/front/about">關於我們</NuxtLink>
      </li>
      <li>
        <NuxtLink to="/front/production">產品訂購</NuxtLink>
      </li>
      <li>
        <NuxtLink to="/front/event">活動報名</NuxtLink>
      </li>
      <li role="menuitem">
        <NuxtLink to="/front/restaurant">田園餐廳</NuxtLink>
      </li>
      <li role="menuitem">
        <NuxtLink to="/front/cafe">休憩小舖</NuxtLink>
      </li>
      <li role="menuitem">
        <NuxtLink to="/front/access">交通方式</NuxtLink>
      </li>

      <!-- 手機版帳號區 -->
      <li class="mob-account-section">
        <div v-if="customer" class="mob-account-info">
          <div class="mob-avatar-circle">
            <img
              v-if="customer.picture"
              :src="customer.picture"
              :alt="customer.name"
              class="mob-avatar-img"
            >
            <span v-else>{{ customer.name?.charAt(0)?.toUpperCase() }}</span>
          </div>
          <div class="mob-account-text">
            <p class="mob-account-name">{{ customer.name }}</p>
            <p class="mob-account-email">{{ customer.email }}</p>
          </div>
        </div>
        <div v-if="customer" class="mob-account-links">
          <NuxtLink to="/front/profile/log" @click="isOpen = false" class="mob-account-link">我的訂位紀錄</NuxtLink>
          <button @click="logout(); isOpen = false" class="mob-account-logout">登出</button>
        </div>
        <div v-else class="mob-account-login">
          <p class="mob-login-hint">登入後可查看訂位與便當紀錄</p>
          <div id="nav-google-btn-mobile"></div>
        </div>
      </li>

      <div class="por">
        <img src="/images/homepage/healthfarm_hp_ill_cloud1.png" class="nav-cloud1">
        <img src="/images/homepage/healthfarm_hp_ill_cloud2.png" class="nav-cloud2">
        <img src="/images/homepage/healthfarm_hp_ill_cloud3.png" alt="" class="nav-cloud3">
      </div>
      <div class="col-10 col-sm-8 mx-auto">
        <img src="/images/homepage/healthfarm_hp_news_people.png" class="mob-nav-people img-fluid">
      </div>
    </ul>
  </nav>

  <!-- Desktop Navbar -->
  <div class="d-none d-xl-block">
    <nav class="navbar navbar-expand-xl navbar-light bg-light nav-shadow d-nav"
         id="navbar" style="position: relative;">
      <div class="container">
        <div class="col-xl-3 align-middle pl-5">
          <NuxtLink class="navbar-brand d-logo" to="/">
            <img src="/images/global/healthfarm_logo.png" alt="聖母健康農莊">
          </NuxtLink>
        </div>
        <button class="navbar-toggler" type="button" data-toggle="collapse" data-target="#navbarNavAltMarkup"
                aria-controls="navbarNavAltMarkup" aria-expanded="false" aria-label="Toggle navigation">
          <span class="navbar-toggler-icon"></span>
        </button>
        <div class="d-none d-xl-inline-block col-xl-1"></div>
        <div class="collapse navbar-collapse col-xl-8" id="navbarNavAltMarkup">
          <div class="navbar-nav">
            <div class="nav-box mr-lg-3">
              <NuxtLink class="nav-item nav-link nav-cus" to="/front/news" style="color:#2a1001; font-weight: 500;">
                最新消息
              </NuxtLink>
              <div class="nav-line-mask">
                <div class="nav-line-bar"></div>
              </div>
            </div>
            <div class="nav-box mr-lg-3">
              <NuxtLink class="nav-item nav-link nav-cus" to="/front/about" style="color:#2a1001; font-weight: 500;">
                關於我們
              </NuxtLink>
              <div class="nav-line-mask">
                <div class="nav-line-bar"></div>
              </div>
            </div>
            <div class="nav-box mr-lg-3">
              <NuxtLink class="nav-item nav-link nav-cus" to="/front/production"
                        style="color:#2a1001; font-weight: 500;">產品訂購
              </NuxtLink>
              <div class="nav-line-mask">
                <div class="nav-line-bar"></div>
              </div>
            </div>
            <div class="nav-box mr-lg-3">
              <NuxtLink class="nav-item nav-link nav-cus" to="/front/event" style="color:#2a1001; font-weight: 500;">
                活動報名
              </NuxtLink>
              <div class="nav-line-mask">
                <div class="nav-line-bar"></div>
              </div>
            </div>
            <div class="nav-box mr-lg-3">
              <NuxtLink class="nav-item nav-link nav-cus" to="/front/restaurant"
                        style="color:#2a1001; font-weight: 500;">田園餐廳
              </NuxtLink>
              <div class="nav-line-mask">
                <div class="nav-line-bar"></div>
              </div>
            </div>
            <div class="nav-box mr-lg-3">
              <NuxtLink class="nav-item nav-link nav-cus" to="/front/cafe" style="color:#2a1001; font-weight: 500;">
                休憩小舖
              </NuxtLink>
              <div class="nav-line-mask">
                <div class="nav-line-bar"></div>
              </div>
            </div>
            <div class="nav-box mr-lg-3">
              <NuxtLink class="nav-item nav-link nav-cus" to="/front/access" style="color:#2a1001; font-weight: 500;">
                交通方式
              </NuxtLink>
              <div class="nav-line-mask">
                <div class="nav-line-bar"></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- ★ 頭像區：navbar 的直接子元素，position:absolute 定位右側
              脫離 navbar-collapse，下拉選單不會被 overflow 裁切 -->
      <div class="avatar-wrapper" ref="avatarRef">

        <!-- 未登入：人形 icon -->
        <button v-if="!customer" @click="toggleAvatar" class="avatar-btn avatar-btn--guest">
          <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
          </svg>
        </button>

        <!-- 已登入：Google 頭像或首字母 -->
        <button v-else @click="toggleAvatar" class="avatar-btn avatar-btn--user">
          <img
            v-if="customer.picture"
            :src="customer.picture"
            :alt="customer.name"
            class="avatar-btn__img"
          >
          <span v-else>{{ customer.name?.charAt(0)?.toUpperCase() || '?' }}</span>
        </button>

        <!-- 下拉選單 -->
        <Transition name="avatar-drop">
          <div v-if="avatarOpen" class="avatar-dropdown">

            <!-- 已登入：帳號資訊 -->
            <div v-if="customer" class="avatar-dropdown__header">
              <div class="avatar-dropdown__avatar">
                <img
                  v-if="customer.picture"
                  :src="customer.picture"
                  :alt="customer.name"
                  class="avatar-dropdown__img"
                >
                <span v-else>{{ customer.name?.charAt(0)?.toUpperCase() }}</span>
              </div>
              <div class="avatar-dropdown__info">
                <p class="avatar-dropdown__name">{{ customer.name }}</p>
                <p class="avatar-dropdown__email">{{ customer.email }}</p>
              </div>
            </div>

            <!-- 未登入：Google 按鈕 -->
            <div v-else class="avatar-dropdown__header avatar-dropdown__header--login">
              <p class="avatar-dropdown__hint">登入後可查看訂位與便當紀錄</p>
              <div id="nav-google-btn"></div>
            </div>

            <!-- 選單項目 -->
            <ul v-if="customer" class="avatar-dropdown__menu">
              <li>
                <NuxtLink to="/front/profile/log" @click="closeAvatar" class="avatar-dropdown__item">
                  <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                          d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
                  </svg>
                  我的訂位紀錄
                </NuxtLink>
              </li>
              <li>
                <NuxtLink to="/front/profile/booking" @click="closeAvatar" class="avatar-dropdown__item">
                  <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                          d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                  </svg>
                  線上訂位
                </NuxtLink>
              </li>
              <li>
                <NuxtLink to="/front/profile/lunch" @click="closeAvatar" class="avatar-dropdown__item">
                  <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                          d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"/>
                  </svg>
                  便當預訂
                </NuxtLink>
              </li>
              <li class="avatar-dropdown__divider">
                <button @click="logout" class="avatar-dropdown__logout">
                  <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                          d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/>
                  </svg>
                  登出
                </button>
              </li>
            </ul>
          </div>
        </Transition>
      </div>

    </nav>
  </div>
</template>

<style scoped>
/* ── 桌機頭像：絕對定位在 navbar 右側 ─────────────────────────── */
.avatar-wrapper {
  position: absolute;
  right: 24px;
  top: 50%;
  transform: translateY(-50%);
  z-index: 1060; /* 高於 Bootstrap navbar 的 z-index: 1030 */
}

.avatar-btn {
  width: 38px;
  height: 38px;
  border-radius: 50%;
  border: 2px solid #dee2e6;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: border-color 0.2s, color 0.2s;
  background: none;
  padding: 0;
  line-height: 1;
  overflow: hidden;
}

.avatar-btn--guest {
  background-color: #f8f9fa;
  color: #6c757d;
}

.avatar-btn--guest:hover {
  border-color: #1FC29C;
  color: #1FC29C;
}

.avatar-btn--user {
  background-color: #1FC29C;
  color: #fff;
  font-weight: 700;
  font-size: 14px;
  border-color: #1FC29C;
}

.avatar-btn--user:hover {
  opacity: 0.88;
}

/* 頭像按鈕內的圖片 */
.avatar-btn__img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 50%;
  display: block;
}

/* ── 下拉選單 ──────────────────────────────────────────────────── */
.avatar-dropdown {
  position: absolute;
  right: 0;
  top: calc(100% + 10px);
  width: 256px;
  background: #fff;
  border-radius: 14px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, .12);
  border: 1px solid #f0f0f0;
  overflow: hidden;
  z-index: 1060;
}

.avatar-dropdown__header {
  padding: 14px 16px;
  border-bottom: 1px solid #f5f5f5;
  display: flex;
  align-items: center;
  gap: 12px;
}

.avatar-dropdown__header--login {
  flex-direction: column;
  align-items: flex-start;
}

.avatar-dropdown__avatar {
  width: 38px;
  height: 38px;
  border-radius: 50%;
  background-color: #1FC29C;
  color: #fff;
  font-weight: 700;
  font-size: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  overflow: hidden;
}

/* 下拉選單內的頭像圖片 */
.avatar-dropdown__img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 50%;
  display: block;
}

.avatar-dropdown__info {
  min-width: 0;
}

.avatar-dropdown__name {
  font-size: 14px;
  font-weight: 600;
  color: #333;
  margin: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.avatar-dropdown__email {
  font-size: 12px;
  color: #999;
  margin: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.avatar-dropdown__hint {
  font-size: 12px;
  color: #888;
  margin: 0 0 10px;
}

.avatar-dropdown__menu {
  list-style: none;
  padding: 6px 0;
  margin: 0;
}

.avatar-dropdown__item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 9px 16px;
  font-size: 14px;
  color: #444;
  text-decoration: none;
  transition: background 0.15s, color 0.15s;
}

.avatar-dropdown__item:hover {
  background-color: #f0fdf9;
  color: #1FC29C;
  text-decoration: none;
}

.avatar-dropdown__divider {
  border-top: 1px solid #f5f5f5;
  margin-top: 4px;
}

.avatar-dropdown__logout {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 9px 16px;
  font-size: 14px;
  color: #e74c3c;
  background: none;
  border: none;
  cursor: pointer;
  transition: background 0.15s;
  text-align: left;
}

.avatar-dropdown__logout:hover {
  background-color: #fff5f5;
}

/* ── Transition ────────────────────────────────────────────────── */
.avatar-drop-enter-active {
  transition: opacity 0.15s ease, transform 0.15s ease;
}

.avatar-drop-leave-active {
  transition: opacity 0.1s ease, transform 0.1s ease;
}

.avatar-drop-enter-from {
  opacity: 0;
  transform: scale(0.95) translateY(4px);
}

.avatar-drop-leave-to {
  opacity: 0;
  transform: scale(0.95);
}

/* ── 手機版帳號區 ────────────────────────────────────────────── */
.mob-account-section {
  padding: 16px 20px;
  border-top: 1px solid rgba(255, 255, 255, 0.15);
  margin-top: 8px;
}

.mob-account-info {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 10px;
}

.mob-avatar-circle {
  width: 34px;
  height: 34px;
  border-radius: 50%;
  background-color: #1FC29C;
  color: #fff;
  font-weight: 700;
  font-size: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  overflow: hidden;
}

/* 手機版頭像圖片 */
.mob-avatar-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 50%;
  display: block;
}

.mob-account-text {
  min-width: 0;
}

.mob-account-name {
  font-size: 14px;
  font-weight: 600;
  color: #fff;
  margin: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.mob-account-email {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.65);
  margin: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.mob-account-links {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.mob-account-link {
  display: block;
  padding: 7px 4px;
  font-size: 14px;
  color: rgba(255, 255, 255, 0.85);
  text-decoration: none;
  transition: color 0.15s;
}

.mob-account-link:hover {
  color: #fff;
  text-decoration: none;
}

.mob-account-logout {
  display: block;
  width: 100%;
  text-align: left;
  padding: 7px 4px;
  font-size: 14px;
  color: #ffb3a7;
  background: none;
  border: none;
  cursor: pointer;
  transition: color 0.15s;
}

.mob-account-logout:hover {
  color: #ff8a7a;
}

.mob-login-hint {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.65);
  margin: 0 0 10px;
}
</style>
