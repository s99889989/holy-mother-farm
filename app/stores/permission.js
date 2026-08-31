// stores/permission.js
import { defineStore } from 'pinia'
import { ref } from 'vue'

export const usePermissionStore = defineStore('permission', () => {
  const perms = ref({})
  const loaded = ref(false)
  const loadedId = ref(null)

  // ── 除錯用（不 persist）──────────────────────────────────────────
  // 手機沒辦法開 DevTools 看 network/console，這幾個欄位讓我們可以
  // 直接在畫面上印出來看，判斷「這次到底發生了什麼事」：
  //   - lastAttempt:   最近一次 load() 何時被呼叫、用什麼參數呼叫的
  //   - lastError:     最近一次失敗的狀態碼/訊息（成功時會被清空）
  //   - lastSuccessAt: 最近一次成功拿到權限資料的時間
  const lastAttempt = ref(null)   // { time, customerId, silent }
  const lastError = ref(null)     // { time, status, message, silent } | null
  const lastSuccessAt = ref(null)

  const fetchPerms = async (customerId, baseUrl) => {
    const query = customerId ? `?customerId=${customerId}` : ''
    const res = await fetch(`${baseUrl}/holy/permission/my-perms${query}`)

    if (!res.ok) {
      const err = new Error(`my-perms ${res.status}`)
      err.status = res.status
      throw err
    }

    const data = await res.json()
    return (data && typeof data === 'object') ? data : {}
  }

  // ── 載入權限 ──────────────────────────────────────────────────────
  // silent=true 時：背景刷新，失敗不動舊資料、不擋畫面
  //
  // iOS Safari 常會在背景把分頁整頁丟棄重載，App 切回前景時網路堆疊
  // 可能還沒完全就緒，第一次 fetch 特別容易失敗——包括拿到 401
  // （session cookie 還沒正確帶上，不代表真的沒登入）。策略：
  //   1. 任何失敗先重試一次（等 1.2 秒讓網路/cookie 恢復）
  //   2. 兩次都失敗，且都是 401/403/404 → 視為後端明確表示「真的
  //      沒有權限資料」，清空 perms——但前提是這不是一次 silent
  //      背景刷新，或者原本就沒有舊資料可以撐著畫面
  //   3. 兩次都失敗，但不全是 401/403/404（網路斷線、5xx）→ 保留舊
  //      perms，loaded 維持 false，讓下一次有機會再重試
  //
  // silent 刷新時之所以不能直接清空：silent=true 的呼叫來自
  // checkSessionOnVisible，那個流程已經先用 verifySession() 打過
  // /me 確認過 cookie 有效、沒有登出，才會接著補拉權限——「是否還
  // 登入」這件事早就有更可靠的判斷交給 useSessionCheck 處理。這裡
  // 如果又因為幾乎同時發出的 my-perms 請求剛好連續兩次撞到暫時性
  // 401，就自己判定「沒有權限」把已經撐在畫面上的舊選單洗成空的，
  // 等於把一個跟登入狀態無關的暫時性錯誤，錯誤地升級成整個清空。
  const load = async (customerId, baseUrl, silent = false) => {
    const id = customerId != null ? String(customerId) : null
    if (loaded.value && loadedId.value === id && !silent) return

    lastAttempt.value = { time: Date.now(), customerId: id, silent }

    let lastErr = null

    for (let attempt = 0; attempt < 2; attempt++) {
      if (attempt === 1) {
        await new Promise(resolve => setTimeout(resolve, 1200))
      }
      try {
        const data = await fetchPerms(customerId, baseUrl)
        perms.value = data
        loadedId.value = id
        loaded.value = true
        lastError.value = null
        lastSuccessAt.value = Date.now()
        return
      } catch (err) {
        lastErr = err
      }
    }

    // 兩次都失敗
    const status = lastErr?.status
    const hasExistingPerms = Object.keys(perms.value).length > 0

    lastError.value = {
      time: Date.now(),
      status: status ?? null,
      message: lastErr?.message || String(lastErr),
      silent
    }

    if (status === 401 || status === 403 || status === 404) {
      if (silent && hasExistingPerms) {
        // silent 背景刷新、且畫面上還有舊選單撐著：不採信這次的
        // 401/403/404，保留舊值等下次重試，避免把使用者正在看的
        // 選單突然清空。真正的登出交給 verifySession()/doLogout() 把關
        loaded.value = false
      } else {
        perms.value = {}
        loadedId.value = id
        loaded.value = true
      }
    } else {
      // 網路斷線 / 5xx 等暫時性錯誤：不清空既有 perms
      loaded.value = false
    }
  }

  const clear = () => {
    perms.value = {}
    loaded.value = false
    loadedId.value = null
  }

  const can = key => perms.value[key] === true
  const canAny = (...keys) => keys.some(k => can(k))
  const canAll = (...keys) => keys.every(k => can(k))

  return {
    perms, loaded, loadedId, load, clear, can, canAny, canAll,
    lastAttempt, lastError, lastSuccessAt
  }
}, {
  persist: {
    // loaded/lastAttempt/lastError/lastSuccessAt 不 persist：
    // 每次重開頁面都是全新的除錯資訊，跟這次的執行過程綁在一起
    pick: ['perms', 'loadedId']
  }
})
