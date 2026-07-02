<script setup>
definePageMeta({ layout: 'staff' })

const commonStore   = useCommonStore()
const customerStore = useCustomerStore()
const permissionStore = usePermissionStore()
const BASE          = computed(() => commonStore.data.main_url + '/holy/customer')
const PERM_BASE      = computed(() => commonStore.data.main_url + '/holy/permission')
const customer      = computed(() => customerStore.customer)

// ── 群組（動態抓取，不再硬編碼，跟後台 Permission Groups 頁面同一份資料源） ──
const permGroups  = ref([])   // 所有群組定義 [{ id, label, ... }]
const myGroups    = ref([])   // 此用戶可切換的群組 id 清單
const activeGroup = ref('')   // 目前使用中的群組
const switching   = ref(false)

const groupLabel = (groupId) =>
  permGroups.value.find(g => g.id === groupId)?.label ?? groupId ?? ''

// ── 表單 ─────────────────────────────────────────────────────────
const form = reactive({ mobile: '', landline: '', address: '', birthday: '', note: '' })
const saving       = ref(false)
const saved        = ref(false)
const error        = ref('')
const mobileError  = ref('')
const landlineError = ref('')

// ── 電話驗證 ─────────────────────────────────────────────────────
const validateMobile   = (c) => /^09\d{8}$/.test(c)
const validateLandline = (c) => {
  if (/^02\d{8}$/.test(c))   return true
  if (/^0[3-8]\d{7,8}$/.test(c)) return true
  if (/^037\d{6}$/.test(c))  return true
  if (/^049\d{6}$/.test(c))  return true
  if (/^089\d{6}$/.test(c))  return true
  if (/^082[36]\d{6}$/.test(c)) return true
  if (/^0836\d{6}$/.test(c)) return true
  return false
}

const onMobileInput = () => {
  if (!form.mobile) { mobileError.value = ''; return }
  const c = form.mobile.replace(/[-\s]/g, '')
  mobileError.value = validateMobile(c) ? '' : '請輸入正確的手機號碼（09xxxxxxxx）'
}
const onLandlineInput = () => {
  if (!form.landline) { landlineError.value = ''; return }
  const c = form.landline.replace(/[-\s]/g, '')
  landlineError.value = validateLandline(c) ? '' : '請輸入正確的市話（如 02-12345678、07-1234567）'
}

// ── 載入資料：直接從 store 取，不需另打 API ───────────────────────
// 登入時 /holy/customer/me 或 /google-login 已把完整資料存入 store
const initForm = () => {
  if (!customer.value) return
  form.mobile   = customer.value.mobile   || ''
  form.landline = customer.value.landline || ''
  form.address  = customer.value.address  || ''
  form.birthday = customer.value.birthday || ''
  form.note     = customer.value.note     || ''
}

// ── 載入群組資訊：可切換清單 + 目前使用中 ─────────────────────────
const fetchPermInfo = async () => {
  if (!customer.value?.id) return
  try {
    const [groupsRes, userRes] = await Promise.all([
      fetch(PERM_BASE.value + '/groups'),
      fetch(`${PERM_BASE.value}/user/${customer.value.id}`),
    ])
    permGroups.value = await groupsRes.json()
    const userData   = await userRes.json()
    myGroups.value    = userData.groups || []
    activeGroup.value = userData.activeGroup || myGroups.value[0] || ''
  } catch (e) { console.error(e) }
}

// ── 切換使用中群組：導覽選單與權限依此顯示，不影響可切換範圍 ─────
const switchActiveGroup = async (groupId) => {
  if (!customer.value?.id || groupId === activeGroup.value || switching.value) return
  switching.value = true
  error.value = ''
  try {
    const res = await fetch(`${PERM_BASE.value}/user/${customer.value.id}/active-group`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ group: groupId })
    })
    const data = await res.json()
    if (data.error) throw new Error(data.error)

    activeGroup.value = groupId
    // 立即重拉權限，讓導覽選單同步更新，不需重整頁面
    await permissionStore.load(String(customer.value.id), commonStore.data.main_url, true)

    saved.value = true
    setTimeout(() => saved.value = false, 2000)
  } catch (e) {
    error.value = e.message || '切換失敗，請稍後再試。'
  } finally {
    switching.value = false
  }
}

