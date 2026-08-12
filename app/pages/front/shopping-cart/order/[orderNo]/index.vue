<template>
  <div class="sc-detail-page">
    <div class="sc-breadcrumb">
      <NuxtLink to="/front/shopping-cart">訂單管理</NuxtLink>
      <span class="sc-sep">/</span>
      <span class="sc-current">檢視訂單 ： {{ orderNo }}</span>
    </div>

    <div v-if="loading" class="sc-loading">從原網站抓取資料中…</div>
    <p v-else-if="loadError" class="sc-load-error">{{ loadError }}</p>

    <template v-else-if="detail">
      <div class="sc-ship-date">
        <span class="red">※</span> 出貨日期：
        <strong>{{ detail.shipDate || '尚未出貨' }}</strong>
      </div>

      <!-- 1、購物清單 -->
      <div class="sc-panel">
        <div class="sc-panel-heading">1、購物清單：</div>
        <div class="sc-panel-body">
          <template v-for="section in detail.productSections" :key="section.category">
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
                <tr v-for="item in section.items" :key="item.seq">
                  <td class="text-center">{{ item.seq }}</td>
                  <td class="text-center">{{ item.name }}</td>
                  <td class="text-center">{{ item.tempZone }}</td>
                  <td class="text-center">{{ item.price }}</td>
                  <td class="text-center">{{ item.qty }}</td>
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
              <span>{{ detail.paymentMethod }}</span>
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
                  <td class="text-center">{{ detail.costSummary.productAmount }}</td>
                </tr>
                <tr>
                  <td class="text-center">2</td>
                  <td class="text-center">運費金額</td>
                  <td class="text-center">{{ detail.costSummary.shippingAmount }}</td>
                </tr>
                <tr>
                  <td class="text-center">&nbsp;</td>
                  <td class="text-right">總計費用：</td>
                  <td class="text-center">
                    $ <span class="sc-amount">{{ detail.costSummary.totalCost }}</span> 元
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
              <span>{{ detail.receiver.name }}</span>
            </div>
            <div class="sc-field-row">
              <span class="sc-field-label">性別</span>
              <span>{{ detail.receiver.gender || '-' }}</span>
            </div>
            <div class="sc-field-row">
              <span class="sc-field-label"><span class="red">*</span>室話</span>
              <span>
                {{ detail.receiver.phoneArea || '-' }} - {{ detail.receiver.phoneNumber || '-' }}
                <template v-if="detail.receiver.phoneExt"># {{ detail.receiver.phoneExt }}</template>
              </span>
            </div>
            <div class="sc-field-row">
              <span class="sc-field-label"><span class="red">*</span>手機</span>
              <span>{{ detail.receiver.mobile || '-' }}</span>
            </div>
            <div class="sc-field-row">
              <span class="sc-field-label"><span class="red">*</span>郵遞區號</span>
              <span>{{ detail.receiver.zipcode || '-' }}</span>
            </div>
            <div class="sc-field-row">
              <span class="sc-field-label"><span class="red">*</span>郵寄地址</span>
              <span>{{ detail.receiver.address }}</span>
            </div>
            <div class="sc-field-row">
              <span class="sc-field-label">備註</span>
              <span>{{ detail.receiver.note || '-' }}</span>
            </div>
          </div>
        </div>

        <!-- 4、發票抬頭 -->
        <div class="sc-panel">
          <div class="sc-panel-heading">4、發票抬頭：</div>
          <div class="sc-panel-body">
            <table class="sc-table">
              <thead>
                <tr class="sc-row-success">
                  <th class="text-center">項目</th>
                  <th class="text-center">內容</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td class="text-center">發票形式：</td>
                  <td class="text-center">{{ detail.invoice.type || '-' }}</td>
                </tr>
                <tr>
                  <td class="text-center">發票抬頭：</td>
                  <td class="text-center">{{ detail.invoice.companyName || '-' }}</td>
                </tr>
                <tr>
                  <td class="text-center">統一編號：</td>
                  <td class="text-center">{{ detail.invoice.companyId || '-' }}</td>
                </tr>
                <tr>
                  <td class="text-center">發票號碼：</td>
                  <td class="text-center">{{ detail.invoice.receiptNumber || '-' }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'

// 呼叫本專案自己的 server API route（server/api/shopping-cart/orders/[orderNo].get.ts），
// 由該 route 帶著登入 session 抓原網站 admin_order_view.php 並解析成 JSON。
definePageMeta({
  layout: 'shopping-cart'
})

const route = useRoute()
const orderNo = route.params.orderNo

const detail = ref(null)
const loading = ref(false)
const loadError = ref('')

async function fetchDetail() {
  loading.value = true
  loadError.value = ''
  try {
    detail.value = await $fetch(`/api/shopping-cart/orders/${orderNo}`)
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

onMounted(fetchDetail)
</script>

<style scoped>
.sc-detail-page {
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

.sc-loading,
.sc-load-error {
  padding: 24px;
  text-align: center;
  color: #999;
}

.sc-load-error {
  color: #d9534f;
}

.sc-ship-date {
  margin-bottom: 16px;
  font-size: 14px;
}

.red {
  color: #d9534f;
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
  gap: 10px;
  padding: 8px 0;
  border-bottom: 1px solid #f0f0f0;
  font-size: 14px;
}

.sc-field-label {
  flex: 0 0 130px;
  color: #666;
}

@media (max-width: 768px) {
  .sc-cost-grid,
  .sc-two-col {
    grid-template-columns: 1fr;
  }
}
</style>
