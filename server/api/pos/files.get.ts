import { readdir } from 'fs/promises'
import { join } from 'path'

export default defineEventHandler(async () => {
  const dir = join(process.cwd(), 'public', 'file', 'pos-data')
  const files = await readdir(dir)
  return files.filter(f => f.endsWith('.txt')).sort()
})
