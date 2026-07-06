<template>
  <div class="min-h-full bg-surface2 transition-colors page-wrap">
    <!-- ── 頁首 ── -->
    <div class="page-header bg-surface border-b border-light-c">
      <div class="flex items-center gap-2">
        <div class="w-9 h-9 rounded-lg bg-amber-600 flex items-center justify-center text-white flex-shrink-0" style="font-size:16px">
          🍋
        </div>
        <div>
          <div class="font-bold text-base-c leading-none" style="font-size:16px">鹹檸檬醬進銷存表</div>
          <div class="text-hint-c mt-0.5" style="font-size:11.5px">進貨 / 出貨（海錦富・農莊）/ 樣品 / 庫存量 紀錄</div>
        </div>
      </div>
      <button class="add-btn" @click="openAddForm">＋ 新增紀錄</button>
    </div>

    <div class="page-body">
      <!-- ── 統計卡片 ── -->
      <div class="stat-grid">
        <div class="stat-card bg-surface border border-light-c">
          <div class="stat-label text-muted-c">目前庫存</div>
          <div class="stat-value text-base-c">{{ currentStock }} <span class="stat-unit text-hint-c">罐</span></div>
        </div>
        <div class="stat-card bg-surface border border-light-c">
          <div class="stat-label text-muted-c">累計進貨</div>
          <div class="stat-value text-base-c">{{ totals.purchase }} <span class="stat-unit text-hint-c">罐</span></div>
        </div>
        <div class="stat-card bg-surface border border-light-c">
          <div class="stat-label text-muted-c">海錦富累計出貨</div>
          <div class="stat-value text-base-c">{{ totals.haijinfu }} <span class="stat-unit text-hint-c">罐</span></div>
        </div>
        <div class="stat-card bg-surface border border-light-c">
          <div class="stat-label text-muted-c">農莊累計出貨</div>
          <div class="stat-value text-base-c">{{ totals.farm }} <span class="stat-unit text-hint-c">罐</span></div>
        </div>
        <div class="stat-card bg-surface border border-light-c">
          <div class="stat-label text-muted-c">樣品累計</div>
          <div class="stat-value text-base-c">{{ totals.sample }} <span class="stat-unit text-hint-c">罐</span></div>
        </div>
      </div>

      <!-- ── 庫存趨勢圖 ── -->
      <div class="chart-card bg-surface border border-light-c">
        <div class="chart-title text-muted-c">庫存量趨勢</div>
        <svg v-if="records.length" :viewBox="`0 0 ${chartW} ${chartH}`" class="chart-svg" preserveAspectRatio="none">
          <polyline :points="chartPoints" fill="none" stroke="#d97706" stroke-width="2" />
          <polygon :points="chartAreaPoints" fill="#d97706" opacity="0.12" />
          <circle
            v-for="(p, i) in chartCirclePoints"
            :key="i"
            :cx="p.x"
            :cy="p.y"
            r="3"
            fill="#d97706"
          />
        </svg>
        <div v-else class="empty-hint text-hint-c">尚無資料</div>
      </div>

      <!-- ── 新增/編輯表單 ── -->
      <div v-if="formOpen" class="form-card bg-surface border border-light-c">
        <div class="form-title text-base-c">{{ editingId === null ? '新增紀錄' : '編輯紀錄' }}</div>
        <div class="form-grid">
          <label class="form-field">
            <span class="form-label text-muted-c">日期</span>
            <input v-model="draft.date" type="date" class="form-inp border-light-c bg-surface text-base-c">
          </label>
          <label class="form-field">
            <span class="form-label text-muted-c">進貨（罐）</span>
            <input v-model.number="draft.purchase" type="number" min="0" class="form-inp border-light-c bg-surface text-base-c">
          </label>
          <label class="form-field">
            <span class="form-label text-muted-c">海錦富出貨（罐）</span>
            <input v-model.number="draft.haijinfu" type="number" min="0" class="form-inp border-light-c bg-surface text-base-c">
          </label>
          <label class="form-field">
            <span class="form-label text-muted-c">農莊出貨（罐）</span>
            <input v-model.number="draft.farm" type="number" min="0" class="form-inp border-light-c bg-surface text-base-c">
          </label>
          <label class="form-field">
            <span class="form-label text-muted-c">樣品（罐）</span>
            <input v-model.number="draft.sample" type="number" min="0" class="form-inp border-light-c bg-surface text-base-c">
          </label>
          <label class="form-field">
            <span class="form-label text-muted-c">庫存量（自動計算，可手動覆蓋）</span>
            <input v-model.number="draft.stockOverride" type="number" :placeholder="String(previewStock)" class="form-inp border-light-c bg-surface text-base-c">
          </label>
        </div>
        <div class="form-actions">
          <button class="save-btn" @click="confirmSave">✓ 儲存</button>
          <button class="cancel-btn border-light-c text-base-c" @click="closeForm">✕ 取消</button>
        </div>
      </div>

      <!-- ── 紀錄表格 ── -->
      <div class="table-card bg-surface border border-light-c">
        <table class="ledger-table">
          <thead>
            <tr>
              <th>日期</th>
              <th>進貨</th>
              <th>海錦富出貨</th>
              <th>農莊出貨</th>
              <th>樣品</th>
              <th>庫存量</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="rec in sortedRecords" :key="rec.id">
              <td>{{ rec.date }}</td>
              <td>{{ rec.purchase || '' }}</td>
              <td>{{ rec.haijinfu || '' }}</td>
              <td>{{ rec.farm || '' }}</td>
              <td>{{ rec.sample || '' }}</td>
              <td class="stock-cell">{{ rec.stock }}</td>
              <td class="row-actions">
                <button class="act-btn" title="編輯" @click="startEdit(rec)">✎</button>
                <template v-if="confirmDeleteId === rec.id">
                  <span class="del-confirm-label">確定？</span>
                  <button class="del-yes" @click="deleteRecord(rec.id)">是</button>
                  <button class="del-no border-light-c text-base-c" @click="confirmDeleteId = null">否</button>
                </template>
                <button v-else class="act-btn del" title="刪除" @click="confirmDeleteId = rec.id">✕</button>
              </td>
            </tr>
            <tr v-if="records.length === 0">
              <td colspan="7" class="empty-row text-hint-c">尚無紀錄，請點右上角「＋ 新增紀錄」</td>
            </tr>
          </tbody>
          <tfoot v-if="records.length">
            <tr>
              <td class="text-base-c" style="font-weight:bold">合計</td>
              <td style="font-weight:bold">{{ totals.purchase }}</td>
              <td style="font-weight:bold">{{ totals.haijinfu }}</td>
              <td style="font-weight:bold">{{ totals.farm }}</td>
              <td style="font-weight:bold">{{ totals.sample }}</td>
              <td style="font-weight:bold">{{ currentStock }}</td>
              <td></td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed } from 'vue'

