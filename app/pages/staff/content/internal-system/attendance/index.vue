<template>
  <InternalSystemAttendanceShell>
    <div class="attendance-page">
      <h1 class="page-title">員工出勤查詢</h1>

      <div class="card">
        <button type="button" class="card-header search-header" @click="searchExpanded = !searchExpanded">
          <h2>查詢條件</h2>
          <span class="collapse-icon" :class="{ 'is-collapsed': !searchExpanded }">▾</span>
        </button>
        <div class="search-body" :class="{ 'is-collapsed': !searchExpanded }">
          <div class="card-body">
            <form class="search-form" @submit.prevent="search">
              <div class="form-row">
                <label>機構</label>
                <select class="form-input" v-model="org">
                  <option value="">全部</option>
                  <option v-for="o in ORGANIZATIONS" :key="o.value" :value="o.value">{{ o.label }}</option>
                </select>
              </div>

              <div class="form-row">
                <label>單位</label>
                <select class="form-input" v-model="department" :disabled="!org || loadingDepartments">
                  <option value="">全部</option>
                  <option v-for="d in departments" :key="d.value" :value="d.value">{{ d.label }}</option>
                </select>
              </div>

              <div class="form-row">
                <label>姓名</label>
                <select class="form-input" v-model="employeeId" :disabled="!org || !department || loadingEmployees">
                  <option value="">全部</option>
                  <option v-for="e in employees" :key="e.value" :value="e.value">{{ e.label }}</option>
                </select>
              </div>

              <div class="form-row">
                <label>查詢時間（開始）</label>
                <input class="form-input" type="date" v-model="beg" required />
              </div>

              <div class="form-row">
                <label>查詢時間（結束）</label>
                <input class="form-input" type="date" v-model="end" required />
              </div>

              <button type="submit" class="btn-sm btn-confirm" :disabled="searching">
                {{ searching ? '查詢中...' : '查詢' }}
              </button>
            </form>

            <p v-if="searchError" class="error-text">{{ searchError }}</p>
          </div>
        </div>
      </div>

      <div v-if="hasSearched" class="card">
        <div class="card-header">
          <h2>員工出勤查詢（共 {{ records.length }} 筆）</h2>
        </div>
        <div class="card-body">
          <p v-if="!records.length" class="empty-hint">查無符合條件的出勤紀錄</p>

          <template v-else>
            <!-- 桌面版：表格顯示 -->
            <div class="table-wrap desktop-only">
              <table class="record-table">
                <thead>
                <tr>
                  <th>姓名</th>
                  <th>員工編號</th>
                  <th>日期</th>
                  <th>時間</th>
                  <th>星期</th>
                  <th>班別</th>
                  <th>卡號</th>
                </tr>
                </thead>
                <tbody>
                <tr v-for="(r, i) in records" :key="`${r.employee_number}-${r.login_date}-${r.login_time}-${i}`">
                  <td>{{ r.employee_name }}</td>
                  <td>{{ r.employee_number }}</td>
                  <td>{{ r.login_date }}</td>
                  <td>{{ r.login_time }}</td>
                  <td>{{ weekdayLabel(r.login_date) }}</td>
                  <td>
                    <span class="class-type" :class="classTypeMeta(r.class_type).colorClass">
                      {{ classTypeMeta(r.class_type).label }}
                    </span>
                  </td>
                  <td>{{ r.card_number }}</td>
                </tr>
                </tbody>
              </table>
            </div>

            <!-- 手機版：卡片顯示 -->
            <div class="record-cards mobile-only">
              <div
                v-for="(r, i) in records"
                :key="`${r.employee_number}-${r.login_date}-${r.login_time}-${i}`"
                class="record-item-card"
              >
                <div class="record-item-header">
                  <span class="record-name">{{ r.employee_name }}</span>
                  <span class="class-type" :class="classTypeMeta(r.class_type).colorClass">
                  {{ classTypeMeta(r.class_type).label }}
                </span>
                </div>
                <div class="record-item-body">
                  <div class="record-row">
                    <span class="record-label">員工編號</span>
                    <span class="record-value">{{ r.employee_number }}</span>
                  </div>
                  <div class="record-row">
                    <span class="record-label">日期</span>
                    <span class="record-value">{{ r.login_date }}（{{ weekdayLabel(r.login_date) }}）</span>
                  </div>
                  <div class="record-row">
                    <span class="record-label">時間</span>
                    <span class="record-value">{{ r.login_time }}</span>
                  </div>
                  <div class="record-row">
                    <span class="record-label">卡號</span>
                    <span class="record-value">{{ r.card_number }}</span>
                  </div>
                </div>
              </div>
            </div>
          </template>
        </div>
      </div>
    </div>
  </InternalSystemAttendanceShell>
