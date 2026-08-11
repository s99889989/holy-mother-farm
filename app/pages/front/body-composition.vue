<template>
  <div class="bc-wrap">
    <header class="bc-header">
      <div class="bc-header__inner">
        <div class="bc-logo">聖母健康農莊</div>
        <h1 class="bc-title">
          {{ groupName || '身體組成' }} 班別報告
        </h1>
        <p class="bc-sub">
          點選成員可在右側查看歷史紀錄與趨勢
        </p>
      </div>
    </header>

    <main class="bc-main">
      <div v-if="!groupName" class="bc-card bc-empty">
        這個連結缺少班別參數，請跟管理端確認分享連結是否完整（網址需帶 <code>?group=班別名稱</code>）。
      </div>

      <div v-else class="bc-layout">
        <!-- ════════════ 左：名單列表 ════════════ -->
        <div class="bc-layout__list" :class="{ 'bc-mobile-hidden': !!selected }">
          <div class="bc-card">
            <div v-if="loading" class="bc-state">
              載入中…
            </div>
            <div v-else-if="error" class="bc-state bc-state--error">
              {{ error }}
            </div>
            <div v-else class="bc-table-wrap">
              <table class="bc-table">
                <thead>
                <tr>
                  <th>姓名</th>
                  <th>性別</th>
                  <th>檢測日期</th>
                  <th class="bc-num">BMI</th>
                  <th class="bc-num">體脂率%</th>
                </tr>
                </thead>
                <tbody>
                <tr v-if="!rows.length">
                  <td colspan="5" class="bc-state">
                    目前這個班別沒有資料
                  </td>
                </tr>
                <tr
                  v-for="(r, i) in rows"
                  :key="i"
                  class="bc-row-clickable"
                  :class="{ 'bc-row-active': selected?.patnr === r.patnr }"
                  @click="openMember(r)"
                >
                  <td>{{ r.lastname }}{{ r.firstname }}</td>
                  <td>{{ sexLabel(r.sex) }}</td>
                  <td class="bc-mono">
                    {{ fmtDate(r.datetime) }}
                  </td>
                  <td class="bc-num bc-mono">
                    {{ fmtNum(r.bmi) }}
                  </td>
                  <td class="bc-num bc-mono">
                    {{ fmtNum(r.fatp) }}
                  </td>
                </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div v-if="totalPages > 1" class="bc-pagination">
            <button :disabled="page <= 1" @click="page--; load()">
              ‹ 上一頁
            </button>
            <span>第 {{ page }} / {{ totalPages }} 頁（共 {{ total }} 人）</span>
            <button :disabled="page >= totalPages" @click="page++; load()">
              下一頁 ›
            </button>
          </div>
        </div>

        <!-- ════════════ 右：個人詳情（電腦跟著捲動固定／手機轉跳全螢幕）════════════ -->
        <div class="bc-layout__detail" :class="{ 'bc-mobile-hidden': !selected }">
          <div v-if="!selected" class="bc-card bc-placeholder">
            ← 從左側名單點選一位成員查看詳情
          </div>

          <template v-else>
            <button class="bc-back" @click="selected = null">
              ‹ 返回名單
            </button>

            <div class="bc-card bc-detail-head">
              <div class="bc-detail-head__row">
                <div>
                  <div class="bc-detail-name">
                    {{ selected.lastname }}{{ selected.firstname }}
                  </div>
                  <div class="bc-detail-meta">
                    {{ sexLabel(selected.sex) }}
                    · 共 {{ memberRecords.length }} 筆檢測紀錄
                  </div>
                </div>
                <button class="bc-close" @click="selected = null">
                  ✕
                </button>
              </div>
            </div>

            <div v-if="memberLoading" class="bc-card bc-state">
              載入中…
            </div>
            <div v-else-if="memberError" class="bc-card bc-state bc-state--error">
              {{ memberError }}
            </div>

            <template v-else>
              <!-- 最新測量狀態：標準範圍色帶 -->
              <div v-if="rangeBars.length" class="bc-card bc-rangebars">
                <div v-for="bar in rangeBars" :key="bar.title" class="bc-rangebar">
                  <div class="bc-rangebar__head">
                    <span>{{ bar.title }}</span>
                    <span class="bc-mono" :style="{ color: bar.markerColor }">{{ bar.valueLabel }}</span>
                  </div>
                  <div class="bc-rangebar__track">
                    <div
                      v-for="(seg, i) in bar.segments"
                      :key="i"
                      class="bc-rangebar__seg"
                      :style="{ width: seg.width + '%', background: seg.color }"
                    />
                    <div class="bc-rangebar__marker" :style="{ left: 'calc(' + bar.markerPct + '% - 1.5px)' }" />
                  </div>
                  <div class="bc-rangebar__labels">
                    <span v-for="(seg, i) in bar.segments" :key="i" :style="{ width: seg.width + '%' }">{{ seg.label }}</span>
                  </div>
                </div>
              </div>

              <!-- 歷史趨勢圖 -->
              <div v-if="trendCharts.length" class="bc-card bc-trends">
                <div v-for="t in trendCharts" :key="t.key" class="bc-trend">
                  <div class="bc-trend__title">
                    {{ t.title }}趨勢
                  </div>
                  <svg :viewBox="`0 0 ${t.w} ${t.h}`" class="bc-trend__svg">
                    <path :d="t.area" :fill="t.color" fill-opacity="0.12" stroke="none" />
                    <path :d="t.path" fill="none" :stroke="t.color" stroke-width="2" />
                    <circle
                      v-for="(p, i) in t.pts"
                      :key="i"
                      :cx="p.x" :cy="p.y" r="2.2"
                      :fill="i === t.pts.length - 1 ? '#c79a44' : t.color"
                    >
                      <title>{{ p.vLabel }}</title>
                    </circle>
                    <text :x="4" :y="t.maxY + (t.maxY > 10 ? -3 : 9)" font-size="8" fill="#9aa89a">{{ t.maxLabel }}</text>
                    <text :x="4" :y="t.minY + (t.minY < t.h - 10 ? 9 : -3)" font-size="8" fill="#9aa89a">{{ t.minLabel }}</text>
                  </svg>
                  <div class="bc-trend__foot">
                    <span>{{ t.firstLabel }}</span>
                    <span>最新 {{ t.lastValue }}</span>
                  </div>
                </div>
              </div>

              <!-- 歷史紀錄表 -->
              <div class="bc-card bc-table-wrap">
                <table class="bc-table">
                  <thead>
                  <tr>
                    <th>日期</th>
                    <th class="bc-num">年齡</th>
                    <th class="bc-num">體重kg</th>
                    <th class="bc-num">BMI</th>
                    <th class="bc-num">體脂率%</th>
                    <th class="bc-num">肌肉量kg</th>
                    <th class="bc-num">內臟脂肪</th>
                    <th class="bc-num">體內年齡</th>
                    <th class="bc-num">綜合風險</th>
                  </tr>
                  </thead>
                  <tbody>
                  <tr v-if="!memberRecords.length">
                    <td colspan="9" class="bc-state">
                      尚無檢測紀錄
                    </td>
                  </tr>
                  <tr v-for="(rec, i) in memberRecords" :key="i">
                    <td class="bc-mono">
                      {{ fmtDate(rec.datetime) }}
                      <span v-if="i === 0" class="bc-badge">最新</span>
                    </td>
                    <td class="bc-num bc-mono">
                      {{ fmtNum(rec.age, 0) }}
                    </td>
                    <td class="bc-num bc-mono">
                      {{ fmtNum(rec.weight) }}
                    </td>
                    <td class="bc-num bc-mono">
                      {{ fmtNum(rec.bmi) }}
                    </td>
                    <td class="bc-num bc-mono">
                      {{ fmtNum(rec.fatp) }}
                    </td>
                    <td class="bc-num bc-mono">
                      {{ fmtNum(rec.pmm) }}
                    </td>
                    <td class="bc-num bc-mono">
                      {{ fmtNum(rec.vfatl, 0) }}
                    </td>
                    <td class="bc-num bc-mono">
                      {{ fmtNum(rec.metaage, 0) }}
                    </td>
                    <td class="bc-num bc-mono">
                      {{ rec.allrisk != null ? fmtNum(rec.allrisk * 100, 0) + '%' : '–' }}
                    </td>
                  </tr>
                  </tbody>
                </table>
              </div>
            </template>
          </template>
        </div>
      </div>
    </main>

    <footer class="bc-footer">
      聖母健康農莊 · 身體組成分析
    </footer>
  </div>
