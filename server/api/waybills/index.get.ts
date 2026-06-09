import Database from 'better-sqlite3'

export default defineEventHandler((event) => {
  const query = getQuery(event)
  const db = new Database('C:/ezCat/app/db/development.sqlite3', { readonly: true })

  const { keyword, start_date, end_date, page = 1, limit = 20 } = query

  let sql = `
    SELECT
      id, tracking_no, order_no, send_date, deliver_date,
      sender_id, sender_name, sender_phone, sender_code,
      customer_code, customer_name, customer_phone, customer_mobile,
      customer_address, customer_postcode,
      production_kind, production_name,
      price, state, paper_id,
      deliver_time, temperature, package_size,
      breakable, precision_instrument,
      waybilltype, insurance,
      comment, created_at
    FROM waybills
    WHERE 1=1
  `
  const params: any[] = []

  if (keyword) {
    sql += ` AND (customer_name LIKE ? OR customer_phone LIKE ? OR customer_mobile LIKE ? OR tracking_no LIKE ? OR order_no LIKE ?)`
    params.push(`%${keyword}%`, `%${keyword}%`, `%${keyword}%`, `%${keyword}%`, `%${keyword}%`)
  }
  if (start_date) { sql += ` AND send_date >= ?`; params.push(start_date) }
  if (end_date)   { sql += ` AND send_date <= ?`; params.push(end_date) }

  sql += ` ORDER BY created_at DESC LIMIT ? OFFSET ?`
  params.push(Number(limit), (Number(page) - 1) * Number(limit))

  const rows = db.prepare(sql).all(...params)

  let countSql = `SELECT COUNT(*) as total FROM waybills WHERE 1=1`
  const countParams: any[] = []
  if (keyword) {
    countSql += ` AND (customer_name LIKE ? OR customer_phone LIKE ? OR customer_mobile LIKE ? OR tracking_no LIKE ? OR order_no LIKE ?)`
    countParams.push(`%${keyword}%`, `%${keyword}%`, `%${keyword}%`, `%${keyword}%`, `%${keyword}%`)
  }
  if (start_date) { countSql += ` AND send_date >= ?`; countParams.push(start_date) }
  if (end_date)   { countSql += ` AND send_date <= ?`; countParams.push(end_date) }

  const { total } = db.prepare(countSql).get(...countParams) as any

  db.close()
  return { rows, total, page: Number(page), limit: Number(limit) }
})
