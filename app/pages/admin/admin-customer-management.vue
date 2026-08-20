<script setup>
definePageMeta({ layout: 'admin' })

const commonStore = useCommonStore()
const BASE = computed(() => commonStore.data.main_url + '/holy/customer')
const ADMIN_BASE = computed(() => commonStore.data.main_url + '/holy/admin/customers')
const PERM_BASE = computed(() => commonStore.data.main_url + '/holy/permission')

// ── 管理員驗證 header ─────────────────────────────────────────────
// /holy/admin/customers/*（update、delete）與 /holy/permission/user/*
// 的寫入端點後端是用 AdminAuthUtil.canManageCustomers /
// isSelfOrCanManageCustomers 擋的，認的是獨立管理員帳密的 Bearer token
// （或 Google 登入 cookie）。跟 toggleBlock() 用同一套模式，統一補齊。
const adminHeaders = () => {
  const token = localStorage.getItem('holy_auth_token') ?? ''
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  }
}

// ── 狀態 ──────────────────────────────────────────────────────────
const customers = ref([])
const loading = ref(true)
const saving = ref(false)
const searchText = ref('')
const filterStatus = ref('')
const filterGroup = ref('')
const deleteTarget = ref(null)
const viewMode = ref('table') // 'table' | 'card'
const groupByPermission = ref(false)
const collapsedGroups = reactive({})
const editError = ref('')
const permError = ref('')
const toast = reactive({ show: false, message: '' })

// ── 權限相關狀態 ──────────────────────────────────────────────────
const permGroups = ref([]) // 所有群組（從 permission API 取得）
const defaultGroup = ref('guest')
const userPermMap = ref({}) // { customerId: { group, permissions } }

const editModal = reactive({ open: false, customer: null })
const editForm = reactive({ name: '', mobile: '', landline: '', address: '', birthday: '', note: '' })

// permModal.groups 為所屬群組 id 陣列（可切換範圍）
// permModal.activeGroup 為目前使用中的群組（決定導覽選單與權限）
const permModal = reactive({
  open: false,
  customer: null,
  groups: [],
  activeGroup: ''
})

// ── 計算屬性 ──────────────────────────────────────────────────────
const filtered = computed(() => {
  const q = searchText.value.toLowerCase()
  return customers.value.filter((c) => {
    const matchSearch = !q || [c.name, c.email, c.mobile, c.landline, c.address].some(v => v?.toLowerCase().includes(q))
    const matchStatus = !filterStatus.value || c.status === filterStatus.value
    const matchGroup = !filterGroup.value || (userPermMap.value[c.id]?.groups || []).includes(filterGroup.value)
    return matchSearch && matchStatus && matchGroup
  })
})

// 依權限群組分類（使用「使用中群組」歸類，找不到則歸入未分類）
const groupedCustomers = computed(() => {
  const buckets = new Map()
  permGroups.value.forEach(g => buckets.set(g.id, { id: g.id, label: g.label, customers: [] }))
  buckets.set('__unassigned', { id: '__unassigned', label: '未分類', customers: [] })

  filtered.value.forEach((c) => {
    const perm = userPermMap.value[c.id]
    let gid = perm?.activeGroup
    if (!gid || !buckets.has(gid)) gid = perm?.groups?.[0]
    if (!gid || !buckets.has(gid)) gid = perm?.group
    if (!gid || !buckets.has(gid)) gid = '__unassigned'
    buckets.get(gid).customers.push(c)
  })

  return [...buckets.values()].filter(b => b.customers.length > 0)
})

// 分組開關關閉時，顯示單一「全部客戶」清單（維持切換前的行為）
const displayGroups = computed(() => groupByPermission.value
  ? groupedCustomers.value
  : [{ id: '__all', label: '全部客戶', customers: filtered.value }])

// ── 工具 ──────────────────────────────────────────────────────────
const showToast = (msg) => {
  toast.message = msg
  toast.show = true
  setTimeout(() => toast.show = false, 2500)
}

const groupLabel = groupId =>
  permGroups.value.find(g => g.id === groupId)?.label ?? groupId ?? '—'

const toggleGroupCollapse = (groupId) => {
  collapsedGroups[groupId] = !collapsedGroups[groupId]
}

// ── 開啟編輯 ──────────────────────────────────────────────────────
const openEdit = (c) => {
  editError.value = ''
  editModal.customer = c
  editModal.open = true
  Object.assign(editForm, {
    name: c.name || '',
    mobile: c.mobile || '',
    landline: c.landline || '',
    address: c.address || '',
    birthday: c.birthday || '',
    note: c.note || ''
  })
}

