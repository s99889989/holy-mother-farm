<script setup>
import { reactive, ref, computed, onMounted } from 'vue'

// dc-erp「設定」頁——統一調整訂貨單/銷貨單/品項/進階品項管理四個列表頁
// 的顯示方式（列表/卡片）跟每頁筆數，純前端 localStorage（key:
// dc-erp-list-settings），不影響 COAERP 任何資料。四個列表頁自己不再有
// 切換鈕，只在載入時讀這裡存的設定，要改都回這頁改。
//
// 「設置所屬類別」原本放在「進階品項管理」頁的批次工具區塊，搬過來這裡
// 跟其他全域設定放一起，邏輯完全沒變（直打 Spring Boot 的
// DcErpProductImageController，逐頁掃 /api/dc-erp/products 收集代號+
// 所屬類別，分批 POST /sync-classes 寫進 product_images.yml）。
//
// 「自動化：簽核並轉銷＋列印下載」是新增區塊——針對設定的客戶，一次做完
// 查未簽核訂貨單→簽核→轉銷→在銷貨單找對應單→下載 PDF（中一刀-半長）。
// 邏輯在 server/utils/dc-erp/automation.ts，目前只能手動按「立即執行」
// 觸發，還沒有能力自己登入 COAERP（人工圖形驗證碼擋著），所以做不到真正
// 排程的「週一早上 8 點自動觸發」，見下方區塊裡的說明文字。
definePageMeta({
  layout: 'staff',
  requiredPermission: 'order.dc-erp'
})

const LIST_SETTINGS_KEY = 'dc-erp-list-settings'
const LISTS = [
  { key: 'salesOrders', label: '訂貨單' },
  { key: 'salesSlips', label: '銷貨單' },
  { key: 'products', label: '品項' },
  { key: 'productImages', label: '進階品項管理' },
  { key: 'orderDetail', label: '訂單明細（訂貨單/銷貨單編輯頁的明細 Grid）', hasPagesize: false, defaultViewMode: 'card' },
  { key: 'productSearch', label: '新增商品（訂貨單/銷貨單「新增商品」搜尋結果）', hasPagesize: false }
]
const DEFAULTS = { pagesize: 20, viewMode: 'table' }

const settings = reactive(
  Object.fromEntries(LISTS.map(({ key, defaultViewMode }) => [key, { ...DEFAULTS, ...(defaultViewMode ? { viewMode: defaultViewMode } : {}) }]))
)

function loadSettings() {
  try {
    const raw = window.localStorage.getItem(LIST_SETTINGS_KEY)
    const all = raw ? JSON.parse(raw) : {}
    for (const { key, defaultViewMode } of LISTS) {
      const base = { ...DEFAULTS, ...(defaultViewMode ? { viewMode: defaultViewMode } : {}) }
      settings[key] = { ...base, ...(all[key] || {}) }
    }
  } catch {
    // 讀不到就維持預設值
  }
}

function persist() {
  window.localStorage.setItem(LIST_SETTINGS_KEY, JSON.stringify(settings))
}

const toast = reactive({ show: false, message: '' })
function showToast(message) {
  toast.message = message
  toast.show = true
  setTimeout(() => { toast.show = false }, 2000)
}

function updateSetting(key, patch) {
  Object.assign(settings[key], patch)
  persist()
  showToast('已儲存，下次打開該頁面就會套用')
}

function onPagesizeChange(key, value) {
  const n = Math.min(200, Math.max(1, parseInt(value, 10) || DEFAULTS.pagesize))
  updateSetting(key, { pagesize: n })
}

// ── 設置所屬類別（原本在「進階品項管理」，邏輯不變）────────────────
const commonStore = useCommonStore()
const BASE = commonStore.data.main_url + '/holy/dc-erp/product-image'

const fetchWithTimeout = (url, options = {}, ms = 8000) => {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), ms)
  return fetch(url, { ...options, signal: controller.signal }).finally(() => clearTimeout(timer))
}

const syncingClass = ref(false)
const syncClassProgress = ref('')
const lastSyncedAt = ref('')

async function loadLastSynced() {
  try {
    const res = await fetchWithTimeout(`${BASE}/last-synced`)
    const data = await res.json()
    lastSyncedAt.value = data.lastSyncedAt || ''
  } catch {
    lastSyncedAt.value = ''
  }
}
const lastSyncedDisplay = computed(() => {
  if (!lastSyncedAt.value) return '尚未同步過'
  const d = new Date(lastSyncedAt.value)
  return isNaN(d.getTime()) ? '尚未同步過' : d.toLocaleString('zh-TW', { hour12: false })
})

