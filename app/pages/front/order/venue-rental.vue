<template>
  <div class="min-h-full bg-surface2 transition-colors">

    <!-- Header -->
    <header class="bg-surface border-b border-light-c px-4 py-3 sticky top-0 z-20">
      <div class="max-w-2xl mx-auto flex items-center gap-2">
        <div class="w-8 h-8 rounded-lg bg-green-700 flex items-center justify-center text-white flex-shrink-0" style="font-size:14px">🏛️</div>
        <div>
          <h1 class="font-bold text-base-c leading-none" style="font-size:15px">場地租借</h1>
          <p class="text-hint-c mt-0.5" style="font-size:11px">聖母健康農莊・台東</p>
        </div>
      </div>
    </header>

    <div class="max-w-2xl mx-auto px-3 sm:px-4 py-4">

      <!-- 場地租借需求表單 -->
      <div class="bg-surface rounded-2xl border border-light-c shadow-sm p-4 mb-6">
        <h2 class="font-bold text-base-c mb-3" style="font-size:15px">場地租借需求</h2>

        <div v-if="justSubmittedId" class="bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-lg px-3 py-2 mb-3 flex items-center justify-between gap-2" style="font-size:12.5px">
          <span>租借需求已送出，訂單編號 {{ justSubmittedId }}，我們會盡快與您確認。</span>
          <button class="flex-shrink-0 opacity-60 hover:opacity-100" @click="justSubmittedId = ''">✕</button>
        </div>

        <div class="grid grid-cols-2 gap-3 mb-3">
          <div>
            <label class="block text-hint-c mb-1" style="font-size:12px">開始日期</label>
            <input v-model="form.startDate" type="date" :min="today"
                   class="w-full border border-light-c rounded-lg px-3 py-2 bg-surface2 text-base-c" style="font-size:13px">
          </div>
          <div>
            <label class="block text-hint-c mb-1" style="font-size:12px">開始時間</label>
            <input v-model="form.startTime" type="time"
                   class="w-full border border-light-c rounded-lg px-3 py-2 bg-surface2 text-base-c" style="font-size:13px">
          </div>
        </div>

        <div class="grid grid-cols-2 gap-3 mb-3">
          <div>
            <label class="block text-hint-c mb-1" style="font-size:12px">結束日期</label>
            <input v-model="form.endDate" type="date" :min="form.startDate || today"
                   class="w-full border border-light-c rounded-lg px-3 py-2 bg-surface2 text-base-c" style="font-size:13px">
          </div>
          <div>
            <label class="block text-hint-c mb-1" style="font-size:12px">結束時間</label>
            <input v-model="form.endTime" type="time"
                   class="w-full border border-light-c rounded-lg px-3 py-2 bg-surface2 text-base-c" style="font-size:13px">
          </div>
        </div>

        <div class="mb-3">
          <label class="block text-hint-c mb-1" style="font-size:12px">使用人數</label>
          <input v-model.number="form.guests" type="number" min="1"
                 class="w-full border border-light-c rounded-lg px-3 py-2 bg-surface2 text-base-c" style="font-size:13px">
        </div>

        <div class="grid grid-cols-2 gap-3 mb-3">
          <div>
            <label class="block text-hint-c mb-1" style="font-size:12px">姓名</label>
            <input v-model="form.name" type="text" placeholder="請輸入姓名"
                   class="w-full border border-light-c rounded-lg px-3 py-2 bg-surface2 text-base-c" style="font-size:13px">
          </div>
          <div>
            <label class="block text-hint-c mb-1" style="font-size:12px">聯絡電話</label>
            <input v-model="form.phone" type="text" placeholder="09xx-xxx-xxx"
                   class="w-full border border-light-c rounded-lg px-3 py-2 bg-surface2 text-base-c" style="font-size:13px">
          </div>
        </div>

        <div class="mb-3">
          <label class="block text-hint-c mb-1" style="font-size:12px">Email（選填）</label>
          <input v-model="form.email" type="email"
                 class="w-full border border-light-c rounded-lg px-3 py-2 bg-surface2 text-base-c" style="font-size:13px">
        </div>

        <div class="mb-3">
          <label class="block text-hint-c mb-1" style="font-size:12px">偏好場地（選填）</label>
          <select v-model="form.venuePref"
                  class="w-full border border-light-c rounded-lg px-3 py-2 bg-surface2 text-base-c" style="font-size:13px">
            <option value="all">不指定，交由安排</option>
            <option v-for="v in activeVenues" :key="v.id" :value="v.id">{{ v.name }}</option>
          </select>
        </div>

        <div class="mb-4">
          <label class="block text-hint-c mb-1" style="font-size:12px">備註</label>
          <textarea v-model="form.notes" rows="2" placeholder="活動內容、需要的設備等"
                    class="w-full border border-light-c rounded-lg px-3 py-2 bg-surface2 text-base-c" style="font-size:13px"></textarea>
        </div>

        <p v-if="formError" class="text-red-500 mb-2" style="font-size:12px">{{ formError }}</p>

        <button
          class="w-full py-2.5 rounded-lg bg-green-700 text-white font-semibold disabled:opacity-50"
          style="font-size:14px" :disabled="submitting" @click="submitRequest"
        >
          {{ submitting ? '送出中...' : '送出租借需求' }}
        </button>
        <p class="text-hint-c text-center mt-2" style="font-size:11px">
          送出後即建立「待安排」訂單，我們會依場地空檔為您安排並盡快與您確認
        </p>
      </div>

      <!-- 場地目錄 -->
      <div class="mb-6">
        <h2 class="font-bold text-base-c mb-3" style="font-size:15px">場地目錄</h2>

        <div class="filter-row mb-3">
          <button v-for="f in filters" :key="f.value" class="filter-pill"
                  :class="activeFilter === f.value ? 'filter-pill-active' : ''"
                  @click="activeFilter = f.value">{{ f.label }}</button>
        </div>

        <div class="venue-grid">
          <div v-for="v in filteredVenues" :key="v.id" class="bg-surface border border-light-c rounded-2xl overflow-hidden shadow-sm flex flex-col">
            <div class="venue-photo flex items-center justify-center text-white relative">
              <span style="font-size:34px;opacity:.9">{{ venueIcon(v) }}</span>
              <span class="venue-price-badge">NT$ {{ formatPrice(v.price) }}<span class="opacity-75"> /時段</span></span>
            </div>
            <div class="p-3 flex-1 flex flex-col gap-1.5">
              <div class="flex items-baseline justify-between gap-2">
                <span class="font-semibold text-base-c" style="font-size:13.5px">{{ v.name }}</span>
                <span v-if="v.location" class="text-hint-c flex-shrink-0" style="font-size:11px">{{ v.location }}</span>
              </div>
              <p v-if="v.capacity" class="text-hint-c" style="font-size:11.5px">容納 {{ v.capacity }} 人</p>
              <p v-if="v.activities" class="text-hint-c line-clamp-2" style="font-size:11.5px">{{ v.activities }}</p>
              <div v-if="v.equipment.length" class="flex flex-wrap gap-1 mt-0.5">
                <span v-for="eq in v.equipment" :key="eq" class="eq-tag">{{ eq }}</span>
              </div>
              <button class="mt-auto pt-2 w-full py-1.5 rounded-lg bg-green-700 text-white font-semibold" style="font-size:12.5px" @click="pickVenue(v)">
                選這個場地
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- 我的預約 -->
      <div v-if="myBookings.length">
        <h2 class="font-bold text-base-c mb-3" style="font-size:15px">我的預約</h2>
        <div v-for="b in myBookings" :key="b.id" class="bg-surface border border-light-c rounded-2xl p-3 mb-2 shadow-sm flex items-center justify-between gap-2">
          <div>
            <p class="font-semibold text-base-c" style="font-size:13px">{{ b.venueLabel }} · {{ formatRange(b) }}</p>
            <p class="text-hint-c mt-0.5" style="font-size:11px">{{ b.guests }} 人・訂單編號 {{ b.id }}</p>
          </div>
          <span class="status-badge flex-shrink-0" :class="statusClass(b.status)">{{ statusLabel(b.status) }}</span>
        </div>
      </div>

    </div>
  </div>