</template>

<script setup lang="ts">
  definePageMeta({ layout: 'staff', requiredPermission: 'content.internal-system', middleware: 'internal-system-auth' })

  interface HrOption { value: string; label: string }
  interface HrAttendanceRecord {
    employee_name: string
    employee_number: string
    login_date: string
    login_time: string
    class_type: string
    card_number: string
  }

  // 機構代碼是原網站寫死在 hr_menu.php 的固定清單，不是查資料庫來的
  const ORGANIZATIONS: HrOption[] = [
    { value: 'A', label: '(A)法人' },
    { value: 'F', label: '(F)健康農莊' },
    { value: 'G', label: '(G)健康會館' },
    { value: 'H', label: '(H)聖母醫院' },
    { value: 'M', label: '(M)芳心好美' },
    { value: 'N', label: '(N)綜合長照' },
    { value: 'O', label: '(O)外包機構' },
    { value: 'S', label: '(S)居家護理所' },
    { value: 'T', label: '(T)樂智社區長照' },
    { value: 'X', label: '(X)家庭托顧' },
    { value: 'Y', label: '(Y)東區職訓中心' },
  ]

  // 班別代碼 1~6，對照原網站 hbs 樣板裡的 ifelse 對照表
  const CLASS_TYPE_META: Record<string, { label: string; colorClass: string }> = {
    '1': { label: '上班', colorClass: 'ct-red' },
    '2': { label: '下班', colorClass: 'ct-black' },
    '3': { label: '休息開始', colorClass: 'ct-red' },
    '4': { label: '休息結束', colorClass: 'ct-black' },
    '5': { label: '假日加班開始', colorClass: 'ct-red' },
    '6': { label: '假日加班結束', colorClass: 'ct-black' },
  }
  function classTypeMeta(classType: string) {
    return CLASS_TYPE_META[classType] ?? { label: classType, colorClass: 'ct-black' }
  }

  function weekdayLabel(dateStr: string): string {
    const d = new Date(dateStr)
    if (isNaN(d.getTime())) return ''
    return ['日', '一', '二', '三', '四', '五', '六'][d.getDay()]
  }

  const pad2 = (n: number) => String(n).padStart(2, '0')
  const now = new Date()
  const todayStr = `${now.getFullYear()}-${pad2(now.getMonth() + 1)}-${pad2(now.getDate())}`

  const org = ref('')
  const department = ref('')
  const employeeId = ref('')
  const beg = ref(todayStr)
  const end = ref(todayStr)

  const departments = ref<HrOption[]>([])
  const employees = ref<HrOption[]>([])
  const loadingDepartments = ref(false)
  const loadingEmployees = ref(false)

  // 選機構後才查單位清單，比照原網站 #org change 行為；重選機構要清空下層已選的單位/員工
  watch(org, async (val) => {
    department.value = ''
    employeeId.value = ''
    employees.value = []
    if (!val) {
      departments.value = []
      return
    }
    loadingDepartments.value = true
    try {
      departments.value = await $fetch<HrOption[]>('/api/internal-system/attendance/departments', {
        query: { org: val },
      })
    } catch {
      departments.value = []
    } finally {
      loadingDepartments.value = false
    }
  })

  // 選單位後才查員工清單，比照原網站 #department_number change 行為
  watch(department, async (val) => {
    employeeId.value = ''
    if (!val || !org.value) {
      employees.value = []
      return
    }
    loadingEmployees.value = true
    try {
      employees.value = await $fetch<HrOption[]>('/api/internal-system/attendance/employees', {
        query: { org: org.value, department: val },
      })
    } catch {
      employees.value = []
    } finally {
      loadingEmployees.value = false
    }
  })

  const searching = ref(false)
  const searchError = ref('')
  const records = ref<HrAttendanceRecord[]>([])
  const hasSearched = ref(false)
  const searchExpanded = ref(true)

  const search = async () => {
    searching.value = true
    searchError.value = ''
    try {
      records.value = await $fetch<HrAttendanceRecord[]>('/api/internal-system/attendance/search', {
        method: 'POST',
        body: {
          org: org.value,
          ID: department.value,
          number: employeeId.value,
          beg: beg.value,
          end: end.value,
        },
      })
      hasSearched.value = true
      searchExpanded.value = false // 查詢成功後自動收合，讓結果直接顯示
    } catch (e: any) {
      searchError.value = e?.data?.message ?? '查詢失敗，請稍後再試'
      records.value = []
    } finally {
      searching.value = false
    }
  }