definePageMeta({ layout: 'staff', requiredPermission: 'management.lemon-sauce-inventory' })

/* ══════════════════════════════════
   TODO（接後端時使用）：
   const commonStore = useCommonStore()
   const BASE = () => commonStore.data.main_url + '/holy/lemon-sauce-inventory'
   目前先以本地模擬資料運作，之後可將
   loadRecords / saveRecord / deleteRecord
   換成 apiFetch(`${BASE()}/...`) 呼叫，並比照既有 YAML 慣例
   （FileConfiguration / YmlFileUtil）在後端做持久化。
══════════════════════════════════ */

/* ── 模擬資料（依實際 xlsx 內容還原，含起始筆數） ── */
let nextId = 1
function rec(date, purchase, haijinfu, farm, sample, stock) {
  return { id: nextId++, date, purchase: purchase || 0, haijinfu: haijinfu || 0, farm: farm || 0, sample: sample || 0, stock }
}
const records = reactive([
  rec('2024-11-27', 883, 746, 29, 0, 108),
  rec('2024-12-05', 0, 0, 24, 0, 84),
  rec('2024-12-11', 0, 0, 24, 0, 60),
  rec('2024-12-23', 0, 60, 0, 0, 0),
  rec('2024-12-25', 115, 0, 24, 0, 91),
  rec('2025-01-13', 0, 0, 24, 0, 67),
  rec('2025-01-13', 0, 67, 0, 0, 0),
  rec('2025-01-15', 148, 0, 0, 0, 148),
  rec('2025-01-16', 0, 72, 36, 0, 40),
  rec('2025-02-06', 0, 0, 40, 0, 0),
  rec('2025-02-11', 156, 0, 0, 0, 156),
  rec('2025-02-20', 0, 0, 36, 0, 120),
  rec('2025-02-21', 0, 0, 24, 0, 96),
  rec('2025-02-28', 0, 0, 24, 0, 72),
  rec('2025-03-28', 0, 0, 72, 0, 0),
  rec('2025-04-07', 658, 0, 0, 0, 658),
  rec('2025-04-08', 0, 612, 0, 0, 46),
  rec('2025-04-10', 0, 24, 0, 0, 22),
  rec('2025-07-22', 1478, 0, 0, 0, 1500),
  rec('2025-07-22', 0, 0, 120, 0, 1380),
  rec('2025-07-24', 0, 96, 0, 0, 1284),
  rec('2025-07-29', 0, 0, 60, 0, 1224),
  rec('2025-08-01', 0, 1224, 0, 0, 0),
  rec('2025-08-27', 116, 0, 0, 0, 116),
  rec('2025-08-29', 0, 84, 32, 0, 0),
  rec('2025-09-10', 112, 0, 0, 0, 112),
  rec('2025-09-12', 0, 96, 0, 0, 16),
  rec('2025-10-28', 119, 120, 0, 0, 15),
  rec('2025-11-10', 78, 0, 0, 0, 93),
  rec('2025-11-10', 0, 60, 0, 0, 33),
  rec('2025-11-20', 0, 0, 33, 0, 0),
  rec('2025-11-26', 152, 0, 0, 0, 152),
  rec('2025-11-27', 0, 108, 0, 0, 44),
  rec('2025-12-19', 154, 0, 0, 0, 198),
  rec('2025-12-29', 0, 120, 0, 0, 78),
  rec('2025-12-30', 190, 0, 0, 0, 268),
  rec('2025-12-31', 251, 0, 0, 0, 519),
  rec('2026-01-02', 160, 450, 0, 0, 229),
  rec('2026-01-05', 0, 0, 50, 0, 179),
  rec('2026-01-13', 0, 60, 0, 1, 118),
  rec('2026-01-16', 0, 0, 50, 0, 68),
  rec('2026-01-28', 158, 0, 0, 1, 225),
  rec('2026-01-29', 0, 192, 0, 0, 33),
  rec('2026-03-13', 187, 0, 51, 1, 168),
  rec('2026-03-16', 0, 156, 0, 0, 12),
  rec('2026-04-22', 117, 0, 0, 0, 129),
  rec('2026-04-23', 0, 96, 0, 1, 32),
  rec('2026-05-15', 156, 0, 50, 1, 137),
  rec('2026-05-26', 111, 156, 0, 1, 91),
  rec('2026-06-04', 156, 0, 0, 0, 247),
  rec('2026-06-05', 157, 0, 0, 0, 404),
  rec('2026-06-08', 157, 0, 0, 0, 561),
  rec('2026-06-09', 153, 0, 0, 0, 714),
  rec('2026-06-10', 157, 0, 0, 1, 870),
  rec('2026-06-16', 0, 121, 0, 0, 749),
  rec('2026-06-22', 0, 732, 0, 0, 17)
])

