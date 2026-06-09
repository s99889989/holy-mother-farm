import Database from 'better-sqlite3'

export default defineEventHandler(() => {
  const db = new Database('C:/ezCat/app/db/development.sqlite3', { readonly: true })
  const rows = db.prepare(`SELECT id, product_id, product_name FROM productnames ORDER BY product_name`).all()
  db.close()
  return rows
})
