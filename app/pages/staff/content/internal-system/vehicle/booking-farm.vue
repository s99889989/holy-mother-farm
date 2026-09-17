<template>
  <InternalSystemVehicleShell>
    <div class="booking-page">
      <h1 class="page-title">農莊公務車紀錄</h1>

      <!-- 進階查詢：只留車輛選擇（限農莊的車），站點分頁/搜尋框/申請單管理/批量申請/顯示其他申請單/地區全部拿掉 -->
      <div class="filter-bar">
        <div class="filter-select-group">
          <label class="filter-label">公務車選擇</label>
          <select class="filter-select" v-model="sortCar">
            <option value="">全部</option>
            <option v-for="c in farmCarOptions" :key="c.value" :value="c.value">
              {{ c.label }}
            </option>
          </select>
        </div>
      </div>

      <!-- 月曆 -->
      <div class="cal-header">
        <div class="cal-nav">
          <button class="nav-btn" @click="prevMonth">&#8249; 上一月</button>
          <h2 class="cal-title">{{ year }}年{{ month }}月</h2>
          <button class="nav-btn" @click="nextMonth">下一月 &#8250;</button>
        </div>
      </div>

      <p v-if="!farmSiteId && !loading" class="error-text">找不到「聖母農莊」站點，請確認舊系統站點分頁名稱是否有變更</p>
      <p v-else-if="loading" class="hint-text">載入中...</p>
      <p v-else-if="error" class="error-text">載入失敗，請重新整理再試一次</p>

      <div v-else class="cal-grid-wrapper">
        <div class="cal-weekdays">
          <div v-for="d in weekdays" :key="d" class="weekday">{{ d }}</div>
        </div>
        <div class="cal-grid">
          <div v-for="n in leadingDays" :key="`empty-${n}`" class="cal-cell empty" />
          <div v-for="day in daysInGrid" :key="day.dateStr" class="cal-cell">
            <div class="cal-cell-date">{{ day.date }}</div>
            <div class="cal-events">
              <button
                v-for="ev in day.events"
                :key="`${ev.id}-${day.dateStr}`"
                type="button"
                class="cal-event"
                :class="{ own: ev.isOwn, editable: ev.editable }"
                @click.stop="openEvent(ev)"
              >
                <span class="ce-line">{{ ev.car_id }}</span>
                <span class="ce-line">{{ resolveLabel(meta?.applicantOptions, ev.employee_id) }}</span>
                <span class="ce-line ce-time">{{ ev.start_time }}-{{ ev.end_time }}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- 查看 modal（無編輯權限） -->
      <div v-if="viewingEvent" class="modal-backdrop" @click.self="viewingEvent = null">
        <div class="modal-box modal-wide">
          <h3 class="modal-title">公務車申請單</h3>
          <table class="view-table">
            <tbody>
            <tr><th>申請人</th><td>{{ resolveLabel(meta?.applicantOptions, viewingEvent.employee_id) }}</td></tr>
            <tr><th>駕駛</th><td>{{ resolveLabel(meta?.driverOptions, viewingEvent.employee_user_id) }}</td></tr>
            <tr><th>公務車</th><td>{{ viewingEvent.public_car_name }}（{{ viewingEvent.car_id }}）</td></tr>
            <tr><th>使用單位</th><td>{{ viewingEvent.department_name }}</td></tr>
            <tr><th>開始時間</th><td>{{ viewingEvent.start_date }} {{ viewingEvent.start_time }}</td></tr>
            <tr><th>結束時間</th><td>{{ viewingEvent.end_date }} {{ viewingEvent.end_time }}</td></tr>
            <tr><th>前往地點</th><td>{{ viewingEvent.destination }}</td></tr>
            <tr><th>備註</th><td>{{ viewingEvent.note }}</td></tr>
            <tr><th>狀態</th><td>{{ viewingEvent.st === '1' ? '啟用' : '停用' }}</td></tr>
            </tbody>
          </table>
          <div class="modal-actions">
            <button type="button" class="btn-sm" @click="viewingEvent = null">關閉</button>
          </div>
        </div>
      </div>

      <!-- 編輯 modal -->
      <div v-if="editingEvent" class="modal-backdrop" @click.self="closeEditModal">
        <div class="modal-box modal-wide">
          <h3 class="modal-title">公務車申請表修改</h3>

          <div class="edit-form">
            <div class="form-row">
              <label>申請人</label>
              <input class="form-input" :value="resolveLabel(meta?.applicantOptions, editingEvent.employee_id)" disabled />
            </div>
            <div class="form-row">
              <label>公務車</label>
              <input class="form-input" :value="`${editingEvent.public_car_name}（${editingEvent.car_id}）`" disabled />
            </div>
            <div class="form-row">
              <label>使用單位</label>
              <input class="form-input" :value="editingEvent.department_name" disabled />
            </div>
            <div class="form-row">
              <label>駕駛</label>
              <select class="form-input" v-model="editForm.driver">
                <option value="">請選擇</option>
                <option v-for="d in meta?.driverOptions ?? []" :key="d.value" :value="d.value">
                  {{ d.label }}
                </option>
              </select>
            </div>
            <div class="form-row">
              <label>開始日期</label>
              <input class="form-input" type="date" v-model="editForm.start_date" />
            </div>
            <div class="form-row">
              <label>開始時間</label>
              <input class="form-input" type="time" v-model="editForm.start_time" />
            </div>
            <div class="form-row">
              <label>結束日期</label>
              <input class="form-input" type="date" v-model="editForm.end_date" />
            </div>
            <div class="form-row">
              <label>結束時間</label>
              <input class="form-input" type="time" v-model="editForm.end_time" />
            </div>
            <div class="form-row">
              <label>前往地點</label>
              <input class="form-input" v-model="editForm.destination" />
            </div>
            <div class="form-row">
              <label>狀態</label>
              <select class="form-input" v-model="editForm.st">
                <option value="1">啟用</option>
                <option value="0">停用</option>
              </select>
            </div>
            <div class="form-row">
              <label>備註</label>
              <textarea class="form-input" rows="3" v-model="editForm.note" />
            </div>
          </div>

          <p v-if="saveError" class="error-text">{{ saveError }}</p>

          <div class="modal-actions modal-actions-split">
            <button type="button" class="btn-sm btn-danger" :disabled="saving" @click="confirmDelete">
              刪除
            </button>
            <div>
              <button type="button" class="btn-sm" @click="closeEditModal">取消</button>
              <button type="button" class="btn-sm btn-confirm" :disabled="saving" @click="submitUpdate">
                {{ saving ? '更新中...' : '更新' }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </InternalSystemVehicleShell>
</template>

<script setup lang="ts">
  definePageMeta({ layout: 'staff', requiredPermission: 'content.internal-system', middleware: 'internal-system-auth' })

  interface VehicleOption { value: string; label: string }
  interface VehicleSiteTab { id: string; label: string }
  interface VehicleBookingMeta {
    carOptions: VehicleOption[]
    applicantOptions: VehicleOption[]
    driverOptions: VehicleOption[]
    departmentOptions: VehicleOption[]
    sites: VehicleSiteTab[]
  }
  interface VehicleBookingEvent {
    id?: string
    employee_id?: string
    employee_user_id?: string
    applicant_department?: string
    department_name?: string
    start_date?: string
    end_date?: string
    start_time?: string
    end_time?: string
    car_id?: string
    public_car_name?: string
    destination?: string
    st?: string
    note?: string
    site_manager?: string
    site_manager_sec?: string
    title?: string
    editable: boolean
    isOwn: boolean
  }

  const weekdays = ['日', '一', '二', '三', '四', '五', '六']

  const meta = ref<VehicleBookingMeta | null>(null)
  const events = ref<VehicleBookingEvent[]>([])
  const loading = ref(true)
  const error = ref(false)

  const sortCar = ref('')

  // 站點分頁不給選，固定鎖定「聖母農莊」那個站點 id（從 meta.sites 依 label 找，
  // 不寫死 id，避免舊系統站點代碼哪天換了這頁就整個失效沒東西可查）
  const farmSiteId = ref('')

  // 公務車選擇：只留「農莊」的車。車輛名稱格式是「車牌(分類 說明...)」，
  // 跟公務車線上申請頁的地區分組是同一套解析邏輯（分類 = 括號內第一個詞），
  // 這頁固定只留分類剛好是「農莊」的車，不用像原頁那樣可以切地區。
  const farmCarOptions = computed<VehicleOption[]>(() => {
    const all = meta.value?.carOptions ?? []
    return all.filter((c) => {
      const match = c.label.match(/^(.*?)\((.*)\)$/)
      const desc = match ? match[2] : c.label
      const spaceIdx = desc.indexOf(' ')
      const groupName = spaceIdx > 0 ? desc.slice(0, spaceIdx) : desc || '其他'
      return groupName === '農莊'
    })
  })

  const now = new Date()
  const year = ref(now.getFullYear())
  const month = ref(now.getMonth() + 1)

  const pad2 = (n: number) => String(n).padStart(2, '0')
  const formatDate = (d: Date) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`

  const monthStart = computed(() => new Date(year.value, month.value - 1, 1))
  const monthEnd = computed(() => new Date(year.value, month.value, 0))
  const leadingDays = computed(() => monthStart.value.getDay())

  const gridQueryStart = computed(() => {
    const d = new Date(monthStart.value)
    d.setDate(d.getDate() - d.getDay())
    return d
  })
  const gridQueryEnd = computed(() => {
    const d = new Date(gridQueryStart.value)
    d.setDate(d.getDate() + 42)
    return d
  })

  const daysInGrid = computed(() => {
    const days: { date: number; dateStr: string; events: VehicleBookingEvent[] }[] = []
    const total = monthEnd.value.getDate()
    for (let d = 1; d <= total; d++) {
      const dateStr = `${year.value}-${pad2(month.value)}-${pad2(d)}`
      const dayEvents = filteredEvents.value.filter(
        (ev) => (ev.start_date ?? '') <= dateStr && dateStr <= (ev.end_date ?? ev.start_date ?? '')
      )
      days.push({ date: d, dateStr, events: dayEvents })
    }
    return days
  })

  // 農莊專用頁面直接看全部申請單（不只自己的），跟原「顯示其他申請單」打勾的效果一樣，
  // 只是這裡拿掉勾選框固定開著；選特定車輛時一樣只顯示那台車
  const filteredEvents = computed(() =>
    events.value.filter((ev) => {
      if (sortCar.value) return ev.car_id === sortCar.value
      return true
    })
  )

  // 內部系統的 PHPSESSID session 過期時（跟主站登入是分開的），401 直接導去內部系統登入頁，
  // 不要卡在一個看不出原因的「載入失敗」
  function redirectIfUnauthorized(e: any): boolean {
    if (e?.statusCode === 401) {
      const loggedIn = useCookie('logged_in')
      loggedIn.value = null
      navigateTo('/staff/content/internal-system/login')
      return true
    }
    return false
  }

  const loadMeta = async () => {
    try {
      meta.value = await $fetch<VehicleBookingMeta>('/api/internal-system/vehicle/booking/meta')
      const farmSite = meta.value?.sites.find((s) => s.label.includes('農莊'))
      farmSiteId.value = farmSite?.id ?? ''
    } catch (e: any) {
      if (redirectIfUnauthorized(e)) return
      meta.value = null
    }
  }

  const resolveLabel = (options: VehicleOption[] | undefined, code?: string) => {
    if (!code) return ''
    return options?.find((o) => o.value === code)?.label ?? code
  }

  const loadEvents = async () => {
    if (!farmSiteId.value) return
    loading.value = true
    error.value = false
    try {
      events.value = await $fetch<VehicleBookingEvent[]>('/api/internal-system/vehicle/booking/events', {
        query: {
          site: farmSiteId.value,
          start: formatDate(gridQueryStart.value),
          end: formatDate(gridQueryEnd.value),
        },
      })
    } catch (e: any) {
      if (redirectIfUnauthorized(e)) return
      error.value = true
    } finally {
      loading.value = false
    }
  }

  watch([farmSiteId, year, month], loadEvents)

  const prevMonth = () => {
    if (month.value === 1) {
      month.value = 12
      year.value -= 1
    } else {
      month.value -= 1
    }
  }
  const nextMonth = () => {
    if (month.value === 12) {
      month.value = 1
      year.value += 1
    } else {
      month.value += 1
    }
  }

  const viewingEvent = ref<VehicleBookingEvent | null>(null)
  const editingEvent = ref<VehicleBookingEvent | null>(null)
  const editForm = reactive({
    driver: '', start_date: '', start_time: '', end_date: '', end_time: '',
    destination: '', st: '1', note: '',
  })
  const saving = ref(false)
  const saveError = ref('')

  const openEvent = (ev: VehicleBookingEvent) => {
    if (ev.editable) {
      editingEvent.value = ev
      editForm.driver = ev.employee_user_id ?? ''
      editForm.start_date = ev.start_date ?? ''
      editForm.start_time = ev.start_time ?? ''
      editForm.end_date = ev.end_date ?? ''
      editForm.end_time = ev.end_time ?? ''
      editForm.destination = ev.destination ?? ''
      editForm.st = ev.st ?? '1'
      editForm.note = ev.note ?? ''
      saveError.value = ''
    } else {
      viewingEvent.value = ev
    }
  }

  const closeEditModal = () => {
    editingEvent.value = null
  }

  const submitUpdate = async () => {
    if (!editingEvent.value) return
    saving.value = true
    saveError.value = ''
    try {
      const res = await $fetch<{ rs: string; msg: string }>('/api/internal-system/vehicle/booking/update', {
        method: 'POST',
        body: {
          loan_record_id: editingEvent.value.id,
          employe: editingEvent.value.employee_id,
          car_id: editingEvent.value.car_id,
          department: editingEvent.value.applicant_department,
          ...editForm,
        },
      })
      if (res.rs === '1') {
        editingEvent.value = null
        await loadEvents()
      } else {
        saveError.value = res.msg ?? '更新失敗'
      }
    } catch (e: any) {
      if (redirectIfUnauthorized(e)) return
      saveError.value = e?.data?.message ?? '更新失敗，請稍後再試'
    } finally {
      saving.value = false
    }
  }

  const confirmDelete = async () => {
    if (!editingEvent.value) return
    if (!confirm('確定要刪除這筆申請單嗎？此動作無法復原。')) return

    saving.value = true
    saveError.value = ''
    try {
      const res = await $fetch<{ rs: string; msg: string }>('/api/internal-system/vehicle/booking/delete', {
        method: 'POST',
        body: { loan_record_id: editingEvent.value.id },
      })
      if (res.rs === '1') {
        editingEvent.value = null
        await loadEvents()
      } else {
        saveError.value = res.msg ?? '刪除失敗'
      }
    } catch (e: any) {
      if (redirectIfUnauthorized(e)) return
      saveError.value = e?.data?.message ?? '刪除失敗，請稍後再試'
    } finally {
      saving.value = false
    }
  }

  onMounted(async () => {
    await loadMeta()
    await loadEvents()
  })
</script>

<style scoped>
  .booking-page { max-width: 1100px; }
  .page-title { font-size: 20px; color: var(--text); margin: 0 0 16px; }

  .filter-bar {
    display: flex;
    align-items: center;
    gap: 20px;
    margin-bottom: 16px;
    flex-wrap: wrap;
  }
  .filter-select-group { display: flex; align-items: center; gap: 8px; }
  .car-search-group { flex-wrap: wrap; }
  .filter-label { font-size: 16px; color: var(--text-muted); }
  .filter-select {
    padding: 6px 10px;
    border: 1px solid var(--border);
    border-radius: 8px;
    background: var(--surface);
    color: var(--text);
    font-size: 16px;
    max-width: 320px;
  }

  .cal-header { margin-bottom: 12px; }
  .cal-nav { display: flex; align-items: center; gap: 16px; }
  .cal-title { margin: 0; font-size: 20px; color: var(--text); }
  .nav-btn {
    padding: 6px 12px;
    border: 1px solid var(--border);
    border-radius: 8px;
    background: var(--surface);
    color: var(--text);
    font-size: 16px;
    cursor: pointer;
  }
  .nav-btn:hover { background: var(--surface2); }

  .hint-text { color: var(--text-muted); }
  .error-text { color: #e53e3e; }

  .cal-grid-wrapper { border: 1px solid var(--border-light); border-radius: var(--radius); overflow: hidden; }
  .cal-weekdays { display: grid; grid-template-columns: repeat(7, minmax(0, 1fr)); background: var(--surface2); }
  .weekday { padding: 8px; text-align: center; font-size: 14px; color: var(--text-muted); }
  .cal-grid { display: grid; grid-template-columns: repeat(7, minmax(0, 1fr)); }
  .cal-cell {
    min-height: 90px;
    border-top: 1px solid var(--border-light);
    border-left: 1px solid var(--border-light);
    padding: 6px;
  }
  .cal-cell.empty { background: var(--surface2); }
  .cal-cell-date { font-size: 14px; color: var(--text-muted); margin-bottom: 4px; }
  .cal-events { display: flex; flex-direction: column; gap: 3px; }
  .cal-event {
    display: flex;
    flex-direction: column;
    width: 100%;
    text-align: left;
    padding: 3px 6px;
    border-radius: 4px;
    border: none;
    font-size: 12px;
    line-height: 1.35;
    background: var(--accent-light);
    color: var(--accent);
    cursor: pointer;
  }
  .cal-event.own { background: #fef3c7; color: #92400e; }
  .cal-event.editable { font-weight: 700; }

  .ce-line {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .ce-time { opacity: 0.85; font-weight: 400; }

  .modal-backdrop {
    position: fixed; inset: 0; background: rgba(0,0,0,0.4);
    display: flex; align-items: center; justify-content: center; z-index: 200;
    padding: 20px;
  }
  .modal-box {
    background: var(--surface); border-radius: var(--radius); padding: 20px;
    width: 380px; max-width: 100%; max-height: 90vh; overflow-y: auto;
    box-shadow: 0 10px 30px rgba(0,0,0,0.3);
  }
  .modal-wide { width: 480px; }
  .modal-title { margin: 0 0 14px; font-size: 18px; color: var(--text); }

  .view-table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
  .view-table th, .view-table td {
    border: 1px solid var(--border-light); padding: 6px 10px; font-size: 16px; text-align: left;
  }
  .view-table th { width: 90px; background: var(--surface2); color: var(--text-muted); }

  .edit-form { display: flex; flex-direction: column; gap: 10px; margin-bottom: 14px; }
  .form-row { display: flex; flex-direction: column; gap: 4px; }
  .form-row label { font-size: 14px; color: var(--text-muted); }
  .form-input {
    padding: 7px 10px; border: 1px solid var(--border); border-radius: 8px;
    background: var(--surface); color: var(--text); font-size: 16px;
  }
  .form-input:disabled { background: var(--surface2); color: var(--text-hint); }

  .modal-actions { display: flex; justify-content: flex-end; gap: 8px; }
  .modal-actions-split { justify-content: space-between; }
  .btn-sm {
    padding: 6px 14px; border: 1px solid var(--border); border-radius: 6px;
    background: var(--surface); color: var(--text); font-size: 16px; cursor: pointer;
  }
  .btn-sm:hover { background: var(--surface2); }
  .btn-confirm { background: var(--accent); color: white; border-color: var(--accent); margin-left: 8px; }
  .btn-confirm:disabled { opacity: 0.6; cursor: not-allowed; }
  .btn-danger { background: #e53e3e; color: white; border-color: #e53e3e; }
  .btn-danger:disabled { opacity: 0.6; cursor: not-allowed; }

  /* ── 手機版：格子縮小、觸控好點 ── */
  @media (max-width: 640px) {
    .filter-bar { gap: 10px; }
    .filter-select-group { width: 100%; }
    .filter-select { max-width: 100%; }

    .cal-cell { min-height: 64px; padding: 3px; }
    .cal-cell-date { font-size: 12px; }
    .cal-event { font-size: 11px; padding: 2px 4px; }
    .ce-line { text-overflow: clip; }
    .ce-time { display: none; }
    .weekday { padding: 6px 2px; font-size: 12px; }

    .modal-box { width: 100%; }
  }
</style>
