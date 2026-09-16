<template>
  <InternalSystemVehicleShell>
    <div class="list-page">
      <h1 class="page-title">公務車申請單管理</h1>

      <div class="card">
        <div class="card-body">
          <p class="search-hint">
            請至少選擇 開始日期 查詢資料<br />
            僅供查詢最早前三個月的申請單
          </p>
          <form class="search-form" @submit.prevent="search">
            <div class="form-row">
              <label>開始日期</label>
              <input class="form-input" type="date" v-model="startDate" :min="minDateStr" required />
            </div>
            <div class="form-row">
              <label>結束日期</label>
              <input class="form-input" type="date" v-model="endDate" :min="minDateStr" />
            </div>
            <button type="submit" class="btn-sm btn-confirm" :disabled="searching">
              {{ searching ? '查詢中...' : '查詢' }}
            </button>
          </form>

          <div v-if="records.length" class="filter-row">
            <div class="form-row">
              <label>公務車</label>
              <select class="form-input" v-model="carFilter">
                <option value="">全部</option>
                <option v-for="c in uniqueCars" :key="c" :value="c">{{ c }}</option>
              </select>
            </div>
            <label class="filter-checkbox">
              <input type="checkbox" v-model="upcomingOnly" /> 僅顯示尚未開始的申請單
            </label>
            <label class="filter-checkbox">
              <input type="checkbox" v-model="enabledOnly" /> 僅顯示啟用中的申請單
            </label>
          </div>

          <p v-if="searchError" class="error-text">{{ searchError }}</p>
        </div>
      </div>

      <div v-if="records.length" class="card">
        <div class="card-header">
          <h2>公務車申請單明細（共 {{ filteredRecords.length }} 筆）</h2>
          <button type="button" class="btn-sm btn-danger" :disabled="disablingAll" @click="confirmDisableAll">
            ⚠️ 一鍵停用查詢結果
          </button>
        </div>
        <div class="card-body">
          <table class="record-table">
            <thead>
              <tr>
                <th>申請人</th>
                <th>駕駛</th>
                <th>使用單位</th>
                <th>公務車選擇</th>
                <th>開始時間</th>
                <th>結束時間</th>
                <th>前往地點</th>
                <th>狀態</th>
                <th>編輯</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(r, i) in filteredRecords" :key="`${r.loan_record_id}-${i}`">
                <td>{{ resolveLabel(applicantOptions, r.applicant_id) }}</td>
                <td>{{ resolveLabel(driverOptions, r.driver_id) }}</td>
                <td>{{ resolveLabel(departmentOptions, r.applicant_department) }}</td>
                <td>{{ resolveLabel(carOptions, r.car_id) }}</td>
                <td>{{ r.startDate }} {{ r.startTime }}</td>
                <td>{{ r.endDate }} {{ r.endTime }}</td>
                <td>{{ r.destination }}</td>
                <td>
                  <span :class="r.loan_st === '1' ? 'badge-on' : 'badge-off'">
                    {{ r.loan_st === '1' ? '啟用' : '停用' }}
                  </span>
                </td>
                <td>
                  <button
                      type="button"
                      class="btn-sm"
                      :disabled="!r.editable"
                      :title="r.editable ? '' : '沒有編輯權限，或此單已開始/已結束'"
                      @click="openEdit(r)"
                  >
                    ✏️ 編輯
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- 編輯 modal -->
      <div v-if="editingRecord" class="modal-backdrop" @click.self="editingRecord = null">
        <div class="modal-box modal-wide">
          <h3 class="modal-title">公務車申請表修改</h3>

          <div class="edit-form">
            <div class="form-row">
              <label>申請人</label>
              <input class="form-input" :value="resolveLabel(applicantOptions, editingRecord.applicant_id)" disabled />
            </div>
            <div class="form-row">
              <label>公務車</label>
              <input class="form-input" :value="resolveLabel(carOptions, editingRecord.car_id)" disabled />
            </div>
            <div class="form-row">
              <label>使用單位</label>
              <input class="form-input" :value="resolveLabel(departmentOptions, editingRecord.applicant_department)" disabled />
            </div>
            <div class="form-row">
              <label>駕駛</label>
              <select class="form-input" v-model="editForm.driver">
                <option value="">請選擇</option>
                <option v-for="o in driverOptions" :key="o.value" :value="o.value">{{ o.label }}</option>
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

          <p v-if="editError" class="error-text">{{ editError }}</p>

          <div class="modal-actions modal-actions-split">
            <button type="button" class="btn-sm btn-danger" :disabled="saving" @click="confirmDelete">刪除</button>
            <div>
              <button type="button" class="btn-sm" @click="editingRecord = null">取消</button>
              <button type="button" class="btn-sm btn-confirm" :disabled="saving" @click="submitEdit">
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
  interface VehicleLoanRecord {
    loan_record_id?: string
    applicant_id?: string
    driver_id?: string
    applicant_department?: string
    car_id?: string
    startDate?: string
    startTime?: string
    endDate?: string
    endTime?: string
    destination?: string
    notes?: string
    loan_st?: string
    editable: boolean
  }

  const pad2 = (n: number) => String(n).padStart(2, '0')
  const now = new Date()
  const todayStr = `${now.getFullYear()}-${pad2(now.getMonth() + 1)}-${pad2(now.getDate())}`
  const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 3, now.getDate())
  const minDateStr = `${threeMonthsAgo.getFullYear()}-${pad2(threeMonthsAgo.getMonth() + 1)}-${pad2(threeMonthsAgo.getDate())}`

  const startDate = ref(minDateStr)
  const endDate = ref(todayStr)
  const searching = ref(false)
  const searchError = ref('')
  const records = ref<VehicleLoanRecord[]>([])

  const carFilter = ref('')
  const upcomingOnly = ref(false)
  const enabledOnly = ref(false)

  // 下拉選單標籤解析（沿用「選擇公務車」「線上申請」兩支 meta API 已經拿到的選項清單，不用另外猜欄位）
  const applicantOptions = ref<VehicleOption[]>([])
  const driverOptions = ref<VehicleOption[]>([])
  const departmentOptions = ref<VehicleOption[]>([])
  const carOptions = ref<VehicleOption[]>([])

  const resolveLabel = (options: VehicleOption[], code?: string) => {
    if (!code) return ''
    return options.find((o) => o.value === code)?.label ?? code
  }

  const loadOptionMeta = async () => {
    try {
      const [addMeta, bookingMeta] = await Promise.all([
        $fetch<{ applicantOptions: VehicleOption[]; driverOptions: VehicleOption[]; departmentOptions: VehicleOption[] }>(
            '/api/internal-system/vehicle/add/meta'
        ),
        $fetch<{ carOptions: VehicleOption[] }>('/api/internal-system/vehicle/booking/meta'),
      ])
      applicantOptions.value = addMeta.applicantOptions
      driverOptions.value = addMeta.driverOptions
      departmentOptions.value = addMeta.departmentOptions
      carOptions.value = bookingMeta.carOptions
    } catch {
      // 標籤解析失敗不影響查詢本身，退回顯示原始代碼即可
    }
  }

  const uniqueCars = computed(() => {
    const set = new Set<string>()
    records.value.forEach((r) => { if (r.car_id) set.add(r.car_id) })
    return Array.from(set)
  })

  const filteredRecords = computed(() => {
    return records.value.filter((r) => {
      if (carFilter.value && r.car_id !== carFilter.value) return false
      if (enabledOnly.value && r.loan_st !== '1') return false
      if (upcomingOnly.value) {
        const startDateTime = new Date(`${r.startDate} ${r.startTime}`)
        if (!(startDateTime > new Date())) return false
      }
      return true
    })
  })

  const search = async () => {
    searching.value = true
    searchError.value = ''
    try {
      records.value = await $fetch<VehicleLoanRecord[]>('/api/internal-system/vehicle/list/search', {
        method: 'POST',
        body: { startDate: startDate.value, endDate: endDate.value },
      })
      carFilter.value = ''
    } catch (e: any) {
      searchError.value = e?.data?.message ?? '查詢失敗，請稍後再試'
      records.value = []
    } finally {
      searching.value = false
    }
  }

  const disablingAll = ref(false)
  const confirmDisableAll = async () => {
    if (!confirm('此行為將停用所有查詢結果中的申請單，確定要停用嗎？')) return
    disablingAll.value = true
    try {
      const res = await $fetch<{ rs: string; msg: string }>('/api/internal-system/vehicle/list/disable-all', {
        method: 'POST',
        body: { startDate: startDate.value, endDate: endDate.value, selectCar: carFilter.value },
      })
      if (res.rs === '1') {
        await search()
      } else {
        searchError.value = res.msg ?? '停用失敗'
      }
    } catch (e: any) {
      searchError.value = e?.data?.message ?? '停用失敗，請稍後再試'
    } finally {
      disablingAll.value = false
    }
  }

  // 編輯
  const editingRecord = ref<VehicleLoanRecord | null>(null)
  const editForm = reactive({
    driver: '', start_date: '', start_time: '', end_date: '', end_time: '',
    destination: '', st: '1', note: '',
  })
  const saving = ref(false)
  const editError = ref('')

  const openEdit = (r: VehicleLoanRecord) => {
    if (!r.editable) return
    editingRecord.value = r
    editForm.driver = r.driver_id ?? ''
    editForm.start_date = r.startDate ?? ''
    editForm.start_time = r.startTime ?? ''
    editForm.end_date = r.endDate ?? ''
    editForm.end_time = r.endTime ?? ''
    editForm.destination = r.destination ?? ''
    editForm.st = r.loan_st ?? '1'
    editForm.note = r.notes ?? ''
    editError.value = ''
  }

  const submitEdit = async () => {
    if (!editingRecord.value) return
    saving.value = true
    editError.value = ''
    try {
      const res = await $fetch<{ rs: string; msg: string }>('/api/internal-system/vehicle/booking/update', {
        method: 'POST',
        body: {
          loan_record_id: editingRecord.value.loan_record_id,
          employe: editingRecord.value.applicant_id,
          car_id: editingRecord.value.car_id,
          department: editingRecord.value.applicant_department,
          ...editForm,
        },
      })
      if (res.rs === '1') {
        editingRecord.value = null
        await search()
      } else {
        editError.value = res.msg ?? '更新失敗'
      }
    } catch (e: any) {
      editError.value = e?.data?.message ?? '更新失敗，請稍後再試'
    } finally {
      saving.value = false
    }
  }

  const confirmDelete = async () => {
    if (!editingRecord.value) return
    if (!confirm('確定要刪除這筆申請單嗎？此動作無法復原。')) return

    saving.value = true
    editError.value = ''
    try {
      const res = await $fetch<{ rs: string; msg: string }>('/api/internal-system/vehicle/booking/delete', {
        method: 'POST',
        body: { loan_record_id: editingRecord.value.loan_record_id },
      })
      if (res.rs === '1') {
        editingRecord.value = null
        await search()
      } else {
        editError.value = res.msg ?? '刪除失敗'
      }
    } catch (e: any) {
      editError.value = e?.data?.message ?? '刪除失敗，請稍後再試'
    } finally {
      saving.value = false
    }
  }

  onMounted(loadOptionMeta)
