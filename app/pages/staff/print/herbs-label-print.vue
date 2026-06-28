<script setup>
import {ref, computed} from 'vue'
import {herbSections} from '~/composables/useHerbsData'

definePageMeta({layout: 'staff', requiredPermission: 'staff.herbs-label-print'})
const BASE_URL = 'https://holyfarm.netlify.app/front/herbs/'
const PER_PAGE = 8  // 4欄 × 2列

const qty = ref({})
herbSections.forEach(section => {
  section.herbs.forEach(herb => {
    qty.value[herb.name] = 0
  })
})

const totalCount = computed(() =>
  Object.values(qty.value).reduce((a, b) => a + b, 0)
)
const totalPages = computed(() => Math.ceil(totalCount.value / PER_PAGE))

function changeQty(name, delta) {
  qty.value[name] = Math.max(0, Math.min(99, (qty.value[name] || 0) + delta))
}

function clearAll() {
  Object.keys(qty.value).forEach(k => {
    qty.value[k] = 0
  })
  sheets.value = []
}

// ── 預覽資料 ──
const sheets = ref([])   // [[ { name, qrDataUrl } | null, ... ], ...]
const generating = ref(false)

async function generate() {
  generating.value = true
  sheets.value = []

  const {default: QRCode} = await import('qrcode')

  const labels = []
  herbSections.forEach(section => {
    section.herbs.forEach(herb => {
      for (let i = 0; i < (qty.value[herb.name] || 0); i++) labels.push(herb.name)
    })
  })

  const pages = []
  for (let p = 0; p < Math.ceil(labels.length / PER_PAGE); p++) {
    const pageLabels = labels.slice(p * PER_PAGE, (p + 1) * PER_PAGE)
    const cells = await Promise.all(
      pageLabels.map(async name => {
        const url = BASE_URL + encodeURIComponent(name)
        const qrDataUrl = await QRCode.toDataURL(url, {
          width: 300,
          margin: 1,
          errorCorrectionLevel: 'M',
          color: {dark: '#000000', light: '#ffffff'}
        })
        return {name, qrDataUrl}
      })
    )
    while (cells.length < PER_PAGE) cells.push(null)
    pages.push(cells)
  }

  sheets.value = pages
  generating.value = false
}

