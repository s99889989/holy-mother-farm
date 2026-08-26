// stores/permission.js
import { defineStore } from 'pinia'
import { ref } from 'vue'

export const usePermissionStore = defineStore('permission', () => {
  const perms = ref({})
  const loaded = ref(false)
  const loadedId = ref(null)

  // ── 單次 fetch（內部用）──────────────────────────────────────────
  // 這裡不再對 401/403/404 做特殊處理，一律當成錯誤丟出去，交給
  // load() 統一處理重試邏輯。原本的寫法是「401 就直接回傳 {}」，
  // 這會導致單次的、可能只是暫時性的 401（例如手機背景很久後網路
  // 重新連線、cookie 還沒完全帶上）被立刻當成「這個人真的沒有權限」，
  // 完全繞過下面的重試機制。
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
  // 重要：iOS Safari 常會在背景把分頁整頁丟棄重載，App 切回前景時
  // 網路堆疊可能還沒完全就緒，這時第一次 fetch 特別容易失敗——包括
  // 拿到 401（session cookie 還沒正確帶上，不代表真的沒登入）。
  // 過去的寫法是「失敗就把 perms 清空」，等於把一次偶發的網路/連線
  // 問題誤判成「使用者真的沒有權限」，造成畫面上的選單整個消失。
  // 現在的策略：
  //   1. 任何失敗（含 401/403/404）先重試一次（等一下讓網路/cookie 恢復）
  //   2. 兩次都失敗，且都是 401/403/404 → 視為後端明確表示「真的沒有
  //      權限資料」，把 perms 設為空物件——但前提是這不是一次 silent
  //      背景刷新，或者原本就沒有舊資料可以撐著畫面。
  //   3. 兩次都失敗，但不是（全都是）401/403/404（例如網路斷線、5xx）
  //      → 保留舊的 perms（可能是 localStorage 裡還算新鮮的快取），
  //      loaded 維持 false，讓下一次有機會（換頁 / 回到前景）再重試，
  //      而不是直接把畫面清空
  //
  // ── silent 刷新為什麼不能直接清空 ──────────────────────────────
  // silent=true 的呼叫來自 checkSessionOnVisible：那個流程「已經」
  // 先用 verifySession() 打過 /me 確認過 cookie 有效、沒有登出，
  // 才會接著呼叫這裡補拉權限。也就是說「使用者是否還在登入狀態」
  // 這件事，早就有更可靠的判斷交給 useSessionCheck 處理、並在確認
  // 真的登出時呼叫 clear()。
  // 這裡如果在 silent 刷新時，又因為幾乎同時發出的 my-perms 請求
  // 剛好連續兩次撞到暫時性 401（常見於剛從背景切回前景那一瞬間，
  // 不同連線各自重新建立 TLS/cookie 的時間點不一致），就自己判定
  // 「沒有權限」把已經撐在畫面上的舊選單洗成空的，等於把一個跟登入
  // 狀態無關的暫時性錯誤，錯誤地升級成「畫面整個清空」——這正是
  // 「iPhone 瀏覽器縮小一段時間打開後 StaffNavbar 有機會是空的」
  // 這個現象的來源。
  // 所以：silent 刷新且手上已經有非空的舊 perms 時，401/403/404
  // 一律當成「暫時性、不能採信」處理，比照網路斷線的做法──保留
  // 舊值、loaded 設回 false，讓 StaffNavbar 的背景重試迴圈或下一次
  // visibilitychange/pageshow 再試。真正需要「明確清空」的情境，
  // 只剩下非 silent（例如剛登入後第一次載入、使用者手動按重試）
  // 或者原本 perms 本來就是空的（沒有舊畫面可以保護）這兩種。
  const load = async (customerId, baseUrl, silent = false) => {
    const id = customerId != null ? String(customerId) : null
    if (loaded.value && loadedId.value === id && !silent) return

    let lastErr = null

    for (let attempt = 0; attempt < 2; attempt++) {
      if (attempt === 1) {
        // 第一次失敗後，稍等一下再試一次
        await new Promise(resolve => setTimeout(resolve, 1200))
      }
      try {
        const data = await fetchPerms(customerId, baseUrl)
        perms.value = data
        loadedId.value = id
        loaded.value = true
        return
      } catch (err) {
        lastErr = err
      }
    }

    // 兩次都失敗
    const status = lastErr?.status
    const hasExistingPerms = Object.keys(perms.value).length > 0

    if (status === 401 || status === 403 || status === 404) {
      if (silent && hasExistingPerms) {
        // silent 背景刷新、且畫面上還有舊選單撐著：不採信這次的
        // 401/403/404，視為暫時性錯誤，保留舊值等下次重試，避免
        // 把使用者正在看的選單突然清空。真正的登出已經由
        // useSessionCheck 的 verifySession()/doLogout() 把關。
        loaded.value = false
      } else {
        // 非 silent（明確的前景/手動載入），或原本就沒有舊資料可保護：
        // 連續兩次都明確表示沒有權限資料，才真的視為空的
        perms.value = {}
        loadedId.value = id
        loaded.value = true
      }
    } else {
      // 網路斷線 / 5xx 等暫時性錯誤：不清空既有 perms，維持 loaded = false
      // 讓下次導覽或 visibilitychange 時還能再拉一次
      loaded.value = false
    }
  }

  // ── 登出清除 ──────────────────────────────────────────────────────
  const clear = () => {
    perms.value = {}
    loaded.value = false
    loadedId.value = null
  }

  const can = key => perms.value[key] === true
  const canAny = (...keys) => keys.some(k => can(k))
  const canAll = (...keys) => keys.every(k => can(k))

  return { perms, loaded, loadedId, load, clear, can, canAny, canAll }
}, {
  persist: {
    // loaded 不 persist：每次重開頁面預設會嘗試重拉一次確保新鮮
    // perms persist：重整/重開時 navbar 有舊值先撐著，拉完再更新；
    //   即使這次拉取失敗也不會被清空，避免畫面突然變空
    // loadedId persist：load() 的去重判斷需要知道上次是誰
    pick: ['perms', 'loadedId']
  }
})
