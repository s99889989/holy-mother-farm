<template>
  <InternalSystemVehicleShell>
    <div class="select-car-page">
      <h1 class="page-title">選擇公務車</h1>
      <p class="page-date">{{ stdate }}</p>

      <!-- 查詢時間 -->
      <div class="card">
        <div class="card-header"><h2>可借用公務車查詢</h2></div>
        <div class="card-body">
          <p class="search-hint">請先選擇 開始/結束時間 查詢可借用車輛</p>
          <form class="search-form" @submit.prevent="searchCars">
            <div class="form-row">
              <label>開始時間</label>
              <input class="form-input" type="time" v-model="searchStartTime" required />
            </div>
            <div class="form-row">
              <label>結束時間</label>
              <input class="form-input" type="time" v-model="searchEndTime" required />
            </div>
            <button type="submit" class="btn-sm btn-confirm" :disabled="searching">
              {{ searching ? '查詢中...' : '查詢' }}
            </button>
          </form>
          <p v-if="searchError" class="error-text">{{ searchError }}</p>
        </div>
      </div>

      <!-- 車輛清單 -->
      <div v-if="cars.length" class="card">
        <div class="card-body">
          <table class="car-table">
            <thead>
              <tr>
                <th>公務車名稱</th>
                <th>車牌號碼</th>
                <th>申請</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(c, i) in cars" :key="`${c.car_id}-${i}`">
                <td>{{ c.public_car_name }}</td>
                <td>{{ c.car_id }}</td>
                <td>
                  <button type="button" class="btn-sm btn-confirm" @click="openAddModal(c)">
                    ＋ 申請
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
          <p class="hint-text small">
            這頁的車輛清單欄位（站點/廠牌/型號/圖片/出廠日期/排氣量/油料）原網站沒有拿到乾淨的 API
            回應，目前只確定顯示公務車名稱和車牌號碼，站點分頁篩選也還沒做；如果需要完整欄位，把瀏覽器
            Network 分頁裡 search-cars 這支 API 的實際回應貼給開發者補上。
          </p>
        </div>
      </div>

      <!-- 新增申請 modal -->
      <div v-if="addingCar" class="modal-backdrop" @click.self="addingCar = null">
        <div class="modal-box modal-wide">
          <h3 class="modal-title">公務車申請表</h3>

          <div class="edit-form">
            <div class="form-row">
              <label>申請人</label>
              <select class="form-input" v-model="addForm.employee_id" @change="onApplicantChange">
                <option value="">請選擇</option>
                <option v-for="o in meta?.applicantOptions ?? []" :key="o.value" :value="o.value">
                  {{ o.label }}
                </option>
              </select>
            </div>
            <div class="form-row">
              <label>駕駛</label>
              <select class="form-input" v-model="addForm.driver">
                <option value="">請選擇</option>
                <option v-for="o in meta?.driverOptions ?? []" :key="o.value" :value="o.value">
                  {{ o.label }}
                </option>
              </select>
            </div>
            <div class="form-row">
              <label>使用單位</label>
              <select class="form-input" v-model="addForm.applicant_department">
                <option value="">請選擇</option>
                <option v-for="o in meta?.departmentOptions ?? []" :key="o.value" :value="o.value">
                  {{ o.label }}
                </option>
              </select>
            </div>
            <div class="form-row">
              <label>公務車名稱</label>
              <input class="form-input" :value="addingCar.public_car_name" disabled />
            </div>
            <div class="form-row">
              <label>車牌號碼</label>
              <input class="form-input" :value="addForm.car_id" disabled />
            </div>
            <div class="form-row">
              <label>日期（單日借用）</label>
              <input class="form-input" type="date" v-model="addForm.start_date" :min="todayStr" />
            </div>
            <div class="form-row">
              <label>開始時間</label>
              <input class="form-input" type="time" v-model="addForm.start_time" />
            </div>
            <div class="form-row">
              <label>結束時間</label>
              <input class="form-input" type="time" v-model="addForm.end_time" />
            </div>
            <div class="form-row">
              <label>前往地點</label>
              <input class="form-input" v-model="addForm.destination" />
            </div>
            <div class="form-row">
              <label>備註</label>
              <textarea class="form-input" rows="3" v-model="addForm.notes" />
            </div>
          </div>

          <p v-if="addError" class="error-text">{{ addError }}</p>

          <div class="modal-actions">
            <button type="button" class="btn-sm" @click="addingCar = null">取消</button>
            <button type="button" class="btn-sm btn-confirm" :disabled="adding" @click="submitAdd">
              {{ adding ? '送出中...' : '新增' }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </InternalSystemVehicleShell>
</template>

<script setup lang="ts">
  definePageMeta({ layout: 'staff', requiredPermission: 'content.internal-system', middleware: 'internal-system-auth' })

  interface VehicleOption { value: string; label: string }
  interface VehicleAddMeta {
    applicantOptions: VehicleOption[]
    driverOptions: VehicleOption[]
    departmentOptions: VehicleOption[]
    employeeDepartmentMap: Record<string, string>
    myEmployeeId: string
  }
  interface VehicleAvailableCar {
    car_id?: string
    public_car_name?: string
    photo_name1?: string
    [key: string]: unknown
  }

  const route = useRoute()
  // 從月曆點擊空白日期帶過來的日期（比照原網站 dayClick 導頁的 stdate/endate query）
  const pad2 = (n: number) => String(n).padStart(2, '0')
  const today = new Date()
  const defaultDate = `${today.getFullYear()}-${pad2(today.getMonth() + 1)}-${pad2(today.getDate())}`
  const stdate = String(route.query.stdate ?? defaultDate)
  const todayStr = defaultDate

  const meta = ref<VehicleAddMeta | null>(null)
  const cars = ref<VehicleAvailableCar[]>([])
  const searchStartTime = ref('')
  const searchEndTime = ref('')
  const searching = ref(false)
  const searchError = ref('')

  const loadMeta = async () => {
    try {
      meta.value = await $fetch<VehicleAddMeta>('/api/internal-system/vehicle/add/meta')
      // 比照原網站預設把申請人/駕駛選成自己
      if (meta.value.myEmployeeId) {
        addForm.employee_id = meta.value.myEmployeeId
        addForm.driver = meta.value.myEmployeeId
        onApplicantChange()
      }
    } catch {
      meta.value = null
    }
  }

  const searchCars = async () => {
    searching.value = true
    searchError.value = ''
    try {
      cars.value = await $fetch<VehicleAvailableCar[]>('/api/internal-system/vehicle/add/search-cars', {
        method: 'POST',
        body: {
          startDateTime: `${stdate} ${searchStartTime.value}`,
          endDateTime: `${stdate} ${searchEndTime.value}`,
        },
      })
    } catch (e: any) {
      searchError.value = e?.data?.message ?? '查詢失敗，請稍後再試'
      cars.value = []
    } finally {
      searching.value = false
    }
  }

  // 新增申請 modal
  const addingCar = ref<VehicleAvailableCar | null>(null)
  const addForm = reactive({
    employee_id: '', driver: '', applicant_department: '', car_id: '',
    start_date: defaultDate, start_time: '', end_date: defaultDate, end_time: '',
    destination: '', notes: '',
  })
  const adding = ref(false)
  const addError = ref('')

  const onApplicantChange = () => {
    const dept = meta.value?.employeeDepartmentMap?.[addForm.employee_id]
    if (dept) addForm.applicant_department = dept
  }

  const openAddModal = (car: VehicleAvailableCar) => {
    addingCar.value = car
    addForm.car_id = String(car.car_id ?? '').trim()
    addForm.start_date = stdate
    addForm.end_date = stdate // 單日借用：結束日期固定跟開始日期同一天
    addForm.start_time = searchStartTime.value
    addForm.end_time = searchEndTime.value
    addForm.destination = ''
    addForm.notes = ''
    addError.value = ''
  }

  const submitAdd = async () => {
    adding.value = true
    addError.value = ''
    try {
      // 單日借用：結束日期永遠等於開始日期（比照原網站「跨日借用」關閉時的行為）
      addForm.end_date = addForm.start_date
      const res = await $fetch<{ rs: string; msg: string }>('/api/internal-system/vehicle/add/submit', {
        method: 'POST',
        body: { ...addForm },
      })
      if (res.rs === '1') {
        addingCar.value = null
        navigateTo('/staff/content/internal-system/vehicle/booking')
      } else {
        addError.value = res.msg ?? '新增失敗'
      }
    } catch (e: any) {
      addError.value = e?.data?.message ?? '新增失敗，請稍後再試'
    } finally {
      adding.value = false
    }
  }

  onMounted(loadMeta)
</script>

<style scoped>
  .select-car-page { max-width: 900px; }
  .page-title { font-size: 20px; color: var(--text); margin: 0 0 4px; }
  .page-date { font-size: 16px; color: var(--text-muted); margin: 0 0 16px; }

  .card {
    background: var(--surface); border: 1px solid var(--border-light); border-radius: var(--radius);
    box-shadow: var(--shadow); margin-bottom: 16px;
  }
  .card-header { padding: 12px 16px; border-bottom: 1px solid var(--border-light); }
  .card-header h2 { margin: 0; font-size: 18px; color: var(--text); }
  .card-body { padding: 16px; }

  .search-hint { color: #e53e3e; font-weight: 700; text-align: center; margin: 0 0 12px; }
  .search-form { display: flex; align-items: flex-end; gap: 16px; flex-wrap: wrap; }
  .search-form .form-row { margin-bottom: 0; }

  .tabs { display: flex; gap: 4px; border-bottom: 1px solid var(--border-light); margin-bottom: 12px; flex-wrap: wrap; }
  .tab-btn {
    padding: 8px 14px; background: none; border: none; border-bottom: 2px solid transparent;
    color: var(--text-muted); font-size: 16px; cursor: pointer;
  }
  .tab-btn.active { color: var(--accent); border-bottom-color: var(--accent); font-weight: 700; }

  .car-table { width: 100%; border-collapse: collapse; }
  .car-table th, .car-table td {
    border: 1px solid var(--border-light); padding: 8px 10px; text-align: center; font-size: 16px;
  }
  .car-table th { background: var(--surface2); color: var(--text-muted); }

  .hint-text.small { font-size: 14px; color: var(--text-hint); margin: 10px 0 0; }
  .error-text { color: #e53e3e; font-size: 16px; }

  .modal-backdrop {
    position: fixed; inset: 0; background: rgba(0,0,0,0.4);
    display: flex; align-items: center; justify-content: center; z-index: 200; padding: 20px;
  }
  .modal-box {
    background: var(--surface); border-radius: var(--radius); padding: 20px;
    width: 380px; max-width: 100%; max-height: 90vh; overflow-y: auto;
    box-shadow: 0 10px 30px rgba(0,0,0,0.3);
  }
  .modal-wide { width: 480px; }
  .modal-title { margin: 0 0 14px; font-size: 18px; color: var(--text); }

  .edit-form { display: flex; flex-direction: column; gap: 10px; margin-bottom: 14px; }
  .form-row { display: flex; flex-direction: column; gap: 4px; }
  .form-row label { font-size: 14px; color: var(--text-muted); }
  .form-input {
    padding: 7px 10px; border: 1px solid var(--border); border-radius: 8px;
    background: var(--surface); color: var(--text); font-size: 16px;
  }
  .form-input:disabled { background: var(--surface2); color: var(--text-hint); }

  .modal-actions { display: flex; justify-content: flex-end; gap: 8px; }
  .btn-sm {
    padding: 6px 14px; border: 1px solid var(--border); border-radius: 6px;
    background: var(--surface); color: var(--text); font-size: 16px; cursor: pointer;
  }
  .btn-sm:hover { background: var(--surface2); }
  .btn-confirm { background: var(--accent); color: white; border-color: var(--accent); }
  .btn-confirm:disabled { opacity: 0.6; cursor: not-allowed; }
</style>
