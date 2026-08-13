// server/api/dc-erp/sales-slip-form.get.ts
//
// 對應原網站「銷貨單維護 - 新增/編輯」表頭，跟訂貨單的
// sales-order-form.get.ts 是同一套做法，欄位依實際抓到的
// SalesSlip/Edit/{guid} 真實頁面內容調整（跟訂貨單不同的地方：只有一個
// 「交貨日期」，沒有分開的訂貨/交貨日期；多了「取訂貨單」欄位，可以輸入
// 訂貨單號把訂貨單資料帶進來；沒有發票聯式/開立方式，這兩個在「發票憑證」
// 分頁裡，本站沒有做那個分頁）。
//   - 不帶 guid → 對應 /COAERP/SalesSlip/Create（新增）
//   - 帶 guid   → 對應 /COAERP/SalesSlip/Edit/{guid}（編輯）
//
// 需要安裝 cheerio：npm install cheerio

import { load } from 'cheerio'

export default defineEventHandler(async (event) => {
  const sessionCookie = requireDcUpstreamSession(event)
  const query = getQuery(event)
  const guid = query.guid ? String(query.guid) : ''

  const path = guid ? `/COAERP/SalesSlip/Edit/${encodeURIComponent(guid)}` : '/COAERP/SalesSlip/Create'
  const res = await fetchDcUpstream(sessionCookie, path)
  const html = await res.text()
  const $ = load(html)

  function parseSelectOptions(selector: string) {
    const options: Array<{ value: string, label: string, selected: boolean }> = []
    $(selector).find('option').each((_: number, opt: any) => {
      const $opt = $(opt)
      options.push({
        value: $opt.attr('value') || '',
        label: $opt.text().trim(),
        selected: $opt.attr('selected') !== undefined
      })
    })
    return options
  }

  function val(selector: string) {
    return $(selector).val() ? String($(selector).val()) : ($(selector).attr('value') || '')
  }

  const header = {
    guid: val('#Guid'),
    code: val('#Code'),
    workPlaceID: val('#WorkPlaceID'),
    workPlaceOptions: parseSelectOptions('#WorkPlaceID'),
    primaryDate: val('#PrimaryDate'),
    firmID: val('#FirmID'),
    firmCode: val('#FirmCodeTextBox') || val('#FirmCode'),
    firmName: $('#FirmNameText').text().trim(),
    relationCode: val('#RelationCode'),
    type: val('#Type'),
    typeOptions: parseSelectOptions('#Type'),
    address: val('#Address'),
    payWay: val('#PayWay'),
    payWayOptions: parseSelectOptions('#PayWay'),
    taxInputType: val('#TaxInputType'),
    taxInputTypeOptions: parseSelectOptions('#TaxInputType'),
    remark: val('#Remark'),
    operatorID: val('#OperatorID'),
    operatorCode: val('#OperatorCode'),
    operatorName: $('#OperatorName').text().trim(),
    // 「簽核狀態」原網站是純文字，沒有 id 可以選，只能靠標籤文字定位。
    signState: $('.RowNameThin').filter((_: number, el: any) => $(el).text().trim() === '簽核狀態').next().text().trim()
  }

  const taxTypeOptions = parseSelectOptions('#TaxTypeList')

  let breadcrumb: string[] = []
  const breadcrumbMatch = html.match(/NavigationBarJson\s*=\s*\$\.parseJSON\('(.+?)'\)/)
  if (breadcrumbMatch) {
    try {
      const arr = JSON.parse(breadcrumbMatch[1])
      breadcrumb = arr.map((x: any) => x.Name).reverse()
    } catch {
      // 解析失敗就算了
    }
  }

  return { header, breadcrumb, isNew: !guid, taxTypeOptions }
})
