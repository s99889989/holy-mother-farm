<template>
  <InternalSystemCalendarNav />
  <div class="detail-page">
    <div class="detail-header">
      <button class="back-btn" @click="goBack">&#8592; 回上頁</button>
      <h2>行事曆詳細</h2>
      <template v-if="canEdit">
        <NuxtLink
                :to="`/staff/content/internal-system/calendar/edit/${id}?place=${encodeURIComponent(Object.entries(data?.fields ?? {}).find(([k]) => k.replace(/\s/g, '') === '地點')?.[1] ?? '')}`"
                class="btn-edit"
        >✏️ 編輯</NuxtLink>
        <button class="btn-delete" @click="confirmDelete">🗑 刪除</button>
      </template>
    </div>

    <!-- 刪除確認對話框 -->
    <div v-if="showConfirm" class="confirm-overlay" @click.self="showConfirm = false">
      <div class="confirm-dialog">
        <h3>確認刪除</h3>
        <p>確定要刪除這筆行事曆嗎？此操作無法復原。</p>
        <div class="confirm-actions">
          <button class="btn-cancel" @click="showConfirm = false">取消</button>
          <button class="btn-confirm-delete" :disabled="deleting" @click="handleDelete">
            {{ deleting ? '刪除中...' : '確認刪除' }}
          </button>
        </div>
      </div>
    </div>

    <div v-if="loading" class="loading">載入中...</div>
    <div v-else-if="!data" class="error-banner">載入失敗</div>

    <div v-else class="detail-card">
      <table class="detail-table">
        <tbody>
        <tr v-for="(value, key) in data.fields" :key="key">
          <th>{{ key }}</th>
          <td>{{ value }}</td>
        </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup lang="ts">
  definePageMeta({ layout: 'staff', requiredPermission: 'content.internal-system' })

  const route = useRoute()
  const router = useRouter()
  const id = String(route.params.id)
  const canEdit = route.query.editable === '1'
  // 從列表頁帶過來的年月，用於跳回正確月份
  const fromYear = route.query.y ? String(route.query.y) : ''
  const fromMonth = route.query.m ? String(route.query.m) : ''

  const { loading, fetchDetail, submitEdit } = useInternalSystemCalendar()
  const data = ref<any>(null)
  const showConfirm = ref(false)
  const deleting = ref(false)

  onMounted(async () => {
    data.value = await fetchDetail(id)
  })

  /** 跳回月曆，優先用 fromYear/fromMonth，其次用活動的開始日期，最後回當月 */
  function backToCalendar() {
    if (fromYear && fromMonth) {
      router.push(`/staff/content/internal-system/calendar?y=${fromYear}&m=${fromMonth}`)
    } else {
      const dateStr = data.value?.fields?.['開始日期'] ?? ''
      if (dateStr) {
        const [y, m] = dateStr.split('-')
        router.push(`/staff/content/internal-system/calendar?y=${y}&m=${parseInt(m)}`)
      } else {
        router.push('/staff/content/internal-system/calendar')
      }
    }
  }

  const goBack = () => backToCalendar()

  const confirmDelete = () => {
    showConfirm.value = true
  }

  const handleDelete = async () => {
    deleting.value = true
    const res = await submitEdit({
      calendar_id: id,
      action: 'D',
      publish_start: data.value?.fields?.['開始日期'] ?? '',
      publish_end: data.value?.fields?.['結束日期'] ?? '',
      start_time: data.value?.fields?.['開始時間'] ?? '',
      end_time: data.value?.fields?.['結束時間'] ?? '',
    })
    deleting.value = false
    showConfirm.value = false
    if (res?.success) backToCalendar()
  }
</script>

<style scoped>
  .detail-page {
    max-width: 800px;
    margin: 0 auto;
    padding: 20px;
  }

  .detail-header {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 24px;
  }

  h2 { margin: 0; flex: 1; }

  .back-btn {
    padding: 8px 14px;
    border: 1px solid var(--border);
    border-radius: 6px;
    background: var(--surface);
    color: var(--text);
    cursor: pointer;
    font-size: 14px;
  }

  .btn-edit {
    padding: 8px 18px;
    background: var(--accent);
    color: white;
    border-radius: 6px;
    font-size: 14px;
    text-decoration: none;
    transition: background 0.2s;
  }
  .btn-edit:hover { background: #5a67d8; }

  .btn-delete {
    padding: 8px 18px;
    background: #e53e3e;
    color: white;
    border: none;
    border-radius: 6px;
    font-size: 14px;
    cursor: pointer;
    transition: background 0.2s;
  }
  .btn-delete:hover { background: #c53030; }

  .confirm-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0,0,0,0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
  }

  .confirm-dialog {
    background: var(--surface);
    border-radius: 12px;
    padding: 28px 32px;
    width: 360px;
    box-shadow: 0 20px 60px rgba(0,0,0,0.3);
  }

  .confirm-dialog h3 {
    margin: 0 0 12px;
    font-size: 18px;
    color: var(--text);
  }

  .confirm-dialog p {
    margin: 0 0 24px;
    color: var(--text-muted);
    font-size: 14px;
    line-height: 1.6;
  }

  .confirm-actions {
    display: flex;
    gap: 12px;
    justify-content: flex-end;
  }

  .btn-cancel {
    padding: 8px 20px;
    border: 1px solid var(--border);
    border-radius: 6px;
    background: var(--surface);
    color: var(--text);
    cursor: pointer;
    font-size: 14px;
  }

  .btn-confirm-delete {
    padding: 8px 20px;
    background: #e53e3e;
    color: white;
    border: none;
    border-radius: 6px;
    font-size: 14px;
    cursor: pointer;
  }
  .btn-confirm-delete:disabled { opacity: 0.6; cursor: not-allowed; }
  .btn-confirm-delete:hover:not(:disabled) { background: #c53030; }

  .loading { text-align: center; padding: 40px; color: var(--text-hint); }
  .error-banner { color: #e53e3e; text-align: center; padding: 40px; }

  .detail-card {
    border: 1px solid var(--border-light);
    border-radius: 8px;
    overflow: hidden;
  }

  .detail-table {
    width: 100%;
    border-collapse: collapse;
  }

  .detail-table tr:nth-child(even) { background: var(--surface2); }

  .detail-table th, .detail-table td {
    padding: 12px 16px;
    text-align: left;
    border-bottom: 1px solid var(--border-light);
    font-size: 14px;
    color: var(--text);
  }

  .detail-table th {
    width: 140px;
    color: var(--text-muted);
    font-weight: 600;
    white-space: nowrap;
  }
</style>