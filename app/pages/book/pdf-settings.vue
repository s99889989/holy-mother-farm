<template>
  <div class="p-4 max-w-screen-xl mx-auto text-sm text-stone-800 dark:text-stone-200">
    <div class="text-base font-bold text-gray-700 dark:text-stone-300 mb-4">PDF 托運單樣式設定</div>

    <div class="grid grid-cols-1 xl:grid-cols-2 gap-6">

      <!-- ══════════════ 左欄：設定 ══════════════ -->
      <div class="space-y-5">

        <!-- 全域設定 -->
        <div class="border border-stone-200 dark:border-stone-700 rounded-md overflow-hidden">
          <div class="bg-teal-600 dark:bg-teal-800 text-white px-4 py-2 font-bold text-sm">全域設定</div>
          <div class="p-4 bg-white dark:bg-zinc-800 space-y-3">

            <div class="flex items-center gap-3">
              <label class="w-52 text-stone-600 dark:text-stone-400 shrink-0">框線粗細 BORDER_WIDTH</label>
              <input type="range" v-model.number="settings.borderWidth" min="0.1" max="1.5" step="0.05" class="flex-1" />
              <span class="w-16 text-right font-mono text-xs">{{ settings.borderWidth.toFixed(2) }} pt</span>
            </div>

            <div class="flex items-center gap-3">
              <label class="w-52 text-stone-600 dark:text-stone-400 shrink-0">條碼粗細 BAR_SCALE</label>
              <input type="range" v-model.number="settings.barScale" min="0.4" max="1.2" step="0.05" class="flex-1" />
              <span class="w-16 text-right font-mono text-xs">{{ settings.barScale.toFixed(2) }}</span>
            </div>

            <div class="flex items-center gap-3">
              <label class="w-52 text-stone-600 dark:text-stone-400 shrink-0">地址欄換行縮減</label>
              <input type="range" v-model.number="settings.wrapReduce" min="0" max="30" step="1" class="flex-1" />
              <span class="w-16 text-right font-mono text-xs">{{ settings.wrapReduce }} mm</span>
            </div>

          </div>
        </div>

        <!-- 字體大小微調 -->
        <div class="border border-stone-200 dark:border-stone-700 rounded-md overflow-hidden">
          <div class="bg-teal-600 dark:bg-teal-800 text-white px-4 py-2 font-bold text-sm">欄位字體大小微調（pt）</div>
          <div class="p-4 bg-white dark:bg-zinc-800">

            <!-- Zone tabs -->
            <div class="flex gap-2 mb-4 flex-wrap">
              <button
                v-for="z in zones" :key="z.key"
                @click="activeZone = z.key"
                :class="[
                  'px-3 py-1 rounded text-xs border transition-colors',
                  activeZone === z.key
                    ? 'bg-teal-600 text-white border-teal-600'
                    : 'bg-white dark:bg-zinc-700 border-stone-300 dark:border-stone-600 text-stone-600 dark:text-stone-400 hover:bg-stone-50 dark:hover:bg-zinc-600'
                ]"
              >{{ z.label }}</button>
            </div>

            <!-- Fields for active zone -->
            <div class="space-y-1.5 max-h-80 overflow-y-auto pr-1">
              <div v-for="f in FIELDS" :key="f.key" class="flex items-center gap-2">
                <label class="w-44 text-xs text-stone-500 dark:text-stone-400 shrink-0">{{ f.label }}</label>
                <input
                  type="range"
                  :value="settings.fontAdjust[activeZone][f.key]"
                  @input="settings.fontAdjust[activeZone][f.key] = +($event.target as HTMLInputElement).value"
                  min="-4" max="6" step="0.5"
                  class="flex-1"
                />
                <span class="w-10 text-right font-mono text-xs"
                      :class="settings.fontAdjust[activeZone][f.key] > 0 ? 'text-teal-600' : settings.fontAdjust[activeZone][f.key] < 0 ? 'text-red-500' : 'text-stone-400'"
                >{{ settings.fontAdjust[activeZone][f.key] > 0 ? '+' : '' }}{{ settings.fontAdjust[activeZone][f.key] }}</span>
              </div>
            </div>

          </div>
        </div>

        <!-- 產生程式碼 -->
        <div class="border border-stone-200 dark:border-stone-700 rounded-md overflow-hidden">
          <div class="bg-stone-100 dark:bg-zinc-700 px-4 py-2 flex items-center justify-between">
            <span class="font-bold text-sm text-stone-700 dark:text-stone-300">產生程式碼</span>
            <button @click="copyCode"
                    class="text-xs px-3 py-1 rounded bg-stone-200 dark:bg-zinc-600 hover:bg-stone-300 dark:hover:bg-zinc-500 text-stone-700 dark:text-stone-200">
              {{ copied ? '✅ 已複製' : '📋 複製' }}
            </button>
          </div>
          <pre class="p-4 text-xs font-mono bg-zinc-900 text-green-300 overflow-x-auto max-h-64 overflow-y-auto whitespace-pre-wrap">{{ generatedCode }}</pre>
        </div>

      </div>

      <!-- ══════════════ 右欄：預覽 ══════════════ -->
      <div class="space-y-4">
        <div class="border border-stone-200 dark:border-stone-700 rounded-md overflow-hidden">
          <div class="bg-teal-600 dark:bg-teal-800 text-white px-4 py-2 font-bold text-sm">PDF 預覽</div>
          <div class="p-4 bg-white dark:bg-zinc-800 space-y-3">

            <!-- 搜尋列表 -->
            <div class="flex gap-2 items-center">
              <input
                v-model="listKeyword"
                type="text"
                placeholder="姓名 / 電話 / 託運單號搜尋"
                class="flex-1 border border-stone-300 dark:border-stone-600 rounded px-2 py-1 text-xs bg-white dark:bg-zinc-700"
                @keyup.enter="loadWaybills"
              />
              <button @click="loadWaybills" class="px-3 py-1 rounded bg-stone-200 dark:bg-zinc-600 hover:bg-stone-300 text-xs text-stone-700 dark:text-stone-200">搜尋</button>
            </div>

            <!-- 列表 -->
            <div class="border border-stone-200 dark:border-stone-700 rounded overflow-auto max-h-48">
              <table class="w-full text-xs">
                <thead class="bg-stone-100 dark:bg-zinc-700 sticky top-0">
                <tr>
                  <th class="px-2 py-1 w-6">
                    <input type="checkbox" @change="toggleAllWaybills" :checked="allWaybillsChecked" />
                  </th>
                  <th class="px-2 py-1 text-left text-stone-600 dark:text-stone-400">ID</th>
                  <th class="px-2 py-1 text-left text-stone-600 dark:text-stone-400">託運單號</th>
                  <th class="px-2 py-1 text-left text-stone-600 dark:text-stone-400">收件人</th>
                  <th class="px-2 py-1 text-left text-stone-600 dark:text-stone-400">紙張</th>
                </tr>
                </thead>
                <tbody>
                <tr v-if="!waybills.length">
                  <td colspan="5" class="px-3 py-4 text-center text-stone-400">{{ waybillsLoading ? '載入中...' : '無資料，請先搜尋' }}</td>
                </tr>
                <tr v-for="w in waybills" :key="w.id"
                    class="border-t border-stone-100 dark:border-stone-700 hover:bg-blue-50 dark:hover:bg-zinc-700 cursor-pointer"
                    :class="{ 'bg-blue-50 dark:bg-zinc-700': selectedWaybillIds.includes(w.id) }"
                    @click="toggleWaybill(w.id)"
                >
                  <td class="px-2 py-1 text-center">
                    <input type="checkbox" :checked="selectedWaybillIds.includes(w.id)" @click.stop="toggleWaybill(w.id)" />
                  </td>
                  <td class="px-2 py-1 text-stone-500">{{ w.id }}</td>
                  <td class="px-2 py-1 font-mono text-blue-600 dark:text-blue-400">{{ w.tracking_no }}</td>
                  <td class="px-2 py-1">{{ w.customer_name }}</td>
                  <td class="px-2 py-1 text-stone-500">{{ w.paper_id }}</td>
                </tr>
                </tbody>
              </table>
            </div>

            <!-- 預覽控制 -->
            <div class="flex gap-2 items-center flex-wrap">
              <span class="text-xs text-stone-500">已選 {{ selectedWaybillIds.length }} 筆</span>
              <div class="flex items-center gap-1 ml-auto">
                <label class="text-xs text-stone-500">paper_id</label>
                <input v-model.number="previewPaperId" type="number"
                       class="w-14 border border-stone-300 dark:border-stone-600 rounded px-2 py-1 text-xs bg-white dark:bg-zinc-700" />
              </div>
              <button
                @click="previewPDF"
                :disabled="previewing || !selectedWaybillIds.length"
                class="px-4 py-1.5 rounded bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white text-xs"
              >{{ previewing ? '產生中...' : '▶ 預覽' }}</button>
            </div>

            <div v-if="previewError" class="text-red-500 text-xs">{{ previewError }}</div>

            <div v-if="previewUrl" class="space-y-2">
              <a :href="previewUrl" target="_blank"
                 class="inline-block text-xs px-3 py-1 rounded bg-stone-200 dark:bg-zinc-600 hover:bg-stone-300 dark:hover:bg-zinc-500 text-stone-700 dark:text-stone-200">
                ↗ 開新分頁查看（可自由縮放）
              </a>
              <iframe
                :src="previewUrl"
                class="w-full rounded border border-stone-200 dark:border-stone-700"
                style="height: calc(100vh - 300px); min-height: 700px;"
              />
            </div>
            <div v-else class="flex items-center justify-center border border-dashed border-stone-300 dark:border-stone-600 rounded text-stone-400 dark:text-stone-500 text-sm" style="height:120px">
              勾選託運單後按「預覽」
            </div>

          </div>
        </div>
      </div>

    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed } from 'vue'