// ── 切換群組勾選 ──────────────────────────────────────────────────
const toggleGroup = (groupId, checked) => {
  if (checked) {
    if (!permModal.groups.includes(groupId)) permModal.groups.push(groupId)
    if (!permModal.activeGroup) permModal.activeGroup = groupId
  } else {
    permModal.groups = permModal.groups.filter(g => g !== groupId)
    // 若取消勾選的正是目前使用中的群組，自動改選範圍內第一個
    if (permModal.activeGroup === groupId) {
      permModal.activeGroup = permModal.groups[0] || ''
    }
  }
}

// ── 開啟用戶權限 Modal ────────────────────────────────────────────
const openPermModal = (c) => {
  permError.value = ''
  const perm = userPermMap.value[c.id]
  permModal.customer = c
  permModal.groups = perm?.groups?.length
    ? [...perm.groups]
    : (perm?.group ? [perm.group] : [defaultGroup.value]) // 相容舊資料單一 group 欄位
  permModal.activeGroup = perm?.activeGroup && permModal.groups.includes(perm.activeGroup)
    ? perm.activeGroup
    : permModal.groups[0]
  permModal.open = true
}

// ── 快速切換使用中群組（不需開啟 Modal，直接在列表操作） ─────────
const quickSwitchActiveGroup = async (customerId, groupId) => {
  try {
    const res = await fetch(`${PERM_BASE.value}/user/${customerId}/active-group`, {
      method: 'PUT',
      headers: adminHeaders(),
      credentials: 'include',
      body: JSON.stringify({group: groupId})
    })
    const data = await res.json()
    if (data.error) {
      showToast('❌ ' + data.error);
      return
    }
    if (userPermMap.value[customerId]) userPermMap.value[customerId].activeGroup = groupId
    showToast('使用中群組已切換')
  } catch (e) {
    showToast('❌ 連線失敗')
    console.error(e)
  }
}

// ── API：取得客戶清單 ──────────────────────────────────────────────
const fetchCustomers = async () => {
  loading.value = true
  try {
    // 原本打 BASE（/holy/customer/list），但後端已經把這支當成沒在用的舊端點，
    // 沒過驗證就默默回傳 []。真正在用的清單是 ADMIN_BASE（/holy/admin/customers/list）。
    const res = await fetch(ADMIN_BASE.value + '/list', {
      headers: adminHeaders(),
      credentials: 'include'
    })
    customers.value = await res.json()
  } catch (e) {
    console.error(e)
  } finally {
    loading.value = false
  }
}

// ── API：取得權限群組 + 所有用戶權限 ─────────────────────────────
const fetchPermData = async () => {
  try {
    const [gRes, dRes] = await Promise.all([
      fetch(PERM_BASE.value + '/groups'),
      fetch(PERM_BASE.value + '/default-group')
    ])
    permGroups.value = await gRes.json()
    defaultGroup.value = (await dRes.json()).defaultGroup ?? 'guest'
  } catch (e) {
    console.error(e)
  }
}

const fetchUserPerms = async () => {
  try {
    const perms = await Promise.all(
      customers.value.map(c =>
        fetch(`${PERM_BASE.value}/user/${c.id}`).then(r => r.json())
      )
    )
    const map = {}
    perms.forEach((p) => {
      if (p.customerId) map[p.customerId] = p
    })
    userPermMap.value = map
  } catch (e) {
    console.error(e)
  }
}

// ── API：儲存編輯 ──────────────────────────────────────────────────
const saveEdit = async () => {
  editError.value = ''
  saving.value = true
  try {
    const res = await fetch(ADMIN_BASE.value + '/update', {
      method: 'PUT',
      headers: adminHeaders(),
      credentials: 'include',
      body: JSON.stringify({id: editModal.customer.id, ...editForm})
    })
    const data = await res.json()
    if (data.success) {
      await fetchCustomers()
      editModal.open = false
      showToast('客戶資料已更新')
    } else {
      editError.value = data.message || '更新失敗'
    }
  } catch {
    editError.value = '連線失敗，請再試一次'
  } finally {
    saving.value = false
  }
}

