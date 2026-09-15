/**
 * GET /api/internal-system/property/inventory-user-list
 * 對應 api/inventory_user_CL.php?act=index_page
 * 個人財產盤點清單（原本頁面：inventory_user.php）
 */
import { getInternalSystemSessionCookie } from '../../../utils/internal-system/phpProxy'
import { internalSystemPropertyGetJson } from '../../../utils/internal-system/phpPropertyProxy'

export default defineEventHandler(async (event) => {
  const cookie = getInternalSystemSessionCookie(event)
  return internalSystemPropertyGetJson('api/inventory_user_CL.php', cookie, { act: 'index_page' })
})