const sortedRecords = computed(() => [...records].sort((a, b) => a.date.localeCompare(b.date) || a.id - b.id))
const currentStock = computed(() => (sortedRecords.value.length ? sortedRecords.value[sortedRecords.value.length - 1].stock : 0))

const totals = computed(() => records.reduce((acc, r) => {
  acc.purchase += r.purchase
  acc.haijinfu += r.haijinfu
  acc.farm += r.farm
  acc.sample += r.sample
  return acc
}, { purchase: 0, haijinfu: 0, farm: 0, sample: 0 }))

/* ── 庫存趨勢圖（簡易 SVG 折線圖） ── */
const chartW = 900
const chartH = 160
const chartPoints = computed(() => {
  const list = sortedRecords.value
  if (!list.length) return ''
  const max = Math.max(...list.map(r => r.stock), 1)
  const stepX = list.length > 1 ? chartW / (list.length - 1) : 0
  return list.map((r, i) => {
    const x = list.length > 1 ? i * stepX : chartW / 2
    const y = chartH - 10 - (r.stock / max) * (chartH - 20)
    return `${x.toFixed(1)},${y.toFixed(1)}`
  }).join(' ')
})
const chartCirclePoints = computed(() => {
  if (!chartPoints.value) return []
  return chartPoints.value.split(' ').map(pair => {
    const [x, y] = pair.split(',').map(Number)
    return { x, y }
  })
})
const chartAreaPoints = computed(() => {
  if (!chartPoints.value) return ''
  return `0,${chartH} ${chartPoints.value} ${chartW},${chartH}`
})

/* ── 新增／編輯表單 ── */
const formOpen = ref(false)
const editingId = ref(null)
const draft = reactive({ date: '', purchase: 0, haijinfu: 0, farm: 0, sample: 0, stockOverride: null })

function todayStr() {
  return new Date().toISOString().slice(0, 10)
}

/* 依日期排序後，取「上一筆」的庫存量作為計算基礎 */
const previewStock = computed(() => {
  const base = [...records]
    .filter(r => r.id !== editingId.value)
    .filter(r => r.date <= (draft.date || '9999'))
    .sort((a, b) => a.date.localeCompare(b.date) || a.id - b.id)
  const prevStock = base.length ? base[base.length - 1].stock : 0
  return prevStock + (draft.purchase || 0) - (draft.haijinfu || 0) - (draft.farm || 0) - (draft.sample || 0)
})

