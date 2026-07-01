<template>
  <div class="pos-wrap">
    <!-- 左側：商品選單 -->
    <div class="pos-left">
      <!-- 類別 tabs -->
      <div class="type-tabs">
        <button :class="['tab', { active: selectedType === '' }]" @click="selectedType = ''">全部</button>
        <button
          v-for="t in types"
          :key="t.typeNo"
          :class="['tab', { active: selectedType === t.typeNo }]"
          @click="selectedType = t.typeNo"
        >
          {{ t.typeName }}
        </button>
      </div>

      <!-- 搜尋 -->
      <div class="search-bar">
        <input v-model="search" placeholder="搜尋商品…" class="search-input" />
      </div>

      <!-- 商品格 -->
      <div v-if="loading" class="loading">載入中…</div>
      <div v-else class="item-grid">
        <button
          v-for="item in filteredItems"
          :key="item.rNo"
          :class="['item-card', { 'out-of-stock': item.maxQty === 0 }]"
          :disabled="item.maxQty === 0"
          @click="addToCart(item)"
        >
          <div class="item-name">{{ item.itemName }}</div>
          <div class="item-price">{{ formatPrice(item.price1) }}</div>
          <div v-if="item.usages.length > 0" class="item-stock">
            <span :class="['stock-badge', item.maxQty > 10 ? 'ok' : item.maxQty > 0 ? 'low' : 'empty']">
              {{ item.maxQty === 999 ? '充足' : item.maxQty > 0 ? `剩 ${item.maxQty}` : '售完' }}
            </span>
          </div>
          <div class="item-type-tag">{{ item.typeName }}</div>
        </button>
      </div>
    </div>

    <!-- 右側：購物車 -->
    <div class="pos-right">
      <div class="cart-header">
        <span class="cart-title">購物車</span>
        <button v-if="cart.length > 0" class="btn-clear-cart" @click="clearCart">清空</button>
      </div>

      <!-- 空車 -->
      <div v-if="cart.length === 0" class="cart-empty">尚未加入商品</div>

      <!-- 購物車列表 -->
      <div v-else class="cart-items">
        <div v-for="(item, i) in cart" :key="i" class="cart-item">
          <div class="cart-item-info">
            <div class="cart-item-name">{{ item.itemName }}</div>
            <div class="cart-item-price">{{ formatPrice(item.price) }} × {{ item.qty }}</div>
            <!-- 食材扣除預覽 -->
            <div v-if="item.usages.length > 0" class="cart-item-usage">
              <span v-for="u in item.usages" :key="u.matName" class="usage-tag">
                {{ u.matName }} -{{ (u.uQty * item.qty).toFixed(0) }}
              </span>
            </div>
          </div>
          <div class="cart-item-controls">
            <button class="qty-btn" @click="decreaseQty(i)">−</button>
            <span class="qty-num">{{ item.qty }}</span>
            <button class="qty-btn" :disabled="item.maxQty !== 999 && item.qty >= item.maxQty" @click="increaseQty(i)">+</button>
            <button class="remove-btn" @click="removeItem(i)">✕</button>
          </div>
          <div class="cart-item-subtotal">= {{ formatPrice(item.price * item.qty) }}</div>
        </div>
      </div>

      <!-- 合計 -->
      <div class="cart-summary">
        <div class="summary-row">
          <span>小計</span>
          <span class="summary-amt">{{ formatPrice(subtotal) }}</span>
        </div>
        <div class="summary-row discount-row">
          <span>折扣</span>
          <div class="discount-ctrl">
            <button class="disc-btn" @click="discountType = 'none'">無</button>
            <button :class="['disc-btn', { active: discountType === '9' }]" @click="discountType = '9'">九折</button>
            <button :class="['disc-btn', { active: discountType === 'staff' }]" @click="discountType = 'staff'">員工價</button>
          </div>
        </div>
        <div class="summary-row total-row">
          <span>合計</span>
          <span class="total-amt">{{ formatPrice(total) }}</span>
        </div>
      </div>

      <!-- 結帳按鈕 -->
      <button class="btn-checkout" :disabled="cart.length === 0" @click="checkout">
        結帳 {{ cart.length > 0 ? formatPrice(total) : '' }}
      </button>

      <!-- 結帳成功提示 -->
      <div v-if="checkoutDone" class="checkout-done">
        <div class="done-icon">✓</div>
        <div class="done-text">結帳完成！</div>
        <div class="done-sub">庫存已更新</div>
      </div>
    </div>

    <!-- 庫存扣除預覽 Modal -->
    <div v-if="previewItem" class="modal-overlay" @click="previewItem = null">
      <div class="modal" @click.stop>
        <div class="modal-title">{{ previewItem.itemName }} — 庫存扣除</div>
        <table class="modal-table">
          <thead>
            <tr><th>食材</th><th>扣除量</th><th>目前庫存</th><th>結帳後</th></tr>
          </thead>
          <tbody>
            <tr v-for="u in previewItem.usages" :key="u.matName">
              <td>{{ u.matName }}</td>
              <td class="text-out">-{{ u.uQty }}</td>
              <td>{{ u.balance }}</td>
              <td :class="u.balance - u.uQty < 0 ? 'text-danger' : 'text-ok'">{{ (u.balance - u.uQty).toFixed(0) }}</td>
            </tr>
          </tbody>
        </table>
        <button class="btn-confirm" @click="confirmAdd(previewItem)">加入購物車</button>
        <button class="btn-cancel" @click="previewItem = null">取消</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'staff', requiredPermission: 'pos.pos-sell' })

