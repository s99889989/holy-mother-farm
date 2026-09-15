<template>
  <InternalSystemRequestShell>
  <div class="page">
    <h1 class="page-title">需求(維修)單功能</h1>

    <section class="card">
      <div class="toolbar">
        <div class="toolbar-left">
          <label class="toolbar-label">月份</label>
          <select v-model="year" class="filter-select" @change="load">
            <option v-for="y in yearOptions" :key="y" :value="y">{{ y }}</option>
          </select>
        </div>
        <button type="button" class="add-btn" @click="openAdd">
          ＋ 新增
        </button>
      </div>

      <p v-if="loading" class="hint-text">載入中...</p>
      <p v-else-if="error" class="error-text">載入失敗</p>
      <p v-else-if="rows.length === 0" class="hint-text">本月無資料</p>
      <div v-else class="table-wrap">
        <table class="data-table">
          <thead>
            <tr>
              <th>序號</th>
              <th>填表日期</th>
              <th>處理單位</th>
              <th>問題種類</th>
              <th>報修人</th>
              <th>叫修人</th>
              <th>聯絡分機</th>
              <th>緊急程度</th>
              <th>承辦人</th>
              <th>工作進度</th>
              <th>編輯</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in rows" :key="row.request_id">
              <td>{{ row.request_id }}</td>
              <td>{{ row.request_daytime }}</td>
              <td>{{ row.department_name }}</td>
              <td>{{ row.request_category }}</td>
              <td>{{ row.request_person }}</td>
              <td>{{ row.applicant }}</td>
              <td>{{ row.tel }}</td>
              <td :class="{ urgent: row.request_speed === '緊急' }">{{ row.request_speed }}</td>
              <td>{{ row.u_name || '' }}</td>
              <td>{{ row.sc_name || '' }}</td>
              <td>
                <button type="button" class="btn-sm" @click="openEdit(row.request_id)">修改</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <!-- 新增 / 編輯表單 -->
    <div v-if="showForm" class="modal-backdrop" @click.self="closeForm">
      <div class="modal-box">
        <div class="modal-header">
          <h3 class="modal-title">{{ isEdit ? '編輯' : '新增' }}需求(維修)單</h3>
          <button type="button" class="close-btn" @click="closeForm">✕</button>
        </div>

        <form class="modal-body" @submit.prevent="submitForm">
          <div class="form-grid">
            <!-- 左欄 -->
            <div class="form-col">
              <div class="field">
                <label class="field-label">需求速別</label>
                <div class="radio-group">
                  <label v-for="opt in code?.request_speed ?? []" :key="opt.sc_name" class="radio-pill">
                    <input type="radio" name="request_speed" :value="opt.sc_name" v-model="form.request_speed" />
                    {{ opt.sc_name === '一般' ? '一般件' : '急件' }}
                  </label>
                </div>
              </div>

              <div class="field">
                <label class="field-label">請修單位</label>
                <div class="radio-group">
                  <label v-for="d in code?.department ?? []" :key="d.department_number" class="radio-pill">
                    <input
                        type="radio"
                        name="request_group_id"
                        :value="d.department_number"
                        v-model="form.request_group_id"
                        required
                        @change="onGroupChange"
                    />
                    {{ d.department_name }}
                  </label>
                </div>
              </div>

              <div class="field">
                <label class="field-label">申請機構</label>
                <select v-model="form.institution" class="filter-select" required @change="onInstitutionChange">
                  <option value="">請選擇</option>
                  <option v-for="o in code?.organization ?? []" :key="o.Code" :value="o.Code">{{ o.Code }}{{ o.Name }}</option>
                </select>
              </div>

              <div class="field">
                <label class="field-label">申請單位</label>
                <select v-model="form.request_use_department" class="filter-select" required @change="onDepartmentChange">
                  <option value="">請選擇</option>
                  <option v-for="d in departmentOptions" :key="d.department_number" :value="d.department_number">
                    {{ d.department_number }}{{ d.department_name }}
                  </option>
                </select>
              </div>

              <div class="field">
                <label class="field-label">叫修人</label>
                <select v-model="form.applicant" class="filter-select" required>
                  <option v-for="a in applicantOptions" :key="a.employee_name" :value="a.employee_name">
                    {{ a.employee_id }} {{ a.employee_name }}
                  </option>
                </select>
              </div>

              <template v-if="!isEdit">
                <div class="field">
                  <label class="field-label">叫修單位主管(組長)</label>
                  <select v-model="form.tl_mail" class="filter-select">
                    <option value="">請選擇</option>
                    <option v-for="s in tlOptions" :key="s.e_mail" :value="s.e_mail">{{ s.employee_id }} {{ s.employee_name }}</option>
                  </select>
                </div>
                <div class="field">
                  <label class="field-label">叫修單位主管(主任)</label>
                  <select v-model="form.dr_mail" class="filter-select">
                    <option value="">請選擇</option>
                    <option v-for="s in drOptions" :key="s.e_mail" :value="s.e_mail">{{ s.employee_id }} {{ s.employee_name }}</option>
                  </select>
                </div>
              </template>

              <div class="field">
                <label class="field-label">填表日期</label>
                <input
                    v-if="!isEdit"
                    type="text"
                    class="text-input"
                    v-model="form.request_daytime"
                />
                <input v-else type="text" class="text-input" :value="form.request_daytime" readonly />
              </div>

              <div class="field">
                <label class="field-label">填表人</label>
                <input type="text" class="text-input" :value="form.request_person" readonly />
              </div>
            </div>

            <!-- 右欄 -->
            <div class="form-col">
              <div class="field">
                <label class="field-label">分機</label>
                <input type="text" class="text-input" v-model="form.tel" />
              </div>

              <div class="field">
                <label class="field-label">財產編號</label>
                <input type="text" class="text-input" v-model="form.property_number" />
              </div>

              <div class="field">
                <label class="field-label">問題種類</label>
                <select v-model="form.request_category" class="filter-select" required @change="onCategoryChange">
                  <option value="">請選擇</option>
                  <option v-for="c in categoryOptions" :key="c.sc_name" :value="c.sc_name">{{ c.sc_name }}</option>
                </select>
              </div>

              <div v-if="!isMedicalGas" class="field">
                <label class="field-label">問題描述</label>
                <input type="text" class="text-input" v-model="form.request_describe" required />
              </div>

              <div v-else class="field">
                <label class="field-label">問題描述</label>
                <select v-model="form.request_describe_1" class="filter-select" required @change="onDescribe1Change">
                  <option value="">請選擇</option>
                  <option v-for="c in describe1Options" :key="c.sc_name" :value="describe1Value(c.sc_name)">
                    {{ c.sc_name }}
                  </option>
                </select>
              </div>

              <div v-if="showOtherField" class="field">
                <label class="field-label">{{ otherFieldLabel }}</label>
                <input type="text" class="text-input" v-model="form.request_describe_other" />
              </div>

              <div class="field">
                <label class="field-label">地點</label>
                <input type="text" class="text-input" v-model="form.request_address" placeholder="例：P0D30101 農莊服務中心" />
                <p class="field-hint">舊系統原本是彈窗選點，這裡先改成直接輸入代碼+名稱；如需要恢復選點功能請告訴我。</p>
              </div>

              <div class="field">
                <label class="field-label">發生原因(僅需維修人員填寫)</label>
                <input type="text" class="text-input" v-model="form.cause" />
              </div>

              <div class="field">
                <label class="field-label">備註</label>
                <input type="text" class="text-input" v-model="form.request_notes" />
              </div>

              <div class="field">
                <label class="field-label">電子信箱</label>
                <input type="text" class="text-input" :value="form.request_email" readonly />
              </div>

              <div v-if="!isEdit" class="field">
                <label class="field-label">IP</label>
                <input type="text" class="text-input" :value="form.request_person_ip" readonly />
              </div>
            </div>
          </div>

          <div class="modal-actions">
            <button type="button" class="btn-sm" @click="closeForm">取消</button>
            <button type="submit" class="btn-sm btn-confirm" :disabled="submitting">
              {{ submitting ? '處理中...' : isEdit ? '儲存' : '新增' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
  </InternalSystemRequestShell>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'staff', requiredPermission: 'content.internal-system', middleware: 'internal-system-auth' })

