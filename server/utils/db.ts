import Database from 'better-sqlite3'

const DEV_DB   = 'C:/ezCat/app/db/development.sqlite3'
const PAPER_DB = 'C:/ezCat/app/db/paper.sqlite3'

export function openDevDb(readonly = false) {
  return new Database(DEV_DB, { readonly })
}

export function openPaperDb(readonly = false) {
  return new Database(PAPER_DB, { readonly })
}
