<script setup lang="ts">
  const props = defineProps<{
    isEdit?: boolean
    calendarId?: string
    initialDate?: string
  }>()

  const { loading, fetchForm, fetchPlaces, submitAdd, submitEdit } = useInternalSystemCalendar()
  const router = useRouter()
  const route = useRoute()

  const formData = ref<any>(null)
  const dynamicPlaces = ref<any[]>([])
  const submitting = ref(false)
  const submitError = ref('')
  const submitSuccess = ref('')
  const emailSearch = ref('')
  const placeSearch = ref('')
  const unitSearch = ref('')
  const undertakerSearch = ref('')

  // localStorage key
  const MEMORY_KEY = 'calendar_form_memory'

  function saveMemory() {
    if (!import.meta.client) return
    const memory = {
      area: form.area,
      use: form.use,
      place: form.place,
      undertake_unit: form.undertake_unit,
      undertaker: form.undertaker,
      emails: form['e_mail[]'] as string[],
    }
    localStorage.setItem(MEMORY_KEY, JSON.stringify(memory))
  }

  function loadMemory() {
    if (!import.meta.client) return
    try {
      const raw = localStorage.getItem(MEMORY_KEY)
      if (!raw) return
      return JSON.parse(raw) as Record<string, any>
    } catch { return undefined }
  }

  const filteredEmailList = computed(() => {
    if (!formData.value?.emailList) return []
    const q = emailSearch.value.trim().toLowerCase()
    if (!q) return formData.value.emailList
    return formData.value.emailList.filter((p: any) =>
            p.name.toLowerCase().includes(q) || p.email.toLowerCase().includes(q)
    )
  })

  const filteredPlaces = computed(() => {
    const q = placeSearch.value.trim().toLowerCase()
    if (!q) return dynamicPlaces.value
    return dynamicPlaces.value.filter((p: any) =>
            p.ps_location?.toLowerCase().includes(q) || p.ps_number?.toLowerCase().includes(q)
    )
  })

  const filteredUnits = computed(() => {
    if (!formData.value?.units) return []
    const q = unitSearch.value.trim().toLowerCase()
    if (!q) return formData.value.units
    return formData.value.units.filter((u: any) => u.label.toLowerCase().includes(q))
  })

  const filteredUndertakers = computed(() => {
    if (!formData.value?.undertakers) return []
    const q = undertakerSearch.value.trim().toLowerCase()
    if (!q) return formData.value.undertakers
    return formData.value.undertakers.filter((u: any) =>
            u.label.toLowerCase().includes(q) || u.value.toLowerCase().includes(q)
    )
  })

  const classifications = ['課程', '活動', '工程', '會議', '其他']
  const hours = ['07','08','09','10','11','12','13','14','15','16','17','18','19','20','21']
  const minutes = ['00','05','10','15','20','25','30','35','40','45','50','55','60']

  const form = reactive<Record<string, any>>({
    'e_mail[]': [],
    mail_notice_date: '0000-00-00',
    classification: '課程',
    action: '',
    publish_start: '',
    publish_end: '',
    start_h: '08', start_m: '00',
    end_h: '08', end_m: '00',
    start_time: '08:00', end_time: '08:00',
    dean: '0',
    area: '', use: '1', place: '',
    undertake_unit: '', undertaker: '', lecturer: '',
    subject: '', note: '',
    publish_name: '', publish_employee_id: '',
    calendar_id: props.calendarId ?? '',
  })

  onMounted(async () => {
    const applyData = (data: any) => {
      if (!data) return
      formData.value = data

      // 套入預填值
      Object.entries(data.prefill).forEach(([k, v]) => {
        // 空字串不覆蓋，避免把 start_m='00' 這類預設值蓋掉
        if (v !== '' && v !== null && v !== undefined) form[k] = v
      })

      // edit 模式：若 area/place 沒從 prefill 取到，從 URL query 補（detail 頁帶過來）
      if (props.isEdit) {
        if (!form.area && !form.place) {
          const placeFromQuery = String(route.query.place ?? '')
          if (placeFromQuery) {
            // place value 格式 "P0F20101 森林好食光"，前兩碼為 area
            form.place = placeFromQuery
            const areaCode = placeFromQuery.substring(0, 2)
            const matchedArea = data.areas?.find((a: any) => a.value === areaCode)
            if (matchedArea) form.area = matchedArea.value
          }
        }
      }

      // 預設選中的 email
      form['e_mail[]'] = data.emailList
              .filter((e: any) => e.checked)
              .map((e: any) => e.email)

      // 預選承辦人
      const selectedUndertaker = data.undertakers.find((u: any) => u.selected)
      if (selectedUndertaker) form.undertaker = selectedUndertaker.value

      // 新增模式：套用上次記憶的值
      if (!props.isEdit) {
        const memory = loadMemory()
        if (memory) {
          if (memory.undertake_unit) form.undertake_unit = memory.undertake_unit
          if (memory.undertaker) form.undertaker = memory.undertaker
          if (memory.area) form.area = memory.area
          if (memory.use) form.use = memory.use
          // 郵件：只保留在清單中仍存在的 email（避免人員異動問題）
          if (Array.isArray(memory.emails) && memory.emails.length > 0) {
            const validEmails = new Set(data.emailList.map((e: any) => e.email))
            form['e_mail[]'] = memory.emails.filter((email: string) => validEmails.has(email))
          }
        }
      }
    }

    const data = await fetchForm(
            props.isEdit ? 'edit' : 'add',
            props.isEdit ? { id: props.calendarId } : { date: props.initialDate },
            (fresh) => applyData(fresh)  // SWR 背景更新時也套入
    )
    applyData(data)

    // 設定預選 area 後載入地點
    if (form.area) {
      await onAreaChange()
      if (props.isEdit) {
        // PHP edit 頁面的 use radio 不帶 checked，導致 use 可能不正確
        // 若 form.place 在目前 dynamicPlaces 裡找不到，嘗試其他 use 值
        const placeInList = () => dynamicPlaces.value.some(
                (p: any) => `${p.ps_number} ${p.ps_location}` === form.place
        )
        if (form.place && !placeInList()) {
          for (const useVal of ['1', '2', '3']) {
            if (useVal === (form.use || '1')) continue
            const places = await fetchPlaces(form.area, useVal)
            dynamicPlaces.value = Array.isArray(places) ? places : []
            if (placeInList()) {
              form.use = useVal
              break
            }
          }
        }
        // 仍找不到：從 formData.places（靜態解析）補救
        if (!form.place || !placeInList()) {
          const selectedPlace = formData.value?.places?.find((p: any) => p.selected)
          if (selectedPlace) form.place = selectedPlace.value
        }
      } else {
        const memory = loadMemory()
        if (memory?.place) form.place = memory.place
      }
    }
  })

  const onAreaChange = async (e?: Event) => {
    // 如果是 select 的 change 事件，直接從 event.target 取值確保是最新的
    if (e && (e.target as HTMLElement).tagName === 'SELECT') {
      form.area = (e.target as HTMLSelectElement).value
    }
    if (!form.area) { dynamicPlaces.value = []; return }
    const places = await fetchPlaces(form.area, form.use || '1')
    dynamicPlaces.value = Array.isArray(places) ? places : []
  }

  const toggleAllEmail = (e: Event) => {
    const checked = (e.target as HTMLInputElement).checked
    if (checked) {
      form['e_mail[]'] = formData.value.emailList.map((p: any) => p.email)
    } else {
      form['e_mail[]'] = []
    }
  }

  const handleSubmit = async () => {
    submitting.value = true
    submitError.value = ''
    submitSuccess.value = ''

    let res: any
    if (props.isEdit) {
      res = await submitEdit(form)
    } else {
      res = await submitAdd(form)
    }

    if (res?.success) {
      // 儲存這次填的值供下次新增使用
      if (!props.isEdit) saveMemory()
      submitSuccess.value = res.message
      setTimeout(() => {
        // 跳回活動所在的年月，不是當月
        if (form.publish_start) {
          const [y, m] = form.publish_start.split('-')
          router.push(`/staff/content/internal-system/calendar?y=${y}&m=${parseInt(m)}`)
        } else {
          router.push('/staff/content/internal-system/calendar')
        }
      }, 1500)
    } else {
      submitError.value = res?.message ?? '操作失敗'
    }
    submitting.value = false
  }
