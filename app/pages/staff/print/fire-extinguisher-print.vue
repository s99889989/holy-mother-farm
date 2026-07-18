<script setup>
import {ref, computed, onMounted} from 'vue'

definePageMeta({layout: 'staff', requiredPermission: 'print.fire-extinguisher-print'})

const commonStore = useCommonStore()
const API_BASE = computed(() => commonStore.data.main_url + '/holy/fire-extinguisher')

// 巡檢頁網址前綴：掃碼後會跳去 BASE_URL + 編號
// TODO：等巡檢頁(front/fire-extinguisher/[code].vue)真的做出來後，確認網域是否要換成正式站
const BASE_URL = 'https://holyfarm.netlify.app/front/fire-extinguisher/'
const PER_PAGE = 8 // 4欄 × 2列

const items = ref([])
const loading = ref(true)
const selected = ref({}) // { code: boolean }

async function loadItems() {
  loading.value = true
  try {
    const list = await $fetch(`${API_BASE.value}/list`, {credentials: 'include'})
    items.value = Array.isArray(list) ? list : []
    items.value.forEach((i) => {
      selected.value[i.code] = true
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
  items.value.filter((i) => selected.value[i.code]).length
)

function toggleAll(val) {
  items.value.forEach((i) => {
    selected.value[i.code] = val
  })
}

// ── 預覽資料 ──
const sheets = ref([]) // [[ { code, location, qrDataUrl } | null, ... ], ...]
const generating = ref(false)

async function generate() {
  generating.value = true
  sheets.value = []

  const {default: QRCode} = await import('qrcode')

  const targets = items.value.filter((i) => selected.value[i.code])

  const pages = []
  for (let p = 0; p < Math.ceil(targets.length / PER_PAGE); p++) {
    const pageItems = targets.slice(p * PER_PAGE, (p + 1) * PER_PAGE)
    const cells = await Promise.all(
      pageItems.map(async (item) => {
        const url = BASE_URL + encodeURIComponent(item.code)
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
}

// ── 用 iframe 列印，完全不受 scoped style 干擾 ──
function printViaIframe() {
  const pagesHtml = sheets.value.map((page) => {
    const cellsHtml = page.map((cell) => {
      if (!cell) return `<div class="label-cell empty"></div>`
      return `
        <div class="label-cell">
          <img class="label-qr" src="${cell.qrDataUrl}" alt="${cell.code}" />
          <div class="label-code">${cell.code}</div>
          <div class="label-location">${cell.location}</div>
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
    width: 297mm; height: 210mm; padding: 5mm;
    display: grid; grid-template-columns: repeat(4, 1fr); grid-template-rows: repeat(2, 100mm);
    gap: 0; page-break-after: always; break-after: page; overflow: hidden;
  }
  .label-cell {
    display: flex; flex-direction: column; align-items: center; justify-content: center;
    border: 0.5px dashed #bbb; padding: 3mm 3mm 4mm; gap: 1.5mm; overflow: hidden;
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
  <div class="min-h-full lp-wrap bg-surface2">
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
        <label v-for="item in items" :key="item.code" class="lp-row">
          <input type="checkbox" v-model="selected[item.code]" class="lp-checkbox">
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
      <div v-else class="lp-preview-pages">
        <div v-for="(page, pi) in sheets" :key="pi" class="lp-preview-page bg-surface border-light-c">
          <div v-for="(cell, ci) in page" :key="ci" class="lp-preview-cell border-light-c">
            <template v-if="cell">
              <img :src="cell.qrDataUrl" class="lp-preview-qr">
              <div class="lp-preview-code text-base-c">{{ cell.code }}</div>
              <div class="lp-preview-location text-hint-c">{{ cell.location }}</div>
            </template>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>

<style scoped>
.lp-wrap {
  display: flex;

}

.lp-sidebar {
  width: 320px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  position: sticky;
  top: 0;

  overflow: hidden;
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
  flex: 1;
  padding: 24px;
  overflow-y: auto;
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

.lp-preview-page {
  width: 100%;
  max-width: 900px;
  aspect-ratio: 297 / 210;
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  grid-template-rows: repeat(2, 1fr);
  border: 1px solid;
  border-radius: 8px;
  overflow: hidden;
}

.lp-preview-cell {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  border: 0.5px dashed;
  gap: 3px;
  padding: 6px;
}

.lp-preview-qr {
  width: 50%;
  aspect-ratio: 1;
  object-fit: contain;
}

.lp-preview-code {
  font-family: monospace;
  font-size: 12px;
  font-weight: 700;
}

.lp-preview-location {
  font-size: 10px;
}
</style>
