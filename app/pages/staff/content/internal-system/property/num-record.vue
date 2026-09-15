<template>
  <InternalSystemPropertyShell>
  <div class="page">
    <h1 class="page-title">財產編號歷程查詢</h1>

    <section class="card">
      <div class="search-row">
        <input
            v-model="productNum"
            type="text"
            class="search-input"
            placeholder="財產編號"
            @keydown.enter="search"
        />
        <button type="button" class="search-btn" :disabled="searching" @click="search">
          {{ searching ? '查詢中...' : '查詢' }}
        </button>
      </div>
    </section>

    <section v-if="mainData" class="card">
      <div class="tabs">
        <button
            type="button"
            class="tab-btn"
            :class="{ active: activeTab === 'info' }"
            @click="switchTab('info')"
        >
          財產資訊
        </button>
        <button
            type="button"
            class="tab-btn"
            :class="{ active: activeTab === 'log' }"
            @click="switchTab('log')"
        >
          異動歷程
        </button>
      </div>

      <div v-if="activeTab === 'info'" class="tab-body">
        <table class="info-table">
          <tbody>
            <tr v-for="[key, value] in Object.entries(mainData)" :key="key">
              <th>{{ key }}</th>
              <td>{{ value }}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div v-else class="tab-body">
        <p v-if="logLoading && logEntries.length === 0" class="hint-text">載入中...</p>
        <p v-else-if="logEntries.length === 0" class="hint-text">尚無異動歷程</p>
        <template v-else>
          <table class="data-table">
            <thead>
              <tr>
                <th v-for="col in logColumns" :key="col">{{ col }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(row, idx) in logEntries" :key="idx">
                <td v-for="col in logColumns" :key="col">{{ (row as Record<string, unknown>)[col] }}</td>
              </tr>
            </tbody>
          </table>
          <div v-if="logHasMore" class="load-more-row">
            <button type="button" class="btn-sm" :disabled="logLoading" @click="loadMoreLog">
              {{ logLoading ? '載入中...' : '載入更多' }}
            </button>
          </div>
        </template>
      </div>
    </section>
  </div>
  </InternalSystemPropertyShell>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'staff', requiredPermission: 'content.internal-system', middleware: 'internal-system-auth' })

/** mainData / log 項目欄位皆由舊系統動態決定，這裡採通用方式渲染所有欄位 */
type GenericRecord = Record<string, unknown>

interface SearchResponse {
  data: { mainData: GenericRecord }
}

interface AsyncResponse {
  data: { mainData: GenericRecord[]; nextCursor: string | null; hasMore: boolean }
}

const productNum = ref('')
const searching = ref(false)
const mainData = ref<GenericRecord | null>(null)
const productId = ref<string | number | null>(null)

const activeTab = ref<'info' | 'log'>('info')

const logEntries = ref<GenericRecord[]>([])
const logLoading = ref(false)
const logNextCursor = ref<string | null>(null)
const logHasMore = ref(true)
const logLoaded = ref(false)

const logColumns = computed(() => (logEntries.value[0] ? Object.keys(logEntries.value[0]) : []))

const search = async () => {
  if (!productNum.value.trim()) return
  searching.value = true
  try {
    const res = await $fetch<SearchResponse>('/api/internal-system/property/num-record-search', {
      method: 'POST',
      body: { productNum: productNum.value.trim().toUpperCase() },
    })
    mainData.value = res.data.mainData
    productId.value = (res.data.mainData as any)?.product_id ?? null
    activeTab.value = 'info'
    logEntries.value = []
    logNextCursor.value = null
    logHasMore.value = true
    logLoaded.value = false
  } catch {
    alert('查無資料或查詢失敗')
  } finally {
    searching.value = false
  }
}

const switchTab = (tab: 'info' | 'log') => {
  activeTab.value = tab
  if (tab === 'log' && !logLoaded.value) {
    loadMoreLog()
  }
}

const loadMoreLog = async () => {
  if (!productId.value || logLoading.value) return
  logLoading.value = true
  try {
    const res = await $fetch<AsyncResponse>('/api/internal-system/property/num-record-async', {
      method: 'POST',
      body: {
        limit: 5,
        productId: productId.value,
        tabId: 'log',
        nextCursor: logNextCursor.value,
      },
    })
    logEntries.value = [...logEntries.value, ...(res.data.mainData ?? [])]
    logNextCursor.value = res.data.nextCursor
    logHasMore.value = res.data.hasMore
    logLoaded.value = true
  } catch {
    alert('載入歷程失敗')
  } finally {
    logLoading.value = false
  }
}
</script>

<style scoped>
.page { max-width: 900px; }

.page-title {
  font-size: 20px;
  font-weight: 700;
  color: var(--text);
  margin: 0 0 20px;
}

.card {
  background: var(--surface);
  border: 1px solid var(--border-light);
  border-radius: var(--radius);
  box-shadow: var(--shadow);
  padding: 18px;
  margin-bottom: 20px;
}

.search-row {
  display: flex;
  gap: 10px;
}

.search-input {
  flex: 1;
  padding: 9px 12px;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--surface);
  color: var(--text);
  font-size: 13px;
}

.search-btn {
  padding: 9px 20px;
  background: var(--accent);
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 13px;
  cursor: pointer;
}
.search-btn:disabled { opacity: 0.6; cursor: not-allowed; }

.tabs {
  display: flex;
  gap: 4px;
  border-bottom: 1px solid var(--border-light);
  margin-bottom: 16px;
}

.tab-btn {
  padding: 8px 16px;
  border: none;
  background: none;
  color: var(--text-muted);
  font-size: 13px;
  cursor: pointer;
  border-bottom: 2px solid transparent;
}

.tab-btn.active {
  color: var(--accent);
  border-bottom-color: var(--accent);
  font-weight: 700;
}

.info-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}

.info-table th {
  width: 160px;
  text-align: left;
  background: var(--surface2);
  color: var(--text-muted);
  padding: 8px 10px;
  border: 1px solid var(--border-light);
}

.info-table td {
  padding: 8px 10px;
  border: 1px solid var(--border-light);
  color: var(--text);
}

.data-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}

.data-table th,
.data-table td {
  border: 1px solid var(--border-light);
  padding: 8px 10px;
  text-align: center;
}

.data-table th {
  background: var(--surface2);
  color: var(--text-muted);
}

.hint-text { color: var(--text-hint); font-size: 13px; }

.load-more-row {
  text-align: center;
  margin-top: 14px;
}

.btn-sm {
  padding: 6px 16px;
  border: 1px solid var(--border);
  border-radius: 6px;
  background: var(--surface);
  color: var(--text);
  font-size: 13px;
  cursor: pointer;
}
.btn-sm:hover { background: var(--surface2); }
</style>