async function syncAllProductClasses() {
  if (syncingClass.value) return
  if (!confirm('會查詢 COAERP 全部品項並把「所屬類別」存到本地設定檔，品項數量較多（4000+ 筆）可能需要一點時間，確定要開始嗎？')) return

  syncingClass.value = true
  syncClassProgress.value = '查詢頁數中…'
  const SYNC_PAGESIZE = 200
  const baseQuery = { whSearch: 'whatever', keyword: '', selectDisable: 'whatever', pagesize: SYNC_PAGESIZE }

  try {
    const first = await $fetch('/api/dc-erp/products', { query: { page: 1, ...baseQuery } })
    const totalSyncPages = first.totalPages || 1
    const collected = first.items
      .filter(it => it.code)
      .map(it => ({ code: it.code, productClass: it.productClass || '' }))

    for (let p = 2; p <= totalSyncPages; p++) {
      syncClassProgress.value = `查詢中（${p} / ${totalSyncPages} 頁）…`
      const data = await $fetch('/api/dc-erp/products', { query: { page: p, ...baseQuery } })
      collected.push(...data.items.filter(it => it.code).map(it => ({ code: it.code, productClass: it.productClass || '' })))
    }

    const CHUNK = 500
    let updated = 0
    for (let i = 0; i < collected.length; i += CHUNK) {
      syncClassProgress.value = `寫入中（${Math.min(i + CHUNK, collected.length)} / ${collected.length}）…`
      const chunk = collected.slice(i, i + CHUNK)
      const res = await fetchWithTimeout(
        `${BASE}/sync-classes`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json;charset=UTF-8' },
          body: JSON.stringify(chunk)
        },
        20000
      )
      const result = await res.json()
      updated += result.updated || 0
    }

    showToast(`已設定 ${updated.toLocaleString()} 筆品項的所屬類別`)
    await loadLastSynced()
  } catch (e) {
    console.error(e)
    showToast('設置失敗，請稍後再試')
  } finally {
    syncingClass.value = false
    syncClassProgress.value = ''
  }
}

// ── 自動化：簽核並轉銷＋列印下載 ─────────────────────────────────
const automationCustomers = ref([])
const newCustomerCode = ref('')
const newCustomerLabel = ref('')
const automationRunning = ref('') // 目前執行中的客戶代號，'' = 無
const automationResults = reactive({}) // firmCode -> 這次執行/預覽的結果
const automationError = reactive({}) // firmCode -> 錯誤訊息

async function loadAutomationCustomers() {
  try {
    const data = await $fetch('/api/dc-erp/automation/config')
    automationCustomers.value = data.customers || []
  } catch {
    // 讀不到就先當空清單，不擋頁面其他功能
  }
}

async function saveAutomationCustomers() {
  try {
    const data = await $fetch('/api/dc-erp/automation/config', {
      method: 'POST',
      body: { customers: automationCustomers.value }
    })
    automationCustomers.value = data.customers
  } catch {
    showToast('客戶清單儲存失敗，請稍後再試')
  }
}

function addAutomationCustomer() {
  const firmCode = newCustomerCode.value.trim()
  if (!firmCode) return
  automationCustomers.value.push({
    id: crypto.randomUUID(),
    firmCode,
    label: newCustomerLabel.value.trim() || firmCode,
    enabled: true
  })
  newCustomerCode.value = ''
  newCustomerLabel.value = ''
  saveAutomationCustomers()
}

function removeAutomationCustomer(id) {
  automationCustomers.value = automationCustomers.value.filter((c) => c.id !== id)
  saveAutomationCustomers()
}

async function runAutomation(customer, dryRun) {
  automationRunning.value = customer.firmCode
  automationError[customer.firmCode] = ''
  try {
    const data = await $fetch('/api/dc-erp/automation/run-customer', {
      method: 'POST',
      body: { firmCode: customer.firmCode, dryRun }
    })
    automationResults[customer.firmCode] = data
  } catch (e) {
    automationError[customer.firmCode] = e?.data?.statusMessage || e?.message || '執行失敗，請稍後再試'
  } finally {
    automationRunning.value = ''
  }
}

function downloadHref(fileName) {
  return `/api/dc-erp/automation/download?file=${encodeURIComponent(fileName)}`
}

onMounted(() => {
  loadSettings()
  loadLastSynced()
  loadAutomationCustomers()
})
</script>

