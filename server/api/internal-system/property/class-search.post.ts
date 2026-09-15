/**
 * POST /api/internal-system/property/class-search
 * body: { firstClassSelect?, secondClassSelect?, thirdClassSelect? }
 * 對應 api/class_list_CL.php?act=search_data
 */
import { getInternalSystemSessionCookie } from '../../../utils/internal-system/phpProxy'
import { internalSystemPropertyPostJson } from '../../../utils/internal-system/phpPropertyProxy'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const cookie = getInternalSystemSessionCookie(event)
  return internalSystemPropertyPostJson('api/class_list_CL.php?act=search_data', cookie, body ?? {})
})