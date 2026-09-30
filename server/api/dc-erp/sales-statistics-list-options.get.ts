// server/api/dc-erp/sales-statistics-list-options.get.ts
//
// 「銷貨統計明細」查詢表單的選項與預設值，直接從原網站查詢頁
// （GET /COAERP/SalesStatistics/SearchSalesStatisticsList）解析，
// 原網站選項異動時前端不用改：
//   - CompanyId（隱藏欄位，送出表單時要帶）
//   - 期間預設值（原網站預設本月 1 日～月底，格式 yyyy/MM/dd）
//   - 場別、母公司、客戶類別、簽核狀態、單據類型 的下拉選項
//
// 需要安裝 cheerio：npm install cheerio

import { load } from 'cheerio'

export default defineEventHandler(async (event) => {
  const sessionCookie = requireDcUpstreamSession(event)

  const res = await fetchDcUpstream(sessionCookie, SALES_STATISTICS_LIST_PATH)
  const html = await res.text()
  const $ = load(html)

  function parseSelectOptions(selector: string) {
    const options: Array<{ value: string, label: string, selected: boolean }> = []
    $(selector).find('option').each((_: number, opt: any) => {
      const $opt = $(opt)
      options.push({
        value: $opt.attr('value') ?? '',
        label: $opt.text().trim(),
        selected: $opt.attr('selected') !== undefined
      })
    })
    return options
  }

  const toDash = (v: string) => (v || '').trim().replace(/\//g, '-')

  return {
    companyId: $('#CompanyId').attr('value') || '',
    dateS: toDash($('#DateS').attr('value') || ''),
    dateE: toDash($('#DateE').attr('value') || ''),
    options: {
      workPlace: parseSelectOptions('#WorkPlaceSelectS'),
      parentFirm: parseSelectOptions('#ParentFirmID'),
      firmType: parseSelectOptions('#FirmType'),
      signState: parseSelectOptions('#SignState'),
      formType: parseSelectOptions('#FormType')
    }
  }
})
