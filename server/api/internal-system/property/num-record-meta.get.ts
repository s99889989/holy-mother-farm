/**
 * GET /api/internal-system/property/num-record-meta
 * 對應 api/property_num_record_CL.php?act=list_page
 */
import { getInternalSystemSessionCookie } from '../../../utils/internal-system/phpProxy'
import { internalSystemPropertyGetJson } from '../../../utils/internal-system/phpPropertyProxy'

export default defineEventHandler(async (event) => {
  const cookie = getInternalSystemSessionCookie(event)
  return internalSystemPropertyGetJson('api/property_num_record_CL.php', cookie, { act: 'list_page' })
})