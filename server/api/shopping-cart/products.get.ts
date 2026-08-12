// server/api/shopping-cart/products.get.ts
// 對應 admin_product.php（不帶 dir/i）及 admin_product.php?dir=1&i={categoryId}
//
// 左側「商品分類」清單固定都會出現（跟分類頁「顯示中」的分類一致），
// 右側只有帶 categoryId 的時候才會有商品縮圖清單。

import { load } from 'cheerio'

export default defineEventHandler(async (event) => {
  const sessionCookie = requireUpstreamSession(event)
  const query = getQuery(event)
  const categoryId = query.categoryId ? String(query.categoryId) : ''

  const path = categoryId
    ? `admin_product.php?dir=1&i=${encodeURIComponent(categoryId)}`
    : 'admin_product.php'

  const res = await fetchUpstream(sessionCookie, path)
  const html = await res.text()
  const $ = load(html)

  const looksLikeLoginPage = html.includes('管理員登入')
  if (looksLikeLoginPage) {
    throw createError({ statusCode: 401, statusMessage: '登入已過期，請重新登入' })
  }

  // 左側分類清單
  const categories: Array<{ categoryId: string; name: string }> = []
  $('.col-sm-2 ul.list-unstyled li a').each((_, el) => {
    const href = $(el).attr('href') || ''
    const idMatch = href.match(/i=(\d+)/)
    if (!idMatch) return
    categories.push({
      categoryId: idMatch[1],
      name: $(el).text().trim()
    })
  })

  // 右側商品縮圖清單（只有選了分類才會有）
  const items: Array<Record<string, any>> = []
  $('.col-sm-10 .thumbnail').each((_, el) => {
    const caption = $(el).find('.caption')

    // 商品名稱是 caption 裡第一個文字節點，價格/單位、按鈕都是後面的 <div>
    const nameNode = caption
      .contents()
      .filter((__, node) => node.type === 'text')
      .first()
    const name = (nameNode.text() || '').trim()

    const priceText = caption.children('div').first().text().trim()
    // 例：「價格:200元 / 10入/盒」
    const priceMatch = priceText.match(/([\d,]+)\s*元\s*\/\s*(.+)$/)
    const price = priceMatch ? priceMatch[1] : ''
    const unit = priceMatch ? priceMatch[2].trim() : ''

    const imgSrc = $(el).find('img').attr('src') || ''
    const editHref = caption.find('a[href*="admin_product_update.php"]').attr('href') || ''
    const imageAddHref = caption.find('a[href*="admin_product_image_add.php"]').attr('href') || ''
    const copyHref = caption.find('a[href*="act=cp"]').attr('href') || ''
    const deleteHref = caption.find('a[href*="act=d&"]').attr('href') || ''

    const idMatch = editHref.match(/i=(\d+)/)
    const productId = idMatch ? idMatch[1] : ''
    if (!productId) return

    items.push({
      productId,
      name,
      price,
      unit,
      imageUrl: resolveUpstreamAsset(imgSrc),
      hasImage: !imgSrc.includes('blank.jpg'),
      deleteHref
    })
  })

  return { categories, categoryId, items }
})
