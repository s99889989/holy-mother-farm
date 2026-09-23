// server/api/dc-erp/automation/captcha-library.post.ts
//
// 把你在自己電腦上用 bootstrap-captcha-ocr.mjs 長出來的
// captcha-template-library.json 內容匯入到伺服器這份正式的樣板庫——用
// 「合併」不是「取代」，不會清掉伺服器現有的樣本，兩邊疊加。
//
// body: { entries: Array<{ label: string, feat: number[] }> }
// （直接把本機那個 JSON 檔的內容當 entries 傳進來就好，settings.vue 的
// 上傳按鈕會做這件事，不用你自己組格式。）

export default defineEventHandler(async (event) => {
  requireDcUpstreamSession(event)
  const body = await readBody(event)
  const entries = Array.isArray(body?.entries) ? body.entries : []

  const valid = entries.filter(
    (e: any) => typeof e?.label === 'string' && e.label.length === 1 && Array.isArray(e?.feat)
  )
  if (!valid.length) {
    throw createError({ statusCode: 400, statusMessage: '沒有有效的樣本資料（格式應為 [{label, feat}, ...]）' })
  }

  return await appendConfirmedGlyphs(valid)
})
