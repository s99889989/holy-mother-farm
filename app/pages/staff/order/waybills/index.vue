<template>
  <div class="p-4 max-w-screen-xl mx-auto text-sm text-base-c">

    <!-- 標題 -->
    <div class="text-base font-bold text-muted-c dark:text-hint-c mb-3">黑貓貨單管理</div>

    <!-- ════════════════════════ 列表區 ════════════════════════ -->

    <!-- 篩選列 -->
    <div class="flex gap-3 mb-3 flex-wrap items-center">
      <span class="text-hint-c dark:text-hint-c">依收件人姓名/地址/手機/電話過濾單：</span>
      <input v-model="keyword" type="text" placeholder="姓名 / 電話 / 託運單號"
             class="border border-base rounded px-3 py-1.5 w-60 bg-surface text-base-c placeholder:text-hint-c dark:placeholder:text-hint-c"
             @keyup.enter="search" />
      <button @click="search"      class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-1.5 rounded">過濾</button>
      <button @click="resetSearch" class="bg-surface2 hover-border text-base-c px-4 py-1.5 rounded">取消過濾</button>
    </div>

    <!-- 分頁資訊 -->
    <div class="flex gap-2 mb-2 items-center text-sm flex-wrap">
      <button :disabled="page <= 1" @click="page = 1; refreshList()"
              class="border border-base px-3 py-1 rounded disabled:opacity-40 bg-surface text-muted-c hover:bg-surface2">&lt;&lt; 第一頁</button>
      <button :disabled="page <= 1" @click="page--; refreshList()"
              class="border border-base px-3 py-1 rounded disabled:opacity-40 bg-surface text-muted-c hover:bg-surface2">&lt; 前一頁</button>
      <span class="text-muted-c">第 {{ page }} 頁 / 共 {{ totalPages }} 頁（{{ listData?.total }} 筆）</span>
      <button :disabled="page >= totalPages" @click="page++; refreshList()"
              class="border border-base px-3 py-1 rounded disabled:opacity-40 bg-surface text-muted-c hover:bg-surface2">下一頁 &gt;</button>
      <button :disabled="page >= totalPages" @click="page = totalPages; refreshList()"
              class="border border-base px-3 py-1 rounded disabled:opacity-40 bg-surface text-muted-c hover:bg-surface2">最後一頁 &gt;&gt;</button>
      <span class="text-hint-c dark:text-hint-c">每頁</span>
      <select v-model="limit" class="border border-base rounded px-2 py-1 bg-surface text-base-c" @change="page=1; refreshList()">
        <option :value="10">10</option>
        <option :value="20">20</option>
        <option :value="50">50</option>
      </select>
      <span class="text-hint-c dark:text-hint-c">筆</span>
    </div>

    <!-- 表格 -->
    <div class="overflow-x-auto rounded-md border p-4 border-light-c">
      <table class="w-full border-collapse text-sm">
        <thead class="bg-teal-600 dark:bg-teal-800 text-white">
        <tr>
          <th class="border border-teal-700 dark:border-teal-900 px-2 py-2 w-8">
            <input type="checkbox" @change="toggleAll" :checked="allChecked" />
          </th>
          <th class="border border-teal-700 dark:border-teal-900 px-2 py-2 w-12 text-center whitespace-nowrap">編輯</th>
          <th class="border border-teal-700 dark:border-teal-900 px-3 py-2 text-left whitespace-nowrap">託運單號</th>
          <th class="border border-teal-700 dark:border-teal-900 px-3 py-2 text-left whitespace-nowrap">收件人</th>
          <th class="border border-teal-700 dark:border-teal-900 px-3 py-2 text-left">地址</th>
          <th class="border border-teal-700 dark:border-teal-900 px-3 py-2 text-left whitespace-nowrap">郵遞區號</th>
          <th class="border border-teal-700 dark:border-teal-900 px-3 py-2 text-left whitespace-nowrap">配送限制</th>
          <th class="border border-teal-700 dark:border-teal-900 px-3 py-2 text-left whitespace-nowrap">手機</th>
          <th class="border border-teal-700 dark:border-teal-900 px-3 py-2 text-left whitespace-nowrap">電話</th>
          <th class="border border-teal-700 dark:border-teal-900 px-3 py-2 text-left whitespace-nowrap">特殊地點</th>
          <th class="border border-teal-700 dark:border-teal-900 px-3 py-2 text-left whitespace-nowrap">偏遠地址</th>
          <th class="border border-teal-700 dark:border-teal-900 px-3 py-2 text-left">品名</th>
          <th class="border border-teal-700 dark:border-teal-900 px-3 py-2 text-left whitespace-nowrap">訂單編號</th>
          <th class="border border-teal-700 dark:border-teal-900 px-3 py-2 text-left whitespace-nowrap">代收貨款</th>
          <th class="border border-teal-700 dark:border-teal-900 px-3 py-2 text-left whitespace-nowrap">收貨日期</th>
          <th class="border border-teal-700 dark:border-teal-900 px-3 py-2 text-left whitespace-nowrap">希望配達時段</th>
          <th class="border border-teal-700 dark:border-teal-900 px-3 py-2 text-left whitespace-nowrap">希望配達日期</th>
          <th class="border border-teal-700 dark:border-teal-900 px-3 py-2 text-left whitespace-nowrap">託運單狀態</th>
          <th class="border border-teal-700 dark:border-teal-900 px-3 py-2 text-left whitespace-nowrap">紙張種類</th>
        </tr>
        </thead>
        <tbody class="divide-y divide-base">
        <tr v-if="!listData?.rows?.length">
          <td colspan="18" class="border border-light-c px-4 py-6 text-center text-hint-c dark:text-hint-c">無資料</td>
        </tr>
        <tr
          v-for="row in listData?.rows"
          :key="row.id"
          class="transition-colors bg-surface hover:bg-blue-50"
          :class="{
 'bg-yellow-100 dark:bg-yellow-900/40 font-semibold': editingId === row.id,
 'bg-yellow-50 dark:bg-yellow-900/20': selectedIds.includes(row.id) && editingId !== row.id
 }"
        >
          <td class="border border-light-c px-2 py-1 text-center">
            <input type="checkbox" :value="row.id" v-model="selectedIds" />
          </td>
          <td class="border border-light-c px-2 py-1 text-center">
            <button @click="loadRowToForm(row)"
                    class="text-xs px-2 py-0.5 rounded bg-yellow-400 hover:bg-yellow-500 dark:bg-yellow-500 dark:hover:bg-yellow-600 text-white font-bold whitespace-nowrap">
              ✏️
            </button>
          </td>
          <td class="border border-light-c px-3 py-1 font-mono text-blue-600 dark:text-blue-400 whitespace-nowrap">{{ row.tracking_no }}</td>
          <td class="border border-light-c px-3 py-1 whitespace-nowrap">{{ row.customer_name }}</td>
          <td class="border border-light-c px-3 py-1 whitespace-nowrap max-w-[180px] overflow-hidden text-ellipsis" :title="row.customer_address">{{ row.customer_address }}</td>
          <td class="border border-light-c px-3 py-1 whitespace-nowrap">{{ row.customer_postcode }}</td>
          <td class="border border-light-c px-3 py-1"></td>
          <td class="border border-light-c px-3 py-1 whitespace-nowrap">{{ row.customer_mobile }}</td>
          <td class="border border-light-c px-3 py-1 whitespace-nowrap">{{ row.customer_phone }}</td>
          <td class="border border-light-c px-3 py-1"></td>
          <td class="border border-light-c px-3 py-1"></td>
          <td class="border border-light-c px-3 py-1 whitespace-nowrap max-w-[120px] overflow-hidden text-ellipsis" :title="row.production_name">{{ row.production_name }}</td>
          <td class="border border-light-c px-3 py-1 whitespace-nowrap">{{ row.order_no }}</td>
          <td class="border border-light-c px-3 py-1 whitespace-nowrap">{{ row.price }}</td>
          <td class="border border-light-c px-3 py-1 whitespace-nowrap">{{ row.send_date }}</td>
          <td class="border border-light-c px-3 py-1 whitespace-nowrap">{{ deliverTimeLabel(row.deliver_time) }}</td>
          <td class="border border-light-c px-3 py-1 whitespace-nowrap">{{ row.deliver_date }}</td>
          <td class="border border-light-c px-3 py-1 whitespace-nowrap">{{ row.state }}</td>
          <td class="border border-light-c px-3 py-1 whitespace-nowrap">{{ paperName(row.paper_id) }}</td>
        </tr>
        </tbody>
      </table>
    </div>

    <div class="flex gap-3 mb-4 mt-4 items-center">
      <button @click="resetForm"
              class="border border-base px-4 py-1.5 rounded bg-surface hover-surface2 text-base-c">
        ✚ 清空填寫資料
      </button>
    </div>

    <div class="mb-2 text-muted-c dark:text-hint-c">目前契客代號：<strong class="text-base-c">{{ form.sender_code }}</strong></div>

    <!-- ════════════════════════ 託運單表單 ════════════════════════ -->
    <div class="border border-base rounded-md overflow-hidden mb-4">
      <div class="bg-teal-500 dark:bg-teal-700 text-white px-4 py-2 font-bold">託運單資料</div>
      <div class="p-4 bg-pink-50 space-y-4">

        <!-- Header：契客 / 寄件人 / 紙張 / 單號 -->
        <div class="flex flex-wrap gap-3 items-center">
          <label class="text-muted-c dark:text-hint-c">契客代號</label>
          <select v-model="form.sender_code" class="border border-base rounded px-2 py-1 bg-surface text-base-c">
            <option v-for="a in (accounts as any[])" :key="a.login" :value="a.login">{{ a.login }}</option>
          </select>

          <label class="text-muted-c dark:text-hint-c">寄件人</label>
          <select v-model="form.sender_id" class="border border-base rounded px-2 py-1 bg-surface text-base-c" @change="onSenderChange">
            <option v-for="s in (senders as any[])" :key="s.id" :value="s.id">{{ s.name }}</option>
          </select>

          <label class="text-muted-c dark:text-hint-c">紙張種類</label>
          <select v-model="form.paper_id" class="border border-base rounded px-2 py-1 bg-surface text-base-c">
            <option v-for="p in (papers as any[])" :key="p.id" :value="p.id">{{ p.name }}</option>
          </select>

          <label class="text-muted-c dark:text-hint-c">託運單號</label>
          <input type="text"
                 :value="editingId ? form.tracking_no : '（儲存後自動產生）'"
                 readonly
                 class="border border-base rounded px-2 py-1 bg-surface2 text-hint-c dark:text-hint-c w-44" />
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">

          <!-- ── 左欄 ── -->
          <div class="space-y-4">

            <!-- 收件人 -->
            <fieldset class="border border-base rounded p-3 bg-surface">
              <legend class="font-bold text-pink-700 dark:text-pink-400 px-1">收件人</legend>
              <div class="grid grid-cols-3 gap-2 mt-2">
                <div>
                  <label class="text-hint-c dark:text-hint-c block">代號</label>
                  <input v-model="form.customer_code" type="text" class="border border-base rounded px-2 py-1 w-full bg-surface text-base-c" />
                </div>
                <div>
                  <label class="text-hint-c dark:text-hint-c block">電話</label>
                  <input v-model="form.customer_phone" type="text" class="border border-base rounded px-2 py-1 w-full bg-surface text-base-c" />
                </div>
                <div>
                  <label class="text-hint-c dark:text-hint-c block">手機(ex:0912-345-678)</label>
                  <input v-model="form.customer_mobile" type="text" class="border border-base rounded px-2 py-1 w-full bg-surface text-base-c" />
                </div>
              </div>
              <div class="mt-2">
                <label class="text-hint-c dark:text-hint-c block">地址</label>
                <input v-model="form.customer_address" type="text" class="border border-base rounded px-2 py-1 w-full bg-surface text-base-c" />
              </div>
              <div class="mt-2">
                <label class="text-hint-c dark:text-hint-c block">姓名</label>
                <input v-model="form.customer_name" type="text" class="border border-base rounded px-2 py-1 w-1/2 bg-surface text-base-c" />
              </div>
            </fieldset>

            <!-- 設定寄件人 -->
            <fieldset class="border border-base rounded p-3 bg-surface">
              <legend class="px-1 text-muted-c">
                <label class="flex items-center gap-1 cursor-pointer">
                  <input type="checkbox" v-model="form.default_sender" />
                  <span>設定寄件人（不勾選會使用預設值）</span>
                </label>
              </legend>
              <div v-if="form.default_sender" class="space-y-2 mt-2">
                <div class="grid grid-cols-3 gap-2">
                  <div>
                    <label class="text-hint-c dark:text-hint-c block">代號</label>
                    <input v-model="form.sender_no" type="text" class="border border-base rounded px-2 py-1 w-full bg-surface text-base-c" />
                  </div>
                  <div>
                    <label class="text-hint-c dark:text-hint-c block">電話</label>
                    <input v-model="form.sender_phone" type="text" class="border border-base rounded px-2 py-1 w-full bg-surface text-base-c" />
                  </div>
                  <div>
                    <label class="text-hint-c dark:text-hint-c block">手機(ex:0912-345-678)</label>
                    <input v-model="form.sender_mobile" type="text" class="border border-base rounded px-2 py-1 w-full bg-surface text-base-c" />
                  </div>
                </div>
                <div>
                  <label class="text-hint-c dark:text-hint-c block">地址</label>
                  <input v-model="form.sender_address" type="text" class="border border-base rounded px-2 py-1 w-full bg-surface text-base-c" />
                </div>
                <div>
                  <label class="text-hint-c dark:text-hint-c block">姓名</label>
                  <input v-model="form.sender_name" type="text" class="border border-base rounded px-2 py-1 w-1/2 bg-surface text-base-c" />
                </div>
              </div>
            </fieldset>

            <!-- 品名 / 訂單 / 備註 -->
            <fieldset class="border border-base rounded p-3 bg-surface">
              <div>
                <label class="text-hint-c dark:text-hint-c block">品名（A4-2模、A4-3模10個字；熱轉印7個字，超過換行）</label>
                <div class="flex gap-2 mt-1">
                  <select v-model="form.production_kind" class="border border-base rounded px-2 py-1 w-36 bg-surface text-base-c">
                    <option v-for="p in (productnames as any[])" :key="p.product_id" :value="p.product_name">{{ p.product_name }}</option>
                  </select>
                  <input v-model="form.production_name" type="text" class="border border-base rounded px-2 py-1 flex-1 bg-surface text-base-c" />
                </div>
                <p class="text-red-500 dark:text-red-400 text-xs mt-1">※品名內容不得為文件、標單、明信片、郵簡、信函、資料、發票、訴訟文件、公文、身分證明文件、報名表、申請書、帳單、訂單、報價單、繳費單、通知單、保險單、文書、檢體</p>
              </div>
              <div class="grid grid-cols-2 gap-2 mt-2">
                <div>
                  <label class="text-hint-c dark:text-hint-c block">訂單編號</label>
                  <input v-model="form.order_no" type="text" class="border border-base rounded px-2 py-1 w-full bg-surface text-base-c" />
                </div>
                <div>
                  <label class="text-hint-c dark:text-hint-c block">備註</label>
                  <input v-model="form.comment" type="text" class="border border-base rounded px-2 py-1 w-full bg-surface text-base-c" />
                </div>
              </div>
            </fieldset>

          </div>

          <!-- ── 右欄 ── -->
          <div class="space-y-4">

            <!-- 配送選項 -->
            <fieldset class="border border-base rounded p-3 bg-surface">
              <legend class="font-bold text-pink-700 dark:text-pink-400 px-1">配送選項</legend>
              <div class="grid grid-cols-2 gap-3 mt-2">
                <div>
                  <label class="text-hint-c dark:text-hint-c block">收貨日期</label>
                  <input v-model="form.send_date" type="text" placeholder="YYYY/MM/DD" class="border border-base rounded px-2 py-1 w-full bg-surface text-base-c placeholder:text-hint-c dark:placeholder:text-hint-c" />
                </div>
                <div>
                  <label class="text-hint-c dark:text-hint-c block">希望配達日期（週日不配送）</label>
                  <input v-model="form.deliver_date" type="text" placeholder="YYYY/MM/DD" class="border border-base rounded px-2 py-1 w-full bg-surface text-base-c placeholder:text-hint-c dark:placeholder:text-hint-c" />
                </div>
              </div>

              <div class="mt-3">
                <label class="text-hint-c dark:text-hint-c block mb-1">希望配達時段</label>
                <div class="flex gap-4">
                  <label v-for="t in deliverTimes" :key="t.value" class="flex items-center gap-1 cursor-pointer text-muted-c">
                    <input type="radio" v-model="form.deliver_time" :value="t.value" />{{ t.label }}
                  </label>
                </div>
              </div>

              <div class="mt-3">
                <label class="text-hint-c dark:text-hint-c block mb-1">溫層</label>
                <div class="flex gap-4">
                  <label v-for="t in temperatures" :key="t.value" class="flex items-center gap-1 cursor-pointer text-muted-c">
                    <input type="radio" v-model="form.temperature" :value="t.value" />{{ t.label }}
                  </label>
                </div>
              </div>

              <div class="mt-3">
                <label class="text-hint-c dark:text-hint-c block mb-1">尺寸</label>
                <div class="flex gap-4">
                  <label v-for="s in packageSizes" :key="s.value" class="flex items-center gap-1 cursor-pointer text-muted-c">
                    <input type="radio" v-model="form.package_size" :value="s.value" />{{ s.label }}
                  </label>
                </div>
              </div>

              <div class="mt-3">
                <label class="text-hint-c dark:text-hint-c block mb-1">注意事項</label>
                <div class="flex gap-4">
                  <label class="flex items-center gap-1 cursor-pointer text-muted-c">
                    <input type="checkbox" v-model="form.breakable" true-value="yes" false-value="no" />易碎物品
                  </label>
                  <label class="flex items-center gap-1 cursor-pointer text-muted-c">
                    <input type="checkbox" v-model="form.precision_instrument" true-value="yes" false-value="no" />精密儀器
                  </label>
                </div>
              </div>
            </fieldset>

            <!-- 單據類型 + 代收 -->
            <fieldset class="border border-base rounded p-3 bg-surface">
              <div class="flex gap-4 mb-3">
                <label v-for="t in waybillTypes" :key="t.value" class="flex items-center gap-1 cursor-pointer text-muted-c">
                  <input type="radio" v-model="form.waybilltype" :value="t.value" />{{ t.label }}
                </label>
              </div>
              <div class="space-y-2">
                <div>
                  <label class="text-hint-c dark:text-hint-c block">
                    {{ form.waybilltype === 'N' ? '收件人付運費' : form.waybilltype === 'B' ? '代收金額' : '非代收貨款託運單' }}
                  </label>
                  <input v-model.number="form.price" type="number" min="0"
                         :disabled="form.waybilltype === 'A'"
                         class="border border-base rounded px-2 py-1 w-40 bg-surface text-base-c"
                         :class="{ 'bg-surface2': form.waybilltype === 'A' }" />
                </div>
                <div>
                  <label class="text-hint-c dark:text-hint-c block">商品報值金額（若要附加服務請直接輸入金額）</label>
                  <input v-model.number="form.insurance" type="number" min="0" class="border border-base rounded px-2 py-1 w-40 bg-surface text-base-c" />
                  <span class="text-hint-c dark:text-hint-c text-xs ml-2">（非必選填、選填時會加價）</span>
                </div>
              </div>
            </fieldset>

            <!-- 設定發票（停用） -->
            <fieldset class="border border-base rounded p-3 bg-surface opacity-50">
              <legend class="px-1">
                <label class="flex items-center gap-1 text-hint-c dark:text-hint-c">
                  <input type="checkbox" disabled />
                  設定發票資訊（不勾選會使用預設值）
                </label>
              </legend>
            </fieldset>

          </div>
        </div>

        <!-- 錯誤 / 成功訊息 -->
        <div v-if="formError"   class="bg-red-100 dark:bg-red-900/40 border border-red-400 dark:border-red-700 text-red-700 dark:text-red-300 px-4 py-2 rounded">{{ formError }}</div>
        <div v-if="formSuccess" class="bg-green-100 dark:bg-green-900/40 border border-green-400 dark:border-green-700 text-green-700 dark:text-green-300 px-4 py-2 rounded">{{ formSuccess }}</div>

        <!-- 操作按鈕（對應黑貓四個按鈕） -->
        <div class="flex gap-2 flex-wrap items-center pt-1">
          <!-- 更新（有選擇舊單時顯示） / 新增 -->
          <button v-if="editingId" @click="updateForm" :disabled="submitting"
                  class="bg-yellow-400 hover:bg-yellow-500 dark:bg-yellow-500 dark:hover:bg-yellow-600 text-white font-bold px-5 py-2 rounded disabled:opacity-50">
            {{ submitting ? '更新中…' : '更新這張託運單' }}
          </button>
          <button v-else @click="submitForm" :disabled="submitting"
                  class="bg-yellow-400 hover:bg-yellow-500 dark:bg-yellow-500 dark:hover:bg-yellow-600 text-white font-bold px-5 py-2 rounded disabled:opacity-50">
            {{ submitting ? '儲存中…' : '新增這筆託運單' }}
          </button>

          <!-- 刪除選取 -->
          <button @click="deleteSelected"
                  class="bg-red-500 hover:bg-red-600 text-white px-5 py-2 rounded">
            刪除選取託運單
          </button>

          <!-- 列印選取 -->
          <button @click="printSelected"
                  class="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded">
            列印選取託運單
          </button>

          <!-- 列印全部（本頁） -->
          <button @click="printAll"
                  class="bg-teal-600 hover:bg-teal-700 text-white px-5 py-2 rounded">
            列印託運單
          </button>
        </div>

      </div>
    </div>





  </div>
