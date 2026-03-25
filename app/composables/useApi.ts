// composables/useApi.ts
// 在任何 Vue 頁面裡用這個取得 API 位址，不需要寫死 localhost
//
// 使用方式：
//   const { apiBase } = useApi()
//   const BASE = `${apiBase}/holy/menu`

export const useApi = () => {
  const config = useRuntimeConfig()
  return {
    apiBase: config.public.apiBase as string
  }
}
