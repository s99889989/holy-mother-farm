<template>
  <div class="p-6 max-w-6xl mx-auto text-sm">

    <!-- 標題列 -->
    <div class="text-base font-bold text-gray-700 mb-3">建立託運單 ＞ 建立託運單－單筆</div>

    <div class="flex gap-3 mb-4">
      <button @click="resetForm"
              class="border px-4 py-1.5 rounded bg-white hover:bg-gray-50 text-sm">
        ✚ 清空填寫資料
      </button>
    </div>

    <!-- 託運單資料區塊 -->
    <div class="border rounded-md overflow-hidden mb-6">
      <div class="bg-teal-500 text-white px-4 py-2 font-bold">託運單資料</div>
      <div class="p-4 bg-pink-50 space-y-4">

        <!-- Header 列：契客代號 / 寄件人 / 紙張種類 / 託運單號 -->
        <div class="flex flex-wrap gap-3 items-center text-sm">
          <label class="text-gray-600">契客代號</label>
          <select v-model="form.sender_code" class="border rounded px-2 py-1">
            <option v-for="a in accounts" :key="a.login" :value="a.login">{{ a.login }}</option>
          </select>

          <label class="text-gray-600">寄件人</label>
          <select v-model="form.sender_id" class="border rounded px-2 py-1" @change="onSenderChange">
            <option v-for="s in senders" :key="s.id" :value="s.id">{{ s.name }}</option>
          </select>

          <label class="text-gray-600">紙張種類</label>
          <select v-model="form.paper_id" class="border rounded px-2 py-1">
            <option v-for="p in papers" :key="p.id" :value="p.id">{{ p.name }}</option>
          </select>

          <label class="text-gray-600">託運單號</label>
          <input type="text" :value="'（儲存後自動產生）'" readonly
                 class="border rounded px-2 py-1 bg-gray-100 text-gray-500 w-44" />
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">

          <!-- 左側 -->
          <div class="space-y-4">

            <!-- 收件人 -->
            <fieldset class="border rounded p-3 bg-white">
              <legend class="font-bold text-pink-700 px-1">收件人</legend>
              <div class="grid grid-cols-3 gap-2 mt-2">
                <div>
                  <label class="text-gray-500">代號</label>
                  <input v-model="form.customer_code" type="text" class="border rounded px-2 py-1 text-sm w-full" />
                </div>
                <div>
                  <label class="text-gray-500">電話</label>
                  <input v-model="form.customer_phone" type="text" class="border rounded px-2 py-1 text-sm w-full" />
                </div>
                <div>
                  <label class="text-gray-500">手機</label>
                  <input v-model="form.customer_mobile" type="text" placeholder="0912-345-678" class="border rounded px-2 py-1 text-sm w-full" />
                </div>
              </div>
              <div class="mt-2">
                <label class="text-gray-500">地址</label>
                <input v-model="form.customer_address" type="text" class="border rounded px-2 py-1 text-sm w-full" />
              </div>
              <div class="mt-2 w-1/2">
                <label class="text-gray-500">姓名</label>
                <input v-model="form.customer_name" type="text" class="border rounded px-2 py-1 text-sm w-full" />
              </div>
            </fieldset>

            <!-- 設定寄件人 -->
            <fieldset class="border rounded p-3 bg-white">
              <legend class="px-1">
                <label class="flex items-center gap-1 cursor-pointer">
                  <input type="checkbox" v-model="form.default_sender" />
                  <span>設定寄件人（不勾選會使用預設值）</span>
                </label>
              </legend>
              <div v-if="form.default_sender" class="space-y-2 mt-2">
                <div class="grid grid-cols-3 gap-2">
                  <div>
                    <label class="text-gray-500">代號</label>
                    <input v-model="form.sender_no" type="text" class="border rounded px-2 py-1 text-sm w-full" />
                  </div>
                  <div>
                    <label class="text-gray-500">電話</label>
                    <input v-model="form.sender_phone" type="text" class="border rounded px-2 py-1 text-sm w-full" />
                  </div>
                  <div>
                    <label class="text-gray-500">手機</label>
                    <input v-model="form.sender_mobile" type="text" placeholder="0912-345-678" class="border rounded px-2 py-1 text-sm w-full" />
                  </div>
                </div>
                <div>
                  <label class="text-gray-500">地址</label>
                  <input v-model="form.sender_address" type="text" class="border rounded px-2 py-1 text-sm w-full" />
                </div>
                <div class="w-1/2">
                  <label class="text-gray-500">姓名</label>
                  <input v-model="form.sender_name" type="text" class="border rounded px-2 py-1 text-sm w-full" />
                </div>
              </div>
            </fieldset>

            <!-- 品名 / 訂單 / 備註 -->
            <fieldset class="border rounded p-3 bg-white">
              <div class="space-y-2">
                <div>
                  <label class="text-gray-500 block">品名（A4-2模、A4-3模10個字；熱轉印7個字，超過換行）</label>
                  <div class="flex gap-2 mt-1">
                    <select v-model="form.production_kind" class="border rounded px-2 py-1 w-36">
                      <option v-for="p in productnames" :key="p.product_id" :value="p.product_name">{{ p.product_name }}</option>
                    </select>
                    <input v-model="form.production_name" type="text" class="border rounded px-2 py-1 text-sm flex-1" />
                  </div>
                  <p class="text-red-500 text-xs mt-1">※品名內容不得為文件、標單、明信片、郵簡、信函、資料、發票、訴訟文件、公文、身分證明文件、報名表、申請書、帳單、訂單、報價單、繳費單、通知單、保險單、文書、檢體</p>
                </div>
                <div class="grid grid-cols-2 gap-2">
                  <div>
                    <label class="text-gray-500">訂單編號</label>
                    <input v-model="form.order_no" type="text" class="border rounded px-2 py-1 text-sm w-full" />
                  </div>
                  <div>
                    <label class="text-gray-500">備註</label>
                    <input v-model="form.comment" type="text" class="border rounded px-2 py-1 text-sm w-full" />
                  </div>
                </div>
              </div>
            </fieldset>

          </div>

          <!-- 右側：配送選項 + 單據類型 -->
          <div class="space-y-4">

            <!-- 配送選項 -->
            <fieldset class="border rounded p-3 bg-white">
              <legend class="font-bold text-pink-700 px-1">配送選項</legend>
              <div class="grid grid-cols-2 gap-3 mt-2">
                <div>
                  <label class="text-gray-500 block">收貨日期</label>
                  <input v-model="form.send_date" type="text" placeholder="YYYY/MM/DD" class="border rounded px-2 py-1 text-sm w-full" />
                </div>
                <div>
                  <label class="text-gray-500 block">希望配達日期（週日不配送）</label>
                  <input v-model="form.deliver_date" type="text" placeholder="YYYY/MM/DD" class="border rounded px-2 py-1 text-sm w-full" />
                </div>
              </div>

              <div class="mt-3">
                <label class="text-gray-500 block mb-1">希望配達時段</label>
                <div class="flex gap-4">
                  <label v-for="t in deliverTimes" :key="t.value" class="flex items-center gap-1 cursor-pointer">
                    <input type="radio" v-model="form.deliver_time" :value="t.value" />
                    <span>{{ t.label }}</span>
                  </label>
                </div>
              </div>

              <div class="mt-3">
                <label class="text-gray-500 block mb-1">溫層</label>
                <div class="flex gap-4">
                  <label v-for="t in temperatures" :key="t.value" class="flex items-center gap-1 cursor-pointer">
                    <input type="radio" v-model="form.temperature" :value="t.value" />
                    <span>{{ t.label }}</span>
                  </label>
                </div>
              </div>

              <div class="mt-3">
                <label class="text-gray-500 block mb-1">尺寸</label>
                <div class="flex gap-4">
                  <label v-for="s in packageSizes" :key="s.value" class="flex items-center gap-1 cursor-pointer">
                    <input type="radio" v-model="form.package_size" :value="s.value" />
                    <span>{{ s.label }}</span>
                  </label>
                </div>
              </div>

              <div class="mt-3">
                <label class="text-gray-500 block mb-1">注意事項</label>
                <div class="flex gap-4">
                  <label class="flex items-center gap-1 cursor-pointer">
                    <input type="checkbox" v-model="form.breakable" true-value="yes" false-value="no" />
                    <span>易碎物品</span>
                  </label>
                  <label class="flex items-center gap-1 cursor-pointer">
                    <input type="checkbox" v-model="form.precision_instrument" true-value="yes" false-value="no" />
                    <span>精密儀器</span>
                  </label>
                </div>
              </div>
            </fieldset>

            <!-- 單據類型 + 代收 -->
            <fieldset class="border rounded p-3 bg-white">
              <div class="flex gap-4 mb-3">
                <label v-for="t in waybillTypes" :key="t.value" class="flex items-center gap-1 cursor-pointer">
                  <input type="radio" v-model="form.waybilltype" :value="t.value" />
                  <span>{{ t.label }}</span>
                </label>
              </div>

              <div class="space-y-2">
                <div>
                  <label class="text-gray-500 block">
                    {{ form.waybilltype === 'N' ? '收件人付運費' : (form.waybilltype === 'B' ? '代收金額' : '非代收貨款託運單') }}
                  </label>
                  <input v-model.number="form.price" type="number" min="0"
                         :disabled="form.waybilltype === 'A'"
                         class="border rounded px-2 py-1 text-sm w-40"
                         :class="{ 'bg-gray-100': form.waybilltype === 'A' }" />
                </div>
                <div>
                  <label class="text-gray-500 block">商品報值金額（若要附加服務請直接輸入金額）</label>
                  <input v-model.number="form.insurance" type="number" min="0" class="border rounded px-2 py-1 text-sm w-40" />
                  <span class="text-gray-400 text-xs ml-2">（非必選填、選填時會加價）</span>
                </div>
              </div>
            </fieldset>

            <!-- 設定發票（跳過） -->
            <fieldset class="border rounded p-3 bg-white opacity-50">
              <legend class="px-1">
                <label class="flex items-center gap-1 text-gray-400">
                  <input type="checkbox" disabled />
                  <span>設定發票資訊（不勾選會使用預設值）</span>
                </label>
              </legend>
            </fieldset>

          </div>
        </div>

        <!-- 錯誤訊息 -->
        <div v-if="errorMsg" class="bg-red-100 border border-red-400 text-red-700 px-4 py-2 rounded">
          {{ errorMsg }}
        </div>

        <!-- 操作按鈕 -->
        <div class="flex gap-3 items-center pt-2">
          <button @click="submit" :disabled="submitting"
                  class="bg-yellow-400 hover:bg-yellow-500 text-white font-bold px-6 py-2 rounded disabled:opacity-50">
            {{ submitting ? '儲存中…' : '新增這筆託運單' }}
          </button>
          <NuxtLink to="/waybills"
                    class="bg-gray-300 hover:bg-gray-400 px-6 py-2 rounded text-gray-700">
            返回列表
          </NuxtLink>
        </div>

      </div>
    </div>

    <!-- 成功提示 -->
    <div v-if="successMsg" class="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
      {{ successMsg }}
    </div>

  </div>