</template>

<script setup lang="ts">
definePageMeta({layout: 'staff'})

const commonStore = useCommonStore()
const BASE = () => commonStore.data.main_url + '/holy/t-cat'

// ── 下拉資料 ───────────────────────────────────────────────────
const accounts     = ref<any[]>([])
const senders      = ref<any[]>([])
const papers       = ref<any[]>([])
const productnames = ref<any[]>([])

async function loadMeta() {
  const b = BASE()
  const [acc, sen, pap, prd] = await Promise.all([
    $fetch<any[]>(`${b}/meta`, { params: { type: 'accounts' } }),
    $fetch<any[]>(`${b}/meta`, { params: { type: 'senders' } }),
    $fetch<any[]>(`${b}/meta`, { params: { type: 'papers' } }),
    $fetch<any[]>(`${b}/meta`, { params: { type: 'productnames' } }),
  ])
  accounts.value     = acc ?? []
  senders.value      = sen ?? []
  papers.value       = pap ?? []
  productnames.value = prd ?? []
}

// ── 靜態選項 ──────────────────────────────────────────
const deliverTimes = [
  { value: '1', label: '13時前' },
  { value: '2', label: '14-18時' },
  { value: '4', label: '不指定' },
]
const temperatures = [
  { value: '0001', label: '常溫' },
  { value: '0002', label: '冷藏' },
  { value: '0003', label: '冷凍' },
]
const packageSizes = [
  { value: '0001', label: '60cm' },
  { value: '0002', label: '90cm' },
  { value: '0003', label: '120cm' },
  { value: '0004', label: '150cm' },
]
const waybillTypes = [
  { value: 'A', label: '一般單' },
  { value: 'B', label: '代收單' },
  { value: 'N', label: '到付單' },
]

