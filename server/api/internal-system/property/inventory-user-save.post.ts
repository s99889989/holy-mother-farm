/**
 * POST /api/internal-system/property/inventory-user-save
 * body: { inventoryState: Record<string, Record<string, { status: number, remark: string }>> }
 * 對應 api/inventory_user_CL.php?act=save
 *
 * 舊系統原本是用 FormData 送一個 inventoryState 欄位（值是 JSON.stringify
 * 過的字串），這裡改用 form-urlencoded 送同一個欄位名稱＋同樣的字串值，
 * 對後端 $_POST['inventoryState'] 來說效果應該相同。
 *
 * 另外要注意：舊系統前端這支存檔按鈕原本完全沒有處理回傳結果
 * （ajaxFormDataPost 的 callback 是空的），所以無法從舊程式碼確認
 * 實際回傳格式是不是也是 {rs, msg} —— 先照專案裡其他端點的慣例假設一樣，
 * 如果存檔後 Vue 頁面顯示「回應格式非預期」，麻煩把 Network 面板裡
 * 這支請求的 Response 貼給我。
 */
import { getInternalSystemSessionCookie } from '../../../utils/internal-system/phpProxy'
import { internalSystemPropertyPost } from '../../../utils/internal-system/phpPropertyProxy'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const cookie = getInternalSystemSessionCookie(event)

  const { text, sessionExpired } = await internalSystemPropertyPost('api/inventory_user_CL.php?act=save', cookie, {
    inventoryState: JSON.stringify(body?.inventoryState ?? {}),
  })

  if (sessionExpired) {
    throw createError({ statusCode: 401, statusMessage: 'Session 已過期，請重新登入' })
  }
  try {
    return JSON.parse(text)
  } catch {
    throw createError({ statusCode: 502, statusMessage: '舊系統回應格式非預期(非 JSON)' })
  }
})