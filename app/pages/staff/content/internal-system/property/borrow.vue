<template>
  <InternalSystemPropertyShell>
  <div class="page">
    <h1 class="page-title">代管中財產</h1>

    <section class="card">
      <h2 class="card-title">📤 我代管的</h2>
      <p v-if="loading" class="hint-text">載入中...</p>
      <p v-else-if="error" class="error-text">載入失敗</p>
      <p v-else-if="myBorrow.length === 0" class="hint-text">目前沒有代管中的財產</p>
      <div v-else class="table-wrap">
        <table class="data-table">
          <thead>
            <tr>
              <th>編號</th>
              <th>原保管</th>
              <th>代管人</th>
              <th>原地點</th>
              <th>代管地點</th>
              <th>開始時間</th>
              <th>結束時間</th>
              <th>備註</th>
              <th>狀態</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in myBorrow" :key="row.id">
              <td>{{ row.product_id }}</td>
              <td>{{ row.original_custody_name }}</td>
              <td>{{ row.borrow_custody_name }}</td>
              <td>{{ row.original_site_name }}</td>
              <td>{{ row.borrow_site_name }}</td>
              <td>{{ row.start_time }}</td>
              <td>{{ row.end_time }}</td>
              <td>{{ row.remark }}</td>
              <td>{{ row.status_text }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <section class="card">
      <h2 class="card-title">📥 被代管的</h2>
      <p v-if="loading" class="hint-text">載入中...</p>
      <p v-else-if="error" class="error-text">載入失敗</p>
      <p v-else-if="borrowMe.length === 0" class="hint-text">目前沒有被代管的財產</p>
      <div v-else class="table-wrap">
        <table class="data-table">
          <thead>
            <tr>
              <th>編號</th>
              <th>原保管</th>
              <th>代管人</th>
              <th>原地點</th>
              <th>代管地點</th>
              <th>開始時間</th>
              <th>結束時間</th>
              <th>備註</th>
              <th>狀態</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in borrowMe" :key="row.id">
              <td>{{ row.product_id }}</td>
              <td>{{ row.original_custody_name }}</td>
              <td>{{ row.borrow_custody_name }}</td>
              <td>{{ row.original_site_name }}</td>
              <td>{{ row.borrow_site_name }}</td>
              <td>{{ row.start_time }}</td>
              <td>{{ row.end_time }}</td>
              <td>{{ row.remark }}</td>
              <td>{{ row.status_text }}</td>
              <td>
                <div v-if="row.status === 1" class="row-actions">
                  <button type="button" class="btn-sm btn-confirm" @click="openConfirm(row, 'confirm')">接收</button>
                  <button type="button" class="btn-sm btn-cancel" @click="openConfirm(row, 'cancel')">取消</button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <!-- 確認視窗 -->
    <div v-if="confirmTarget" class="modal-backdrop" @click.self="confirmTarget = null">
      <div class="modal-box">
        <h3 class="modal-title">{{ confirmType === 'cancel' ? '取消' : '接收' }}</h3>
        <p class="modal-text">
          你確定要{{ confirmType === 'cancel' ? '取消' : '接收' }} {{ confirmTarget.product_id }} 嗎？
        </p>
        <div class="modal-actions">
          <button type="button" class="btn-sm" @click="confirmTarget = null">取消</button>
          <button type="button" class="btn-sm btn-confirm" :disabled="submitting" @click="submitConfirm">
            {{ submitting ? '處理中...' : '確定' }}
          </button>
        </div>
      </div>
    </div>
  </div>
  </InternalSystemPropertyShell>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'staff', requiredPermission: 'content.internal-system', middleware: 'internal-system-auth' })

/**
 * 注意：以下欄位名稱 (product_id / original_custody_name ... 等) 是依照畫面欄位
 * 「編號、原保管、代管人、原地點、代管地點、開始時間、結束時間、備註、狀態」推測，
 * 舊系統實際回傳的 JSON 欄位名稱若不同，接上後請告知我調整。
 */
interface BorrowRow {
  id: string | number
  product_id: string
  original_custody_name: string
  borrow_custody_name: string
  original_site_name: string
  borrow_site_name: string
  start_time: string
  end_time: string
  remark: string
  status: number
  status_text: string
}

interface BorrowListResponse {
  data: {
    myBorrow: BorrowRow[]
    borrowMe: BorrowRow[]
  }
}

const myBorrow = ref<BorrowRow[]>([])
const borrowMe = ref<BorrowRow[]>([])
const loading = ref(true)
const error = ref(false)

const confirmTarget = ref<BorrowRow | null>(null)
const confirmType = ref<'confirm' | 'cancel'>('confirm')
const submitting = ref(false)

const load = async () => {
  loading.value = true
  error.value = false
  try {
    const res = await $fetch<BorrowListResponse>('/api/internal-system/property/borrow-list')
    myBorrow.value = res.data.myBorrow ?? []
    borrowMe.value = res.data.borrowMe ?? []
  } catch {
    error.value = true
  } finally {
    loading.value = false
  }
}

const openConfirm = (row: BorrowRow, type: 'confirm' | 'cancel') => {
  confirmTarget.value = row
  confirmType.value = type
}

const submitConfirm = async () => {
  if (!confirmTarget.value) return
  submitting.value = true
  try {
    const res = await $fetch<{ rs: string; msg: string }>('/api/internal-system/property/borrow-update', {
      method: 'POST',
      body: { id: confirmTarget.value.id, type: confirmType.value },
    })
    if (res.rs === '1') {
      confirmTarget.value = null
      await load()
    } else {
      alert(res.msg ?? '操作失敗')
    }
  } catch {
    alert('操作失敗，請稍後再試')
  } finally {
    submitting.value = false
  }
}

onMounted(load)
</script>

<style scoped>
.page {
  max-width: 1100px;
}

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
  margin: 0 0 12px;
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

.row-actions {
  display: flex;
  gap: 6px;
  justify-content: center;
}

.btn-sm {
  padding: 4px 10px;
  border: 1px solid var(--border);
  border-radius: 6px;
  background: var(--surface);
  color: var(--text);
  font-size: 12px;
  cursor: pointer;
}
.btn-sm:hover { background: var(--surface2); }

.btn-confirm {
  background: var(--accent);
  color: white;
  border-color: var(--accent);
}

.btn-cancel {
  color: #e53e3e;
  border-color: #e53e3e;
}

.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 200;
}

.modal-box {
  background: var(--surface);
  border-radius: var(--radius);
  padding: 20px;
  width: 320px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
}

.modal-title {
  margin: 0 0 10px;
  font-size: 16px;
  color: var(--text);
}

.modal-text {
  font-size: 14px;
  color: var(--text-muted);
  margin: 0 0 16px;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}
</style>