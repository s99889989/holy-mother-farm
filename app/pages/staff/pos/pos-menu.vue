<template>
  <div class="page-wrap">
    <div class="page-header">
      <h1 class="page-title">商品管理</h1>
      <span class="page-sub">共 {{ total }} 項商品</span>
    </div>

    <!-- 篩選列 -->
    <div class="filter-bar">
      <div class="type-tabs">
        <button :class="['tab', { active: selectedType === '' }]" @click="selectType('')">全部</button>
        <button
          v-for="t in types"
          :key="t.typeNo"
          :class="['tab', { active: selectedType === t.typeNo }]"
          @click="selectType(t.typeNo)"
        >
          {{ t.typeName }}
        </button>
      </div>
      <div class="search-row">
        <input v-model="search" placeholder="搜尋商品名稱…" class="search-input" @keyup.enter="fetchItems(1)" />
        <button class="btn-primary" @click="fetchItems(1)">搜尋</button>
        <button v-if="search" class="btn-ghost" @click="search = ''; fetchItems(1)">清除</button>
      </div>
    </div>

    <!-- 載入中 -->
    <div v-if="loading" class="loading">載入中…</div>

    <!-- 商品表格 -->
    <div v-else class="table-wrap">
      <table class="data-table">
        <thead>
        <tr>
          <th>類別</th>
          <th>品號</th>
          <th>商品名稱</th>
          <th class="text-right">定價</th>
          <th class="text-right">優惠價</th>
          <th class="text-right">員工價</th>
          <th>類型</th>
        </tr>
        </thead>
        <tbody>
        <tr v-for="item in items" :key="item.rNo">
          <td><span class="type-badge">{{ item.typeName }}</span></td>
          <td class="text-muted">{{ item.itemNo }}</td>
          <td class="item-name">{{ item.itemName }}</td>
          <td class="text-right text-price">{{ formatPrice(item.price1) }}</td>
          <td class="text-right text-muted">{{ formatPrice(item.price2) }}</td>
          <td class="text-right text-muted">{{ formatPrice(item.price3) }}</td>
          <td><span :class="['item-type', getTypeClass(item.itemType)]">{{ item.itemType }}</span></td>
        </tr>
        </tbody>
      </table>
    </div>

    <!-- 分頁 -->
    <div v-if="totalPages > 1" class="pagination">
      <button :disabled="currentPage === 1" class="page-btn" @click="fetchItems(currentPage - 1)">‹ 上一頁</button>
      <span class="page-info">第 {{ currentPage }} / {{ totalPages }} 頁</span>
      <button :disabled="currentPage === totalPages" class="page-btn" @click="fetchItems(currentPage + 1)">下一頁 ›</button>
    </div>
  </div>
</template>

<script setup lang="ts">
  definePageMeta({ layout: 'staff', requiredPermission: 'pos.pos-menu' })

  interface MenuType { typeNo: string; typeName: string }
  interface MenuItem {
    rNo: string; typeNo: string; typeName: string; itemNo: string
    itemName: string; price1: string; price2: string; price3: string; itemType: string
  }

  const commonStore = useCommonStore()
  const apiBase = computed(() => commonStore.data.main_url)

  const types = ref<MenuType[]>([])
  const items = ref<MenuItem[]>([])
  const total = ref(0)
  const totalPages = ref(1)
  const currentPage = ref(1)
  const selectedType = ref('')
  const search = ref('')
  const loading = ref(false)

  async function fetchTypes() {
    types.value = await $fetch<MenuType[]>(`${apiBase.value}/holy/bksql/menu/types`, { credentials: 'include' }) ?? []
  }

  async function fetchItems(page: number) {
    loading.value = true
    currentPage.value = page
    try {
      const data = await $fetch<{ items: MenuItem[], total: number, totalPages: number }>(
        `${apiBase.value}/holy/bksql/menu/items`,
          { credentials: 'include', query: { typeNo: selectedType.value, search: search.value, page } }
      )
      items.value = data?.items ?? []
      total.value = data?.total ?? 0
      totalPages.value = data?.totalPages ?? 1
    } finally { loading.value = false }
  }

  function selectType(typeNo: string) {
    selectedType.value = typeNo
    search.value = ''
    fetchItems(1)
  }

  function formatPrice(p: string) {
    const n = parseFloat(p)
    if (!n || n === 0) return '-'
    return `$${n.toLocaleString()}`
  }

  function getTypeClass(t: string) {
    if (t === 'S1' || t === 'S2') return 'type-s'
    if (t === '-') return 'type-dash'
    return 'type-other'
  }

  await fetchTypes()
  await fetchItems(1)
