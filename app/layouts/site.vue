<template>

</template>

<script setup>
useHead({
  link: [
    { rel: 'stylesheet', href: 'https://stackpath.bootstrapcdn.com/bootstrap/4.4.1/css/bootstrap.min.css' }
  ]
})
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue'
import { useCommonStore } from '~/stores/common.js'
import { useCustomerStore } from '~/stores/customer.js'

const commonStore   = useCommonStore()
const customerStore = useCustomerStore()
const BASE = computed(() => commonStore.data.main_url + '/holy/customer')

const GOOGLE_CLIENT_ID = computed(() => commonStore.data.google_client_id)

const mobileOpen = ref(false)
const avatarOpen = ref(false)
const avatarRef  = ref(null)

// 用 store 取代本地 customer ref
const customer = computed(() => customerStore.customer)

const navItems = [
  { to: '/site/news',       label: '最新消息' },
  { to: '/site/about',      label: '關於我們' },
  { to: '/site/product',    label: '產品訂購' },
  { to: '/site/activity',   label: '活動報名' },
  { to: '/site/restaurant', label: '田園餐廳' },
  { to: '/site/cafe',       label: '休憩小舖' },
  { to: '/site/contact',    label: '交通方式' },
]

// ── 下拉開關 ──────────────────────────────────────────────────────
const toggleAvatar = () => {
  avatarOpen.value = !avatarOpen.value
  if (avatarOpen.value && !customer.value) {
    nextTick(() => renderGoogleBtn('nav-google-btn'))
  }
}
const closeAvatar = () => { avatarOpen.value = false }

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
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ credential: response.credential })
    })
    const data = await res.json()
    if (!data.error) {
      customerStore.setCustomer(data)
      avatarOpen.value = false
    }
  } catch {}
}

const logout = async () => {
  await fetch(`${BASE.value}/logout`, { method: 'POST', credentials: 'include' })
  customerStore.clearCustomer()
  avatarOpen.value = false
}

// ── 取得登入狀態 ──────────────────────────────────────────────────
const fetchMe = async () => {
  try {
    const data = await (await fetch(`${BASE.value}/me`, { credentials: 'include' })).json()
    if (!data.error) customerStore.setCustomer(data)
  } catch {}
}

onMounted(async () => {
  await fetchMe()
  document.addEventListener('click', onClickOutside)

  if (!document.getElementById('google-gsi-script')) {
    const script = document.createElement('script')
    script.id    = 'google-gsi-script'
    script.src   = 'https://accounts.google.com/gsi/client'
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
