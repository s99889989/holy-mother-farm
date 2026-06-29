import { readFile } from 'fs/promises'
import { join } from 'path'

export default defineEventHandler(async (event) => {
  const filename = getRouterParam(event, 'filename')

  // 安全檢查：只允許 InvD + 日期開頭的 .txt，防止路徑穿越
  if (!filename || !/^InvD\d{8}_.+\.txt$/.test(filename)) {
    throw createError({ statusCode: 400, message: '不合法的檔名' })
  }

  const filepath = join(process.cwd(), 'public', 'file', 'pos-data', filename)
  const buffer = await readFile(filepath)

  // 回傳 latin1 字串（保留原始 bytes 供前端 Big5 解碼）
  setResponseHeader(event, 'Content-Type', 'text/plain; charset=latin1')
  return buffer.toString('latin1')
})