// ── 欄位定義 ─────────────────────────────────────────────────
const FIELDS = [
  { key: 'send_date_dash',              label: '收貨日' },
  { key: 'deliver_date_dash',           label: '希望配達日' },
  { key: 'deliver_date_dash_mmdd',      label: '希望配達日 MM/DD' },
  { key: 'deliver_time_name',           label: '希望配達時段' },
  { key: 'tracking_no_dash',            label: '託運單號' },
  { key: 'convert_order_no',            label: '客代單號' },
  { key: 'order_no',                    label: '訂單編號' },
  { key: 'base_customer_postcode',      label: '收件人郵遞區號（地址前）' },
  { key: 'customer_name',               label: '收件人姓名' },
  { key: 'full_customer_name_star',     label: '收件人姓名（遮碼）' },
  { key: 'full_customer_address',       label: '收件人地址' },
  { key: 'full_customer_phone',         label: '收件人電話' },
  { key: 'full_customer_phone_star',    label: '收件人電話（遮碼）' },
  { key: 'sender_name',                 label: '寄件人姓名' },
  { key: 'full_sender_address',         label: '寄件人地址' },
  { key: 'full_sender_phone',           label: '寄件人電話' },
  { key: 'production_name',             label: '品名' },
  { key: 'production_kind',             label: '品名種類' },
  { key: 'price_or_not',                label: '代收貨款' },
  { key: 'package_size_name',           label: '尺寸' },
  { key: 'temperature_character_one',   label: '溫層第一字' },
  { key: 'temperature_character_two',   label: '溫層第二字' },
  { key: 'ezcat_version',               label: 'EZCAT版本' },
  { key: 'basename',                    label: '郵遞區號前2碼' },
  { key: 'comment',                     label: '備註' },
  { key: 'webservice_login',            label: '寄件人代碼' },
]

