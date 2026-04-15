// server/api/holy/login.post.ts
import { defineEventHandler, readBody, setCookie, createError } from 'h3'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const config = useRuntimeConfig()

  const { username, password } = body
  if (!username || !password) {
    throw createError({ statusCode: 400, message: '請輸入帳號和密碼' })
  }

  // 呼叫 Spring Boot 後端驗證
  try {
    const res = await $fetch<{ success: boolean }>(
      `${config.apiBase}/holy/auth/login`,
      {
        method: 'POST',
        body: { username, password },
      }
    )

    if (res.success) {
      setCookie(event, 'holy_auth', 'ok', {
        maxAge:   60 * 60 * 24 * 7,  // 7 天
        httpOnly: true,
        path:     '/',
        sameSite: 'lax',
      })
      return { success: true }
    }

    throw createError({ statusCode: 401, message: '帳號或密碼錯誤' })
  } catch (e: any) {
    if (e.statusCode) throw e
    throw createError({ statusCode: 401, message: '帳號或密碼錯誤' })
  }
})