// ── 儲存：PUT /holy/customer/profile（後端用 cookie 驗身份）──────
const saveProfile = async () => {
  if (form.mobile) {
    const c = form.mobile.replace(/[-\s]/g, '')
    mobileError.value = validateMobile(c) ? '' : '請輸入正確的手機號碼（09xxxxxxxx）'
  } else { mobileError.value = '' }
  if (form.landline) {
    const c = form.landline.replace(/[-\s]/g, '')
    landlineError.value = validateLandline(c) ? '' : '請輸入正確的市話（如 02-12345678、07-1234567）'
  } else { landlineError.value = '' }
  if (mobileError.value || landlineError.value) return

  saving.value = true
  saved.value  = false
  error.value  = ''
  try {
    const res = await fetch(`${BASE.value}/profile`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(form),
    })
    const data = await res.json()
    if (data.error) throw new Error(data.error)

    // 更新 store，讓 navbar 等地方也同步
    customerStore.setCustomer({ ...customer.value, ...form })
    saved.value = true
    setTimeout(() => saved.value = false, 3000)
  } catch (e) {
    error.value = e.message || '儲存失敗，請稍後再試。'
  } finally {
    saving.value = false
  }
}

onMounted(() => {
  initForm()
  fetchPermInfo()
})
</script>

