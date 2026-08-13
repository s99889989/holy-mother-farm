// server/api/dc-erp/sales-order-products.get.ts
//
// 對應原網站訂貨單明細「批次新增」商品搜尋燈箱：
// /COAERP/ProdList/ProdListMultiple。原網站是整頁 HTML（含分頁），這裡解析
// 成 JSON 清單給我們自己的商品搜尋畫面用。
//
// 每一列代表一個「商品規格」（同一個品項代號可能有多列，對應不同單位，
// 例如 aa002 有「斤」跟「50斤/袋」兩種規格），選了哪一列就決定了單位——
// 不需要另外選單位。
//
// 篩選欄位比照原網站畫面（資料來源/促銷檔期/對應貨號/規格單位/依關鍵字），
// 「依類別」三層連動下拉（ClassSelect1/2/3，透過 ProductClass/GetParentSelect
// 動態載入）目前沒有做，比較少用、邏輯也比較複雜，先跳過。
//
// 注意：原網站表單 method="post"，「送出查詢」是 POST 表單資料，不是 GET
// 帶查詢字串——之前第一版這裡寫成 GET，原網站的 action 在 GET 下只認場別/
// 客戶/日期這些「開燈箱」用的參數，KeyWord/WHSearch 這些「查詢」欄位會被
// 忽略，導致查了也沒變。這裡改成跟 sales-order-firms.get.ts 一樣一律 POST。
//
// 需要安裝 cheerio：npm install cheerio

import { load } from 'cheerio'

export default defineEventHandler(async (event) => {
  const sessionCookie = requireDcUpstreamSession(event)
  const query = getQuery(event)

  const firmId = query.firmId ? String(query.firmId) : ''
  const workPlaceId = query.workPlaceId ? String(query.workPlaceId) : ''
  const selectDate = query.selectDate ? String(query.selectDate) : ''
  const keyword = query.keyword ? String(query.keyword) : ''
  const whSearch = query.whSearch ? String(query.whSearch) : 'whatever'
  const sourceType = query.sourceType ? String(query.sourceType) : '0'
  const scheSelect = query.scheSelect ? String(query.scheSelect) : '0'
  const correspondNoKeyword = query.correspondNoKeyword ? String(query.correspondNoKeyword) : ''
  const specUnitKeyword = query.specUnitKeyword ? String(query.specUnitKeyword) : ''
  const page = query.page ? String(query.page) : '1'

  if (!firmId || firmId === '0') {
    throw createError({ statusCode: 400, statusMessage: '請先輸入客戶' })
  }
  if (!workPlaceId || workPlaceId === '0') {
    throw createError({ statusCode: 400, statusMessage: '請先選擇場別' })
  }

  const body = new URLSearchParams({
    SelFirmID: firmId,
    FirmType: '4', // 4 = 客戶（比照 SalesGridBatchAddAction 的固定值）
    SelectDate: selectDate,
    WorkPlaceID: workPlaceId,
    WHSearch: whSearch,
    KeyWord: keyword,
    SourceTypeSelect: sourceType,
    ScheSelect: scheSelect,
    CorrespondNoKeyWord: correspondNoKeyword,
    SpecUnitKeyWord: specUnitKeyword
  })

  const path = page === '1'
    ? '/COAERP/ProdList/ProdListMultiple'
    : `/COAERP/ProdList/ProdListMultiple/0/${encodeURIComponent(page)}`

  const res = await fetchDcUpstream(sessionCookie, path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString()
  })
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

  const items: Array<{
    id: string, code: string, name: string, prodCode: string,
    unit: string, weight: string, price: string, correspondNo: string
  }> = []
  $('table.TableList tr').each((i: number, tr: any) => {
    if (i === 0) return // 表頭列
    const $tds = $(tr).find('td')
    if ($tds.length < 8) return

    const checkbox = $($tds[0]).find('input[type="checkbox"]')
    const id = (checkbox.attr('id') || '').replace('SelCheckBox', '')
    if (!id) return

    items.push({
      id,
      code: $($tds[1]).text().trim(),
      name: $($tds[2]).text().trim(),
      prodCode: $($tds[3]).text().trim(), // 商品代號（本站樣本目前都是空的）
      unit: $($tds[4]).text().trim(),
      weight: $($tds[5]).text().trim(),
      price: $($tds[6]).text().trim(),
      correspondNo: $($tds[7]).text().trim()
    })
  })

  const totalMatch = html.match(/總計([\d,]+)筆\/\s*總計([\d,]+)頁/)
  const totalCount = totalMatch ? Number(totalMatch[1].replace(/,/g, '')) : items.length
  const totalPages = totalMatch ? Number(totalMatch[2].replace(/,/g, '')) : 1

  return {
    items,
    totalCount,
    totalPages,
    page: Number(page),
    firmName: $('#FirmInfoDiv').text().replace(/\s+/g, ' ').trim(),
    sourceTypeOptions: parseSelectOptions('#SourceTypeSelect'),
    scheOptions: parseSelectOptions('#ScheSelect'),
    whSearchOptions: parseSelectOptions('#WHSearch')
  }
})

