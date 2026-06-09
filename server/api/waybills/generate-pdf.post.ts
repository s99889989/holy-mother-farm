import Database from 'better-sqlite3'
import { PDFDocument, rgb, degrees } from 'pdf-lib'
import fontkit from '@pdf-lib/fontkit'
import fs from 'fs'
import path from 'path'
import bwipjs from 'bwip-js'
import QRCode from 'qrcode'

// mm to pt (1mm = 2.8346pt)
const mm = (v: number) => v * 2.8346

// A4 = 210x297mm
const PAGE_W = mm(210)
const PAGE_H = mm(297)

// Black Cat uses mm coordinates from top-left, pdf-lib uses pt from bottom-left
// So y_pdf = PAGE_H - mm(y_mm)  (and subtract height for rectangles)
const Y = (y: number) => PAGE_H - mm(y)

async function makeBarcode(text: string, type: 'interleaved2of5' | 'code128' = 'interleaved2of5'): Promise<Uint8Array> {
  try {
    const png = await bwipjs.toBuffer({
      bcid: type === 'code128' ? 'code128' : 'interleaved2of5',
      text,
      scale: 2,
      height: 8,
      includetext: false,
      backgroundcolor: 'FFFFFF',
    })
    return png
  } catch {
    return new Uint8Array()
  }
}

async function makeQRCode(text: string): Promise<Uint8Array> {
  try {
    const dataUrl = await QRCode.toDataURL(text, { width: 80, margin: 1 })
    const base64 = dataUrl.replace('data:image/png;base64,', '')
    return Buffer.from(base64, 'base64')
  } catch {
    return new Uint8Array()
  }
}

function deliverTimeLabel(v: any): string {
  const map: Record<string, string> = { '1': '13點前', '2': '14-18時', '4': '不指定', '5': '20-21時' }
  return map[String(v ?? '')] ?? ''
}

function packageSizeLabel(v: any): string {
  const map: Record<string, string> = { '0001': '60cm', '0002': '90cm', '0003': '120cm', '0004': '150cm' }
  return map[String(v ?? '')] ?? ''
}

function priceLabel(w: any): string {
  const p = Number(w.price ?? 0)
  return p > 0 ? String(p) : '不收款'
}

