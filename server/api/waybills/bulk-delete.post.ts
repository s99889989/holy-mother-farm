export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const ids: number[] = body.ids ?? []

  if (!ids.length) {
    throw createError({ statusCode: 400, statusMessage: '未指定要刪除的 ID' })
  }

  const db = openDevDb()

  try {
    const placeholders = ids.map(() => '?').join(',')
    const result = db.prepare(
      `DELETE FROM waybills WHERE id IN (${placeholders}) AND state = 'not-printed'`
    ).run(...ids)

    db.close()
    return { deleted: result.changes }
  } catch (e) {
    db.close()
    throw e
  }
})
