<template>
  <div class="sc-edit-page">
    <div class="sc-breadcrumb">
      <NuxtLink to="/front/shopping-cart">訂單管理</NuxtLink>
      <span class="sc-sep">/</span>
      <span class="sc-current">修改訂單 ： {{ orderNo }}</span>
    </div>

    <p v-if="toast" class="sc-toast" :class="toast.type">{{ toast.message }}</p>

    <div v-if="loading" class="sc-loading">從原網站抓取資料中…</div>
    <p v-else-if="loadError" class="sc-load-error">{{ loadError }}</p>

    <template v-else-if="form">
      <!-- 出貨日期 -->
      <div class="sc-inline-row">
        <label class="red">※ 農莊完成出貨日期選擇：</label>
        <input v-model="form.deliverDate" type="date" />
        <button class="sc-btn" :disabled="savingDate" @click="saveDeliverDate">送出</button>
      </div>

      <!-- 訂單狀態 -->
      <div class="sc-inline-row">
        <label class="red">訂單狀態：</label>
        <select v-model="form.statusCode">
          <option value="0">新訂單</option>
          <option value="1">訂單成立</option>
          <option value="2">備貨</option>
          <option value="3">出貨</option>
        </select>
        <button class="sc-btn" :disabled="savingStatus" @click="saveStatus">送出</button>
      </div>

      <!-- 1、購物清單 -->
      <div class="sc-panel">
        <div class="sc-panel-heading">1、購物清單：</div>
        <div class="sc-panel-body">
          <template v-for="section in form.productSections" :key="section.category">
            <h2 class="sc-product-title">{{ section.category }}</h2>
            <table class="sc-table">
              <thead>
                <tr class="sc-row-success">
                  <th class="text-center">序列</th>
                  <th class="text-center">商品名稱</th>
                  <th class="text-center">溫層</th>
                  <th class="text-center">價格</th>
                  <th class="text-center">數量</th>
                  <th class="text-center">總計</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="item in section.items" :key="item.fieldName">
                  <td class="text-center">{{ item.seq }}</td>
                  <td class="text-center">{{ item.name }}</td>
                  <td class="text-center">{{ item.tempZone }}</td>
                  <td class="text-center">{{ item.price }}</td>
                  <td class="text-center">
                    <input
                      v-model="item.qty"
                      type="text"
                      class="sc-qty-input"
                      maxlength="3"
                      @change="saveQuantity(item)"
                    />
                  </td>
                  <td class="text-center">{{ item.subtotal }}</td>
                </tr>
                <tr v-if="section.items.length === 0">
                  <td colspan="6" class="text-center sc-empty-note">此溫層無商品</td>
                </tr>
                <tr class="sc-summary-row">
                  <td class="text-center">&nbsp;</td>
                  <td class="text-center">&nbsp;</td>
                  <td class="text-center">&nbsp;</td>
                  <td class="text-center">總計：</td>
                  <td class="text-center">
                    <span class="sc-amount">{{ section.summary.count }}</span> 項
                  </td>
                  <td class="text-center">
                    $ <span class="sc-amount">{{ section.summary.amount }}</span> 元
                  </td>
                </tr>
              </tbody>
            </table>
          </template>
        </div>
      </div>

      <!-- 2、購物費用與運費總計 -->
      <div class="sc-panel">
        <div class="sc-panel-heading">2、購物費用與運費總計：</div>
        <div class="sc-panel-body sc-cost-grid">
          <div class="sc-cost-col">
            <div class="sc-field-row">
              <span class="sc-field-label">付費方式</span>
              <div class="sc-radio-group">
                <label><input v-model="form.paymentMethod" type="radio" value="1" /> 貨到付款</label>
                <label
                  ><input v-model="form.paymentMethod" type="radio" value="2" />
                  金融卡轉帳或電匯</label
                >
              </div>
            </div>
            <table class="sc-table">
              <thead>
                <tr class="sc-row-success">
                  <th class="text-center">筆數</th>
                  <th class="text-center">商品名稱</th>
                  <th class="text-center">價格</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td class="text-center">1</td>
                  <td class="text-center">商品金額</td>
                  <td class="text-center">{{ form.costSummary.price }}</td>
                </tr>
                <tr>
                  <td class="text-center">2</td>
                  <td class="text-center">運費金額</td>
                  <td class="text-center">{{ shippingFee }}</td>
                </tr>
                <tr>
                  <td class="text-center">&nbsp;</td>
                  <td class="text-right">總計費用：</td>
                  <td class="text-center">
                    $ <span class="sc-amount">{{ totalCost }}</span> 元
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div class="sc-cost-col">
            <p class="sc-note-text">
              ※ 外、離島地區宅配費另計，我們會由專人與您聯繫<br />
              ※ 貨到付款 加收 運費60<br />
              ※ 運費計算方式一覽表：
            </p>
            <table class="sc-table">
              <thead>
                <tr>
                  <th class="text-center">訂購金額</th>
                  <th class="text-center">常溫</th>
                  <th class="text-center">低溫</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td class="text-center">未滿2,000元</td>
                  <td class="text-center">170元</td>
                  <td class="text-center">225元</td>
                </tr>
                <tr>
                  <td class="text-center">2,000～4,000元</td>
                  <td class="text-center">免費</td>
                  <td class="text-center">150元</td>
                </tr>
                <tr>
                  <td class="text-center">4,000元以上</td>
                  <td class="text-center">免費</td>
                  <td class="text-center">免費</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div class="sc-two-col">
        <!-- 3、收件人資料 -->
        <div class="sc-panel">
          <div class="sc-panel-heading">3、收件人資料：</div>
          <div class="sc-panel-body">
            <div class="sc-field-row">
              <span class="sc-field-label"><span class="red">*</span>收件人姓名</span>
              <input v-model="form.receiver.name" type="text" class="sc-input" />
            </div>
            <div class="sc-field-row">
              <span class="sc-field-label">性別</span>
              <div class="sc-radio-group">
                <label><input v-model="form.receiver.gender" type="radio" value="1" /> 先生</label>
                <label><input v-model="form.receiver.gender" type="radio" value="0" /> 小姐</label>
              </div>
            </div>
            <div class="sc-field-row">
              <span class="sc-field-label"><span class="red">*</span>室話</span>
              <div class="sc-phone-group">
                <input v-model="form.receiver.phoneArea" type="text" class="sc-input-sm" />
                <span>-</span>
                <input v-model="form.receiver.phoneNumber" type="text" class="sc-input-sm" />
                <span>#</span>
                <input v-model="form.receiver.phoneExt" type="text" class="sc-input-sm" />
              </div>
            </div>
            <div class="sc-field-row">
              <span class="sc-field-label"><span class="red">*</span>手機</span>
              <input v-model="form.receiver.mobile" type="text" class="sc-input" />
            </div>
            <div class="sc-field-row">
              <span class="sc-field-label"><span class="red">*</span>郵遞區號</span>
              <input v-model="form.receiver.zipcode" type="text" class="sc-input-sm" />
            </div>
            <div class="sc-field-row">
              <span class="sc-field-label"><span class="red">*</span>郵寄地址</span>
              <input v-model="form.receiver.address" type="text" class="sc-input" />
            </div>
            <div class="sc-field-row">
              <span class="sc-field-label">備註</span>
              <textarea v-model="form.receiver.note" rows="4" class="sc-input"></textarea>
            </div>
          </div>
        </div>

        <!-- 4、發票抬頭 -->
        <div class="sc-panel">
          <div class="sc-panel-heading">4、發票抬頭：</div>
          <div class="sc-panel-body">
            <table class="sc-table">
              <tbody>
                <tr>
                  <td class="text-center sc-label-cell">發票形式：</td>
                  <td class="text-center">
                    <div class="sc-radio-group">
                      <label><input v-model="form.invoice.type" type="radio" value="1" /> 一般發票</label>
                      <label
                        ><input v-model="form.invoice.type" type="radio" value="2" />
                        二聯式 (紙本)</label
                      >
                      <label
                        ><input v-model="form.invoice.type" type="radio" value="3" />
                        三聯式 (紙本)</label
                      >
                    </div>
                  </td>
                </tr>
                <tr>
                  <td class="text-center sc-label-cell">發票抬頭：</td>
                  <td class="text-center">
                    <input
                      v-model="form.invoice.companyName"
                      type="text"
                      class="sc-input"
                      :disabled="form.invoice.type === '1'"
                    />
                  </td>
                </tr>
                <tr>
                  <td class="text-center sc-label-cell">統一編號：</td>
                  <td class="text-center">
                    <input
                      v-model="form.invoice.companyId"
                      type="text"
                      class="sc-input"
                      :disabled="form.invoice.type === '2'"
                    />
                  </td>
                </tr>
                <tr>
                  <td class="text-center sc-label-cell">發票號碼：</td>
                  <td class="text-center">
                    <input v-model="form.invoice.receiptNumber" type="text" class="sc-input" />
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div class="sc-submit-row">
        <button class="sc-btn sc-btn-primary" :disabled="submitting" @click="submitUpdate">
          {{ submitting ? '更新中…' : '更新訂單資料' }}
        </button>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'

