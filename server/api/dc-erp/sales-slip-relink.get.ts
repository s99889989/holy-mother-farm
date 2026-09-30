// server/api/dc-erp/sales-slip-relink.get.ts
//
// 「依取訂貨單補回關聯」用：給一個訂貨單號，回傳那張訂貨單的表頭 GUID 跟
// 每一列明細（GUID／品項／單位／數量），前端拿去跟銷貨單上「沒有關聯」的
// 明細列依品項＋單位配對，把 SalesOrderGUID／SalesOrderDetailsGUID 等欄位
// 補回去，使用者按「儲存」時由 sales-slip.post.ts 送回原網站。
//
// 這支只讀不寫，不會動到原網站任何資料。
//
// 流程：
//   1. 用訂貨單列表查詢（跟 sales-orders.get.ts 同一支 POST，單號起訖都填
//      同一個單號）找到訂貨單，從「訂貨單號」連結的 Edit/{guid} 解析 GUID。
//   2. GET /COAERP/SalesOrder/DetailSource?purchaseid={guid} 取明細
//      （欄位已用真實回應核對過：GUID / ProductID / SpecificationUnitID /
//      OriginalNum…）。
//
// 需要安裝 cheerio：npm install cheerio

import { load } from 'cheerio'

export default defineEventHandler(async (event) => {
  const sessionCookie = requireDcUpstreamSession(event)
  const query = getQuery(event)
  const code = query.code ? String(query.code).trim() : ''

  if (!code) {
    throw createError({ statusCode: 400, statusMessage: '請先填入「取訂貨單」的訂貨單號' })
  }

  // ---------- 1. 用單號找訂貨單 GUID ----------
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
    SCode: code,
    ECode: code,
    SearchFirmCode: ''
  })

  const listRes = await fetchDcUpstream(sessionCookie, '/COAERP/SalesOrder/index/0/1?pagesize=20', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: searchBody.toString()
  })
  const $ = load(await listRes.text())

  let orderGuid = ''
  $('#TableList tr').each((i: number, tr: any) => {
    if (i === 0 || orderGuid) return
    const $tds = $(tr).find('td')
    if ($tds.length < 13) return
    const $link = $($tds[2]).find('a')
    if ($link.text().trim() !== code) return
    const m = ($link.attr('href') || '').match(/Edit\/([0-9a-fA-F-]{36})/)
    if (m) orderGuid = m[1]
  })

  if (!orderGuid) {
    throw createError({ statusCode: 404, statusMessage: `找不到訂貨單「${code}」` })
  }

  // ---------- 2. 取訂貨單明細 ----------
  const detailRes = await fetchDcUpstream(
    sessionCookie,
    `/COAERP/SalesOrder/DetailSource?purchaseid=${encodeURIComponent(orderGuid)}`
  )

  let parsed: any
  try {
    parsed = await detailRes.json()
  } catch {
    throw createError({ statusCode: 502, statusMessage: '原網站訂貨單明細資料格式異常' })
  }

  const rows = (Array.isArray(parsed?.data) ? parsed.data : []).map((r: any) => ({
    guid: r.GUID || '',
    productID: r.ProductID != null ? String(r.ProductID) : '',
    productName: r.ProductName || '',
    specificationUnitID: r.SpecificationUnitID != null ? String(r.SpecificationUnitID) : '',
    originalNum: Number(r.OriginalNum) || 0
  })).filter((r: any) => r.guid)

  return {
    orderGuid,
    orderCode: code,
    // 原網站 SalesOrderProduct 欄位的格式：訂貨單全部品項 ID，逗號分隔
    salesOrderProduct: rows.map((r: any) => r.productID).join(','),
    rows
  }
})
