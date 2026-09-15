<template>
  <InternalSystemPropertyShell>
  <div class="page">
    <div class="page-header">
      <h1 class="page-title">盤點設定</h1>
      <button type="button" class="btn-primary" @click="openAdd">＋ 新增</button>
    </div>

    <section class="card">
      <p v-if="loading" class="hint-text">載入中...</p>
      <p v-else-if="error" class="error-text">載入失敗</p>
      <p v-else-if="dataList.length === 0" class="hint-text">目前沒有盤點單</p>
      <div v-else class="table-wrap">
        <table class="data-table">
          <thead>
          <tr>
            <th>序號</th>
            <th>盤點單號</th>
            <th>機構</th>
            <th>名稱</th>
            <th>起始時間</th>
            <th>結束時間</th>
            <th>狀態</th>
            <th>創建者</th>
            <th>創建時間</th>
            <th>編輯</th>
            <th>作廢</th>
          </tr>
          </thead>
          <tbody>
          <tr v-for="(row, idx) in dataList" :key="row.it_id">
            <td>{{ idx + 1 }}</td>
            <td>{{ row.inventory_no }}</td>
            <td>{{ row.inst_name }}</td>
            <td>{{ row.title }}</td>
            <td>{{ row.start_time }}</td>
            <td>{{ row.end_time }}</td>
            <td>{{ statusText(row.it_status) }}</td>
            <td>{{ row.created_name }}({{ row.created_by }})</td>
            <td>{{ row.created_at }}</td>
            <td>
              <button v-if="isActive(row.it_status)" type="button" class="btn-sm" @click="openEdit(row)">編輯</button>
            </td>
            <td>
              <button v-if="isActive(row.it_status)" type="button" class="btn-sm btn-danger" @click="openAbort(row)">作廢</button>
            </td>
          </tr>
          </tbody>
        </table>
      </div>
    </section>

    <!-- 新增/編輯 -->
    <div v-if="editing" class="modal-backdrop" @click.self="editing = null">
      <div class="modal-box">
        <h3 class="modal-title">{{ editing.id ? `編輯 ${editing.inventory_no ?? ''}` : '新增' }}</h3>

        <div class="form-group">
          <label class="form-label">機構</label>
          <select v-model="editing.inst" class="form-select">
            <option value="">請選擇</option>
            <option v-for="inst in instList" :key="inst.Code" :value="inst.Code">{{ inst.Name }}</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">名稱</label>
          <input v-model="editing.title" type="text" class="form-select" placeholder="名稱" />
        </div>
        <div class="form-group">
          <label class="form-label">開始時間</label>
          <input v-model="editing.st" type="text" class="form-select" placeholder="YYYY-MM-DD HH:mm" disabled />
        </div>
        <div class="form-group">
          <label class="form-label">結束時間</label>
          <input v-model="etLocal" type="datetime-local" class="form-select" />
        </div>

        <div class="modal-actions">
          <button type="button" class="btn-sm" @click="editing = null">取消</button>
          <button type="button" class="btn-sm btn-primary-sm" :disabled="saving" @click="saveEdit">
            {{ saving ? '儲存中...' : '儲存' }}
          </button>
        </div>
      </div>
    </div>

    <!-- 作廢確認 -->
    <div v-if="abortTarget" class="modal-backdrop" @click.self="abortTarget = null">
      <div class="modal-box">
        <h3 class="modal-title">作廢 {{ abortTarget.inventory_no }}</h3>
        <p class="modal-text">你確定要作廢嗎？</p>
        <div class="modal-actions">
          <button type="button" class="btn-sm" @click="abortTarget = null">取消</button>
          <button type="button" class="btn-sm btn-danger" :disabled="aborting" @click="submitAbort">
            {{ aborting ? '處理中...' : '作廢' }}
          </button>
        </div>
      </div>
    </div>
  </div>
  </InternalSystemPropertyShell>
</template>

