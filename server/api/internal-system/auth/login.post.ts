/**
 * POST /api/internal-system/auth/login
 * body: { u: string, p: string }
 */
export default defineEventHandler(async (event) => {
  const body = await readBody(event)

  const formData = new URLSearchParams()
  formData.append('u', body.u ?? '')
  formData.append('p', body.p ?? '')

  const result = await internalSystemAgentRelayFetch(
      'POST',
      `${INTERNAL_SYSTEMS.A106}/login_CL.php?act=loginst`,
      {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'Mozilla/5.0',
      },
      formData.toString()
  )

  const json = JSON.parse(result.bodyText)

  // 登入成功才設 cookie
  if (json.rs === '1') {
    // 1. httpOnly cookie 給 server proxy 用（帶給 PHP）
    const setCookies = getInternalSystemRelaySetCookies(result)
    const phpsessidCookie = setCookies.find((c) => c.includes('PHPSESSID='))
    if (phpsessidCookie) {
      const match = phpsessidCookie.match(/PHPSESSID=([^;]+)/)
      if (match) {
        setCookie(event, 'PHPSESSID', match[1], {
          httpOnly: true,
          path: '/',
          sameSite: 'lax',
        })
      }
    }

    // 2. 非 httpOnly 的 flag cookie，給前端 middleware 判斷是否已登入
    setCookie(event, 'logged_in', '1', {
      httpOnly: false,
      path: '/',
      sameSite: 'lax',
    })

    // 3. 員工編號 —— 部分舊系統 API（例如 A106 的個人資料修改）不會自己用
    //    session 判斷是誰，一定要帶 id 查詢，所以另外存一個 cookie 給
    //    server 端 proxy 用。登入回應的 data.uid 是小寫（例如 "f00228"），
    //    但系統其他地方的員編都是大寫（例如 "F00228"），這裡轉大寫存放，
    //    如果之後發現轉大寫反而查不到資料，把這行的 .toUpperCase() 拿掉。
    if (json.data?.uid) {
      setCookie(event, 'employee_id', String(json.data.uid).toUpperCase(), {
        httpOnly: true,
        path: '/',
        sameSite: 'lax',
      })
    }
  }

  return json
})