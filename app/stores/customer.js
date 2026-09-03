// stores/customer.js
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useCustomerStore = defineStore('customer', () => {
  const customer = ref(null)

  // ── 除錯用（不 persist）──────────────────────────────────────────
  // 用來追蹤「customer 是什麼時候、被誰清空的」，區分兩種完全不同的
  // 成因：(A) 這次頁面存活期間被 clearCustomer() 主動清空（doLogout
  // 誤判 401/403、或使用者按登出）；(B) 從整頁載入那一刻起，Pinia
  // persist 就沒有把 localStorage 裡的資料還原回來，跟「清空」無關，
  // customer 打從一開始就是 null。
  // 如果除錯面板顯示 clearedReason 是 null（代表這次頁面存活期間
  // 從沒呼叫過 clearCustomer()），但 customer 卻還是 null，那就是
  // (B)——問題出在 persist 還原，不是登出邏輯。
  const clearedAt = ref(null)
  const clearedReason = ref(null)

  // ── 基本操作 ──────────────────────────────────────────────────
  const setCustomer = (data) => {
    customer.value = data
    // 重新設定成功，清掉舊的「被清空」記錄，避免除錯面板顯示過期資訊
    clearedAt.value = null
    clearedReason.value = null
  }
  const clearCustomer = (reason = '(未標明來源)') => {
    customer.value = null
    clearedAt.value = Date.now()
    clearedReason.value = reason
  }

  // ── 狀態 computed ─────────────────────────────────────────────
  const isLoggedIn = computed(() => !!customer.value)

  // ── 群組 computed（以 permissions.yml 的 group 為唯一依據）────
  const group = computed(() => customer.value?.group ?? 'guest')
  const isStaff = computed(() => ['staff', 'senior', 'manager'].includes(group.value))
  const isSenior = computed(() => ['senior', 'manager'].includes(group.value))
  const isManager = computed(() => group.value === 'manager')

  return {
    customer,
    setCustomer,
    clearCustomer,
    isLoggedIn,
    group,
    isStaff,
    isSenior,
    isManager,
    clearedAt,
    clearedReason,
  }
}, {
  persist: {
    // clearedAt/clearedReason 不 persist：只在這次頁面存活期間有意義，
    // 跟這次的執行過程綁在一起，重新整理後應該歸零重新追蹤
    pick: ['customer']
  }
})