</template>

<script setup lang="ts">
  // 公開分享頁，免登入即可看，只顯示 URL 指定班別的成員摘要
  // 網址格式：/front/body-composition?group=班別名稱
  definePageMeta({ layout: false })

  const route = useRoute()
  const commonStore = useCommonStore()
  const BASE = () => commonStore.data.main_url + '/holy/tabc'

  const groupName = computed(() => (route.query.group as string) || '')

  // ── 名單列表 ──────────────────────────────────────────
  const rows = ref<any[]>([])
  const total = ref(0)
  const page = ref(1)
  const limit = ref(20)
  const loading = ref(false)
  const error = ref('')

  const totalPages = computed(() => Math.max(1, Math.ceil(total.value / limit.value)))

  async function load() {
    if (!groupName.value) return
    loading.value = true
    error.value = ''
    try {
      const res = await $fetch<any>(`${BASE()}/public/group-members`, {
        params: { name: groupName.value, page: page.value, limit: limit.value }
      })
      rows.value = res?.rows ?? []
      total.value = res?.total ?? 0
    } catch {
      error.value = '載入失敗，請確認分享連結是否正確'
      rows.value = []
    } finally {
      loading.value = false
    }
  }

  // ── 右側個人詳情 ──────────────────────────────────────
  const selected = ref<any>(null)
  const memberRecords = ref<any[]>([])
  const memberLoading = ref(false)
  const memberError = ref('')

  async function openMember(row: any) {
    selected.value = row
    memberRecords.value = []
    memberError.value = ''
    memberLoading.value = true
    try {
      const res = await $fetch<any>(`${BASE()}/public/member-records`, {
        params: { group: groupName.value, patnr: row.patnr }
      })
      if (res?.customer) selected.value = { ...row, ...res.customer }
      memberRecords.value = res?.records ?? []
    } catch {
      memberError.value = '載入失敗，請確認分享連結是否正確'
    } finally {
      memberLoading.value = false
    }
  }

  // 性別欄位正規化：資料庫實際存的格式不確定（可能有大小寫/空白/其他代碼），
  // 用寬鬆比對取代完全比對；比對不到已知格式時，直接顯示原始值方便排查，而不是靜默顯示空白
  function sexCode(v: any): 'M' | 'F' | '' {
    if (v === null || v === undefined) return ''
    const s = String(v).trim().toUpperCase()
    if (s === 'M' || s === 'MALE' || s === '1' || s === '男') return 'M'
    if (s === 'F' || s === 'FEMALE' || s === '2' || s === '女') return 'F'
    return ''
  }
  function sexLabel(v: any) {
    const code = sexCode(v)
    if (code === 'M') return '男'
    if (code === 'F') return '女'
    const raw = v === null || v === undefined ? '' : String(v).trim()
    return raw
  }

  // ── 標準範圍色帶（跟管理後台同一套標準）──────────────────
  const BMI_ZONES = [
    { to: 18.5, label: '過輕', color: '#38bdf8' },
    { to: 24, label: '正常', color: '#10b981' },
    { to: 27, label: '過重', color: '#f59e0b' },
    { to: 40, label: '肥胖', color: '#f43f5e' }
  ]
  function fatZones(sex: string) {
    return sex === 'M'
      ? [{ to: 14, label: '過低', color: '#38bdf8' }, { to: 20, label: '正常', color: '#10b981' }, { to: 25, label: '過重', color: '#f59e0b' }, { to: 50, label: '偏高', color: '#f43f5e' }]
      : [{ to: 21, label: '過低', color: '#38bdf8' }, { to: 27, label: '正常', color: '#10b981' }, { to: 32, label: '過重', color: '#f59e0b' }, { to: 55, label: '偏高', color: '#f43f5e' }]
  }
  const VISZFAT_ZONES = [
    { to: 10, label: '正常', color: '#10b981' },
    { to: 15, label: '偏高', color: '#f59e0b' },
    { to: 30, label: '過高', color: '#f43f5e' }
  ]

  function buildRangeBar(title: string, value: any, zones: { to: number, label: string, color: string }[], digits = 1) {
    const n = Number(value)
    if (Number.isNaN(n)) return null
    const max = zones[zones.length - 1].to
    let from = 0
    const segments = zones.map(z => {
      const seg = { width: ((z.to - from) / max) * 100, color: z.color, label: z.label }
      from = z.to
      return seg
    })
    const markerPct = Math.min(100, Math.max(0, (n / max) * 100))
    const activeZone = zones.find(z => n <= z.to) ?? zones[zones.length - 1]
    return { title, valueLabel: n.toFixed(digits), segments, markerPct, markerColor: activeZone.color }
  }

  const latestRecord = computed(() => memberRecords.value[0] ?? null)

  const rangeBars = computed(() => {
    if (!latestRecord.value) return []
    const sex = sexCode(selected.value?.sex) || 'F'
    return [
      buildRangeBar('BMI', latestRecord.value.bmi, BMI_ZONES),
      buildRangeBar('體脂率 %', latestRecord.value.fatp, fatZones(sex)),
      buildRangeBar('內臟脂肪等級', latestRecord.value.vfatl, VISZFAT_ZONES, 0)
    ].filter((b): b is NonNullable<typeof b> => b !== null)
  })

  // ── 歷史趨勢折線圖（純 SVG）──────────────────────────
  function buildTrend(key: string, title: string, color: string, digits = 1) {
    const recs = [...memberRecords.value].reverse()
      .filter(r => r[key] !== null && r[key] !== undefined && r[key] !== '')
    if (recs.length < 2) return null
    const values = recs.map(r => Number(r[key]))
    const w = 300, h = 90, padX = 8, padY = 14
    const min = Math.min(...values)
    const max = Math.max(...values)
    const range = (max - min) || 1
    const stepX = (w - padX * 2) / (recs.length - 1)
    const pts = values.map((v, i) => ({
      x: padX + i * stepX,
      y: h - padY - ((v - min) / range) * (h - padY * 2),
      vLabel: v.toFixed(digits)
    }))
    const path = pts.map((p, i) => (i === 0 ? 'M' : 'L') + p.x.toFixed(1) + ',' + p.y.toFixed(1)).join(' ')
    const area = path + ` L${pts[pts.length - 1].x.toFixed(1)},${h - padY} L${pts[0].x.toFixed(1)},${h - padY} Z`
    return {
      key, title, color, w, h, path, area, pts,
      firstLabel: fmtDate(recs[0].datetime),
      lastValue: values[values.length - 1].toFixed(digits),
      maxLabel: max.toFixed(digits),
      minLabel: min.toFixed(digits),
      maxY: pts.reduce((a, p) => Math.min(a, p.y), h),
      minY: pts.reduce((a, p) => Math.max(a, p.y), 0)
    }
  }

  const trendCharts = computed(() => {
    if (memberRecords.value.length < 2) return []
    return [
      buildTrend('bmi', 'BMI', '#0d9488'),
      buildTrend('fatp', '體脂率', '#f43f5e'),
      buildTrend('pmm', '肌肉量', '#10b981'),
      buildTrend('vfatl', '內臟脂肪', '#f59e0b', 0)
    ].filter((t): t is NonNullable<typeof t> => t !== null)
  })

  // ── 格式化輔助 ────────────────────────────────────────
  function fmtNum(v: any, digits = 1) {
    if (v === null || v === undefined || v === '') return '–'
    const n = Number(v)
    return Number.isNaN(n) ? '–' : n.toFixed(digits)
  }
  function fmtDate(v: any) {
    return v ? String(v).slice(0, 10) : '–'
  }

  useHead({
    title: () => (groupName.value ? `${groupName.value} 班別報告 - 聖母健康農莊` : '身體組成分析 - 聖母健康農莊')
  })

  onMounted(load)