// ── 輔助函式 ──────────────────────────────────────────
const deliverTimeMap: Record<string, string> = {
  '1': '13時前', '2': '14-18時', '4': '不指定', '5': '20-21時'
}
const deliverTimeLabel = (v: any) => deliverTimeMap[String(v)] ?? v ?? ''
const paperName = (id: any) =>
  (papers.value as any[])?.find((p: any) => p.id === id)?.name ?? ''

// ── 預設值輔助 ────────────────────────────────────────
const todayStr = () => {
  const d = new Date()
  return `${d.getFullYear()}/${String(d.getMonth()+1).padStart(2,'0')}/${String(d.getDate()).padStart(2,'0')}`
}
const tomorrowStr = () => {
  const d = new Date(); d.setDate(d.getDate() + 1)
  return `${d.getFullYear()}/${String(d.getMonth()+1).padStart(2,'0')}/${String(d.getDate()).padStart(2,'0')}`
}

// ── 表單 state ────────────────────────────────────────
const editingId = ref<number | null>(null)   // null = 新增模式，有值 = 編輯模式

function makeForm() {
  const acct   = (accounts.value    as any[])?.[0]
  const sender = (senders.value     as any[])?.find((s:any) => s.default_sender)
    ?? (senders.value     as any[])?.[0]
  const paper  = (papers.value as any[])?.find((p:any) => p.id === 2) ?? (papers.value as any[])?.[0]
  const pname  = (productnames.value as any[])?.[0]

  return {
    sender_code:          acct?.login        ?? '',
    sender_id:            sender?.id         ?? null,
    paper_id:             paper?.id          ?? null,
    tracking_no:          '',
    customer_code:        '',
    customer_name:        '',
    customer_phone:       '',
    customer_mobile:      '',
    customer_address:     '',
    customer_postcode:    '',
    default_sender:       false,
    sender_no:            '',
    sender_name:          sender?.name       ?? '',
    sender_phone:         sender?.phone      ?? '',
    sender_mobile:        sender?.mobile     ?? '',
    sender_address:       sender?.address    ?? '',
    sender_postcode:      sender?.postcode   ?? '',
    production_kind:      pname?.product_name ?? '',
    production_name:      '',
    order_no:             '',
    comment:              '',
    send_date:            todayStr(),
    deliver_date:         tomorrowStr(),
    deliver_time:         '1',
    temperature:          '0001',
    package_size:         '0002',
    breakable:            'no',
    precision_instrument: 'no',
    waybilltype:          'A',
    price:                0,
    hasinsurance:         'no',
    insurance:            0,
  }
}

