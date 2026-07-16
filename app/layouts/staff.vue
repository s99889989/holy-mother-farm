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

const loadPerms = (silent) => {
  const customerId = customerStore.isLoggedIn ? customerStore.customer.id : null
  return permissionStore.load(customerId, commonStore.data.main_url, silent)
}

// ── visibilitychange：iOS 從後台回來時重驗 cookie + 補拉權限 ──────
// iOS Safari / Chrome 的 ITP 機制或 App Switcher 回來後，
// session cookie 可能已被清除，但 localStorage 的 isLoggedIn 還是 true。
// 監聽 visibilitychange，頁面重新可見時打 /me 確認 session 仍有效。
//
// 同時，如果 onMounted 那次的權限載入剛好在網路還沒就緒時失敗，
// permissionStore.loaded 會停在 false（但 perms 不會被清空）。
// 這裡確認 session 沒問題後，順手再補拉一次權限，讓畫面有機會自己修復，
// 不需要等到下一次整頁重載。
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

    // 只有後端明確表示「沒有這個登入」（401/403）才是真的 session 失效。
    // 手機從背景切回前景那一刻，網路堆疊常常還沒完全就緒，這時
    // 拿到的可能是 5xx / 閘道逾時，跟登入狀態無關，不該直接登出。
    if (res.status === 401 || res.status === 403) {
      customerStore.clearCustomer()
      permissionStore.clear()
      try {
        await fetch(`${commonStore.data.main_url}/holy/customer/logout`, {
          method: 'POST',
          credentials: 'include'
        })
      } catch { /* ignore */ }
      window.location.href = '/'
      return
    }

    if (!res.ok) {
      // 5xx / 502 / 503 / 504 等暫時性錯誤：不確定 session 是否有效，
      // 保守起見不登出，直接往下走照常補拉權限（權限 store 自己有重試機制）
    }
  } catch {
    // fetch 本身失敗（離線、逾時）：網路錯誤不強制登出，等下次再檢查
    return
  }

  // session 沒問題（或無法確認，但選擇不登出）→ 補拉權限（非 silent 只在還沒載入成功時才會真的擋，
  // 已經 loaded=true 的話 load() 內部會直接以 silent 方式背景刷新）
  if (!permissionStore.loaded) {
    await loadPerms(false)
  } else {
    loadPerms(true)
  }
}

onMounted(async () => {
  // 載入權限
  if (!permissionStore.loaded) {
    await loadPerms(false)
  } else {
    // 已有快取 → 背景靜默更新，不擋頁面
    loadPerms(true)
  }

  // 監聽 iOS 從後台回來
  document.addEventListener('visibilitychange', checkSessionOnVisible)
})

onUnmounted(() => {
  document.removeEventListener('visibilitychange', checkSessionOnVisible)
})
</script>

<style src="~/assets/css/main.css"/>
<style>
@media print {
  #staff-scroll-wrap {
    overflow: visible !important;
    height: auto !important;
    flex: none !important;
  }
}
</style>