</template>

<script setup>
// 公開頁面：不需要員工登入即可送出場地租借需求。
// 若站台預設把 /holy/** 都擋在登入後面，請將以下端點加入白名單：
//   GET  /holy/venues/settings/list
//   POST /holy/venues/bookings/request
//   GET  /holy/venues/bookings/by-ids
definePageMeta({ layout: 'default' })

const commonStore = useCommonStore()
const VENUES_BASE   = () => commonStore.data.main_url + '/holy/venues/settings'
const BOOKINGS_BASE = () => commonStore.data.main_url + '/holy/venues/bookings'

const STORAGE_KEY = 'holy_my_venue_bookings'

const today = new Date().toISOString().slice(0, 10)

const venues = ref([]) // [{id,name,location,capacity,capacityMax,activities,price,equipment,images,active,order}]
const activeVenues = computed(() => venues.value.filter(v => v.active))

const filters = [
  { label: '全部', value: 'all' },
  { label: '大型場地 (100人+)', value: 'large' },
  { label: '中型場地 (30–99人)', value: 'medium' },
  { label: '小型場地 (<30人)', value: 'small' },
  { label: '戶外', value: 'outdoor' },
  { label: '靈修 / 祈禱', value: 'spiritual' },
]
const activeFilter = ref('all')