const form = reactive(makeForm())

// 切換寄件人時自動填入
function onSenderChange() {
  const s = (senders.value as any[])?.find((x: any) => x.id === form.sender_id)
  if (s && form.default_sender) {
    form.sender_name     = s.name     ?? ''
    form.sender_phone    = s.phone    ?? ''
    form.sender_mobile   = s.mobile   ?? ''
    form.sender_address  = s.address  ?? ''
    form.sender_postcode = s.postcode ?? ''
  }
}

function resetForm() {
  editingId.value = null
  Object.assign(form, makeForm())
  formError.value   = ''
  formSuccess.value = ''
  selectedIds.value = []
}

// ── 表單訊息 ──────────────────────────────────────────
const submitting  = ref(false)
const formError   = ref('')
const formSuccess = ref('')

// 新增
async function submitForm() {
  formError.value   = ''
  formSuccess.value = ''
  if (!form.customer_name)    return (formError.value = '請填寫收件人姓名')
  if (!form.customer_address) return (formError.value = '請填寫收件人地址')
  if (!form.production_name)  return (formError.value = '請填寫品名')

  submitting.value = true
  try {
    const res = await $fetch<any>(`${BASE()}/waybills`, { method: 'POST', body: { ...form } })
    formSuccess.value = `✅ 建立成功！託運單號：${res.tracking_no}`
    resetForm()
    await refreshList()
  } catch (e: any) {
    formError.value = e?.data?.message ?? e?.statusMessage ?? '建立失敗，請確認是否有可用託運單號'
  } finally {
    submitting.value = false
  }
}

