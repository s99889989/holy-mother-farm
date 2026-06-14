/**
 * GET /api/meta?type=papers
 * GET /api/meta?type=productnames
 * GET /api/meta?type=senders
 * GET /api/meta?type=accounts
 *
 * 取代原本四支獨立的 get 檔案：
 *   papers.get.ts / productnames.get.ts / senders.get.ts / webservice-accounts.get.ts
 */
export default defineEventHandler((event) => {
  const { type } = getQuery(event)

  switch (type) {
    case 'papers': {
      const db = openPaperDb(true)
      const rows = db.prepare(`
        SELECT id, name FROM papers
        WHERE id NOT IN (13, 14, 15, 16)
        ORDER BY name
      `).all()
      db.close()
      return rows
    }

    case 'productnames': {
      const db = openDevDb(true)
      const rows = db.prepare(
        `SELECT id, product_id, product_name FROM productnames ORDER BY product_name`
      ).all()
      db.close()
      return rows
    }

    case 'senders': {
      const db = openDevDb(true)
      const rows = db.prepare(
        `SELECT id, name, address, phone, mobile, code, postcode FROM senders`
      ).all()
      db.close()
      return rows
    }

    case 'accounts': {
      const db = openDevDb(true)
      const rows = db.prepare(
        `SELECT id, login, name, default_account FROM webservice_accounts ORDER BY login`
      ).all()
      db.close()
      return rows
    }

    default:
      throw createError({ statusCode: 400, statusMessage: `未知的 type：${type}` })
  }
})
