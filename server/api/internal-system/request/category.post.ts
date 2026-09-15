/**
 * POST /api/internal-system/request/category
 * body: { scGroup: string }
 * 對應 request_category_CL.php?act=group
 *
 * 用途一：依「請修單位」代號（scGroup = 部門代號，例如 "P"）載入「問題種類」清單
 * 用途二：scGroup = "Medical_Gas" 時，載入「問題描述」(醫用氣體專用) 選單
 */
import { getInternalSystemSessionCookie } from '../../../utils/internal-system/phpProxy'
import { internalSystemRequestPostFormJson } from '../../../utils/internal-system/phpRequestProxy'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const cookie = getInternalSystemSessionCookie(event)
  return internalSystemRequestPostFormJson('request_category_CL.php?act=group', cookie, {
    sc_group: body?.scGroup ?? '',
    sc_add: 'add',
  })
})