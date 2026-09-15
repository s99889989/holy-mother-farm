/**
 * GET /api/internal-system/property/class-meta
 * 對應 api/class_list_CL.php?act=list_page
 */
import { getInternalSystemSessionCookie } from '../../../utils/internal-system/phpProxy'
import { internalSystemPropertyGetJson } from '../../../utils/internal-system/phpPropertyProxy'

export default defineEventHandler(async (event) => {
  const cookie = getInternalSystemSessionCookie(event)
  return internalSystemPropertyGetJson('api/class_list_CL.php', cookie, { act: 'list_page' })
})