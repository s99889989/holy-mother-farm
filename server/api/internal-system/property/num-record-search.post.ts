/**
 * POST /api/internal-system/property/num-record-search
 * body: { productNum: string }
 * 對應 api/property_num_record_CL.php?act=search_data
 */
import { getInternalSystemSessionCookie } from '../../../utils/internal-system/phpProxy'
import { internalSystemPropertyPostJson } from '../../../utils/internal-system/phpPropertyProxy'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const cookie = getInternalSystemSessionCookie(event)
  return internalSystemPropertyPostJson('api/property_num_record_CL.php?act=search_data', cookie, {
    productNum: body.productNum ?? '',
  })
})