// ── API：儲存用戶所屬群組 + 使用中群組 ────────────────────────────
const savePerm = async () => {
  permError.value = ''
  if (permModal.groups.length === 0) {
    permError.value = '請至少選擇一個群組';
    return
  }

  saving.value = true
  const customerId = permModal.customer.id
  try {
    const groupsRes = await fetch(`${PERM_BASE.value}/user/${customerId}/groups`, {
      method: 'PUT',
      headers: adminHeaders(),
      credentials: 'include',
      body: JSON.stringify({groups: permModal.groups})
    })
    const groupsData = await groupsRes.json()
    if (groupsData.error) throw new Error('群組儲存失敗：' + groupsData.error)

    const activeRes = await fetch(`${PERM_BASE.value}/user/${customerId}/active-group`, {
      method: 'PUT',
      headers: adminHeaders(),
      credentials: 'include',
      body: JSON.stringify({group: permModal.activeGroup})
    })
    const activeData = await activeRes.json()
    if (activeData.error) throw new Error('切換使用中群組失敗：' + activeData.error)

    // 重新拉全部用戶權限，確保列表群組顯示同步
    await fetchUserPerms()

    permModal.open = false
    showToast('用戶權限已更新')
  } catch (e) {
    permError.value = e.message || '儲存失敗，請再試一次'
    console.error(e)
  } finally {
    saving.value = false
  }
}

// ── API：封鎖/解鎖 ─────────────────────────────────────────────────
const toggleBlock = async (c) => {
  const newStatus = c.status === 'blocked' ? 'active' : 'blocked'
  try {
    const res = await fetch(`${BASE.value}/${c.id}/status`, {
      method: 'PUT',
      headers: adminHeaders(),
      credentials: 'include',
      body: JSON.stringify({status: newStatus})
    })
    const data = await res.json()
    if (data.success) {
      c.status = newStatus
      showToast(newStatus === 'blocked' ? '帳號已封鎖' : '帳號已解鎖')
    } else {
      showToast('❌ ' + (data.error || '操作失敗'))
    }
  } catch (e) {
    showToast('❌ 連線失敗：' + e.message)
    console.error(e)
  }
}

// ── API：刪除 ─────────────────────────────────────────────────────
const confirmDelete = (c) => {
  deleteTarget.value = c
}

const doDelete = async () => {
  saving.value = true
  try {
    const res = await fetch(`${ADMIN_BASE.value}/delete/${deleteTarget.value.id}`, {
      method: 'DELETE',
      headers: adminHeaders(),
      credentials: 'include'
    })
    const data = await res.json()
    if (data.success) {
      await fetchCustomers()
      showToast('帳號已刪除')
    }
  } catch (e) {
    console.error(e)
  } finally {
    saving.value = false
    deleteTarget.value = null
  }
}

// ── 初始化 ────────────────────────────────────────────────────────
onMounted(async () => {
  await Promise.all([fetchCustomers(), fetchPermData()])
  await fetchUserPerms()
})
</script>

