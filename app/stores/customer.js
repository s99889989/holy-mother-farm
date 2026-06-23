// stores/customer.js
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useCustomerStore = defineStore('customer', () => {
  const customer = ref(null)

  // ── 基本操作 ──────────────────────────────────────────────────
  const setCustomer  = (data) => { customer.value = data }
  const clearCustomer = () => { customer.value = null }

  // ── 狀態 computed ─────────────────────────────────────────────
  const isLoggedIn = computed(() => !!customer.value)

  // ── 群組 computed（以 permissions.yml 的 group 為唯一依據）────
  const group      = computed(() => customer.value?.group ?? 'guest')
  const isStaff    = computed(() => ['staff', 'senior', 'manager'].includes(group.value))
  const isSenior   = computed(() => ['senior', 'manager'].includes(group.value))
  const isManager  = computed(() => group.value === 'manager')

  return {
    customer,
    setCustomer,
    clearCustomer,
    isLoggedIn,
    group,
    isStaff,
    isSenior,
    isManager,
  }
}, {
  persist: true // 自動存到 localStorage，重整後恢復
})