// 呼叫本專案自己的 server API route（server/api/shopping-cart/orders/[orderNo]/*），
// 分別對應原網站四支 AJAX 動作：setOD（出貨日期）、chst（訂單狀態）、
// nv（單一商品數量）、u（整表更新收件人/發票/付款方式等資料）。
definePageMeta({
  layout: 'shopping-cart'
})

const route = useRoute()
const orderNo = route.params.orderNo

const form = ref(null)
const loading = ref(false)
const loadError = ref('')
const toast = ref(null)

const savingDate = ref(false)
const savingStatus = ref(false)
const submitting = ref(false)

function showToast(message, type = 'success') {
  toast.value = { message, type }
  setTimeout(() => {
    toast.value = null
  }, 2500)
}

async function fetchEdit() {
  loading.value = true
  loadError.value = ''
  try {
    form.value = await $fetch(`/api/shopping-cart/orders/${orderNo}/edit`)
  } catch (err) {
    if (err?.statusCode === 401 || err?.response?.status === 401) {
      loadError.value = '登入已過期，請重新登入'
      await navigateTo('/front/shopping-cart/login')
    } else {
      loadError.value = err?.data?.statusMessage || '抓取原網站資料失敗，請稍後再試'
    }
  } finally {
    loading.value = false
  }
}

