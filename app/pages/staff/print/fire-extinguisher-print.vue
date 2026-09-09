<script setup>
import {ref, computed, onMounted, onBeforeUnmount, nextTick} from 'vue'

definePageMeta({layout: 'staff', requiredPermission: 'print.fire-extinguisher-print'})

const commonStore = useCommonStore()
const API_BASE = computed(() => commonStore.data.main_url + '/holy/fire-extinguisher')

// 巡檢頁網址前綴：掃碼後會跳去 BASE_URL + 永久 id(不是編號，改編號不會讓已印出的 QR 失效)
// TODO：確認網域是否要換成正式站
const BASE_URL = 'https://holyfarm.netlify.app/front/fire-extinguisher/'
const PER_PAGE = 8 // 4欄 × 2列

const items = ref([])
const loading = ref(true)
const selected = ref({}) // { id: boolean }

async function loadItems() {
  loading.value = true
  try {
    const list = await $fetch(`${API_BASE.value}/list`, {credentials: 'include'})
    items.value = Array.isArray(list) ? list : []
    items.value.forEach((i) => {
      selected.value[i.id] = true
    })
  } catch (e) {
    console.error(e)
    items.value = []
  } finally {
    loading.value = false
  }
}

onMounted(loadItems)

const selectedCount = computed(() =>
  items.value.filter((i) => selected.value[i.id]).length
)

function toggleAll(val) {
  items.value.forEach((i) => {
    selected.value[i.id] = val
  })
}

// ── 預覽資料 ──
const sheets = ref([]) // [[ { code, location, qrDataUrl } | null, ... ], ...]
const generating = ref(false)

async function generate() {
  generating.value = true
  sheets.value = []

  const {default: QRCode} = await import('qrcode')

  const targets = items.value.filter((i) => selected.value[i.id])

  const pages = []
  for (let p = 0; p < Math.ceil(targets.length / PER_PAGE); p++) {
    const pageItems = targets.slice(p * PER_PAGE, (p + 1) * PER_PAGE)
    const cells = await Promise.all(
      pageItems.map(async (item) => {
        const url = BASE_URL + encodeURIComponent(item.id)
        const qrDataUrl = await QRCode.toDataURL(url, {
          width: 300,
          margin: 1,
          errorCorrectionLevel: 'M',
          color: {dark: '#000000', light: '#ffffff'}
        })
        return {code: item.code, location: item.location, qrDataUrl}
      })
    )
    while (cells.length < PER_PAGE) cells.push(null)
    pages.push(cells)
  }

  sheets.value = pages
  generating.value = false

  // 等格子渲染出來後，依容器寬度重新計算縮放比例
  await nextTick()
  updatePreviewScale()
}

// ── 畫面預覽縮放 ──
// 預覽跟列印用「完全相同」的 mm 數值排版（20mm/15mm 頁邊界、10mm 格內距、50mm QR...），
// 只在外層用 transform:scale() 依容器寬度整體縮小，確保畫面看到的比例 = 實際列印出來的比例。
const MM_TO_PX = 96 / 25.4 // CSS 規範：1in = 96px = 25.4mm
const PAGE_W_MM = 297
const previewPagesEl = ref(null)
const previewScale = ref(0.32)

function updatePreviewScale() {
  if (!previewPagesEl.value) return
  const containerWidth = previewPagesEl.value.clientWidth
  if (!containerWidth) return
  const pageWidthPx = PAGE_W_MM * MM_TO_PX
  previewScale.value = Math.min(1, Math.max(0.15, containerWidth / pageWidthPx))
}

let resizeHandler
onMounted(() => {
  resizeHandler = () => updatePreviewScale()
  window.addEventListener('resize', resizeHandler)
})
onBeforeUnmount(() => {
  if (resizeHandler) window.removeEventListener('resize', resizeHandler)
})

// ── 用 iframe 列印，完全不受 scoped style 干擾 ──
// 編號/位置是後台可自由輸入的文字，組進 HTML 字串前要先跳脫，
// 避免剛好含有 <、& 等字元時弄壞列印頁排版
function escHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]))
}