</script>

<template>
  <div class="form-page">
    <div class="form-header">
      <button class="back-btn" @click="$router.back()">&#8592; 回上頁</button>
      <h2>{{ isEdit ? `行事曆修改/刪除` : '行事曆新增' }}</h2>
    </div>

    <div v-if="loading" class="loading">載入中...</div>
    <div v-else-if="!formData" class="error-banner">載入表單失敗</div>

    <form v-else @submit.prevent="handleSubmit">
      <!-- 郵件通知 -->
      <section class="form-section">
        <div class="section-label">郵件通知</div>
        <div class="email-controls">
          <label>
            <input type="checkbox" @change="toggleAllEmail" /> 全選/全不選
          </label>
          <input
              v-model="emailSearch"
              type="text"
              class="email-search"
              placeholder="搜尋姓名或 Email..."
              @input="emailSearch = ($event.target as HTMLInputElement).value"
          />
          <span class="email-count">
            {{ filteredEmailList.length }} / {{ formData.emailList.length }} 人
          </span>
        </div>
        <div class="email-grid">
          <label
              v-for="person in filteredEmailList"
              :key="person.email"
              class="email-item"
          >
            <input
                type="checkbox"
                :value="person.email"
                v-model="form['e_mail[]']"
            />
            {{ person.name }}
          </label>
        </div>
      </section>

      <!-- 郵寄通知日期 -->
      <div class="form-row">
        <div class="form-col">
          <label>預約郵寄通知日期</label>
          <input type="date" v-model="form.mail_notice_date" />
        </div>
        <div class="form-col">
          <label>類別</label>
          <div class="radio-group">
            <label v-for="c in classifications" :key="c">
              <input type="radio" :value="c" v-model="form.classification" /> {{ c }}
            </label>
          </div>
        </div>
      </div>

      <!-- 編輯模式：修改/刪除選項 -->
      <div v-if="isEdit" class="form-row">
        <div class="form-col full">
          <label>請選擇修改或刪除</label>
          <select v-model="form.action">
            <option value="M">異動</option>
            <option value="D">刪除</option>
            <option value="">無異動通知(郵寄)</option>
            <option value="異動">異動通知(郵寄)</option>
            <option value="取消">取消通知(郵寄)</option>
          </select>
        </div>
      </div>

      <!-- 申請人 -->
      <div v-if="!isEdit" class="form-row info-row">
        <div class="form-col">
          <label>申請人姓名</label>
          <span>{{ form.publish_name }}</span>
        </div>
        <div class="form-col">
          <label>員工編號</label>
          <span>{{ form.publish_employee_id }}</span>
        </div>
      </div>
      <div v-else class="form-row info-row">
        <div class="form-col">
          <label>發佈人</label>
          <span>{{ formData.prefill.publisher }}</span>
        </div>
      </div>

      <!-- 日期時間 -->
      <div class="form-row">
        <div class="form-col">
          <label>開始日期</label>
          <input type="date" v-model="form.publish_start" required />
        </div>
        <div class="form-col">
          <label>開始時間</label>
          <div v-if="isEdit" class="time-input">
            <input type="time" v-model="form.start_time" />
          </div>
          <div v-else class="time-select">
            <select v-model="form.start_h">
              <option v-for="h in hours" :key="h" :value="h">{{ h }}</option>
            </select> 點
            <select v-model="form.start_m">
              <option v-for="m in minutes" :key="m" :value="m">{{ m }}</option>
            </select> 分
          </div>
        </div>
      </div>

      <div class="form-row">
        <div class="form-col">
          <label>結束日期</label>
          <input type="date" v-model="form.publish_end" required />
        </div>
        <div class="form-col">
          <label>結束時間</label>
          <div v-if="isEdit" class="time-input">
            <input type="time" v-model="form.end_time" />
          </div>
          <div v-else class="time-select">
            <select v-model="form.end_h">
              <option v-for="h in hours" :key="h" :value="h">{{ h }}</option>
            </select> 點
            <select v-model="form.end_m">
              <option v-for="m in minutes" :key="m" :value="m">{{ m }}</option>
            </select> 分
          </div>
        </div>
      </div>

      <!-- 院長與會 -->
      <div class="form-row">
        <div class="form-col full">
          <label>院長是否與會</label>
          <div class="radio-group">
            <label><input type="radio" value="0" v-model="form.dean" /> 否</label>
            <label><input type="radio" value="1" v-model="form.dean" /> 是</label>
          </div>
        </div>
      </div>

      <!-- 地點 -->
      <div class="form-row">
        <div class="form-col">
          <label>地點（單位）</label>
          <select v-model="form.area" @change="onAreaChange($event)">
            <option value="">選擇單位</option>
            <option v-for="a in formData.areas" :key="a.value" :value="a.value">
              {{ a.label }}
            </option>
          </select>
        </div>
        <div class="form-col">
          <label>用途</label>
          <div class="radio-group">
            <label><input type="radio" value="1" v-model="form.use" @change="onAreaChange" /> 教室</label>
            <label><input type="radio" value="2" v-model="form.use" @change="onAreaChange" /> 活動</label>
            <label><input type="radio" value="3" v-model="form.use" @change="onAreaChange" /> 會議</label>
          </div>
        </div>
        <div class="form-col">
          <label>位置</label>
          <input v-model="placeSearch" type="text" class="search-input" placeholder="搜尋地點..." />
          <select v-model="form.place">
            <option value="">請選擇地點</option>
            <option v-for="p in filteredPlaces" :key="p.ps_number" :value="`${p.ps_number} ${p.ps_location}`">
              {{ p.ps_location }}
            </option>
          </select>
        </div>
      </div>

      <!-- 承辦 -->
      <div class="form-row">
        <div class="form-col">
          <label>承辦單位</label>
          <input v-model="unitSearch" type="text" class="search-input" placeholder="搜尋承辦單位..." />
          <select v-model="form.undertake_unit">
            <option value="">請選擇承辦單位</option>
            <option v-for="u in filteredUnits" :key="u.value" :value="u.value">{{ u.label }}</option>
          </select>
        </div>
        <div class="form-col">
          <label>承辦人員</label>
          <input v-model="undertakerSearch" type="text" class="search-input" placeholder="搜尋承辦人..." />
          <select v-model="form.undertaker">
            <option value="">請選擇承辦人</option>
            <option v-for="u in filteredUndertakers" :key="u.value" :value="u.value">{{ u.label }}</option>
          </select>
        </div>
        <div class="form-col">
          <label>講師</label>
          <input type="text" v-model="form.lecturer" />
        </div>
      </div>

      <!-- 主題/備註 -->
      <div class="form-row">
        <div class="form-col full">
          <label>主題</label>
          <textarea v-model="form.subject" rows="4" />
        </div>
      </div>
      <div class="form-row">
        <div class="form-col full">
          <label>備註</label>
          <textarea v-model="form.note" rows="4" />
        </div>
      </div>

      <!-- 送出 -->
      <div v-if="submitError" class="error-banner">{{ submitError }}</div>
      <div v-if="submitSuccess" class="success-banner">{{ submitSuccess }}</div>

      <div class="form-actions">
        <button type="submit" :disabled="submitting" class="btn-primary">
          {{ submitting ? '送出中...' : '送出' }}
        </button>
        <button type="button" class="btn-secondary" @click="$router.back()">取消</button>
      </div>
    </form>
  </div>