<template>
  <div class="p-4">
    <DcErpShell>
      <div class="space-y-4 p-4">
        <!-- 列表顯示設定 -->
        <div class="rounded-xl border border-light-c bg-surface p-4 text-sm">
          <div class="mb-1 font-medium text-base-c">列表顯示設定</div>
          <p class="mb-3 text-xs text-hint-c">
            只影響這台瀏覽器上這幾個頁面的顯示方式（部分有每頁筆數可調），純前端記憶，不會送到伺服器，不影響其他人。
          </p>
          <div class="space-y-3">
            <div
              v-for="list in LISTS"
              :key="list.key"
              class="flex flex-wrap items-center gap-3 border-t border-light-c pt-3 first:border-t-0 first:pt-0"
            >
              <span class="w-28 shrink-0 font-medium text-base-c">{{ list.label }}</span>

              <label class="text-muted-c">顯示方式：</label>
              <select
                :value="settings[list.key].viewMode"
                class="rounded border border-light-c bg-surface px-2 py-1"
                @change="updateSetting(list.key, { viewMode: $event.target.value })"
              >
                <option value="table">列表</option>
                <option value="card">卡片</option>
              </select>

              <template v-if="list.hasPagesize !== false">
                <label class="ml-2 text-muted-c">每頁筆數：</label>
                <input
                  type="number"
                  min="1"
                  max="200"
                  :value="settings[list.key].pagesize"
                  class="w-20 rounded border border-light-c bg-surface px-2 py-1"
                  @change="onPagesizeChange(list.key, $event.target.value)"
                >
              </template>
            </div>
          </div>
        </div>

        <!-- 設置所屬類別 -->
        <div class="rounded-xl border border-light-c bg-surface p-4 text-sm">
          <div class="mb-1 font-medium text-base-c">
            設置所屬類別
            <span class="ml-2 text-xs font-normal text-hint-c">（上次同步：{{ lastSyncedDisplay }}）</span>
          </div>
          <button
            class="mt-2 rounded bg-green-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-800 disabled:opacity-50"
            :disabled="syncingClass"
            @click="syncAllProductClasses"
          >
            {{ syncingClass ? syncClassProgress : '設置所屬類別' }}
          </button>
          <p class="mt-2 text-xs text-hint-c">
            會查詢 COAERP 全部品項（依總筆數自動分頁抓取），把每筆的「所屬類別」存進本地設定檔（跟圖片綁定同一份 product_images.yml，見「進階品項管理」）。只是把類別資料快取起來，不會改動 COAERP 任何資料，也不會動到已經上傳的圖片。COAERP 的品項偶爾會新增/調整類別，這份快取不會自動更新，建議隔一段時間（例如每次大量新增品項後）手動按一次。
          </p>
        </div>

        <!-- 自動化：簽核並轉銷＋列印下載 -->
        <div class="rounded-xl border border-light-c bg-surface p-4 text-sm">
          <div class="mb-1 font-medium text-base-c">自動化：簽核並轉銷＋列印下載</div>
          <p class="mb-3 text-xs text-hint-c">
            針對下面設定的客戶，一次做完「查未簽核訂貨單 → 簽核 → 轉銷 → 在銷貨單找對應單 → 下載 PDF（中一刀-半長）」。
          </p>
          <p class="mb-3 rounded-lg border border-amber-200 bg-amber-50 p-2 text-xs text-amber-700">
            目前只能手動按「立即執行」觸發：COAERP 登入需要人工輸入圖形驗證碼，這裡還沒有自動登入的能力，做不到真正排程的「週一早上 8 點自動觸發」——要先確保這台瀏覽器已經登入過 dc-erp、session 還沒過期（目前存活 2 小時），才能執行成功。等自動登入的方式確定了，才會接上真正的排程。
          </p>

          <!-- 新增客戶 -->
          <div class="mb-3 flex flex-wrap items-center gap-2 border-b border-light-c pb-3">
            <input
              v-model="newCustomerCode"
              type="text"
              placeholder="客戶代號（例如 127）"
              class="w-40 rounded border border-light-c bg-surface px-2 py-1"
            >
            <input
              v-model="newCustomerLabel"
              type="text"
              placeholder="備註名稱（選填）"
              class="w-40 rounded border border-light-c bg-surface px-2 py-1"
            >
            <button
              class="rounded bg-accent-solid px-3 py-1.5 text-xs font-medium text-white"
              @click="addAutomationCustomer"
            >
              新增客戶
            </button>
          </div>

          <p v-if="!automationCustomers.length" class="text-xs text-hint-c">尚未設定任何客戶。</p>

          <div
            v-for="customer in automationCustomers"
            :key="customer.id"
            class="mb-3 rounded-lg border border-light-c p-3 last:mb-0"
          >
            <div class="flex flex-wrap items-center gap-2">
              <label class="flex items-center gap-1">
                <input
                  v-model="customer.enabled"
                  type="checkbox"
                  @change="saveAutomationCustomers"
                >
                <span class="text-xs text-muted-c">啟用</span>
              </label>
              <span class="font-medium text-base-c">{{ customer.label }}</span>
              <span class="text-xs text-hint-c">（客戶代號：{{ customer.firmCode }}）</span>
              <button
                class="ml-auto text-xs text-red-600 hover:underline"
                @click="removeAutomationCustomer(customer.id)"
              >
                刪除
              </button>
            </div>

            <div class="mt-2 flex flex-wrap gap-2">
              <button
                class="rounded border border-light-c px-3 py-1.5 text-xs font-medium hover:bg-surface2 disabled:opacity-50"
                :disabled="automationRunning === customer.firmCode"
                @click="runAutomation(customer, true)"
              >
                {{ automationRunning === customer.firmCode ? '查詢中…' : '預覽（只查未簽核，不動作）' }}
              </button>
              <button
                class="rounded bg-green-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-800 disabled:opacity-50"
                :disabled="automationRunning === customer.firmCode"
                @click="runAutomation(customer, false)"
              >
                {{ automationRunning === customer.firmCode ? '執行中…' : '立即執行（簽核＋轉銷＋下載PDF）' }}
              </button>
            </div>

            <p v-if="automationError[customer.firmCode]" class="mt-2 text-xs text-red-600">
              {{ automationError[customer.firmCode] }}
            </p>

            <!-- 預覽結果 -->
            <div v-if="automationResults[customer.firmCode]?.dryRun" class="mt-2 text-xs">
              <p class="text-muted-c">目前未簽核：{{ automationResults[customer.firmCode].matchedCount }} 張</p>
              <ul v-if="automationResults[customer.firmCode].matchedCount" class="mt-1 space-y-0.5">
                <li v-for="o in automationResults[customer.firmCode].orders" :key="o.code">
                  {{ o.code }}（交貨日期 {{ o.deliveryDate }}，金額 {{ o.total }}）
                </li>
              </ul>
            </div>

            <!-- 執行結果 -->
            <table
              v-if="automationResults[customer.firmCode] && !automationResults[customer.firmCode].dryRun && automationResults[customer.firmCode].results.length"
              class="mt-2 w-full text-xs"
            >
              <thead>
                <tr class="border-b border-light-c text-left text-hint-c">
                  <th class="py-1 pr-2">訂貨單號</th>
                  <th class="py-1 pr-2">簽核</th>
                  <th class="py-1 pr-2">轉銷</th>
                  <th class="py-1 pr-2">對應銷貨單</th>
                  <th class="py-1 pr-2">PDF</th>
                  <th class="py-1 pr-2">備註</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="r in automationResults[customer.firmCode].results" :key="r.code" class="border-b border-light-c/50">
                  <td class="py-1 pr-2">{{ r.code }}</td>
                  <td class="py-1 pr-2">{{ r.signOk ? '✅' : '—' }}</td>
                  <td class="py-1 pr-2">{{ r.transferOk ? '✅' : '—' }}</td>
                  <td class="py-1 pr-2">{{ r.matchedSlipCode || '—' }}</td>
                  <td class="py-1 pr-2">
                    <a v-if="r.printOk" :href="downloadHref(r.fileName)" target="_blank" class="text-accent-solid hover:underline">下載</a>
                    <span v-else>—</span>
                  </td>
                  <td class="py-1 pr-2 text-hint-c">{{ r.transferError || r.printError }}</td>
                </tr>
              </tbody>
            </table>
            <p
              v-else-if="automationResults[customer.firmCode] && !automationResults[customer.firmCode].dryRun"
              class="mt-2 text-xs text-hint-c"
            >
              目前沒有未簽核的訂貨單，沒有東西要處理。
            </p>
          </div>
        </div>
      </div>

      <!-- Toast -->
      <transition name="fade">
        <div
          v-if="toast.show"
          class="fixed bottom-6 right-6 z-50 rounded-xl bg-accent-solid px-4 py-3 text-sm text-white shadow-lg"
        >
          {{ toast.message }}
        </div>
      </transition>
    </DcErpShell>
  </div>
</template>

<style scoped>
.fade-enter-active, .fade-leave-active {
  transition: opacity 0.3s;
}
.fade-enter-from, .fade-leave-to {
  opacity: 0;
}
</style>
