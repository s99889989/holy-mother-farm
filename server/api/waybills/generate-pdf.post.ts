import { PDFDocument, rgb } from 'pdf-lib'
import fontkit from '@pdf-lib/fontkit'
import fs from 'fs'
import path from 'path'
import QRCode from 'qrcode'

// ── 全域樣式設定 ─────────────────────────────────────────────
const BORDER_WIDTH = 0.6   // ← 框線粗細（pt），黑貓原廠約 0.4
                           //   調粗用 0.6~0.8，調細用 0.2~0.3

// ── 座標系統 ──────────────────────────────────────────────────
// 黑貓全部用 mm，pdf-lib 用 pt（左下角為原點）
// 黑貓原點在左上角
// paper_fields 的 x,y 是「頁面絕對座標（mm）」，第二模疊印時加 rowOffset
const MM = 2.8346
const m = (v: number) => v * MM
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

// ── 向量條碼（bwip-js SVG → pdf-lib 矩形，完全向量，等同黑貓原廠品質）────
// bwip-js toSVG() 輸出 <path stroke-width="N" d="Mx H Lx 0 ..."> 格式
// 每條線的中心 x = cx，寬度 = stroke-width（SVG 單位）
// 轉換：按比例縮放到 PDF 目標寬高，直接畫 drawRectangle
import bwipjs from 'bwip-js'

// barScale: 條的粗細係數，1.0 = 原始寬度，0.8 = 細 20%，1.2 = 粗 20%
// 條變細時中心位置不變，左右各縮，間距自動增加、不會重疊
const BAR_SCALE = 0.75  // ← 在這裡調整，0.6~1.0 之間

function drawBarcodeSVG(
    page: any,
    svgStr: string,
    x0: number, y0: number,
    targetW: number, targetH: number,
    barScale = BAR_SCALE
) {
  const vbMatch = svgStr.match(/viewBox="0 0 ([\d.]+) ([\d.]+)"/)
  if (!vbMatch) return
  const svgW = parseFloat(vbMatch[1])
  const scaleX = targetW / svgW
  const black = rgb(0, 0, 0)

  const pathRe = /<path stroke="#000000" stroke-width="([\d.]+)" d="([^"]+)"[^>]*\/>/g
  let match: RegExpExecArray | null
  while ((match = pathRe.exec(svgStr)) !== null) {
    const sw = parseFloat(match[1])
    const d  = match[2]
    // 每個片段: M{cx} {h} L{cx} 0
    const coordRe = /M([\d.]+) [\d.]+L[\d.]+ [\d.]+/g
    let cm: RegExpExecArray | null
    while ((cm = coordRe.exec(d)) !== null) {
      const cx = parseFloat(cm[1])
      const bw = sw * scaleX * barScale          // 套用粗細係數
      const bx = x0 + cx * scaleX - bw / 2      // 中心對齊
      page.drawRectangle({ x: bx, y: y0, width: bw, height: targetH, color: black, borderWidth: 0 })
    }
  }
}

async function bc128svg(text: string): Promise<string | null> {
  try {
    // code39ext 支援完整 ASCII；純數字用 code39 即可
    return await bwipjs.toSVG({ bcid: 'code39', text, scale: 2, height: 10, includetext: false })
  } catch { return null }
}