// ── 用 iframe 列印，完全不受 scoped style 干擾 ──
function printViaIframe() {
  const pagesHtml = sheets.value.map(page => {
    const cellsHtml = page.map(cell => {
      if (!cell) return `<div class="label-cell empty"></div>`
      return `
        <div class="label-cell">
          <img class="label-qr" src="${cell.qrDataUrl}" alt="${cell.name}" />
          <div class="label-text">${cell.name}</div>
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
    width: 297mm;
    height: 210mm;
    padding: 5mm;
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    grid-template-rows: repeat(2, 100mm);
    gap: 0;
    page-break-after: always;
    break-after: page;
    overflow: hidden;
  }

  .label-cell {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    border: 0.5px dashed #bbb;
    padding: 3mm 3mm 4mm;
    gap: 2mm;
    overflow: hidden;
  }
  .label-cell.empty { border-color: transparent; }

  .label-qr {
    width: 54mm;
    height: 54mm;
    object-fit: contain;
    display: block;
  }

  .label-text {
    font-family: 'Noto Serif TC', 'Songti TC', serif;
    font-size: 18pt;
    font-weight: 700;
    color: #000;
    text-align: center;
    letter-spacing: 0.08em;
    line-height: 1.3;
  }
</style>
</head>
<body>
${pagesHtml}
</body>
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

    <!-- 側邊欄 -->
    <aside class="lp-sidebar bg-surface border-r border-light-c">
      <div class="lp-sidebar-head border-b border-light-c">
        <h1 class="lp-title text-base-c">🌿 植物標籤列印</h1>
        <p class="lp-sub text-hint-c">每張約 71 × 66 mm，每頁 A4 橫排 8 張</p>
      </div>

      <div class="lp-plant-list">
        <template v-for="section in herbSections" :key="section.key">
          <div class="lp-section-label text-muted-c border-b border-light-c bg-surface">{{ section.icon }}
            {{ section.label }}
          </div>
          <div v-for="herb in section.herbs" :key="herb.name" class="lp-row">
            <span class="lp-herb-name text-base-c">{{ herb.name }}</span>
            <div class="lp-qty">
              <button class="lp-btn border-light-c bg-surface2 text-base-c" @click="changeQty(herb.name, -1)">−</button>
              <input
                class="lp-input border-light-c bg-surface text-base-c"
                type="number" min="0" max="99"
                :value="qty[herb.name]"
                @change="qty[herb.name] = Math.max(0, Math.min(99, parseInt($event.target.value) || 0))"
              />
              <button class="lp-btn border-light-c bg-surface2 text-base-c" @click="changeQty(herb.name, 1)">+</button>
            </div>
          </div>
        </template>
      </div>

      <div class="lp-footer border-t border-light-c bg-surface">
        <div class="lp-count-info text-muted-c">
          已選 <strong class="text-base-c">{{ totalCount }}</strong> 張，共 <strong class="text-base-c">{{
            totalPages
          }}</strong> 頁
        </div>
        <!-- 產生預覽 -->
        <button
          class="lp-btn-generate"
          :disabled="totalCount === 0 || generating"
          @click="generate"
        >
          {{ generating ? '產生中…' : '產生預覽' }}
        </button>
        <!-- 列印（只在有預覽時顯示） -->
        <button
          v-if="sheets.length > 0"
          class="lp-btn-print"
          @click="printViaIframe"
        >
          🖨️ 列印
        </button>
        <button class="lp-btn-clear border-light-c text-muted-c" @click="clearAll">清除全部</button>
      </div>
    </aside>

    <!-- 空白提示 -->
    <main class="lp-preview" v-if="sheets.length === 0 && !generating">
      <div class="lp-empty text-muted-c">
        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#3d7a52" stroke-width="1.2">
          <rect x="3" y="3" width="7" height="7" rx="1"/>
          <rect x="14" y="3" width="7" height="7" rx="1"/>
          <rect x="3" y="14" width="7" height="7" rx="1"/>
          <path d="M14 14h2v2h-2zM16 16h2v2h-2zM14 18v2M18 14v2M18 18h2"/>
        </svg>
        <p>設定每種植物的數量<br>點「產生預覽」確認後再列印</p>
      </div>
    </main>

    <!-- 螢幕預覽（僅供確認，不會直接列印） -->
    <div class="lp-sheets-area" v-if="sheets.length > 0">
      <div v-for="(page, pi) in sheets" :key="pi" class="a4-page">
        <div
          v-for="(cell, ci) in page"
          :key="ci"
          class="label-cell"
          :class="{ empty: !cell }"
        >
          <template v-if="cell">
            <img class="label-qr" :src="cell.qrDataUrl" :alt="`${cell.name} QR Code`"/>
            <div class="label-text">{{ cell.name }}</div>
          </template>
        </div>
      </div>
    </div>

  </div>
</template>

<style scoped>
*, *::before, *::after {
  box-sizing: border-box;
}

.lp-wrap {
  display: flex;
  min-height: 100%;
}

/* ── 側邊欄 ── */
.lp-sidebar {
  width: 260px;
  min-width: 260px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  height: calc(100vh - var(--nav-height, 44px));
  position: sticky;
  top: 0;
  overflow: hidden;
}

.lp-sidebar-head {
  padding: 12px 16px;
  flex-shrink: 0;
}

.lp-title {
  font-size: 15px;
  font-weight: 700;
  margin: 0 0 2px;
  line-height: 1;
}

.lp-sub {
  font-size: 11px;
  margin: 0;
}

.lp-plant-list {
  flex: 1;
  overflow-y: auto;
  padding: 4px 0;
}

.lp-section-label {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.05em;
  padding: 8px 10px 4px;
  margin-bottom: 2px;
  position: sticky;
  top: 0;
  z-index: 1;
}

.lp-row {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  font-size: 12px;
  transition: background 0.1s;
}

.lp-row:hover {
  background: rgba(128, 128, 128, .08);
}

.lp-herb-name {
  flex: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.lp-qty {
  display: flex;
  align-items: center;
  gap: 2px;
}

.lp-btn {
  width: 18px;
  height: 18px;
  border-radius: 3px;
  border: 1px solid;
  font-size: 13px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.1s;
  flex-shrink: 0;
  padding: 0;
  line-height: 1;
}

.lp-btn:hover {
  background: rgba(128, 128, 128, .15);
}

.lp-input {
  width: 36px;
  text-align: center;
  border: 1px solid;
  border-radius: 3px;
  font-size: 11px;
  font-weight: bold;
  padding: 2px 0;
}

.lp-input:focus {
  outline: none;
  border-color: #64748b;
}

.lp-input::-webkit-inner-spin-button,
.lp-input::-webkit-outer-spin-button {
  -webkit-appearance: none;
}

.lp-input {
  -moz-appearance: textfield;
}

.lp-footer {
  padding: 10px 12px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  flex-shrink: 0;
}

.lp-count-info {
  font-size: 12px;
  text-align: center;
}

.lp-btn-generate {
  background: #475569;
  color: #fff;
  border: none;
  border-radius: 8px;
  padding: 8px;
  font-size: 12px;
  font-weight: bold;
  cursor: pointer;
  transition: background 0.15s;
}

.lp-btn-generate:hover:not(:disabled) {
  background: #334155;
}

.lp-btn-generate:disabled {
  opacity: 0.4;
  cursor: default;
}

.lp-btn-print {
  background: #dc2626;
  color: #fff;
  border: none;
  border-radius: 8px;
  padding: 8px 14px;
  font-size: 12px;
  font-weight: bold;
  cursor: pointer;
  transition: background 0.15s;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
}

.lp-btn-print:hover {
  background: #b91c1c;
}

.lp-btn-clear {
  background: transparent;
  border: 1px solid;
  border-radius: 8px;
  padding: 5px;
  font-size: 11px;
  cursor: pointer;
  transition: all 0.12s;
}

.lp-btn-clear:hover {
  background: #fdecea;
  color: #b91c1c;
  border-color: #fca5a5;
}

/* ── 空白提示 ── */
.lp-preview {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}

.lp-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  font-size: 13px;
  text-align: center;
  line-height: 1.7;
  opacity: 0.6;
}

/* ── 螢幕預覽區（A4 紙張固定白底，不跟主題走） ── */
.lp-sheets-area {
  flex: 1;
  padding: 16px;
  overflow-y: auto;
  overflow-x: hidden;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.a4-page {
  width: 297mm;
  height: 210mm;
  padding: 5mm;
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  grid-template-rows: repeat(2, 100mm);
  gap: 0;
  background: #fff;
  box-shadow: 0 4px 32px rgba(0, 0, 0, 0.45);
  margin-bottom: 1.5rem;
  overflow: hidden;
}

.label-cell {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  border: 0.5px dashed #bbb;
  padding: 3mm 3mm 4mm;
  gap: 2mm;
  overflow: hidden;
}

.label-cell.empty {
  border-color: transparent;
}

.label-qr {
  width: 54mm;
  height: 54mm;
  object-fit: contain;
  display: block;
  flex-shrink: 0;
}

.label-text {
  font-family: 'Noto Serif TC', 'Songti TC', '宋體', serif;
  font-size: 16pt;
  font-weight: 700;
  color: #000;
  text-align: center;
  letter-spacing: 0.08em;
  line-height: 1.3;
}

/* 列印時完全隱藏頁面，由 iframe 負責 */
@media print {
  * {
    display: none !important;
  }
}

@media (max-width: 768px) {
  .lp-wrap {
    flex-direction: column;
  }

  /* 側邊欄：限制高度讓植物列表可以滾動，footer 固定在底部 */
  .lp-sidebar {
    width: 100%;
    max-height: 55vh;
    min-height: 0;
    height: auto;
    position: static;
    overflow: hidden;
  }

  .lp-sidebar-head {
    padding: 10px 14px;
  }

  /* 讓植物列表在側邊欄內滾動 */
  .lp-plant-list {
    flex: 1;
    overflow-y: auto;
    -webkit-overflow-scrolling: touch;
  }

  /* 每一行植物：加大觸控高度 */
  .lp-row {
    padding: 7px 12px;
    font-size: 14px;
    gap: 8px;
  }

  /* −/+ 按鈕加大為易於手指點擊 */
  .lp-btn {
    width: 32px;
    height: 32px;
    border-radius: 6px;
    font-size: 18px;
  }

  /* 數量 input 加寬加高 */
  .lp-input {
    width: 44px;
    height: 32px;
    font-size: 14px;
  }

  /* footer 按鈕加大 */
  .lp-btn-generate,
  .lp-btn-print,
  .lp-btn-clear {
    font-size: 14px;
    padding: 10px;
  }

  .lp-count-info {
    font-size: 13px;
  }

  /* 預覽區 */
  .lp-sheets-area {
    padding: 0.75rem;
  }

  .a4-page {
    width: 100%;
    height: auto;
    grid-template-columns: repeat(2, 1fr);
    grid-template-rows: auto;
  }

  .label-cell {
    height: auto;
    min-height: 44vw;
    padding: 2vw;
    gap: 1.5vw;
  }

  .label-qr {
    width: 26vw;
    height: 26vw;
  }

  .label-text {
    font-size: 4.5vw;
  }
}
</style>
