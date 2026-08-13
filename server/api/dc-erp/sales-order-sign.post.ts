// server/api/dc-erp/sales-order-sign.post.ts
//
// 訂貨單「簽核」／「簽退」，對應原網站列表頁勾選後按右上角圖示的動作：
//   - 簽核：POST /COAERP/SalesOrder/MultiSign
//   - 簽退：POST /COAERP/SalesOrder/MultiSignReturn
// 兩支帶的欄位一樣：CurrentPage（頁碼）、StoreCheckedItemJSON（勾選訂單的
// Guid）、DelChk（同一個值再帶一次，原網站表單裡這兩個欄位長一樣）。
//
// 實測發現：即使是真的被勾選的那一列，它自己那份 checkBox 隱藏欄位值也是
// false——原網站列表頁每一列都固定會送一個 checkBox=false（ASP.NET 的
// checkbox+hidden 慣用寫法，只是每列都有一份），真正決定「勾了誰」的是
// StoreCheckedItemJSON／DelChk 這兩個欄位，不是靠這堆 checkBox，所以這裡
// 不用把當前頁面所有列的 checkBox 欄位也送一份。
//
// StoreCheckedItemJSON 欄位名稱雖然叫「JSON」，但實測單選時內容是一個沒有
// 引號/中括號的裸 Guid 字串，不是真的 JSON——多選時原網站怎麼組這個欄位
// （逗號分隔？JSON 陣列？）目前沒有實測樣本，這裡先用逗號分隔嘗試，如果
// 列表頁多選簽核/簽退失敗，麻煩勾兩張以上測試單、實際點一次簽核，把那筆
// 請求的 Payload 貼給我核對調整。
//
// 這支同時給「編輯頁」單張簽核／簽退用（直接傳只有一個 Guid 的陣列）跟
// 「列表頁」批次簽核／簽退用（可傳多個 Guid），因為 MultiSign 本來就是
// 設計成一次簽一張或多張都可以。
//
// 成功時原網站會 302 導回列表頁，這裡把 302（非 /Account/）視為成功。

export default defineEventHandler(async (event) => {
  const sessionCookie = requireDcUpstreamSession(event)
  const body = await readBody(event)

  const guids: string[] = Array.isArray(body?.guids) ? body.guids.filter(Boolean) : []
  const action = body?.action === 'return' ? 'return' : 'sign'

  if (!guids.length) {
    throw createError({ statusCode: 400, statusMessage: '請至少選擇一張訂貨單' })
  }

  const joined = guids.join(',')
  const formBody = new URLSearchParams({
    CurrentPage: '1',
    StoreCheckedItemJSON: joined,
    DelChk: joined
  })

  const path = action === 'return' ? '/COAERP/SalesOrder/MultiSignReturn' : '/COAERP/SalesOrder/MultiSign'

  const res = await fetchDcUpstream(sessionCookie, path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: formBody.toString()
  })

  const isSuccessRedirect = res.status >= 300 && res.status < 400
  if (!isSuccessRedirect && !res.ok) {
    throw createError({ statusCode: 502, statusMessage: `${action === 'return' ? '簽退' : '簽核'}失敗，原網站回應異常` })
  }

  return { success: true }
})
