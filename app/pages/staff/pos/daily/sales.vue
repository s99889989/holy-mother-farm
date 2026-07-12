<script setup lang="ts">
definePageMeta({ layout: 'staff', requiredPermission: 'pos.daily.sales' })

interface MenuType {
  typeNo: number
  typeName: string
}

interface MenuItem {
  typeNo: number
  itemNo: number
  itemName: string
  itemType: string | null
  price: number
  itemCode: string | null
}

interface CartLine {
  typeNo: number
  itemNo: number
  itemName: string
  itemType: string | null
  itemCode: string | null
  price: number
  qty: number
}

const commonStore = useCommonStore()
const apiBase = computed(() => commonStore.data.main_url)

// 資料庫暫停/開啟狀態（跨頁面共用快取，見 composables/useBk35DbStatus.ts）
const { bksqlAttached: dbAttached, checkStatus } = useBk35DbStatus()

function formatMoney(n: number) {
  if (n === null || n === undefined) return '-'
  return Number(n).toLocaleString(undefined, { maximumFractionDigits: 0 })
}

// ══════════════════ 分類 + 品項 ══════════════════

const types = ref<MenuType[]>([])
const selectedTypeNo = ref<number | null>(null) // null = 全部
const items = ref<MenuItem[]>([])
const itemsLoading = ref(false)
const itemsError = ref('')
const itemSearch = ref('')

async function fetchTypes() {
  try {
    const res = await $fetch<MenuType[] | { error: string }>(
      `${apiBase.value}/holy/bk35sql/pos/types`,
      { credentials: 'include' }
    )
    if (Array.isArray(res)) types.value = res
  } catch {
    // 分類抓不到不影響品項瀏覽，安靜失敗即可
  }
}

async function fetchItems() {
  itemsLoading.value = true
  itemsError.value = ''
  try {
    const query: Record<string, any> = {}
    if (selectedTypeNo.value !== null) query.typeNo = selectedTypeNo.value
    const res = await $fetch<MenuItem[] | { error: string }>(
      `${apiBase.value}/holy/bk35sql/pos/items`,
      { credentials: 'include', query }
    )
    if (Array.isArray(res)) {
      items.value = res
    } else {
      itemsError.value = res?.error ?? '載入品項失敗'
      items.value = []
    }
  } catch (e: any) {
    itemsError.value = e?.message ?? '載入品項失敗'
  } finally {
    itemsLoading.value = false
  }
}

function selectType(typeNo: number | null) {
  selectedTypeNo.value = typeNo
  fetchItems()
}

const filteredItems = computed(() => {
  if (!itemSearch.value.trim()) return items.value
  const kw = itemSearch.value.trim().toLowerCase()
  return items.value.filter(i => i.itemName.toLowerCase().includes(kw) || (i.itemCode ?? '').toLowerCase().includes(kw))
})

// ══════════════════ 購物車 ══════════════════

const cart = ref<CartLine[]>([])

function addToCart(item: MenuItem) {
  const existing = cart.value.find(l => l.itemNo === item.itemNo && l.typeNo === item.typeNo)
  if (existing) {
    existing.qty += 1
  } else {
    cart.value.push({
      typeNo: item.typeNo,
      itemNo: item.itemNo,
      itemName: item.itemName,
      itemType: item.itemType,
      itemCode: item.itemCode,
      price: item.price,
      qty: 1
    })
  }
}

function incQty(line: CartLine) {
  line.qty += 1
}

function decQty(line: CartLine) {
  if (line.qty <= 1) return
  line.qty -= 1
}

function removeLine(index: number) {
  cart.value.splice(index, 1)
}

function clearCart() {
  if (cart.value.length === 0) return
  if (!confirm('確定要清空購物車嗎？')) return
  cart.value = []
}

const cartTotal = computed(() =>
  cart.value.reduce((sum, l) => sum + l.price * l.qty, 0)
)

const cartCount = computed(() =>
  cart.value.reduce((sum, l) => sum + l.qty, 0)
)

// ══════════════════ 結帳 ══════════════════

const showCheckout = ref(false)
const payType = ref<'CASH' | 'OTHER'>('CASH')
const cashReceived = ref<number | null>(null)
const checkoutLoading = ref(false)
const checkoutError = ref('')
const checkoutResult = ref<{ checkNo: string; orderAmt: number; cashReceived: number; change: number } | null>(null)

function openCheckout() {
  if (cart.value.length === 0) return
  payType.value = 'CASH'
  cashReceived.value = null
  checkoutError.value = ''
  checkoutResult.value = null
  showCheckout.value = true
}

function closeCheckout() {
  showCheckout.value = false
}

