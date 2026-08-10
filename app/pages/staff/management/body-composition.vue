<template>
  <div class="p-4 max-w-screen-xl mx-auto text-sm text-base-c">
    <!-- 標題 -->
    <div class="flex items-center justify-between mb-3 flex-wrap gap-2">
      <div class="text-base font-bold text-muted-c dark:text-hint-c">
        身體組成分析
      </div>
      <!-- 上傳 GMON3.GDB -->
      <div class="flex items-center gap-2">
        <input
          ref="dbFileInput"
          type="file"
          accept=".gdb,.GDB"
          class="hidden"
          @change="onDbFileChange"
        >
        <button
          :disabled="dbUploading"
          class="bg-gray-500 hover:bg-gray-600 disabled:opacity-50 text-white px-4 py-1.5 rounded text-sm"
          @click="(dbFileInput as HTMLInputElement)?.click()"
        >
          {{ dbUploading ? '上傳中…' : '⬆️ 上傳 GMON3.GDB' }}
        </button>
      </div>
    </div>

    <!-- ════════════════════════ KPI 卡片 ════════════════════════ -->
    <div class="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
      <div class="border border-base rounded-md p-3 bg-surface">
        <div class="text-xl font-bold text-base-c">
          {{ stats?.total_customers ?? '–' }}
        </div>
        <div class="text-xs text-hint-c dark:text-hint-c">
          建檔客戶數
        </div>
      </div>
      <div class="border border-base rounded-md p-3 bg-surface">
        <div class="text-xl font-bold text-base-c">
          {{ stats?.total_measurements ?? '–' }}
        </div>
        <div class="text-xs text-hint-c dark:text-hint-c">
          檢測總筆數
        </div>
      </div>
      <div class="border border-base rounded-md p-3 bg-surface">
        <div class="text-xl font-bold text-base-c">
          {{ stats?.avg_bmi ?? '–' }}
        </div>
        <div class="text-xs text-hint-c dark:text-hint-c">
          平均 BMI
        </div>
      </div>
      <div class="border border-base rounded-md p-3 bg-surface">
        <div class="text-xl font-bold text-base-c">
          {{ stats?.avg_fatp ?? '–' }}%
        </div>
        <div class="text-xs text-hint-c dark:text-hint-c">
          平均體脂率
        </div>
      </div>
    </div>

    <!-- BMI 分類 / 性別比例 -->
    <div class="grid md:grid-cols-2 gap-3 mb-6">
      <div class="border border-base rounded-md p-4 bg-surface">
        <div class="text-xs font-bold text-muted-c dark:text-hint-c mb-3">
          BMI 分類分布
        </div>
        <div
          v-for="cat in bmiCategoryList"
          :key="cat.label"
          class="flex items-center gap-2 mb-1.5 text-xs"
        >
          <span class="w-10 text-hint-c dark:text-hint-c">{{ cat.label }}</span>
          <div class="flex-1 bg-surface2 rounded h-2 overflow-hidden">
            <div
              class="h-full rounded"
              :class="cat.color"
              :style="{ width: cat.pct + '%' }"
            />
          </div>
          <span class="w-10 text-right text-muted-c">{{ cat.value }}</span>
        </div>
      </div>
      <div class="border border-base rounded-md p-4 bg-surface">
        <div class="text-xs font-bold text-muted-c dark:text-hint-c mb-3">
          性別比例
        </div>
        <div class="flex items-center gap-2 mb-1.5 text-xs">
          <span class="w-10 text-hint-c dark:text-hint-c">女</span>
          <div class="flex-1 bg-surface2 rounded h-2 overflow-hidden">
            <div class="h-full rounded bg-pink-400" :style="{ width: genderPct.F + '%' }" />
          </div>
          <span class="w-10 text-right text-muted-c">{{ stats?.gender?.F ?? 0 }}</span>
        </div>
        <div class="flex items-center gap-2 text-xs">
          <span class="w-10 text-hint-c dark:text-hint-c">男</span>
          <div class="flex-1 bg-surface2 rounded h-2 overflow-hidden">
            <div class="h-full rounded bg-blue-400" :style="{ width: genderPct.M + '%' }" />
          </div>
          <span class="w-10 text-right text-muted-c">{{ stats?.gender?.M ?? 0 }}</span>
        </div>
      </div>
    </div>

    <!-- ════════════════════════ 最新檢測動態 ════════════════════════ -->
    <div class="mb-6">
      <div class="text-xs font-bold text-muted-c dark:text-hint-c mb-2">
        最新檢測動態
      </div>
      <div class="overflow-x-auto rounded-md border border-base">
        <table class="w-full border-collapse text-xs">
          <thead class="bg-teal-600 dark:bg-teal-800 text-white">
          <tr>
            <th class="border border-teal-700 dark:border-teal-900 px-3 py-2 text-left whitespace-nowrap">
              姓名
            </th>
            <th class="border border-teal-700 dark:border-teal-900 px-3 py-2 text-left whitespace-nowrap">
              日期
            </th>
            <th class="border border-teal-700 dark:border-teal-900 px-3 py-2 text-right whitespace-nowrap">
              BMI
            </th>
            <th class="border border-teal-700 dark:border-teal-900 px-3 py-2 text-right whitespace-nowrap">
              體脂率%
            </th>
            <th class="border border-teal-700 dark:border-teal-900 px-3 py-2 text-right whitespace-nowrap">
              肌肉量kg
            </th>
            <th class="border border-teal-700 dark:border-teal-900 px-3 py-2 text-right whitespace-nowrap">
              內臟脂肪
            </th>
          </tr>
          </thead>
          <tbody class="divide-y divide-base">
          <tr v-if="!latestRecords.length">
            <td colspan="6" class="border border-light-c px-4 py-6 text-center text-hint-c dark:text-hint-c">
              無資料
            </td>
          </tr>
          <tr
            v-for="rec in latestRecords"
            :key="rec.patnr + '-' + rec.datetime"
            class="bg-surface hover:bg-blue-50 dark:hover:bg-blue-900/20 cursor-pointer"
            @click="openCustomer(rec.patnr)"
          >
            <td class="border border-light-c px-3 py-1 whitespace-nowrap">
              {{ rec.lastname }}{{ rec.firstname }}
            </td>
            <td class="border border-light-c px-3 py-1 whitespace-nowrap font-mono">
              {{ fmtDate(rec.datetime) }}
            </td>
            <td class="border border-light-c px-3 py-1 text-right whitespace-nowrap">
              <span :class="bmiTagClass(rec.bmi)">{{ fmtNum(rec.bmi) }}</span>
            </td>
            <td class="border border-light-c px-3 py-1 text-right whitespace-nowrap">
              {{ fmtNum(rec.fatp) }}
            </td>
            <td class="border border-light-c px-3 py-1 text-right whitespace-nowrap">
              {{ fmtNum(rec.pmm) }}
            </td>
            <td class="border border-light-c px-3 py-1 text-right whitespace-nowrap">
              {{ fmtNum(rec.vfatl, 0) }}
            </td>
          </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- ════════════════════════ 客戶列表 ════════════════════════ -->
    <div class="text-xs font-bold text-muted-c dark:text-hint-c mb-2">
      客戶查詢
    </div>
    <div class="flex gap-3 mb-3 flex-wrap items-center">
      <input
        v-model="keyword"
        type="text"
        placeholder="姓名 / 客戶編號 / 電話"
        class="border border-base rounded px-3 py-1.5 w-64 bg-surface text-base-c placeholder:text-hint-c dark:placeholder:text-hint-c"
        @keyup.enter="search"
      >
      <select
        v-model="groupFilter"
        class="border border-base rounded px-3 py-1.5 bg-surface text-base-c"
        @change="search"
      >
        <option value="">
          所屬班別（全部）
        </option>
        <option v-for="g in groups" :key="g.name" :value="g.name">
          {{ g.name }}（{{ g.count }}）
        </option>
      </select>
      <button
        class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-1.5 rounded"
        @click="search"
      >
        查詢
      </button>
      <button
        class="bg-surface2 hover-border text-base-c px-4 py-1.5 rounded"
        @click="resetSearch"
      >
        清除
      </button>
    </div>

    <div class="flex gap-2 mb-2 items-center text-sm flex-wrap">
      <button
        :disabled="page <= 1"
        class="border border-base px-3 py-1 rounded disabled:opacity-40 bg-surface text-muted-c hover:bg-surface2"
        @click="page = 1; refreshList()"
      >
        &lt;&lt; 第一頁
      </button>
      <button
        :disabled="page <= 1"
        class="border border-base px-3 py-1 rounded disabled:opacity-40 bg-surface text-muted-c hover:bg-surface2"
        @click="page--; refreshList()"
      >
        &lt; 前一頁
      </button>
      <span class="text-muted-c">第 {{ page }} 頁 / 共 {{ totalPages }} 頁（{{ listData?.total ?? 0 }} 筆）</span>
      <button
        :disabled="page >= totalPages"
        class="border border-base px-3 py-1 rounded disabled:opacity-40 bg-surface text-muted-c hover:bg-surface2"
        @click="page++; refreshList()"
      >
        下一頁 &gt;
      </button>
      <button
        :disabled="page >= totalPages"
        class="border border-base px-3 py-1 rounded disabled:opacity-40 bg-surface text-muted-c hover:bg-surface2"
        @click="page = totalPages; refreshList()"
      >
        最後一頁 &gt;&gt;
      </button>
    </div>

    <div class="overflow-x-auto rounded-md border border-base mb-6">
      <table class="w-full border-collapse text-sm">
        <thead class="bg-teal-600 dark:bg-teal-800 text-white">
        <tr>
          <th class="border border-teal-700 dark:border-teal-900 px-3 py-2 text-left whitespace-nowrap">
            客戶編號
          </th>
          <th class="border border-teal-700 dark:border-teal-900 px-3 py-2 text-left whitespace-nowrap">
            姓名
          </th>
          <th class="border border-teal-700 dark:border-teal-900 px-3 py-2 text-center whitespace-nowrap">
            性別
          </th>
          <th class="border border-teal-700 dark:border-teal-900 px-3 py-2 text-left whitespace-nowrap">
            電話
          </th>
          <th class="border border-teal-700 dark:border-teal-900 px-3 py-2 text-left">
            所屬班別
          </th>
          <th class="border border-teal-700 dark:border-teal-900 px-3 py-2 text-left whitespace-nowrap">
            建檔日期
          </th>
        </tr>
        </thead>
        <tbody class="divide-y divide-base">
        <tr v-if="!listData?.rows?.length">
          <td colspan="6" class="border border-light-c px-4 py-6 text-center text-hint-c dark:text-hint-c">
            無資料
          </td>
        </tr>
        <tr
          v-for="row in listData?.rows"
          :key="row.patnr"
          class="transition-colors bg-surface hover:bg-blue-50 dark:hover:bg-blue-900/20 cursor-pointer"
          :class="{ 'bg-yellow-100 dark:bg-yellow-900/40 font-semibold': selectedPatnr === row.patnr }"
          @click="openCustomer(row.patnr)"
        >
          <td class="border border-light-c px-3 py-1 font-mono whitespace-nowrap">
            {{ row.customerid }}
          </td>
          <td class="border border-light-c px-3 py-1 whitespace-nowrap">
            {{ row.lastname }}{{ row.firstname }}
          </td>
          <td class="border border-light-c px-3 py-1 text-center whitespace-nowrap">
            {{ row.sex === 'F' ? '女' : row.sex === 'M' ? '男' : '' }}
          </td>
          <td class="border border-light-c px-3 py-1 whitespace-nowrap">
            {{ row.telephone }}
          </td>
          <td
            class="border border-light-c px-3 py-1 whitespace-nowrap max-w-[160px] overflow-hidden text-ellipsis"
            :title="row.group1"
          >
            {{ row.group1 }}
          </td>
          <td class="border border-light-c px-3 py-1 whitespace-nowrap">
            {{ fmtDate(row.creationdate) }}
          </td>
        </tr>
        </tbody>
      </table>
    </div>

    <!-- ════════════════════════ 客戶詳情 / 歷史紀錄 ════════════════════════ -->
    <div v-if="selectedPatnr" class="border border-base rounded-md overflow-hidden mb-4">
      <div class="bg-teal-500 dark:bg-teal-700 text-white px-4 py-2 font-bold flex items-center justify-between">
        <span>
          {{ selectedCustomer?.lastname }}{{ selectedCustomer?.firstname }}
          的身體組成歷史紀錄
        </span>
        <button class="text-xs bg-white/20 hover:bg-white/30 px-2 py-1 rounded" @click="closeCustomer">
          ✕ 關閉
        </button>
      </div>
      <div class="p-4 bg-surface">
        <div v-if="customerLoading" class="text-hint-c dark:text-hint-c py-4 text-center">
          載入中…
        </div>
        <template v-else>
          <div class="flex flex-wrap gap-x-6 gap-y-1 text-xs text-muted-c dark:text-hint-c mb-3">
            <span>客戶編號：<b class="text-base-c">{{ selectedCustomer?.customerid }}</b></span>
            <span>性別：<b class="text-base-c">{{ selectedCustomer?.sex === 'F' ? '女' : '男' }}</b></span>
            <span>電話：<b class="text-base-c">{{ selectedCustomer?.telephone || '–' }}</b></span>
            <span>班別：<b class="text-base-c">{{ selectedCustomer?.group1 || '–' }}</b></span>
            <span>共 <b class="text-base-c">{{ customerRecords.length }}</b> 筆檢測紀錄</span>
          </div>

          <div class="overflow-x-auto rounded border border-base">
            <table class="w-full border-collapse text-xs">
              <thead class="bg-surface2">
              <tr class="text-muted-c dark:text-hint-c">
                <th class="border border-light-c px-2 py-1.5 text-left whitespace-nowrap">
                  日期
                </th>
                <th class="border border-light-c px-2 py-1.5 text-right whitespace-nowrap">
                  年齡
                </th>
                <th class="border border-light-c px-2 py-1.5 text-right whitespace-nowrap">
                  身高cm
                </th>
                <th class="border border-light-c px-2 py-1.5 text-right whitespace-nowrap">
                  體重kg
                </th>
                <th class="border border-light-c px-2 py-1.5 text-right whitespace-nowrap">
                  BMI
                </th>
                <th class="border border-light-c px-2 py-1.5 text-right whitespace-nowrap">
                  體脂率%
                </th>
                <th class="border border-light-c px-2 py-1.5 text-right whitespace-nowrap">
                  體脂重kg
                </th>
                <th class="border border-light-c px-2 py-1.5 text-right whitespace-nowrap">
                  肌肉量kg
                </th>
                <th class="border border-light-c px-2 py-1.5 text-right whitespace-nowrap">
                  內臟脂肪
                </th>
                <th class="border border-light-c px-2 py-1.5 text-right whitespace-nowrap">
                  骨量kg
                </th>
                <th class="border border-light-c px-2 py-1.5 text-right whitespace-nowrap">
                  基礎代謝
                </th>
                <th class="border border-light-c px-2 py-1.5 text-right whitespace-nowrap">
                  綜合風險
                </th>
              </tr>
              </thead>
              <tbody class="divide-y divide-base">
              <tr v-if="!customerRecords.length">
                <td colspan="12" class="border border-light-c px-4 py-6 text-center text-hint-c dark:text-hint-c">
                  尚無檢測紀錄
                </td>
              </tr>
              <tr
                v-for="(rec, idx) in customerRecords"
                :key="rec.datetime"
                class="bg-surface"
                :class="{ 'font-semibold': idx === 0 }"
              >
                <td class="border border-light-c px-2 py-1 font-mono whitespace-nowrap">
                  {{ fmtDate(rec.datetime) }}
                  <span v-if="idx === 0" class="ml-1 text-[10px] bg-teal-500 text-white rounded px-1">
                      最新
                    </span>
                </td>
                <td class="border border-light-c px-2 py-1 text-right">
                  {{ fmtNum(rec.age, 0) }}
                </td>
                <td class="border border-light-c px-2 py-1 text-right">
                  {{ fmtNum(rec.height) }}
                </td>
                <td class="border border-light-c px-2 py-1 text-right">
                  {{ fmtNum(rec.weight) }}
                </td>
                <td class="border border-light-c px-2 py-1 text-right">
                  <span :class="bmiTagClass(rec.bmi)">{{ fmtNum(rec.bmi) }}</span>
                </td>
                <td class="border border-light-c px-2 py-1 text-right">
                  {{ fmtNum(rec.fatp) }}
                </td>
                <td class="border border-light-c px-2 py-1 text-right">
                  {{ fmtNum(rec.fatm) }}
                </td>
                <td class="border border-light-c px-2 py-1 text-right">
                  {{ fmtNum(rec.pmm) }}
                </td>
                <td class="border border-light-c px-2 py-1 text-right">
                  {{ fmtNum(rec.vfatl, 0) }}
                </td>
                <td class="border border-light-c px-2 py-1 text-right">
                  {{ fmtNum(rec.bonem) }}
                </td>
                <td class="border border-light-c px-2 py-1 text-right">
                  {{ fmtNum(rec.bmr, 0) }}
                </td>
                <td class="border border-light-c px-2 py-1 text-right">
                  {{ rec.allrisk != null ? fmtNum(rec.allrisk * 100, 0) + '%' : '–' }}
                </td>
              </tr>
              </tbody>
            </table>
          </div>
        </template>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'staff', requiredPermission: 'management.body-composition' })

