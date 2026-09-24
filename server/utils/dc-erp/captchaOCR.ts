// server/utils/dc-erp/captchaOCR.ts
//
// COAERP 登入驗證碼的「樣板比對」分類器（不是通用 OCR）。這支是從測試用
// 的 captchaOCR.mjs 原封不動搬過來的（邏輯完全一樣，只是補了型別），已經
// 用 10 張種子圖＋留一法交叉驗證過（單字元 ~82.5%、整組 4 碼 ~50%），也
// 用 bootstrap-captcha-ocr.mjs 跑過真實 COAERP 驗證正確性。
//
// 為什麼不用 Tesseract：這個驗證碼是故意扭曲過的合成數字（4 碼、純數字、
// 每碼顏色不同、邊緣有色差雜訊），Tesseract 這種為印刷體/手寫字調校過的
// 引擎完全不對路，實測整組 4 碼答對率只有 40% 左右。這其實是「固定字型、
// 只有 0-9 十種可能」的分類問題，不是辨識問題，樣板比對（把每個字元縮放
// 置中成固定畫布，跟已知樣本逐一比對像素差異，取最像的當答案）遠遠更
// 準——細節見 automation.ts 開頭跟 autoLogin.ts 的說明。
//
// 需要安裝 jimp：pnpm add jimp（要裝在 holy-mother-farm 專案本身的
// package.json，不是隨便哪個資料夾——之前在別的資料夾裝的測試腳本用的
// jimp 跟這個無關）。
//
// 這裡改用「靜態 import」而不是 `await import('jimp')` 動態載入：Netlify
// 的 Nitro function 打包工具（esbuild/nft 依賴追蹤）對動態 import 的套件
// 追蹤有時候不夠可靠，實測就是這裡的動態 import 在 Netlify 上找不到
// jimp，改成靜態 import 讓打包工具能直接靜態分析出這個依賴，一起打包
// 進 function bundle，比較不會漏。

import { Jimp } from 'jimp'

const CANVAS_W = 24
const CANVAS_H = 32
const MATCH_ANGLES = [-12, -6, 0, 6, 12]

export { CANVAS_W, CANVAS_H }

export interface ImagePixels {
  width: number
  height: number
  data: Uint8ClampedArray | Buffer
}

export interface InkMap {
  width: number
  height: number
  ink: Float32Array
}

export interface GlyphBox {
  x0: number
  x1: number
  y0: number
  y1: number
}

// 用 Jimp 把 PNG bytes 讀成 {width, height, data(RGBA)}
export async function loadImagePixels(buffer: Buffer): Promise<ImagePixels> {
  const img = await Jimp.read(buffer)
  return { width: img.bitmap.width, height: img.bitmap.height, data: img.bitmap.data }
}

// ink = 255 - min(R,G,B)：離白色背景的「墨水強度」，不管字元本身顏色是
// 什麼（驗證碼每碼顏色隨機），墨水強度都會是一個穩定、跟顏色無關的量。
export function computeInk({ width, height, data }: ImagePixels): InkMap {
  const ink = new Float32Array(width * height)
  for (let i = 0; i < width * height; i++) {
    const r = data[i * 4], g = data[i * 4 + 1], b = data[i * 4 + 2]
    ink[i] = 255 - Math.min(r, g, b)
  }
  return { width, height, ink }
}

// 連通元件（8 方向）切字：ink > threshold 的像素做 flood fill 分群，每群
// 的外接框就是一個字元，按 x 座標由左到右排序。
export function segmentGlyphs({ width, height, ink }: InkMap, threshold = 60, minWidth = 3): GlyphBox[] {
  const size = width * height
  const mask = new Uint8Array(size)
  for (let i = 0; i < size; i++) mask[i] = ink[i] > threshold ? 1 : 0

  const visited = new Uint8Array(size)
  const boxes: GlyphBox[] = []
  const stack = new Int32Array(size)

  for (let start = 0; start < size; start++) {
    if (!mask[start] || visited[start]) continue
    let sp = 0
    stack[sp++] = start
    visited[start] = 1
    let minX = start % width, maxX = minX, minY = (start / width) | 0, maxY = minY

    while (sp > 0) {
      const cur = stack[--sp]
      const cx = cur % width, cy = (cur / width) | 0
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          if (dx === 0 && dy === 0) continue
          const nx = cx + dx, ny = cy + dy
          if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue
          const nidx = ny * width + nx
          if (mask[nidx] && !visited[nidx]) {
            visited[nidx] = 1
            stack[sp++] = nidx
            if (nx < minX) minX = nx
            if (nx > maxX) maxX = nx
            if (ny < minY) minY = ny
            if (ny > maxY) maxY = ny
          }
        }
      }
    }
    boxes.push({ x0: minX, x1: maxX + 1, y0: minY, y1: maxY + 1 })
  }

  return boxes.filter((b) => b.x1 - b.x0 >= minWidth).sort((a, b) => a.x0 - b.x0)
}

function bilinearResize(src: Float32Array, sw: number, sh: number, dw: number, dh: number): Float32Array {
  const dst = new Float32Array(dw * dh)
  for (let y = 0; y < dh; y++) {
    const gy = ((y + 0.5) * sh) / dh - 0.5
    const y0 = Math.max(0, Math.floor(gy)), y1 = Math.min(sh - 1, y0 + 1)
    const fy = gy - y0
    for (let x = 0; x < dw; x++) {
      const gx = ((x + 0.5) * sw) / dw - 0.5
      const x0 = Math.max(0, Math.floor(gx)), x1 = Math.min(sw - 1, x0 + 1)
      const fx = gx - x0
      const v00 = src[y0 * sw + x0], v01 = src[y0 * sw + x1]
      const v10 = src[y1 * sw + x0], v11 = src[y1 * sw + x1]
      const v0 = v00 * (1 - fx) + v01 * fx
      const v1 = v10 * (1 - fx) + v11 * fx
      dst[y * dw + x] = v0 * (1 - fy) + v1 * fy
    }
  }
  return dst
}