const changeDue = computed(() => {
  if (payType.value !== 'CASH' || !cashReceived.value) return null
  return cashReceived.value - cartTotal.value
})

async function submitCheckout() {
  if (payType.value === 'CASH' && (!cashReceived.value || cashReceived.value < cartTotal.value)) {
    checkoutError.value = '收現金額不足'
    return
  }
  checkoutLoading.value = true
  checkoutError.value = ''
  try {
    const res = await $fetch<{ ok: boolean; error?: string; checkNo?: string; orderAmt?: number; cashReceived?: number; change?: number }>(
      `${apiBase.value}/holy/bk35sql/pos/checkout`,
      {
        method: 'POST',
        credentials: 'include',
        body: {
          items: cart.value.map(l => ({
            typeNo: l.typeNo,
            itemName: l.itemName,
            itemType: l.itemType,
            price: l.price,
            qty: l.qty,
            itemCode: l.itemCode
          })),
          payType: payType.value,
          cashReceived: payType.value === 'CASH' ? cashReceived.value : cartTotal.value
        }
      }
    )
    if (!res?.ok) {
      checkoutError.value = res?.error ?? '結帳失敗'
      return
    }
    checkoutResult.value = {
      checkNo: res.checkNo!,
      orderAmt: res.orderAmt!,
      cashReceived: res.cashReceived!,
      change: res.change!
    }
    cart.value = []
  } catch (e: any) {
    checkoutError.value = e?.message ?? '結帳失敗'
  } finally {
    checkoutLoading.value = false
  }
}

function finishCheckout() {
  showCheckout.value = false
  checkoutResult.value = null
}

await checkStatus()
await fetchTypes()
await fetchItems()
</script>

<template>
  <div class="page-wrap">
    <div class="page-header">
      <h1 class="page-title">商品販賣</h1>
    </div>

    <div v-if="dbAttached === false" class="paused-banner">
      ⏸ BKSQL 資料庫目前已暫停（Detach），查詢功能暫時無法使用，請聯繫管理員開啟資料庫後再試。
    </div>

    <template v-else>
      <div class="pos-layout">
        <!-- 左：分類 + 品項 -->
        <div class="section pos-menu-col">
          <div class="io-category-grid">
            <button
              :class="['io-category-btn', { active: selectedTypeNo === null }]"
              @click="selectType(null)"
            >
              全部
            </button>
            <button
              v-for="t in types"
              :key="t.typeNo"
              :class="['io-category-btn', { active: selectedTypeNo === t.typeNo }]"
              @click="selectType(t.typeNo)"
            >
              {{ t.typeName }}
            </button>
          </div>

          <input
            v-model="itemSearch"
            placeholder="搜尋品項名稱 / 代碼…"
            class="search-input"
            style="width: 100%"
          >

          <div v-if="itemsLoading" class="loading">載入中…</div>
          <div v-else-if="itemsError" class="error-box">{{ itemsError }}</div>
          <div v-else-if="filteredItems.length === 0" class="empty-hint">這個分類目前沒有品項</div>
          <div v-else class="pos-item-grid">
            <button
              v-for="item in filteredItems"
              :key="`${item.typeNo}-${item.itemNo}`"
              class="pos-item-btn"
              @click="addToCart(item)"
            >
              <span class="pos-item-name">{{ item.itemName }}</span>
              <span class="pos-item-price">${{ formatMoney(item.price) }}</span>
            </button>
          </div>
        </div>

        <!-- 右：購物車 -->
        <div class="section pos-cart-col">
          <div class="pos-cart-header">
            <h2 class="section-title">購物車（{{ cartCount }} 件）</h2>
            <button v-if="cart.length" class="btn-ghost small" @click="clearCart">清空</button>
          </div>

          <div v-if="cart.length === 0" class="empty-hint">尚未加入任何品項，點左邊的品項卡片加入</div>

          <div v-else class="pos-cart-lines">
            <div v-for="(line, i) in cart" :key="`${line.typeNo}-${line.itemNo}`" class="pos-cart-line">
              <div class="pos-cart-line-main">
                <span class="pos-cart-name">{{ line.itemName }}</span>
                <span class="pos-cart-unit-price">${{ formatMoney(line.price) }} / 件</span>
              </div>
              <div class="pos-cart-line-actions">
                <button class="qty-btn" @click="decQty(line)">−</button>
                <span class="qty-value">{{ line.qty }}</span>
                <button class="qty-btn" @click="incQty(line)">＋</button>
                <span class="pos-cart-subtotal">${{ formatMoney(line.price * line.qty) }}</span>
                <button class="btn-danger small" @click="removeLine(i)">移除</button>
              </div>
            </div>
          </div>

          <div class="pos-total-row">
            <span>合計</span>
            <span class="pos-total-amt">${{ formatMoney(cartTotal) }}</span>
          </div>

          <button class="btn-primary pos-checkout-btn" :disabled="cart.length === 0" @click="openCheckout">
            結帳
          </button>
        </div>
      </div>
    </template>

    <!-- ══════════════════ 結帳彈窗 ══════════════════ -->
    <div v-if="showCheckout" class="modal-overlay" @click.self="checkoutResult ? null : closeCheckout()">
      <div class="modal-box">
        <template v-if="!checkoutResult">
          <div class="modal-header">
            <h2 class="section-title">確認結帳</h2>
            <button class="btn-ghost small" @click="closeCheckout">✕ 關閉</button>
          </div>

          <div class="pos-checkout-total">應收：${{ formatMoney(cartTotal) }}</div>

          <div class="form-row">
            <label class="form-label">付款方式</label>
            <div class="tab-switch">
              <button :class="['sw-tab', { active: payType === 'CASH' }]" @click="payType = 'CASH'">現金</button>
              <button :class="['sw-tab', { active: payType === 'OTHER' }]" @click="payType = 'OTHER'">其他</button>
            </div>
          </div>

          <div v-if="payType === 'CASH'" class="form-row">
            <label class="form-label">收現金額</label>
            <input v-model.number="cashReceived" type="number" min="0" step="1" class="form-input" placeholder="輸入收到的金額">
            <p v-if="changeDue !== null" class="section-hint">
              找零：${{ formatMoney(changeDue) }}
            </p>
          </div>

          <div v-if="checkoutError" class="error-box">{{ checkoutError }}</div>

          <div class="modal-actions">
            <button class="btn-primary" :disabled="checkoutLoading" @click="submitCheckout">
              {{ checkoutLoading ? '送出中…' : '確認送出' }}
            </button>
            <button class="btn-ghost" @click="closeCheckout">取消</button>
          </div>
        </template>

        <template v-else>
          <div class="modal-header">
            <h2 class="section-title">結帳完成 ✓</h2>
          </div>
          <div class="pos-receipt">
            <p>單號：{{ checkoutResult.checkNo }}</p>
            <p>應收：${{ formatMoney(checkoutResult.orderAmt) }}</p>
            <p>實收：${{ formatMoney(checkoutResult.cashReceived) }}</p>
            <p class="pos-receipt-change">找零：${{ formatMoney(checkoutResult.change) }}</p>
          </div>
          <div class="modal-actions">
            <button class="btn-primary" @click="finishCheckout">完成，繼續下一筆</button>
          </div>
        </template>
      </div>
    </div>
  </div>
