import Database from 'better-sqlite3'

export default defineEventHandler(() => {
  const db = new Database('C:/ezCat/app/db/development.sqlite3', { readonly: true })
  const rows = db.prepare(`SELECT id, name FROM papers`).all()
  db.close()
  return rows
})
