import Database from 'better-sqlite3'

export default defineEventHandler((event) => {
  const id = getRouterParam(event, 'id')
  const db = new Database('C:/ezCat/app/db/development.sqlite3', { readonly: true })
  const row = db.prepare(`SELECT * FROM waybills WHERE id = ?`).get(id)
  db.close()
  return row
})