// 運費：對應原本 change 事件邏輯（貨到付款收 60，轉帳/電匯免運）
const shippingFee = computed(() => (form.value?.paymentMethod === '1' ? 60 : 0))

// 總計：這裡採用「商品金額 + 運費」動態計算。
// 補充：原網站前端這段是寫死 `2000 + pricehome`，沒有真的讀商品金額欄位，
// 疑似原本就存在的小瑕疵；這裡改用實際商品金額計算比較正確，但提醒你留意
// 跟原網站畫面顯示的總計是否一致。
const totalCost = computed(() => Number(form.value?.costSummary?.price || 0) + shippingFee.value)

async function saveDeliverDate() {
  if (!form.value.deliverDate) {
    showToast('請先選擇出貨日期', 'error')
    return
  }
  savingDate.value = true
  try {
    const res = await $fetch(`/api/shopping-cart/orders/${orderNo}/delivery-date`, {
      method: 'POST',
      body: { date: form.value.deliverDate }
    })
    showToast(res.ok ? '出貨日期已設定' : '設定失敗', res.ok ? 'success' : 'error')
  } catch (err) {
    showToast(err?.data?.statusMessage || '設定失敗', 'error')
  } finally {
    savingDate.value = false
  }
}

async function saveStatus() {
  savingStatus.value = true
  try {
    const res = await $fetch(`/api/shopping-cart/orders/${orderNo}/status`, {
      method: 'POST',
      body: { status: form.value.statusCode }
    })
    showToast(res.ok ? '訂單狀態更新成功' : '更新失敗', res.ok ? 'success' : 'error')
  } catch (err) {
    showToast(err?.data?.statusMessage || '更新失敗', 'error')
  } finally {
    savingStatus.value = false
  }
}

async function saveQuantity(item) {
  if (Number.isNaN(Number(item.qty))) {
    showToast('數量輸入錯誤，請重新輸入！', 'error')
    return
  }
  try {
    const res = await $fetch(`/api/shopping-cart/orders/${orderNo}/quantity`, {
      method: 'POST',
      body: { field: item.fieldName, value: item.qty }
    })
    showToast(res.ok ? `數量已變更為 ${item.qty}` : '數量更新失敗！', res.ok ? 'success' : 'error')
  } catch (err) {
    showToast(err?.data?.statusMessage || '數量更新失敗！', 'error')
  }
}

async function submitUpdate() {
  submitting.value = true
  try {
    const quantities = {}
    for (const section of form.value.productSections) {
      for (const item of section.items) {
        if (item.fieldName) quantities[item.fieldName] = item.qty
      }
    }

    const res = await $fetch(`/api/shopping-cart/orders/${orderNo}/update`, {
      method: 'POST',
      body: {
        quantities,
        classpay: form.value.paymentMethod,
        name: form.value.receiver.name,
        gender: form.value.receiver.gender,
        phoneArea: form.value.receiver.phoneArea,
        phoneNumber: form.value.receiver.phoneNumber,
        phoneExt: form.value.receiver.phoneExt,
        mobile: form.value.receiver.mobile,
        zipcode: form.value.receiver.zipcode,
        address: form.value.receiver.address,
        note: form.value.receiver.note,
        receiptType: form.value.invoice.type,
        companyName: form.value.invoice.companyName,
        companyId: form.value.invoice.companyId,
        receiptNumber: form.value.invoice.receiptNumber,
        hiddenFields: form.value.hiddenFields
      }
    })
    showToast(res.ok ? '更新成功' : '更新失敗，請確認資料是否有誤', res.ok ? 'success' : 'error')
  } catch (err) {
    showToast(err?.data?.statusMessage || '更新失敗，請確認資料是否有誤', 'error')
  } finally {
    submitting.value = false
  }
}

