// server/api/dc-erp/sales-slips.get.ts
//
// 對應原網站「進銷存 > 銷貨管理 > 銷貨單維護」（/COAERP/SalesSlip/index）。
// 跟 sales-orders.get.ts / home.get.ts 同一套做法：查詢表單 + 列表解析成 JSON。
//
// 原網站表格有幾欄是 style="display:none"（收款對象／採買單位／出貨狀態／
// 路線／分箱），畫面上本來就看不到，這裡解析時就不特別回傳這幾欄了。
// 查詢表單也一樣，只實作畫面上看得到、會用到的欄位（依場別/依欄位/依日期/
// 依單據種類/依簽核狀態/依單號/依宅配溫層/依客戶/依母公司/依客戶類別/依發票/
// 依發票開立/依收據開立），隱藏欄位（依出貨狀態/依路線）不實作。
//
// 查詢邏輯比照原網站表單：
//   - 篩選送出 → POST /COAERP/SalesSlip/index/0/{page}?pagesize={pagesize}
//   - 「列出全部」→ 原網站是先用 JS 清空所有欄位再送出同一個 POST
//     （相當於全部條件都留預設值）
//
// 需要安裝 cheerio：npm install cheerio

import { load } from 'cheerio'

export default defineEventHandler(async (event) => {
  const sessionCookie = requireDcUpstreamSession(event)
  const query = getQuery(event)

  const page = query.page ? String(query.page) : '1'
  const pagesize = query.pagesize ? String(query.pagesize) : '10'

  const body = new URLSearchParams({
    pagesize,
    IsUsingFA: 'True',
    WorkPlace: query.workPlace ? String(query.workPlace) : '0',
    WHSearch: query.whSearch ? String(query.whSearch) : 'whatever',
    KeyWord: query.keyword ? String(query.keyword) : '',
    Sdate: query.sdate ? String(query.sdate) : '',
    Edate: query.edate ? String(query.edate) : '',
    SearchByType: query.orderType ? String(query.orderType) : '-1',
    SignType: query.signType ? String(query.signType) : '-1',
    SCode: query.scode ? String(query.scode) : '',
    ECode: query.ecode ? String(query.ecode) : '',
    Temperature: query.temperature ? String(query.temperature) : '-1',
    SearchFirmCode: query.firmCode ? String(query.firmCode) : '',
    ParentFirm: query.parentFirm ? String(query.parentFirm) : '0',
    CustomerCategory: query.customerCategory ? String(query.customerCategory) : '不拘',
    SearchInvoiceCode: query.invoiceCode ? String(query.invoiceCode) : '',
    IsCreateInvoice: query.isCreateInvoice ? String(query.isCreateInvoice) : '0',
    IsPrintReceipt: query.isPrintReceipt ? String(query.isPrintReceipt) : '0'
  })

  const res = await fetchDcUpstream(
    sessionCookie,
    `/COAERP/SalesSlip/index/0/${encodeURIComponent(page)}?pagesize=${encodeURIComponent(pagesize)}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString()
    }
  )

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

  const filters = {
    workPlace: parseSelectOptions($('#WorkPlace')),
    whSearchField: parseSelectOptions($('select[name="WHSearch"]')),
    orderType: parseSelectOptions($('#SearchByType')),
    signType: parseSelectOptions($('#SignType')),
    temperature: parseSelectOptions($('#Temperature')),
    parentFirm: parseSelectOptions($('#ParentFirm')),
    customerCategory: parseSelectOptions($('#CustomerCategory')),
    isCreateInvoice: parseSelectOptions($('select[name="IsCreateInvoice"]')),
    isPrintReceipt: parseSelectOptions($('select[name="IsPrintReceipt"]'))
  }

  const items: Array<Record<string, any>> = []
  $('#TableList tr').each((i: number, tr: any) => {
    if (i === 0) return // 表頭列
    const $tds = $(tr).find('td')
    if ($tds.length < 16) return

    const guid = $($tds[0]).find('input[name="checkBox"][type="checkbox"]').attr('value') || ''
    const $codeLink = $($tds[2]).find('a')

    items.push({
      guid,
      seq: $($tds[1]).text().trim(),
      code: $codeLink.text().trim(),
      editUrl: toDcProxiedHref($codeLink.attr('href')),
      deliveryDate: $($tds[3]).text().trim(),
      firmName: $($tds[4]).text().trim(),
      total: $($tds[7]).text().trim(),
      currentMoney: $($tds[8]).text().trim(),
      signState: $($tds[9]).text().trim(),
      remark: $($tds[14]).text().trim(),
      workPlace: $($tds[15]).find('.overFlowDiv').text().trim() || $($tds[15]).text().trim()
    })
  })

  const totalMatch = html.match(/總計([\d,]+)筆\/\s*總計([\d,]+)頁/)
  const totalCount = totalMatch ? Number(totalMatch[1].replace(/,/g, '')) : items.length
  const totalPages = totalMatch ? Number(totalMatch[2].replace(/,/g, '')) : 1

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
    filters,
    items,
    totalCount,
    totalPages,
    page: Number(page),
    pagesize: Number(pagesize),
    breadcrumb,
    createUrl: toDcProxiedHref('/COAERP/SalesSlip/Create')
  }
})
