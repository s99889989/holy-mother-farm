import Database from 'better-sqlite3'

export default defineEventHandler(() => {
  // 紙張資料在 paper.sqlite3，不是 development.sqlite3
  const db = new Database('C:/ezCat/app/db/paper.sqlite3', { readonly: true })
  // 排除 id 13,14,15,16（與黑貓原版一致）
  const rows = db.prepare(`
    SELECT id, name FROM papers
    WHERE id NOT IN (13, 14, 15, 16)
    ORDER BY name
  `).all()
  db.close()
  return rows
})
