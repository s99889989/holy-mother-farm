<template>
  <div class="min-h-full bg-surface2 transition-colors">

    <!-- Header -->
    <header class="bg-surface border-b border-light-c px-4 py-3 sticky top-0 z-20">
      <div class="max-w-2xl mx-auto flex items-center gap-2">
        <div class="w-8 h-8 rounded-lg bg-green-700 flex items-center justify-center text-white flex-shrink-0" style="font-size:14px">🏡</div>
        <div>
          <h1 class="font-bold text-base-c leading-none" style="font-size:15px">住宿預約</h1>
          <p class="text-hint-c mt-0.5" style="font-size:11px">聖母健康農莊・台東</p>
        </div>
      </div>
    </header>

    <div class="max-w-2xl mx-auto px-3 sm:px-4 py-4">

      <!-- 訂房需求表單 -->
      <div class="bg-surface rounded-2xl border border-light-c shadow-sm p-4 mb-6">
        <h2 class="font-bold text-base-c mb-3" style="font-size:15px">訂房需求</h2>

        <div v-if="justSubmittedId" class="bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-lg px-3 py-2 mb-3 flex items-center justify-between gap-2" style="font-size:12.5px">
          <span>訂房需求已送出，訂單編號 {{ justSubmittedId }}，我們會盡快與您確認。</span>
          <button class="flex-shrink-0 opacity-60 hover:opacity-100" @click="justSubmittedId = ''">✕</button>
        </div>

        <div class="grid grid-cols-2 gap-3 mb-3">
          <div>
            <label class="block text-hint-c mb-1" style="font-size:12px">入住日期</label>
            <input v-model="form.checkIn" type="date" :min="today"
                   class="w-full border border-light-c rounded-lg px-3 py-2 bg-surface2 text-base-c" style="font-size:13px">
          </div>
          <div>
            <label class="block text-hint-c mb-1" style="font-size:12px">退房日期</label>
            <input v-model="form.checkOut" type="date" :min="form.checkIn || today"
                   class="w-full border border-light-c rounded-lg px-3 py-2 bg-surface2 text-base-c" style="font-size:13px">
          </div>
        </div>

        <div class="mb-3">
          <label class="block text-hint-c mb-1" style="font-size:12px">入住人數</label>
          <input v-model.number="form.guests" type="number" min="1" max="20"
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
          <label class="block text-hint-c mb-1" style="font-size:12px">偏好棟別（選填）</label>
          <select v-model="form.buildingPref"
                  class="w-full border border-light-c rounded-lg px-3 py-2 bg-surface2 text-base-c" style="font-size:13px">
            <option value="all">不指定，交由安排</option>
            <option v-for="b in buildings" :key="b.id" :value="b.id">{{ b.name }}</option>
          </select>
        </div>

        <div class="mb-4">
          <label class="block text-hint-c mb-1" style="font-size:12px">備註</label>
          <textarea v-model="form.notes" rows="2" placeholder="素食、過敏、特殊需求、同行團體等"
                    class="w-full border border-light-c rounded-lg px-3 py-2 bg-surface2 text-base-c" style="font-size:13px"></textarea>
        </div>

        <p v-if="formError" class="text-red-500 mb-2" style="font-size:12px">{{ formError }}</p>

        <button
          class="w-full py-2.5 rounded-lg bg-green-700 text-white font-semibold disabled:opacity-50"
          style="font-size:14px" :disabled="submitting" @click="submitRequest"
        >
          {{ submitting ? '送出中...' : '送出訂房需求' }}
        </button>
        <p class="text-hint-c text-center mt-2" style="font-size:11px">
          送出後即建立「待安排」訂單，我們會依人數為您安排合適房型並盡快與您確認
        </p>
      </div>

      <!-- 房型參考 -->
      <div class="mb-6" v-if="roomTypeCards.length">
        <h2 class="font-bold text-base-c mb-1" style="font-size:15px">房型參考</h2>
        <p class="text-hint-c mb-3" style="font-size:12px">實際安排的房間會依您填寫的入住人數與日期，由工作人員為您指派</p>
        <div class="type-grid">
          <div v-for="t in roomTypeCards" :key="t.name" class="bg-surface border border-light-c rounded-2xl overflow-hidden shadow-sm">
            <div class="type-photo flex items-center justify-center text-white">
              <div class="text-center">
                <div class="font-bold" style="font-size:26px;line-height:1">{{ t.maxCapacity }}</div>
                <div style="font-size:10px;opacity:.85">人房型</div>
              </div>
            </div>
            <div class="p-3">
              <div class="flex items-baseline justify-between gap-2">
                <span class="font-semibold text-base-c" style="font-size:13.5px">{{ t.name }}</span>
                <span class="text-hint-c flex-shrink-0" style="font-size:11px">最多 {{ t.maxCapacity }} 人</span>
              </div>
              <p class="text-hint-c mt-1 line-clamp-1" style="font-size:11.5px">{{ t.bed }}</p>
              <p class="font-bold text-base-c mt-2" style="font-size:14px">
                NT$ {{ t.priceFrom.toLocaleString() }} <span class="text-hint-c font-normal" style="font-size:10.5px">起 / 晚</span>
              </p>
            </div>
          </div>
        </div>
      </div>

      <!-- 我的訂單 -->
      <div v-if="myBookings.length">
        <h2 class="font-bold text-base-c mb-3" style="font-size:15px">我的訂單</h2>
        <div v-for="b in myBookings" :key="b.id" class="bg-surface border border-light-c rounded-2xl p-3 mb-2 shadow-sm flex items-center justify-between gap-2">
          <div>
            <p class="font-semibold text-base-c" style="font-size:13px">{{ b.roomLabel }} · {{ b.checkIn }} → {{ b.checkOut }}</p>
            <p class="text-hint-c mt-0.5" style="font-size:11px">{{ b.guests }} 人・訂單編號 {{ b.id }}</p>
          </div>
          <span class="status-badge flex-shrink-0" :class="statusClass(b.status)">{{ statusLabel(b.status) }}</span>
        </div>
      </div>

    </div>
  </div>
