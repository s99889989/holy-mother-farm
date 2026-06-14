export default defineEventHandler((event) => {
  const id = getRouterParam(event, 'id')
  const db = openDevDb(true)
  const row = db.prepare(`SELECT * FROM waybills WHERE id = ?`).get(id)
  db.close()
  return row
})