</template>

<style scoped>
.page-wrap { padding: 20px; display: flex; flex-direction: column; gap: 12px; }
.page-header { display: flex; align-items: center; gap: 16px; flex-wrap: wrap; }
.page-title { font-size: 20px; font-weight: 700; color: var(--text); margin: 0; }

.paused-banner { font-size: 13px; color: #92400e; background: #fef3c7; border: 1px solid #fde68a; border-radius: var(--radius-sm); padding: 12px 16px; }

.search-input { padding: 7px 12px; font-size: 13px; border: 1px solid var(--border); border-radius: var(--radius-sm); background: var(--surface); color: var(--text); outline: none; }
.search-input:focus { border-color: var(--accent); }

.btn-primary { padding: 7px 16px; background: var(--accent); color: #fff; border: none; border-radius: var(--radius-sm); font-size: 13px; cursor: pointer; }
.btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
.btn-ghost { padding: 7px 12px; background: transparent; color: var(--text-muted); border: 1px solid var(--border); border-radius: var(--radius-sm); font-size: 13px; cursor: pointer; }
.btn-ghost.small { padding: 4px 10px; font-size: 12px; }
.btn-danger { padding: 7px 16px; background: #c0392b; color: #fff; border: none; border-radius: var(--radius-sm); font-size: 13px; cursor: pointer; }
.btn-danger.small { padding: 4px 10px; font-size: 12px; }

.loading { color: var(--text-hint); font-size: 14px; }
.error-box { color: #c0392b; font-size: 13px; background: #fdecea; border: 1px solid #f5c6cb; border-radius: var(--radius-sm); padding: 10px 14px; }
.empty-hint { color: var(--text-hint); font-size: 13px; padding: 8px 0; }

.section { background: var(--surface); border: 1px solid var(--border-light); border-radius: var(--radius); padding: 16px 18px; display: flex; flex-direction: column; gap: 10px; }
.section-title { font-size: 15px; font-weight: 700; color: var(--text); margin: 0; }
.section-hint { font-size: 12px; color: var(--text-hint); margin: 0; line-height: 1.6; }

.form-row { display: flex; flex-direction: column; gap: 4px; }
.form-label { font-size: 12px; color: var(--text-muted); font-weight: 600; }
.form-input { padding: 8px 10px; font-size: 13px; border: 1px solid var(--border); border-radius: var(--radius-sm); background: var(--surface); color: var(--text); outline: none; }
.form-input:focus { border-color: var(--accent); }

.tab-switch { display: flex; border: 1px solid var(--border); border-radius: var(--radius-sm); overflow: hidden; width: fit-content; }
.sw-tab { padding: 6px 16px; font-size: 13px; border: none; background: var(--surface); color: var(--text-muted); cursor: pointer; }
.sw-tab.active { background: var(--accent); color: #fff; }

/* 版面 */
.pos-layout { display: flex; gap: 12px; align-items: flex-start; flex-wrap: wrap; }
.pos-menu-col { flex: 1 1 500px; }
.pos-cart-col { flex: 0 1 380px; max-width: 380px; position: sticky; top: 12px; }

/* 分類格 */
.io-category-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(72px, 1fr)); gap: 6px; }
.io-category-btn { padding: 10px 6px; font-size: 13px; font-weight: 600; border: 1px solid #d4c72a; border-radius: var(--radius-sm); background: #fff9c4; color: #5c5220; cursor: pointer; text-align: center; }
.io-category-btn:hover { background: #fff59d; }
.io-category-btn.active { background: #fbc02d; border-color: #f9a825; color: #4a3f00; }

/* 品項格 */
.pos-item-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(120px, 1fr)); gap: 8px; max-height: 560px; overflow-y: auto; padding: 2px; }
.pos-item-btn { display: flex; flex-direction: column; align-items: center; gap: 4px; padding: 14px 8px; border: 1px solid var(--border); border-radius: var(--radius-sm); background: var(--surface); color: var(--text); cursor: pointer; text-align: center; min-height: 70px; }
.pos-item-btn:hover { border-color: var(--accent); background: var(--accent-light); }
.pos-item-name { font-size: 13px; font-weight: 600; line-height: 1.4; }
.pos-item-price { font-size: 12px; color: var(--text-muted); }

/* 購物車 */
.pos-cart-header { display: flex; align-items: center; justify-content: space-between; }
.pos-cart-lines { display: flex; flex-direction: column; gap: 8px; max-height: 420px; overflow-y: auto; }
.pos-cart-line { display: flex; flex-direction: column; gap: 6px; padding: 8px 0; border-bottom: 1px solid var(--border-light); }
.pos-cart-line:last-child { border-bottom: none; }
.pos-cart-line-main { display: flex; justify-content: space-between; align-items: baseline; }
.pos-cart-name { font-size: 13px; font-weight: 600; color: var(--text); }
.pos-cart-unit-price { font-size: 11px; color: var(--text-hint); }
.pos-cart-line-actions { display: flex; align-items: center; gap: 8px; }
.qty-btn { width: 24px; height: 24px; border-radius: 50%; border: 1px solid var(--border); background: var(--surface); color: var(--text); cursor: pointer; font-size: 14px; line-height: 1; }
.qty-btn:hover { border-color: var(--accent); color: var(--accent); }
.qty-value { min-width: 20px; text-align: center; font-size: 13px; }
.pos-cart-subtotal { margin-left: auto; font-size: 13px; font-weight: 600; color: var(--text); }

.pos-total-row { display: flex; justify-content: space-between; align-items: center; padding-top: 8px; border-top: 1px solid var(--border-light); font-size: 15px; font-weight: 700; color: var(--text); }
.pos-total-amt { font-size: 20px; color: var(--accent); }
.pos-checkout-btn { width: 100%; padding: 12px; font-size: 15px; font-weight: 700; }

/* 結帳彈窗 */
.modal-overlay { position: fixed; inset: 0; background: rgba(0, 0, 0, 0.45); display: flex; align-items: center; justify-content: center; z-index: 100; padding: 24px; }
.modal-box { background: var(--surface); border-radius: var(--radius); padding: 20px 24px; width: min(420px, 100%); max-height: 85vh; overflow-y: auto; display: flex; flex-direction: column; gap: 14px; }
.modal-header { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.modal-actions { display: flex; gap: 8px; justify-content: flex-end; padding-top: 4px; }
.pos-checkout-total { font-size: 18px; font-weight: 700; color: var(--text); text-align: center; }

.pos-receipt { display: flex; flex-direction: column; gap: 6px; font-size: 14px; color: var(--text); background: var(--surface2); border-radius: var(--radius-sm); padding: 14px 16px; }
.pos-receipt-change { font-size: 18px; font-weight: 700; color: var(--accent); }
</style>
