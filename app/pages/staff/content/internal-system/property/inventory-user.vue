<template>
  <InternalSystemPropertyShell>
  <div class="page">
    <h1 class="page-title">財產盤點(個人)</h1>

    <p v-if="loading" class="hint-text">載入中...</p>
    <p v-else-if="error" class="error-text">載入失敗</p>
    <p v-else-if="batches.length === 0" class="hint-text">目前沒有待盤點的財產</p>

    <div v-else class="batch-list">
      <section v-for="batch in batches" :key="batch.inventory_no" class="card">
        <div class="batch-header">
          <div class="batch-meta">
            <b>盤點單：</b>{{ batch.site_name }}　
            <b>單號：</b>{{ batch.inventory_no }}　
            <b>建立者：</b>{{ batch.creator_name }}({{ batch.creator_id }})　
            <b>盤點時間：</b>{{ batch.start_time }}～{{ batch.end_time }}
          </div>
          <div class="batch-created">建立時間：{{ batch.created_at }}</div>
        </div>

        <div class="batch-summary">
          已確認：<strong>{{ confirmedCount(batch) }}</strong> / {{ batch.items.length }}　
          存在：<strong class="text-exist">{{ existCount(batch) }}</strong>　
          不存在：<strong class="text-not-exist">{{ notExistCount(batch) }}</strong>
        </div>

        <div class="table-wrap">
          <table class="data-table">
            <thead>
            <tr>
              <th>序號</th>
              <th>財產編號</th>
              <th>類別</th>
              <th>名稱</th>
              <th>機構/保管單位</th>
              <th>保管人</th>
              <th>放置位置</th>
              <th>是否存在</th>
              <th>說明</th>
            </tr>
            </thead>
            <tbody>
            <tr v-for="(item, idx) in batch.items" :key="item.is_id">
              <td>{{ idx + 1 }}</td>
              <td>
                <a :href="propertySearchUrl(item.link)" target="_blank" rel="noopener">
                  {{ item.product_number }}
                </a>
              </td>
              <td>{{ item.class_name }}</td>
              <td>{{ item.product_name }}</td>
              <td>{{ item.department_label }}</td>
              <td>{{ item.custody_name }} ({{ item.custody_id }})</td>
              <td>{{ item.put_site }}</td>
              <td class="switch-cell">
                <div
                        class="inventory-switch"
                        :class="`status-${item.status}`"
                        @click="toggleStatus(item)"
                >
                  <span class="switch-label left">不存在</span>
                  <div class="switch-track">
                    <div class="switch-thumb" />
                  </div>
                  <span class="switch-label right">存在</span>
                </div>
              </td>
              <td>
                  <textarea
                          v-model="item.remark"
                          class="remark-input"
                          :class="{ invalid: item.status === 1 && !item.remark.trim() }"
                          rows="2"
                          placeholder="備註說明"
                  />
              </td>
            </tr>
            </tbody>
          </table>
        </div>
      </section>
    </div>

    <div class="action-bar">
      <button type="button" class="save-btn" :disabled="saving" @click="save">
        {{ saving ? '處理中...' : '儲存' }}
      </button>
    </div>
  </div>
  </InternalSystemPropertyShell>
</template>