function printViaIframe() {
  const pagesHtml = sheets.value.map((page) => {
    const cellsHtml = page.map((cell) => {
      if (!cell) return `<div class="label-cell empty"></div>`
      return `
        <div class="label-cell">
          <img class="label-qr" src="${cell.qrDataUrl}" alt="${escHtml(cell.code)}" />
          <div class="label-code">${escHtml(cell.code)}</div>
          <div class="label-location">${escHtml(cell.location)}</div>
        </div>`
    }).join('')
    return `<div class="a4-page">${cellsHtml}</div>`
  }).join('')

  const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  @page { size: A4 landscape; margin: 0; }
  body { background: #fff; }
  .a4-page {
    width: 297mm; height: 210mm; padding: 20mm 15mm;
    display: grid; grid-template-columns: repeat(4, 1fr); grid-template-rows: repeat(2, 1fr);
    gap: 0; page-break-after: always; break-after: page; overflow: hidden;
  }
  .label-cell {
    display: flex; flex-direction: column; align-items: center; justify-content: center;
    border: 0.5px dashed #bbb; padding: 10mm; gap: 1mm; overflow: hidden;
  }
  .label-cell.empty { border-color: transparent; }
  .label-qr { width: 50mm; height: 50mm; object-fit: contain; display: block; }
  .label-code {
    font-family: 'Courier New', monospace; font-size: 15pt; font-weight: 700;
    color: #000; text-align: center; letter-spacing: 0.04em;
  }
  .label-location {
    font-family: 'Noto Serif TC', 'Songti TC', serif; font-size: 11pt;
    color: #333; text-align: center; line-height: 1.2;
  }
</style>
</head>
<body>${pagesHtml}</body>
</html>`

  const iframe = document.createElement('iframe')
  iframe.style.cssText = 'position:fixed;top:-9999px;left:-9999px;width:0;height:0;border:none;'
  document.body.appendChild(iframe)
  iframe.contentDocument.open()
  iframe.contentDocument.write(html)
  iframe.contentDocument.close()

  iframe.onload = () => {
    iframe.contentWindow.focus()
    iframe.contentWindow.print()
    setTimeout(() => document.body.removeChild(iframe), 2000)
  }
}
</script>

<template>
  <div class="lp-wrap bg-surface2">
    <aside class="lp-sidebar bg-surface border-r border-light-c">
      <div class="lp-sidebar-head border-b border-light-c">
        <h1 class="lp-title text-base-c">🧯 滅火器 QRCode 列印</h1>
        <p class="lp-sub text-hint-c">每張約 60 × 55mm,每頁 A4 橫排 8 張</p>
      </div>

      <div class="lp-toolbar border-b border-light-c">
        <button class="lp-link" @click="toggleAll(true)">全選</button>
        <button class="lp-link" @click="toggleAll(false)">全部取消</button>
        <span class="lp-count text-hint-c">已選 {{ selectedCount }} / {{ items.length }}</span>
      </div>

      <p v-if="loading" class="lp-loading text-hint-c">載入中...</p>

      <div v-else class="lp-item-list">
        <label v-for="item in items" :key="item.id" class="lp-row">
          <input type="checkbox" v-model="selected[item.id]" class="lp-checkbox">
          <span class="lp-code text-base-c">{{ item.code }}</span>
          <span class="lp-location text-hint-c">{{ item.location }}</span>
        </label>
      </div>

      <div class="lp-actions border-t border-light-c">
        <button class="lp-btn-primary" :disabled="generating || selectedCount === 0" @click="generate">
          {{ generating ? '產生中...' : `產生 QR Code(${selectedCount} 張)` }}
        </button>
        <button v-if="sheets.length" class="lp-btn-secondary" @click="printViaIframe">
          列印
        </button>
      </div>
    </aside>

    <main class="lp-preview">
      <p v-if="!sheets.length" class="lp-empty text-hint-c">勾選滅火器後按「產生 QR Code」預覽</p>

      <!-- 比照列印用相同 mm 數值排版，只用 transform 依容器寬度整體縮小顯示 -->
      <div
        v-else
        ref="previewPagesEl"
        class="lp-preview-pages"
        :style="{ '--pv-scale': previewScale }"
      >
        <div v-for="(page, pi) in sheets" :key="pi" class="lp-preview-stage">
          <div class="lp-preview-page">
            <div
              v-for="(cell, ci) in page"
              :key="ci"
              class="lp-preview-cell"
              :class="{ 'is-empty': !cell }"
            >
              <template v-if="cell">
                <img :src="cell.qrDataUrl" class="lp-preview-qr" :alt="cell.code">
                <div class="lp-preview-code">{{ cell.code }}</div>
                <div class="lp-preview-location">{{ cell.location }}</div>
              </template>
            </div>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>

<style scoped>
.lp-wrap {
  position: relative;
  min-height: 100vh;
}

.lp-sidebar {
  width: 320px;
  display: flex;
  flex-direction: column;
  position: fixed;
  top: 0;
  left: 0;
  height: 100vh;
  overflow: hidden;
  z-index: 10;
}

.lp-sidebar-head {
  padding: 16px;
}

.lp-title {
  font-size: 17px;
  font-weight: 700;
  margin: 0 0 4px;
}

.lp-sub {
  font-size: 13px;
  margin: 0;
}

.lp-toolbar {
  padding: 10px 16px;
  display: flex;
  align-items: center;
  gap: 10px;
}

.lp-link {
  font-size: 13px;
  color: #2563eb;
  background: none;
  border: none;
  cursor: pointer;
  padding: 0;
}

.lp-count {
  font-size: 12px;
  margin-left: auto;
}

.lp-loading {
  padding: 20px 16px;
  font-size: 14px;
}

.lp-item-list {
  flex: 1;
  overflow-y: auto;
}

.lp-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  font-size: 14px;
  cursor: pointer;
}

.lp-checkbox {
  flex-shrink: 0;
}

.lp-code {
  font-family: monospace;
  font-weight: 600;
  flex-shrink: 0;
}

.lp-location {
  font-size: 13px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.lp-actions {
  padding: 14px 16px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.lp-btn-primary {
  padding: 10px;
  border-radius: 10px;
  background: #b91c1c;
  color: #fff;
  font-weight: 600;
  font-size: 14px;
  border: none;
  cursor: pointer;
}

.lp-btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.lp-btn-secondary {
  padding: 10px;
  border-radius: 10px;
  background: #1c2321;
  color: #fff;
  font-weight: 600;
  font-size: 14px;
  border: none;
  cursor: pointer;
}

.lp-preview {
  margin-left: 320px;
  min-height: 100vh;
  padding: 24px;
}

.lp-empty {
  text-align: center;
  margin-top: 60px;
  font-size: 14px;
}

.lp-preview-pages {
  display: flex;
  flex-direction: column;
  gap: 20px;
  align-items: center;
}

/* 舞台：依縮放比例算出實際佔用的顯示尺寸，超出範圍裁掉，並用陰影做出紙張感 */
.lp-preview-stage {
  width: calc(297mm * var(--pv-scale));
  height: calc(210mm * var(--pv-scale));
  overflow: hidden;
  border-radius: 6px;
  box-shadow: 0 1px 6px rgba(0, 0, 0, 0.18);
  background: #fff;
}

/* 頁面：跟 printViaIframe() 產生的 .a4-page 用完全相同的 mm 數值，
   只靠 transform:scale() 整體縮小顯示，確保預覽比例 = 實際列印比例 */
.lp-preview-page {
  width: 297mm;
  height: 210mm;
  padding: 20mm 15mm;
  box-sizing: border-box;
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  grid-template-rows: repeat(2, 1fr);
  background: #fff;
  transform: scale(var(--pv-scale));
  transform-origin: top left;
}

.lp-preview-cell {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  border: 0.5px dashed #bbb;
  padding: 10mm;
  gap: 1mm;
  overflow: hidden;
  box-sizing: border-box;
}

.lp-preview-cell.is-empty {
  border-color: transparent;
}

.lp-preview-qr {
  width: 50mm;
  height: 50mm;
  object-fit: contain;
  display: block;
}

.lp-preview-code {
  font-family: 'Courier New', monospace;
  font-size: 15pt;
  font-weight: 700;
  color: #000;
  text-align: center;
  letter-spacing: 0.04em;
}

.lp-preview-location {
  font-family: 'Noto Serif TC', 'Songti TC', serif;
  font-size: 11pt;
  color: #333;
  text-align: center;
  line-height: 1.2;
}
</style>