</script>

<style scoped>
  .attendance-page { max-width: 1100px; }
  .page-title { font-size: 20px; color: var(--text); margin: 0 0 16px; }

  .card {
    background: var(--surface); border: 1px solid var(--border-light); border-radius: var(--radius);
    box-shadow: var(--shadow); margin-bottom: 16px;
  }
  .card-header { padding: 12px 16px; border-bottom: 1px solid var(--border-light); }
  .card-header h2 { margin: 0; font-size: 18px; color: var(--text); }
  .card-body { padding: 16px; }

  .search-header {
    width: 100%; display: flex; align-items: center; justify-content: space-between;
    background: none; border: none; border-bottom: 1px solid var(--border-light);
    cursor: pointer; font: inherit; text-align: left;
  }
  .collapse-icon {
    font-size: 18px; color: var(--text-muted); transition: transform 0.2s ease; flex-shrink: 0;
  }
  .collapse-icon.is-collapsed { transform: rotate(-90deg); }

  .search-body { display: grid; grid-template-rows: 1fr; transition: grid-template-rows 0.2s ease; }
  .search-body > .card-body { overflow: hidden; min-height: 0; }
  .search-body.is-collapsed { grid-template-rows: 0fr; }
  .search-body.is-collapsed > .card-body { padding-top: 0; padding-bottom: 0; }

  .search-form { display: flex; align-items: flex-end; gap: 16px; flex-wrap: wrap; }

  .form-row { display: flex; flex-direction: column; gap: 4px; }
  .form-row label { font-size: 14px; color: var(--text-muted); }
  .form-input {
    padding: 7px 10px; border: 1px solid var(--border); border-radius: 8px;
    background: var(--surface); color: var(--text); font-size: 16px;
  }
  .form-input:disabled { background: var(--surface2); color: var(--text-hint); }

  .error-text { color: #e53e3e; font-size: 16px; margin: 12px 0 0; }
  .empty-hint { color: var(--text-hint); text-align: center; padding: 20px 0; margin: 0; }

  .table-wrap { overflow-x: auto; }
  .record-table { width: 100%; border-collapse: collapse; }
  .record-table th, .record-table td {
    border: 1px solid var(--border-light); padding: 8px 10px; text-align: center; font-size: 16px;
  }
  .record-table th { background: var(--surface2); color: var(--text-muted); }

  .class-type { font-weight: 700; }
  .class-type.ct-red { color: #e53e3e; }
  .class-type.ct-black { color: var(--text); }

  .btn-sm {
    padding: 6px 14px; border: 1px solid var(--border); border-radius: 6px;
    background: var(--surface); color: var(--text); font-size: 16px; cursor: pointer;
  }
  .btn-confirm { background: var(--accent); color: white; border-color: var(--accent); }
  .btn-confirm:disabled { opacity: 0.6; cursor: not-allowed; }

  /* 手機版卡片顯示 */
  .mobile-only { display: none; }

  .record-cards { display: flex; flex-direction: column; gap: 10px; }
  .record-item-card {
    border: 1px solid var(--border-light); border-radius: 10px; overflow: hidden;
    background: var(--surface);
  }
  .record-item-header {
    display: flex; align-items: center; justify-content: space-between;
    padding: 10px 14px; background: var(--surface2); border-bottom: 1px solid var(--border-light);
  }
  .record-name { font-weight: 700; font-size: 16px; color: var(--text); }
  .record-item-body { padding: 10px 14px; display: flex; flex-direction: column; gap: 6px; }
  .record-row { display: flex; align-items: baseline; justify-content: space-between; gap: 12px; }
  .record-label { font-size: 13px; color: var(--text-muted); flex-shrink: 0; }
  .record-value { font-size: 15px; color: var(--text); text-align: right; word-break: break-all; }

  @media (max-width: 640px) {
    .desktop-only { display: none; }
    .mobile-only { display: flex; }

    .search-form { flex-direction: column; align-items: stretch; gap: 12px; }
    .form-row { width: 100%; }
    .form-input { width: 100%; }
    .btn-confirm { width: 100%; }
  }
</style>