</template>

<script setup>
// 公開頁面：不需要員工登入即可送出訂房需求。
// 若站台預設把 /holy/** 都擋在登入後面，請將以下端點加入白名單：
//   GET  /holy/rooms/settings/list
//   POST /holy/rooms/bookings/request
//   GET  /holy/rooms/bookings/by-ids
definePageMeta({ layout: 'default' })

const commonStore = useCommonStore()
const ROOMS_BASE    = () => commonStore.data.main_url + '/holy/rooms/settings'
const BOOKINGS_BASE = () => commonStore.data.main_url + '/holy/rooms/bookings'

const STORAGE_KEY = 'holy_my_bookings'

const today = new Date().toISOString().slice(0, 10)

const buildings = ref([]) // [{id, name, rooms:[...]}]
const rooms = computed(() =>
  buildings.value.flatMap(b => b.rooms.map(r => ({ ...r, buildingId: b.id, buildingName: b.name })))
)

const form = reactive({
  checkIn: '', checkOut: '', guests: 2,
  name: '', phone: '', email: '', buildingPref: 'all', notes: '',
})
const formError     = ref('')
const submitting    = ref(false)
const justSubmittedId = ref('')

const myBookingIds  = ref([])
const myBookingsRaw = ref([])

// 依房型名稱去重，整理成給客戶看的房型參考卡片
const roomTypeCards = computed(() => {
  const map = new Map()
  for (const r of rooms.value) {
    if (!r.active) continue
    if (!map.has(r.type)) {
      map.set(r.type, { name: r.type, bed: r.bed, maxCapacity: r.capacity, priceFrom: r.price })
    } else {
      const t = map.get(r.type)
      t.maxCapacity = Math.max(t.maxCapacity, r.capacity)
      t.priceFrom = Math.min(t.priceFrom, r.price)
    }
  }
  return [...map.values()]
})

function roomLabel(roomId) {
  if (!roomId) return '尚未指派'
  const r = rooms.value.find(x => x.id === roomId)
  return r ? `${r.id} ${r.type}` : '尚未指派'
}
function statusLabel(s) {
  return { unassigned: '待安排', pending: '待確認', confirmed: '已確認', completed: '已退房', cancelled: '已取消' }[s] || s
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
    .map(b => ({ ...b, roomLabel: roomLabel(b.roomId) }))
    .sort((a, b) => (a.checkIn < b.checkIn ? 1 : -1))
)

async function fetchRooms() {
  try {
    buildings.value = await (await fetch(`${ROOMS_BASE()}/list`)).json()
  } catch (e) { console.error(e) }
}

async function fetchMyBookings() {
  if (myBookingIds.value.length === 0) { myBookingsRaw.value = []; return }
  try {
    myBookingsRaw.value = await (await fetch(`${BOOKINGS_BASE()}/by-ids?ids=${myBookingIds.value.join(',')}`)).json()
  } catch (e) { console.error(e) }
}

async function submitRequest() {
  formError.value = ''
  if (!form.checkIn || !form.checkOut) { formError.value = '請選擇入住與退房日期'; return }
  if (new Date(form.checkOut) <= new Date(form.checkIn)) { formError.value = '退房日期需晚於入住日期'; return }
  if (!form.guests || form.guests < 1) { formError.value = '請輸入正確的入住人數'; return }
  if (!form.name.trim()) { formError.value = '請輸入姓名'; return }
  if (!form.phone.trim()) { formError.value = '請輸入聯絡電話'; return }

  submitting.value = true
  try {
    const body = {
      checkIn: form.checkIn, checkOut: form.checkOut, guests: form.guests,
      name: form.name.trim(), phone: form.phone.trim(), email: form.email.trim(),
      buildingPref: form.buildingPref, notes: form.notes.trim(),
    }
    const res = await (await fetch(`${BOOKINGS_BASE()}/request`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })).json()

    myBookingIds.value.push(res.id)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(myBookingIds.value))
    await fetchMyBookings()
    justSubmittedId.value = res.id

    form.checkIn = ''; form.checkOut = ''; form.guests = 2
    form.name = ''; form.phone = ''; form.email = ''; form.buildingPref = 'all'; form.notes = ''
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
  fetchRooms()
  fetchMyBookings()
})
</script>

<style scoped>
.type-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 10px;
}
.type-photo {
  aspect-ratio: 4 / 3;
  background: linear-gradient(135deg, #15803d, #22c55e);
}
.status-badge {
  font-size: 11px;
  font-weight: 700;
  padding: 3px 9px;
  border-radius: 999px;
  white-space: nowrap;
}
</style>
