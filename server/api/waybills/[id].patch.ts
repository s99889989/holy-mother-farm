export default defineEventHandler(async (event) => {
  const id   = getRouterParam(event, 'id')
  const body = await readBody(event)
  const db   = openDevDb()

  try {
    const now = new Date().toISOString().replace('T', ' ').substring(0, 19)

    db.prepare(`
      UPDATE waybills SET
        paper_id             = ?,
        customer_code        = ?,
        customer_name        = ?,
        customer_phone       = ?,
        customer_mobile      = ?,
        customer_address     = ?,
        customer_postcode    = ?,
        default_sender       = ?,
        sender_no            = ?,
        sender_name          = ?,
        sender_phone         = ?,
        sender_mobile        = ?,
        sender_address       = ?,
        sender_postcode      = ?,
        production_kind      = ?,
        production_name      = ?,
        order_no             = ?,
        comment              = ?,
        send_date            = ?,
        deliver_date         = ?,
        deliver_time         = ?,
        temperature          = ?,
        package_size         = ?,
        breakable            = ?,
        precision_instrument = ?,
        waybilltype          = ?,
        price                = ?,
        insurance            = ?,
        updated_at           = ?
      WHERE id = ?
    `).run(
      body.paper_id           ?? null,
      body.customer_code      ?? null,
      body.customer_name      ?? null,
      body.customer_phone     ?? null,
      body.customer_mobile    ?? null,
      body.customer_address   ?? null,
      body.customer_postcode  ?? null,
      body.default_sender ? 1 : 0,
      body.sender_no          ?? null,
      body.sender_name        ?? null,
      body.sender_phone       ?? null,
      body.sender_mobile      ?? null,
      body.sender_address     ?? null,
      body.sender_postcode    ?? null,
      body.production_kind    ?? null,
      body.production_name    ?? null,
      body.order_no           ?? null,
      body.comment            ?? null,
      body.send_date          ?? null,
      body.deliver_date       ?? null,
      body.deliver_time       ?? '4',
      body.temperature        ?? '0001',
      body.package_size       ?? '0002',
      body.breakable          ?? 'no',
      body.precision_instrument ?? 'no',
      body.waybilltype        ?? 'A',
      body.price              ?? 0,
      body.insurance          ?? 0,
      now,
      id
    )

    db.close()
    return { ok: true }
  } catch (e) {
    db.close()
    throw e
  }
})
