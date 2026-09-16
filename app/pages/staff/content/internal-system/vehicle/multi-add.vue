<template>
  <InternalSystemVehicleShell>
    <div class="multi-add-page">
      <h1 class="page-title">公務車批量申請</h1>
      <p class="warn-banner">不提供補登功能</p>

      <div class="card">
        <div class="card-body">
          <div class="form-grid">
            <div class="form-row">
              <label>申請人</label>
              <select class="form-input" v-model="form.employe" @change="onApplicantChange">
                <option value="">請選擇</option>
                <option v-for="o in meta?.applicantOptions ?? []" :key="o.value" :value="o.value">
                  {{ o.label }}
                </option>
              </select>
            </div>
            <div class="form-row">
              <label>駕駛</label>
              <select class="form-input" v-model="form.driver">
                <option value="">請選擇</option>
                <option v-for="o in meta?.driverOptions ?? []" :key="o.value" :value="o.value">
                  {{ o.label }}
                </option>
              </select>
            </div>
            <div class="form-row">
              <label>使用單位</label>
              <select class="form-input" v-model="form.department">
                <option value="">請選擇</option>
                <option v-for="o in meta?.departmentOptions ?? []" :key="o.value" :value="o.value">
                  {{ o.label }}
                </option>
              </select>
            </div>
            <div class="form-row">
              <label>公務車選擇</label>
              <select class="form-input" v-model="form.car_id">
                <option value="">請選擇</option>
                <option v-for="o in meta?.carOptions ?? []" :key="o.value" :value="o.value">
                  {{ o.label }}
                </option>
              </select>
            </div>
            <div class="form-row">
              <label>開始時間</label>
              <input class="form-input" type="time" v-model="form.start_time" />
            </div>
            <div class="form-row">
              <label>結束時間</label>
              <input class="form-input" type="time" v-model="form.end_time" />
            </div>
            <div class="form-row form-row-wide">
              <label>前往地點</label>
              <input class="form-input" v-model="form.destination" />
            </div>
            <div class="form-row form-row-wide">
              <label>備註</label>
              <textarea class="form-input" rows="2" v-model="form.note" />
            </div>
          </div>
        </div>
      </div>

      <!-- 選擇日期（可複選） -->
      <div class="card">
        <div class="card-header">
          <h2>選擇日期</h2>
          <span class="selected-count">已選 {{ selectedDates.length }} 天</span>
        </div>
        <div class="card-body">
          <div class="cal-header">
            <div class="cal-nav">
              <button type="button" class="nav-btn" @click="prevMonth">&#8249; 上一月</button>
              <h3 class="cal-title">{{ year }}年{{ month }}月</h3>
              <button type="button" class="nav-btn" @click="nextMonth">下一月 &#8250;</button>
            </div>
          </div>
          <div class="cal-grid-wrapper">
            <div class="cal-weekdays">
              <div v-for="d in weekdays" :key="d" class="weekday">{{ d }}</div>
            </div>
            <div class="cal-grid">
              <div v-for="n in leadingDays" :key="`empty-${n}`" class="cal-cell empty" />
              <button
                  v-for="day in daysInGrid"
                  :key="day.dateStr"
                  type="button"
                  class="cal-cell"
                  :class="{ selected: selectedDates.includes(day.dateStr), disabled: day.dateStr < todayStr }"
                  :disabled="day.dateStr < todayStr"
                  @click="toggleDate(day.dateStr)"
              >
                {{ day.date }}
                <span v-if="selectedDates.includes(day.dateStr)" class="check-mark">✔</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <p v-if="submitError" class="error-text">{{ submitError }}</p>

      <div class="submit-row">
        <button type="button" class="btn-confirm" :disabled="submitting" @click="confirmSubmit">
          {{ submitting ? '送出中...' : '新增' }}
        </button>
      </div>
    </div>
  </InternalSystemVehicleShell>
</template>

