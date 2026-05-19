// stores/permission.js
import { defineStore } from 'pinia'
import { ref } from 'vue'

export const usePermissionStore = defineStore('permission', () => {
  // 此用戶可進入的路由清單（後端 /my-pages 回傳）
  const allowedPages = ref([])
  const loaded       = ref(false)

  // ── 載入此用戶的所有可進頁面 ────────────────────────────────────
  // customerId 為 null 時，後端會套預設群組（guest）的權限
  const load = async (customerId, baseUrl) => {
    try {
      const query = customerId ? `?customerId=${customerId}` : ''
      const res  = await fetch(`${baseUrl}/holy/permission/my-pages${query}`)
      const data = await res.json()
      allowedPages.value = Array.isArray(data) ? data : []
    } catch {
      allowedPages.value = []
    } finally {
      loaded.value = true
    }
  }

  // ── 登出時清除 ───────────────────────────────────────────────────
  const clear = () => {
    allowedPages.value = []
    loaded.value = false
  }

  // ── 檢查某路由是否有權限 ─────────────────────────────────────────
  // 後台帳密登入（holy_auth）直接全過，不受此 store 控管
  const canAccess = (path) => {
    // 完全符合 或 是某個允許路由的子路徑
    return allowedPages.value.some(p => path === p || path.startsWith(p + '/'))
  }

  return { allowedPages, loaded, load, clear, canAccess }
})