const zones = [
  { key: 'LT', label: 'LT 黏貼聯' },
  { key: 'RT', label: 'RT 配送聯' },
  { key: 'LB', label: 'LB 收據聯' },
  { key: 'RB', label: 'RB 配送聯下半' },
]

// 初始化所有區塊欄位為 0
function initZoneMap() {
  const m: Record<string, number> = {}
  FIELDS.forEach(f => { m[f.key] = 0 })
  return m
}

// ── 狀態 ─────────────────────────────────────────────────────
const activeZone = ref('LT')

const settings = reactive({
  borderWidth: 0.4,
  barScale:    0.75,
  wrapReduce:  10,
  fontAdjust: {
    LT: initZoneMap(),
    RT: initZoneMap(),
    LB: initZoneMap(),
    RB: initZoneMap(),
  } as Record<string, Record<string, number>>,
})

// ── 預覽 ─────────────────────────────────────────────────────
const listKeyword        = ref('')
const waybills           = ref<any[]>([])
const waybillsLoading    = ref(false)
const selectedWaybillIds = ref<number[]>([])
const previewPaperId     = ref(2)
const previewing         = ref(false)
const previewUrl         = ref('')
const previewError       = ref('')

const allWaybillsChecked = computed(() =>
  waybills.value.length > 0 && waybills.value.every(w => selectedWaybillIds.value.includes(w.id))
)

