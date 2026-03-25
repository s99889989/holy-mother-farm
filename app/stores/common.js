import { defineStore } from 'pinia'

export const useCommonStore = defineStore('useFamilyStore', () => {
  // https://madustrialtd.asuscomm.com:9100
  // http://localhost:9100
  const data = reactive({
    main_url: 'https://madustrialtd.asuscomm.com:9100'

  })
  return { data }
})