const filteredVenues = computed(() => {
  return activeVenues.value.filter(v => {
    const cap = v.capacityMax || parseInt(v.capacity) || 0
    switch (activeFilter.value) {
      case 'large':     return cap >= 100
      case 'medium':    return cap >= 30 && cap < 100
      case 'small':     return cap > 0 && cap < 30
      case 'outdoor':   return v.activities.includes('戶外') || v.name.includes('草坪') || v.name.includes('營火')
      case 'spiritual': return v.activities.includes('靈修') || v.activities.includes('祈禱')
      default:          return true
    }
  })
})

function formatPrice(price) { return price ? price.toLocaleString() : '洽詢' }
function venueIcon(v) {
  if (v.activities.includes('靈修') || v.activities.includes('祈禱')) return '⛪'
  if (v.activities.includes('戶外') || v.name.includes('草坪')) return '🌿'
  if (v.activities.includes('營火')) return '🔥'
  if (v.activities.includes('烘培') || v.activities.includes('廚藝') || v.activities.includes('炊事')) return '🍳'
  if (v.activities.includes('運動')) return '🏃'
  if (v.activities.includes('大型活動')) return '🏛️'
  return '🏫'
}

const form = reactive({
  startDate: '', startTime: '', endDate: '', endTime: '', guests: 10,
  name: '', phone: '', email: '', venuePref: 'all', notes: '',
})
const formError  = ref('')
const submitting = ref(false)
const justSubmittedId = ref('')