onMounted(fetchEdit)
</script>

<style scoped>
.sc-edit-page {
  padding: 20px;
  color: #333;
  max-width: 1100px;
  margin: 0 auto;
}

.sc-breadcrumb {
  font-size: 13px;
  color: #888;
  margin-bottom: 16px;
}

.sc-breadcrumb a {
  color: #337ab7;
  text-decoration: none;
}

.sc-breadcrumb .sc-sep {
  margin: 0 6px;
}

.sc-breadcrumb .sc-current {
  color: #555;
}

.sc-toast {
  position: sticky;
  top: 10px;
  z-index: 10;
  padding: 8px 14px;
  border-radius: 4px;
  font-size: 13px;
  margin-bottom: 12px;
}

.sc-toast.success {
  background: #dff0d8;
  color: #3c763d;
}

.sc-toast.error {
  background: #f2dede;
  color: #a94442;
}

.sc-loading,
.sc-load-error {
  padding: 24px;
  text-align: center;
  color: #999;
}

.sc-load-error {
  color: #d9534f;
}

.red {
  color: #d9534f;
}

.sc-inline-row {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 14px;
  font-size: 14px;
}

.sc-inline-row select,
.sc-inline-row input[type='date'] {
  padding: 6px 10px;
  border: 1px solid #ccc;
  border-radius: 4px;
}

.sc-btn {
  padding: 6px 16px;
  font-size: 13px;
  border: 1px solid #ccc;
  background: #fff;
  border-radius: 4px;
  cursor: pointer;
}

.sc-btn:hover:not(:disabled) {
  background: #f5f5f5;
}

.sc-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.sc-btn-primary {
  background: #3d7a52;
  color: #fff;
  border-color: #3d7a52;
  padding: 10px 28px;
  font-size: 15px;
}

.sc-btn-primary:hover:not(:disabled) {
  background: #2f6141;
}

.sc-panel {
  border: 1px solid #ddd;
  border-radius: 4px;
  margin-bottom: 20px;
  overflow: hidden;
}

.sc-panel-heading {
  background: #f5f5f5;
  padding: 10px 16px;
  font-weight: 600;
  border-bottom: 1px solid #ddd;
}

.sc-panel-body {
  padding: 16px;
}

.sc-product-title {
  color: #669900;
  margin: 20px 0 10px;
  border-bottom: 2px solid #669900;
  font-size: 16px;
  padding-bottom: 4px;
}

.sc-product-title:first-child {
  margin-top: 0;
}

.sc-table {
  width: 100%;
  border-collapse: collapse;
  margin-bottom: 12px;
  font-size: 13px;
}

.sc-table th,
.sc-table td {
  border: 1px solid #ddd;
  padding: 8px 10px;
}

.sc-row-success th {
  background: #dff0d8;
}

.sc-summary-row td {
  background: #fafafa;
  font-weight: 600;
}

.sc-empty-note {
  color: #999;
  padding: 16px;
}

.sc-amount {
  font-size: 16px;
  font-weight: 700;
  color: #669900;
}

.text-center {
  text-align: center;
}

.text-right {
  text-align: right;
}

.sc-qty-input {
  width: 48px;
  text-align: center;
  padding: 4px;
  border: 1px solid #ccc;
  border-radius: 3px;
}

.sc-cost-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
}

.sc-cost-col {
  min-width: 0;
}

.sc-note-text {
  font-size: 13px;
  color: #555;
  margin: 0 0 10px;
  line-height: 1.6;
}

.sc-two-col {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
}

.sc-field-row {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 8px 0;
  border-bottom: 1px solid #f0f0f0;
  font-size: 14px;
}

.sc-field-label {
  flex: 0 0 130px;
  color: #666;
  padding-top: 6px;
}

.sc-label-cell {
  white-space: nowrap;
  color: #666;
}

.sc-input {
  flex: 1;
  padding: 6px 10px;
  border: 1px solid #ccc;
  border-radius: 4px;
  font-size: 14px;
}

.sc-input:disabled {
  background: #f5f5f5;
  color: #999;
}

.sc-input-sm {
  width: 70px;
  padding: 6px 8px;
  border: 1px solid #ccc;
  border-radius: 4px;
  text-align: center;
}

.sc-phone-group {
  display: flex;
  align-items: center;
  gap: 6px;
}

.sc-radio-group {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  font-size: 13px;
}

.sc-radio-group label {
  display: flex;
  align-items: center;
  gap: 4px;
  font-weight: normal;
}

.sc-submit-row {
  text-align: center;
  margin: 24px 0 40px;
}

@media (max-width: 768px) {
  .sc-cost-grid,
  .sc-two-col {
    grid-template-columns: 1fr;
  }
}
</style>