const commonStore = useCommonStore()
const BASE = () => commonStore.data.main_url + '/holy/tabc'

// ── 儀表板統計 ──────────────────────────────────────────
const stats = ref<any>(null)
const latestRecords = ref<any[]>([])

async function loadStats() {
  try { stats.value = await $fetch<any>(`${BASE()}/stats`) } catch { stats.value = null }
}
async function loadLatest() {
  try { latestRecords.value = await $fetch<any[]>(`${BASE()}/records/latest`, { params: { limit: 15 } }) ?? [] }
  catch { latestRecords.value = [] }
}

const bmiCategoryList = computed(() => {
  const cats = stats.value?.bmi_categories ?? {}
  const total = Object.values(cats).reduce((a: number, b: any) => a + (b || 0), 0) || 1
  const colorMap: Record<string, string> = {
    過輕: 'bg-sky-400', 正常: 'bg-emerald-500', 過重: 'bg-amber-400', 肥胖: 'bg-rose-500'
  }
  return Object.entries(cats).map(([label, value]: [string, any]) => ({
    label, value, pct: Math.round((value / total) * 100), color: colorMap[label] ?? 'bg-gray-400'
  }))
})

const genderPct = computed(() => {
  const f = stats.value?.gender?.F ?? 0
  const m = stats.value?.gender?.M ?? 0
  const total = f + m || 1
  return { F: Math.round((f / total) * 100), M: Math.round((m / total) * 100) }
})