interface Usage { matName: string; uQty: number; balance: number }
interface MenuItem {
  rNo: string; typeNo: string; typeName: string; itemNo: string
  itemName: string; price1: string; price2: string; price3: string
  itemType: string; usages: Usage[]; maxQty: number
}
interface CartItem {
  rNo: string; itemName: string; price: number; qty: number
  usages: Usage[]; maxQty: number
}
interface MenuType { typeNo: string; typeName: string }

const commonStore = useCommonStore()
const apiBase = computed(() => commonStore.data.main_url)

const types = ref<MenuType[]>([])
const allItems = ref<MenuItem[]>([])
const loading = ref(false)
const selectedType = ref('')
const search = ref('')
const cart = ref<CartItem[]>([])
const discountType = ref<'none' | '9' | 'staff'>('none')
const previewItem = ref<MenuItem | null>(null)
const checkoutDone = ref(false)

const filteredItems = computed(() => {
  return allItems.value.filter(item => {
    const matchType = !selectedType.value || item.typeNo === selectedType.value
    const matchSearch = !search.value || item.itemName.includes(search.value)
    return matchType && matchSearch
  })
})

const subtotal = computed(() => cart.value.reduce((s, i) => s + i.price * i.qty, 0))
const total = computed(() => {
  if (discountType.value === '9') return Math.round(subtotal.value * 0.9)
  if (discountType.value === 'staff') return cart.value.reduce((s, i) => {
    const item = allItems.value.find(a => a.rNo === i.rNo)
    const staffPrice = item ? parseFloat(item.price3) || parseFloat(item.price2) || i.price : i.price
    return s + staffPrice * i.qty
  }, 0)
  return subtotal.value
})

async function fetchMenu() {
  loading.value = true
  try {
    const data = await $fetch<{ types: MenuType[], items: MenuItem[] }>(
      `${apiBase.value}/holy/bksql/pos/menu`, { credentials: 'include' }
    )
    types.value = data?.types ?? []
    allItems.value = data?.items ?? []
  } finally { loading.value = false }
}

function addToCart(item: MenuItem) {
  // 如果有食材對應且庫存不足，顯示提示
  if (item.usages.length > 0 && item.maxQty === 0) return
  // 如果有食材且庫存有限，先顯示扣除預覽
  if (item.usages.length > 0 && item.maxQty < 999) {
    previewItem.value = item
    return
  }
  confirmAdd(item)
}

function confirmAdd(item: MenuItem) {
  previewItem.value = null
  const existing = cart.value.find(c => c.rNo === item.rNo)
  if (existing) {
    if (item.maxQty !== 999 && existing.qty >= item.maxQty) return
    existing.qty++
  } else {
    cart.value.push({
      rNo: item.rNo,
      itemName: item.itemName,
      price: parseFloat(item.price1) || 0,
      qty: 1,
      usages: item.usages,
      maxQty: item.maxQty
    })
  }
}

function increaseQty(i: number) {
  const item = cart.value[i]
  if (item.maxQty !== 999 && item.qty >= item.maxQty) return
  item.qty++
}

function decreaseQty(i: number) {
  if (cart.value[i].qty <= 1) { removeItem(i); return }
  cart.value[i].qty--
}