async function loadWaybills() {
  waybillsLoading.value = true
  try {
    const data = await $fetch<any>('/api/waybills', {
      query: { keyword: listKeyword.value, page: 1, limit: 20 }
    })
    waybills.value = data?.rows ?? []
    selectedWaybillIds.value = []
  } catch { waybills.value = [] }
  finally { waybillsLoading.value = false }
}

function toggleWaybill(id: number) {
  const idx = selectedWaybillIds.value.indexOf(id)
  if (idx >= 0) selectedWaybillIds.value.splice(idx, 1)
  else selectedWaybillIds.value.push(id)
}

function toggleAllWaybills(e: Event) {
  const checked = (e.target as HTMLInputElement).checked
  selectedWaybillIds.value = checked ? waybills.value.map(w => w.id) : []
}

async function previewPDF() {
  if (!selectedWaybillIds.value.length) return
  previewing.value   = true
  previewError.value = ''
  if (previewUrl.value?.startsWith('blob:')) URL.revokeObjectURL(previewUrl.value)
  previewUrl.value   = ''
  try {
    const res = await $fetch<Blob>('/api/waybills/generate-pdf', {
      method: 'POST',
      body: { ids: selectedWaybillIds.value, paper_id: previewPaperId.value },
      responseType: 'blob',
    })
    previewUrl.value = URL.createObjectURL(res)
  } catch (e: any) {
    previewError.value = e?.data?.message ?? e?.statusMessage ?? '產生 PDF 失敗'
  } finally {
    previewing.value = false
  }
}

// ── 產生程式碼 ────────────────────────────────────────────────
const copied = ref(false)

const generatedCode = computed(() => {
  const fa = settings.fontAdjust
  let fontLines = ''
  zones.forEach(z => {
    fontLines += `\n      // ${z.key}：${z.label}\n`
    FIELDS.forEach(f => {
      const v = fa[z.key][f.key]
      const sign = v > 0 ? '+' : v === 0 ? ' ' : ''
      fontLines += `      '${z.key}:${f.key}': ${sign}${v},\n`
    })
  })

  return `// ── 全域樣式設定（貼入 generate-pdf_post.ts 頂部）──
const BORDER_WIDTH = ${settings.borderWidth.toFixed(2)}
const BAR_SCALE    = ${settings.barScale.toFixed(2)}

// ── FONT_ADJUST（貼入 drawData 函數內文字區段）──
const FONT_ADJUST: Record<string, number> = {${fontLines}}

// ── WRAP_WIDTH_REDUCE（貼入 drawData 函數內換行區段）──
const WRAP_WIDTH_REDUCE: Record<string, number> = {
  'full_customer_address':  ${settings.wrapReduce},
  'full_sender_address':    ${settings.wrapReduce},
  'base_customer_postcode': ${settings.wrapReduce},
}`
})

async function copyCode() {
  await navigator.clipboard.writeText(generatedCode.value)
  copied.value = true
  setTimeout(() => { copied.value = false }, 2000)
}
</script>
