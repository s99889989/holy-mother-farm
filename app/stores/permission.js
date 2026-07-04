// stores/permission.js
import { defineStore } from 'pinia'
import { ref } from 'vue'

export const usePermissionStore = defineStore('permission', () => {
  const perms    = ref({})
  const loaded   = ref(false)
  const loadedId = ref(null)

  // ── 單次 fetch（內部用）──────────────────────────────────────────
  const fetchPerms = async (customerId, baseUrl) => {
    const query = customerId ? `?customerId=${customerId}` : ''
    const res   = await fetch(`${baseUrl}/holy/permission/my-perms${query}`)

    if (!res.ok) {
      // 401/403/404：後端明確表示「這個人沒有權限資料」，視為真的是空的
      if (res.status === 401 || res.status === 403 || res.status === 404) {
        return {}
      }
      // 其他狀況（5xx 等）視為暫時性錯誤，交給上層重試
      throw new Error(`my-perms ${res.status}`)
    }

    const data = await res.json()
    return (data && typeof data === 'object') ? data : {}
  }

  // ── 載入權限 ──────────────────────────────────────────────────────
  // silent=true 時：背景刷新，失敗不動舊資料、不擋畫面
  //
  // 重要：iOS Safari 常會在背景把分頁整頁丟棄重載，App 切回前景時
  // 網路堆疊可能還沒完全就緒，這時第一次 fetch 特別容易失敗。
  // 過去的寫法是「失敗就把 perms 清空」，等於把一次偶發的網路問題
  // 誤判成「使用者真的沒有權限」，造成畫面上的選單整個消失。
  // 現在的策略：
  //   1. 失敗先重試一次（等一下讓網路恢復）
  //   2. 兩次都失敗 → 保留舊的 perms（可能是 localStorage 裡還算新鮮
  //      的快取），loaded 維持 false，讓下一次有機會（換頁 / 回到前景）
  //      再重試，而不是直接把畫面清空
  const load = async (customerId, baseUrl, silent = false) => {
    const id = customerId != null ? String(customerId) : null
    if (loaded.value && loadedId.value === id && !silent) return

    try {
      const data = await fetchPerms(customerId, baseUrl)
      perms.value    = data
      loadedId.value = id
      loaded.value   = true
      return
    } catch {
      // 第一次失敗，稍等一下再試一次
    }

    try {
      await new Promise(resolve => setTimeout(resolve, 1200))
      const data = await fetchPerms(customerId, baseUrl)
      perms.value    = data
      loadedId.value = id
      loaded.value   = true
    } catch {
      // 兩次都失敗：不清空既有 perms，維持 loaded = false
      // 讓下次導覽或 visibilitychange 時還能再拉一次
      loaded.value = false
    }
  }

  // ── 登出清除 ──────────────────────────────────────────────────────
  const clear = () => {
    perms.value    = {}
    loaded.value   = false
    loadedId.value = null
  }

  const can    = (key)      => perms.value[key] === true
  const canAny = (...keys)  => keys.some(k => can(k))
  const canAll = (...keys)  => keys.every(k => can(k))

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
