// server/api/dc-erp/automation/reset-schedule-flag.post.ts
//
// 測試用：清除 Spring Boot 排程「今天已經成功觸發過」的紀錄，讓同一天
// 還能再測一次排程，不用等到明天、也不用重啟伺服器。正式使用不需要按
// 這個，純粹是「設定」頁排程卡片裡的測試按鈕。

export default defineEventHandler(async (event) => {
  requireDcUpstreamSession(event)
  const apiBase = useRuntimeConfig().public.apiBase
  const res = await fetch(`${apiBase}/holy/dc-erp/automation/reset-today-trigger`, { method: 'POST' })
  if (!res.ok) {
    throw createError({ statusCode: 502, statusMessage: '清除失敗' })
  }
  return await res.json()
})
