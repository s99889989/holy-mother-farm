import { readdir, readFile, writeFile } from 'fs/promises'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import iconv from 'iconv-lite'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')
const posDir = join(root, 'public', 'file', 'pos-data')
const outFile = join(root, 'public', 'file', 'pos-data.json')

function decodeBig5(latin1Str) {
  return iconv.decode(Buffer.from(latin1Str, 'latin1'), 'big5')
}

function normalizeItemName(name) {
  const pattern = /（[^）]*[折%價]）$|\([^)]*[折%價]\)$/
  let prev = '', result = name.trim()
  while (result !== prev) { prev = result; result = result.replace(pattern, '').trim() }
  return result
}

function parsePosFile(latin1Text, filename) {
  const lines = latin1Text.split('\n')
  const invoiceMap = {}
  const dateMatch = filename.match(/InvD(\d{4})(\d{2})(\d{2})/)
  const fileDate = dateMatch ? `${dateMatch[1]}/${dateMatch[2]}/${dateMatch[3]}` : null

  for (const line of lines) {
    if (!line.trim() || line.startsWith('OPDate')) continue
    const cols = line.split(',').map(c => c.trim().replace(/^'|'$/g, ''))
    if (cols.length < 9) continue

    const [, invNo, listNoStr, lineType, lineText, , , storeId, fileDateTime] = cols
    const listNo = parseInt(listNoStr)

    if (!invoiceMap[invNo]) {
      const dtMatch = fileDateTime.match(/(\d{4}\/\d{2}\/\d{2}) (\d{2}:\d{2}:\d{2})/)
      invoiceMap[invNo] = {
        invNo,
        storeId: decodeBig5(storeId),
        date: fileDate || (dtMatch ? dtMatch[1] : ''),
        time: dtMatch ? dtMatch[2] : '',
        amt: 0,
        items: []
      }
    }

    const inv = invoiceMap[invNo]
    if (lineType === 'InvAmt') {
      inv.amt = parseInt(lineText) || 0
    } else if (listNo > 0 && lineType === '') {
      const decoded = decodeBig5(lineText)
      const parts = decoded.split(':')
      if (parts.length >= 5) {
        const name = normalizeItemName(parts[0])
        const qty = parseFloat(parts[1]) || 0
        const price = parseFloat(parts[2]) || 0
        const subtotal = parseFloat(parts[4]) || 0
        if (name && !name.startsWith('應稅') && subtotal > 0) {
          inv.items.push({ name, qty, price, subtotal })
        }
      }
    }
  }
  return Object.values(invoiceMap).filter(inv => inv.amt > 0)
}

async function main() {
  const files = (await readdir(posDir)).filter(f => f.endsWith('.txt')).sort()
  console.log(`找到 ${files.length} 個檔案，開始轉換...`)
  const allInvoices = []
  for (const filename of files) {
    const buf = await readFile(join(posDir, filename))
    const invs = parsePosFile(buf.toString('latin1'), filename)
    allInvoices.push(...invs)
    console.log(`  ✓ ${filename} → ${invs.length} 筆`)
  }
  await writeFile(outFile, JSON.stringify(allInvoices), 'utf8')
  console.log(`\n完成！共 ${allInvoices.length} 筆，輸出至 public/file/pos-data.json`)
}

main().catch(console.error)
