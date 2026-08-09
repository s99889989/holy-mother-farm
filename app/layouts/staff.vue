<template>
  <div class="h-screen flex flex-col bg-page transition-colors">
    <StaffNavbar />
    <div id="staff-scroll-wrap" class="flex-1 overflow-y-auto">
      <slot />
    </div>
  </div>
</template>

<script setup>
import { verifySession } from '~/composables/useSessionCheck'

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
// 驗證邏輯（含節流、去重、失敗重試）都在 useSessionCheck 裡，跟
// middleware/holy-auth.global.ts 共用同一份狀態：
//   - force: true → 切回前景一定重新驗證一次，不受 10 分鐘節流限制
//   - retryOnFail: true → 剛切回前景網路堆疊常常還沒就緒，第一次
//     fetch 失敗（含逾時、離線）先延遲重試一次，避免誤判成登出
//   - 內部的 checking flag 會擋掉跟 middleware 同時觸發的重複驗證，
//     兩邊不會各驗各的、彼此結果對不上造成畫面跳動
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

  const { loggedOut, skipped } = await verifySession(commonStore.data.main_url, {
    force: true,
    retryOnFail: true
  })

  if (loggedOut) {
    window.location.href = '/'
    return
  }

  // skipped 代表 middleware 那邊剛好正在驗證或剛驗證過，這裡不用再拉一次權限，
  // 交給 middleware 那次驗證完成後的畫面狀態即可
  if (skipped) return

  // session 沒問題 → 補拉權限（非 silent 只在還沒載入成功時才會真的擋，
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