// ── 客戶列表 ──────────────────────────────────────────
const keyword = ref('')
const groupFilter = ref('')
const groups = ref<any[]>([])
const page = ref(1)
const limit = ref(20)
const listData = ref<any>(null)

async function loadGroups() {
  try { groups.value = await $fetch<any[]>(`${BASE()}/groups`) ?? [] }
  catch { groups.value = [] }
}

async function refreshList() {
  try {
    listData.value = await $fetch<any>(`${BASE()}/customers`, {
      params: { keyword: keyword.value, group: groupFilter.value, page: page.value, limit: limit.value }
    })
  } catch { listData.value = null }
}

const totalPages = computed(() => Math.ceil((listData.value?.total || 0) / limit.value) || 1)

function search() { page.value = 1; refreshList() }
function resetSearch() { keyword.value = ''; groupFilter.value = ''; page.value = 1; refreshList() }

// ── 客戶詳情 ──────────────────────────────────────────
const selectedPatnr = ref<number | null>(null)
const selectedCustomer = ref<any>(null)
const customerRecords = ref<any[]>([])
const customerLoading = ref(false)

async function openCustomer(patnr: number) {
  selectedPatnr.value = patnr
  customerLoading.value = true
  try {
    const [cust, recs] = await Promise.all([
      $fetch<any>(`${BASE()}/customers/${patnr}`),
      $fetch<any[]>(`${BASE()}/customers/${patnr}/records`)
    ])
    selectedCustomer.value = cust
    customerRecords.value = recs ?? []
  } catch {
    selectedCustomer.value = null
    customerRecords.value = []
  } finally {
    customerLoading.value = false
  }
}
function closeCustomer() {
  selectedPatnr.value = null
  selectedCustomer.value = null
  customerRecords.value = []
}

