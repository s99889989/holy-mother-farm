// server/api/dc-erp/logout.post.ts
//
// 單純清掉本站存的 dc_upstream_session cookie。
// 不特別呼叫原網站的 /Account/Logout，避免處理原網站登出後的導頁邏輯；
// 對使用者來說效果一樣（本站不會再帶著舊 session 打任何請求）。

export default defineEventHandler((event) => {
  deleteCookie(event, 'dc_upstream_session', { path: '/' })
  return { ok: true }
})
