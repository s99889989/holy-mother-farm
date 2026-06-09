import Database from 'better-sqlite3'
import { PDFDocument, rgb } from 'pdf-lib'
import fontkit from '@pdf-lib/fontkit'
import fs from 'fs'
import path from 'path'
import bwipjs from 'bwip-js'
import QRCode from 'qrcode'

// ── 座標系統 ──────────────────────────────────────────────────
// 黑貓全部用 mm，pdf-lib 用 pt（左下角為原點）
// 黑貓原點在左上角
// paper_fields 的 x,y 是「頁面絕對座標（mm）」，第二模疊印時加 rowOffset
const MM = 2.8346
const m  = (v: number) => v * MM
const PW = m(210)
const PH = m(297)

// 黑貓 mm → pdf-lib pt
// rowOffset: 第一模=0, 第二模=148（paper_rows.y 的值）
function px(x: number, bx = 0) { return m(x + bx) }
function py(y: number, rowOffset = 0, by = 0) {
  // y + rowOffset = 頁面絕對 mm（從頂部量）
  // pdf-lib 從底部量：PH - m(絕對y)
  return PH - m(y + rowOffset + by)
}

// ── 條碼/QR ──────────────────────────────────────────────────
async function bc128(text: string, hmm = 10): Promise<Buffer | null> {
  try {
    return await bwipjs.toBuffer({
      bcid: 'code128', text, scale: 2,
      height: Math.round(hmm * 3), includetext: false, backgroundcolor: 'FFFFFF'
    })
  } catch { return null }
}
async function bcI25(text: string, hmm = 10): Promise<Buffer | null> {
  try {
    const t = text.length % 2 ? '0' + text : text
    return await bwipjs.toBuffer({
      bcid: 'interleaved2of5', text: t, scale: 2,
      height: Math.round(hmm * 3), includetext: false, backgroundcolor: 'FFFFFF'
    })
  } catch { return null }
}
async function makeQR(data: string): Promise<Buffer | null> {
  try {
    const u = await QRCode.toDataURL(data, { width: 80, margin: 1 })
    return Buffer.from(u.replace('data:image/png;base64,', ''), 'base64')
  } catch { return null }
}

// ── 欄位值轉換 ────────────────────────────────────────────────
const DT: Record<string, string> = {
  '1': '13點前', '2': '14-18時', '4': '不指定',
  '5': '20-21時', '6': '13時', '7': '15時', '8': '17時', '9': '19時'
}
const PS: Record<string, string> = {
  '0001': '60cm', '0002': '90cm', '0003': '120cm', '0004': '150cm',
  '1': '60cm', '2': '90cm', '3': '120cm', '4': '150cm'
}
const TL: Record<string, string> = {
  '0001': '常溫', '1': '常溫', '0002': '冷藏', '2': '冷藏', '0003': '冷凍', '3': '冷凍'
}

