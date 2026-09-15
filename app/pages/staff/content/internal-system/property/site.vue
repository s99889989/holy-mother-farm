<template>
  <InternalSystemPropertyShell>
  <div class="page">
    <h1 class="page-title">放置地點查詢</h1>

    <section class="card">
      <div class="toolbar">
        <input v-model="keyword" type="text" class="search-input" placeholder="搜尋..." />
        <span class="count-text">共 {{ filtered.length }} 項</span>
      </div>

      <p v-if="loading" class="hint-text">載入中...</p>
      <p v-else-if="error" class="error-text">載入失敗</p>
      <template v-else>
        <div class="table-wrap">
          <table class="data-table">
            <thead>
              <tr>
                <th>序號</th>
                <th>區域(代碼/名稱)</th>
                <th>建築(代碼/名稱)</th>
                <th>樓層(代碼/名稱)</th>
                <th>地點(代碼/名稱)</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(row, idx) in paged" :key="row.site_code ?? idx">
                <td>{{ (page - 1) * pageSize + idx + 1 }}</td>
                <td>代碼：{{ row.area_code }} 名稱：{{ row.area_name }}</td>
                <td>代碼：{{ row.building_code }} 名稱：{{ row.building_name }}</td>
                <td>代碼：{{ row.floor_code }} 名稱：{{ row.floor_name }}</td>
                <td>代碼：{{ row.site_code }} 名稱：{{ row.site_name }}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="pagination">
          <button type="button" class="page-btn" :disabled="page === 1" @click="page--">上頁</button>
          <span class="page-text">第 {{ page }} / {{ totalPages }} 頁</span>
          <button type="button" class="page-btn" :disabled="page === totalPages" @click="page++">下頁</button>
        </div>
      </template>
    </section>
  </div>
  </InternalSystemPropertyShell>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'staff', requiredPermission: 'content.internal-system', middleware: 'internal-system-auth' })

/**
 * 欄位名稱依畫面「區域/建築/樓層/地點(代碼/名稱)」推測，
 * 舊系統實際回傳的 JSON 欄位若不同，接上後請告知我調整。
 */
interface SiteRow {
  area_code: string
  area_name: string
  building_code: string
  building_name: string
  floor_code: string
  floor_name: string
  site_code: string
  site_name: string
}

interface SiteListResponse {
  data: { dataList: SiteRow[] }
}

const dataList = ref<SiteRow[]>([])
const loading = ref(true)
const error = ref(false)
const keyword = ref('')
const page = ref(1)
const pageSize = 25

const filtered = computed(() => {
  const kw = keyword.value.trim().toLowerCase()
  if (!kw) return dataList.value
  return dataList.value.filter((row) =>
    Object.values(row).some((v) => String(v ?? '').toLowerCase().includes(kw))
  )
})

const totalPages = computed(() => Math.max(1, Math.ceil(filtered.value.length / pageSize)))

const paged = computed(() => {
  const start = (page.value - 1) * pageSize
  return filtered.value.slice(start, start + pageSize)
})

watch(keyword, () => { page.value = 1 })

const load = async () => {
  loading.value = true
  error.value = false
  try {
    const res = await $fetch<SiteListResponse>('/api/internal-system/property/site-list')
    dataList.value = res.data.dataList ?? []
  } catch {
    error.value = true
  } finally {
    loading.value = false
  }
}

onMounted(load)
</script>

<style scoped>
.page { max-width: 1100px; }

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
}

.toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 14px;
}

.search-input {
  flex: 1;
  max-width: 280px;
  padding: 8px 12px;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--surface);
  color: var(--text);
  font-size: 13px;
}

.count-text {
  font-size: 13px;
  color: var(--text-hint);
  white-space: nowrap;
}

.hint-text { color: var(--text-hint); font-size: 13px; }
.error-text { color: #e53e3e; font-size: 13px; }

.table-wrap { overflow-x: auto; }

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
  white-space: nowrap;
}

.data-table th {
  background: var(--surface2);
  color: var(--text-muted);
}

.pagination {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 14px;
  margin-top: 14px;
}

.page-btn {
  padding: 6px 14px;
  border: 1px solid var(--border);
  border-radius: 6px;
  background: var(--surface);
  color: var(--text);
  font-size: 13px;
  cursor: pointer;
}
.page-btn:disabled { opacity: 0.5; cursor: not-allowed; }

.page-text {
  font-size: 13px;
  color: var(--text-muted);
}
</style>