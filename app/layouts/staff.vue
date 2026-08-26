<template>
  <div class="h-screen flex flex-col bg-page transition-colors">
    <StaffNavbar v-if="!hideNavbar" />
    <div id="staff-scroll-wrap" class="flex-1 overflow-y-auto">
      <slot />
    </div>

    <!-- ── 除錯面板（暫時性，之後要記得移除）─────────────────────────── -->
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
  async function checkSessionOnVisible() {
    if (document.visibilityState !== 'visible') return

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

    if (skipped) return

    if (!permissionStore.loaded) {
      await loadPerms(false)
    } else {
      loadPerms(true)
    }
  }

  // ── pageshow：補 visibilitychange 沒蓋到的「bfcache 復原」情境 ────
  function handlePageShow(e) {
    if (e.persisted) checkSessionOnVisible()
  }

  onMounted(async () => {
    if (!permissionStore.loaded) {
      await loadPerms(false)
    } else {
      loadPerms(true)
    }

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