function openAddForm() {
  editingId.value = null
  draft.date = todayStr()
  draft.purchase = 0
  draft.haijinfu = 0
  draft.farm = 0
  draft.sample = 0
  draft.stockOverride = null
  formOpen.value = true
}
function startEdit(rec) {
  editingId.value = rec.id
  draft.date = rec.date
  draft.purchase = rec.purchase
  draft.haijinfu = rec.haijinfu
  draft.farm = rec.farm
  draft.sample = rec.sample
  draft.stockOverride = rec.stock
  formOpen.value = true
}
function closeForm() {
  formOpen.value = false
  editingId.value = null
}
function confirmSave() {
  if (!draft.date) return
  const stock = draft.stockOverride === null || draft.stockOverride === '' ? previewStock.value : draft.stockOverride
  if (editingId.value === null) {
    records.push(rec(draft.date, draft.purchase, draft.haijinfu, draft.farm, draft.sample, stock))
  } else {
    const target = records.find(r => r.id === editingId.value)
    if (target) Object.assign(target, { date: draft.date, purchase: draft.purchase, haijinfu: draft.haijinfu, farm: draft.farm, sample: draft.sample, stock })
  }
  closeForm()
}

const confirmDeleteId = ref(null)
function deleteRecord(id) {
  const idx = records.findIndex(r => r.id === id)
  if (idx !== -1) records.splice(idx, 1)
  confirmDeleteId.value = null
}
</script>

<style scoped>
.page-wrap {
  min-height: 100%;
}

.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 20px;
  flex-wrap: wrap;
  gap: 10px;
}

.add-btn {
  background: #d97706;
  color: white;
  border: none;
  border-radius: 8px;
  padding: 8px 16px;
  font-size: 13px;
  font-weight: bold;
  cursor: pointer;
}

.page-body {
  padding: 18px 20px 40px;
  display: flex;
  flex-direction: column;
  gap: 18px;
  max-width: 1100px;
  margin: 0 auto;
}

/* ── 統計卡片 ── */
.stat-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 12px;
}

.stat-card {
  border-radius: 10px;
  padding: 12px 14px;
}

.stat-label {
  font-size: 11.5px;
  margin-bottom: 4px;
}

.stat-value {
  font-size: 22px;
  font-weight: bold;
}

.stat-unit {
  font-size: 12px;
  font-weight: normal;
}

/* ── 圖表卡片 ── */
.chart-card {
  border-radius: 10px;
  padding: 14px 16px;
}

.chart-title {
  font-size: 12px;
  margin-bottom: 8px;
}

.chart-svg {
  width: 100%;
  height: 160px;
  display: block;
}

.empty-hint {
  font-size: 13px;
  text-align: center;
  padding: 30px 0;
}

/* ── 表單卡片 ── */
.form-card {
  border-radius: 10px;
  padding: 16px;
}

.form-title {
  font-size: 14px;
  font-weight: bold;
  margin-bottom: 12px;
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 10px;
}

.form-field {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.form-label {
  font-size: 11px;
}

.form-inp {
  border: 1px solid var(--border-light, #ddd);
  border-radius: 8px;
  padding: 6px 10px;
  font-size: 13px;
  outline: none;
}

.form-actions {
  display: flex;
  gap: 8px;
  margin-top: 14px;
}

.save-btn, .cancel-btn {
  border-radius: 8px;
  padding: 7px 16px;
  font-size: 13px;
  cursor: pointer;
  font-weight: bold;
}

.save-btn {
  background: #d97706;
  color: white;
  border: none;
}

.cancel-btn {
  background: transparent;
  border: 1px solid;
}

/* ── 表格卡片 ── */
.table-card {
  border-radius: 10px;
  overflow-x: auto;
}

.ledger-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}

.ledger-table th, .ledger-table td {
  border-bottom: 1px solid rgba(128,128,128,.15);
  padding: 8px 10px;
  text-align: center;
  white-space: nowrap;
}

.ledger-table thead th {
  font-size: 12px;
  opacity: .7;
  font-weight: bold;
  border-bottom: 1px solid rgba(128,128,128,.3);
}

.ledger-table tfoot td {
  border-top: 2px solid rgba(128,128,128,.3);
  border-bottom: none;
}

.stock-cell {
  font-weight: bold;
  color: #d97706;
}

.row-actions {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
}

.act-btn {
  border: none;
  background: transparent;
  cursor: pointer;
  font-size: 12px;
  opacity: .55;
  padding: 2px 4px;
}

.act-btn:hover {
  opacity: 1;
}

.act-btn.del:hover {
  color: #ef4444;
}

.del-confirm-label {
  font-size: 11px;
  opacity: .7;
}

.del-yes, .del-no {
  border: 1px solid;
  border-radius: 5px;
  font-size: 11px;
  padding: 1px 6px;
  cursor: pointer;
}

.del-yes {
  background: #ef4444;
  color: white;
  border-color: #ef4444;
}

.empty-row {
  text-align: center;
  padding: 20px;
}

@media (max-width: 640px) {
  .page-header {
    flex-direction: column;
    align-items: flex-start;
  }
  .add-btn {
    width: 100%;
  }
}
</style>
