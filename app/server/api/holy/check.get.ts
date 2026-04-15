// server/api/holy/check.get.ts
import { defineEventHandler, getCookie } from 'h3'

export default defineEventHandler((event) => {
  const token = getCookie(event, 'holy_auth')
  return { ok: token === 'ok' }
})