function fval(col: string, w: any): string {
  const no    = String(w.tracking_no ?? '')
  const temp  = TL[String(w.temperature ?? '')] ?? ''
  const price = Number(w.price ?? 0)
  switch (col) {
    case 'tracking_no':               return no
    case 'tracking_no_dash':          return no.replace(/(\d{4})(\d{4})(\d{4})/, '$1-$2-$3')
    case 'convert_order_no':          return String(w.order_no ?? '')
    case 'send_date_dash':            return String(w.send_date ?? '')
    case 'deliver_date_dash':         return String(w.deliver_date ?? '')
    case 'deliver_date_dash_mmdd': {
      const d = String(w.deliver_date ?? '')
      return d.length >= 10 ? d.slice(5).replace('-', '/') : d
    }
    case 'deliver_time_name':         return DT[String(w.deliver_time ?? '')] ?? ''
    case 'package_size_name':         return PS[String(w.package_size ?? '')] ?? ''
    case 'production_name':           return String(w.production_name ?? '')
    case 'production_kind':           return String(w.production_kind ?? '')
    case 'order_no':                  return String(w.order_no ?? '')
    case 'comment':                   return String(w.comment ?? '')
    case 'customer_name':             return String(w.customer_name ?? '')
    case 'full_customer_name_star': {
      const n = String(w.customer_name ?? '')
      return n.length > 2 ? n[0] + '*' + n.slice(2) : n
    }
    case 'full_customer_address':     return String(w.customer_address ?? '')
    case 'full_customer_phone':       return String(w.customer_phone ?? w.customer_mobile ?? '')
    case 'full_customer_phone_star': {
      const p = String(w.customer_phone ?? w.customer_mobile ?? '')
      return p.length > 6 ? p.slice(0, 2) + '****' + p.slice(6) : p
    }
    case 'customer_postcode':
    case 'base_customer_postcode':    return String(w.customer_postcode ?? '')
    case 'sender_name':               return String(w.sender_name ?? '')
    case 'full_sender_address':       return String(w.sender_address ?? '')
    case 'full_sender_phone':         return String(w.sender_phone ?? w.sender_mobile ?? '')
    case 'webservice_login':          return String(w.sender_code ?? '')
    case 'basename':                  return String(w.customer_postcode ?? '').slice(0, 2)
    case 'price_or_not':              return price > 0 ? String(price) : '不收款'
    case 'temperature_character_one_big':
    case 'temperature_character_one': return temp[0] ?? ''
    case 'temperature_character_two_big':
    case 'temperature_character_two': return temp[1] ?? ''
    case 'price_character_one':       return price > 0 ? '代' : ''
    case 'price_character_two':       return price > 0 ? '收' : ''
    case 'price_character_three':     return price > 0 ? '款' : ''
    case 'ezcat_version':             return 'EZCATe3.7.0'
    case 'address_db_version':        return '26060901'
    default: return ''
  }
}

