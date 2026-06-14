export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const db = openDevDb()

  try {
    const trackingRow = db.prepare(`
      SELECT id, no FROM tracking_nos
      WHERE used = 0 AND login = ?
      ORDER BY id ASC LIMIT 1
    `).get(body.sender_code) as any

    if (!trackingRow) {
      db.close()
      throw createError({ statusCode: 422, statusMessage: '沒有可用的託運單號，請先取號' })
    }

    const now = new Date().toISOString().replace('T', ' ').substring(0, 19)

    const insert = db.prepare(`
      INSERT INTO waybills (
        sender_code, sender_id, paper_id,
        tracking_no,
        customer_code, customer_name, customer_phone, customer_mobile,
        customer_address, customer_postcode,
        default_sender,
        sender_no, sender_name, sender_phone, sender_mobile,
        sender_address, sender_postcode,
        production_kind, production_name,
        order_no, comment,
        send_date, deliver_date, deliver_time,
        temperature, package_size,
        breakable, precision_instrument,
        waybilltype, has_price, price,
        hasinsurance, insurance,
        state,
        created_at, updated_at
      ) VALUES (
        ?, ?, ?,
        ?,
        ?, ?, ?, ?,
        ?, ?,
        ?,
        ?, ?, ?, ?,
        ?, ?,
        ?, ?,
        ?, ?,
        ?, ?, ?,
        ?, ?,
        ?, ?,
        ?, ?, ?,
        ?, ?,
        'not-printed',
        ?, ?
      )
    `)

    const result = insert.run(
      body.sender_code, body.sender_id ?? null, body.paper_id ?? null,
      trackingRow.no,
      body.customer_code ?? null, body.customer_name, body.customer_phone ?? null, body.customer_mobile ?? null,
      body.customer_address ?? null, body.customer_postcode ?? null,
      body.default_sender ? 1 : 0,
      body.sender_no ?? null, body.sender_name ?? null, body.sender_phone ?? null, body.sender_mobile ?? null,
      body.sender_address ?? null, body.sender_postcode ?? null,
      body.production_kind ?? null, body.production_name ?? null,
      body.order_no ?? null, body.comment ?? null,
      body.send_date ?? null, body.deliver_date ?? null, body.deliver_time ?? '4',
      body.temperature ?? '0001', body.package_size ?? '0002',
      body.breakable ?? 'no', body.precision_instrument ?? 'no',
      body.waybilltype ?? 'A', 1, body.price ?? 0,
      body.hasinsurance ?? 'no', body.insurance ?? null,
      now, now
    )

    db.prepare(`UPDATE tracking_nos SET used = 1, updated_at = ? WHERE id = ?`).run(now, trackingRow.id)

    db.close()
    return { id: result.lastInsertRowid, tracking_no: trackingRow.no }

  } catch (e: any) {
    db.close()
    throw e
  }
})
