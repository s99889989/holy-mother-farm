// server/api/dc-erp/sales-statistics-list-excel.get.ts
//
// 「銷貨統計明細」下載 Excel：用查詢條件跟原網站要
// 「客戶日期銷售品項明細表-(A4)」的 Excel，檔案內容原封不動轉給瀏覽器下載，
// 跟在原網站按 EXCEL 下載的檔案一模一樣。
// 表單欄位說明見 server/utils/dc-erp/salesStatisticsList.ts。
//
// 只讀不寫，不會動到原網站任何資料。

export default defineEventHandler(async (event) => {
  const sessionCookie = requireDcUpstreamSession(event)
  const q = readSalesStatisticsListQuery(getQuery(event))

  const { buffer, filename, contentType } = await fetchSalesStatisticsListExcel(sessionCookie, q)

  // 中文檔名用 RFC 5987 格式，另外給一個 ASCII 備用檔名
  const asciiName = filename.replace(/[^\x20-\x7e]/g, '_').replace(/"/g, '')
  setResponseHeaders(event, {
    'Content-Type': contentType,
    'Content-Disposition': `attachment; filename="${asciiName}"; filename*=UTF-8''${encodeURIComponent(filename)}`,
    'Cache-Control': 'no-store'
  })
  return buffer
})
