<script setup>
  import {ref, computed, onMounted} from 'vue'
  import {useRoute} from 'vue-router'
  import {useCommonStore} from '~/stores/common.js'

  definePageMeta({ layout: 'staff' })

  const route = useRoute()
  const courseId = route.params.id
  const commonStore = useCommonStore()
  const BASE = computed(() => `${commonStore.data.main_url}/holy/course-reg/${courseId}/attendance`)

  // ════════════════════════════════════════════════════
  // 測試模式 — 後端出席簽到 API 尚未開發，先用假資料讓畫面/流程可以測試
  // 之後 API 做好後把這裡關掉（或刪除 testMode 相關程式碼）即可切換成真實 API
  // ════════════════════════════════════════════════════
  const testMode = ref(true)

  const SOURCE_OPTIONS = ['聖母醫院', '快樂運動館', '聖母農莊']
  const IDENTITY_OPTIONS = ['院內員工', '院外人士']
  const CHANNEL_OPTIONS = ['員工', '續課', '轉介紹', '海報/LINE', '單次/續約', '活動']
  const CONTINUING_OPTIONS = [
    { value: 'yes', label: '續課中' },
    { value: 'pending', label: '未確定' },
    { value: 'no', label: '未續約' },
  ]

  const courseTitle = ref('')
  const sessions = ref([]) // { id, date, label }
  const students = ref([]) // { id, name, location, identity, channel, continuing, attendance: { [sessionId]: 'present'|'absent'|'leave'|null } }

  const seedMockData = () => {
    courseTitle.value = '功能性團課（測試資料）'
    sessions.value = [
      { id: 's1', date: '2026-08-04', label: 'GP1' },
      { id: 's2', date: '2026-08-06', label: 'GP2' },
      { id: 's3', date: '2026-08-11', label: 'GP3' },
      { id: 's4', date: '2026-08-13', label: 'GP4' },
    ]
    students.value = [
      {
        id: 'st1', name: '測試學員 A', email: 'test-a@example.com', location: '快樂運動館', identity: '院外人士', channel: '海報/LINE',
        continuing: 'yes',
        attendance: { s1: 'present', s2: 'present', s3: 'absent', s4: 'present' }
      },
      {
        id: 'st2', name: '測試學員 B', email: 'test-b@example.com', location: '聖母醫院', identity: '院內員工', channel: '員工',
        continuing: 'pending',
        attendance: { s1: 'present', s2: 'leave', s3: 'present', s4: null }
      },
      {
        id: 'st3', name: '測試學員 C', email: 'test-c@example.com', location: '快樂運動館', identity: '院外人士', channel: '轉介紹',
        continuing: 'no',
        attendance: { s1: 'absent', s2: 'absent', s3: null, s4: null }
      },
    ]
  }

  // ════════════════════════════════════════════════════
  // 讀取資料
  // ════════════════════════════════════════════════════
  const loading = ref(true)
  const loadError = ref('')

  const fetchData = async () => {
    loading.value = true
    loadError.value = ''
    if (testMode.value) {
      seedMockData()
      loading.value = false
      return
    }
    try {
      const res = await fetch(BASE.value, { credentials: 'include' })
      if (!res.ok) throw new Error('load failed')
      const data = await res.json()
      courseTitle.value = data.courseTitle || ''
      sessions.value = Array.isArray(data.sessions) ? data.sessions : []
      students.value = Array.isArray(data.students) ? data.students : []
    } catch {
      loadError.value = '後端尚未連線，可先開啟上方「測試模式」試用畫面流程'
    } finally {
      loading.value = false
    }
  }

  // ════════════════════════════════════════════════════
  // 出席狀態：null(未記錄) → present(出席) → absent(缺席) → leave(請假) → null
  // ════════════════════════════════════════════════════
  const STATUS_CYCLE = [null, 'present', 'absent', 'leave']
  const STATUS_LABEL = { present: '●', absent: '✕', leave: '假' }
  const STATUS_CLASS = { present: 'att--present', absent: 'att--absent', leave: 'att--leave' }

  const cycleAttendance = async (student, sessionId) => {
    const current = student.attendance[sessionId] ?? null
    const idx = STATUS_CYCLE.indexOf(current)
    const next = STATUS_CYCLE[(idx + 1) % STATUS_CYCLE.length]
    const prev = student.attendance[sessionId]
    student.attendance[sessionId] = next // 先樂觀更新畫面

    if (testMode.value) return
    try {
      const res = await fetch(`${BASE.value}/mark`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ studentId: student.id, sessionId, status: next })
      })
      if (!res.ok) throw new Error('mark failed')
    } catch {
      student.attendance[sessionId] = prev // 失敗則還原
      showToast('更新出席狀態失敗，請稍後再試')
    }
  }

  // ════════════════════════════════════════════════════
  // 學員欄位（客戶來源／是否續約）編輯
  // ════════════════════════════════════════════════════
  const updateStudentField = async (student, field, value) => {
    const prev = student[field]
    student[field] = value

    if (testMode.value) return
    try {
      const res = await fetch(`${BASE.value}/student/${student.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ [field]: value })
      })
      if (!res.ok) throw new Error('update failed')
    } catch {
      student[field] = prev
      showToast('更新失敗，請稍後再試')
    }
  }

  // ════════════════════════════════════════════════════
  // 新增場次 / 新增學員
  // ════════════════════════════════════════════════════
  const showAddSession = ref(false)
  const newSessionDate = ref('')
  const newSessionLabel = ref('')

  const addSession = async () => {
    if (!newSessionDate.value) return
    const label = newSessionLabel.value.trim() || `GP${sessions.value.length + 1}`
    const newSession = { id: `local-${Date.now()}`, date: newSessionDate.value, label }

    if (testMode.value) {
      sessions.value.push(newSession)
    } else {
      try {
        const res = await fetch(`${BASE.value}/session`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ date: newSessionDate.value, label })
        })
        if (!res.ok) throw new Error('add session failed')
        const saved = await res.json()
        sessions.value.push(saved?.id ? saved : newSession)
      } catch {
        showToast('新增場次失敗，請稍後再試')
        return
      }
    }
    newSessionDate.value = ''
    newSessionLabel.value = ''
    showAddSession.value = false
  }

  const showAddStudent = ref(false)
  const newStudentName = ref('')
  const newStudentEmail = ref('')
  const newStudentLocation = ref(SOURCE_OPTIONS[0])
  const newStudentIdentity = ref(IDENTITY_OPTIONS[0])
  const newStudentChannel = ref(CHANNEL_OPTIONS[0])

  const addStudent = async () => {
    const name = newStudentName.value.trim()
    if (!name) return
    const newStudent = {
      id: `local-${Date.now()}`,
      name,
      email: newStudentEmail.value.trim(),
      location: newStudentLocation.value,
      identity: newStudentIdentity.value,
      channel: newStudentChannel.value,
      continuing: 'pending',
      attendance: {}
    }

    if (testMode.value) {
      students.value.push(newStudent)
    } else {
      try {
        const res = await fetch(`${BASE.value}/student`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            name, email: newStudentEmail.value.trim(), location: newStudentLocation.value,
            identity: newStudentIdentity.value, channel: newStudentChannel.value
          })
        })
        if (!res.ok) throw new Error('add student failed')
        const saved = await res.json()
        students.value.push(saved?.id ? { ...newStudent, ...saved } : newStudent)
      } catch {
        showToast('新增學員失敗，請稍後再試')
        return
      }
    }
    newStudentName.value = ''
    newStudentEmail.value = ''
    showAddStudent.value = false
  }

  // ════════════════════════════════════════════════════
  // 統計
  // ════════════════════════════════════════════════════
  const attendanceRate = (student) => {
    if (!sessions.value.length) return 0
    const presentCount = sessions.value.filter(s => student.attendance[s.id] === 'present').length
    return presentCount / sessions.value.length
  }
  const formatRate = (rate) => `${Math.round(rate * 100)}%`

  const summary = computed(() => {
    const total = students.value.length
    const avgRate = total ? students.value.reduce((sum, s) => sum + attendanceRate(s), 0) / total : 0
    const continuingCount = students.value.filter(s => s.continuing === 'yes').length
    const notContinuingCount = students.value.filter(s => s.continuing === 'no').length
    return { total, avgRate, continuingCount, notContinuingCount }
  })

  // ════════════════════════════════════════════════════
  // 小提示訊息
  // ════════════════════════════════════════════════════
  const toast = ref('')
  let toastTimer = null
  const showToast = (msg) => {
    toast.value = msg
    clearTimeout(toastTimer)
    toastTimer = setTimeout(() => { toast.value = '' }, 3000)
  }

  onMounted(fetchData)

  // ════════════════════════════════════════════════════
  // 簽到頁面連結 — 獨立頁面，可從這裡開啟或複製連結給現場工作人員
  // ════════════════════════════════════════════════════
  const checkinUrl = computed(() => {
    if (typeof window === 'undefined') return ''
    return `${window.location.origin}/front/coursee/${courseId}/checkin`
  })

  const copyCheckinUrl = async () => {
    try {
      await navigator.clipboard.writeText(checkinUrl.value)
      showToast('已複製簽到連結')
    } catch {
      showToast('複製失敗，請手動選取連結')
    }
  }
</script>

<template>
  <div class="att-wrap">
    <div class="att-header">
      <div>
        <p class="att-eyebrow">學員名單／出席簽到</p>
        <h1 class="att-title">{{ courseTitle || '課程出席表' }}</h1>
      </div>
      <label class="att-testmode">
        <input type="checkbox" v-model="testMode" @change="fetchData">
        <span>測試模式（尚未接後端時使用假資料）</span>
      </label>
    </div>

    <div v-if="loading" class="att-state">載入中…</div>
    <div v-else-if="loadError" class="att-state att-state--error">{{ loadError }}</div>

    <template v-else>
      <!-- 統計摘要 -->
      <div class="att-summary">
        <div class="att-summary__card">
          <p class="att-summary__num">{{ summary.total }}</p>
          <p class="att-summary__label">學員人數</p>
        </div>
        <div class="att-summary__card">
          <p class="att-summary__num">{{ formatRate(summary.avgRate) }}</p>
          <p class="att-summary__label">平均出席率</p>
        </div>
        <div class="att-summary__card att-summary__card--good">
          <p class="att-summary__num">{{ summary.continuingCount }}</p>
          <p class="att-summary__label">續課中</p>
        </div>
        <div class="att-summary__card att-summary__card--bad">
          <p class="att-summary__num">{{ summary.notContinuingCount }}</p>
          <p class="att-summary__label">未續約</p>
        </div>
      </div>

      <!-- 動作列 -->
      <div class="att-actions">
        <button class="att-btn" @click="showAddStudent = true">＋ 新增學員</button>
        <button class="att-btn att-btn--ghost" @click="showAddSession = true">＋ 新增場次</button>
        <span class="att-actions__spacer"></span>
        <a :href="checkinUrl" target="_blank" rel="noopener noreferrer" class="att-btn att-btn--ghost">📷 開啟簽到頁面</a>
        <button class="att-btn att-btn--ghost" @click="copyCheckinUrl">🔗 複製簽到連結</button>
      </div>

      <!-- 出席表 -->
      <div class="att-table-wrap">
        <table class="att-table">
          <thead>
          <tr>
            <th class="att-col-sticky">學員</th>
            <th>報名地點</th>
            <th>身份</th>
            <th>客戶來源</th>
            <th>續約狀態</th>
            <th v-for="s in sessions" :key="s.id" class="att-col-session">
              {{ s.label }}<br><span class="att-col-session__date">{{ s.date?.slice(5) }}</span>
            </th>
            <th>出席率</th>
          </tr>
          </thead>
          <tbody>
          <tr v-for="student in students" :key="student.id">
            <td class="att-col-sticky att-col-sticky--name">
              {{ student.name }}
              <div v-if="student.email" class="att-col-sticky__email">{{ student.email }}</div>
            </td>
            <td>
              <select class="att-select" :value="student.location" @change="updateStudentField(student, 'location', $event.target.value)">
                <option v-for="opt in SOURCE_OPTIONS" :key="opt" :value="opt">{{ opt }}</option>
              </select>
            </td>
            <td>
              <select class="att-select" :value="student.identity" @change="updateStudentField(student, 'identity', $event.target.value)">
                <option v-for="opt in IDENTITY_OPTIONS" :key="opt" :value="opt">{{ opt }}</option>
              </select>
            </td>
            <td>
              <select class="att-select" :value="student.channel" @change="updateStudentField(student, 'channel', $event.target.value)">
                <option v-for="opt in CHANNEL_OPTIONS" :key="opt" :value="opt">{{ opt }}</option>
              </select>
            </td>
            <td>
              <select class="att-select" :value="student.continuing" @change="updateStudentField(student, 'continuing', $event.target.value)">
                <option v-for="opt in CONTINUING_OPTIONS" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
              </select>
            </td>
            <td v-for="s in sessions" :key="s.id" class="att-col-session">
              <button
                class="att-cell"
                :class="STATUS_CLASS[student.attendance[s.id]] || ''"
                @click="cycleAttendance(student, s.id)"
              >{{ STATUS_LABEL[student.attendance[s.id]] || '' }}</button>
            </td>
            <td class="att-rate">{{ formatRate(attendanceRate(student)) }}</td>
          </tr>
          <tr v-if="!students.length">
            <td :colspan="5 + sessions.length + 1" class="att-empty">尚無學員，請先新增</td>
          </tr>
          </tbody>
        </table>
      </div>
      <p class="att-hint">點擊格子可切換出席狀態：●出席 → ✕缺席 → 假請假 → 空白未記錄</p>
    </template>

    <!-- 新增場次 Modal -->
    <Teleport to="body">
      <div v-if="showAddSession" class="att-modal-overlay" @click.self="showAddSession = false">
        <div class="att-modal">
          <h3 class="att-modal__title">新增場次</h3>
          <label class="att-modal__label">日期</label>
          <input v-model="newSessionDate" type="date" class="att-modal__input">
          <label class="att-modal__label">場次代號（選填，預設 GP{{ sessions.length + 1 }}）</label>
          <input v-model="newSessionLabel" type="text" placeholder="GP5" class="att-modal__input">
          <div class="att-modal__actions">
            <button class="att-btn att-btn--ghost" @click="showAddSession = false">取消</button>
            <button class="att-btn" @click="addSession">新增</button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- 新增學員 Modal -->
    <Teleport to="body">
      <div v-if="showAddStudent" class="att-modal-overlay" @click.self="showAddStudent = false">
        <div class="att-modal">
          <h3 class="att-modal__title">新增學員</h3>
          <label class="att-modal__label">姓名</label>
          <input v-model="newStudentName" type="text" placeholder="學員姓名" class="att-modal__input">
          <label class="att-modal__label">Email（選填，用於簽到頁面比對個人 QRCode）</label>
          <input v-model="newStudentEmail" type="email" placeholder="example@gmail.com" class="att-modal__input">
          <label class="att-modal__label">報名地點</label>
          <select v-model="newStudentLocation" class="att-modal__input">
            <option v-for="opt in SOURCE_OPTIONS" :key="opt" :value="opt">{{ opt }}</option>
          </select>
          <label class="att-modal__label">身份</label>
          <select v-model="newStudentIdentity" class="att-modal__input">
            <option v-for="opt in IDENTITY_OPTIONS" :key="opt" :value="opt">{{ opt }}</option>
          </select>
          <label class="att-modal__label">客戶來源</label>
          <select v-model="newStudentChannel" class="att-modal__input">
            <option v-for="opt in CHANNEL_OPTIONS" :key="opt" :value="opt">{{ opt }}</option>
          </select>
          <div class="att-modal__actions">
            <button class="att-btn att-btn--ghost" @click="showAddStudent = false">取消</button>
            <button class="att-btn" @click="addStudent">新增</button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Toast -->
    <Transition name="att-toast-fade">
      <div v-if="toast" class="att-toast">{{ toast }}</div>
    </Transition>
  </div>
</template>

<style scoped>
  .att-wrap {
    max-width: 1100px;
    margin: 0 auto;
    padding: 20px 16px 60px;
    font-family: 'Noto Sans TC', sans-serif;
  }

  .att-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 10px;
    margin-bottom: 18px;
  }
  .att-eyebrow { font-size: 12px; color: #7a8f81; margin: 0 0 2px; }
  .att-title { font-size: 20px; font-weight: 700; color: #1a3d28; margin: 0; }

  .att-testmode {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 12px;
    color: #b06a00;
    background: #fff8ea;
    border: 1px solid #f3e0b0;
    border-radius: 8px;
    padding: 6px 10px;
    cursor: pointer;
    user-select: none;
  }
  .att-testmode input { accent-color: #1FC29C; }

  .att-state { text-align: center; padding: 40px 0; color: #7a8f81; font-size: 14px; }
  .att-state--error { color: #d9534f; }

  /* 統計摘要 */
  .att-summary { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 16px; }
  .att-summary__card { background: #fff; border: 1px solid #dce8d8; border-radius: 12px; padding: 12px; text-align: center; }
  .att-summary__card--good { border-color: #b7ecdd; background: #f0fdf9; }
  .att-summary__card--bad { border-color: #f5c2be; background: #fff2f1; }
  .att-summary__num { font-size: 20px; font-weight: 700; color: #1a3d28; margin: 0; }
  .att-summary__label { font-size: 11px; color: #7a8f81; margin: 2px 0 0; }

  /* 動作列 */
  .att-actions { display: flex; align-items: center; gap: 8px; margin-bottom: 14px; flex-wrap: wrap; }
  .att-actions__spacer { flex: 1; }
  .att-btn {
    padding: 8px 16px; border-radius: 8px; border: none;
    background: #1FC29C; color: #fff; font-weight: 700; font-size: 13px; cursor: pointer;
  }
  .att-btn--ghost { background: #fff; color: #1a7a52; border: 1px solid #b7ecdd; }

  /* 表格 */
  .att-table-wrap { overflow-x: auto; border: 1px solid #dce8d8; border-radius: 12px; background: #fff; }
  .att-table { border-collapse: collapse; width: 100%; font-size: 13px; white-space: nowrap; }
  .att-table th, .att-table td { padding: 8px 10px; border-bottom: 1px solid #f0f5f1; text-align: center; }
  .att-table thead th { background: #f5faf7; color: #4a5f52; font-weight: 700; font-size: 12px; }
  .att-col-sticky { position: sticky; left: 0; background: #fff; text-align: left; z-index: 1; }
  thead .att-col-sticky { background: #f5faf7; z-index: 2; }
  .att-col-sticky--name { font-weight: 600; color: #1a3d28; }
  .att-col-sticky__email { font-weight: 400; font-size: 11px; color: #9aa89f; }
  a.att-btn, a.att-btn--ghost { display: inline-block; text-decoration: none; box-sizing: border-box; }
  .att-col-session { min-width: 56px; }
  .att-col-session__date { font-size: 10px; color: #9aa89f; font-weight: 400; }

  .att-select {
    font-size: 12px; padding: 4px 6px; border-radius: 6px; border: 1px solid #dce8d8;
    font-family: inherit; background: #fff; color: #333;
  }

  .att-cell {
    width: 34px; height: 34px; border-radius: 8px; border: 1px solid #e5e5e5;
    background: #fafafa; color: #999; font-size: 14px; font-weight: 700; cursor: pointer;
  }
  .att--present { background: #e6f7f1; border-color: #1FC29C; color: #1a7a52; }
  .att--absent { background: #fdeceb; border-color: #e57c76; color: #c0392b; }
  .att--leave { background: #fff6e0; border-color: #f0c14b; color: #a8760c; }

  .att-rate { font-weight: 700; color: #1a3d28; }
  .att-empty { padding: 30px 0 !important; color: #9aa89f; }

  .att-hint { font-size: 12px; color: #9aa89f; margin: 10px 2px 0; }

  /* Modal */
  .att-modal-overlay {
    position: fixed; inset: 0; background: rgba(0,0,0,0.45);
    display: flex; align-items: center; justify-content: center; z-index: 5000; padding: 16px;
  }
  .att-modal { background: #fff; border-radius: 16px; padding: 22px; width: min(320px, 100%); }
  .att-modal__title { font-size: 16px; font-weight: 700; color: #1a3d28; margin: 0 0 14px; }
  .att-modal__label { display: block; font-size: 12px; color: #4a5f52; margin: 10px 0 4px; }
  .att-modal__input {
    width: 100%; padding: 8px 10px; border-radius: 8px; border: 1px solid #dce8d8;
    font-size: 14px; font-family: inherit; box-sizing: border-box;
  }
  .att-modal__actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 18px; }

  /* Toast */
  .att-toast {
    position: fixed; bottom: 24px; left: 50%; transform: translateX(-50%);
    background: #333; color: #fff; font-size: 13px; padding: 10px 18px;
    border-radius: 999px; z-index: 6000;
  }
  .att-toast-fade-enter-active, .att-toast-fade-leave-active { transition: opacity 0.2s ease; }
  .att-toast-fade-enter-from, .att-toast-fade-leave-to { opacity: 0; }
</style>
