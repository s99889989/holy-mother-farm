<template>
  <div class="h-screen flex flex-col bg-page transition-colors">
    <StaffNavbar v-if="!hideNavbar" />
    <div id="staff-scroll-wrap" class="flex-1 overflow-y-auto">
      <slot />
    </div>

    <!-- ── 除錯面板（暫時性，觀察一段時間確認沒問題後記得移除）───────── -->
    <!-- 手機沒辦法開 DevTools，這裡直接把關鍵狀態印在畫面上，點一下
         右下角的 🐛 展開，再點「複製」把文字整段複製貼給我看即可 -->
    <button
      type="button"
      class="fixed bottom-3 right-3 z-[200] w-10 h-10 rounded-full bg-black/70 text-white text-lg flex items-center justify-center"
      @click="debugOpen = !debugOpen"
    >
      🐛
    </button>
    <div
      v-if="debugOpen"
      class="fixed inset-x-3 bottom-16 z-[200] max-h-[70vh] overflow-y-auto rounded-lg bg-black/90 text-white text-xs p-3 font-mono whitespace-pre-wrap"
    >
      <div class="flex justify-between items-center mb-2">
        <span class="font-bold">除錯資訊</span>
        <div class="flex gap-2">
          <button
            type="button"
            class="px-2 py-1 rounded bg-white/20"
            @click="copyDebugText"
          >
            {{ copied ? '已複製 ✓' : '複製' }}
          </button>
          <button
            type="button"
            class="px-2 py-1 rounded bg-white/20"
            @click="debugOpen = false"
          >
            關閉
          </button>
        </div>
      </div>
      {{ debugText }}
    </div>
  </div>
</template>

<script setup>
  import { verifySession } from '~/composables/useSessionCheck'

  const route = useRoute()
  const hideNavbar = computed(() => !!route.meta.hideNavbar)

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
  //     fetch 失敗（含逾時、離線、暫時性 401）先延遲重試一次，避免
  //     誤判成登出
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

  // ── pageshow：補 visibilitychange 沒蓋到的「bfcache 復原」情境 ────
  // iPhone 縮小很久再打開時，除了單純切到背景/前景（會觸發
  // visibilitychange）之外，Safari 有時會把分頁整個丟進 bfcache
  // 掛起、回來時是用 bfcache 復原（不會重新跑一次 onMounted），
  // 這種情境部分版本不會可靠地補發 visibilitychange。
  // pageshow 的 event.persisted === true 就是「這次是從 bfcache
  // 復原」的訊號，這裡比照 checkSessionOnVisible 補一次檢查。
  function handlePageShow(e) {
    if (e.persisted) checkSessionOnVisible()
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
    window.addEventListener('pageshow', handlePageShow)
  })

  onUnmounted(() => {
    document.removeEventListener('visibilitychange', checkSessionOnVisible)
    window.removeEventListener('pageshow', handlePageShow)
  })

  // ── 除錯面板 ──────────────────────────────────────────────────────
  const debugOpen = ref(false)
  const copied = ref(false)
  const debugTick = ref(0)

  // 每秒更新一次畫面上顯示的時間差，方便看「幾秒前」發生的事
  let debugTimer = null
  onMounted(() => { debugTimer = setInterval(() => { debugTick.value++ }, 1000) })
  onUnmounted(() => { if (debugTimer) clearInterval(debugTimer) })

  function fmtAgo(ts) {
    if (!ts) return '—'
    const diff = Math.round((Date.now() - ts) / 1000)
    return `${new Date(ts).toLocaleTimeString()}（${diff} 秒前）`
  }

  const debugText = computed(() => {
    debugTick.value // 讓這個 computed 每秒重新算一次

    const c = customerStore.customer
    const err = permissionStore.lastError
    const attempt = permissionStore.lastAttempt

    const lines = [
      `時間：${new Date().toLocaleString()}`,
      `頁面：${route.fullPath}`,
      `document.visibilityState：${typeof document !== 'undefined' ? document.visibilityState : '—'}`,
      `navigator.onLine：${typeof navigator !== 'undefined' ? navigator.onLine : '—'}`,
      '',
      '── customerStore ──',
      `isLoggedIn：${customerStore.isLoggedIn}`,
      `customer.id：${c?.id ?? '—'}`,
      `customer.email：${c?.email ?? '—'}`,
      '',
      '── permissionStore ──',
      `loaded：${permissionStore.loaded}`,
      `loadedId：${permissionStore.loadedId ?? '—'}`,
      `perms 數量：${Object.keys(permissionStore.perms || {}).length}`,
      `perms keys：${Object.keys(permissionStore.perms || {}).join('、') || '（空）'}`,
      '',
      '── 最近一次 load() 呼叫 ──',
      attempt
        ? `時間：${fmtAgo(attempt.time)}\ncustomerId：${attempt.customerId}\nsilent：${attempt.silent}`
        : '（這次頁面存活期間還沒呼叫過）',
      '',
      '── 最近一次失敗 ──',
      err
        ? `時間：${fmtAgo(err.time)}\nstatus：${err.status ?? '（無狀態碼，可能是網路/逾時錯誤）'}\nmessage：${err.message}\nsilent：${err.silent}`
        : '（目前沒有記錄到失敗，或最近一次是成功的）',
      '',
      `最近一次成功時間：${fmtAgo(permissionStore.lastSuccessAt)}`
    ]

    return lines.join('\n')
  })

  async function copyDebugText() {
    try {
      await navigator.clipboard.writeText(debugText.value)
      copied.value = true
      setTimeout(() => { copied.value = false }, 1500)
    } catch {
      // 部分瀏覽器/情境下 clipboard API 可能被擋，退而求其次讓使用者自己長按選取複製
    }
  }
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