<script setup lang="ts">
  definePageMeta({ layout: 'staff', requiredPermission: 'content.internal-system', middleware: 'internal-system-auth' })

  /** 畫面顯示用的內部型別（跟 API 實際欄位名稱不同，統一在 load() 裡轉換） */
  interface InventoryItem {
    is_id: string | number
    product_number: string
    class_name: string
    product_name: string
    department_label: string
    custody_name: string
    custody_id: string
    put_site: string
    link: string
    status: number // 0 = 尚未確認, 1 = 不存在, 2 = 存在
    remark: string
  }

  interface InventoryBatch {
    inventory_no: string
    site_name: string
    creator_name: string
    creator_id: string
    start_time: string
    end_time: string
    created_at: string
    items: InventoryItem[]
  }

  /** api/inventory_user_CL.php?act=index_page 實際回傳的形狀 */
  interface RawInventoryItem {
    is_id: string | number
    product_num: string
    product_name: string
    class_name: string
    inst_name: string | null
    dept_name: string | null
    custody: string
    custody_name: string
    put_site_name: string
    borrow_info: string | null
    check_status: string | number | null
    check_id: string | null
    check_time: string | null
    is_remark: string | null
    link: string
  }

  interface RawInventoryBatch {
    inventory_no: string
    title: string
    start_time: string
    end_time: string
    created_name: string
    created_by: string
    created_at: string
    snapshots: RawInventoryItem[]
  }

  interface InventoryListResponse {
    rs: number | string
    msg: string
    data: { dataList: RawInventoryBatch[] }
  }

  const batches = ref<InventoryBatch[]>([])
  const loading = ref(true)
  const error = ref(false)
  const saving = ref(false)

  const load = async () => {
    loading.value = true
    error.value = false
    try {
      const res = await $fetch<InventoryListResponse>('/api/internal-system/property/inventory-user-list')
      batches.value = (res.data?.dataList ?? []).map((b): InventoryBatch => ({
        inventory_no: b.inventory_no,
        site_name: b.title,
        creator_name: b.created_name,
        creator_id: b.created_by,
        start_time: b.start_time,
        end_time: b.end_time,
        created_at: b.created_at,
        items: (b.snapshots ?? []).map((it): InventoryItem => ({
        is_id: it.is_id,
        product_number: it.product_num,
        class_name: it.class_name,
        product_name: it.product_name,
        department_label: [it.inst_name, it.dept_name].filter(Boolean).join(' / '),
        custody_name: it.custody_name,
        custody_id: it.custody,
        put_site: it.put_site_name,
        link: it.link,
        status: Number(it.check_status) || 0,
        remark: it.is_remark ?? '',
      })),
    }))
    } catch {
      error.value = true
    } finally {
      loading.value = false
    }
  }

  function toggleStatus(item: InventoryItem) {
    // 照舊系統邏輯：0 一定先變成 2(存在)，之後只在 1/2 之間切換，不會回到 0
    if (item.status === 0) item.status = 2
    else if (item.status === 2) item.status = 1
    else item.status = 2
  }

  function confirmedCount(batch: InventoryBatch) {
    return batch.items.filter((i) => i.status !== 0).length
  }
  function existCount(batch: InventoryBatch) {
    return batch.items.filter((i) => i.status === 2).length
  }
  function notExistCount(batch: InventoryBatch) {
    return batch.items.filter((i) => i.status === 1).length
  }

  function propertySearchUrl(link: string) {
    return `http://192.168.181.249/A113/${link}`
  }

  function validate(): boolean {
    let valid = true
    for (const batch of batches.value) {
      for (const item of batch.items) {
        if (item.status === 1 && !item.remark.trim()) {
          valid = false
        }
      }
    }
    return valid
  }

  async function save() {
    if (!validate()) {
      alert('不存在項目必須填寫說明!')
      return
    }

    const inventoryState: Record<string, Record<string, { status: number; remark: string }>> = {}
    for (const batch of batches.value) {
      inventoryState[batch.inventory_no] = {}
      for (const item of batch.items) {
        inventoryState[batch.inventory_no][String(item.is_id)] = {
          status: item.status,
          remark: item.remark,
        }
      }
    }

    saving.value = true
    try {
      const res = await $fetch<{ rs: number | string; msg: string }>('/api/internal-system/property/inventory-user-save', {
        method: 'POST',
        body: { inventoryState },
      })
      // eslint-disable-next-line eqeqeq -- 舊系統 rs 有時是數字有時是字串，照原始碼一樣用寬鬆比對
      if (res.rs == 1) {
        alert(res.msg ?? '儲存成功')
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

  onMounted(load)
</script>

<style scoped>
  .page {
    max-width: 1200px;
    padding-bottom: 80px; /* 給底部固定的儲存列留空間 */
  }

  .page-title {
    font-size: 20px;
    font-weight: 700;
    color: var(--text);
    margin: 0 0 20px;
  }

  .hint-text { color: var(--text-hint); font-size: 13px; }
  .error-text { color: #e53e3e; font-size: 13px; }

  .batch-list {
    display: flex;
    flex-direction: column;
    gap: 20px;
  }

  .card {
    background: var(--surface);
    border: 1px solid var(--border-light);
    border-radius: var(--radius);
    box-shadow: var(--shadow);
    padding: 16px;
  }

  .batch-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 6px;
    margin-bottom: 10px;
  }

  .batch-meta {
    font-size: 13px;
    color: var(--text);
  }

  .batch-created {
    font-size: 12px;
    color: var(--text-hint);
  }

  .batch-summary {
    text-align: right;
    font-size: 13px;
    color: var(--text-muted);
    margin-bottom: 12px;
  }

  .text-exist { color: #38a169; }
  .text-not-exist { color: #e53e3e; }

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
    vertical-align: middle;
  }

  .data-table th {
    background: var(--surface2);
    color: var(--text-muted);
    white-space: nowrap;
  }

  .switch-cell { min-width: 140px; }

  .inventory-switch {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    cursor: pointer;
    user-select: none;
  }

  .switch-track {
    width: 44px;
    height: 22px;
    border-radius: 22px;
    background: #adb5bd;
    position: relative;
    transition: background 0.2s;
    flex-shrink: 0;
  }

  .switch-thumb {
    width: 16px;
    height: 16px;
    background: white;
    border-radius: 50%;
    position: absolute;
    top: 3px;
    left: 3px;
    transition: transform 0.2s, opacity 0.2s;
    opacity: 0;
  }

  .switch-label { font-size: 11px; font-weight: 700; color: var(--text-hint); }

  .inventory-switch.status-1 .switch-track { background: #e53e3e; }
  .inventory-switch.status-1 .switch-thumb { opacity: 1; transform: translateX(0); }
  .inventory-switch.status-1 .switch-label.left { color: #e53e3e; }

  .inventory-switch.status-2 .switch-track { background: #38a169; }
  .inventory-switch.status-2 .switch-thumb { opacity: 1; transform: translateX(22px); }
  .inventory-switch.status-2 .switch-label.right { color: #38a169; }

  .remark-input {
    width: 100%;
    box-sizing: border-box;
    padding: 6px 8px;
    border: 1px solid var(--border);
    border-radius: 6px;
    background: var(--surface);
    color: var(--text);
    font-size: 12px;
    font-family: inherit;
    resize: vertical;
  }
  .remark-input.invalid { border-color: #e53e3e; }

  .action-bar {
    position: fixed;
    left: 0;
    right: 0;
    bottom: 0;
    background: #2d3748;
    padding: 12px 20px;
    display: flex;
    justify-content: flex-end;
    z-index: 150;
  }

  .save-btn {
    padding: 8px 24px;
    background: #f6ad55;
    color: #2d3748;
    border: none;
    border-radius: 8px;
    font-size: 14px;
    font-weight: 700;
    cursor: pointer;
  }
  .save-btn:disabled { opacity: 0.6; cursor: not-allowed; }
</style>