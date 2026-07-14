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
    openCode: string | null
  }

  interface CartLine {
    typeNo: number
    itemNo: number
    itemName: string
    itemType: string | null
    itemCode: string | null
    price: number
    qty: number
    isCustomPrice: boolean
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

  const MAX_TYPE_NO = 24 // 分類只顯示 TypeNo 1~24（依實際 TypeNo 數值篩選，不是取陣列前幾筆）
  const MAX_ITEM_NO = 24 // 品項只顯示 ItemNo 1~24（依實際 ItemNo 數值篩選，不是取陣列前幾筆）

  const types = ref<MenuType[]>([])
  const selectedTypeNo = ref<number | null>(null)
  const items = ref<MenuItem[]>([])
  const itemsLoading = ref(false)
  const itemsError = ref('')
  const itemSearch = ref('')

  // 分類依 TypeNo 1~24 篩選，並依 TypeNo 由小到大排序；超過 24 的不顯示
  const sortedTypes = computed(() =>
    types.value
      .filter(t => t.typeNo >= 1 && t.typeNo <= MAX_TYPE_NO)
      .sort((a, b) => a.typeNo - b.typeNo)
  )

  // 分類配色（依畫面順序循環套用，仿實體 POS 面板配色）
  const categoryPalette = [
    '#f8bbd0', '#ffffff', '#fff59d', '#c8e6c9', '#b3e5fc', '#f48fb1',
    '#ef9a9a', '#ffcc80', '#fff176', '#66bb6a', '#4dd0e1', '#f06292',
    '#ff8a80', '#ffb74d', '#dce775', '#81c784', '#4fc3f7', '#ba68c8'
  ]
  function categoryColor(i: number) {
    return categoryPalette[i % categoryPalette.length]
  }

  // 品項配色
  const itemPalette = [
    '#a5d6a7', '#fff59d', '#80deea', '#f48fb1', '#ffcc80', '#ce93d8',
    '#c5e1a5', '#fff176', '#4dd0e1', '#f06292', '#ffab91', '#b39ddb'
  ]
  function itemColor(i: number) {
    return itemPalette[i % itemPalette.length]
  }

  async function fetchTypes() {
    try {
      const res = await $fetch<MenuType[] | { error: string }>(
        `${apiBase.value}/holy/bk35sql/pos/types`,
          { credentials: 'include' }
      )
      if (Array.isArray(res)) {
        types.value = res
        // 預設選第一個分類（按 TypeNo 排序後的第一筆），不再有「全部」選項
        if (selectedTypeNo.value === null && sortedTypes.value.length > 0) {
          selectedTypeNo.value = sortedTypes.value[0].typeNo
        }
      }
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

  function selectType(typeNo: number) {
    selectedTypeNo.value = typeNo
    fetchItems()
  }

  // 未搜尋時：依 ItemNo 1~24 對應固定格子位置，缺號的 ItemNo 該格保持空白（不遞補下一個品項）
  // 搜尋時：改成緊湊列表顯示符合條件的品項
  const filteredItems = computed<(MenuItem | null)[]>(() => {
    const itemMap = new Map<number, MenuItem>()
    for (const i of items.value) {
      if (i.itemNo >= 1 && i.itemNo <= MAX_ITEM_NO) itemMap.set(i.itemNo, i)
    }

    if (itemSearch.value.trim()) {
      const kw = itemSearch.value.trim().toLowerCase()
      return [...itemMap.values()]
        .filter(i => i.itemName.toLowerCase().includes(kw) || (i.itemCode ?? '').toLowerCase().includes(kw))
        .sort((a, b) => a.itemNo - b.itemNo)
    }

    const slots: (MenuItem | null)[] = []
    for (let n = 1; n <= MAX_ITEM_NO; n++) {
      slots.push(itemMap.get(n) ?? null)
    }
    return slots
  })

  const hasVisibleItems = computed(() => filteredItems.value.some(i => i !== null))

  // ══════════════════ 購物車 ══════════════════

  const cart = ref<CartLine[]>([])

  function addToCart(item: MenuItem, customPrice?: number) {
    const isCustom = item.openCode === 'Y'
    if (isCustom && customPrice === undefined) {
      openCustomPricePad(item)
      return
    }
    const finalPrice = isCustom ? (customPrice ?? 0) : item.price
    // 時價品項每次都當成新的一列（同品項不同金額不能合併），一般品項才合併累加數量
    const existing = !isCustom
      ? cart.value.find(l => l.itemNo === item.itemNo && l.typeNo === item.typeNo && !l.isCustomPrice)
      : undefined
    if (existing) {
      existing.qty += 1
    } else {
      cart.value.push({
        typeNo: item.typeNo,
        itemNo: item.itemNo,
        itemName: item.itemName,
        itemType: item.itemType,
        itemCode: item.itemCode,
        price: finalPrice,
        qty: 1,
        isCustomPrice: isCustom
      })
    }
  }

  // ══════════════════ 時價品項：金額鍵盤 ══════════════════

  const showCustomPricePad = ref(false)
  const customPriceTarget = ref<MenuItem | null>(null)
  const customPriceInput = ref('')

  function openCustomPricePad(item: MenuItem) {
    customPriceTarget.value = item
    customPriceInput.value = ''
    showCustomPricePad.value = true
  }

  function closeCustomPricePad() {
    showCustomPricePad.value = false
    customPriceTarget.value = null
  }

  function padPress(key: string) {
    if (key === 'clear') {
      customPriceInput.value = ''
      return
    }
    if (key === 'back') {
      customPriceInput.value = customPriceInput.value.slice(0, -1)
      return
    }
    if (key === '.' && customPriceInput.value.includes('.')) return
    customPriceInput.value += key
  }

  function confirmCustomPrice() {
    const price = Number(customPriceInput.value)
    if (!customPriceTarget.value || !price || price <= 0) return
    addToCart(customPriceTarget.value, price)
    showCustomPricePad.value = false
    customPriceTarget.value = null
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
              v-for="(t, idx) in sortedTypes"
              :key="t.typeNo"
              :class="['io-category-btn', { active: selectedTypeNo === t.typeNo }]"
              :style="{ background: categoryColor(idx), borderColor: categoryColor(idx), color: '#2b2b2b' }"
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
          <div v-else-if="!hasVisibleItems" class="empty-hint">這個分類目前沒有品項</div>
          <div v-else class="pos-item-grid">
            <template v-for="(item, idx) in filteredItems" :key="item ? `${item.typeNo}-${item.itemNo}` : `empty-${idx}`">
              <button
                v-if="item"
                class="pos-item-btn"
                :class="{ 'is-open-price': item.openCode === 'Y' }"
                :style="item.openCode === 'Y' ? {} : { background: itemColor(idx), borderColor: itemColor(idx), color: '#2b2b2b' }"
                @click="addToCart(item)"
              >
                <span class="pos-item-name">{{ item.itemName }}</span>
                <span v-if="item.openCode === 'Y'" class="pos-item-price pos-item-open-tag">時價</span>
                <span v-else class="pos-item-price">${{ formatMoney(item.price) }}</span>
              </button>
              <div v-else class="pos-item-empty" aria-hidden="true"></div>
            </template>
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

    <!-- ══════════════════ 時價品項金額鍵盤 ══════════════════ -->
    <div v-if="showCustomPricePad" class="modal-overlay" @click.self="closeCustomPricePad">
      <div class="modal-box numpad-box">
        <div class="modal-header">
          <h2 class="section-title">{{ customPriceTarget?.itemName }} — 請輸入金額</h2>
          <button class="btn-ghost small" @click="closeCustomPricePad">✕ 關閉</button>
        </div>

        <div class="numpad-display">{{ customPriceInput || '0' }}</div>

        <div class="numpad-grid">
          <button v-for="k in ['7', '8', '9']" :key="k" class="numpad-key" @click="padPress(k)">{{ k }}</button>
          <button class="numpad-key numpad-key-action" @click="padPress('back')">⌫</button>
          <button v-for="k in ['4', '5', '6']" :key="k" class="numpad-key" @click="padPress(k)">{{ k }}</button>
          <button class="numpad-key numpad-key-action" @click="padPress('clear')">清除</button>
          <button v-for="k in ['1', '2', '3']" :key="k" class="numpad-key" @click="padPress(k)">{{ k }}</button>
          <button class="numpad-key numpad-key-action" @click="closeCustomPricePad">離開</button>
          <button class="numpad-key" @click="padPress('0')">0</button>
          <button class="numpad-key" @click="padPress('00')">00</button>
          <button class="numpad-key" @click="padPress('.')">.</button>
          <button class="numpad-key numpad-key-confirm" @click="confirmCustomPrice">確定</button>
        </div>
      </div>
    </div>

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
  .io-category-grid { display: grid; grid-template-columns: repeat(6, 1fr); gap: 5px; }
  .io-category-btn { padding: 14px 6px; font-size: 14px; font-weight: 700; border: 2px solid rgba(0, 0, 0, 0.12); border-radius: 4px; cursor: pointer; text-align: center; min-height: 62px; display: flex; align-items: center; justify-content: center; line-height: 1.35; transition: filter 0.1s, box-shadow 0.1s; }
  .io-category-btn:hover { filter: brightness(0.95); }
  .io-category-btn.active { border-color: #1a237e; box-shadow: 0 0 0 2px #1a237e inset; }

  /* 品項格 */
  .pos-item-grid { display: grid; grid-template-columns: repeat(6, 1fr); gap: 5px; max-height: 560px; overflow-y: auto; padding: 2px; }
  .pos-item-btn { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 4px; padding: 14px 8px; border: 2px solid rgba(0, 0, 0, 0.12); border-radius: 4px; background: var(--surface); color: var(--text); cursor: pointer; text-align: center; min-height: 74px; font-weight: 600; transition: filter 0.1s; }
  .pos-item-btn:hover { filter: brightness(0.95); }
  .pos-item-empty { min-height: 74px; visibility: hidden; }
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

  .pos-item-btn.is-open-price { border-color: #f9a825; background: #fffbe6; }
  .pos-item-open-tag { color: #b8860b; font-weight: 700; }

  @media (max-width: 720px) {
    .io-category-grid { grid-template-columns: repeat(3, 1fr); }
    .pos-item-grid { grid-template-columns: repeat(3, 1fr); }
  }
  @media (min-width: 721px) and (max-width: 1024px) {
    .io-category-grid { grid-template-columns: repeat(4, 1fr); }
    .pos-item-grid { grid-template-columns: repeat(4, 1fr); }
  }

  .numpad-box { width: min(340px, 100%); }
  .numpad-display { font-size: 28px; font-weight: 700; text-align: right; padding: 12px 14px; background: var(--surface2); border-radius: var(--radius-sm); color: var(--text); }
  .numpad-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px; }
  .numpad-key { padding: 16px 0; font-size: 16px; border: 1px solid var(--border); border-radius: var(--radius-sm); background: var(--surface); color: var(--text); cursor: pointer; }
  .numpad-key:hover { border-color: var(--accent); background: var(--accent-light); }
  .numpad-key-action { font-size: 13px; color: var(--text-muted); }
  .numpad-key-confirm { background: var(--accent); color: #fff; font-weight: 700; grid-column: span 1; }

  /* 結帳彈窗 */
  .modal-overlay { position: fixed; inset: 0; background: rgba(0, 0, 0, 0.45); display: flex; align-items: center; justify-content: center; z-index: 100; padding: 24px; }
  .modal-box { background: var(--surface); border-radius: var(--radius); padding: 20px 24px; width: min(420px, 100%); max-height: 85vh; overflow-y: auto; display: flex; flex-direction: column; gap: 14px; }
  .modal-header { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
  .modal-actions { display: flex; gap: 8px; justify-content: flex-end; padding-top: 4px; }
  .pos-checkout-total { font-size: 18px; font-weight: 700; color: var(--text); text-align: center; }

  .pos-receipt { display: flex; flex-direction: column; gap: 6px; font-size: 14px; color: var(--text); background: var(--surface2); border-radius: var(--radius-sm); padding: 14px 16px; }
  .pos-receipt-change { font-size: 18px; font-weight: 700; color: var(--accent); }
</style>