</script>

<style scoped>
  .page-wrap { padding: 24px; display: flex; flex-direction: column; gap: 16px; }
  .page-header { display: flex; align-items: baseline; gap: 12px; }
  .page-title { font-size: 20px; font-weight: 700; color: var(--text); margin: 0; }
  .page-sub { font-size: 13px; color: var(--text-hint); }

  .filter-bar { display: flex; flex-direction: column; gap: 10px; }
  .type-tabs { display: flex; flex-wrap: wrap; gap: 6px; }
  .tab {
    padding: 5px 12px; font-size: 12px; border-radius: 99px;
    border: 1px solid var(--border); background: var(--surface);
    color: var(--text-muted); cursor: pointer; transition: all 0.15s;
  }
  .tab:hover { border-color: var(--accent); color: var(--accent); }
  .tab.active { background: var(--accent); color: #fff; border-color: var(--accent); }

  .search-row { display: flex; gap: 8px; align-items: center; }
  .search-input {
    width: 280px; padding: 7px 12px; font-size: 13px;
    border: 1px solid var(--border); border-radius: var(--radius-sm);
    background: var(--surface); color: var(--text); outline: none;
  }
  .search-input:focus { border-color: var(--accent); }
  .btn-primary { padding: 7px 16px; background: var(--accent); color: #fff; border: none; border-radius: var(--radius-sm); font-size: 13px; cursor: pointer; }
  .btn-ghost { padding: 7px 12px; background: transparent; color: var(--text-muted); border: 1px solid var(--border); border-radius: var(--radius-sm); font-size: 13px; cursor: pointer; }

  .loading { color: var(--text-hint); font-size: 14px; }
  .table-wrap { overflow-x: auto; border: 1px solid var(--border-light); border-radius: var(--radius); background: var(--surface); }
  .data-table { width: 100%; border-collapse: collapse; font-size: 13px; }
  .data-table th { background: var(--surface2); padding: 10px 14px; text-align: left; font-weight: 600; color: var(--text-muted); border-bottom: 1px solid var(--border-light); white-space: nowrap; }
  .data-table td { padding: 9px 14px; border-bottom: 1px solid var(--border-light); color: var(--text); }
  .data-table tr:last-child td { border-bottom: none; }
  .data-table tr:hover td { background: var(--accent-light); }
  .data-table th.text-right,
  .data-table td.text-right { text-align: right; }
  .text-muted { color: var(--text-muted); }
  .text-price { font-weight: 600; color: var(--text); }
  .item-name { font-weight: 500; }

  .type-badge {
    display: inline-block; padding: 2px 8px; font-size: 11px; border-radius: 4px;
    background: var(--accent-light); color: var(--accent); font-weight: 500;
  }
  .item-type { display: inline-block; padding: 2px 8px; font-size: 11px; border-radius: 4px; }
  .type-s { background: #e6f4ea; color: #1e7e34; }
  .type-dash { background: #f5f5f5; color: #888; }
  .type-other { background: #fff3e0; color: #e65100; }

  .pagination { display: flex; align-items: center; gap: 12px; justify-content: center; }
  .page-btn { padding: 6px 14px; background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius-sm); font-size: 13px; cursor: pointer; color: var(--text); }
  .page-btn:hover:not(:disabled) { background: var(--accent-light); border-color: var(--accent); color: var(--accent); }
  .page-btn:disabled { opacity: 0.4; cursor: not-allowed; }
  .page-info { font-size: 13px; color: var(--text-muted); }
</style>
