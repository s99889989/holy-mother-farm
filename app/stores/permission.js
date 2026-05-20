// stores/permission.js
import { defineStore } from 'pinia'
import { ref } from 'vue'

export const usePermissionStore = defineStore('permission', () => {
  // 完整的 permission map：{ "front.view": true, "staff.home": false, ... }
  const perms  = ref({})
  const loaded = ref(false)

  // ── 載入權限（customerId 為 null 時套預設群組）────────────────────
  const load = async (customerId, baseUrl) => {
    try {
      const query = customerId ? `?customerId=${customerId}` : ''
      const res  = await fetch(`${baseUrl}/holy/permission/my-perms${query}`)
      const data = await res.json()
      perms.value = (data && typeof data === 'object') ? data : {}
    } catch {
      perms.value = {}
    } finally {
      loaded.value = true
    }
  }

  // ── 登出時清除 ───────────────────────────────────────────────────
  const clear = () => {
    perms.value  = {}
    loaded.value = false
  }

  // ── 檢查單一權限 ─────────────────────────────────────────────────
  const can = (key) => {
    return perms.value[key] === true
  }

  // ── 檢查多個權限（任一符合）──────────────────────────────────────
  const canAny = (...keys) => {
    return keys.some(k => can(k))
  }

  // ── 檢查多個權限（全部符合）──────────────────────────────────────
  const canAll = (...keys) => {
    return keys.every(k => can(k))
  }

  return { perms, loaded, load, clear, can, canAny, canAll }
})