async function bcI25svg(text: string): Promise<string | null> {
  try {
    const t = text.length % 2 ? '0' + text : text
    return await bwipjs.toSVG({ bcid: 'interleaved2of5', text: t, scale: 2, height: 10, includetext: false })
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
  1: '13點前', 2: '14-18時', 4: '不指定',
  5: '20-21時', 6: '13時', 7: '15時', 8: '17時', 9: '19時'
}
const PS: Record<string, string> = {
  '0001': '60cm', '0002': '90cm', '0003': '120cm', '0004': '150cm',
  '1': '60cm', '2': '90cm', '3': '120cm', '4': '150cm'
}
const TL: Record<string, string> = {
  '0001': '常溫', '1': '常溫', '0002': '冷藏', '2': '冷藏', '0003': '冷凍', '3': '冷凍'
}

function fval(col: string, w: any): string {
  const no = String(w.tracking_no ?? '')
  const temp = TL[String(w.temperature ?? '')] ?? ''
  const price = Number(w.price ?? 0)
  switch (col) {
    case 'tracking_no': return no
    case 'tracking_no_dash': return no.replace(/(\d{4})(\d{4})(\d{4})/, '$1-$2-$3')
    case 'convert_order_no': return String(w.order_no ?? '')
    case 'send_date_dash': return String(w.send_date ?? '')
    case 'deliver_date_dash': return String(w.deliver_date ?? '')
    case 'deliver_date_dash_mmdd': {
      const d = String(w.deliver_date ?? '')
      return d.length >= 10 ? d.slice(5).replace('-', '/') : d
    }
    case 'deliver_time_name': return DT[String(w.deliver_time ?? '')] ?? ''
    case 'package_size_name': return PS[String(w.package_size ?? '')] ?? ''
    case 'production_name': return String(w.production_name ?? '')
    case 'production_kind': return String(w.production_kind ?? '')
    case 'order_no': return String(w.order_no ?? '')
    case 'comment': return String(w.comment ?? '')
    case 'customer_name': return String(w.customer_name ?? '')
    case 'full_customer_name_star': {
      const n = String(w.customer_name ?? '')
      return n.length > 2 ? n[0] + '*' + n.slice(2) : n
    }
    case 'full_customer_address': return String(w.customer_address ?? '')
    case 'full_customer_phone': return String(w.customer_phone ?? w.customer_mobile ?? '')
    case 'full_customer_phone_star': {
      const p = String(w.customer_phone ?? w.customer_mobile ?? '')
      if (p.length <= 6) return p
      const clean = p.replace(/-/g, '')
      // 手機（10碼，0XXX開頭）：0980-****-1898
      if (/^09\d{8}$/.test(clean)) return clean.slice(0, 4) + '-****-' + clean.slice(-4)
      // 固話（07-XXXXXXX 等）：07****9968
      return p.slice(0, 2) + '****' + p.slice(6)
    }
    case 'customer_postcode':
    case 'base_customer_postcode': return String(w.customer_postcode ?? '')
    case 'sender_name': return String(w.sender_name ?? '')
    case 'full_sender_address': return String(w.sender_address ?? '')
    case 'full_sender_phone': return String(w.sender_phone ?? w.sender_mobile ?? '')
    case 'webservice_login': return String(w.sender_code ?? '')
    case 'basename': return String(w.customer_postcode ?? '').slice(0, 2)
    case 'price_or_not': return price > 0 ? String(price) : '不收款'
    case 'temperature_character_one_big':
    case 'temperature_character_one': return temp[0] ?? ''
    case 'temperature_character_two_big':
    case 'temperature_character_two': return temp[1] ?? ''
    case 'price_character_one': return price > 0 ? '代' : ''
    case 'price_character_two': return price > 0 ? '收' : ''
    case 'price_character_three': return price > 0 ? '款' : ''
    case 'ezcat_version': return 'EZCATe3.7.0'
    case 'address_db_version': {
      // 郵遞區號DB版本：YYMMDD01（今日日期）
      const now = new Date()
      const yy = String(now.getFullYear()).slice(-2)
      const mm = String(now.getMonth() + 1).padStart(2, '0')
      const dd = String(now.getDate()).padStart(2, '0')
      return `${yy}${mm}${dd}01`
    }
    default: return ''
  }
}

// ── 畫 A4 二模格線（完全移植自 paper.rb draw_image2）─────────
// bx/by = paper.x / paper.y（通常都是 0）
// rowOffset = 這一模的 paper_rows.y（第一模=0, 第二模=148）
function drawImage2(p: any, font: any, bx: number, by: number, rowOffset: number, dateLabel = '收貨日') {
  // 郵碼版本效期：當月第一天 ~ 最後一天
  const now = new Date()
  const firstDay = `${String(now.getMonth() + 1).padStart(2, '0')}/01`
  const lastDay = `${String(now.getMonth() + 1).padStart(2, '0')}/${new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()}`
  const bk = rgb(0, 0, 0)
  const lw = BORDER_WIDTH
  const spaced = dateLabel.split('').join(' ')

  // 原版：pdf.rectangle(x1, y1, x2, y2) → 左上角兩點（mm）
  // pdf-lib：左下角 + 寬高（pt）
  function rect(x1: number, y1: number, x2: number, y2: number) {
    p.drawRectangle({
      x: px(x1, bx),
      y: py(y2, rowOffset, by), // y2 是下緣（數值較大）
      width: m(x2 - x1),
      height: m(y2 - y1),
      borderColor: bk,
      borderWidth: lw,
      color: undefined
    })
  }

  // 原版：pdf.text("s", size, at:[x,y]) → y 是文字上緣（mm）
  function txt(s: string, x: number, y: number, sz: number) {
    if (!s) return
    const pt = sz
    try {
      p.drawText(s, {
        x: px(x, bx),
        y: py(y, rowOffset, by) - pt * 1.3,
        size: pt,
        font,
        color: bk
      })
    } catch { /* 字型不支援時略過 */ }
  }

  // ═══ 黏貼聯 ═══
  txt('包裹查詢號碼', 27, 13.5, 7)

  rect(5, 18, 70, 67)
  txt(spaced, 6, 17.5, 10); rect(5, 18, 20, 24)
  txt('希望配達日', 21, 18, 8); rect(20, 18, 36, 24)
  txt('希望配達時段', 37, 18.1, 7); rect(36, 18, 52, 24)
  txt('發 貨 所', 54, 17.4, 10); rect(52, 18, 70, 24)

  rect(5, 24, 20, 29)
  rect(20, 24, 36, 29)
  rect(36, 24, 52, 29)
  rect(52, 24, 70, 29)

  rect(5, 29, 70, 42)
  rect(5, 29, 10, 42)
  txt('收', 6, 28.1, 10); txt('件', 6, 32.1, 10); txt('人', 6, 36.1, 10)

  rect(5, 42, 70, 55)
  rect(5, 42, 10, 55)
  txt('寄', 6, 41, 10); txt('件', 6, 45, 10); txt('人', 6, 49, 10)

  txt('品名', 6, 54, 8); rect(5, 55, 70, 67)
  txt('代收貨款', 38, 54, 8); rect(37, 55, 70, 67)
  txt('訂單編號', 6, 65.9, 8)

  // ═══ 顧客收執聯 ═══
  rect(5, 84, 70, 143)

  txt('託運單號', 6, 83.9, 9); rect(5, 84, 20, 89)
  txt(spaced, 6, 88, 10); rect(5, 89, 20, 94)
  txt('希望配達日', 20.8, 89.2, 8); rect(20, 89, 36, 94)
  txt('希望配達時段', 37, 89, 7); rect(36, 89, 52, 94)
  txt('代收貨款', 54, 88, 10); rect(52, 89, 70, 94)

  rect(5, 94, 20, 99)
  rect(20, 94, 36, 99)
  rect(36, 94, 52, 99)
  rect(52, 94, 70, 99)

  rect(5, 99, 70, 113)
  rect(5, 99, 10, 113)
  txt('收', 6, 99, 10); txt('件', 6, 103, 10); txt('人', 6, 107, 10)

  rect(5, 113, 70, 127)
  rect(5, 113, 10, 127)
  txt('寄', 6, 113, 10); txt('件', 6, 117, 10); txt('人', 6, 121, 10)

  txt('訂單編號', 6, 127.3, 8); rect(5, 127, 70, 134)
  txt('品名', 6, 133.3, 8)

  // ═══ 配送聯右側 ═══
  txt('希 望 配 達 日', 172.5, 7, 8); rect(171, 7, 191, 12)
  rect(171, 12, 191, 19)
  txt('希望配達時段', 172.5, 19, 8); rect(171, 19, 191, 24)
  rect(171, 24, 191, 30)
  txt('尺           寸', 173, 29.2, 9); rect(171, 30, 191, 35)
  rect(171, 35, 191, 41)

  // ═══ 配送聯主區 ═══
  rect(75, 19, 171, 35)
  rect(75, 19, 80, 35)
  txt('收', 76, 20, 10); txt('件', 76, 24, 10); txt('人', 76, 28, 10)

  rect(75, 35, 171, 45)
  rect(75, 35, 80, 45)
  txt('寄', 76, 34.5, 8); txt('件', 76, 37.5, 8); txt('人', 76, 40.5, 8)

  rect(75, 45, 171, 50); rect(75, 45, 82, 50)
  txt('備註', 76, 44.5, 8)

  rect(75, 50, 171, 55); rect(75, 50, 82, 55)
  txt('品名', 76, 50, 8)

  rect(75, 55, 171, 60); rect(75, 55, 88, 60)
  txt('訂單編號', 76, 55, 8)

  txt(`${dateLabel}:`, 141, 59, 8)
  txt('客代', 76, 59, 8)
  txt('單號', 76, 63, 8)

  rect(140, 64, 191, 81); rect(140, 64, 145, 81)
  txt('代', 141, 64, 8); txt('收', 141, 68, 8)
  txt('貨', 141, 72, 8); txt('款', 141, 76, 8)

  rect(165, 64, 170, 81)
  txt('收', 166, 64, 8); txt('件', 166, 67, 8); txt('人', 166, 70, 8)
  txt('簽', 166, 73, 8); txt('名', 166, 76, 8)

  // 郵碼版本效期
  const ux = 195
  txt('此', ux, 36, 10); txt('郵', ux, 40, 10); txt('碼', ux, 44, 10)
  txt('版', ux, 48, 10); txt('本', ux, 52, 10); txt('適', ux, 56, 10)
  txt('用', ux, 60, 10); txt('於', ux, 64, 10)
  txt(firstDay, 193, 68.2, 10)
  txt('至', ux, 72, 10)
  txt(lastDay, 193, 76, 10)

  // ═══ 會計聯 ═══
  rect(75, 84, 175, 119)

  txt('希望配達日', 176, 83.9, 8); rect(175, 84, 191, 89)
  rect(175, 89, 191, 96)
  txt('希望配達時段', 175.8, 96, 7); rect(175, 96, 191, 101)
  rect(175, 96, 191, 114)
  txt('尺          寸', 176, 108.2, 9); rect(175, 109, 191, 114)
  rect(175, 114, 191, 119)

  txt(spaced, 76, 83, 10); rect(75, 84, 90, 89)
  txt('發 貨 所', 119.8, 83, 10); rect(119, 84, 133, 89)

  txt('收件人', 76, 88.2, 9); rect(75, 89, 119, 109)
  txt('寄件人', 120, 88.2, 9); rect(119, 89, 175, 109)

  txt('訂單編號', 76, 108.2, 9); rect(75, 109, 175, 114)
  txt('品名', 76, 113.2, 9); rect(75, 114, 175, 119)

  txt('客代', 76, 119, 8)
  txt('單號', 76, 123, 8)

  rect(135, 120, 155, 143); rect(135, 120, 155, 124)
  txt('代收貨款', 137, 118.9, 10)

  rect(155, 120, 171, 143); rect(155, 120, 171, 124)
  txt('寄件人簽名', 156, 119.2, 8)
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
    const fx = Number(f.x ?? 0)
    const fy = Number(f.y ?? 0)
    const fw = Number(f.width || 0)
    const fh = Number(f.height || 0)
    const sz = Number(f.font_size || 10)
    const col = String(f.column_name ?? '')
    const isB = f.is_barcode === 't' || f.is_barcode === 1
    const isB128 = f.is_barcode128 === 't' || f.is_barcode128 === 1

    // ── 圖片浮水印 ──
    if (['tempcold_tag', 'recpay', 'insurance_tag', 'collect_tag', 'addprice_postcode_mark'].includes(col)) {
      let file = ''
      const t = String(w.temperature ?? '')
      if (col === 'tempcold_tag') {
        if (t === '0001' || t === '1') file = 'normal.png'
        else if (t === '0002' || t === '2') file = 'tempcold.png'
        else if (t === '0003' || t === '3') file = 'tempfreezer.png'
      } else if (col === 'recpay' && w.waybilltype === 'N') file = 'delivepay.png'
      else if (col === 'insurance_tag' && Number(w.insurance ?? 0) > 0) file = 'insurance.png'
      else if (col === 'collect_tag' && Number(w.price ?? 0) > 0) file = 'collect.png'
      if (file) {
        const img = await embedPng(file)
        if (img) {
          const iw = fw > 0 ? m(fw) : m(13)
          const ih = fh > 0 ? m(fh) : m(24)
          p.drawImage(img, {
            x: px(fx, bx),
            y: py(fy + (fh || 24), rowOffset, by),
            width: iw, height: ih
          })
        }
      }
      continue
    }

    // ── QR code ──
    if (col === 'qrcode') {
      const dd = String(w.deliver_date ?? '').replace(/[\/\-]/g, '')
      const tn = (String(w.temperature ?? '1').replace(/^0+/, '') || '1').padStart(2, '0')
      const ps = (String(w.package_size ?? '2').replace(/^0+/, '') || '2').padStart(2, '0')
      const dt = String(w.deliver_time ?? '4').padStart(2, '0')
      // 黑貓 QRCode 格式（pipe-separated）：
      // 01|{tracking_no}|10|{order_no+00}|{waybilltype}|0|{deliver_time}|{temperature}||{customer_postcode}|{deliver_date}|{package_size}||0|||||||||||
      const wt = String(w.waybilltype)
      const on = String(w.sender_code ?? '').padEnd(10, '0')
      const pc = String(w.customer_postcode ?? '')
      const qd = `01|${w.tracking_no}|10|${on}00|${wt}|0|${dt}|${tn}||${pc}|${dd}|${ps}||0|||||||||||`
      const buf = await makeQR(qd)
      if (buf) {
        const img = await doc.embedPng(buf)
        const s = fw > 0 ? m(fw) : m(18)
        p.drawImage(img, {
          x: px(fx, bx),
          y: py(fy + (fw || 18), rowOffset, by),
          width: s, height: s
        })
      }
      continue
    }

    // ── 條碼（bwip-js SVG → pdf-lib 向量矩形，等同黑貓原廠品質）──
    if (isB || isB128) {
      const bv = fval(col, w); if (!bv) continue
      const bh  = fh > 0 ? fh : 10
      const bw2 = fw > 0 ? m(fw) : m(50)
      const bx0 = px(fx, bx)
      const by0 = py(fy - 10 + bh, rowOffset, by)
      const svg = col === 'base_customer_postcode_barcode'
          ? await bcI25svg(bv)
          : await bc128svg(bv)
      if (svg) drawBarcodeSVG(p, svg, bx0, by0, bw2, m(bh))
      continue
    }


    // ── 文字 ──
    const v = fval(col, w); if (!v) continue
    // ── 欄位字體大小微調表 ──────────────────────────────────────
    // 4個區塊各自設定，正數=放大、負數=縮小（單位 pt），0=維持 DB 設定值
    // 基準：所有欄位預設 size = DB font_size - 2
    // 區塊判定：左(x<72) / 右(x>=72)，上模(rowOffset=0) / 下模(rowOffset>0)
    // key 格式：'區塊:欄位名'，找不到時 fallback 到 '欄位名'
    type ZoneKey = string
    const zone = (fx < 72 ? 'L' : 'R') + (rowOffset > 0 ? 'B' : 'T')
    // zone = 'LT'=左上黏貼聯  'RT'=右上配送聯  'LB'=左下收據聯  'RB'=右下配送聯下半

    const FONT_ADJUST: Record<ZoneKey, number> = {
      // ════════════════════════════════════════════
      // LT：左上 黏貼聯
      // ════════════════════════════════════════════
      'LT:send_date_dash':               0,  // 收貨日
      'LT:deliver_date_dash':            0,  // 希望配達日
      'LT:deliver_time_name':            0,  // 希望配達時段
      'LT:tracking_no':                  0,  // 託運單號
      'LT:tracking_no_dash':             0,  // 託運單號（dash）
      'LT:convert_order_no':             0,  // 客代單號
      'LT:order_no':                     0,  // 訂單編號
      'LT:customer_name':                0,  // 收件人姓名
      'LT:full_customer_name_star':      0,  // 收件人姓名（遮碼）
      'LT:full_customer_address':        0,  // 收件人地址
      'LT:full_customer_phone':          0,  // 收件人電話
      'LT:full_customer_phone_star':     0,  // 收件人電話（遮碼）
      'LT:customer_postcode':            0,  // 郵遞區號
      'LT:base_customer_postcode':        0,  // 郵遞區號（地址前）
      'LT:basename':                     0,  // 郵遞區號前2碼
      'LT:sender_name':                  0,  // 寄件人姓名
      'LT:full_sender_address':          0,  // 寄件人地址
      'LT:full_sender_phone':            0,  // 寄件人電話
      'LT:production_name':              0,  // 品名
      'LT:production_kind':              0,  // 品名種類
      'LT:price_or_not':                 0,  // 代收貨款

      // ════════════════════════════════════════════
      // RT：右上 配送聯
      // ════════════════════════════════════════════
      'RT:send_date_dash':               0,  // 收貨日
      'RT:deliver_date_dash':            0,  // 希望配達日
      'RT:deliver_date_dash_mmdd':       0,  // 希望配達日（MM/DD）
      'RT:deliver_time_name':            0,  // 希望配達時段
      'RT:tracking_no':                  0,  // 託運單號
      'RT:tracking_no_dash':             0,  // 託運單號（dash）
      'RT:convert_order_no':             0,  // 客代單號
      'RT:order_no':                     0,  // 訂單編號
      'RT:webservice_login':             0,  // 寄件人代碼
      'RT:customer_name':                0,  // 收件人姓名
      'RT:full_customer_address':        0,  // 收件人地址
      'RT:full_customer_phone':          0,  // 收件人電話
      'RT:full_customer_phone_star':     0,  // 收件人電話（遮碼）
      'RT:customer_postcode':            0,  // 郵遞區號
      'RT:base_customer_postcode':        0,  // 郵遞區號（地址前）
      'RT:basename':                     0,  // 郵遞區號前2碼
      'RT:sender_name':                  0,  // 寄件人姓名
      'RT:full_sender_address':          0,  // 寄件人地址
      'RT:full_sender_phone':            0,  // 寄件人電話
      'RT:production_name':              0,  // 品名
      'RT:production_kind':              0,  // 品名種類
      'RT:price_or_not':                 0,  // 代收貨款
      'RT:package_size_name':            0,  // 尺寸
      'RT:temperature_character_one':    0,  // 溫層第一字
      'RT:temperature_character_two':    0,  // 溫層第二字
      'RT:temperature_character_one_big':0,  // 溫層第一字（大）
      'RT:temperature_character_two_big':0,  // 溫層第二字（大）
      'RT:ezcat_version':                0,  // EZCAT版本
      'RT:address_db_version':           0,  // 郵遞區號DB版本

      // ════════════════════════════════════════════
      // LB：左下 收據聯
      // ════════════════════════════════════════════
      'LB:send_date_dash':               0,
      'LB:deliver_date_dash':            0,
      'LB:deliver_time_name':            0,
      'LB:tracking_no':                  0,
      'LB:tracking_no_dash':             0,
      'LB:convert_order_no':             0,
      'LB:order_no':                     0,
      'LB:customer_name':                0,  // ← 海錦富公司（大字）
      'LB:full_customer_name_star':      0,
      'LB:full_customer_address':        0,
      'LB:full_customer_phone':          0,
      'LB:full_customer_phone_star':     0,
      'LB:customer_postcode':             0,
      'LB:base_customer_postcode':        0,
      'LB:sender_name':                  0,
      'LB:full_sender_address':          0,
      'LB:full_sender_phone':            0,
      'LB:production_name':              0,
      'LB:production_kind':              0,
      'LB:price_or_not':                 0,
      'LB:comment':                      0,

      // ════════════════════════════════════════════
      // RB：右下 配送聯（下半）
      // ════════════════════════════════════════════
      'RB:send_date_dash':               0,
      'RB:deliver_date_dash':            0,
      'RB:deliver_date_dash_mmdd':       0,
      'RB:deliver_time_name':            0,
      'RB:tracking_no':                  0,
      'RB:tracking_no_dash':             0,
      'RB:convert_order_no':             0,
      'RB:order_no':                     0,
      'RB:customer_name':                0,  // ← 海錦富公司（大字）
      'RB:full_customer_address':        0,
      'RB:full_customer_phone':          0,
      'RB:full_customer_phone_star':     0,
      'RB:customer_postcode':             0,
      'RB:base_customer_postcode':        0,
      'RB:sender_name':                  0,
      'RB:full_sender_address':          0,
      'RB:full_sender_phone':            0,
      'RB:production_name':              0,
      'RB:production_kind':              0,
      'RB:price_or_not':                 0,
      'RB:package_size_name':            0,
      'RB:deliver_time_name':            0,
      'RB:comment':                      0,
    }
    // zone:col 優先，找不到就 fallback 到無區塊的 col
    const adjust = FONT_ADJUST[`${zone}:${col}`] ?? FONT_ADJUST[col] ?? 0
    const pt = Math.max(sz, 5)
    const finalSize = Math.max(pt + adjust, 4)
    const lineHeight = finalSize * 1.4  // 行距 = 字體大小 * 1.4

    // 需要換行的欄位
    const WRAP_COLS = new Set([
      'full_customer_address', 'full_sender_address',
      'base_customer_postcode',
    ])

    try {
      if (fw > 0 && WRAP_COLS.has(col)) {
        // 自動換行：把文字切成多行，每行不超過 fw mm
        // WRAP_WIDTH_REDUCE：各欄位縮減換行寬度（mm），補償欄標籤或邊距佔用的空間
        const WRAP_WIDTH_REDUCE: Record<string, number> = {
          'full_customer_address':  10,  // 「收件人」標籤約佔 10mm
          'full_sender_address':    10,  // 「寄件人」標籤約佔 10mm
          'base_customer_postcode': 10,
        }
        const reduce = WRAP_WIDTH_REDUCE[col] ?? 0
        const maxW = m(fw - reduce)
        const words = v.split('')  // 中文逐字切
        const lines: string[] = []
        let line = ''
        for (const ch of words) {
          const test = line + ch
          const w2 = font.widthOfTextAtSize(test, finalSize)
          if (w2 > maxW && line.length > 0) {
            lines.push(line)
            line = ch
          } else {
            line = test
          }
        }
        if (line) lines.push(line)

        const x0 = px(fx + 1, bx)
        const y0 = py(fy, rowOffset, by) - finalSize * 0.3
        lines.forEach((ln, i) => {
          try {
            p.drawText(ln, {
              x: x0,
              y: y0 - i * lineHeight,
              size: finalSize,
              font,
              color: rgb(0, 0, 0),
            })
          } catch { /* 略過 */ }
        })
      } else {
        p.drawText(v, {
          x: px(fx + 1, bx),
          y: py(fy, rowOffset, by) - finalSize * 0.3,
          size: finalSize,
          font,
          color: rgb(0, 0, 0),
          maxWidth: fw > 0 ? m(fw) : undefined,
        })
      }
    } catch { /* 略過無法繪製的字元 */ }

  }
}