</script>

<style scoped>
  .list-page { max-width: 1100px; }
  .page-title { font-size: 20px; color: var(--text); margin: 0 0 16px; }

  .card {
    background: var(--surface); border: 1px solid var(--border-light); border-radius: var(--radius);
    box-shadow: var(--shadow); margin-bottom: 16px;
  }
  .card-header { padding: 12px 16px; border-bottom: 1px solid var(--border-light); display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 8px; }
  .card-header h2 { margin: 0; font-size: 18px; color: var(--text); }
  .card-body { padding: 16px; }

  .search-hint { color: #e53e3e; font-weight: 700; text-align: center; margin: 0 0 12px; }
  .search-form { display: flex; align-items: flex-end; gap: 16px; flex-wrap: wrap; margin-bottom: 12px; }

  .filter-row { display: flex; align-items: flex-end; gap: 20px; flex-wrap: wrap; padding-top: 12px; border-top: 1px solid var(--border-light); }
  .filter-checkbox { display: flex; align-items: center; gap: 6px; font-size: 16px; color: var(--text); }

  .form-row { display: flex; flex-direction: column; gap: 4px; }
  .form-row label { font-size: 14px; color: var(--text-muted); }
  .form-input {
    padding: 7px 10px; border: 1px solid var(--border); border-radius: 8px;
    background: var(--surface); color: var(--text); font-size: 16px;
  }
  .form-input:disabled { background: var(--surface2); color: var(--text-hint); }

  .record-table { width: 100%; border-collapse: collapse; }
  .record-table th, .record-table td {
    border: 1px solid var(--border-light); padding: 8px 10px; text-align: center; font-size: 16px;
  }
  .record-table th { background: var(--surface2); color: var(--text-muted); }

  .badge-on { color: #2f855a; font-weight: 700; }
  .badge-off { color: #c05621; font-weight: 700; }

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

  .modal-actions { display: flex; justify-content: flex-end; gap: 8px; }
  .modal-actions-split { justify-content: space-between; }
  .btn-sm {
    padding: 6px 14px; border: 1px solid var(--border); border-radius: 6px;
    background: var(--surface); color: var(--text); font-size: 16px; cursor: pointer;
  }
  .btn-sm:hover { background: var(--surface2); }
  .btn-sm:disabled { opacity: 0.5; cursor: not-allowed; }
  .btn-confirm { background: var(--accent); color: white; border-color: var(--accent); margin-left: 8px; }
  .btn-confirm:disabled { opacity: 0.6; cursor: not-allowed; }
  .btn-danger { background: #e53e3e; color: white; border-color: #e53e3e; }
  .btn-danger:disabled { opacity: 0.6; cursor: not-allowed; }
</style>
