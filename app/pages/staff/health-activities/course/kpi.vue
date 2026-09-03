<script setup>
// 專案 holy-mother-farm 位置 staff/health-activities/course/kpi.vue
//
// 客源與續約 KPI 儀表板。資料來源是 CourseRegistrationController 的
// /stats-by-name/{name}（Phase C 新增），伺服器端直接從既有報名資料
// （customerSource／insider／renewalStatus，Phase B 加的欄位）即時算出來，
// 不是另外手動輸入的月報表——所以看到的永遠是最新資料，不會跟報名名單兜不起來。
//
// ⚠️ 「同一系列課程」的判斷方式是「名稱完全一樣」，假設你們同一堂課每個月
// 重開新的 CourseRegistration 時名稱不變（只有報名截止日不同）。如果實際
// 命名方式不同（例如梯次名稱會帶月份），這裡的分組跟續約率會不準。
import { useCourseRegistrationStore } from '~/stores/courseRegistration.js'

definePageMeta({ layout: 'staff', requiredPermission: 'health-activities.course' })

const store = useCourseRegistrationStore()
const loading = ref(true)
const statsLoading = ref(false)
const selectedName = ref('')

onMounted(async () => {
  loading.value = true
  await store.fetchCourses()
  loading.value = false
  if (courseNames.value.length) {
    selectedName.value = courseNames.value[0]
  }
})

const courseNames = computed(() => {
  const seen = new Set()
  const names = []
  for (const c of store.courses) {
    if (!seen.has(c.name)) { seen.add(c.name); names.push(c.name) }
  }
  return names
})

const loadStats = async () => {
  if (!selectedName.value) return
  statsLoading.value = true
  try {
    await store.fetchSeriesStats(selectedName.value)
  } finally {
    statsLoading.value = false
  }
}
watch(selectedName, loadStats)

const series = computed(() => store.seriesStats || [])
const latest = computed(() => series.value.length ? series.value[series.value.length - 1] : null)

const pct = (n, total) => total > 0 ? Math.round((n / total) * 100) : null
const achievementRate = (row) => row.maxCapacity > 0 ? pct(row.registeredCount, row.maxCapacity) : null
const renewalRate = (row) => {
  const base = row.renewedCount + row.notRenewedCount
  return base > 0 ? pct(row.renewedCount, base) : null
}
const insiderRate = (row) => pct(row.insiderCount, row.insiderCount + row.outsiderCount)
const topSource = (row) => {
  const entries = Object.entries(row.sourceBreakdown || {})
  if (!entries.length) return null
  entries.sort((a, b) => b[1] - a[1])
  return entries[0]
}
const shortDate = (deadline) => (deadline || '').slice(0, 10)

const maxRegistered = computed(() => Math.max(1, ...series.value.map(r => r.registeredCount)))
const barHeight = (n) => `${Math.max(6, Math.round((n / maxRegistered.value) * 100))}%`

const sourceColor = (source, index) => {
  const palette = ['#60a5fa', '#4ade80', '#fbbf24', '#f472b6', '#a78bfa', '#22d3ee']
  return palette[index % palette.length]
}
</script>

