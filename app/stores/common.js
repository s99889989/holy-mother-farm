import { defineStore } from 'pinia'

export const useCommonStore = defineStore('useFamilyStore', () => {
  // 原始後端網址（家中主機），保留註解供未來參考：
  // https://madustrialtd.asuscomm.com:9100
  // http://localhost:9100
  // https://madustrialtd.asuscomm.com:8080
  // https://api.karltw.com:8080
  // http://localhost:8080
  //
  // ── 改為同網域 /api 前綴 ─────────────────────────────────────
  // 不直接打 https://madustrialtd.asuscomm.com:8080，而是打 '/api'
  // （同網域），由 nuxt.config.ts 的 routeRules proxy 規則在伺服器端
  // 轉發到家中主機。這樣瀏覽器端只看到同網域請求，cookie 變成
  // 「第一方 cookie」，可避免 iOS Safari / iOS Chrome 的 ITP 機制
  // 擋掉跨站第三方 cookie，導致手機上開新頁面後登入態消失的問題。
  //
  // 所有原本寫法為 `commonStore.data.main_url + '/holy/xxx'` 的地方
  // 完全不用改，因為它們組合出來的字串自動變成 `/api/holy/xxx`。
  const data = reactive({
    main_url: '/api',
    just_url: '',
    google_client_id: '441605672654-9j73r51g6j2mar17ptblhskfvard1em9.apps.googleusercontent.com'
  })
  return { data }
})
