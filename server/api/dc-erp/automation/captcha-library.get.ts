// server/api/dc-erp/automation/captcha-library.get.ts
//
// 讀回驗證碼樣板庫的統計資訊（總樣本數 + 各數字目前有幾筆），給
// settings.vue 顯示用，方便看出還缺哪個數字的樣本。

export default defineEventHandler(async (event) => {
  requireDcUpstreamSession(event)
  return await getCaptchaLibraryStats()
})
