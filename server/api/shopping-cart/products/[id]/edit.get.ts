// server/api/shopping-cart/products/[id]/edit.get.ts
// 對應 admin_product_update.php?i={id}
// 一次回傳「商品資訊」表單（#f）預填資料，以及上方「商品圖片」panel 的
// 縮圖清單（排序輸入框 + 刪除連結）。

import { load } from 'cheerio'

export default defineEventHandler(async (event) => {
  const sessionCookie = requireUpstreamSession(event)
  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: '缺少商品 ID' })
  }

  const res = await fetchUpstream(
    sessionCookie,
    `admin_product_update.php?i=${encodeURIComponent(id)}`
  )
  const html = await res.text()
  const $ = load(html)

  const form = $('#f')
  if (form.length === 0) {
    const looksLikeLoginPage = html.includes('管理員登入')
    throw createError({
      statusCode: looksLikeLoginPage ? 401 : 502,
      statusMessage: looksLikeLoginPage ? '登入已過期，請重新登入' : '抓不到編輯表單，請確認這個商品是否存在'
    })
  }

  const images: Array<Record<string, any>> = []
  $('.panel-heading')
    .filter((_, el) => $(el).text().trim() === '商品圖片')
    .next('.panel-body')
    .find('.col-sm-3')
    .each((_, el) => {
      const sortInput = $(el).find('input[id^="pic"]')
      const deleteHref = $(el).find('a[href*="act=pic_d"]').attr('href') || ''
      const piMatch = deleteHref.match(/pi=(\d+)/)
      images.push({
        picId: piMatch ? piMatch[1] : '',
        imageUrl: resolveUpstreamAsset($(el).find('img').attr('src') || ''),
        sortFieldName: sortInput.attr('name') || '',
        sortValue: sortInput.attr('value') || '',
        deleteHref
      })
    })

  return {
    productId: id,
    categoryId: form.find('#d option[selected]').attr('value') || '',
    name: form.find('#n').attr('value') || '',
    no: form.find('#no').attr('value') || '',
    originalPrice: form.find('#op').attr('value') || '',
    price: form.find('#p').attr('value') || '',
    unit: form.find('#u option[selected]').attr('value') || '',
    tempZone: form.find('input[name="t"]:checked').attr('value') ?? '1',
    orderable: form.find('input[name="s"]:checked').attr('value') ?? '1',
    visible: form.find('input[name="o"]:checked').attr('value') ?? '1',
    sort: form.find('#psort').attr('value') || '',
    description: form.find('#c').text() || '',
    images
  }
})