</template>

<script setup lang="ts">
// ── 下拉資料 ──────────────────────────────────────────
const { data: accounts } = await useFetch('/api/webservice-accounts')
const { data: senders }  = await useFetch('/api/senders')
const { data: papers }   = await useFetch('/api/papers')
const { data: productnames } = await useFetch('/api/productnames')

// ── 預設值 ────────────────────────────────────────────
const todayStr = () => {
  const d = new Date()
  return `${d.getFullYear()}/${String(d.getMonth()+1).padStart(2,'0')}/${String(d.getDate()).padStart(2,'0')}`
}
const tomorrowStr = () => {
  const d = new Date(); d.setDate(d.getDate() + 1)
  return `${d.getFullYear()}/${String(d.getMonth()+1).padStart(2,'0')}/${String(d.getDate()).padStart(2,'0')}`
}

const defaultAccount = computed(() =>
  (accounts.value as any[])?.find((a: any) => a.default_account) ?? (accounts.value as any[])?.[0]
)
const defaultSender = computed(() =>
  (senders.value as any[])?.find((s: any) => s.default_sender) ?? (senders.value as any[])?.[0]
)
const defaultPaper = computed(() => (papers.value as any[])?.[0])

function makeForm() {
  return {
    sender_code:          defaultAccount.value?.login ?? '',
    sender_id:            defaultSender.value?.id ?? null,
    paper_id:             defaultPaper.value?.id ?? null,
    customer_code:        '',
    customer_name:        '',
    customer_phone:       '',
    customer_mobile:      '',
    customer_address:     '',
    customer_postcode:    '',
    default_sender:       false,
    sender_no:            '',
    sender_name:          defaultSender.value?.name ?? '',
    sender_phone:         defaultSender.value?.phone ?? '',
    sender_mobile:        defaultSender.value?.mobile ?? '',
    sender_address:       defaultSender.value?.address ?? '',
    sender_postcode:      defaultSender.value?.postcode ?? '',
    production_kind:      (productnames.value as any[])?.[0]?.product_name ?? '',
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

function onSenderChange() {
  const s = (senders.value as any[])?.find((x: any) => x.id === form.sender_id)
  if (s && form.default_sender) {
    form.sender_name    = s.name    ?? ''
    form.sender_phone   = s.phone   ?? ''
    form.sender_mobile  = s.mobile  ?? ''
    form.sender_address = s.address ?? ''
    form.sender_postcode= s.postcode ?? ''
  }
}

function resetForm() {
  Object.assign(form, makeForm())
  errorMsg.value   = ''
  successMsg.value = ''
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

// ── 提交 ──────────────────────────────────────────────
const submitting  = ref(false)
const errorMsg    = ref('')
const successMsg  = ref('')

async function submit() {
  errorMsg.value   = ''
  successMsg.value = ''

  if (!form.customer_name)    return (errorMsg.value = '請填寫收件人姓名')
  if (!form.customer_address) return (errorMsg.value = '請填寫收件人地址')
  if (!form.production_name)  return (errorMsg.value = '請填寫品名')

  submitting.value = true
  try {
    const res = await $fetch('/api/waybills', {
      method: 'POST',
      body: { ...form }
    }) as any
    successMsg.value = `✅ 託運單建立成功！託運單號：${res.tracking_no}`
    resetForm()
  } catch (e: any) {
    errorMsg.value = e?.data?.message ?? e?.statusMessage ?? '建立失敗，請確認是否有可用託運單號'
  } finally {
    submitting.value = false
  }
}
</script>