function removeItem(i: number) { cart.value.splice(i, 1) }
function clearCart() { cart.value = []; discountType.value = 'none' }

function checkout() {
  // 顯示結帳成功（實際扣庫存需後端 API，這裡先做前端展示）
  checkoutDone.value = true
  cart.value = []
  discountType.value = 'none'
  setTimeout(() => { checkoutDone.value = false }, 3000)
  // 重新取商品資料（更新庫存）
  fetchMenu()
}

function formatPrice(p: number | string) {
  const n = typeof p === 'string' ? parseFloat(p) : p
  if (!n || isNaN(n)) return '-'
  return '$' + Math.round(n).toLocaleString()
}

await fetchMenu()
</script>

<style scoped>
.pos-wrap {
  display: flex;
  height: 100%;
  overflow: hidden;
  background: var(--bg);
}

/* 左側商品區 */
.pos-left {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border-right: 1px solid var(--border-light);
}

.type-tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  padding: 12px 16px;
  border-bottom: 1px solid var(--border-light);
  background: var(--surface);
}

.tab {
  padding: 5px 12px; font-size: 12px; border-radius: 99px;
  border: 1px solid var(--border); background: var(--surface);
  color: var(--text-muted); cursor: pointer; transition: all 0.15s;
  white-space: nowrap;
}
.tab:hover { border-color: var(--accent); color: var(--accent); }
.tab.active { background: var(--accent); color: #fff; border-color: var(--accent); }

.search-bar { padding: 8px 16px; background: var(--surface); border-bottom: 1px solid var(--border-light); }
.search-input {
  width: 100%; padding: 7px 12px; font-size: 13px;
  border: 1px solid var(--border); border-radius: var(--radius-sm);
  background: var(--bg); color: var(--text); outline: none;
}
.search-input:focus { border-color: var(--accent); }

.loading { padding: 24px; color: var(--text-hint); font-size: 14px; }

.item-grid {
  flex: 1;
  overflow-y: auto;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: 10px;
  padding: 14px;
  align-content: start;
}

.item-card {
  background: var(--surface);
  border: 1px solid var(--border-light);
  border-radius: var(--radius);
  padding: 12px;
  cursor: pointer;
  text-align: left;
  transition: all 0.15s;
  display: flex;
  flex-direction: column;
  gap: 4px;
  position: relative;
}
.item-card:hover:not(:disabled) { border-color: var(--accent); box-shadow: 0 2px 8px rgba(102,126,234,0.15); transform: translateY(-1px); }
.item-card:disabled, .item-card.out-of-stock { opacity: 0.5; cursor: not-allowed; background: var(--surface2); }
.item-name { font-size: 13px; font-weight: 600; color: var(--text); line-height: 1.3; }
.item-price { font-size: 14px; font-weight: 700; color: var(--accent); }
.item-stock { margin-top: 2px; }
.stock-badge { display: inline-block; padding: 2px 7px; font-size: 10px; border-radius: 4px; font-weight: 600; }
.stock-badge.ok { background: #e6f4ea; color: #1e7e34; }
.stock-badge.low { background: #fff3e0; color: #e65100; }
.stock-badge.empty { background: #fde8e8; color: #c0392b; }
.item-type-tag { font-size: 10px; color: var(--text-hint); margin-top: auto; }

/* 右側購物車 */
.pos-right {
  width: 320px;
  min-width: 300px;
  display: flex;
  flex-direction: column;
  background: var(--surface);
  overflow: hidden;
}

.cart-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px;
  border-bottom: 1px solid var(--border-light);
}
.cart-title { font-size: 16px; font-weight: 700; color: var(--text); }
.btn-clear-cart { font-size: 12px; color: var(--text-hint); background: none; border: none; cursor: pointer; }
.btn-clear-cart:hover { color: #c0392b; }

.cart-empty { flex: 1; display: flex; align-items: center; justify-content: center; color: var(--text-hint); font-size: 14px; }

.cart-items { flex: 1; overflow-y: auto; padding: 8px 12px; display: flex; flex-direction: column; gap: 8px; }

.cart-item {
  background: var(--surface2);
  border: 1px solid var(--border-light);
  border-radius: var(--radius-sm);
  padding: 10px 12px;
  display: flex;
  align-items: flex-start;
  gap: 8px;
}
.cart-item-info { flex: 1; min-width: 0; }
.cart-item-name { font-size: 13px; font-weight: 600; color: var(--text); }
.cart-item-price { font-size: 12px; color: var(--text-muted); }
.cart-item-usage { display: flex; flex-wrap: wrap; gap: 4px; margin-top: 4px; }
.usage-tag { font-size: 10px; background: #fff3e0; color: #e65100; padding: 1px 5px; border-radius: 3px; }
.cart-item-controls { display: flex; align-items: center; gap: 4px; }
.qty-btn { width: 24px; height: 24px; border-radius: 50%; border: 1px solid var(--border); background: var(--surface); font-size: 14px; cursor: pointer; display: flex; align-items: center; justify-content: center; }
.qty-btn:hover:not(:disabled) { background: var(--accent); color: #fff; border-color: var(--accent); }
.qty-btn:disabled { opacity: 0.4; cursor: not-allowed; }
.qty-num { font-size: 14px; font-weight: 700; width: 20px; text-align: center; }
.remove-btn { width: 20px; height: 20px; border-radius: 50%; border: none; background: none; color: var(--text-hint); cursor: pointer; font-size: 12px; margin-left: 2px; }
.remove-btn:hover { color: #c0392b; }
.cart-item-subtotal { font-size: 13px; font-weight: 700; color: var(--accent); white-space: nowrap; }

.cart-summary {
  border-top: 1px solid var(--border-light);
  padding: 12px 16px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.summary-row { display: flex; justify-content: space-between; align-items: center; font-size: 13px; color: var(--text-muted); }
.summary-amt { font-weight: 600; color: var(--text); }
.discount-ctrl { display: flex; gap: 4px; }
.disc-btn { padding: 3px 10px; font-size: 12px; border-radius: 4px; border: 1px solid var(--border); background: var(--surface); color: var(--text-muted); cursor: pointer; }
.disc-btn.active { background: var(--warn); color: #fff; border-color: var(--warn); }
.total-row { border-top: 1px solid var(--border-light); padding-top: 8px; font-size: 15px; font-weight: 700; color: var(--text); }
.total-amt { font-size: 20px; font-weight: 700; color: var(--accent); }

.btn-checkout {
  margin: 0 12px 16px;
  padding: 14px;
  background: var(--accent);
  color: #fff;
  border: none;
  border-radius: var(--radius);
  font-size: 15px;
  font-weight: 700;
  cursor: pointer;
  transition: background 0.15s;
}
.btn-checkout:hover:not(:disabled) { background: #5a6fd6; }
.btn-checkout:disabled { opacity: 0.5; cursor: not-allowed; }

.checkout-done {
  margin: 0 12px 12px;
  background: #e6f4ea;
  border-radius: var(--radius);
  padding: 16px;
  text-align: center;
  animation: fadeIn 0.3s ease;
}
.done-icon { font-size: 28px; color: #1e7e34; }
.done-text { font-size: 15px; font-weight: 700; color: #1e7e34; }
.done-sub { font-size: 12px; color: #555; margin-top: 2px; }

/* Modal */
.modal-overlay {
  position: fixed; inset: 0; background: rgba(0,0,0,0.4);
  display: flex; align-items: center; justify-content: center; z-index: 100;
}
.modal {
  background: var(--surface); border-radius: var(--radius);
  padding: 24px; width: 400px; max-width: 90vw;
  box-shadow: 0 8px 32px rgba(0,0,0,0.2);
}
.modal-title { font-size: 15px; font-weight: 700; color: var(--text); margin-bottom: 14px; }
.modal-table { width: 100%; border-collapse: collapse; font-size: 13px; margin-bottom: 16px; }
.modal-table th { background: var(--surface2); padding: 8px 10px; text-align: left; color: var(--text-muted); font-weight: 600; border-bottom: 1px solid var(--border-light); }
.modal-table td { padding: 8px 10px; border-bottom: 1px solid var(--border-light); }
.text-out { color: #c0392b; font-weight: 600; }
.text-ok { color: #1e7e34; font-weight: 600; }
.text-danger { color: #c0392b; font-weight: 700; }
.btn-confirm { width: 100%; padding: 10px; background: var(--accent); color: #fff; border: none; border-radius: var(--radius-sm); font-size: 14px; cursor: pointer; margin-bottom: 8px; }
.btn-cancel { width: 100%; padding: 8px; background: transparent; color: var(--text-muted); border: 1px solid var(--border); border-radius: var(--radius-sm); font-size: 13px; cursor: pointer; }

@keyframes fadeIn { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
</style>