// ── 主 handler ───────────────────────────────────────────────
export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const ids: number[] = body.ids ?? []
  const paperId: number = Number(body.paper_id ?? 2) // 預設 A4 二模常溫
  if (!ids.length) throw createError({ statusCode: 400, statusMessage: '未指定託運單' })

  const config = useRuntimeConfig()
  const BASE = config.public.apiBase + '/holy/t-cat'

  // 讀取託運單（從 Spring Boot）
  const listRes = await $fetch<any>(`${BASE}/waybills/by-ids`, {
    method: 'POST',
    body: { ids }
  })
  const waybills: any[] = listRes ?? []

  // 讀取 paper 設定（從 Spring Boot）
  const paperRes = await $fetch<any>(`${BASE}/paper-config`, {
    params: { paper_id: paperId }
  })
  const paper  = paperRes?.paper  ?? {}
  const fields = paperRes?.fields ?? []
  const prows  = paperRes?.rows   ?? []

  const pub = path.join(process.cwd(), 'public')
  const doc = await PDFDocument.create()
  doc.registerFontkit(fontkit)
  const font = await doc.embedFont(fs.readFileSync(path.join(pub, 'fonts', 'PMingLiU.ttf')))

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
        thickness: 0.3, color: rgb(0.6, 0.6, 0.6), dashArray: [3, 3]
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
      'Content-Disposition': `attachment; filename="waybills_${Date.now()}.pdf"`
    }
  })
})
