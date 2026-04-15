// server/api/holy/logout.post.ts
import { defineEventHandler, deleteCookie } from 'h3'

export default defineEventHandler((event) => {
  deleteCookie(event, 'holy_auth', { path: '/' })
  return { success: true }
})
