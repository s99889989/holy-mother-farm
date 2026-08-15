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
  { key: 'orderDetail', label: '訂單明細（訂貨單/銷貨單編輯頁的明細 Grid）', hasPagesize: false },
  { key: 'productSearch', label: '新增商品（訂貨單/銷貨單「新增商品」搜尋結果）', hasPagesize: false }
]
const DEFAULTS = { pagesize: 20, viewMode: 'table' }

const settings = reactive(
  Object.fromEntries(LISTS.map(({ key }) => [key, { ...DEFAULTS }]))
)

function loadSettings() {
  try {
    const raw = window.localStorage.getItem(LIST_SETTINGS_KEY)
    const all = raw ? JSON.parse(raw) : {}
    for (const { key } of LISTS) {
      settings[key] = { ...DEFAULTS, ...(all[key] || {}) }
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

onMounted(() => {
  loadSettings()
  loadLastSynced()
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