// ── 畫 A4 二模格線（完全移植自 paper.rb draw_image2）─────────
// bx/by = paper.x / paper.y（通常都是 0）
// rowOffset = 這一模的 paper_rows.y（第一模=0, 第二模=148）
function drawImage2(p: any, font: any, bx: number, by: number, rowOffset: number, dateLabel = '收貨日') {
  const bk = rgb(0, 0, 0)
  const lw = 0.4
  const spaced = dateLabel.split('').join(' ')

  // 原版：pdf.rectangle(x1, y1, x2, y2) → 左上角兩點（mm）
  // pdf-lib：左下角 + 寬高（pt）
  function rect(x1: number, y1: number, x2: number, y2: number) {
    p.drawRectangle({
      x: px(x1, bx),
      y: py(y2, rowOffset, by),   // y2 是下緣（數值較大）
      width: m(x2 - x1),
      height: m(y2 - y1),
      borderColor: bk,
      borderWidth: lw,
      color: undefined,
    })
  }

  // 原版：pdf.text("s", size, at:[x,y]) → y 是文字上緣（mm）
  function txt(s: string, x: number, y: number, sz: number) {
    if (!s) return
    const pt = sz
    try {
      p.drawText(s, {
        x: px(x, bx),
        y: py(y, rowOffset, by) - pt * 0.7,
        size: pt,
        font,
        color: bk,
      })
    } catch { /* 字型不支援時略過 */ }
  }

  // ═══ 黏貼聯 ═══
  txt('包裹查詢號碼', 26, 16, 7)

  rect(5, 18, 70, 67)
  txt(spaced,      5,  21, 10); rect(5,  18, 20, 24)
  txt('希望配達日',  20, 21,  8); rect(20, 18, 36, 24)
  txt('希望配達時段', 36, 21,  7); rect(36, 18, 52, 24)
  txt('發 貨 所',   53, 21, 10); rect(52, 18, 70, 24)

  rect(5, 24, 20, 29)
  rect(20, 24, 36, 29)
  rect(36, 24, 52, 29)
  rect(52, 24, 70, 29)

  rect(5, 29, 70, 42)
  rect(5, 29, 10, 42)
  txt('收', 5, 32, 10); txt('件', 5, 36, 10); txt('人', 5, 40, 10)

  rect(5, 42, 70, 55)
  rect(5, 42, 10, 55)
  txt('寄', 5, 45, 10); txt('件', 5, 49, 10); txt('人', 5, 53, 10)

  txt('品名',    5, 57, 8); rect(5,  55, 70, 67)
  txt('代收貨款', 37, 57, 8); rect(37, 55, 70, 67)
  txt('訂單編號', 5, 69, 8)

  // ═══ 顧客收執聯 ═══
  rect(5, 84, 70, 143)

  txt('託運單號', 5,  87, 9); rect(5,  84, 20, 89)
  txt(spaced,    5,  92, 10); rect(5,  89, 20, 94)
  txt('希望配達日',  20, 92, 8); rect(20, 89, 36, 94)
  txt('希望配達時段', 36, 92, 7); rect(36, 89, 52, 94)
  txt('代收貨款',   53, 92, 10); rect(52, 89, 70, 94)

  rect(5,  94, 20,  99)
  rect(20, 94, 36,  99)
  rect(36, 94, 52,  99)
  rect(52, 94, 70,  99)

  rect(5, 99, 70, 113)
  rect(5, 99, 10, 113)
  txt('收', 5, 102, 10); txt('件', 5, 106, 10); txt('人', 5, 110, 10)

  rect(5, 113, 70, 127)
  rect(5, 113, 10, 127)
  txt('寄', 5, 116, 10); txt('件', 5, 120, 10); txt('人', 5, 124, 10)

  txt('訂單編號', 5, 130, 8); rect(5, 127, 70, 134)
  txt('品名',    5, 136, 8)

  // ═══ 配送聯右側 ═══
  txt('希 望 配 達 日', 171, 10, 8); rect(171,  7, 191, 12)
  rect(171, 12, 191, 19)
  txt('希望配達時段', 171, 22, 8);   rect(171, 19, 191, 24)
  rect(171, 24, 191, 30)
  txt('尺           寸', 172, 33, 9); rect(171, 30, 191, 35)
  rect(171, 35, 191, 41)

  // ═══ 配送聯主區 ═══
  rect(75, 19, 171, 35)
  rect(75, 19,  80, 35)
  txt('收', 75, 22, 10); txt('件', 75, 26, 10); txt('人', 75, 30, 10)

  rect(75, 35, 171, 45)
  rect(75, 35,  80, 45)
  txt('寄', 75, 37, 8); txt('件', 75, 40, 8); txt('人', 75, 43, 8)

  rect(75, 45, 171, 50); rect(75, 45, 82, 50)
  txt('備註', 75, 48, 8)

  rect(75, 50, 171, 55); rect(75, 50, 82, 55)
  txt('品名', 75, 53, 8)

  rect(75, 55, 171, 60); rect(75, 55, 88, 60)
  txt('訂單編號', 75, 58, 8)

  txt(`${dateLabel}:`, 140, 62, 8)
  txt('客代', 75, 62, 8)
  txt('單號', 75, 66, 8)

  rect(140, 64, 191, 81); rect(140, 64, 145, 81)
  txt('代', 140, 67, 8); txt('收', 140, 71, 8)
  txt('貨', 140, 75, 8); txt('款', 140, 79, 8)

  rect(165, 64, 170, 81)
  txt('收', 165, 67, 8); txt('件', 165, 70, 8); txt('人', 165, 73, 8)
  txt('簽', 165, 76, 8); txt('名', 165, 79, 8)

  // 郵碼版本效期
  txt('此郵碼版本適用於', 194, 40, 5)
  txt('06/01', 192, 72, 8)
  txt('至',    194, 75, 8)
  txt('06/30', 192, 79, 8)

  // ═══ 會計聯 ═══
  rect(75, 84, 175, 119)

  txt('希望配達日',   175, 87, 8); rect(175, 84, 191,  89)
  rect(175, 89, 191, 96)
  txt('希望配達時段', 175, 99, 7); rect(175, 96, 191, 101)
  rect(175, 96, 191, 114)
  txt('尺          寸', 175, 112, 9); rect(175, 109, 191, 114)
  rect(175, 114, 191, 119)

  txt(spaced,    75,  87, 10); rect(75,  84,  90,  89)
  txt('發 貨 所', 119, 87, 10); rect(119, 84, 133,  89)

  txt('收件人', 75,  92, 9); rect(75,  89, 119, 109)
  txt('寄件人', 119, 92, 9); rect(119, 89, 175, 109)

  txt('訂單編號', 75, 111, 9); rect(75,  109, 175, 114)
  txt('品名',    75, 116, 9); rect(75,  114, 175, 119)

  txt('客代', 75, 122, 8)
  txt('單號', 75, 126, 8)

  rect(135, 120, 155, 143); rect(135, 120, 155, 124)
  txt('代收貨款', 137, 122, 10)

  rect(155, 120, 171, 143); rect(155, 120, 171, 124)
  txt('寄件人簽名', 155, 122, 8)
}