<template>
  <div class="min-h-screen bg-surface2 transition-colors duration-300">
    <AdminNavbar/>

    <!-- ── Header ── -->
    <header class="bg-surface border-b border-light-c px-4 py-3 sticky top-0 z-30">
      <div class="flex items-center justify-between mb-2">
        <div class="flex items-center gap-2">
          <div
            class="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
            客
          </div>
          <div>
            <h1 class="font-bold text-base-c leading-none text-sm sm:text-base">
              客戶帳號管理
            </h1>
            <p class="text-xs text-hint-c mt-0.5 hidden sm:block">
              Customer Accounts
            </p>
          </div>
        </div>
        <span class="text-xs text-hint-c">共 {{ filtered.length }} 位客戶</span>
      </div>

      <!-- 搜尋 + 篩選 -->
      <div class="flex flex-wrap gap-2">
        <input
          v-model="searchText"
          placeholder="搜尋姓名、Email、電話…"
          class="flex-1 min-w-40 px-3 py-1.5 text-sm rounded-lg border border-light-c bg-surface text-base-c outline-none focus:ring-2 focus:ring-blue-400"
        >
        <select
          v-model="filterStatus"
          class="px-3 py-1.5 text-sm rounded-lg border border-light-c bg-surface text-base-c outline-none focus:ring-2 focus:ring-blue-400"
        >
          <option value="">
            全部狀態
          </option>
          <option value="active">
            正常
          </option>
          <option value="blocked">
            已封鎖
          </option>
        </select>
        <select
          v-model="filterGroup"
          class="px-3 py-1.5 text-sm rounded-lg border border-light-c bg-surface text-base-c outline-none focus:ring-2 focus:ring-blue-400"
        >
          <option value="">
            全部群組
          </option>
          <option
            v-for="g in permGroups"
            :key="g.id"
            :value="g.id"
          >
            {{ g.label }}
          </option>
        </select>
      </div>
    </header>

    <div class="max-w-full px-3 sm:px-4 py-4">
      <!-- 載入中 -->
      <div
        v-if="loading"
        class="flex items-center justify-center py-16 text-hint-c gap-2"
      >
        <div class="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"/>
        載入中…
      </div>

      <!-- 無資料 -->
      <div
        v-else-if="filtered.length === 0"
        class="text-center py-16 text-hint-c text-sm"
      >
        {{ customers.length === 0 ? '尚無客戶資料' : '找不到符合條件的客戶' }}
      </div>

      <!-- 檢視控制列：權限群組分類切換 + 卡片/列表切換 -->
      <div
        v-if="!loading && filtered.length > 0"
        class="flex flex-wrap items-center justify-between gap-2 mb-3"
      >
        <button
          type="button"
          class="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border transition-colors"
          :class="groupByPermission
            ? 'border-violet-300 bg-violet-50 text-violet-700 dark:border-violet-700 dark:bg-violet-900/20 dark:text-violet-400'
            : 'border-light-c text-muted-c hover-surface2'"
          @click="groupByPermission = !groupByPermission"
        >
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14-7H5m14 14H5"/>
          </svg>
          依權限群組分類
        </button>

        <div class="flex items-center gap-1 p-0.5 rounded-lg border border-light-c bg-surface">
          <button
            type="button"
            class="flex items-center gap-1 px-2.5 py-1 text-xs rounded-md transition-colors"
            :class="viewMode === 'table' ? 'bg-blue-600 text-white' : 'text-muted-c hover-surface2'"
            @click="viewMode = 'table'"
          >
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"/>
            </svg>
            列表
          </button>
          <button
            type="button"
            class="flex items-center gap-1 px-2.5 py-1 text-xs rounded-md transition-colors"
            :class="viewMode === 'card' ? 'bg-blue-600 text-white' : 'text-muted-c hover-surface2'"
            @click="viewMode = 'card'"
          >
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M4 4h7v7H4V4zm9 0h7v7h-7V4zM4 13h7v7H4v-7zm9 0h7v7h-7v-7z"/>
            </svg>
            卡片
          </button>
        </div>
      </div>

      <!-- 分組清單（依權限群組分類，關閉時為單一「全部客戶」清單） -->
      <div
        v-for="group in displayGroups"
        :key="group.id"
        class="mb-5"
      >
        <button
          v-if="groupByPermission"
          type="button"
          class="w-full flex items-center gap-2 px-3 py-2 mb-2 rounded-xl bg-surface border border-light-c hover-surface2 transition-colors"
          @click="toggleGroupCollapse(group.id)"
        >
          <svg
            class="w-3.5 h-3.5 text-hint-c transition-transform flex-shrink-0"
            :class="collapsedGroups[group.id] ? '-rotate-90' : ''"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
          </svg>
          <span
            class="w-2 h-2 rounded-full flex-shrink-0"
            :class="group.id === '__unassigned' ? 'bg-gray-400' : 'bg-violet-500'"
          />
          <span class="text-sm font-semibold text-base-c">{{ group.label }}</span>
          <span class="text-xs text-hint-c">{{ group.customers.length }} 位</span>
        </button>

        <div v-show="!groupByPermission || !collapsedGroups[group.id]">
          <div
            v-if="viewMode === 'table'"
            class="hidden md:block bg-surface rounded-2xl border border-light-c shadow-sm overflow-hidden"
          >
            <table class="w-full text-sm whitespace-nowrap">
              <thead class="bg-surface2 text-xs text-hint-c uppercase tracking-wide">
              <tr>
                <th class="px-3 py-3 text-left">
                  客戶
                </th>
                <th class="px-3 py-3 text-left">
                  Email
                </th>
                <th class="px-3 py-3 text-left">
                  電話
                </th>
                <th class="px-3 py-3 text-center">
                  權限群組
                </th>
                <th class="px-3 py-3 text-center">
                  訂位
                </th>
                <th class="px-3 py-3 text-center">
                  便當
                </th>
                <th class="px-3 py-3 text-left">
                  建立時間
                </th>
                <th class="px-3 py-3 text-center">
                  狀態
                </th>
                <th class="px-3 py-3 text-center">
                  操作
                </th>
              </tr>
              </thead>
              <tbody class="divide-y divide-base">
              <tr
                v-for="c in group.customers"
                :key="c.id"
                class="hover-surface2/30 transition-colors"
                :class="c.status === 'blocked' ? 'opacity-50' : ''"
              >
                <!-- 客戶 -->
                <td class="px-3 py-2.5">
                  <div class="flex items-center gap-2">
                    <img
                      v-if="c.picture"
                      :src="c.picture"
                      :alt="c.name"
                      class="w-8 h-8 rounded-full object-cover border border-light-c flex-shrink-0"
                    >
                    <div
                      v-else
                      class="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 text-xs font-bold flex-shrink-0"
                    >
                      {{ c.name?.charAt(0) || '?' }}
                    </div>
                    <span class="font-medium text-base-c">{{ c.name }}</span>
                  </div>
                </td>
                <td class="px-3 py-2.5 text-hint-c">
                  {{ c.email }}
                </td>
                <td class="px-3 py-2.5 text-muted-c">
                  {{ c.mobile || c.landline || '—' }}
                </td>
                <!-- 權限群組（可複選 + 快速切換使用中） -->
                <td class="px-3 py-2.5 text-center">
                  <div class="flex justify-center">
                    <select
                      v-if="(userPermMap[c.id]?.groups?.length || 0) > 1"
                      :value="userPermMap[c.id]?.activeGroup"
                      class="text-xs px-2 py-1 rounded-full border border-violet-300 dark:border-violet-700 bg-violet-50 dark:bg-violet-900/20 text-violet-700 dark:text-violet-400 outline-none focus:ring-1 focus:ring-violet-400"
                      @change="quickSwitchActiveGroup(c.id, $event.target.value)"
                    >
                      <option
                        v-for="gid in userPermMap[c.id].groups"
                        :key="gid"
                        :value="gid"
                      >
                        {{ groupLabel(gid) }}
                      </option>
                    </select>
                    <span
                      v-else-if="userPermMap[c.id]?.groups?.length === 1"
                      class="px-2 py-0.5 rounded-full text-xs font-medium bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400"
                    >
                      {{ groupLabel(userPermMap[c.id].activeGroup || userPermMap[c.id].groups[0]) }}
                    </span>
                    <span
                      v-else
                      class="text-hint-c text-xs"
                    >—</span>
                  </div>
                </td>
                <td class="px-3 py-2.5 text-center">
                  <span
                    class="px-2 py-0.5 rounded-full text-xs bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400 font-medium">
                    {{ c.bookingCount ?? '—' }}
                  </span>
                </td>
                <td class="px-3 py-2.5 text-center">
                  <span
                    class="px-2 py-0.5 rounded-full text-xs bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 font-medium">
                    {{ c.lunchCount ?? '—' }}
                  </span>
                </td>
                <td class="px-3 py-2.5 text-hint-c text-xs">
                  {{ c.createdAt }}
                </td>
                <td class="px-3 py-2.5 text-center">
                  <span
                    :class="c.status === 'blocked'
                      ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400'
                      : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'"
                    class="px-2 py-0.5 rounded-full text-xs font-medium"
                  >
                    {{ c.status === 'blocked' ? '已封鎖' : '正常' }}
                  </span>
                </td>
                <td class="px-3 py-2.5">
                  <div class="flex items-center gap-1 justify-center">
                    <button
                      class="px-2 py-1 text-xs border border-blue-300 dark:border-blue-700 text-blue-600 dark:text-blue-400 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                      @click="openEdit(c)"
                    >
                      編輯
                    </button>
                    <button
                      class="px-2 py-1 text-xs border border-violet-300 dark:border-violet-700 text-violet-600 dark:text-violet-400 rounded-lg hover:bg-violet-50 dark:hover:bg-violet-900/20 transition-colors"
                      @click="openPermModal(c)"
                    >
                      權限
                    </button>
                    <button
                      :class="c.status === 'blocked'
                        ? 'border-green-300 dark:border-green-700 text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20'
                        : 'border-yellow-300 dark:border-yellow-700 text-yellow-600 dark:text-yellow-400 hover:bg-yellow-50 dark:hover:bg-yellow-900/20'"
                      class="px-2 py-1 text-xs border rounded-lg transition-colors"
                      @click="toggleBlock(c)"
                    >
                      {{ c.status === 'blocked' ? '解鎖' : '封鎖' }}
                    </button>
                    <button
                      class="px-2 py-1 text-xs border border-red-300 dark:border-red-700 text-red-500 dark:text-red-400 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                      @click="confirmDelete(c)"
                    >
                      刪除
                    </button>
                  </div>
                </td>
              </tr>
              </tbody>
            </table>
          </div>

          <!-- 卡片：卡片模式時各尺寸皆顯示；列表模式時僅手機版 fallback -->
          <div
            :class="viewMode === 'card' ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3' : 'md:hidden space-y-3'">
            <div
              v-for="c in group.customers"
              :key="c.id"
              class="bg-surface rounded-2xl border border-light-c shadow-sm p-4"
              :class="c.status === 'blocked' ? 'opacity-60' : ''"
            >
              <div class="flex items-start gap-3 mb-3">
                <img
                  v-if="c.picture"
                  :src="c.picture"
                  :alt="c.name"
                  class="w-12 h-12 rounded-full object-cover border border-light-c flex-shrink-0"
                >
                <div
                  v-else
                  class="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 font-bold flex-shrink-0"
                >
                  {{ c.name?.charAt(0) || '?' }}
                </div>
                <div class="flex-1 min-w-0">
                  <div class="flex items-center justify-between gap-2 flex-wrap">
                    <p class="font-semibold text-base-c truncate">
                      {{ c.name }}
                    </p>
                    <div class="flex gap-1.5 flex-wrap justify-end items-center">
                      <select
                        v-if="(userPermMap[c.id]?.groups?.length || 0) > 1"
                        :value="userPermMap[c.id]?.activeGroup"
                        class="text-xs px-2 py-1 rounded-full border border-violet-300 dark:border-violet-700 bg-violet-50 dark:bg-violet-900/20 text-violet-700 dark:text-violet-400 outline-none focus:ring-1 focus:ring-violet-400"
                        @change="quickSwitchActiveGroup(c.id, $event.target.value)"
                      >
                        <option
                          v-for="gid in userPermMap[c.id].groups"
                          :key="gid"
                          :value="gid"
                        >
                          {{ groupLabel(gid) }}
                        </option>
                      </select>
                      <span
                        v-else-if="userPermMap[c.id]?.groups?.length === 1"
                        class="px-2 py-0.5 rounded-full text-xs font-medium bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400"
                      >
                      {{ groupLabel(userPermMap[c.id].activeGroup || userPermMap[c.id].groups[0]) }}
                    </span>
                      <span
                        :class="c.status === 'blocked'
                        ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400'
                        : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'"
                        class="px-2 py-0.5 rounded-full text-xs font-medium flex-shrink-0"
                      >
                      {{ c.status === 'blocked' ? '已封鎖' : '正常' }}
                    </span>
                    </div>
                  </div>
                  <p class="text-xs text-hint-c mt-0.5 truncate">
                    {{ c.email }}
                  </p>
                </div>
              </div>
              <div class="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-muted-c mb-3">
                <div v-if="c.mobile || c.landline">
                  <span class="text-hint-c">電話：</span>{{ c.mobile || c.landline }}
                </div>
                <div v-if="c.birthday">
                  <span class="text-hint-c">生日：</span>{{ c.birthday }}
                </div>
                <div><span class="text-hint-c">訂位：</span><span
                  class="text-teal-600 font-medium">{{ c.bookingCount ?? '—' }} 筆</span></div>
                <div><span class="text-hint-c">便當：</span><span
                  class="text-orange-600 font-medium">{{ c.lunchCount ?? '—' }} 筆</span></div>
                <div class="col-span-2 text-hint-c">
                  建立：{{ c.createdAt }}
                </div>
              </div>
              <div class="flex gap-2">
                <button
                  class="flex-1 py-1.5 text-xs border border-blue-300 dark:border-blue-700 text-blue-600 dark:text-blue-400 rounded-xl hover:bg-blue-50 transition-colors"
                  @click="openEdit(c)"
                >
                  編輯
                </button>
                <button
                  class="flex-1 py-1.5 text-xs border border-violet-300 dark:border-violet-700 text-violet-600 dark:text-violet-400 rounded-xl hover:bg-violet-50 transition-colors"
                  @click="openPermModal(c)"
                >
                  權限
                </button>
                <button
                  :class="c.status === 'blocked'
                  ? 'border-green-300 text-green-600 hover:bg-green-50'
                  : 'border-yellow-300 text-yellow-600 hover:bg-yellow-50'"
                  class="flex-1 py-1.5 text-xs border rounded-xl transition-colors"
                  @click="toggleBlock(c)"
                >
                  {{ c.status === 'blocked' ? '解鎖' : '封鎖' }}
                </button>
                <button
                  class="flex-1 py-1.5 text-xs border border-red-300 dark:border-red-700 text-red-500 dark:text-red-400 rounded-xl hover:bg-red-50 transition-colors"
                  @click="confirmDelete(c)"
                >
                  刪除
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- ══ 編輯 Modal ══ -->
    <div
      v-if="editModal.open"
      class="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 px-4"
    >
      <div class="bg-surface rounded-2xl shadow-xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
        <div class="flex items-center gap-3 mb-5">
          <img
            v-if="editModal.customer?.picture"
            :src="editModal.customer.picture"
            class="w-10 h-10 rounded-full object-cover border border-light-c"
          >
          <div>
            <h3 class="font-bold text-base-c">
              編輯客戶資料
            </h3>
            <p class="text-xs text-hint-c">
              {{ editModal.customer?.email }}
            </p>
          </div>
          <button
            class="ml-auto text-hint-c hover:text-muted-c p-1"
            @click="editModal.open = false"
          >
            <svg
              class="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <div class="space-y-4">
          <div>
            <label class="text-xs font-semibold text-muted-c block mb-1">姓名</label>
            <input
              v-model="editForm.name"
              type="text"
              class="w-full px-3 py-2 text-sm rounded-xl border border-light-c bg-surface text-base-c outline-none focus:ring-2 focus:ring-blue-400"
            >
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="text-xs font-semibold text-muted-c block mb-1">手機</label>
              <input
                v-model="editForm.mobile"
                type="tel"
                class="w-full px-3 py-2 text-sm rounded-xl border border-light-c bg-surface text-base-c outline-none focus:ring-2 focus:ring-blue-400"
              >
            </div>
            <div>
              <label class="text-xs font-semibold text-muted-c block mb-1">市話</label>
              <input
                v-model="editForm.landline"
                type="tel"
                class="w-full px-3 py-2 text-sm rounded-xl border border-light-c bg-surface text-base-c outline-none focus:ring-2 focus:ring-blue-400"
              >
            </div>
          </div>
          <div>
            <label class="text-xs font-semibold text-muted-c block mb-1">地址</label>
            <input
              v-model="editForm.address"
              type="text"
              class="w-full px-3 py-2 text-sm rounded-xl border border-light-c bg-surface text-base-c outline-none focus:ring-2 focus:ring-blue-400"
            >
          </div>
          <div>
            <label class="text-xs font-semibold text-muted-c block mb-1">生日</label>
            <input
              v-model="editForm.birthday"
              type="date"
              class="w-full px-3 py-2 text-sm rounded-xl border border-light-c bg-surface text-base-c outline-none focus:ring-2 focus:ring-blue-400"
            >
          </div>
          <div>
            <label class="text-xs font-semibold text-muted-c block mb-1">備註</label>
            <textarea
              v-model="editForm.note"
              rows="2"
              class="w-full px-3 py-2 text-sm rounded-xl border border-light-c bg-surface text-base-c outline-none focus:ring-2 focus:ring-blue-400 resize-none"
            />
          </div>

          <p
            v-if="editError"
            class="text-xs text-red-500"
          >
            {{ editError }}
          </p>

          <div class="flex gap-2 pt-1">
            <button
              class="flex-1 py-2.5 text-sm bg-surface2 text-muted-c rounded-xl hover:bg-surface2 transition-colors"
              @click="editModal.open = false"
            >
              取消
            </button>
            <button
              :disabled="saving"
              class="flex-1 py-2.5 text-sm bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:bg-blue-300 transition-colors flex items-center justify-center gap-1.5"
              @click="saveEdit"
            >
              <div
                v-if="saving"
                class="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"
              />
              {{ saving ? '儲存中…' : '儲存' }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- ══ 用戶權限 Modal ══ -->
    <div
      v-if="permModal.open"
      class="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-start justify-center z-50 px-4 py-6 overflow-y-auto"
    >
      <div class="bg-surface rounded-2xl shadow-xl w-full max-w-2xl p-6 my-auto">
        <!-- 用戶資訊 -->
        <div class="flex items-center gap-3 mb-5">
          <img
            v-if="permModal.customer?.picture"
            :src="permModal.customer.picture"
            class="w-10 h-10 rounded-full object-cover border border-light-c flex-shrink-0"
          >
          <div
            v-else
            class="w-10 h-10 rounded-full bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center text-violet-600 font-bold flex-shrink-0"
          >
            {{ permModal.customer?.name?.charAt(0) || '?' }}
          </div>
          <div class="flex-1 min-w-0">
            <h3 class="font-bold text-base-c truncate">
              {{ permModal.customer?.name }}
            </h3>
            <p class="text-xs text-hint-c truncate">
              {{ permModal.customer?.email }}
            </p>
          </div>
          <button
            class="text-hint-c hover:text-muted-c p-1"
            @click="permModal.open = false"
          >
            <svg
              class="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <!-- 選擇群組（可複選，決定可切換的範圍） -->
        <div>
          <label class="text-xs font-semibold text-muted-c block mb-2">所屬群組（可複選）</label>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
            <label
              v-for="g in permGroups"
              :key="g.id"
              class="flex items-center gap-2 px-3 py-2 rounded-xl border cursor-pointer transition-colors"
              :class="permModal.groups.includes(g.id)
                ? 'border-violet-300 bg-violet-50 dark:border-violet-700 dark:bg-violet-900/20'
                : 'border-light-c hover-surface2'"
            >
              <input
                type="checkbox"
                :checked="permModal.groups.includes(g.id)"
                class="accent-violet-600 w-3.5 h-3.5 flex-shrink-0"
                @change="toggleGroup(g.id, $event.target.checked)"
              >
              <div class="min-w-0">
                <p class="text-xs font-medium text-base-c">{{ g.label }}</p>
                <p class="text-xs text-hint-c font-mono">{{ g.id }}</p>
              </div>
            </label>
          </div>
          <p class="text-xs text-hint-c mt-2">
            勾選此用戶可切換的群組範圍
          </p>
        </div>

        <!-- 目前使用中群組（決定導覽選單與權限，僅能從上方勾選範圍中選一個） -->
        <div
          v-if="permModal.groups.length > 0"
          class="mt-4"
        >
          <label class="text-xs font-semibold text-muted-c block mb-2">目前使用中群組</label>
          <div class="flex flex-wrap gap-1.5">
            <button
              v-for="gid in permModal.groups"
              :key="gid"
              type="button"
              class="px-3 py-1.5 text-xs rounded-full border transition-colors"
              :class="permModal.activeGroup === gid
                ? 'bg-violet-600 border-violet-600 text-white'
                : 'border-light-c text-muted-c hover-surface2'"
              @click="permModal.activeGroup = gid"
            >
              {{ groupLabel(gid) }}
            </button>
          </div>
          <p class="text-xs text-hint-c mt-2">
            導覽選單與權限依「使用中群組」顯示，切換不影響上方可選範圍
          </p>
        </div>

        <!-- 錯誤提示 -->
        <p
          v-if="permError"
          class="text-xs text-red-500 mb-3"
        >
          {{ permError }}
        </p>

        <div class="flex gap-2 pt-3 border-t border-light-c mt-4">
          <button
            class="flex-1 py-2.5 text-sm bg-surface2 text-muted-c rounded-xl hover:bg-surface2 transition-colors"
            @click="permModal.open = false"
          >
            取消
          </button>
          <button
            :disabled="saving"
            class="flex-1 py-2.5 text-sm bg-violet-600 text-white rounded-xl hover:bg-violet-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-1.5"
            @click="savePerm"
          >
            <div
              v-if="saving"
              class="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"
            />
            {{ saving ? '儲存中…' : '儲存' }}
          </button>
        </div>
      </div>
    </div>

    <!-- ══ 刪除確認 Modal ══ -->
    <div
      v-if="deleteTarget"
      class="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 px-4"
    >
      <div class="bg-surface rounded-2xl shadow-xl w-full max-w-sm p-6">
        <h3 class="font-bold text-base-c mb-2">
          確認刪除
        </h3>
        <p class="text-sm text-hint-c mb-5">
          確定要刪除 <span class="font-semibold text-base-c">{{ deleteTarget.name }}</span>（{{
            deleteTarget.email
          }}）的帳號嗎？此操作無法復原。
        </p>
        <div class="flex gap-2">
          <button
            class="flex-1 py-2.5 text-sm bg-surface2 text-muted-c rounded-xl hover:bg-surface2 transition-colors"
            @click="deleteTarget = null"
          >
            取消
          </button>
          <button
            :disabled="saving"
            class="flex-1 py-2.5 text-sm bg-red-500 text-white rounded-xl hover:bg-red-600 disabled:opacity-50 transition-colors flex items-center justify-center gap-1.5"
            @click="doDelete"
          >
            <div
              v-if="saving"
              class="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"
            />
            {{ saving ? '刪除中…' : '確認刪除' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Toast -->
    <transition name="fade">
      <div
        v-if="toast.show"
        class="fixed bottom-6 left-1/2 -translate-x-1/2 sm:left-auto sm:right-6 sm:translate-x-0 bg-accent-solid text-white text-sm px-4 py-3 rounded-xl shadow-lg flex items-center gap-2 z-50 whitespace-nowrap"
      >
        <svg
          class="w-4 h-4 text-green-400 flex-shrink-0"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M5 13l4 4L19 7"
          />
        </svg>
        {{ toast.message }}
      </div>
    </transition>
  </div>
</template>

<style scoped>
.fade-enter-active, .fade-leave-active {
  transition: opacity 0.3s, transform 0.3s;
}

.fade-enter-from, .fade-leave-to {
  opacity: 0;
  transform: translateY(8px);
}
</style>
