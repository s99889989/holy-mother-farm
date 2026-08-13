// server/api/dc-erp/sales-order-form.get.ts
//
// 對應原網站「訂貨單維護 - 新增/編輯」表頭（不含明細 Grid，Grid 另外走
// sales-order-detail.get.ts）。
//   - 不帶 guid → 對應 /COAERP/SalesOrder/Create（新增）
//   - 帶 guid   → 對應 /COAERP/SalesOrder/Edit/{guid}（編輯）
//
// 只解析表頭那些欄位（場別/日期/客戶/單據種類/送貨地址/收款方式/價格稅金/
// 發票聯式/開立方式/備註/經辦人員），明細 Grid 是完全獨立的另一套機制，見
// sales-order-detail.get.ts 開頭註解。
//
// 需要安裝 cheerio：npm install cheerio

import { load } from 'cheerio'

export default defineEventHandler(async (event) => {
  const sessionCookie = requireDcUpstreamSession(event)
  const query = getQuery(event)
  const guid = query.guid ? String(query.guid) : ''

  const path = guid ? `/COAERP/SalesOrder/Edit/${encodeURIComponent(guid)}` : '/COAERP/SalesOrder/Create'
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
    receivingDate: val('#ReceivingDate'),
    firmID: val('#FirmID'),
    firmCode: val('#FirmCodeTextBox') || val('#FirmCode'),
    firmName: $('#FirmNameText').text().trim(),
    purchaseDept: val('#PurchaseDept'),
    type: val('#Type'),
    typeOptions: parseSelectOptions('#Type'),
    customerDocCode: val('#CustomerDocCode'),
    address: val('#Address'),
    payWay: val('#PayWay'),
    payWayOptions: parseSelectOptions('#PayWay'),
    taxInputType: val('#TaxInputType'),
    taxInputTypeOptions: parseSelectOptions('#TaxInputType'),
    receiptType: val('#ReceiptType'),
    receiptTypeOptions: parseSelectOptions('#ReceiptType'),
    receiptMode: val('#ReceiptMode'),
    receiptModeOptions: parseSelectOptions('#ReceiptMode'),
    remark: val('#Remark'),
    operatorID: val('#OperatorID'),
    operatorCode: val('#OperatorCode'),
    operatorName: $('#OperatorName').text().trim(),
    // 「簽核狀態」原網站是純文字（沒有 id 可以選，只能靠標籤文字定位），
    // 新增訂貨單頁面上沒有這個區塊（一定是空字串），只有編輯頁才有。
    signState: $('.RowNameThin').filter((_: number, el: any) => $(el).text().trim() === '簽核狀態').next().text().trim(),
    receivingState: $('#ReceivingStateName').text().trim(),
    // 宅配資料分頁
    deliveryCompany: val('#DeliveryCompnay'),
    deliveryCompanyOptions: parseSelectOptions('#DeliveryCompnay'),
    deliveryPeriod: val('#DeliveryPeriod'),
    deliveryPeriodOptions: parseSelectOptions('#DeliveryPeriod'),
    temperatureLevel: val('#TemperatureLevel'),
    temperatureLevelOptions: parseSelectOptions('#TemperatureLevel'),
    deliveryPersonal: val('#DeliveryPersonal'),
    deliveryAddress: val('#DeliveryAddress'),
    deliveryCellPhone: val('#DeliveryCellPhone'),
    deliveryTelPhone: val('#DeliveryTelPhone'),
    deliveryRemark: val('#DeliveryRemark'),
    number: val('#Number')
  }

  // 明細 Grid 每列的「課稅別」下拉選項，原網站是內嵌在表頭頁面裡的
  // #TaxTypeList（本來是「批次更新預設值」用的選單），選項是固定的四種
  // （不開/免稅/應稅/零稅），這裡順便解析出來給前端明細 Grid 的下拉用，
  // 不用另外呼叫其他 API。
  const taxTypeOptions = parseSelectOptions('#TaxTypeList')

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

  return { header, breadcrumb, isNew: !guid, taxTypeOptions }
})