/* =========================================================
 * 型別（欄位名稱依 sys_request.php / sys_request_ae.hbs 推測，
 * 接上後如與實際回傳不符請告知我調整）
 * =======================================================*/
interface ListRow {
  request_id: string
  request_daytime: string
  department_name: string
  request_category: string
  request_person: string
  applicant: string
  tel: string
  request_speed: string
  u_name: string | null
  sc_name: string | null
}

interface ListResponse {
  rs: string
  msg: string
  data: ListRow[]
}

interface CodeOption {
  sc_name: string
}

interface DeptOption {
  department_number: string
  department_name: string
}

interface OrgOption {
  Code: string
  Name: string
}

interface StaffOption {
  e_mail: string
  employee_id: string
  employee_name: string
}

interface CurrentUser {
  employee_name: string
  e_mail: string
  ip: string
}

interface CodeResponse {
  request_speed: CodeOption[]
  department: DeptOption[]
  organization: OrgOption[]
  call_department: DeptOption[]
  team_leader: StaffOption[]
  director: StaffOption[]
  user: CurrentUser
}

interface DetailData {
  request_id: string
  request_daytime: string
  request_person: string
  tel: string
  request_category: string
  request_notes: string
  request_email: string
  request_address: string
  request_group_id: string
  request_speed: string
  request_use_department: string
  request_describe: string
  applicant: string
  cause: string
  property_number: string
  institution: string
  request_person_ip: string
}