// ── 資料疊印 ─────────────────────────────────────────────────
async function drawData(
  p: any, doc: PDFDocument, font: any,
  w: any, fields: any[],
  bx: number, by: number, rowOffset: number,
  pub: string
) {
  const embedPng = async (file: string) => {
    try {
      const fp = path.join(pub, 'images', 'papers', file)
      if (!fs.existsSync(fp)) return null
      return await doc.embedPng(fs.readFileSync(fp))
    } catch { return null }
  }

  for (const f of fields) {
    const fx  = Number(f.x  ?? 0)
    const fy  = Number(f.y  ?? 0)
    const fw  = Number(f.width  || 0)
    const fh  = Number(f.height || 0)
    const sz  = Number(f.font_size || 10)
    const col = String(f.column_name ?? '')
    const isB    = f.is_barcode    === 't' || f.is_barcode    === 1
    const isB128 = f.is_barcode128 === 't' || f.is_barcode128 === 1

    // ── 圖片浮水印 ──
    if (['tempcold_tag', 'recpay', 'insurance_tag', 'collect_tag', 'addprice_postcode_mark'].includes(col)) {
      let file = ''
      const t = String(w.temperature ?? '')
      if (col === 'tempcold_tag') {
        if      (t === '0001' || t === '1') file = 'normal.png'
        else if (t === '0002' || t === '2') file = 'tempcold.png'
        else if (t === '0003' || t === '3') file = 'tempfreezer.png'
      } else if (col === 'recpay'        && w.waybilltype === 'N')       file = 'delivepay.png'
      else if   (col === 'insurance_tag' && Number(w.insurance ?? 0) > 0) file = 'insurance.png'
      else if   (col === 'collect_tag'   && Number(w.price     ?? 0) > 0) file = 'collect.png'
      if (file) {
        const img = await embedPng(file)
        if (img) {
          const iw = fw > 0 ? m(fw) : m(13)
          const ih = fh > 0 ? m(fh) : m(24)
          p.drawImage(img, {
            x: px(fx, bx),
            y: py(fy + (fh || 24), rowOffset, by),
            width: iw, height: ih,
          })
        }
      }
      continue
    }

    // ── QR code ──
    if (col === 'qrcode') {
      const dd = String(w.deliver_date ?? '').replace(/[\/\-]/g, '')
      const tn = (String(w.temperature  ?? '1').replace(/^0+/, '') || '1').padStart(2, '0')
      const ps = (String(w.package_size ?? '2').replace(/^0+/, '') || '2').padStart(2, '0')
      const dt = String(w.deliver_time  ?? '4').padStart(2, '0')
      const qd = `tracking_number=${w.tracking_no}&customer_id=${w.sender_code}&product_price=${w.price ?? 0}&temperature=${tn}&package_size=${ps}&receiver_suda5=${w.customer_postcode ?? ''}&delivery_date=${dd}&delivery_timezone=${dt}`
      const buf = await makeQR(qd)
      if (buf) {
        const img = await doc.embedPng(buf)
        const s = fw > 0 ? m(fw) : m(18)
        p.drawImage(img, {
          x: px(fx, bx),
          y: py(fy + (fw || 18), rowOffset, by),
          width: s, height: s,
        })
      }
      continue
    }

    // ── 條碼 ──
    if (isB || isB128) {
      const v = fval(col, w); if (!v) continue
      const bh  = fh > 0 ? fh : 10
      const bw2 = fw > 0 ? m(fw) : m(50)
      const buf = col === 'base_customer_postcode_barcode'
        ? await bcI25('+' + v, bh)
        : await bc128(v, bh)
      if (buf) {
        const img = await doc.embedPng(buf)
        p.drawImage(img, {
          x: px(fx, bx),
          y: py(fy + bh, rowOffset, by),
          width: bw2, height: m(bh),
        })
      }
      continue
    }

    // ── 文字 ──
    const v = fval(col, w); if (!v) continue
    const pt = Math.max(sz, 5)
    try {
      p.drawText(v, {
        x: px(fx, bx),
        y: py(fy, rowOffset, by) - pt * 0.7,
        size: pt,
        font,
        color: rgb(0, 0, 0),
        maxWidth: fw > 0 ? m(fw) : undefined,
      })
    } catch { /* 略過無法繪製的字元 */ }
  }
}