<template>
  <div class="min-h-full bg-surface2 py-8 px-4">
    <div class="max-w-xl mx-auto">

      <!-- 頁面標題 -->
      <div class="mb-6">
        <h1 class="text-lg font-bold text-base-c">個人設定</h1>
        <p class="text-xs text-hint-c mt-0.5">管理您的聯絡資訊與偏好設定</p>
      </div>

      <!-- 未登入 -->
      <div
        v-if="!customer"
        class="bg-surface rounded-2xl border border-dashed border-base p-12 text-center"
      >
        <div class="text-4xl mb-3">🔒</div>
        <p class="text-sm text-hint-c">請先登入 Google 帳號</p>
        <button
          class="mt-4 px-5 py-2 text-sm font-medium rounded-xl bg-green-700 text-white hover:bg-green-800 transition-colors"
          @click="navigateTo('/login')"
        >前往登入</button>
      </div>

      <!-- 已登入 -->
      <template v-else>

        <!-- Google 帳號資訊卡 -->
        <div class="bg-surface rounded-2xl border border-light-c p-4 mb-4 flex items-center gap-3">
          <img
            v-if="customer.picture"
            :src="customer.picture"
            class="w-12 h-12 rounded-full object-cover flex-shrink-0"
          >
          <div
            v-else
            class="w-12 h-12 rounded-full bg-green-600 flex items-center justify-center text-white font-bold text-lg flex-shrink-0"
          >
            {{ customer.name?.charAt(0) || '?' }}
          </div>
          <div class="min-w-0">
            <p class="text-sm font-semibold text-base-c truncate">{{ customer.name }}</p>
            <p class="text-xs text-hint-c truncate">{{ customer.email }}</p>
            <span class="inline-block mt-1 text-xs font-medium px-2 py-0.5 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400">
              {{ groupLabel(activeGroup) }}
            </span>
          </div>
        </div>

        <!-- 使用中群組切換（僅在此用戶擁有多個群組時顯示） -->
        <div v-if="myGroups.length > 1" class="bg-surface rounded-2xl border border-light-c p-4 mb-4">
          <h2 class="text-sm font-semibold text-base-c mb-1">使用中群組</h2>
          <p class="text-xs text-hint-c mb-3">切換群組會改變您看到的導覽選單與權限，不影響您可使用的群組範圍</p>
          <div class="flex flex-wrap gap-2">
            <button
              v-for="gid in myGroups" :key="gid" type="button"
              :disabled="switching"
              @click="switchActiveGroup(gid)"
              class="px-3 py-1.5 text-xs rounded-full border transition-colors disabled:opacity-50"
              :class="activeGroup === gid
                ? 'bg-green-700 border-green-700 text-white'
                : 'border-light-c text-muted-c hover-surface2'"
            >{{ groupLabel(gid) }}</button>
          </div>
        </div>

        <!-- 表單卡 -->
        <div class="bg-surface rounded-2xl border border-light-c overflow-hidden">
          <div class="px-5 py-3.5 border-b border-light-c dark:border-base">
            <h2 class="text-sm font-semibold text-base-c">聯絡資訊</h2>
          </div>

          <!-- 表單 -->
          <div class="p-5 space-y-4">

            <!-- 手機 -->
            <div>
              <label class="block text-xs font-semibold text-muted-c mb-1.5">手機號碼</label>
              <input
                v-model="form.mobile"
                type="tel"
                placeholder="09xx-xxx-xxx"
                class="w-full px-4 py-2.5 rounded-xl border text-sm text-base-c outline-none transition-all"
                :class="mobileError
 ? 'border-red-300 dark:border-red-600 bg-red-50 dark:bg-red-900/20'
 : 'border-light-c focus:border-green-500 focus:ring-2 focus:ring-green-100 dark:focus:ring-green-900/30'"
                @input="onMobileInput"
              >
              <p v-if="mobileError" class="text-xs text-red-500 mt-1">{{ mobileError }}</p>
            </div>

            <!-- 市話 -->
            <div>
              <label class="block text-xs font-semibold text-muted-c mb-1.5">市話</label>
              <input
                v-model="form.landline"
                type="tel"
                placeholder="02-xxxxxxxx 或 07-xxxxxxx"
                class="w-full px-4 py-2.5 rounded-xl border text-sm text-base-c outline-none transition-all"
                :class="landlineError
 ? 'border-red-300 dark:border-red-600 bg-red-50 dark:bg-red-900/20'
 : 'border-light-c focus:border-green-500 focus:ring-2 focus:ring-green-100 dark:focus:ring-green-900/30'"
                @input="onLandlineInput"
              >
              <p v-if="landlineError" class="text-xs text-red-500 mt-1">{{ landlineError }}</p>
            </div>

            <!-- 地址 -->
            <div>
              <label class="block text-xs font-semibold text-muted-c mb-1.5">地址</label>
              <input
                v-model="form.address"
                type="text"
                placeholder="縣市 + 詳細地址"
                class="w-full px-4 py-2.5 rounded-xl border border-light-c text-sm text-base-c outline-none focus:border-green-500 focus:ring-2 focus:ring-green-100 dark:focus:ring-green-900/30 transition-all"
              >
            </div>

            <!-- 生日 -->
            <div>
              <label class="block text-xs font-semibold text-muted-c mb-1.5">生日</label>
              <input
                v-model="form.birthday"
                type="date"
                class="w-full px-4 py-2.5 rounded-xl border border-light-c text-sm text-base-c outline-none focus:border-green-500 focus:ring-2 focus:ring-green-100 dark:focus:ring-green-900/30 transition-all"
              >
            </div>

            <!-- 備註 -->
            <div>
              <label class="block text-xs font-semibold text-muted-c mb-1.5">其他備註</label>
              <textarea
                v-model="form.note"
                rows="3"
                placeholder="過敏食材、特殊飲食需求…"
                class="w-full px-4 py-2.5 rounded-xl border border-light-c text-sm text-base-c outline-none focus:border-green-500 focus:ring-2 focus:ring-green-100 dark:focus:ring-green-900/30 transition-all resize-none"
              />
            </div>

            <!-- 錯誤提示 -->
            <p v-if="error" class="text-xs text-red-500 bg-red-50 dark:bg-red-900/20 rounded-xl px-4 py-2.5">
              {{ error }}
            </p>

            <!-- 儲存按鈕 -->
            <div class="flex justify-end pt-1">
              <button
                :disabled="saving"
                class="px-6 py-2.5 rounded-xl text-sm font-semibold text-white transition-all disabled:opacity-60 flex items-center gap-2"
                :class="saved
 ? 'bg-emerald-600 hover:bg-emerald-700'
 : 'bg-green-700 hover:bg-green-800'"
                @click="saveProfile"
              >
                <div v-if="saving" class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span v-if="saving">儲存中…</span>
                <span v-else-if="saved">✓ 已儲存</span>
                <span v-else>儲存設定</span>
              </button>
            </div>

          </div>
        </div>

        <!-- 回員工首頁 -->
        <div class="mt-5 text-center">
          <button
            class="text-sm text-hint-c hover:text-green-600 dark:hover:text-green-400 transition-colors"
            @click="navigateTo('/staff/home')"
          >
            ← 回到員工首頁
          </button>
        </div>

      </template>
    </div>
  </div>
</template>