</template>



<style scoped>
.form-page {
  max-width: 1000px;
  margin: 0 auto;
  padding: 20px;
}

.form-header {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 24px;
}

.back-btn {
  padding: 8px 14px;
  border: 1px solid var(--border);
  border-radius: 6px;
  background: var(--surface);
  color: var(--text);
  cursor: pointer;
}

h2 { margin: 0; font-size: 20px; }

.loading, .error-banner {
  text-align: center;
  padding: 30px;
  color: var(--text-hint);
}
.error-banner { color: #e53e3e; }
.success-banner {
  padding: 10px 16px;
  background: #f0fff4;
  border: 1px solid #68d391;
  border-radius: 6px;
  color: #276749;
  margin-bottom: 12px;
}

.form-section {
  border: 1px solid var(--border-light);
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 20px;
}

.section-label {
  font-weight: bold;
  margin-bottom: 10px;
  color: #cc3366;
}

.email-controls {
  margin-bottom: 8px;
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.email-search {
  padding: 4px 10px;
  border: 1px solid var(--border);
  border-radius: 6px;
  font-size: 13px;
  width: 220px;
  background: var(--surface);
  color: var(--text);
}
.email-search:focus {
  outline: none;
  border-color: var(--accent);
}

.search-input {
  padding: 5px 10px;
  border: 1px solid var(--border);
  border-radius: 6px;
  font-size: 13px;
  width: 100%;
  box-sizing: border-box;
  margin-bottom: 4px;
  background: var(--surface);
  color: var(--text);
}
.search-input:focus {
  outline: none;
  border-color: var(--accent);
}

.email-count {
  font-size: 12px;
  color: var(--text-hint);
}

.email-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 4px;
  max-height: 200px;
  overflow-y: auto;
  padding: 4px;
}

.email-item {
  font-size: 12px;
  display: flex;
  align-items: center;
  gap: 4px;
  cursor: pointer;
}

.form-row {
  display: flex;
  gap: 16px;
  margin-bottom: 16px;
  flex-wrap: wrap;
}

.form-col {
  flex: 1;
  min-width: 200px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.form-col.full { flex-basis: 100%; }

.form-col label {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-muted);
}

.form-col input[type="text"],
.form-col input[type="date"],
.form-col input[type="time"],
.form-col select,
.form-col textarea {
  padding: 8px 10px;
  border: 1px solid var(--border);
  border-radius: 6px;
  font-size: 14px;
  width: 100%;
  box-sizing: border-box;
  background: var(--surface);
  color: var(--text);
}

.form-col textarea { resize: vertical; }

.info-row .form-col span {
  padding: 8px 0;
  font-size: 14px;
  color: var(--text);
}

.radio-group {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  padding: 8px 0;
}

.radio-group label {
  display: flex;
  align-items: center;
  gap: 4px;
  font-weight: normal !important;
  cursor: pointer;
}

.time-select {
  display: flex;
  align-items: center;
  gap: 6px;
}

.time-select select { flex: 1; }

.form-actions {
  display: flex;
  gap: 12px;
  margin-top: 24px;
  padding-top: 16px;
  border-top: 1px solid var(--border-light);
}

.btn-primary {
  padding: 10px 28px;
  background: var(--accent);
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 15px;
  cursor: pointer;
}
.btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }
.btn-primary:hover:not(:disabled) { background: #5a67d8; }

.btn-secondary {
  padding: 10px 28px;
  border: 1px solid var(--border);
  border-radius: 6px;
  background: var(--surface);
  color: var(--text);
  font-size: 15px;
  cursor: pointer;
}
</style>