// ── 主 handler ───────────────────────────────────────────────
export default defineEventHandler(async (event) => {
  const body     = await readBody(event)
  const ids:     number[] = body.ids ?? []
  const paperId: number   = Number(body.paper_id ?? 2)  // 預設 A4 二模常溫
  if (!ids.length) throw createError({ statusCode: 400, statusMessage: '未指定託運單' })

  // 讀取託運單
  const db = new Database('C:/ezCat/app/db/development.sqlite3', { readonly: true })
  let waybills: any[]
  try {
    const ph = ids.map(() => '?').join(',')
    waybills = db.prepare(`
      SELECT id, tracking_no, order_no, send_date, deliver_date,
             sender_code, sender_name, sender_phone, sender_mobile, sender_address, sender_postcode,
             customer_name, customer_phone, customer_mobile, customer_address, customer_postcode,
             production_kind, production_name, price, insurance,
             deliver_time, temperature, package_size, breakable, precision_instrument,
             waybilltype, comment
      FROM waybills WHERE id IN (${ph}) ORDER BY id
    `).all(...ids) as any[]
  } finally { db.close() }

  // 讀取 paper 設定
  const pdb = new Database('C:/ezCat/app/db/paper.sqlite3', { readonly: true })
  let fields: any[], paper: any, prows: any[]
  try {
    paper  = pdb.prepare('SELECT * FROM papers WHERE id = ?').get(paperId) as any
    fields = pdb.prepare('SELECT * FROM paper_fields WHERE paper_id = ? ORDER BY id').all(paperId) as any[]
    prows  = pdb.prepare('SELECT * FROM paper_rows   WHERE paper_id = ? ORDER BY id').all(paperId) as any[]
  } finally { pdb.close() }

  const pub = path.join(process.cwd(), 'public')
  const doc = await PDFDocument.create()
  doc.registerFontkit(fontkit)
  const font = await doc.embedFont(fs.readFileSync(path.join(pub, 'fonts', 'kaiu.ttf')))

  // paper.x / paper.y → 全頁偏移（通常 0）
  const bx = Number(paper?.x ?? 0)
  const by = Number(paper?.y ?? 0)

  const perPage = prows.length || 2

  for (let i = 0; i < waybills.length; i += perPage) {
    const page = doc.addPage([PW, PH])

    // 分頁虛線
    if (perPage > 1) {
      const mid = PH / 2
      page.drawLine({
        start: { x: 0, y: mid }, end: { x: PW, y: mid },
        thickness: 0.3, color: rgb(0.6, 0.6, 0.6), dashArray: [3, 3],
      })
    }

    for (let r = 0; r < perPage; r++) {
      const w = waybills[i + r]
      if (!w) continue

      // rowOffset = paper_rows[r].y（第一模=0, 第二模=148）
      const rowOffset = Number(prows[r]?.y ?? 0)

      // 畫格線（paper_id 2/3/10 = A4 二模）
      if ([2, 3, 10].includes(paperId)) {
        drawImage2(page, font, bx, by, rowOffset)
      }

      // 疊印資料
      await drawData(page, doc, font, w, fields, bx, by, rowOffset, pub)
    }
  }

  const bytes = await doc.save()
  return new Response(Buffer.from(bytes), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="waybills_${Date.now()}.pdf"`,
    },
  })
})
