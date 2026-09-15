<template>
  <InternalSystemPropertyShell>
  <div class="page">
    <h1 class="page-title">類別查詢</h1>

    <section class="card">
      <h2 class="card-title">查詢條件</h2>
      <div class="filter-row">
        <div class="filter-group">
          <label class="filter-label">第一類別</label>
          <select v-model="first" class="filter-select">
            <option value="">請選擇</option>
            <option v-for="o in firstOptions" :key="o.value" :value="o.value">{{ o.label }}</option>
          </select>
        </div>
        <div class="filter-group">
          <label class="filter-label">第二類別</label>
          <select v-model="second" class="filter-select" :disabled="!first">
            <option value="">請選擇</option>
            <option v-for="o in secondOptions" :key="o.value" :value="o.value">{{ o.label }}</option>
          </select>
        </div>
        <div class="filter-group">
          <label class="filter-label">第三類別</label>
          <select v-model="third" class="filter-select" :disabled="!second">
            <option value="">請選擇</option>
            <option v-for="o in thirdOptions" :key="o.value" :value="o.value">{{ o.label }}</option>
          </select>
        </div>
        <button type="button" class="search-btn" :disabled="searching" @click="search">
          {{ searching ? '查詢中...' : '查詢' }}
        </button>
      </div>
    </section>

    <section class="card">
      <h2 class="card-title">類別清單</h2>
      <p v-if="metaLoading" class="hint-text">載入中...</p>
      <p v-else-if="metaError" class="error-text">初始資料載入失敗</p>
      <template v-else>
        <p v-if="!searched" class="hint-text">請先選擇查詢條件</p>
        <p v-else-if="dataList.length === 0" class="hint-text">查無資料</p>
        <div v-else class="table-wrap">
          <table class="data-table">
            <thead>
              <tr>
                <th>序號</th>
                <th>連合編號</th>
                <th>第一類</th>
                <th>第二類</th>
                <th>第三類</th>
                <th>第四類</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(row, idx) in dataList" :key="row.unite_num ?? idx">
                <td>{{ idx + 1 }}</td>
                <td>{{ row.unite_num }}</td>
                <td>{{ row.first_label }}</td>
                <td>{{ row.second_label }}</td>
                <td>{{ row.third_label }}</td>
                <td>{{ row.fourth_label }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </template>
    </section>
  </div>
  </InternalSystemPropertyShell>
</template>

<script setup lang="ts">
import { useInternalSystemPropertyClassCascade } from '~/composables/useInternalSystemPropertyClassCascade'

definePageMeta({ layout: 'staff', requiredPermission: 'content.internal-system', middleware: 'internal-system-auth' })

interface ClassMetaResponse {
  data: {
    classData: {
      firstClass: { value: string; label: string; unite_num: string }[]
      secondClass: { value: string; label: string; unite_num: string; first_num: string }[]
      thirdClass: { value: string; label: string; unite_num: string; first_num: string; second_num: string }[]
    }
  }
}

/** 結果欄位名稱為推測，接上後如與實際回傳不符請告知我調整 */
interface ClassRow {
  unite_num: string
  first_label: string
  second_label: string
  third_label: string
  fourth_label: string
}

interface ClassSearchResponse {
  data: { dataList: ClassRow[] }
}

const classData = ref<ClassMetaResponse['data']['classData'] | null>(null)
const metaLoading = ref(true)
const metaError = ref(false)

const { first, second, third, firstOptions, secondOptions, thirdOptions } = useInternalSystemPropertyClassCascade(classData)

const dataList = ref<ClassRow[]>([])
const searching = ref(false)
const searched = ref(false)

const loadMeta = async () => {
  metaLoading.value = true
  metaError.value = false
  try {
    const res = await $fetch<ClassMetaResponse>('/api/internal-system/property/class-meta')
    classData.value = res.data.classData
  } catch {
    metaError.value = true
  } finally {
    metaLoading.value = false
  }
}

const search = async () => {
  searching.value = true
  try {
    const res = await $fetch<ClassSearchResponse>('/api/internal-system/property/class-search', {
      method: 'POST',
      body: {
        firstClassSelect: first.value,
        secondClassSelect: second.value,
        thirdClassSelect: third.value,
      },
    })
    dataList.value = res.data.dataList ?? []
    searched.value = true
  } catch {
    alert('查詢失敗，請稍後再試')
  } finally {
    searching.value = false
  }
}

onMounted(loadMeta)
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
  margin-bottom: 20px;
}

.card-title {
  font-size: 15px;
  font-weight: 700;
  color: var(--text);
  margin: 0 0 14px;
}

.filter-row {
  display: flex;
  flex-wrap: wrap;
  align-items: end;
  gap: 12px;
}

.filter-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 180px;
}

.filter-label {
  font-size: 12px;
  color: var(--text-muted);
}

.filter-select {
  padding: 8px 10px;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--surface);
  color: var(--text);
  font-size: 13px;
}
.filter-select:disabled { opacity: 0.5; }

.search-btn {
  padding: 9px 20px;
  background: var(--accent);
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 13px;
  cursor: pointer;
  height: 37px;
}
.search-btn:disabled { opacity: 0.6; cursor: not-allowed; }

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
</style>