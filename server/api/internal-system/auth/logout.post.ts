/**
 * POST /api/internal-system/auth/logout
 */
export default defineEventHandler(async (event) => {
  deleteCookie(event, 'PHPSESSID', { path: '/' })
  deleteCookie(event, 'logged_in', { path: '/' })
  deleteCookie(event, 'employee_id', { path: '/' })
  return { success: true }
})