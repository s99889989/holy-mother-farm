// stores/customer.js
import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useCustomerStore = defineStore('customer', () => {
  const customer = ref(null)

  const setCustomer = (data) => { customer.value = data }
  const clearCustomer = () => { customer.value = null }

  return { customer, setCustomer, clearCustomer }
})
