<script setup>
import ScHeader from '~/components/shopping-cart/ScHeader.vue'
import { ref, computed, onMounted } from 'vue'

// 呼叫本專案自己的 server API route（server/api/shopping-cart/orders/[orderNo]/*），
// 分別對應原網站四支 AJAX 動作：setOD（出貨日期）、chst（訂單狀態）、
// nv（單一商品數量）、u（整表更新收件人/發票/付款方式等資料）。
definePageMeta({
  layout: 'staff'
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
      loadError.value = 'unauthorized'
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

<template>
  <div class="min-h-full bg-surface2 transition-colors duration-300">
    <ScHeader :title="`修改訂單 ${orderNo}`" :show-tabs="false" />

    <div class="max-w-5xl mx-auto px-3 sm:px-4 py-4 sm:py-6 space-y-4">
      <NuxtLink to="/staff/order/shopping-cart" class="text-sm text-green-700 dark:text-green-400 hover:underline">
        ← 返回訂單清單
      </NuxtLink>

      <p
        v-if="toast"
        class="text-sm px-4 py-2 rounded-xl"
        :class="toast.type === 'error'
          ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
          : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'"
      >
        {{ toast.message }}
      </p>

      <div v-if="loading" class="text-center py-10 text-hint-c">從原網站抓取資料中…</div>
      <div v-else-if="loadError === 'unauthorized'" class="bg-surface rounded-xl border border-light-c p-6 text-center space-y-3">
        <p class="text-muted-c text-sm">尚未登入購物車後台。</p>
        <NuxtLink to="/staff/order/shopping-cart/login" class="inline-block px-4 py-2 text-sm bg-green-700 text-white rounded-xl hover:bg-green-800 transition-colors">
          前往登入購物車後台
        </NuxtLink>
      </div>
      <p v-else-if="loadError" class="text-red-600 dark:text-red-400 text-sm">{{ loadError }}</p>

      <template v-else-if="form">
        <!-- 出貨日期 -->
        <div class="flex items-center gap-2.5 flex-wrap text-sm">
          <label class="text-red-500 font-medium">※ 農莊完成出貨日期選擇：</label>
          <input v-model="form.deliverDate" type="date" class="px-3 py-1.5 rounded-lg border border-light-c bg-surface text-base-c">
          <button
            :disabled="savingDate"
            class="px-4 py-1.5 text-sm border border-light-c text-muted-c rounded-lg hover-surface2 disabled:opacity-50"
            @click="saveDeliverDate"
          >
            送出
          </button>
        </div>

        <!-- 訂單狀態 -->
        <div class="flex items-center gap-2.5 flex-wrap text-sm">
          <label class="text-red-500 font-medium">訂單狀態：</label>
          <select v-model="form.statusCode" class="px-3 py-1.5 rounded-lg border border-light-c bg-surface text-base-c">
            <option value="0">新訂單</option>
            <option value="1">訂單成立</option>
            <option value="2">備貨</option>
            <option value="3">出貨</option>
          </select>
          <button
            :disabled="savingStatus"
            class="px-4 py-1.5 text-sm border border-light-c text-muted-c rounded-lg hover-surface2 disabled:opacity-50"
            @click="saveStatus"
          >
            送出
          </button>
        </div>

        <!-- 1、購物清單 -->
        <div class="bg-surface rounded-xl border border-light-c overflow-hidden">
          <div class="bg-surface2 px-4 py-2.5 font-semibold text-base-c text-sm border-b border-light-c">1、購物清單</div>
          <div class="p-4">
            <template v-for="section in form.productSections" :key="section.category">
              <h2 class="text-green-700 dark:text-green-400 border-b-2 border-green-700 dark:border-green-500 text-base font-semibold pb-1 mt-5 first:mt-0 mb-2.5">
                {{ section.category }}
              </h2>
              <div class="overflow-x-auto mb-3">
                <table class="w-full text-sm border-collapse">
                  <thead>
                    <tr class="bg-green-50 dark:bg-green-900/20">
                      <th class="border border-light-c px-2.5 py-2 text-center">序列</th>
                      <th class="border border-light-c px-2.5 py-2 text-center">商品名稱</th>
                      <th class="border border-light-c px-2.5 py-2 text-center">溫層</th>
                      <th class="border border-light-c px-2.5 py-2 text-center">價格</th>
                      <th class="border border-light-c px-2.5 py-2 text-center">數量</th>
                      <th class="border border-light-c px-2.5 py-2 text-center">總計</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="item in section.items" :key="item.fieldName" class="text-base-c">
                      <td class="border border-light-c px-2.5 py-2 text-center">{{ item.seq }}</td>
                      <td class="border border-light-c px-2.5 py-2 text-center">{{ item.name }}</td>
                      <td class="border border-light-c px-2.5 py-2 text-center">{{ item.tempZone }}</td>
                      <td class="border border-light-c px-2.5 py-2 text-center">{{ item.price }}</td>
                      <td class="border border-light-c px-2.5 py-2 text-center">
                        <input
                          v-model="item.qty"
                          type="text"
                          maxlength="3"
                          class="w-12 text-center px-1 py-1 rounded border border-light-c bg-surface text-base-c"
                          @change="saveQuantity(item)"
                        >
                      </td>
                      <td class="border border-light-c px-2.5 py-2 text-center">{{ item.subtotal }}</td>
                    </tr>
                    <tr v-if="section.items.length === 0">
                      <td colspan="6" class="border border-light-c px-2.5 py-4 text-center text-hint-c">此溫層無商品</td>
                    </tr>
                    <tr class="bg-surface2 font-semibold text-base-c">
                      <td class="border border-light-c px-2.5 py-2 text-center">&nbsp;</td>
                      <td class="border border-light-c px-2.5 py-2 text-center">&nbsp;</td>
                      <td class="border border-light-c px-2.5 py-2 text-center">&nbsp;</td>
                      <td class="border border-light-c px-2.5 py-2 text-center">總計：</td>
                      <td class="border border-light-c px-2.5 py-2 text-center">
                        <span class="text-base text-green-700 dark:text-green-400 font-bold">{{ section.summary.count }}</span> 項
                      </td>
                      <td class="border border-light-c px-2.5 py-2 text-center">
                        $ <span class="text-base text-green-700 dark:text-green-400 font-bold">{{ section.summary.amount }}</span> 元
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </template>
          </div>
        </div>

        <!-- 2、購物費用與運費總計 -->
        <div class="bg-surface rounded-xl border border-light-c overflow-hidden">
          <div class="bg-surface2 px-4 py-2.5 font-semibold text-base-c text-sm border-b border-light-c">2、購物費用與運費總計</div>
          <div class="p-4 grid grid-cols-1 md:grid-cols-2 gap-5">
            <div class="min-w-0">
              <div class="flex gap-2.5 py-2 items-center text-sm text-base-c">
                <span class="text-muted-c flex-none w-24">付費方式</span>
                <div class="flex flex-wrap gap-3">
                  <label class="flex items-center gap-1"><input v-model="form.paymentMethod" type="radio" value="1"> 貨到付款</label>
                  <label class="flex items-center gap-1"><input v-model="form.paymentMethod" type="radio" value="2"> 金融卡轉帳或電匯</label>
                </div>
              </div>
              <table class="w-full text-sm border-collapse">
                <thead>
                  <tr class="bg-green-50 dark:bg-green-900/20">
                    <th class="border border-light-c px-2.5 py-2 text-center">筆數</th>
                    <th class="border border-light-c px-2.5 py-2 text-center">商品名稱</th>
                    <th class="border border-light-c px-2.5 py-2 text-center">價格</th>
                  </tr>
                </thead>
                <tbody class="text-base-c">
                  <tr>
                    <td class="border border-light-c px-2.5 py-2 text-center">1</td>
                    <td class="border border-light-c px-2.5 py-2 text-center">商品金額</td>
                    <td class="border border-light-c px-2.5 py-2 text-center">{{ form.costSummary.price }}</td>
                  </tr>
                  <tr>
                    <td class="border border-light-c px-2.5 py-2 text-center">2</td>
                    <td class="border border-light-c px-2.5 py-2 text-center">運費金額</td>
                    <td class="border border-light-c px-2.5 py-2 text-center">{{ shippingFee }}</td>
                  </tr>
                  <tr>
                    <td class="border border-light-c px-2.5 py-2 text-center">&nbsp;</td>
                    <td class="border border-light-c px-2.5 py-2 text-right">總計費用：</td>
                    <td class="border border-light-c px-2.5 py-2 text-center">
                      $ <span class="text-base text-green-700 dark:text-green-400 font-bold">{{ totalCost }}</span> 元
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div class="min-w-0">
              <p class="text-sm text-muted-c mb-2.5 leading-relaxed">
                ※ 外、離島地區宅配費另計，我們會由專人與您聯繫<br>
                ※ 貨到付款 加收 運費60<br>
                ※ 運費計算方式一覽表：
              </p>
              <table class="w-full text-sm border-collapse">
                <thead>
                  <tr class="bg-surface2">
                    <th class="border border-light-c px-2.5 py-2 text-center">訂購金額</th>
                    <th class="border border-light-c px-2.5 py-2 text-center">常溫</th>
                    <th class="border border-light-c px-2.5 py-2 text-center">低溫</th>
                  </tr>
                </thead>
                <tbody class="text-base-c">
                  <tr>
                    <td class="border border-light-c px-2.5 py-2 text-center">未滿2,000元</td>
                    <td class="border border-light-c px-2.5 py-2 text-center">170元</td>
                    <td class="border border-light-c px-2.5 py-2 text-center">225元</td>
                  </tr>
                  <tr>
                    <td class="border border-light-c px-2.5 py-2 text-center">2,000～4,000元</td>
                    <td class="border border-light-c px-2.5 py-2 text-center">免費</td>
                    <td class="border border-light-c px-2.5 py-2 text-center">150元</td>
                  </tr>
                  <tr>
                    <td class="border border-light-c px-2.5 py-2 text-center">4,000元以上</td>
                    <td class="border border-light-c px-2.5 py-2 text-center">免費</td>
                    <td class="border border-light-c px-2.5 py-2 text-center">免費</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <!-- 3、收件人資料 -->
          <div class="bg-surface rounded-xl border border-light-c overflow-hidden">
            <div class="bg-surface2 px-4 py-2.5 font-semibold text-base-c text-sm border-b border-light-c">3、收件人資料</div>
            <div class="p-4 space-y-3">
              <div class="flex items-start gap-2.5">
                <span class="text-muted-c flex-none w-28 pt-2 text-sm"><span class="text-red-500">*</span>收件人姓名</span>
                <input v-model="form.receiver.name" type="text" class="flex-1 px-3 py-2 text-sm rounded-xl border border-light-c bg-surface text-base-c outline-none focus:ring-2 focus:ring-green-400">
              </div>
              <div class="flex items-start gap-2.5">
                <span class="text-muted-c flex-none w-28 pt-2 text-sm">性別</span>
                <div class="flex flex-wrap gap-3 pt-2 text-sm text-base-c">
                  <label class="flex items-center gap-1"><input v-model="form.receiver.gender" type="radio" value="1"> 先生</label>
                  <label class="flex items-center gap-1"><input v-model="form.receiver.gender" type="radio" value="0"> 小姐</label>
                </div>
              </div>
              <div class="flex items-start gap-2.5">
                <span class="text-muted-c flex-none w-28 pt-2 text-sm"><span class="text-red-500">*</span>室話</span>
                <div class="flex items-center gap-1.5 pt-1">
                  <input v-model="form.receiver.phoneArea" type="text" class="w-16 text-center px-2 py-1.5 rounded-lg border border-light-c bg-surface text-base-c">
                  <span class="text-muted-c">-</span>
                  <input v-model="form.receiver.phoneNumber" type="text" class="w-20 text-center px-2 py-1.5 rounded-lg border border-light-c bg-surface text-base-c">
                  <span class="text-muted-c">#</span>
                  <input v-model="form.receiver.phoneExt" type="text" class="w-16 text-center px-2 py-1.5 rounded-lg border border-light-c bg-surface text-base-c">
                </div>
              </div>
              <div class="flex items-start gap-2.5">
                <span class="text-muted-c flex-none w-28 pt-2 text-sm"><span class="text-red-500">*</span>手機</span>
                <input v-model="form.receiver.mobile" type="text" class="flex-1 px-3 py-2 text-sm rounded-xl border border-light-c bg-surface text-base-c outline-none focus:ring-2 focus:ring-green-400">
              </div>
              <div class="flex items-start gap-2.5">
                <span class="text-muted-c flex-none w-28 pt-2 text-sm"><span class="text-red-500">*</span>郵遞區號</span>
                <input v-model="form.receiver.zipcode" type="text" class="w-24 text-center px-2 py-1.5 rounded-lg border border-light-c bg-surface text-base-c">
              </div>
              <div class="flex items-start gap-2.5">
                <span class="text-muted-c flex-none w-28 pt-2 text-sm"><span class="text-red-500">*</span>郵寄地址</span>
                <input v-model="form.receiver.address" type="text" class="flex-1 px-3 py-2 text-sm rounded-xl border border-light-c bg-surface text-base-c outline-none focus:ring-2 focus:ring-green-400">
              </div>
              <div class="flex items-start gap-2.5">
                <span class="text-muted-c flex-none w-28 pt-2 text-sm">備註</span>
                <textarea v-model="form.receiver.note" rows="4" class="flex-1 px-3 py-2 text-sm rounded-xl border border-light-c bg-surface text-base-c outline-none focus:ring-2 focus:ring-green-400"></textarea>
              </div>
            </div>
          </div>

          <!-- 4、發票抬頭 -->
          <div class="bg-surface rounded-xl border border-light-c overflow-hidden">
            <div class="bg-surface2 px-4 py-2.5 font-semibold text-base-c text-sm border-b border-light-c">4、發票抬頭</div>
            <div class="p-4">
              <table class="w-full text-sm border-collapse">
                <tbody class="text-base-c">
                  <tr>
                    <td class="border border-light-c px-2.5 py-2 text-center whitespace-nowrap text-muted-c">發票形式：</td>
                    <td class="border border-light-c px-2.5 py-2 text-center">
                      <div class="flex flex-wrap gap-3 justify-center">
                        <label class="flex items-center gap-1"><input v-model="form.invoice.type" type="radio" value="1"> 一般發票</label>
                        <label class="flex items-center gap-1"><input v-model="form.invoice.type" type="radio" value="2"> 二聯式 (紙本)</label>
                        <label class="flex items-center gap-1"><input v-model="form.invoice.type" type="radio" value="3"> 三聯式 (紙本)</label>
                      </div>
                    </td>
                  </tr>
                  <tr>
                    <td class="border border-light-c px-2.5 py-2 text-center whitespace-nowrap text-muted-c">發票抬頭：</td>
                    <td class="border border-light-c px-2.5 py-2 text-center">
                      <input
                        v-model="form.invoice.companyName"
                        type="text"
                        :disabled="form.invoice.type === '1'"
                        class="w-full px-2 py-1.5 rounded-lg border border-light-c bg-surface text-base-c disabled:bg-surface2 disabled:text-hint-c"
                      >
                    </td>
                  </tr>
                  <tr>
                    <td class="border border-light-c px-2.5 py-2 text-center whitespace-nowrap text-muted-c">統一編號：</td>
                    <td class="border border-light-c px-2.5 py-2 text-center">
                      <input
                        v-model="form.invoice.companyId"
                        type="text"
                        :disabled="form.invoice.type === '2'"
                        class="w-full px-2 py-1.5 rounded-lg border border-light-c bg-surface text-base-c disabled:bg-surface2 disabled:text-hint-c"
                      >
                    </td>
                  </tr>
                  <tr>
                    <td class="border border-light-c px-2.5 py-2 text-center whitespace-nowrap text-muted-c">發票號碼：</td>
                    <td class="border border-light-c px-2.5 py-2 text-center">
                      <input v-model="form.invoice.receiptNumber" type="text" class="w-full px-2 py-1.5 rounded-lg border border-light-c bg-surface text-base-c">
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div class="text-center py-6">
          <button
            :disabled="submitting"
            class="px-8 py-2.5 text-sm font-medium bg-green-700 text-white rounded-xl hover:bg-green-800 disabled:opacity-50 transition-colors"
            @click="submitUpdate"
          >
            {{ submitting ? '更新中…' : '更新訂單資料' }}
          </button>
        </div>
      </template>
    </div>
  </div>
</template>
