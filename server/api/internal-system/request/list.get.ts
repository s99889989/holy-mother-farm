/**
 * GET /api/internal-system/request/list?year=YYYY-MM
 * 對應 sys_request_CL.php?act=getFnList&Year=YYYY-MM
 */
import { getInternalSystemSessionCookie } from '../../../utils/internal-system/phpProxy'
import { internalSystemRequestGetJson } from '../../../utils/internal-system/phpRequestProxy'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const year = String(query.year ?? '')
  const cookie = getInternalSystemSessionCookie(event)
  return internalSystemRequestGetJson('sys_request_CL.php', cookie, { act: 'getFnList', Year: year })
})