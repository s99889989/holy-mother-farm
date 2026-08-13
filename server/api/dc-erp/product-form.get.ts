// server/api/dc-erp/product-form.get.ts
//
// 對應原網站「基本資料 > 品項資料管理 > 修改」（/COAERP/Prod/Edit/{id}）。
//
// 【重要：這支目前只做「檢視」，沒有對應的存檔 API】原網站這個編輯頁比
// 訂貨單/銷貨單複雜很多：
//   1. 「所屬類別」（ClassSelect1/2/3）是三層連動下拉，選項透過
//      ProductClass/GetParentSelect AJAX 動態產生，不是寫死在 HTML 裡，
//      沒有真實回應樣本沒辦法重畫成可操作的下拉，這裡先用純文字顯示
//      （從隱藏欄位 ParentIDList 只能拿到 ID，沒有名稱，所以類別名稱這裡
//      其實也顯示不出來，直接留白，等有 GetParentSelect 樣本再補）。
//   2. 「基本單位」欄位（UnitCode）原網站是打完代號 blur 出焦點時呼叫
//      GET SpecUnit/GetUnitInfo?code=xxx 查代號、回填 UnitID／UnitName，
//      這裡沒有真實回應樣本核對格式，先只唯讀顯示現有值，不做即時查詢。
//   3. 「商品規格清單」（單位／換算／重量／價格…）是 ExtJS DynamicGrid，
//      資料來源、儲存方式完全是另一套機制（原網站按「儲存」時會先呼叫
//      SaveProdSpec()／SaveProdSpecDetails() 兩支不明的 AJAX，才送出主表單
//      SaveSubmit()），這裡完全沒有做，也沒有解析。
//   4. 「組合內容」分頁（tabs-2，組合商品）完全沒有做。
//   5. 「產品圖片」上傳／刪除沒有做。
// 因為存檔動作牽涉到以上這些不確定的部分（貿然只送出部分欄位，有可能被
// 原網站當成「沒送的欄位＝清空」，覆蓋掉既有的類別／單位／規格清單資料，
// 這是正式在用的品項主檔，風險太高），這支先只做唯讀檢視，等以下任一項
// 有真實 Network 記錄可以核對後，再加上對應功能：
//   - 在原網站品項編輯頁按「儲存」那次的完整 Form Data（才能知道存檔時
//     實際送出哪些欄位，安全地只改我們有把握的欄位）
//   - GetParentSelect／GetUnitInfo 的真實回應內容（才能做類別/單位查詢）
//   - 商品規格清單的 DetailSource／存檔 AJAX 的真實 Network 記錄
//
// 需要安裝 cheerio：npm install cheerio

import { load } from 'cheerio'

export default defineEventHandler(async (event) => {
  const sessionCookie = requireDcUpstreamSession(event)
  const query = getQuery(event)
  const id = query.id ? String(query.id) : ''

  if (!id) {
    throw createError({ statusCode: 400, statusMessage: '缺少品項編號' })
  }

  const res = await fetchDcUpstream(sessionCookie, `/COAERP/Prod/Edit/${encodeURIComponent(id)}`)
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
    const $el = $(selector)
    if ($el.is('textarea')) return $el.text().trim()
    return $el.val() ? String($el.val()) : ($el.attr('value') || '')
  }

  function checked(selector: string) {
    return $(selector).attr('checked') !== undefined
  }

  const product = {
    id: val('#ID'),
    code: val('#Code'),
    name: val('#Name'),
    shortName: val('#ShortName'),
    marketingProductCode: val('#MarketingProductCode'),
    unitCode: val('#UnitCode'),
    unitID: val('#UnitID'),
    unitName: $('#UnitName').text().trim(),
    faProductAccountingID: val('#FAProductAccountingID'),
    faProductAccountingOptions: parseSelectOptions('#FAProductAccountingID'),
    isNotExpireDate: checked('#IsNotExpireDate'),
    saveDays: val('#SaveDays'),
    taxType: val('#TaxType'),
    taxTypeOptions: parseSelectOptions('#TaxType'),
    lossRate: val('#LossRate'),
    warehouseID: val('#WarehouseID'),
    warehouseOptions: parseSelectOptions('#WarehouseID'),
    safeStock: val('#SafeStock'),
    temperLayer: val('#TemperLayer'),
    temperLayerOptions: parseSelectOptions('#TemperLayer'),
    isTAFTProduct: checked('#IsTAFTProduct'),
    barCode: val('#BarCode'),
    remark: val('#Remark'),
    isDisable: checked('#IsDisable')
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

  return { product, breadcrumb }
})
