<template>
  <div class="h-screen flex flex-col bg-page transition-colors">
    <StaffNavbar />
    <div id="staff-scroll-wrap" class="flex-1 overflow-y-auto">
      <slot />
    </div>
  </div>
</template>

<script setup>
  const commonStore = useCommonStore()
  const customerStore = useCustomerStore()
  const permissionStore = usePermissionStore()

  // ── visibilitychange：iOS 從後台回來時重驗 cookie ────────────────
  // iOS Safari / Chrome 的 ITP 機制或 App Switcher 回來後，
  // session cookie 可能已被清除，但 localStorage 的 isLoggedIn 還是 true。
  // 監聽 visibilitychange，頁面重新可見時打 /me 確認 session 仍有效。
  async function checkSessionOnVisible() {
    if (document.visibilityState !== 'visible') return

    // isLoggedIn 已是 false → 狀態已清除但頁面還停在 staff，直接踢回首頁
    if (!customerStore.isLoggedIn) {
      window.location.href = '/'
      return
    }

    // isLoggedIn 還是 true → 打 /me 確認 cookie 還活著
    try {
      const res = await fetch(commonStore.data.main_url + '/holy/customer/me', {
        credentials: 'include'
      })
      if (!res.ok) {
        customerStore.clearCustomer()
        permissionStore.clear()
        try {
          await fetch(`${commonStore.data.main_url}/holy/customer/logout`, {
            method: 'POST',
            credentials: 'include'
          })
        } catch { /* ignore */ }
        window.location.href = '/'
      }
    } catch {
      // 網路錯誤不強制登出，等下次再檢查
    }
  }

  onMounted(async () => {
    // 載入權限
    if (!permissionStore.loaded) {
      const customerId = customerStore.isLoggedIn ? customerStore.customer.id : null
      await permissionStore.load(customerId, commonStore.data.main_url)
    } else {
      // 已有快取 → 背景靜默更新，不擋頁面
      const customerId = customerStore.isLoggedIn ? customerStore.customer.id : null
      permissionStore.load(customerId, commonStore.data.main_url, true)
    }

    // 監聽 iOS 從後台回來
    document.addEventListener('visibilitychange', checkSessionOnVisible)
  })

  onUnmounted(() => {
    document.removeEventListener('visibilitychange', checkSessionOnVisible)
  })
</script>

<style src="~/assets/css/main.css" />
<style>
  @media print {
    #staff-scroll-wrap {
      overflow: visible !important;
      height: auto !important;
      flex: none !important;
    }
  }
</style>
