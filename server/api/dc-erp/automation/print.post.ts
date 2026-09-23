// server/api/dc-erp/automation/print.post.ts
//
// 手動測試/重新列印：不重新產生 PDF，直接把已經存在 Spring Boot 那份
// PDF 再送一次列印指令，方便反覆測試印表機那端有沒有反應，不用重跑一次
// 簽核/轉銷/下載。body: { fileName: string }

export default defineEventHandler(async (event) => {
  requireDcUpstreamSession(event)
  const body = await readBody(event)
  const fileName = body?.fileName ? String(body.fileName).trim() : ''

  if (!fileName) {
    throw createError({ statusCode: 400, statusMessage: '缺少檔名' })
  }

  const apiBase = useRuntimeConfig().public.apiBase
  const res = await fetch(`${apiBase}/holy/dc-erp/automation/pdf/${encodeURIComponent(fileName)}/print`, {
    method: 'POST'
  })
  if (!res.ok) {
    throw createError({ statusCode: 502, statusMessage: '列印請求失敗' })
  }
  return await res.json()
})
