export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const ids: number[] = body.ids ?? []

  if (!ids.length) {
    throw createError({ statusCode: 400, statusMessage: '未指定託運單' })
  }

  const db = openDevDb()

  try {
    const now = new Date().toISOString().replace('T', ' ').substring(0, 19)

    const groupResult = db.prepare(`
      INSERT INTO waybill_groups (created_at, updated_at)
      VALUES (?, ?)
    `).run(now, now)

    const groupId = groupResult.lastInsertRowid

    const insertRelation = db.prepare(`
      INSERT INTO waybill_group_relations (waybill_id, waybill_group_id, created_at, updated_at)
      VALUES (?, ?, ?, ?)
    `)

    for (const id of ids) {
      insertRelation.run(id, groupId, now, now)
    }

    db.close()
    return { waybill_group_id: groupId }

  } catch (e) {
    db.close()
    throw e
  }
})