<script setup lang="ts">
  definePageMeta({ layout: 'staff', requiredPermission: 'content.internal-system', middleware: 'internal-system-auth' })

  interface VehicleOption { value: string; label: string }
  interface VehicleMultiAddMeta {
    applicantOptions: VehicleOption[]
    driverOptions: VehicleOption[]
    departmentOptions: VehicleOption[]
    carOptions: VehicleOption[]
    employeeDepartmentMap: Record<string, string>
    myEmployeeId: string
  }

  const weekdays = ['日', '一', '二', '三', '四', '五', '六']

  const meta = ref<VehicleMultiAddMeta | null>(null)
  const form = reactive({
    employe: '', driver: '', department: '', car_id: '',
    start_time: '', end_time: '', destination: '', note: '',
  })

  const pad2 = (n: number) => String(n).padStart(2, '0')
  const now = new Date()
  const todayStr = `${now.getFullYear()}-${pad2(now.getMonth() + 1)}-${pad2(now.getDate())}`
  const year = ref(now.getFullYear())
  const month = ref(now.getMonth() + 1)

  const monthStart = computed(() => new Date(year.value, month.value - 1, 1))
  const monthEnd = computed(() => new Date(year.value, month.value, 0))
  const leadingDays = computed(() => monthStart.value.getDay())
  const daysInGrid = computed(() => {
    const days: { date: number; dateStr: string }[] = []
    const total = monthEnd.value.getDate()
    for (let d = 1; d <= total; d++) {
      days.push({ date: d, dateStr: `${year.value}-${pad2(month.value)}-${pad2(d)}` })
    }
    return days
  })

  const prevMonth = () => {
    if (month.value === 1) { month.value = 12; year.value -= 1 } else { month.value -= 1 }
  }
  const nextMonth = () => {
    if (month.value === 12) { month.value = 1; year.value += 1 } else { month.value += 1 }
  }

  const selectedDates = ref<string[]>([])
  const toggleDate = (dateStr: string) => {
    const idx = selectedDates.value.indexOf(dateStr)
    if (idx >= 0) {
      selectedDates.value.splice(idx, 1)
    } else {
      selectedDates.value.push(dateStr)
    }
  }

  const onApplicantChange = () => {
    const dept = meta.value?.employeeDepartmentMap?.[form.employe]
    if (dept) form.department = dept
  }

  const loadMeta = async () => {
    try {
      meta.value = await $fetch<VehicleMultiAddMeta>('/api/internal-system/vehicle/multi-add/meta')
      if (meta.value.myEmployeeId) {
        form.employe = meta.value.myEmployeeId
        form.driver = meta.value.myEmployeeId
        onApplicantChange()
      }
    } catch {
      meta.value = null
    }
  }

  const submitting = ref(false)
  const submitError = ref('')

  const confirmSubmit = async () => {
    submitError.value = ''
    if (selectedDates.value.length === 0) {
      submitError.value = '請至少選擇一個日期'
      return
    }
    if (!confirm(`此行為將新增所選 ${selectedDates.value.length} 個日期的多張申請單，確定要新增嗎？`)) {
      return
    }

    submitting.value = true
    try {
      const res = await $fetch<{ rs: string; msg: string }>('/api/internal-system/vehicle/multi-add/submit', {
        method: 'POST',
        body: { ...form, select_date: selectedDates.value },
      })
      if (res.rs === '1') {
        navigateTo('/staff/content/internal-system/vehicle/booking')
      } else {
        submitError.value = res.msg ?? '新增失敗'
      }
    } catch (e: any) {
      submitError.value = e?.data?.message ?? '新增失敗，請稍後再試'
    } finally {
      submitting.value = false
    }
  }

  onMounted(loadMeta)
</script>

<style scoped>
  .multi-add-page { max-width: 800px; }
  .page-title { font-size: 20px; color: var(--text); margin: 0 0 4px; }
  .warn-banner { color: #e53e3e; font-weight: 700; text-align: center; margin: 0 0 16px; }

  .card {
    background: var(--surface); border: 1px solid var(--border-light); border-radius: var(--radius);
    box-shadow: var(--shadow); margin-bottom: 16px;
  }
  .card-header { padding: 12px 16px; border-bottom: 1px solid var(--border-light); display: flex; align-items: center; justify-content: space-between; }
  .card-header h2 { margin: 0; font-size: 18px; color: var(--text); }
  .selected-count { font-size: 16px; color: var(--accent); font-weight: 700; }
  .card-body { padding: 16px; }

  .form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
  .form-row { display: flex; flex-direction: column; gap: 4px; }
  .form-row-wide { grid-column: 1 / -1; }
  .form-row label { font-size: 14px; color: var(--text-muted); }
  .form-input {
    padding: 7px 10px; border: 1px solid var(--border); border-radius: 8px;
    background: var(--surface); color: var(--text); font-size: 16px;
  }

  .cal-header { margin-bottom: 10px; }
  .cal-nav { display: flex; align-items: center; gap: 14px; }
  .cal-title { margin: 0; font-size: 18px; color: var(--text); }
  .nav-btn {
    padding: 5px 10px; border: 1px solid var(--border); border-radius: 8px;
    background: var(--surface); color: var(--text); font-size: 14px; cursor: pointer;
  }
  .nav-btn:hover { background: var(--surface2); }

  .cal-grid-wrapper { border: 1px solid var(--border-light); border-radius: var(--radius); overflow: hidden; }
  .cal-weekdays { display: grid; grid-template-columns: repeat(7, 1fr); background: var(--surface2); }
  .weekday { padding: 6px; text-align: center; font-size: 14px; color: var(--text-muted); }
  .cal-grid { display: grid; grid-template-columns: repeat(7, 1fr); }
  .cal-cell {
    position: relative;
    min-height: 44px;
    border-top: 1px solid var(--border-light);
    border-left: 1px solid var(--border-light);
    background: var(--surface);
    color: var(--text);
    font-size: 14px;
    cursor: pointer;
    padding: 6px;
    text-align: left;
  }
  .cal-cell.empty { background: var(--surface2); cursor: default; }
  .cal-cell:not(.empty):not(.disabled):hover { background: var(--surface2); }
  .cal-cell.selected { background: #ff9800; color: white; font-weight: 700; }
  .cal-cell.disabled { color: var(--text-hint); cursor: not-allowed; }
  .check-mark { position: absolute; bottom: 4px; right: 6px; font-size: 14px; }

  .error-text { color: #e53e3e; font-size: 16px; margin: 0 0 10px; }

  .submit-row { display: flex; justify-content: flex-end; }
  .btn-confirm {
    padding: 8px 20px; border: none; border-radius: 8px;
    background: var(--accent); color: white; font-size: 16px; cursor: pointer;
  }
  .btn-confirm:disabled { opacity: 0.6; cursor: not-allowed; }
</style>