// 更新
async function updateForm() {
  if (!editingId.value) return
  formError.value   = ''
  formSuccess.value = ''
  if (!form.customer_name)    return (formError.value = '請填寫收件人姓名')
  if (!form.customer_address) return (formError.value = '請填寫收件人地址')
  if (!form.production_name)  return (formError.value = '請填寫品名')

  submitting.value = true
  try {
    await $fetch(`${BASE()}/waybills/${editingId.value}`, { method: 'PATCH', body: { ...form } })
    formSuccess.value = `✅ 更新成功！託運單號：${form.tracking_no}`
    resetForm()
    await refreshList()
  } catch (e: any) {
    formError.value = e?.data?.message ?? e?.statusMessage ?? '更新失敗'
  } finally {
    submitting.value = false
  }
}

// 點列表列 → 帶入表單（編輯模式）
function loadRowToForm(row: any) {
  editingId.value = row.id
  form.tracking_no          = row.tracking_no       ?? ''
  form.sender_code          = row.sender_code        ?? form.sender_code
  form.paper_id             = row.paper_id           ?? form.paper_id
  form.customer_code        = row.customer_code      ?? ''
  form.customer_name        = row.customer_name      ?? ''
  form.customer_phone       = row.customer_phone     ?? ''
  form.customer_mobile      = row.customer_mobile    ?? ''
  form.customer_address     = row.customer_address   ?? ''
  form.customer_postcode    = row.customer_postcode  ?? ''
  form.production_kind      = row.production_kind    ?? ''
  form.production_name      = row.production_name    ?? ''
  form.order_no             = row.order_no           ?? ''
  form.comment              = row.comment            ?? ''
  form.send_date            = row.send_date          ?? todayStr()
  form.deliver_date         = row.deliver_date       ?? tomorrowStr()
  form.deliver_time         = String(row.deliver_time ?? '1')
  form.temperature          = row.temperature        ?? '0001'
  form.package_size         = row.package_size       ?? '0002'
  form.breakable            = row.breakable          ?? 'no'
  form.precision_instrument = row.precision_instrument ?? 'no'
  form.waybilltype          = row.waybilltype        ?? 'A'
  form.price                = row.price              ?? 0
  form.insurance            = row.insurance          ?? 0
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

// ── 列表 ──────────────────────────────────────────────
const keyword     = ref('')
const startDate   = ref('')
const endDate     = ref('')
const page        = ref(1)
const limit       = ref(10)
const selectedIds = ref<number[]>([])

const listData = ref<any>(null)

async function refreshList() {
  try {
    listData.value = await $fetch<any>(`${BASE()}/waybills`, {
      params: {
        keyword: keyword.value,
        start_date: startDate.value,
        end_date: endDate.value,
        page: page.value,
        limit: limit.value,
      }
    })
  } catch { listData.value = null }
}

const totalPages = computed(() => Math.ceil((listData.value?.total || 0) / limit.value))

const allChecked = computed(() =>
  !!listData.value?.rows?.length &&
  listData.value.rows.every((r: any) => selectedIds.value.includes(r.id))
)

function toggleAll(e: Event) {
  const checked = (e.target as HTMLInputElement).checked
  selectedIds.value = checked
    ? (listData.value?.rows?.map((r: any) => r.id) ?? [])
    : []
}

function search() { page.value = 1; refreshList() }

function resetSearch() {
  keyword.value   = ''
  startDate.value = ''
  endDate.value   = ''
  page.value      = 1
  refreshList()
}

// 刪除選取
async function deleteSelected() {
  if (!selectedIds.value.length) return alert('請先勾選要刪除的託運單')
  if (!confirm(`確定刪除選取的 ${selectedIds.value.length} 筆託運單？`)) return
  try {
    await $fetch(`${BASE()}/waybills/bulk-delete`, {
      method: 'POST',
      body: { ids: selectedIds.value }
    })
    selectedIds.value = []
    if (editingId.value && !listData.value?.rows?.find((r:any) => r.id === editingId.value)) {
      resetForm()
    }
    await refreshList()
  } catch {
    alert('刪除失敗')
  }
}

// 列印 → 直接產生 PDF 下載
async function doPrint(ids: number[]) {
  if (!ids.length) return alert('沒有可列印的託運單')
  try {
    const res = await $fetch<Blob>('/api/waybills/generate-pdf', {
      method: 'POST',
      body: { ids, paper_id: form.paper_id },
      responseType: 'blob',
    })
    const url = URL.createObjectURL(res)
    const a = document.createElement('a')
    a.href = url
    a.download = `waybills_${Date.now()}.pdf`
    a.click()
    URL.revokeObjectURL(url)
    await refreshList()
  } catch (e: any) {
    alert(e?.data?.message ?? '產生 PDF 失敗')
  }
}

// 列印選取
function printSelected() {
  if (!selectedIds.value.length) return alert('請先勾選要列印的託運單')
  doPrint(selectedIds.value)
}

// 列印全部（本頁）
function printAll() {
  const ids = listData.value?.rows?.map((r: any) => r.id) ?? []
  doPrint(ids)
}
onMounted(async () => {
  await loadMeta()
  await refreshList()
})
</script>