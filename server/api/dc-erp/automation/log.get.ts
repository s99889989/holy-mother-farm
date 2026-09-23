// server/api/dc-erp/automation/log.get.ts
//
// 給「設定」頁的「執行紀錄」區塊讀最近的執行紀錄（手動＋排程都有），見
// automationLog.ts。query: limit（選填，預設 50）。

export default defineEventHandler(async (event) => {
  requireDcUpstreamSession(event)
  const query = getQuery(event)
  const limit = query.limit ? Number(query.limit) : 50
  return await getAutomationLog(Number.isFinite(limit) ? limit : 50)
})
