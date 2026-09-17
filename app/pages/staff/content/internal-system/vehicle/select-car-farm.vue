<template>
  <InternalSystemVehicleShell>
    <div class="select-car-page">
      <h1 class="page-title">農莊公務車借用</h1>

      <!-- 查詢時間 -->
      <div class="card">
        <div class="card-body">
          <form class="search-form" @submit.prevent="searchCars">
            <div class="form-row">
              <label>日期</label>
              <input class="form-input" type="date" v-model="selectedDate" :min="todayStr" />
            </div>
            <div class="time-range-group">
              <div class="form-row">
                <label>開始時間</label>
                <div class="time-select-group">
                  <select class="form-input time-select" v-model="searchStartHour">
                    <option v-for="h in startHourOptions" :key="h" :value="h">{{ h }}</option>
                  </select>
                  <span class="time-colon">:</span>
                  <select class="form-input time-select" v-model="searchStartMinute">
                    <option v-for="m in startMinuteOptions" :key="m" :value="m">{{ m }}</option>
                  </select>
                </div>
              </div>
              <div class="form-row">
                <label>結束時間</label>
                <div class="time-select-group">
                  <select class="form-input time-select" v-model="searchEndHour">
                    <option v-for="h in endHourOptions" :key="h" :value="h">{{ h }}</option>
                  </select>
                  <span class="time-colon">:</span>
                  <select class="form-input time-select" v-model="searchEndMinute">
                    <option v-for="m in endMinuteOptions" :key="m" :value="m">{{ m }}</option>
                  </select>
                </div>
              </div>
            </div>
            <button type="submit" class="btn-sm btn-confirm" :disabled="searching">
              {{ searching ? '查詢中...' : '查詢' }}
            </button>
          </form>
          <p v-if="searchError" class="error-text">{{ searchError }}</p>
        </div>
      </div>

      <!-- 車輛清單：這頁固定農莊，不需要站點分頁 -->
      <div v-if="cars.length" class="card">
        <div class="card-header"><h2>可借用車（共 {{ filteredCars.length }} 台）</h2></div>
        <div class="card-body">
          <!-- 桌機：表格 -->
          <table class="car-table desktop-only">
            <thead>
            <tr>
              <th>圖片</th>
              <th>站點</th>
              <th>廠牌</th>
              <th>型號</th>
              <th>公務車名稱</th>
              <th>車牌號碼</th>
              <th>出廠日期</th>
              <th>排氣量</th>
              <th>油料</th>
              <th>申請</th>
            </tr>
            </thead>
            <tbody>
            <tr v-for="(c, i) in filteredCars" :key="`${c.car.car_id}-${i}`">
              <td>
                <img v-if="c.car.photo_name1" :src="carPhotoUrl(c.car.photo_name1)" class="car-photo" :alt="c.car.public_car_name ?? ''" @click="lightboxUrl = carPhotoUrl(c.car.photo_name1)" />
              </td>
              <td>{{ c.cols[0] }}</td>
              <td>{{ c.cols[1] }}</td>
              <td>{{ c.cols[2] }}</td>
              <td>{{ c.cols[3] }}</td>
              <td>{{ c.cols[4] }}</td>
              <td>{{ c.cols[5] }}</td>
              <td>{{ c.cols[6] }}</td>
              <td>{{ c.cols[7] }}</td>
              <td>
                <button type="button" class="btn-sm btn-confirm" @click="openAddModal(c.car)">
                  ＋ 申請
                </button>
              </td>
            </tr>
            </tbody>
          </table>

          <!-- 手機：卡片 -->
          <div class="car-cards mobile-only">
            <div v-for="(c, i) in filteredCars" :key="`${c.car.car_id}-card-${i}`" class="car-card">
              <img v-if="c.car.photo_name1" :src="carPhotoUrl(c.car.photo_name1)" class="car-card-photo" :alt="c.car.public_car_name ?? ''" @click="lightboxUrl = carPhotoUrl(c.car.photo_name1)" />
              <div v-else class="car-card-photo car-card-photo-empty">🚗</div>
              <div class="car-card-body">
                <div class="car-card-name">{{ c.cols[3] }}</div>
                <div class="car-card-row"><span class="ccl">站點</span>{{ c.cols[0] }}</div>
                <div class="car-card-row"><span class="ccl">車牌</span>{{ c.cols[4] }}</div>
                <div class="car-card-row"><span class="ccl">廠牌/型號</span>{{ c.cols[1] }} {{ c.cols[2] }}</div>
                <div class="car-card-row"><span class="ccl">排氣量/油料</span>{{ c.cols[6] }} / {{ c.cols[7] }}</div>
                <button type="button" class="btn-sm btn-confirm car-card-btn" @click="openAddModal(c.car)">
                  ＋ 申請
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 照片放大檢視 -->
      <Teleport to="body">
        <div v-if="lightboxUrl" class="lightbox-backdrop" @click="lightboxUrl = null">
          <img :src="lightboxUrl" class="lightbox-img" alt="車輛照片放大圖" />
          <button type="button" class="lightbox-close" @click="lightboxUrl = null">✕</button>
        </div>
      </Teleport>

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
  const pad2 = (n: number) => String(n).padStart(2, '0')
  const today = new Date()
  const defaultDate = `${today.getFullYear()}-${pad2(today.getMonth() + 1)}-${pad2(today.getDate())}`
  const todayStr = defaultDate
  // 這頁沒有從月曆點日期帶 query 過來，日期改成自己選（單日借用，開始/結束用同一天）
  const selectedDate = ref(String(route.query.stdate ?? defaultDate))

  const meta = ref<VehicleAddMeta | null>(null)
  const cars = ref<VehicleAvailableCar[]>([])
  function formatHM(date: Date): string {
    return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
  }

  // 「現在」捨入到下一個 5 分鐘刻度（用 ceil 不是 round，確保捨入後的時間一定還沒過）。
  // 這組值同時用在「預設開始時間」跟下面「不能選過去時段」的過濾邏輯，兩邊一定要用同一套算法算出來的
  // 同一個值，不然兩套各自捨入可能對不上（例如現在 21~24 分時，四捨五入跟無條件進位結果不同），
  // 造成預設選到的分鐘被過濾規則自己擋掉，下拉選單就會變成空白選不到值。
  let effNowHour = today.getHours()
  let effNowMinute = Math.ceil(today.getMinutes() / 5) * 5
  if (effNowMinute === 60) { effNowMinute = 0; effNowHour += 1 }

  const defaultStart = new Date(today)
  defaultStart.setHours(Math.min(effNowHour, 23), effNowHour > 23 ? 55 : effNowMinute, 0, 0)
  const defaultEnd = new Date(defaultStart.getTime() + 3 * 60 * 60 * 1000)

  const searchStartTime = ref(formatHM(defaultStart))
  const searchEndTime = ref(formatHM(defaultEnd))

  // ── 24 小時制時間選擇（比照餐廳訂位頁的做法，避免原生 time input 跑出上午/下午） ──
  const HOUR_OPTIONS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'))
  const MINUTE_OPTIONS = Array.from({ length: 12 }, (_, i) => String(i * 5).padStart(2, '0'))
  function timePart(timeRef: Ref<string>, part: 'h' | 'm') {
    return computed({
      get: () => (timeRef.value || '00:00').split(':')[part === 'h' ? 0 : 1],
      set: (v: string) => {
        const [h, m] = (timeRef.value || '00:00').split(':')
        timeRef.value = part === 'h' ? `${v}:${m}` : `${h}:${v}`
      },
    })
  }

  function isPastTime(hour: string, minute: string): boolean {
    if (selectedDate.value !== todayStr) return false
    const h = Number(hour)
    const m = Number(minute)
    return h < effNowHour || (h === effNowHour && m < effNowMinute)
  }
  function availableHourOptions(): string[] {
    if (selectedDate.value !== todayStr) return HOUR_OPTIONS
    return HOUR_OPTIONS.filter((h) => Number(h) >= effNowHour)
  }
  function availableMinuteOptions(hour: string): string[] {
    if (selectedDate.value !== todayStr || Number(hour) > effNowHour) return MINUTE_OPTIONS
    if (Number(hour) < effNowHour) return []
    return MINUTE_OPTIONS.filter((m) => Number(m) >= effNowMinute)
  }
  const searchStartHour = timePart(searchStartTime, 'h')
  const searchStartMinute = timePart(searchStartTime, 'm')
  const searchEndHour = timePart(searchEndTime, 'h')
  const searchEndMinute = timePart(searchEndTime, 'm')

  const startHourOptions = computed(() => availableHourOptions())
  const startMinuteOptions = computed(() => availableMinuteOptions(searchStartHour.value))
  const endHourOptions = computed(() => availableHourOptions())
  const endMinuteOptions = computed(() => availableMinuteOptions(searchEndHour.value))

  // 選的日期改成今天時，原本選的時間如果已經過去了，往前修正到現在（不能讓表單卡著一個選不到的過去時段）
  watch(selectedDate, () => {
    if (effNowHour > 23) return // 剩不到 5 分鐘就跨日了，今天已經沒有可選時段，不硬塞無效值
    if (isPastTime(searchStartHour.value, searchStartMinute.value)) {
      searchStartTime.value = `${String(effNowHour).padStart(2, '0')}:${String(effNowMinute).padStart(2, '0')}`
    }
    if (isPastTime(searchEndHour.value, searchEndMinute.value)) {
      searchEndTime.value = `${String(effNowHour).padStart(2, '0')}:${String(effNowMinute).padStart(2, '0')}`
    }
  })

  // 切換小時本身不會被 watch(selectedDate) 抓到，但分鐘可能因此變得不在可選範圍內
  // （例如選到現在這個小時，分鐘卻還停在已經過去的舊值），要另外修正
  watch(searchStartHour, (h) => {
    const opts = availableMinuteOptions(h)
    if (opts.length && !opts.includes(searchStartMinute.value)) searchStartMinute.value = opts[0]
  })
  watch(searchEndHour, (h) => {
    const opts = availableMinuteOptions(h)
    if (opts.length && !opts.includes(searchEndMinute.value)) searchEndMinute.value = opts[0]
  })
  const searching = ref(false)
  const searchError = ref('')

  // 這頁固定只看聖母農莊的車，不用像 select-car.vue 那樣讓使用者切站點分頁

  /**
   * 原網站前端是把整個 row 物件過濾掉數字 key、砍掉前 3 個值，剩下的順序直接對應
   * 表格欄位：[圖片(捨棄，另外用 photo_name1 組)、站點、廠牌、型號、公務車名稱、
   * 車牌號碼、出廠日期、排氣量、油料]——這裡照抄同一套算法，因為那些欄位的
   * 真實 key 名稱原網站自己也沒用到、不知道叫什麼。
   */
  function carColumns(car: VehicleAvailableCar): string[] {
    const values = Object.entries(car)
      .filter(([k]) => Number.isNaN(Number(k)))
      .map(([, v]) => (v == null ? '' : String(v)))
    // slice(3) 對齊原網站演算法（砍掉前 3 個不知道是什麼、也沒用到的欄位），
    // 再 slice(1) 是因為原網站緊接著把這個位置的值整個覆寫成圖片 HTML，原始值本來就沒用到
    return values.slice(3).slice(1)
  }

  const carsWithColumns = computed(() => cars.value.map((car) => ({ car, cols: carColumns(car) })))

  const filteredCars = computed(() =>
    carsWithColumns.value.filter((c) => c.cols[0] === '聖母農莊')
  )

  const carPhotoUrl = (fileName: string) =>
    `/api/internal-system/vehicle/car-photo?name=${encodeURIComponent(fileName)}`

  const lightboxUrl = ref<string | null>(null)

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
          startDateTime: `${selectedDate.value} ${searchStartTime.value}`,
          endDateTime: `${selectedDate.value} ${searchEndTime.value}`,
        },
      })
    } catch (e: any) {
      searchError.value = e?.data?.message || '查詢失敗，請稍後再試'
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
    addForm.start_date = selectedDate.value
    addForm.end_date = selectedDate.value // 單日借用：結束日期固定跟開始日期同一天
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

  onMounted(() => {
    loadMeta()
    searchCars()
  })
</script>

<style scoped>
  .select-car-page { max-width: 900px; }
  .page-title { font-size: 20px; color: var(--text); margin: 0 0 16px; }

  .card {
    background: var(--surface); border: 1px solid var(--border-light); border-radius: var(--radius);
    box-shadow: var(--shadow); margin-bottom: 16px;
  }
  .card-header { padding: 12px 16px; border-bottom: 1px solid var(--border-light); }
  .card-header h2 { margin: 0; font-size: 18px; color: var(--text); }
  .card-body { padding: 16px; }

  .search-form { display: flex; align-items: flex-end; gap: 16px; flex-wrap: wrap; }
  .search-form .form-row { margin-bottom: 0; }

  .time-range-group { display: flex; gap: 12px; flex-shrink: 0; }

  .time-select-group { display: flex; align-items: center; gap: 4px; }
  .time-select { width: 64px; text-align: center; }
  .time-colon { color: var(--text-muted); font-weight: 700; }

  .car-photo { width: 48px; height: 48px; object-fit: cover; border-radius: 6px; display: block; margin: 0 auto; cursor: zoom-in; }

  .car-table { width: 100%; border-collapse: collapse; }
  .car-table th, .car-table td {
    border: 1px solid var(--border-light); padding: 8px 10px; text-align: center; font-size: 16px;
  }
  .car-table th { background: var(--surface2); color: var(--text-muted); }

  .car-cards { display: flex; flex-direction: column; gap: 12px; }
  .car-card {
    display: flex; gap: 12px; padding: 12px;
    border: 1px solid var(--border-light); border-radius: var(--radius); background: var(--surface2);
  }
  .car-card-photo {
    width: 108px; align-self: stretch; object-fit: cover; border-radius: 8px; flex-shrink: 0; cursor: zoom-in;
  }
  .car-card-photo-empty {
    display: flex; align-items: center; justify-content: center; font-size: 36px;
    background: var(--surface); color: var(--text-hint); min-height: 108px;
  }
  .car-card-body { flex: 1; min-width: 0; }
  .car-card-name { font-size: 16px; font-weight: 700; color: var(--text); margin-bottom: 4px; }
  .car-card-row { font-size: 14px; color: var(--text-muted); margin-bottom: 2px; }
  .car-card-row .ccl { color: var(--text-hint); margin-right: 6px; }
  .car-card-btn { width: 100%; margin-top: 8px; }

  /* 這條要寫在 .car-cards 規則後面：兩者 specificity 一樣，寫在後面的才會贏，
     確保桌機版預設真的隱藏卡片，只有下面手機版 media query 才會打開 */
  .mobile-only { display: none; }

  .error-text { color: #e53e3e; font-size: 16px; }

  .lightbox-backdrop {
    position: fixed; inset: 0; background: rgba(0, 0, 0, 0.85);
    display: flex; align-items: center; justify-content: center; z-index: 400; padding: 20px;
  }
  .lightbox-img {
    max-width: 90vw; max-height: 85vh; object-fit: contain; border-radius: 8px;
    box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5);
  }
  .lightbox-close {
    position: fixed; top: 16px; right: 16px; width: 40px; height: 40px;
    border: none; border-radius: 50%; background: rgba(255, 255, 255, 0.15);
    color: white; font-size: 18px; cursor: pointer;
  }
  .lightbox-close:hover { background: rgba(255, 255, 255, 0.25); }

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

  @media (max-width: 640px) {
    .desktop-only { display: none; }
    .mobile-only { display: flex; }

    .search-form { gap: 12px; }
    .search-form .btn-confirm { width: 100%; }
    .time-range-group { gap: 8px; flex-wrap: wrap; }
  }
</style>
