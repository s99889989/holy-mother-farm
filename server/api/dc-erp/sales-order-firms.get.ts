// server/api/dc-erp/sales-order-firms.get.ts
//
// 對應原網站訂貨單表頭「客戶」欄位的燈箱：/COAERP/FirmList/CustomerList。
// 取代原本 sales-order-firm.get.ts（代理 FirmAjax/GetByKeyCode 用代號查單筆，
// 回應欄位名稱沒有真實樣本核對過）——這支改成代理真正的客戶清單頁，可靠
// 很多：選客戶的連結是 onclick="tb_GetParent().InputCustomer('代號','名稱',
// 'ID','-1','firm')"，代號/名稱/ID 直接寫在 onclick 屬性裡，用正則就能穩穩
// 抓出來，不用再猜 AJAX 回應的欄位名稱。
//
// sales-order-firm.get.ts 現在沒有被前端呼叫了，保留著也沒有實際作用，
// 可以直接刪除。
//
// 需要安裝 cheerio：npm install cheerio

import { load } from 'cheerio'

export default defineEventHandler(async (event) => {
  const sessionCookie = requireDcUpstreamSession(event)
  const query = getQuery(event)

  const category = query.category ? String(query.category) : '不拘'
  const whSearch = query.whSearch ? String(query.whSearch) : 'whatever'
  const keyword = query.keyword ? String(query.keyword) : ''
  const page = query.page ? String(query.page) : '1'

  const body = new URLSearchParams({
    SelectCategory: category,
    WHSearch: whSearch,
    KeyWord: keyword,
    Type: 'firm',
    Row: '-1'
  })

  const res = await fetchDcUpstream(
    sessionCookie,
    `/COAERP/FirmList/CustomerList/0/${encodeURIComponent(page)}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString()
    }
  )

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

  const items: Array<{ id: string, code: string, name: string }> = []
  $('table.TableList tr').each((i: number, tr: any) => {
    if (i === 0) return // 表頭列
    const $a = $(tr).find('a[onclick*="InputCustomer"]').first()
    if (!$a.length) return

    const onclick = $a.attr('onclick') || ''
    const match = onclick.match(/InputCustomer\('([^']*)','([^']*)','([^']*)'/)
    if (!match) return

    items.push({ code: match[1], name: match[2], id: match[3] })
  })

  const totalMatch = html.match(/總計([\d,]+)筆\/\s*總計([\d,]+)頁/)
  const totalCount = totalMatch ? Number(totalMatch[1].replace(/,/g, '')) : items.length
  const totalPages = totalMatch ? Number(totalMatch[2].replace(/,/g, '')) : 1

  return {
    items,
    totalCount,
    totalPages,
    page: Number(page),
    categoryOptions: parseSelectOptions('#SelectCategory')
  }
})
