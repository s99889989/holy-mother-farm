<script setup>
import ScHeader from '~/components/shopping-cart/ScHeader.vue'
import { ref, onMounted } from 'vue'

// 呼叫本專案自己的 server API route（server/api/shopping-cart/orders/[orderNo].get.ts），
// 由該 route 帶著登入 session 抓原網站 admin_order_view.php 並解析成 JSON。
definePageMeta({
  layout: 'staff'
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
      loadError.value = 'unauthorized'
    } else {
      loadError.value = err?.data?.statusMessage || '抓取原網站資料失敗，請稍後再試'
    }
  } finally {
    loading.value = false
  }
}

onMounted(fetchDetail)
</script>

<template>
  <div class="min-h-full bg-surface2 transition-colors duration-300">
    <ScHeader :title="`檢視訂單 ${orderNo}`" :show-tabs="false" />

    <div class="max-w-5xl mx-auto px-3 sm:px-4 py-4 sm:py-6 space-y-4">
      <NuxtLink to="/staff/order/shopping-cart" class="text-sm text-green-700 dark:text-green-400 hover:underline">
        ← 返回訂單清單
      </NuxtLink>

      <div v-if="loading" class="text-center py-10 text-hint-c">從原網站抓取資料中…</div>
      <div v-else-if="loadError === 'unauthorized'" class="bg-surface rounded-xl border border-light-c p-6 text-center space-y-3">
        <p class="text-muted-c text-sm">尚未登入購物車後台。</p>
        <NuxtLink to="/staff/order/shopping-cart/login" class="inline-block px-4 py-2 text-sm bg-green-700 text-white rounded-xl hover:bg-green-800 transition-colors">
          前往登入購物車後台
        </NuxtLink>
      </div>
      <p v-else-if="loadError" class="text-red-600 dark:text-red-400 text-sm">{{ loadError }}</p>

      <template v-else-if="detail">
        <div class="text-sm text-base-c">
          <span class="text-red-500">※</span> 出貨日期：
          <strong>{{ detail.shipDate || '尚未出貨' }}</strong>
        </div>

        <!-- 1、購物清單 -->
        <div class="bg-surface rounded-xl border border-light-c overflow-hidden">
          <div class="bg-surface2 px-4 py-2.5 font-semibold text-base-c text-sm border-b border-light-c">1、購物清單</div>
          <div class="p-4">
            <template v-for="section in detail.productSections" :key="section.category">
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
                    <tr v-for="item in section.items" :key="item.seq" class="text-base-c">
                      <td class="border border-light-c px-2.5 py-2 text-center">{{ item.seq }}</td>
                      <td class="border border-light-c px-2.5 py-2 text-center">{{ item.name }}</td>
                      <td class="border border-light-c px-2.5 py-2 text-center">{{ item.tempZone }}</td>
                      <td class="border border-light-c px-2.5 py-2 text-center">{{ item.price }}</td>
                      <td class="border border-light-c px-2.5 py-2 text-center">{{ item.qty }}</td>
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
              <div class="flex gap-2.5 py-2 text-sm text-base-c">
                <span class="text-muted-c flex-none w-24">付費方式</span>
                <span>{{ detail.paymentMethod }}</span>
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
                    <td class="border border-light-c px-2.5 py-2 text-center">{{ detail.costSummary.productAmount }}</td>
                  </tr>
                  <tr>
                    <td class="border border-light-c px-2.5 py-2 text-center">2</td>
                    <td class="border border-light-c px-2.5 py-2 text-center">運費金額</td>
                    <td class="border border-light-c px-2.5 py-2 text-center">{{ detail.costSummary.shippingAmount }}</td>
                  </tr>
                  <tr>
                    <td class="border border-light-c px-2.5 py-2 text-center">&nbsp;</td>
                    <td class="border border-light-c px-2.5 py-2 text-right">總計費用：</td>
                    <td class="border border-light-c px-2.5 py-2 text-center">
                      $ <span class="text-base text-green-700 dark:text-green-400 font-bold">{{ detail.costSummary.totalCost }}</span> 元
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
            <div class="p-4">
              <div class="flex gap-2.5 py-2 border-b border-light-c text-sm text-base-c">
                <span class="text-muted-c flex-none w-32"><span class="text-red-500">*</span>收件人姓名</span>
                <span>{{ detail.receiver.name }}</span>
              </div>
              <div class="flex gap-2.5 py-2 border-b border-light-c text-sm text-base-c">
                <span class="text-muted-c flex-none w-32">性別</span>
                <span>{{ detail.receiver.gender || '-' }}</span>
              </div>
              <div class="flex gap-2.5 py-2 border-b border-light-c text-sm text-base-c">
                <span class="text-muted-c flex-none w-32"><span class="text-red-500">*</span>室話</span>
                <span>
                  {{ detail.receiver.phoneArea || '-' }} - {{ detail.receiver.phoneNumber || '-' }}
                  <template v-if="detail.receiver.phoneExt"># {{ detail.receiver.phoneExt }}</template>
                </span>
              </div>
              <div class="flex gap-2.5 py-2 border-b border-light-c text-sm text-base-c">
                <span class="text-muted-c flex-none w-32"><span class="text-red-500">*</span>手機</span>
                <span>{{ detail.receiver.mobile || '-' }}</span>
              </div>
              <div class="flex gap-2.5 py-2 border-b border-light-c text-sm text-base-c">
                <span class="text-muted-c flex-none w-32"><span class="text-red-500">*</span>郵遞區號</span>
                <span>{{ detail.receiver.zipcode || '-' }}</span>
              </div>
              <div class="flex gap-2.5 py-2 border-b border-light-c text-sm text-base-c">
                <span class="text-muted-c flex-none w-32"><span class="text-red-500">*</span>郵寄地址</span>
                <span>{{ detail.receiver.address }}</span>
              </div>
              <div class="flex gap-2.5 py-2 text-sm text-base-c">
                <span class="text-muted-c flex-none w-32">備註</span>
                <span>{{ detail.receiver.note || '-' }}</span>
              </div>
            </div>
          </div>

          <!-- 4、發票抬頭 -->
          <div class="bg-surface rounded-xl border border-light-c overflow-hidden">
            <div class="bg-surface2 px-4 py-2.5 font-semibold text-base-c text-sm border-b border-light-c">4、發票抬頭</div>
            <div class="p-4">
              <table class="w-full text-sm border-collapse">
                <thead>
                  <tr class="bg-green-50 dark:bg-green-900/20">
                    <th class="border border-light-c px-2.5 py-2 text-center">項目</th>
                    <th class="border border-light-c px-2.5 py-2 text-center">內容</th>
                  </tr>
                </thead>
                <tbody class="text-base-c">
                  <tr>
                    <td class="border border-light-c px-2.5 py-2 text-center">發票形式：</td>
                    <td class="border border-light-c px-2.5 py-2 text-center">{{ detail.invoice.type || '-' }}</td>
                  </tr>
                  <tr>
                    <td class="border border-light-c px-2.5 py-2 text-center">發票抬頭：</td>
                    <td class="border border-light-c px-2.5 py-2 text-center">{{ detail.invoice.companyName || '-' }}</td>
                  </tr>
                  <tr>
                    <td class="border border-light-c px-2.5 py-2 text-center">統一編號：</td>
                    <td class="border border-light-c px-2.5 py-2 text-center">{{ detail.invoice.companyId || '-' }}</td>
                  </tr>
                  <tr>
                    <td class="border border-light-c px-2.5 py-2 text-center">發票號碼：</td>
                    <td class="border border-light-c px-2.5 py-2 text-center">{{ detail.invoice.receiptNumber || '-' }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </template>
    </div>
  </div>
</template>