<template>
  <div class="min-h-full" style="background: var(--surface2)">
    <div class="max-w-6xl mx-auto px-4 py-6">
      <NuxtLink
        to="/staff/health-activities/course"
        class="text-sm mb-4 inline-block"
        style="color: var(--text-hint)"
      >
        ← 返回課程列表
      </NuxtLink>

      <div class="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div>
          <h1 class="text-xl font-bold" style="color: var(--text-base)">客源與續約儀表板</h1>
          <p class="text-sm mt-1" style="color: var(--text-hint)">依課程名稱彙整每梯次的報名/續約/客源數據</p>
        </div>
        <select
          v-model="selectedName"
          class="border rounded-lg px-3 py-2 text-sm min-w-[180px]"
          style="border-color: var(--border-light); background: var(--surface); color: var(--text-base)"
        >
          <option v-for="n in courseNames" :key="n" :value="n">{{ n }}</option>
        </select>
      </div>

      <div v-if="loading || statsLoading" class="text-center py-16" style="color: var(--text-hint)">載入中…</div>

      <div v-else-if="!series.length" class="text-center py-16" style="color: var(--text-hint)">
        這個課程名稱還沒有設定「報名截止日」的梯次，無法統計（需要有截止日才能排出先後順序）
      </div>

      <template v-else>
        <!-- 最新一期摘要卡 -->
        <div class="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <div class="rounded-2xl border p-4" style="border-color: var(--border-light); background: var(--surface)">
            <div class="text-xs mb-1" style="color: var(--text-hint)">最新一期報名</div>
            <div class="text-2xl font-bold" style="color: var(--text-base)">
              {{ latest.registeredCount }}<span class="text-sm font-normal" style="color: var(--text-hint)"> 人</span>
            </div>
            <div v-if="achievementRate(latest) !== null" class="text-xs mt-0.5" style="color: var(--accent)">
              名額達成 {{ achievementRate(latest) }}%
            </div>
          </div>
          <div class="rounded-2xl border p-4" style="border-color: var(--border-light); background: var(--surface)">
            <div class="text-xs mb-1" style="color: var(--text-hint)">續約率</div>
            <div class="text-2xl font-bold" style="color: var(--text-base)">
              {{ renewalRate(latest) ?? '—' }}<span v-if="renewalRate(latest) !== null" class="text-sm font-normal">%</span>
            </div>
            <div class="text-xs mt-0.5" style="color: var(--text-hint)">
              續約 {{ latest.renewedCount }}／未續約 {{ latest.notRenewedCount }}／單次 {{ latest.singleCount }}
            </div>
          </div>
          <div class="rounded-2xl border p-4" style="border-color: var(--border-light); background: var(--surface)">
            <div class="text-xs mb-1" style="color: var(--text-hint)">院內占比</div>
            <div class="text-2xl font-bold" style="color: var(--text-base)">
              {{ insiderRate(latest) ?? '—' }}<span v-if="insiderRate(latest) !== null" class="text-sm font-normal">%</span>
            </div>
            <div class="text-xs mt-0.5" style="color: var(--text-hint)">
              院內 {{ latest.insiderCount }}／院外 {{ latest.outsiderCount }}
            </div>
          </div>
          <div class="rounded-2xl border p-4" style="border-color: var(--border-light); background: var(--surface)">
            <div class="text-xs mb-1" style="color: var(--text-hint)">主要客源</div>
            <div class="text-2xl font-bold truncate" style="color: var(--text-base)">
              {{ topSource(latest)?.[0] ?? '—' }}
            </div>
            <div class="text-xs mt-0.5" style="color: var(--text-hint)">
              <span v-if="topSource(latest)">{{ topSource(latest)[1] }} 人</span>
            </div>
          </div>
        </div>

        <!-- 報名人數趨勢（各梯次） -->
        <div class="rounded-2xl border p-4 mb-6" style="border-color: var(--border-light); background: var(--surface)">
          <div class="text-sm font-medium mb-3" style="color: var(--text-muted)">各梯次報名人數</div>
          <div class="flex items-end gap-3 h-32">
            <div v-for="row in series" :key="row.courseId" class="flex-1 flex flex-col items-center gap-1 h-full justify-end">
              <div class="text-[11px]" style="color: var(--text-hint)">{{ row.registeredCount }}</div>
              <div class="w-full rounded-t-md" :style="{ height: barHeight(row.registeredCount), background: 'var(--accent)', minHeight: '6px' }" />
              <div class="text-[10px]" style="color: var(--text-hint)">{{ shortDate(row.registrationDeadline) }}</div>
            </div>
          </div>
        </div>

        <!-- 詳細表格 -->
        <div class="rounded-2xl border overflow-x-auto" style="border-color: var(--border-light); background: var(--surface)">
          <table class="w-full text-sm">
            <thead>
              <tr style="border-bottom: 1px solid var(--border-light)">
                <th class="text-left px-3 py-2 whitespace-nowrap" style="color: var(--text-hint)">截止日</th>
                <th class="text-right px-3 py-2 whitespace-nowrap" style="color: var(--text-hint)">報名/名額</th>
                <th class="text-right px-3 py-2 whitespace-nowrap" style="color: var(--text-hint)">續約率</th>
                <th class="text-right px-3 py-2 whitespace-nowrap" style="color: var(--text-hint)">院內占比</th>
                <th class="text-left px-3 py-2 whitespace-nowrap" style="color: var(--text-hint)">客源分布</th>
                <th class="text-right px-3 py-2 whitespace-nowrap" style="color: var(--text-hint)">已收金額</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in series" :key="row.courseId" style="border-bottom: 1px solid var(--border-light)">
                <td class="px-3 py-2 whitespace-nowrap" style="color: var(--text-base)">{{ shortDate(row.registrationDeadline) }}</td>
                <td class="px-3 py-2 text-right whitespace-nowrap" style="color: var(--text-base)">
                  {{ row.registeredCount }}<span style="color: var(--text-hint)">/{{ row.maxCapacity || '∞' }}</span>
                </td>
                <td class="px-3 py-2 text-right whitespace-nowrap" style="color: var(--text-base)">
                  {{ renewalRate(row) ?? '—' }}<span v-if="renewalRate(row) !== null">%</span>
                </td>
                <td class="px-3 py-2 text-right whitespace-nowrap" style="color: var(--text-base)">
                  {{ insiderRate(row) ?? '—' }}<span v-if="insiderRate(row) !== null">%</span>
                </td>
                <td class="px-3 py-2">
                  <div class="flex flex-wrap gap-1">
                    <span
                      v-for="([source, count], i) in Object.entries(row.sourceBreakdown || {})"
                      :key="source"
                      class="text-[11px] px-1.5 py-0.5 rounded-full"
                      :style="{ background: sourceColor(source, i) + '26', color: sourceColor(source, i) }"
                    >
                      {{ source }} {{ count }}
                    </span>
                    <span v-if="!Object.keys(row.sourceBreakdown || {}).length" class="text-[11px]" style="color: var(--text-hint)">—</span>
                  </div>
                </td>
                <td class="px-3 py-2 text-right whitespace-nowrap" style="color: var(--text-base)">
                  {{ row.paidAmountSum ? `$${row.paidAmountSum}` : '—' }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </template>
    </div>
  </div>
</template>