// 把切出來的一個字元框，等比例縮放後置中貼進固定畫布（24x32），輸出
// 0~1 的墨水強度陣列——大小固定、置中，才能跟樣板庫直接逐像素比對。
export function normalizeGlyph({ width, ink }: InkMap, box: GlyphBox, canvasW = CANVAS_W, canvasH = CANVAS_H): Float32Array {
  const bw = box.x1 - box.x0, bh = box.y1 - box.y0
  const sub = new Float32Array(bw * bh)
  for (let yy = 0; yy < bh; yy++) {
    for (let xx = 0; xx < bw; xx++) {
      sub[yy * bw + xx] = ink[(box.y0 + yy) * width + (box.x0 + xx)] / 255
    }
  }
  const scale = Math.min((canvasW - 4) / bw, (canvasH - 4) / bh)
  const nw = Math.max(1, Math.round(bw * scale))
  const nh = Math.max(1, Math.round(bh * scale))
  const resized = bilinearResize(sub, bw, bh, nw, nh)

  const canvas = new Float32Array(canvasW * canvasH)
  const ox = Math.floor((canvasW - nw) / 2), oy = Math.floor((canvasH - nh) / 2)
  for (let yy = 0; yy < nh; yy++) {
    for (let xx = 0; xx < nw; xx++) {
      canvas[(oy + yy) * canvasW + (ox + xx)] = resized[yy * nw + xx]
    }
  }
  return canvas
}

function rotateCanvas(canvas: Float32Array, w: number, h: number, angleDeg: number): Float32Array {
  if (angleDeg === 0) return canvas
  const rad = (angleDeg * Math.PI) / 180
  const cos = Math.cos(rad), sin = Math.sin(rad)
  const cx = (w - 1) / 2, cy = (h - 1) / 2
  const out = new Float32Array(w * h)
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const dx = x - cx, dy = y - cy
      const sx = cos * dx + sin * dy + cx
      const sy = -sin * dx + cos * dy + cy
      if (sx < 0 || sx > w - 1 || sy < 0 || sy > h - 1) continue
      const x0 = Math.floor(sx), x1 = Math.min(w - 1, x0 + 1)
      const y0 = Math.floor(sy), y1 = Math.min(h - 1, y0 + 1)
      const fx = sx - x0, fy = sy - y0
      const v00 = canvas[y0 * w + x0], v01 = canvas[y0 * w + x1]
      const v10 = canvas[y1 * w + x0], v11 = canvas[y1 * w + x1]
      const v0 = v00 * (1 - fx) + v01 * fx
      const v1 = v10 * (1 - fx) + v11 * fx
      out[y * w + x] = v0 * (1 - fy) + v1 * fy
    }
  }
  return out
}

// 兩個畫布的相似度（像素平方差，越小越像）。驗證碼字元本身有輕微旋轉，
// 比對時把樣板轉幾個小角度一起試，取最像的角度——這步對準確率貢獻最大。
function matchScore(a: Float32Array, b: Float32Array, w = CANVAS_W, h = CANVAS_H): number {
  let best = Infinity
  for (const angle of MATCH_ANGLES) {
    const rb = rotateCanvas(b, w, h, angle)
    let diff = 0
    for (let i = 0; i < a.length; i++) {
      const d = a[i] - rb[i]
      diff += d * d
    }
    if (diff < best) best = diff
  }
  return best
}

export interface CaptchaTemplateEntry {
  label: string
  feat: number[]
}

export function classifyGlyph(feat: Float32Array, library: CaptchaTemplateEntry[]): { label: string | null; score: number } {
  let bestLabel: string | null = null, bestScore = Infinity
  for (const entry of library) {
    const score = matchScore(feat, Float32Array.from(entry.feat))
    if (score < bestScore) {
      bestScore = score
      bestLabel = entry.label
    }
  }
  return { label: bestLabel, score: bestScore }
}

export interface ClassifyCaptchaResult {
  guess: string
  boxCount: number
  glyphs: Float32Array[]
  scores: number[]
}

// 一次做完「讀圖 → 切字 → 逐字分類」，回傳猜的字串 + 每個字元的 feature
// （猜對/登入成功時，呼叫端要把這些 feature 連同確認過的正確答案存回
// 樣板庫，見 captchaLibrary.ts 的 appendConfirmedGlyphs）。
export async function classifyCaptcha(
  buffer: Buffer,
  library: CaptchaTemplateEntry[],
  threshold = 60
): Promise<ClassifyCaptchaResult> {
  const pixels = await loadImagePixels(buffer)
  const inkObj = computeInk(pixels)
  const boxes = segmentGlyphs(inkObj, threshold)
  const glyphs = boxes.map((box) => normalizeGlyph(inkObj, box))
  const guesses = glyphs.map((feat) => classifyGlyph(feat, library))
  return {
    guess: guesses.map((g) => g.label ?? '?').join(''),
    boxCount: boxes.length,
    glyphs,
    scores: guesses.map((g) => g.score)
  }
}
