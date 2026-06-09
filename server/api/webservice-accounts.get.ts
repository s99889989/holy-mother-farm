import Database from 'better-sqlite3'

export default defineEventHandler(() => {
  const db = new Database('C:/ezCat/app/db/development.sqlite3', { readonly: true })
  const rows = db.prepare(`SELECT id, login, name, default_account FROM webservice_accounts ORDER BY login`).all()
  db.close()
  return rows
})