// Draw one waybill (A4二模, paper id=2/3)
// offsetY: 0 for top waybill, 148.5mm for bottom waybill (half of A4)
async function drawWaybill(page: any, font: any, w: any, offsetY: number, publicDir: string) {
  const ox = 0   // base_x = 0
  const oy = offsetY  // mm offset from top

  // Helper: draw text at mm coords
  const drawText = (text: string, xMm: number, yMm: number, sizePt: number, maxWidthMm?: number) => {
    if (!text) return
    try {
      page.drawText(String(text), {
        x: mm(xMm + ox),
        y: Y(yMm + oy) - sizePt,
        size: sizePt,
        font,
        color: rgb(0, 0, 0),
        maxWidth: maxWidthMm ? mm(maxWidthMm) : undefined,
      })
    } catch { /* ignore */ }
  }

  // Helper: draw rectangle (stroke only)
  const drawRect = (x1: number, y1: number, x2: number, y2: number) => {
    page.drawRectangle({
      x: mm(x1 + ox),
      y: Y(y2 + oy),
      width: mm(x2 - x1),
      height: mm(y2 - y1),
      borderColor: rgb(0, 0, 0),
      borderWidth: 0.5,
      color: undefined,
    })
  }

  // Helper: embed image from public dir
  const drawImage = async (filename: string, xMm: number, yMm: number, wMm: number, hMm: number) => {
    try {
      const imgPath = path.join(publicDir, 'images', 'papers', filename)
      if (!fs.existsSync(imgPath)) return
      const imgBytes = fs.readFileSync(imgPath)
      const pdfDoc = page.doc as PDFDocument
      let img
      if (filename.endsWith('.png')) {
        img = await pdfDoc.embedPng(imgBytes)
      } else {
        img = await pdfDoc.embedJpg(imgBytes)
      }
      page.drawImage(img, {
        x: mm(xMm + ox),
        y: Y(yMm + hMm + oy),
        width: mm(wMm),
        height: mm(hMm),
      })
    } catch { /* ignore */ }
  }

  // Helper: embed barcode PNG
  const drawBarcode = async (text: string, xMm: number, yMm: number, wMm: number, hMm: number, type: 'interleaved2of5' | 'code128' = 'interleaved2of5') => {
    if (!text) return
    try {
      const png = await makeBarcode(text, type)
      if (!png.length) return
      const pdfDoc = page.doc as PDFDocument
      const img = await pdfDoc.embedPng(png)
      page.drawImage(img, {
        x: mm(xMm + ox),
        y: Y(yMm + hMm + oy),
        width: mm(wMm),
        height: mm(hMm),
      })
    } catch { /* ignore */ }
  }

  const drawQR = async (text: string, xMm: number, yMm: number, sizeMm: number) => {
    if (!text) return
    try {
      const png = await makeQRCode(text)
      if (!png.length) return
      const pdfDoc = page.doc as PDFDocument
      const img = await pdfDoc.embedPng(png)
      page.drawImage(img, {
        x: mm(xMm + ox),
        y: Y(yMm + sizeMm + oy),
        width: mm(sizeMm),
        height: mm(sizeMm),
      })
    } catch { /* ignore */ }
  }

  // ─────────────────────────────────────────────
  //  FRAME (draw_image2 in paper.rb)
  // ─────────────────────────────────────────────

  // 黏貼聯
  drawText('包裹查詢號碼', 26, 16, 6)
  drawRect(5, 18, 70, 67)

  drawText('收 貨 日', 5, 21, 8)
  drawRect(5, 18, 20, 24)
  drawText('希望配達日', 20, 21, 7)
  drawRect(20, 18, 36, 24)
  drawText('希望配達時段', 36, 21, 6)
  drawRect(36, 18, 52, 24)
  drawText('發 貨 所', 53, 21, 8)
  drawRect(52, 18, 70, 24)

  drawRect(5, 24, 20, 29)
  drawRect(20, 24, 36, 29)
  drawRect(36, 24, 52, 29)
  drawRect(52, 24, 70, 29)

  drawRect(5, 29, 70, 42)
  drawRect(5, 29, 10, 42)
  drawText('收', 5, 32, 8); drawText('件', 5, 36, 8); drawText('人', 5, 40, 8)

  drawRect(5, 42, 70, 55)
  drawRect(5, 42, 10, 55)
  drawText('寄', 5, 45, 8); drawText('件', 5, 49, 8); drawText('人', 5, 53, 8)

  drawText('品名', 5, 57, 7)
  drawRect(5, 55, 70, 67)
  drawText('代收貨款', 37, 57, 7)
  drawRect(37, 55, 70, 67)

  drawText('訂單編號', 5, 69, 7)

  // 顧客聯
  drawRect(5, 84, 70, 143)
  drawText('託運單號', 5, 87, 7)
  drawRect(5, 84, 20, 89)
  drawText('收 貨 日', 5, 92, 7)
  drawRect(5, 89, 20, 94)
  drawText('希望配達日', 20, 92, 7)
  drawRect(20, 89, 36, 94)
  drawText('希望配達時段', 36, 92, 6)
  drawRect(36, 89, 52, 94)
  drawText('代收貨款', 53, 92, 8)
  drawRect(52, 89, 70, 94)

  drawRect(5, 94, 20, 99)
  drawRect(20, 94, 36, 99)
  drawRect(36, 94, 52, 99)
  drawRect(52, 94, 70, 99)

  drawRect(5, 99, 70, 113)
  drawRect(5, 99, 10, 113)
  drawText('收', 5, 102, 8); drawText('件', 5, 106, 8); drawText('人', 5, 110, 8)

  drawRect(5, 113, 70, 127)
  drawRect(5, 113, 10, 127)
  drawText('寄', 5, 116, 8); drawText('件', 5, 120, 8); drawText('人', 5, 124, 8)

  drawText('訂單編號', 5, 130, 7)
  drawRect(5, 127, 70, 134)
  drawText('品名', 5, 136, 7)

  // 配送聯外框右側
  drawRect(171, 7, 191, 12)
  drawText('希 望 配 達 日', 171, 10, 7)
  drawRect(171, 12, 191, 19)
  drawRect(171, 19, 191, 24)
  drawText('希望配達時段', 171, 22, 7)
  drawRect(171, 24, 191, 30)
  drawRect(171, 30, 191, 35)
  drawText('尺           寸', 172, 33, 7)
  drawRect(171, 35, 191, 41)

  // 配送聯收件人
  drawRect(75, 19, 171, 35)
  drawRect(75, 19, 80, 35)
  drawText('收', 75, 22, 8); drawText('件', 75, 26, 8); drawText('人', 75, 30, 8)

  // 配送聯寄件人
  drawRect(75, 35, 171, 45)
  drawRect(75, 35, 80, 45)
  drawText('寄', 75, 37, 7); drawText('件', 75, 40, 7); drawText('人', 75, 43, 7)

  // 配送聯備註
  drawRect(75, 45, 171, 50)
  drawRect(75, 45, 82, 50)
  drawText('備註', 75, 48, 7)

  // 配送聯品名
  drawRect(75, 50, 171, 55)
  drawRect(75, 50, 82, 55)
  drawText('品名', 75, 53, 7)

  // 配送聯訂單編號
  drawRect(75, 55, 171, 60)
  drawRect(75, 55, 88, 60)
  drawText('訂單編號', 75, 58, 7)

  drawText('收貨日:', 140, 62, 7)
  drawText('客代', 75, 62, 7)
  drawText('單號', 75, 66, 7)

  // 配送聯代收/簽名
  drawRect(140, 64, 191, 81)
  drawRect(140, 64, 145, 81)
  drawText('代', 140, 67, 7); drawText('收', 140, 71, 7)
  drawText('貨', 140, 75, 7); drawText('款', 140, 79, 7)
  drawRect(165, 64, 170, 81)
  drawText('收', 165, 67, 7); drawText('件', 165, 70, 7)
  drawText('人', 165, 73, 7); drawText('簽', 165, 76, 7); drawText('名', 165, 79, 7)

  // 會計聯
  drawRect(75, 84, 175, 119)
  drawRect(175, 84, 191, 89)
  drawText('希望配達日', 175, 87, 7)
  drawRect(175, 89, 191, 96)
  drawRect(175, 96, 191, 101)
  drawText('希望配達時段', 175, 99, 6)
  drawRect(175, 96, 191, 114)
  drawRect(175, 109, 191, 114)
  drawText('尺          寸', 175, 112, 7)
  drawRect(175, 114, 191, 119)

  drawText('收 貨 日', 75, 87, 8)
  drawRect(75, 84, 90, 89)
  drawText('發 貨 所', 119, 87, 8)
  drawRect(119, 84, 133, 89)
  drawText('收件人', 75, 92, 7)
  drawRect(75, 89, 119, 109)
  drawText('寄件人', 119, 92, 7)
  drawRect(119, 89, 175, 109)
  drawText('訂單編號', 75, 111, 7)
  drawRect(75, 109, 175, 114)
  drawText('品名', 75, 116, 7)
  drawRect(75, 114, 175, 119)
  drawText('客代', 75, 122, 7)
  drawText('單號', 75, 126, 7)
  drawRect(135, 120, 155, 143)
  drawRect(135, 120, 155, 124)
  drawText('代收貨款', 137, 122, 8)
  drawRect(155, 120, 171, 143)
  drawRect(155, 120, 171, 124)
  drawText('寄件人簽名', 155, 122, 7)

  // ─────────────────────────────────────────────
  //  DATA
  // ─────────────────────────────────────────────

  const trackingNo   = String(w.tracking_no ?? '')
  const trackingDash = trackingNo.replace(/(\d{4})(\d{4})(\d{4})/, '$1-$2-$3')
  const sendDate     = String(w.send_date ?? '')
  const deliverDate  = String(w.deliver_date ?? '')
  const deliverTime  = deliverTimeLabel(w.deliver_time)
  const pkgSize      = packageSizeLabel(w.package_size)
  const custName     = String(w.customer_name ?? '')
  const custAddr     = String(w.customer_address ?? '')
  const custPhone    = String(w.customer_phone ?? '')
  const custMobile   = String(w.customer_mobile ?? '')
  const custPostcode = String(w.customer_postcode ?? '')
  const senderName   = String(w.sender_name ?? '')
  const senderAddr   = String(w.sender_address ?? '')
  const senderPhone  = String(w.sender_phone ?? '')
  const senderMobile = String(w.sender_mobile ?? '')
  const senderCode   = String(w.sender_code ?? '')
  const prodName     = String(w.production_name ?? '')
  const orderNo      = String(w.order_no ?? '')
  const comment      = String(w.comment ?? '')
  const priceStr     = priceLabel(w)

  // 溫層圖示
  const tempVal = String(w.temperature ?? '')
  if (tempVal === '0001' || tempVal === '1') await drawImage('normal.png', 155, 19, 14, 14)
  else if (tempVal === '0002' || tempVal === '2') await drawImage('tempcold.png', 155, 19, 14, 14)
  else if (tempVal === '0003' || tempVal === '3') await drawImage('tempfreezer.png', 155, 19, 14, 14)

  // 到付單
  if (w.waybilltype === 'N') await drawImage('delivepay.png', 75, 50, 20, 8)
  // 代收
  if (Number(w.price ?? 0) > 0) await drawImage('collect.png', 100, 50, 20, 8)
  // 報值
  if (Number(w.insurance ?? 0) > 0) await drawImage('insurance.png', 100, 58, 20, 6)

  // 黏貼聯 barcode (上方)
  await drawBarcode(trackingNo, 10, 5, 55, 12)

  // 黏貼聯資料
  drawText(sendDate,    5,  25, 7, 14)
  drawText(deliverDate, 20, 25, 7, 15)
  drawText(deliverTime, 36, 25, 6, 15)

  // 收件人
  drawText(custAddr,   11, 32, 6, 55)
  drawText(custName,   11, 37, 7, 40)
  drawText(custMobile || custPhone, 11, 40, 6, 55)

  // 寄件人
  drawText(senderAddr,  11, 45, 6, 55)
  drawText(senderName,  11, 50, 7, 40)
  drawText(senderPhone || senderMobile, 11, 53, 6, 55)

  // 品名/代收
  drawText(prodName,  11, 60, 7, 28)
  drawText(priceStr,  38, 60, 7, 28)

  // 訂單編號
  drawText(orderNo, 5, 72, 7, 65)

  // 顧客聯 barcode
  await drawBarcode(trackingNo, 10, 73, 55, 10)

  // 顧客聯資料
  drawText(trackingDash, 5, 87, 7, 65)
  drawText(sendDate,    5,  95, 7, 14)
  drawText(deliverDate, 20, 95, 7, 15)
  drawText(deliverTime, 36, 95, 6, 15)
  drawText(priceStr,    53, 95, 7, 15)

  drawText(custAddr,   11, 102, 6, 55)
  drawText(custName,   11, 107, 7, 40)
  drawText(custMobile || custPhone, 11, 110, 6, 55)

  drawText(senderAddr,  11, 116, 6, 55)
  drawText(senderName,  11, 121, 7, 40)
  drawText(senderPhone || senderMobile, 11, 124, 6, 55)

  drawText(orderNo,   5, 130, 7, 65)
  drawText(prodName,  5, 138, 7, 65)

  // 配送聯資料 (右側大區塊)
  // 右側希望配達日/時段/尺寸
  drawText(deliverDate, 172, 16, 8, 18)
  drawText(deliverTime, 172, 27, 7, 18)
  drawText(pkgSize,     172, 38, 8, 18)

  // 配送聯收件人
  drawText(custAddr,   81, 22, 6, 86)
  drawText(custName,   81, 27, 7, 60)
  drawText(custMobile || custPhone, 81, 30, 6, 86)
  drawText(custPostcode, 81, 33, 6, 30)

  // 配送聯寄件人
  drawText(senderAddr,  81, 37, 6, 86)
  drawText(senderName,  81, 41, 7, 60)
  drawText(senderPhone || senderMobile, 81, 43, 6, 86)

  // 配送聯備註/品名/訂單
  drawText(comment,  83, 48, 7, 84)
  drawText(prodName, 83, 53, 7, 84)
  drawText(orderNo,  89, 58, 7, 78)

  // 客代/單號/收貨日
  drawText(senderCode,  75, 64, 7, 30)
  drawText(trackingDash,75, 68, 7, 60)
  drawText(sendDate,    148, 65, 7, 20)

  // 代收金額
  drawText(priceStr, 146, 73, 7, 20)

  // 配送聯 barcode (tracking_no)
  await drawBarcode(trackingNo, 76, 69, 60, 11, 'code128')

  // 會計聯資料
  drawText(sendDate,    75, 88, 8, 14)
  drawText(deliverDate, 175, 93, 7, 14)
  drawText(deliverTime, 175, 103, 6, 14)
  drawText(pkgSize,     175, 116, 7, 14)

  drawText(custAddr,   75, 92, 6, 42)
  drawText(custName,   75, 97, 7, 40)
  drawText(custMobile || custPhone, 75, 102, 6, 42)
  drawText(custPostcode, 75, 105, 6, 20)

  drawText(senderAddr,  119, 92, 6, 54)
  drawText(senderName,  119, 97, 7, 50)
  drawText(senderPhone || senderMobile, 119, 102, 6, 54)

  drawText(orderNo,   75, 111, 7, 98)
  drawText(prodName,  75, 117, 7, 98)

  drawText(senderCode,   75, 123, 7, 30)
  drawText(trackingDash, 75, 127, 7, 60)

  // 代收貨款金額
  drawText(priceStr, 137, 130, 7, 16)

  // QR Code (右下角會計聯)
  const ddate = deliverDate.replace(/\//g, '').replace(/-/g, '')
  const qrData = `tracking_number=${trackingNo}&customer_id=${senderCode}&product_price=${w.price ?? 0}&temperature=${String(w.temperature ?? '0001').padStart(2,'0')}&package_size=${String(w.package_size ?? '0002').padStart(2,'0')}&receiver_suda5=${custPostcode}&delivery_date=${ddate}&delivery_timezone=${String(w.deliver_time ?? '4').padStart(2,'0')}`
  await drawQR(qrData, 171, 120, 20)

  // 會計聯 barcode
  await drawBarcode(trackingNo, 76, 130, 90, 10, 'code128')

  // 契客代號 barcode (小)
  await drawBarcode(senderCode, 76, 141, 40, 6)
}

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const ids: number[] = body.ids ?? []

  if (!ids.length) throw createError({ statusCode: 400, statusMessage: '未指定託運單' })

  const db = new Database('C:/ezCat/app/db/development.sqlite3', { readonly: true })

  let waybills: any[]
  try {
    const placeholders = ids.map(() => '?').join(',')
    waybills = db.prepare(`
      SELECT id, tracking_no, order_no, send_date, deliver_date,
             sender_code, sender_name, sender_phone, sender_mobile,
             sender_address, sender_postcode,
             customer_name, customer_phone, customer_mobile,
             customer_address, customer_postcode,
             production_name, price, insurance, state, paper_id,
             deliver_time, temperature, package_size,
             breakable, precision_instrument, waybilltype, comment
      FROM waybills WHERE id IN (${placeholders}) ORDER BY id
    `).all(...ids) as any[]
  } finally {
    db.close()
  }

  // Load font
  const publicDir = path.join(process.cwd(), 'public')
  const fontPath  = path.join(publicDir, 'fonts', 'kaiu.ttf')
  const fontBytes = fs.readFileSync(fontPath)

  const pdfDoc = await PDFDocument.create()
  pdfDoc.registerFontkit(fontkit)
  const font = await pdfDoc.embedFont(fontBytes)

  // Pair waybills into pages (2 per page)
  for (let i = 0; i < waybills.length; i += 2) {
    const page = pdfDoc.addPage([PAGE_W, PAGE_H])
    // Store reference for image embedding
    ;(page as any).doc = pdfDoc

    // Top waybill (offsetY = 0)
    await drawWaybill(page, font, waybills[i], 0, publicDir)

    // Draw dividing line
    page.drawLine({
      start: { x: 0, y: PAGE_H / 2 },
      end:   { x: PAGE_W, y: PAGE_H / 2 },
      thickness: 0.5,
      color: rgb(0.8, 0.8, 0.8),
      dashArray: [4, 4],
    })

    // Bottom waybill (offsetY = 148.5mm)
    if (waybills[i + 1]) {
      await drawWaybill(page, font, waybills[i + 1], 148.5, publicDir)
    }
  }

  const pdfBytes = await pdfDoc.save()

  return new Response(Buffer.from(pdfBytes), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="waybills_${Date.now()}.pdf"`,
    },
  })
})
