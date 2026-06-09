import Database from 'better-sqlite3'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const ids: number[] = body.ids ?? []

  if (!ids.length) {
    throw createError({ statusCode: 400, statusMessage: '未指定託運單' })
  }

  const db = new Database('C:/ezCat/app/db/development.sqlite3')

  try {
    const now = new Date().toISOString().replace('T', ' ').substring(0, 19)

    // 1. 建立 waybill_group
    const groupResult = db.prepare(`
      INSERT INTO waybill_groups (created_at, updated_at)
      VALUES (?, ?)
    `).run(now, now)

    const groupId = groupResult.lastInsertRowid

    // 2. 建立 waybill_group_relations
    const insertRelation = db.prepare(`
      INSERT INTO waybill_group_relations (waybill_id, waybill_group_id, created_at, updated_at)
      VALUES (?, ?, ?, ?)
    `)

    for (const id of ids) {
      insertRelation.run(id, groupId, now, now)
    }

    // 3. 更新 waybills state 為 printed（可選）
    // const placeholders = ids.map(() => '?').join(',')
    // db.prepare(`UPDATE waybills SET state = 'printed', updated_at = ? WHERE id IN (${placeholders})`).run(now, ...ids)

    db.close()
    return { waybill_group_id: groupId }

  } catch (e) {
    db.close()
    throw e
  }
})
