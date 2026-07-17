<template>
  <div class="min-h-full bg-surface2 transition-colors duration-300">

    <!-- ── Header ── -->
    <header class="bg-surface border-b border-light-c px-4 py-3 sticky top-0 z-30">
      <div class="max-w-6xl mx-auto flex items-center justify-between mb-2">
        <div class="flex items-center gap-2">
          <div class="w-8 h-8 rounded-lg bg-red-700 flex items-center justify-center text-white text-base font-bold flex-shrink-0">🧯</div>
          <div>
            <h1 class="font-bold text-base-c leading-none text-base sm:text-lg">滅火器巡檢管理</h1>
            <p class="text-sm text-hint-c mt-0.5 hidden sm:block">Fire Extinguisher Registry</p>
          </div>
        </div>
        <div class="flex items-center gap-2">
          <button :title="darkStore.data.display_name"
                  class="w-8 h-8 flex items-center justify-center rounded-lg border border-light-c text-hint-c hover-surface2 transition-colors"
                  @click="toggleDark">
            <svg v-if="!isDark" class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"/>
            </svg>
            <svg v-else class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707M17.657 17.657l-.707-.707M6.343 6.343l-.707-.707M12 8a4 4 0 100 8 4 4 0 000-8z"/>
            </svg>
          </button>
          <button
            class="px-3 py-1.5 rounded-lg bg-red-700 text-white font-semibold hover:bg-red-800 transition-colors flex items-center gap-1.5"
            style="font-size:14px"
            @click="openModal(null)"
          >
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
            新增滅火器
          </button>
        </div>
      </div>

      <!-- 統計 -->
      <div class="max-w-6xl mx-auto flex flex-wrap gap-2">
        <span class="badge-stat">共 {{ items.length }} 支</span>
        <span v-for="f in floorCounts" :key="f.floor" class="badge-stat">{{ f.floor }} · {{ f.count }} 支</span>
      </div>
    </header>

    <div class="max-w-6xl mx-auto px-3 sm:px-4 lg:px-6 py-4">

      <!-- ── 篩選列 ── -->
      <div class="flex flex-wrap items-center gap-2 mb-4">
        <button
          class="flex-shrink-0 px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap"
          :class="activeFloor === null
            ? 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 font-semibold'
            : 'bg-surface2 text-muted-c hover-surface2'"
          style="font-size:14px"
          @click="activeFloor = null"
        >全部樓層</button>
        <button
          v-for="floor in floors" :key="floor"
          class="flex-shrink-0 px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap"
          :class="activeFloor === floor
            ? 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 font-semibold'
            : 'bg-surface2 text-muted-c hover-surface2'"
          style="font-size:14px"
          @click="activeFloor = floor"
        >{{ floor }}</button>

        <div class="relative ml-auto w-full sm:w-64">
          <svg class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-hint-c" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0"/>
          </svg>
          <input
            v-model="searchText"
            placeholder="搜尋編號、位置或批號..."
            class="w-full pl-9 pr-8 py-1.5 text-base rounded-xl border border-light-c bg-surface2 text-base-c outline-none focus:ring-2 focus:ring-red-500"
          />
          <button v-if="searchText" @click="searchText = ''" class="absolute right-2.5 top-1/2 -translate-y-1/2 text-hint-c hover:text-muted-c">
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
        </div>
      </div>

      <p v-if="loading" class="text-hint-c text-center py-10" style="font-size:15px">載入中...</p>

      <template v-else>
        <p v-if="filtered.length === 0" class="bg-surface rounded-2xl border border-light-c px-4 py-10 text-center text-hint-c shadow-sm" style="font-size:15px">
          找不到符合的滅火器
        </p>

        <!-- 桌機：表格 -->
        <div v-else class="hidden md:block bg-surface rounded-2xl border border-light-c shadow-sm overflow-hidden">
          <table class="w-full">
            <thead>
            <tr class="bg-surface2 border-b border-light-c text-hint-c" style="font-size:13px">
              <th class="text-left px-4 py-2.5 font-semibold">項次</th>
              <th class="text-left px-4 py-2.5 font-semibold">編號</th>
              <th class="text-left px-4 py-2.5 font-semibold">位置</th>
              <th class="text-left px-4 py-2.5 font-semibold">批號</th>
              <th class="text-right px-4 py-2.5 font-semibold">操作</th>
            </tr>
            </thead>
            <tbody class="divide-y divide-base">
            <tr v-for="(item, idx) in filtered" :key="item.id ?? item.code" class="hover-surface2 transition-colors">
              <td class="px-4 py-2.5 text-hint-c" style="font-size:14px">{{ idx + 1 }}</td>
              <td class="px-4 py-2.5 font-mono font-semibold text-base-c" style="font-size:14px">{{ item.code }}</td>
              <td class="px-4 py-2.5 text-muted-c" style="font-size:14px">{{ item.location }}</td>
              <td class="px-4 py-2.5 text-hint-c font-mono" style="font-size:14px">{{ item.batchNo }}</td>
              <td class="px-4 py-2.5 text-right whitespace-nowrap">
                <button class="text-blue-700 dark:text-blue-400 hover:underline mr-3" style="font-size:14px" @click="openModal(item)">編輯</button>
                <button class="text-red-700 dark:text-red-400 hover:underline" style="font-size:14px" @click="removeItem(item)">刪除</button>
              </td>
            </tr>
            </tbody>
          </table>
        </div>

        <!-- 手機：卡片 -->
        <div v-if="filtered.length" class="md:hidden space-y-2">
          <div v-for="item in filtered" :key="item.id ?? item.code"
               class="bg-surface rounded-xl border border-light-c px-4 py-3 shadow-sm">
            <div class="flex items-start justify-between gap-2">
              <div class="min-w-0">
                <p class="font-mono font-semibold text-base-c" style="font-size:15px">{{ item.code }}</p>
                <p class="text-muted-c mt-0.5" style="font-size:14px">{{ item.location }}</p>
                <p class="text-hint-c font-mono mt-0.5" style="font-size:13px">批號 {{ item.batchNo }}</p>
              </div>
              <div class="flex flex-col items-end gap-1 flex-shrink-0">
                <button class="text-blue-700 dark:text-blue-400" style="font-size:14px" @click="openModal(item)">編輯</button>
                <button class="text-red-700 dark:text-red-400" style="font-size:14px" @click="removeItem(item)">刪除</button>
              </div>
            </div>
          </div>
        </div>
      </template>
    </div>

    <!-- ── 新增/編輯 Modal ── -->
    <transition name="fade">
      <div v-if="modal.show" class="fixed inset-0 z-40 flex items-center justify-center bg-black/40 px-4" @click.self="modal.show = false">
        <div class="bg-surface rounded-2xl border border-light-c shadow-lg w-full max-w-sm p-5">
          <h2 class="font-bold text-base-c mb-4" style="font-size:17px">{{ modal.isNew ? '新增滅火器' : '編輯滅火器' }}</h2>

          <div class="space-y-3">
            <div>
              <label class="text-hint-c block mb-1" style="font-size:13px">編號</label>
              <input v-model="modal.data.code" placeholder="例如 D區1F-A01"
                     class="w-full px-3 py-2 text-base rounded-lg border border-light-c bg-surface2 text-base-c outline-none focus:ring-2 focus:ring-red-500 font-mono" />
            </div>
            <div>
              <label class="text-hint-c block mb-1" style="font-size:13px">位置</label>
              <input v-model="modal.data.location" placeholder="例如 服務中心"
                     class="w-full px-3 py-2 text-base rounded-lg border border-light-c bg-surface2 text-base-c outline-none focus:ring-2 focus:ring-red-500" />
            </div>
            <div>
              <label class="text-hint-c block mb-1" style="font-size:13px">批號</label>
              <input v-model="modal.data.batchNo" placeholder="例如 FE-130104"
                     class="w-full px-3 py-2 text-base rounded-lg border border-light-c bg-surface2 text-base-c outline-none focus:ring-2 focus:ring-red-500 font-mono" />
            </div>
          </div>

          <div class="flex gap-2 mt-5">
            <button class="flex-1 py-2 rounded-lg border border-light-c text-muted-c hover-surface2 transition-colors" style="font-size:15px" @click="modal.show = false">取消</button>
            <button class="flex-1 py-2 rounded-lg bg-red-700 text-white font-semibold hover:bg-red-800 transition-colors" style="font-size:15px" @click="saveItem">儲存</button>
          </div>
        </div>
      </div>
    </transition>

    <!-- ── Toast ── -->
    <transition name="fade">
      <div v-if="toast.show" class="fixed bottom-6 left-1/2 -translate-x-1/2 bg-surface border border-light-c shadow-lg rounded-xl px-4 py-2.5 text-base-c z-50 flex items-center gap-2" style="font-size:14px">
        <svg class="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>
        {{ toast.message }}
      </div>
    </transition>

  </div>