function pickVenue(v) {
  form.venuePref = v.id
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

const myBookingIds  = ref([])
const myBookingsRaw = ref([])

function venueLabel(id) {
  if (!id || id === 'all') return '尚未指派'
  const v = venues.value.find(x => x.id === id)
  return v ? v.name : '尚未指派'
}
// 起訖日期相同就顯示單日時段，跨日則顯示完整起訖日期時間
function formatRange(b) {
  if (!b) return ''
  if (b.startDate === b.endDate) return `${b.startDate} ${b.startTime}–${b.endTime}`
  return `${b.startDate} ${b.startTime} ~ ${b.endDate} ${b.endTime}`
}
function statusLabel(s) {
  return { unassigned: '待安排', pending: '待確認', confirmed: '已確認', completed: '已使用', cancelled: '已取消' }[s] || s
}
function statusClass(s) {
  return {
    unassigned: 'bg-sky-100 text-sky-700',
    pending:    'bg-amber-100 text-amber-700',
    confirmed:  'bg-emerald-100 text-emerald-700',
    completed:  'bg-stone-200 text-stone-600',
    cancelled:  'bg-rose-100 text-rose-700',
  }[s] || 'bg-stone-100 text-stone-600'
}

const myBookings = computed(() =>
  myBookingsRaw.value
    .map(b => ({ ...b, venueLabel: venueLabel(b.venueId) }))
    .sort((a, b) => (a.startDate < b.startDate ? 1 : -1))
)

async function fetchVenues() {
  try { venues.value = await (await fetch(`${VENUES_BASE()}/list`)).json() } catch (e) { console.error(e) }
}
async function fetchMyBookings() {
  if (myBookingIds.value.length === 0) { myBookingsRaw.value = []; return }
  try {
    myBookingsRaw.value = await (await fetch(`${BOOKINGS_BASE()}/by-ids?ids=${myBookingIds.value.join(',')}`)).json()
  } catch (e) { console.error(e) }
}

async function submitRequest() {
  formError.value = ''
  if (!form.startDate) { formError.value = '請選擇開始日期'; return }
  if (!form.endDate) { formError.value = '請選擇結束日期'; return }
  if (!form.startTime || !form.endTime) { formError.value = '請選擇開始與結束時間'; return }
  if (form.endDate < form.startDate) { formError.value = '結束日期不能早於開始日期'; return }
  if (form.endDate === form.startDate && form.endTime <= form.startTime) { formError.value = '結束時間需晚於開始時間'; return }
  if (!form.guests || form.guests < 1) { formError.value = '請輸入正確的使用人數'; return }
  if (!form.name.trim()) { formError.value = '請輸入姓名'; return }
  if (!form.phone.trim()) { formError.value = '請輸入聯絡電話'; return }

  submitting.value = true
  try {
    const body = {
      startDate: form.startDate, startTime: form.startTime, endDate: form.endDate, endTime: form.endTime, guests: form.guests,
      name: form.name.trim(), phone: form.phone.trim(), email: form.email.trim(),
      venuePref: form.venuePref, notes: form.notes.trim(),
    }
    const res = await (await fetch(`${BOOKINGS_BASE()}/request`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })).json()
    if (res.error) { formError.value = res.error; return }

    myBookingIds.value.push(res.id)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(myBookingIds.value))
    await fetchMyBookings()
    justSubmittedId.value = res.id

    form.startDate = ''; form.startTime = ''; form.endDate = ''; form.endTime = ''; form.guests = 10
    form.name = ''; form.phone = ''; form.email = ''; form.venuePref = 'all'; form.notes = ''
  } catch (e) {
    console.error(e)
    formError.value = '送出失敗，請稍後再試'
  } finally {
    submitting.value = false
  }
}

onMounted(() => {
  const stored = localStorage.getItem(STORAGE_KEY)
  myBookingIds.value = stored ? JSON.parse(stored) : []
  fetchVenues()
  fetchMyBookings()
})
</script>

<style scoped>
.venue-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 10px;
}
.venue-photo {
  aspect-ratio: 4 / 3;
  background: linear-gradient(135deg, #15803d, #22c55e);
}
.venue-price-badge {
  position: absolute; bottom: 6px; right: 6px;
  background: rgba(15,41,24,.72); color: #fff;
  padding: 2px 8px; border-radius: 999px; font-size: 10.5px; font-weight: 600;
}
.eq-tag {
  font-size: 10px; padding: 1px 6px; border-radius: 4px;
  background: var(--surface2); color: var(--text-hint); border: 1px solid var(--border-light);
}
.filter-row { display: flex; gap: 6px; flex-wrap: wrap; }
.filter-pill {
  padding: 5px 12px; border-radius: 999px; border: 1px solid var(--border-light);
  background: var(--surface2); color: var(--text-hint); font-size: 12px; font-weight: 600; white-space: nowrap;
}
.filter-pill:hover { border-color: #15803d; color: var(--text-base); }
.filter-pill-active, .filter-pill-active:hover { background: #15803d; border-color: #15803d; color: #fff; }
.status-badge {
  font-size: 11px;
  font-weight: 700;
  padding: 3px 9px;
  border-radius: 999px;
  white-space: nowrap;
}
</style>