/* =========================================================
 * 清單
 * =======================================================*/
function buildYearOptions(): string[] {
  const now = new Date()
  const list: string[] = []
  for (let i = 0; i < 60; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    list.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`)
  }
  list.push('0000-00')
  return list
}

const yearOptions = buildYearOptions()
const year = ref(
    (import.meta.client && sessionStorage.getItem('A117_Year')) || yearOptions[0]
)

const rows = ref<ListRow[]>([])
const loading = ref(true)
const error = ref(false)

const load = async () => {
  loading.value = true
  error.value = false
  if (import.meta.client) sessionStorage.setItem('A117_Year', year.value)
  try {
    const res = await $fetch<ListResponse>('/api/internal-system/request/list', { query: { year: year.value } })
    rows.value = res.data ?? []
  } catch {
    error.value = true
  } finally {
    loading.value = false
  }
}

/* =========================================================
 * 表單 / 連動下拉選單
 * =======================================================*/
const code = ref<CodeResponse | null>(null)
const showForm = ref(false)
const isEdit = ref(false)
const submitting = ref(false)

const departmentOptions = ref<DeptOption[]>([])
const applicantOptions = ref<StaffOption[]>([])
const tlOptions = ref<StaffOption[]>([])
const drOptions = ref<StaffOption[]>([])
const categoryOptions = ref<CodeOption[]>([])
const describe1Options = ref<CodeOption[]>([])

const isMedicalGas = computed(() => form.request_category === '醫用氣體')
const showOtherField = computed(() => !isMedicalGas.value ? false : !!form.request_describe_1)
const otherFieldLabel = computed(() =>
    form.request_describe_1 === '其他：' ? '(問題描述)其他：' : '補充說明：'
)

function describe1Value(scName: string): string {
  // 對應舊版 rd_hbs：其他：本身已經有冒號，其餘選項統一補上冒號當分隔
  return scName === '其他：' ? scName : `${scName}：`
}

const emptyForm = () => ({
  request_speed: '一般',
  request_group_id: '',
  institution: '',
  request_use_department: '',
  applicant: '',
  tl_mail: '',
  dr_mail: '',
  request_daytime: '',
  request_person: '',
  tel: '',
  property_number: '',
  request_category: '',
  request_describe: '',
  request_describe_1: '',
  request_describe_other: '',
  request_address: '',
  cause: '',
  request_notes: '',
  request_email: '',
  request_person_ip: '',
})

const form = reactive(emptyForm())
const editingId = ref('')

async function loadCode() {
  code.value = await $fetch<CodeResponse>('/api/internal-system/request/code')
}

async function loadCategory(scGroup: string) {
  categoryOptions.value = await $fetch<CodeOption[]>('/api/internal-system/request/category', {
    method: 'POST',
    body: { scGroup },
  })
}

async function loadDescribe1() {
  describe1Options.value = await $fetch<CodeOption[]>('/api/internal-system/request/category', {
    method: 'POST',
    body: { scGroup: 'Medical_Gas' },
  })
}

async function loadDepartment() {
  departmentOptions.value = await $fetch<DeptOption[]>('/api/internal-system/request/department', {
    method: 'POST',
    body: { organization: form.institution },
  })
}

async function loadApplicantAndLeaders() {
  const staff = await $fetch<StaffOption[]>('/api/internal-system/request/tl-mail', {
    method: 'POST',
    body: { requestUseDepartment: form.request_use_department, organization: form.institution },
  })
  applicantOptions.value = staff
  tlOptions.value = staff
  // 預設帶入目前登入者
  const me = code.value?.user.employee_name
  if (me && staff.some((s) => s.employee_name === me)) {
    form.applicant = me
  } else if (staff.length) {
    form.applicant = staff[0].employee_name
  }

  drOptions.value = await $fetch<StaffOption[]>('/api/internal-system/request/dr-mail', {
    method: 'POST',
    body: { requestUseDepartment: form.request_use_department, organization: form.institution },
  })
}

async function onGroupChange() {
  form.request_category = ''
  form.request_describe_1 = ''
  form.request_describe_other = ''
  await loadCategory(form.request_group_id)
}

async function onCategoryChange() {
  form.request_describe_1 = ''
  form.request_describe_other = ''
  if (isMedicalGas.value) {
    await loadDescribe1()
  }
}

function onDescribe1Change() {
  form.request_describe_other = ''
}

async function onInstitutionChange() {
  form.request_use_department = ''
  departmentOptions.value = []
  applicantOptions.value = []
  await loadDepartment()
}

async function onDepartmentChange() {
  await loadApplicantAndLeaders()
}

/* =========================================================
 * 開啟表單
 * =======================================================*/
async function openAdd() {
  Object.assign(form, emptyForm())
  isEdit.value = false
  editingId.value = ''

  if (!code.value) await loadCode()
  categoryOptions.value = []
  departmentOptions.value = code.value?.call_department ?? []
  applicantOptions.value = []
  tlOptions.value = code.value?.team_leader ?? []
  drOptions.value = code.value?.director ?? []

  const now = new Date()
  form.request_daytime = now.toISOString().slice(0, 19).replace('T', ' ')
  form.request_person = code.value?.user.employee_name ?? ''
  form.applicant = code.value?.user.employee_name ?? ''
  form.request_email = code.value?.user.e_mail ?? ''
  form.request_person_ip = code.value?.user.ip ?? ''

  showForm.value = true
}

async function openEdit(id: string) {
  isEdit.value = true
  editingId.value = id

  if (!code.value) await loadCode()

  const res = await $fetch<{ rs: string; data: DetailData }>('/api/internal-system/request/detail', {
    method: 'POST',
    body: { id },
  })
  const d = res.data

  Object.assign(form, emptyForm())
  form.request_speed = d.request_speed
  form.request_group_id = d.request_group_id
  form.institution = d.institution
  form.request_use_department = d.request_use_department
  form.applicant = d.applicant
  form.request_daytime = d.request_daytime
  form.request_person = d.request_person
  form.tel = d.tel
  form.property_number = d.property_number
  form.request_category = d.request_category
  form.request_address = d.request_address
  form.cause = d.cause
  form.request_notes = d.request_notes
  form.request_email = d.request_email

  // 問題描述：舊系統存的是「主要描述：補充說明」組合字串，含冒號才拆開
  const raw = d.request_describe ?? ''
  const colonIdx = raw.indexOf('：')
  const mainPart = colonIdx >= 0 ? raw.slice(0, colonIdx + 1) : raw
  const otherPart = colonIdx >= 0 ? raw.slice(colonIdx + 1) : ''

  await loadCategory(d.request_group_id)

  if (d.request_category === '醫用氣體') {
    await loadDescribe1()
    form.request_describe_1 = mainPart
    form.request_describe_other = otherPart
  } else {
    form.request_describe = mainPart
    form.request_describe_other = otherPart
  }

  departmentOptions.value = code.value?.call_department ?? []
  applicantOptions.value = [{ e_mail: '', employee_id: '', employee_name: d.applicant }]

  showForm.value = true
}

function closeForm() {
  showForm.value = false
}

/* =========================================================
 * 送出
 * =======================================================*/
async function submitForm() {
  submitting.value = true
  try {
    const payload: Record<string, unknown> = { ...form }
    if (isEdit.value) {
      payload.request_id = editingId.value
      delete payload.tl_mail
      delete payload.dr_mail
      delete payload.request_person_ip
    }

    const url = isEdit.value ? '/api/internal-system/request/update' : '/api/internal-system/request/add'
    const res = await $fetch<{ rs: string; msg: string }>(url, { method: 'POST', body: payload })

    if (res.rs === '1') {
      showForm.value = false
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

onMounted(() => {
  load()
})
</script>

<style scoped>
.page { max-width: 1200px; }

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
}

.toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 14px;
}

.toolbar-left {
  display: flex;
  align-items: center;
  gap: 8px;
}

.toolbar-label {
  font-size: 13px;
  color: var(--text-muted);
}

.add-btn {
  padding: 8px 18px;
  background: var(--accent);
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 13px;
  cursor: pointer;
}

.filter-select {
  padding: 8px 10px;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--surface);
  color: var(--text);
  font-size: 13px;
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

.urgent { color: #e53e3e; font-weight: 700; }

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

.btn-confirm {
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
  padding: 20px;
}

.modal-box {
  background: var(--surface);
  border-radius: var(--radius);
  width: 100%;
  max-width: 920px;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid var(--border-light);
}

.modal-title {
  margin: 0;
  font-size: 16px;
  color: var(--text);
}

.close-btn {
  border: none;
  background: none;
  font-size: 16px;
  color: var(--text-hint);
  cursor: pointer;
}

.modal-body {
  padding: 20px;
  overflow-y: auto;
}

.form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0 24px;
}

.form-col {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.field-label {
  font-size: 12px;
  color: var(--text-muted);
}

.field-hint {
  font-size: 11px;
  color: var(--text-hint);
  margin: 2px 0 0;
}

.text-input {
  padding: 8px 10px;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--surface);
  color: var(--text);
  font-size: 13px;
}
.text-input[readonly] { background: var(--surface2); color: var(--text-muted); }

.radio-group {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.radio-pill {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 6px 12px;
  border: 1px solid var(--border);
  border-radius: 999px;
  font-size: 12px;
  cursor: pointer;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 20px;
  padding-top: 16px;
  border-top: 1px solid var(--border-light);
}

@media (max-width: 720px) {
  .form-grid { grid-template-columns: 1fr; }
}
</style>