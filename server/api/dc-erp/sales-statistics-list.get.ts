// server/api/dc-erp/sales-statistics-list.get.ts
//
// 「銷貨統計明細」網頁顯示用：用查詢條件跟原網站要
// 「客戶日期銷售品項明細表-(A4)」的 Excel（ReportID=7698、
// FilePath=SalesStatisticsList16），解析成 JSON 給前端畫表格。
// 表單欄位與 Excel 格式說明見 server/utils/dc-erp/salesStatisticsList.ts。
//
// 只讀不寫，不會動到原網站任何資料。

export default defineEventHandler(async (event) => {
  const sessionCookie = requireDcUpstreamSession(event)
  const q = readSalesStatisticsListQuery(getQuery(event))

  const { buffer } = await fetchSalesStatisticsListExcel(sessionCookie, q)

  try {
    return await parseCustomerDateProductExcel(buffer)
  } catch (err: any) {
    // 沒裝 xlsx 等已經有明確訊息的錯誤直接往外丟
    if (err?.statusMessage) throw err
    throw createError({ statusCode: 502, statusMessage: '原網站的 Excel 格式無法解析，請改用「下載 Excel」查看' })
  }
})