</template>

<script setup>
  definePageMeta({ layout: 'staff', requiredPermission: 'management.fire-extinguisher' })

  import { ref, reactive, computed, onMounted } from 'vue'

  // ── Dark Mode ─────────────────────────────────────────────────────
  const darkStore = useDarkModeStore()
  const isDark = computed(() => darkStore.data.dark)
  const toggleDark = () => { darkStore.change_dark_mode() }

  // ── API ──────────────────────────────────────────────────────────
  const commonStore = useCommonStore()
  const API_BASE = computed(() => commonStore.data.main_url + '/holy/fire-extinguisher')

  // ── 種子資料(D 區實際清冊,API 尚未回傳前先顯示)──────────────────
  const seedItems = [
    { code: 'D區1F-A01', location: '服務中心', batchNo: 'FE-130104' },
    { code: 'D區1F-A02', location: '小舖內', batchNo: 'FE-130104' },
    { code: 'D區1F-A03', location: '香藥草教室', batchNo: 'FE-130104' },
    { code: 'D區1F-A04', location: '香藥草廁所', batchNo: 'FE-130104' },
    { code: 'D區1F-A05', location: '輔具正門', batchNo: 'FE-130104' },
    { code: 'D區1F-A06', location: '輔具側門', batchNo: 'FE-130104' },
    { code: 'D區1F-A07', location: '物管2號庫房', batchNo: 'FE-130104' },
    { code: 'D區1F-A08', location: '物管5號庫房', batchNo: 'FE-130104' },
    { code: 'D區1F-A09', location: '物管辦公室', batchNo: 'FE-130104' },
    { code: 'D區1F-A010', location: '電氣機房1', batchNo: 'FE-130104' },
    { code: 'D區1F-A011', location: '電氣機房2', batchNo: 'FE-130104' },
    { code: 'D區2F-A12', location: '電梯1', batchNo: 'FE-130104' },
    { code: 'D區2F-A13', location: '電梯2', batchNo: 'FE-130104' },
    { code: 'D區2F-A14', location: '多功能教室前', batchNo: 'FE-130104' },
    { code: 'D區2F-A15', location: '多功能教室後', batchNo: 'FE-130104' },
    { code: 'D區2F-A16', location: '庫房1', batchNo: 'FE-130104' },
    { code: 'D區2F-A17', location: '庫房2', batchNo: 'FE-130104' },
    { code: 'D區2F-A18', location: '評鑑教室1', batchNo: 'FE-130104' },
    { code: 'D區2F-A19', location: '評鑑教室2', batchNo: 'FE-130104' },
    { code: 'D區3F-A20', location: '長照辦公室1', batchNo: 'FE-130104' },
    { code: 'D區3F-A21', location: '長照辦公室2', batchNo: 'FE-130104' },
    { code: 'D區3F-A22', location: '中央製水機房1', batchNo: 'FE-130104' },
    { code: 'D區3F-A23', location: '中央製水機房2', batchNo: 'FE-130104' },
    { code: 'D區3F-A24', location: '庫房1', batchNo: 'FE-130104' },
    { code: 'D區3F-A25', location: '庫房2', batchNo: 'FE-130104' },
    { code: 'D區3F-A26', location: '電梯1', batchNo: 'FE-130104' },
    { code: 'D區BF-A27', location: '電梯2', batchNo: 'FE-130104' },
    { code: 'D區BF-A28', location: '庫房1', batchNo: 'FE-130104' },
    { code: 'D區BF-A29', location: '庫房2', batchNo: 'FE-130104' },
    { code: 'D區1F-A30', location: '輔具室內', batchNo: 'FE-130104' }
  ]

  const items = ref([])
  const loading = ref(true)

  const fetchItems = async () => {
    loading.value = true
    try {
      const list = await $fetch(`${API_BASE.value}/list`, { credentials: 'include' })
      items.value = Array.isArray(list) && list.length ? list : seedItems
    } catch (e) {
      console.error(e)
      items.value = seedItems
    } finally {
      loading.value = false
    }
  }

  // ── 樓層解析與篩選 ───────────────────────────────────────────────
  const parseFloor = (code) => {
    const m = code?.match(/(\d+F|BF\d*|B\d+F?)/i)
    return m ? m[1].toUpperCase() : '未分類'
  }

  const floors = computed(() => {
    const set = new Set(items.value.map(i => parseFloor(i.code)))
    return [...set].sort()
  })

  const floorCounts = computed(() =>
    floors.value.map(floor => ({
      floor,
      count: items.value.filter(i => parseFloor(i.code) === floor).length
    }))
  )

  const activeFloor = ref(null)
  const searchText = ref('')

  const filtered = computed(() => {
    let list = items.value
    if (activeFloor.value) list = list.filter(i => parseFloor(i.code) === activeFloor.value)
    const q = searchText.value.trim().toLowerCase()
    if (q) {
      list = list.filter(i =>
        i.code?.toLowerCase().includes(q) ||
        i.location?.toLowerCase().includes(q) ||
        i.batchNo?.toLowerCase().includes(q)
      )
    }
    return list
  })

  // ── 新增/編輯 Modal ──────────────────────────────────────────────
  const emptyItem = () => ({ code: '', location: '', batchNo: '' })
  const modal = reactive({ show: false, isNew: true, data: emptyItem() })

  const openModal = (item) => {
    modal.isNew = !item
    modal.data = item ? { ...item } : emptyItem()
    modal.show = true
  }

  const toast = reactive({ show: false, message: '' })
  const showToast = (msg) => {
    toast.message = msg
    toast.show = true
    setTimeout(() => { toast.show = false }, 2500)
  }

  const saveItem = async () => {
    if (!modal.data.code?.trim()) { showToast('請填寫編號'); return }
    try {
      if (modal.isNew) {
        const saved = await $fetch(`${API_BASE.value}/save`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, body: modal.data
        })
        items.value.push(saved ?? { ...modal.data })
      } else {
        await $fetch(`${API_BASE.value}/update/${modal.data.id ?? modal.data.code}`, {
          method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: modal.data
        })
        const idx = items.value.findIndex(i => (i.id ?? i.code) === (modal.data.id ?? modal.data.code))
        if (idx !== -1) items.value[idx] = { ...modal.data }
      }
      modal.show = false
      showToast(modal.isNew ? '新增成功' : '儲存成功')
    } catch (e) {
      console.error(e)
      showToast('儲存失敗')
    }
  }

  const removeItem = async (item) => {
    if (!confirm(`確定要刪除 ${item.code} 嗎?`)) return
    try {
      await $fetch(`${API_BASE.value}/remove/${item.id ?? item.code}`, { method: 'DELETE' })
      items.value = items.value.filter(i => (i.id ?? i.code) !== (item.id ?? item.code))
      showToast('已刪除')
    } catch (e) {
      console.error(e)
      showToast('刪除失敗')
    }
  }

  onMounted(fetchItems)
</script>

<style scoped>
  .badge-stat {
    font-size: 13px;
    padding: 3px 10px;
    border-radius: 999px;
    background: var(--surface2, #f0f1ec);
    color: var(--hint-c, #6b6f6a);
    border: 1px solid var(--border-light-c, #dadedb);
  }
  .fade-enter-active, .fade-leave-active { transition: opacity 0.2s ease; }
  .fade-enter-from, .fade-leave-to { opacity: 0; }
</style>