</script>

<style scoped>
  .bc-wrap {
    min-height: 100vh;
    background: #f4f7f3;
    font-family: 'Noto Sans TC', sans-serif;
    color: #1a3d28;
    display: flex;
    flex-direction: column;
  }
  .bc-header {
    background: linear-gradient(135deg, #1a3d28 0%, #2d5c3f 100%);
    color: #fff;
    padding: 8px 14px 10px;
  }
  .bc-header__inner {
    max-width: 720px;
    margin: 0 auto;
  }
  .bc-logo {
    font-size: 10px;
    letter-spacing: 0.08em;
    color: #bfe0cc;
    margin-bottom: 2px;
    display: none;
  }
  .bc-title {
    font-family: 'Noto Serif TC', serif;
    font-weight: 700;
    font-size: 15px;
    margin: 0;
  }
  .bc-sub {
    font-size: 12px;
    color: #cfe6d8;
    margin: 0;
    display: none;
  }
  .bc-main {
    flex: 1;
    max-width: 720px;
    width: 100%;
    margin: -4px auto 0;
    padding: 0 16px 40px;
  }
  .bc-card {
    background: #fff;
    border: 1px solid #dce8d8;
    border-radius: 12px;
    overflow: hidden;
    margin-bottom: 14px;
  }
  .bc-empty {
    padding: 28px 20px;
    font-size: 14px;
    color: #5c6b57;
    line-height: 1.7;
  }
  .bc-state {
    padding: 32px 16px;
    text-align: center;
    color: #8a978a;
    font-size: 14px;
  }
  .bc-state--error {
    color: #b0553b;
  }
  .bc-table-wrap {
    overflow-x: auto;
  }
  .bc-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 13.5px;
  }
  .bc-table thead {
    background: #2d5c3f;
    color: #fff;
  }
  .bc-table th {
    padding: 10px 12px;
    text-align: left;
    font-weight: 500;
    white-space: nowrap;
  }
  .bc-table td {
    padding: 9px 12px;
    border-bottom: 1px solid #eef2ec;
    white-space: nowrap;
  }
  .bc-table tbody tr:last-child td {
    border-bottom: none;
  }
  .bc-row-clickable {
    cursor: pointer;
    transition: background-color 0.12s;
  }
  .bc-row-clickable:hover {
    background: #f0f6f0;
  }
  .bc-row-active {
    background: #e4f1e6;
    font-weight: 600;
  }
  .bc-num {
    text-align: right;
  }
  .bc-table th.bc-num {
    text-align: right;
  }
  .bc-mono {
    font-variant-numeric: tabular-nums;
  }
  .bc-pagination {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 14px;
    margin-top: 16px;
    font-size: 13px;
    color: #5c6b57;
  }
  .bc-pagination button {
    border: 1px solid #dce8d8;
    background: #fff;
    border-radius: 6px;
    padding: 6px 12px;
    color: #1a3d28;
    cursor: pointer;
  }
  .bc-pagination button:disabled {
    opacity: 0.4;
    cursor: default;
  }
  .bc-footer {
    text-align: center;
    font-size: 12px;
    color: #8a978a;
    padding: 20px;
  }

  /* ── 左右兩欄（桌機）／手機轉跳全螢幕（一次只顯示一邊）── */
  .bc-layout {
    display: block;
  }
  .bc-layout__list,
  .bc-layout__detail {
    min-width: 0;
  }
  /* 手機：選了成員就整個切到詳情頁，名單先隱藏；沒選就只顯示名單 */
  .bc-mobile-hidden {
    display: none;
  }
  .bc-back {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    background: none;
    border: none;
    color: #2d5c3f;
    font-weight: 600;
    font-size: 14px;
    padding: 8px 0 12px;
    cursor: pointer;
  }
  @media (min-width: 860px) {
    .bc-main {
      max-width: 1040px;
      margin-top: -20px;
    }
    .bc-header__inner {
      max-width: 1040px;
    }
    .bc-header {
      padding: 32px 20px 40px;
    }
    .bc-logo {
      font-size: 13px;
      margin-bottom: 8px;
      display: block;
    }
    .bc-title {
      font-size: 24px;
      margin: 0 0 6px;
    }
    .bc-sub {
      font-size: 13px;
      display: block;
    }
    .bc-layout {
      display: grid;
      grid-template-columns: 1.1fr 1fr;
      gap: 20px;
      align-items: start;
    }
    .bc-layout__detail {
      position: sticky;
      top: 16px;
    }
    /* 桌機兩欄同時顯示，不套用手機的切換隱藏 */
    .bc-mobile-hidden {
      display: block;
    }
    /* 桌機用右上角 ✕ 關閉即可，不需要「返回名單」文字按鈕 */
    .bc-back {
      display: none;
    }
  }
  /* 大螢幕（≥1536px）吃滿整個畫面寬度 */
  @media (min-width: 1536px) {
    .bc-main,
    .bc-header__inner {
      max-width: none;
    }
    .bc-main {
      padding-left: 48px;
      padding-right: 48px;
    }
    .bc-header {
      padding-left: 32px;
      padding-right: 32px;
    }
  }

  /* ── 右側個人詳情 ── */
  .bc-placeholder {
    padding: 48px 20px;
    text-align: center;
    color: #8a978a;
    font-size: 13.5px;
  }
  .bc-detail-head {
    padding: 14px 16px;
  }
  .bc-detail-head__row {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
  }
  .bc-detail-name {
    font-family: 'Noto Serif TC', serif;
    font-size: 18px;
    font-weight: 700;
  }
  .bc-detail-meta {
    font-size: 12px;
    color: #6b7d68;
    margin-top: 2px;
  }
  .bc-close {
    border: none;
    background: #f0f4ef;
    color: #5c6b57;
    border-radius: 6px;
    width: 26px;
    height: 26px;
    cursor: pointer;
    font-size: 12px;
    flex-shrink: 0;
  }
  .bc-rangebars {
    padding: 14px 16px;
  }
  .bc-rangebar + .bc-rangebar {
    margin-top: 14px;
  }
  .bc-rangebar__head {
    display: flex;
    justify-content: space-between;
    font-size: 12px;
    color: #5c6b57;
    margin-bottom: 5px;
  }
  .bc-rangebar__head span:last-child {
    font-weight: 700;
  }
  .bc-rangebar__track {
    position: relative;
    height: 10px;
    border-radius: 999px;
    overflow: hidden;
    display: flex;
  }
  .bc-rangebar__seg {
    height: 100%;
  }
  .bc-rangebar__marker {
    position: absolute;
    top: -2px;
    width: 3px;
    height: 14px;
    border-radius: 2px;
    background: #fff;
    box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.35);
  }
  .bc-rangebar__labels {
    display: flex;
    font-size: 9.5px;
    color: #9aa89a;
    margin-top: 4px;
  }
  .bc-rangebar__labels span {
    text-align: center;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .bc-trends {
    display: grid;
    grid-template-columns: 1fr;
    gap: 12px;
    padding: 14px 16px;
  }
  @media (min-width: 520px) and (max-width: 859px) {
    .bc-trends {
      grid-template-columns: 1fr 1fr;
    }
  }
  .bc-trend {
    border: 1px solid #eef2ec;
    border-radius: 8px;
    padding: 10px;
  }
  .bc-trend__title {
    font-size: 11px;
    font-weight: 700;
    color: #5c6b57;
    margin-bottom: 4px;
  }
  .bc-trend__svg {
    width: 100%;
    height: 78px;
  }
  .bc-trend__foot {
    display: flex;
    justify-content: space-between;
    font-size: 10px;
    color: #9aa89a;
    margin-top: 2px;
    font-variant-numeric: tabular-nums;
  }
  .bc-badge {
    display: inline-block;
    margin-left: 4px;
    font-size: 9px;
    background: #2d5c3f;
    color: #fff;
    border-radius: 4px;
    padding: 1px 5px;
    vertical-align: middle;
  }
</style>
