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
// 「可否轉銷」（canTransfer）：原網站編輯頁上的轉銷按鈕顯示條件不明確，
// 但訂貨單列表的「轉銷」那一格是可靠的（原網站依訂貨單明細有沒有被銷貨單
// 關聯來決定），列表頁 sales-orders.get.ts 就是照那一格判斷。這裡編輯模式
// 另外用單號查一次列表、讀同一格，讓編輯頁跟列表頁的轉銷按鈕一致。
// 查詢失敗不影響表頭載入，canTransfer 回 null，前端退回「已核准就顯示」。
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

  // ---------- 可否轉銷：查原網站訂貨單列表「轉銷」那一格 ----------
  let canTransfer: boolean | null = null
  if (guid && header.code) {
    try {
      const searchBody = new URLSearchParams({
        pagesize: '20',
        WorkPlace: '0',
        WHSearch: 'whatever',
        KeyWord: '',
        Sdate: '',
        Edate: '',
        SearchBySignState: '-1',
        SearchByType: '-1',
        SearchByReceivingState: '-1',
        Sdate2: '',
        Edate2: '',
        SCode: header.code,
        ECode: header.code,
        SearchFirmCode: ''
      })
      const listRes = await fetchDcUpstream(sessionCookie, '/COAERP/SalesOrder/index/0/1?pagesize=20', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: searchBody.toString()
      })
      const $$ = load(await listRes.text())
      $$('#TableList tr').each((i: number, tr: any) => {
        if (i === 0 || canTransfer !== null) return
        const $tds = $$(tr).find('td')
        if ($tds.length < 13) return
        // 用 Edit/{guid} 比對，比單號更確定是同一張
        const href = $$($tds[2]).find('a').attr('href') || ''
        if (!href.toLowerCase().includes(guid.toLowerCase())) return
        // 跟 sales-orders.get.ts 的 canTransfer 判斷完全相同：td[9] 有文字
        // 或 input 按鈕的 value 就算可轉銷
        const $cell = $$($tds[9])
        const text = $cell.text().trim()
        const inputValue = $cell.find('input').attr('value') || ''
        canTransfer = (text + inputValue).trim().length > 0
      })
    } catch {
      // 查不到就維持 null，前端退回舊判斷
    }
  }

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

  return { header: { ...header, canTransfer }, breadcrumb, isNew: !guid, taxTypeOptions }
})