// ── 格式化輔助 ────────────────────────────────────────
function fmtNum(v: any, digits = 1) {
  if (v === null || v === undefined || v === '') return '–'
  const n = Number(v)
  if (Number.isNaN(n)) return '–'
  return n.toFixed(digits)
}
function fmtDate(v: any) {
  if (!v) return '–'
  return String(v).slice(0, 10)
}
function bmiTagClass(bmi: any) {
  const n = Number(bmi)
  const base = 'inline-block px-1.5 py-0.5 rounded text-[11px] font-mono'
  if (Number.isNaN(n)) return base
  if (n >= 27) return `${base} bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300`
  if (n >= 24) return `${base} bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300`
  if (n < 18.5) return `${base} bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300`
  return `${base} bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300`
}

// ── 上傳 GMON3.GDB ────────────────────────────────────
const dbFileInput = ref<HTMLInputElement | null>(null)
const dbUploading = ref(false)

async function onDbFileChange(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  if (!file.name.toUpperCase().endsWith('.GDB')) return alert('只接受 .GDB 檔案')
  if (!confirm(`確定要用「${file.name}」覆蓋伺服器上的 GMON3.GDB？\n⚠️ 此操作無法還原！`)) {
    input.value = ''
    return
  }
  dbUploading.value = true
  try {
    const fd = new FormData()
    fd.append('file', file)
    await $fetch(`${BASE()}/upload-db`, { method: 'POST', body: fd })
    alert('✅ GMON3.GDB 已成功更新！')
    closeCustomer()
    await Promise.all([loadStats(), loadLatest(), loadGroups(), refreshList()])
  } catch (err: any) {
    alert('❌ 上傳失敗：' + (err?.data?.error ?? err?.statusMessage ?? '未知錯誤'))
  } finally {
    dbUploading.value = false
    input.value = ''
  }
}

onMounted(async () => {
  await Promise.all([loadStats(), loadLatest(), loadGroups(), refreshList()])
})
</script>
