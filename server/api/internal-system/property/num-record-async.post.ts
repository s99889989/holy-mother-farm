/**
 * POST /api/internal-system/property/num-record-async
 * body: { limit, productId, tabId, nextCursor }
 * 對應 api/property_num_record_CL.php?act=asyncData
 */
import { getInternalSystemSessionCookie } from '../../../utils/internal-system/phpProxy'
import { internalSystemPropertyPostJson } from '../../../utils/internal-system/phpPropertyProxy'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const cookie = getInternalSystemSessionCookie(event)
  return internalSystemPropertyPostJson('api/property_num_record_CL.php?act=asyncData', cookie, {
    limit: body.limit ?? 5,
    productId: body.productId,
    tabId: body.tabId,
    nextCursor: body.nextCursor ?? null,
  })
})