<script setup lang="ts">
  definePageMeta({ layout: 'staff', requiredPermission: 'content.internal-system', middleware: 'internal-system-auth' })

  /** 欄位名稱依畫面表頭推測，接上後如與實際回傳不符請告知我調整 */
  interface InventoryRow {
    it_id: string | number
    inventory_no: string
    institution: string
    inst_name: string
    title: string
    start_time: string
    end_time: string
    it_status: string | number
    created_name: string
    created_by: string
    created_at: string
  }

  interface InstOption { Code: string; Name: string }

  interface ListResponse {
    data: { dataList: InventoryRow[]; instList: InstOption[]; isUser?: boolean }
  }

  const dataList = ref<InventoryRow[]>([])
  const instList = ref<InstOption[]>([])
  const loading = ref(true)
  const error = ref(false)

  interface EditForm {
    id: string | number | null
    inventory_no?: string
    inst: string
    title: string
    st: string
    et: string
  }

  const editing = ref<EditForm | null>(null)
  const saving = ref(false)

  /** datetime-local 輸入框需要 'YYYY-MM-DDTHH:mm'，API 用的是 'YYYY-MM-DD HH:mm'，這裡做轉換 */
  const etLocal = computed({
    get: () => (editing.value?.et ? editing.value.et.replace(' ', 'T') : ''),
    set: (val: string) => {
      if (editing.value) editing.value.et = val.replace('T', ' ')
    },
  })

  const abortTarget = ref<InventoryRow | null>(null)
  const aborting = ref(false)

  const isActive = (status: string | number) => String(status) === '1'
  const statusText = (status: string | number) =>
          ({ '1': '執行中', '2': '結案', '3': '作廢' } as Record<string, string>)[String(status)] ?? '未知'

  const load = async () => {
    loading.value = true
    error.value = false
    try {
      const res = await $fetch<ListResponse>('/api/internal-system/property/inventory-set-list')
      dataList.value = res.data.dataList ?? []
      instList.value = res.data.instList ?? []
    } catch {
      error.value = true
    } finally {
      loading.value = false
    }
  }

  const nowFormatted = () => {
    const d = new Date()
    const pad = (n: number) => String(n).padStart(2, '0')
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
  }

  const openAdd = () => {
    editing.value = { id: null, inst: '', title: '', st: nowFormatted(), et: '' }
  }

  const openEdit = (row: InventoryRow) => {
    editing.value = {
      id: row.it_id,
      inventory_no: row.inventory_no,
      inst: row.institution,
      title: row.title,
      st: row.start_time,
      et: row.end_time,
    }
  }

  const saveEdit = async () => {
    if (!editing.value) return
    saving.value = true
    try {
      const res = await $fetch<{ rs: string; msg: string }>('/api/internal-system/property/inventory-set-save', {
        method: 'POST',
        body: {
          id: editing.value.id,
          inst: editing.value.inst,
          title: editing.value.title,
          st: editing.value.st,
          et: editing.value.et,
        },
      })
      if (res.rs === '1') {
        editing.value = null
        await load()
      } else {
        alert(res.msg ?? '儲存失敗')
      }
    } catch {
      alert('儲存失敗，請稍後再試')
    } finally {
      saving.value = false
    }
  }

  const openAbort = (row: InventoryRow) => {
    abortTarget.value = row
  }

  const submitAbort = async () => {
    if (!abortTarget.value) return
    aborting.value = true
    try {
      const res = await $fetch<{ rs: string; msg: string }>('/api/internal-system/property/inventory-set-abort', {
        method: 'POST',
        body: { id: abortTarget.value.it_id },
      })
      if (res.rs === '1') {
        abortTarget.value = null
        await load()
      } else {
        alert(res.msg ?? '作廢失敗')
      }
    } catch {
      alert('作廢失敗，請稍後再試')
    } finally {
      aborting.value = false
    }
  }

  onMounted(load)
</script>

<style scoped>
  .page { max-width: 1200px; }

  .page-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 20px;
  }

  .page-title {
    font-size: 20px;
    font-weight: 700;
    color: var(--text);
    margin: 0;
  }

  .btn-primary {
    padding: 8px 18px;
    background: var(--accent);
    color: white;
    border: none;
    border-radius: 8px;
    font-size: 13px;
    cursor: pointer;
  }

  .card {
    background: var(--surface);
    border: 1px solid var(--border-light);
    border-radius: var(--radius);
    box-shadow: var(--shadow);
    padding: 18px;
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

  .btn-sm {
    padding: 4px 12px;
    border: 1px solid var(--border);
    border-radius: 6px;
    background: var(--surface);
    color: var(--text);
    font-size: 12px;
    cursor: pointer;
  }
  .btn-sm:hover { background: var(--surface2); }

  .btn-danger {
    color: #e53e3e;
    border-color: #e53e3e;
  }

  .btn-primary-sm {
    background: var(--accent);
    color: white;
    border-color: var(--accent);
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
    padding: 22px;
    width: 380px;
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
  }

  .modal-title {
    margin: 0 0 16px;
    font-size: 16px;
    color: var(--text);
  }

  .modal-text {
    font-size: 14px;
    color: var(--text-muted);
    margin: 0 0 16px;
  }

  .form-group {
    margin-bottom: 12px;
  }

  .form-label {
    display: block;
    font-size: 12px;
    color: var(--text-muted);
    margin-bottom: 4px;
  }

  .form-select {
    width: 100%;
    box-sizing: border-box;
    padding: 8px 10px;
    border: 1px solid var(--border);
    border-radius: 8px;
    background: var(--surface);
    color: var(--text);
    font-size: 13px;
  }

  .modal-actions {
    display: flex;
    justify-content: flex-end;
    gap: 8px;
    margin-top: 16px;
  }
</style>