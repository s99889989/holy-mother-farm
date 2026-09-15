/**
 * POST /api/internal-system/property/inventory-set-save
 * body: { id?: string|number, inst: string, title: string, st: string, et: string }
 * 對應 api/inventory_set_CL.php?act=add 或 act=update
 */
import { getInternalSystemSessionCookie } from '../../../utils/internal-system/phpProxy'
import { internalSystemPropertyPostJson } from '../../../utils/internal-system/phpPropertyProxy'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const cookie = getInternalSystemSessionCookie(event)
  const act = body.id ? 'update' : 'add'

  return internalSystemPropertyPostJson(`api/inventory_set_CL.php?act=${act}`, cookie, {
    m_id: body.id ?? '',
    m_inst: body.inst ?? '',
    m_title: body.title ?? '',
    m_st: body.st ?? '',
    m_et: body.et ?? '',
  })
})