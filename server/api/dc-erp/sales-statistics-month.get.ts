// server/api/dc-erp/sales-statistics-month.get.ts
//
// 對應原網站「統計報表 > 銷貨統計報表 > 銷貨月統計」
// （/COAERP/SalesStatistics/SearchSalesStatisticsMonth）。
//
// 跟 sales-orders.get.ts / sales-slips.get.ts 不同：這頁本質不是「瀏覽資料
// 列表」，而是「填篩選條件 → 產生報表檔案」，畫面下半部是好幾份報表
// （客戶別品項銷貨月統計表…等），每份各自有「列印」「EXCEL」按鈕。
// 這支 route 只負責 GET：把查詢表單的下拉選單選項、報表清單解析成 JSON，
// 前端用自己的 Tailwind 畫面重畫；實際「產生報表」的動作在
// sales-statistics-month.post.ts。
//
// 報表按鈕的 onclick 是 SetReportID('報表ID','報表代碼'[,'EXCEL'])
// （例如 SetReportID('7828','SalesStatisticsMonth01')、
// SetReportID('7828','SalesStatisticsMonth01','EXCEL')），這裡直接用正則
// 從 onclick 字串拉出這三個參數，不用去猜原網站另一支 StatisticsSearch.js
// 內部邏輯（目前沒有拿到那支 JS 的原始碼）。
//
// 「對象編號」「品項」原網站有燈箱（thickbox）搜尋按鈕可以挑選，這裡跟
// sales-orders.get.ts／sales-slips.get.ts 的 firmCode／scode／ecode 做法一樣，
// 先只做成純文字輸入框，不做燈箱搜尋。
//
// 需要安裝 cheerio：npm install cheerio

import { load } from 'cheerio'

export default defineEventHandler(async (event) => {
  const sessionCookie = requireDcUpstreamSession(event)

  const res = await fetchDcUpstream(sessionCookie, '/COAERP/SalesStatistics/SearchSalesStatisticsMonth')
  const html = await res.text()
  const $ = load(html)

  function parseSelectOptions($select: any) {
    const options: Array<{ value: string, label: string, selected: boolean }> = []
    $select.find('option').each((_: number, opt: any) => {
      const $opt = $(opt)
      options.push({
        value: $opt.attr('value') || '',
        label: $opt.text().trim(),
        selected: $opt.attr('selected') !== undefined
      })
    })
    return options
  }

  const filterOptions = {
    startY: parseSelectOptions($('#StartY')),
    startM: parseSelectOptions($('#StartM')),
    endM: parseSelectOptions($('#EndM')),
    workPlaceS: parseSelectOptions($('#WorkPlaceSelectS')),
    workPlaceE: parseSelectOptions($('#WorkPlaceSelectE')),
    firmType: parseSelectOptions($('#FirmType'))
  }

  // 報表清單：每一列（<table class="TableList"> 的 <tr>）是「報表名稱 +
  // 列印按鈕（一定有）+ EXCEL 按鈕（不一定有）」。
  const reports: Array<{ label: string, reportId: string, reportName: string, hasExcel: boolean }> = []
  $('table.TableList tr').each((_: number, tr: any) => {
    const $tr = $(tr)
    const label = $tr.find('td').first().text().trim()
    if (!label) return

    let reportId = ''
    let reportName = ''
    let hasExcel = false

    $tr.find('input[type="button"]').each((__: number, btn: any) => {
      const onclick = $(btn).attr('onclick') || ''
      const match = onclick.match(/SetReportID\('([^']+)'\s*,\s*'([^']+)'(?:\s*,\s*'([^']+)')?\)/)
      if (!match) return
      reportId = match[1]
      reportName = match[2]
      if (match[3] === 'EXCEL') hasExcel = true
    })

    if (reportId && reportName) {
      reports.push({ label, reportId, reportName, hasExcel })
    }
  })

  // 表單裡的 CompanyId 是隱藏欄位，值跟登入的帳號/租戶有關，動態抓出來，
  // 產生報表時要原封不動帶回去。
  const companyId = $('#CompanyId').attr('value') || ''

  let breadcrumb: string[] = []
  const breadcrumbMatch = html.match(/NavigationBarJson\s*=\s*\$\.parseJSON\('(.+?)'\)/)
  if (breadcrumbMatch) {
    try {
      const arr = JSON.parse(breadcrumbMatch[1])
      breadcrumb = arr.map((x: any) => x.Name).reverse()
    } catch {
      // 解析失敗就算了，麵包屑不影響主要功能
    }
  }

  return {
    filterOptions,
    reports,
    companyId,
    breadcrumb
  }
})
