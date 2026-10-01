<template>
  <div class="min-h-full bg-surface2 transition-colors">
    <LineAiHeader
      wide
      @change="onAccountChange"
    />

    <div class="max-w-7xl mx-auto px-3 sm:px-4 py-4">
      <div
        v-if="!accountId"
        class="panel text-center py-10"
      >
        <p
          class="text-hint-c mb-3"
          style="font-size:14px"
        >
          還沒有官方帳號
        </p>
        <NuxtLink
          to="/staff/content/line-ai/settings"
          class="btn-primary inline-block"
        >
          前往設定新增
        </NuxtLink>
      </div>

      <template v-else>
        <!-- 今日概況 -->
        <div class="stat-grid mb-4">
          <div class="stat-card">
            <div class="stat-label">
              顧客
            </div>
            <div class="stat-value">
              {{ customers.length }}
            </div>
          </div>
          <div
            class="stat-card"
            style="border-left-color:#ea580c"
          >
            <div class="stat-label">
              等待回覆
            </div>
            <div class="stat-value">
              {{ countWaiting }}
            </div>
          </div>
          <div
            class="stat-card"
            style="border-left-color:#d97706"
          >
            <div class="stat-label">
              待處理轉人工
            </div>
            <div class="stat-value">
              {{ countHandoff }}
            </div>
          </div>
          <div
            class="stat-card"
            style="border-left-color:#2563eb"
          >
            <div class="stat-label">
              人工模式中
            </div>
            <div class="stat-value">
              {{ countHuman }}
            </div>
          </div>
        </div>

        <div
          class="grid lg:grid-cols-[340px_1fr] gap-4"
          style="height:calc(100vh - 260px);min-height:520px"
        >
          <!-- ───────── 顧客列表 ───────── -->
          <div
            class="chat-panel flex-col"
            :class="selectedId ? 'hidden lg:flex' : 'flex'"
          >
            <div class="p-3 border-b border-light-c">
              <input
                v-model="keyword"
                type="text"
                placeholder="搜尋名稱、標籤、最後訊息"
                class="w-full border border-light-c rounded-lg px-3 py-2 mb-2 bg-surface2 text-base-c"
                style="font-size:14px"
              >
              <div class="flex gap-1.5 overflow-x-auto pb-0.5">
                <button
                  v-for="f in filters"
                  :key="f.key"
                  class="pill-btn"
                  :class="filter === f.key ? 'pill-active' : ''"
                  :style="filter === f.key ? pillActiveStyle : ''"
                  style="padding:4px 11px;font-size:12.5px"
                  @click="filter = f.key"
                >
                  {{ f.label }}<span
                  v-if="f.count"
                  class="ml-1"
                >{{ f.count }}</span>
                </button>
              </div>
            </div>
            <div class="flex-1 overflow-y-auto">
              <div
                v-if="!filteredCustomers.length"
                class="text-center py-8 text-hint-c"
                style="font-size:13.5px"
              >
                沒有符合的對話
              </div>
              <button
                v-for="c in filteredCustomers"
                :key="c.userId"
                class="customer-row"
                :class="selectedId === c.userId ? 'customer-row-active' : ''"
                @click="select(c.userId)"
              >
                <div class="relative flex-shrink-0">
                  <img
                    v-if="c.pictureUrl"
                    :src="c.pictureUrl"
                    class="w-10 h-10 rounded-full object-cover"
                    alt=""
                  >
                  <div
                    v-else
                    class="avatar-fallback"
                  >
                    {{ (c.displayName || '?')[0] }}
                  </div>
                  <span
                    v-if="c.waiting"
                    class="waiting-dot"
                  />
                </div>
                <div class="min-w-0 flex-1">
                  <div class="flex items-center gap-1">
                    <span
                      class="font-bold text-base-c truncate"
                      style="font-size:14px"
                    >{{ c.displayName || '（未知）' }}</span>
                    <span
                      v-if="c.human"
                      title="人工模式"
                    >🧑‍💼</span>
                    <span
                      v-if="c.blacklisted"
                      title="黑名單"
                    >⛔</span>
                    <span
                      v-if="c.blocked"
                      class="status-badge bg-stone-200 text-stone-600"
                      style="font-size:10.5px;padding:1px 6px"
                    >已封鎖</span>
                    <span
                      class="ml-auto text-hint-c flex-shrink-0"
                      style="font-size:11.5px"
                    >{{ fmtTime(c.lastAt) }}</span>
                  </div>
                  <div
                    class="text-hint-c truncate"
                    style="font-size:13px"
                  >
                    {{ c.lastText }}
                  </div>
                  <div
                    v-if="c.handoffOpen"
                    class="text-orange-600 mt-0.5"
                    style="font-size:12px;font-weight:600"
                  >
                    轉人工：{{ c.handoffReason }} · {{ ago(c.handoffAt) }}<span v-if="c.handoffCount > 1">（{{ c.handoffCount }} 次）</span>
                  </div>
                  <div
                    v-if="c.tags?.length"
                    class="flex flex-wrap gap-1 mt-1"
                  >
                    <span
                      v-for="t in c.tags"
                      :key="t"
                      class="tag-chip"
                    >{{ t }}</span>
                  </div>
                </div>
              </button>
            </div>
          </div>

          <!-- ───────── 對話內容 ───────── -->
          <div
            class="chat-panel flex-col"
            :class="selectedId ? 'flex' : 'hidden lg:flex'"
          >
            <div
              v-if="!detail"
              class="flex-1 flex items-center justify-center text-hint-c"
              style="font-size:14px"
            >
              選一位顧客查看對話
            </div>
            <template v-else>
              <div class="px-4 py-3 border-b border-light-c flex flex-wrap items-center gap-2">
                <button
                  class="mini-btn lg:hidden"
                  @click="selectedId = ''; detail = null"
                >
                  ← 返回
                </button>
                <div
                  class="font-bold text-base-c"
                  style="font-size:15px"
                >
                  {{ detail.displayName || '（未知）' }}
                </div>
                <span
                  v-if="isHuman"
                  class="status-badge bg-blue-100 text-blue-700"
                >
                  {{ detail.humanUntil > 9e15 ? '由店家接手中' : `人工模式到 ${fmtTime(detail.humanUntil)}` }}
                </span>
                <span
                  v-if="detail.blacklisted"
                  class="status-badge bg-rose-100 text-rose-700"
                >黑名單</span>
                <div class="ml-auto flex flex-wrap gap-1.5">
                  <button
                    v-if="detail.waiting || detail.handoffOpen"
                    class="mini-btn mini-warn"
                    @click="action('resolve')"
                  >
                    ✓ 標記已處理
                  </button>
                  <button
                    v-if="!isHuman"
                    class="mini-btn"
                    @click="action('takeover')"
                  >
                    由我接手
                  </button>
                  <button
                    v-else
                    class="mini-btn mini-primary"
                    @click="action('release')"
                  >
                    交還 AI
                  </button>
                  <button
                    class="mini-btn"
                    @click="openProfile"
                  >
                    🏷 標籤與備忘
                  </button>
                </div>
              </div>
              <div
                v-if="detail.handoffOpen"
                class="px-4 py-2 border-b border-light-c handoff-banner"
                style="font-size:13px"
              >
                轉人工原因：{{ detail.handoffReason }}（{{ ago(detail.handoffAt) }}）
              </div>

              <div
                ref="scrollBox"
                class="flex-1 overflow-y-auto p-4 space-y-3 bg-surface2"
              >
                <div
                  v-for="(m, i) in detail.messages"
                  :key="m.ts + '-' + i"
                  class="flex"
                  :class="m.role === 'customer' ? 'justify-start' : 'justify-end'"
                >
                  <div class="max-w-[80%]">
                    <div
                      v-if="m.role !== 'customer'"
                      class="text-hint-c mb-0.5 text-right"
                      style="font-size:11.5px"
                    >
                      {{ m.role === 'staff' ? '店家' : 'AI' }} · {{ SOURCE_LABEL[m.source] || m.source }}
                      <span v-if="m.latencyMs">· {{ (m.latencyMs / 1000).toFixed(1) }} 秒</span>
                      <span v-if="m.via === 'push'">· Push</span>
                    </div>
                    <div
                      class="bubble"
                      :class="bubbleClass(m)"
                    >
                      {{ m.text }}
                    </div>
                    <div
                      class="text-hint-c mt-0.5 flex items-center gap-2"
                      :class="m.role === 'customer' ? '' : 'justify-end'"
                      style="font-size:11.5px"
                    >
                      <span>{{ fmtTime(m.ts) }}</span>
                      <span v-if="m.role === 'customer' && m.source === 'ignored'">· 不回應</span>
                      <template v-if="m.role === 'ai'">
                        <button
                          class="rate-btn"
                          :class="m.rating === 1 ? 'rate-on' : ''"
                          @click="rate(i, m, 1)"
                        >
                          👍
                        </button>
                        <button
                          class="rate-btn"
                          :class="m.rating === -1 ? 'rate-on' : ''"
                          @click="rate(i, m, -1)"
                        >
                          👎
                        </button>
                      </template>
                    </div>
                  </div>
                </div>
              </div>

              <div class="border-t border-light-c p-3">
                <textarea
                  v-model="replyText"
                  rows="2"
                  placeholder="以店家身分回覆（Ctrl/⌘ + Enter 送出，會用 Push 計入每月額度）"
                  class="w-full border border-light-c rounded-lg px-3 py-2 bg-surface2 text-base-c resize-y"
                  style="font-size:14px"
                  @keydown.enter="onEnter"
                />
                <div class="flex items-center gap-3 mt-2 flex-wrap">
                  <label
                    class="text-hint-c flex items-center gap-1.5 cursor-pointer"
                    style="font-size:13px"
                  >
                    <input
                      v-model="pauseAi"
                      type="checkbox"
                    > 送出後 AI 暫停回覆此顧客
                  </label>
                  <span
                    v-if="replyError"
                    class="text-red-500"
                    style="font-size:12.5px"
                  >{{ replyError }}</span>
                  <button
                    class="ml-auto btn-primary"
                    :disabled="sending || !replyText.trim()"
                    @click="sendReply"
                  >
                    {{ sending ? '送出中...' : '送出' }}
                  </button>
                </div>
              </div>
            </template>
          </div>
        </div>
      </template>
    </div>

    <!-- ===== 👎 改成 FAQ Modal ===== -->
    <div
      v-if="faqModal"
      class="fixed inset-0 bg-black/50 flex items-center justify-center z-30 px-4"
      @mousedown="onBackdropMousedown"
      @click="onBackdropClick($event, () => faqModal = null)"
    >
      <div class="bg-surface rounded-2xl shadow-lg w-full max-w-lg p-5">
        <h2
          class="font-bold text-base-c mb-1"
          style="font-size:16px"
        >
          改成標準答案（FAQ）
        </h2>
        <p
          class="text-hint-c mb-3"
          style="font-size:13px"
        >
          下次有人問類似的問題，就直接回這個答案。
        </p>
        <label
          class="block text-hint-c mb-1"
          style="font-size:13px"
        >問題</label>
        <input
          v-model="faqModal.question"
          type="text"
          class="w-full border border-light-c rounded-lg px-3 py-2 mb-3 bg-surface2 text-base-c"
          style="font-size:14px"
        >
        <label
          class="block text-hint-c mb-1"
          style="font-size:13px"
        >標準答案</label>
        <textarea
          v-model="faqModal.answer"
          rows="4"
          class="w-full border border-light-c rounded-lg px-3 py-2 mb-1 bg-surface2 text-base-c"
          style="font-size:14px"
        />
        <p
          v-if="faqModal.error"
          class="text-red-500 mb-2"
          style="font-size:12.5px"
        >
          {{ faqModal.error }}
        </p>
        <div class="flex justify-end gap-2 mt-3">
          <button
            class="btn-plain"
            @click="faqModal = null"
          >
            取消
          </button>
          <button
            class="btn-primary"
            @click="saveFaq"
          >
            存成 FAQ
          </button>
        </div>
      </div>
    </div>

    <!-- ===== 標籤與備忘 Modal ===== -->
    <div
      v-if="profileModal"
      class="fixed inset-0 bg-black/50 flex items-center justify-center z-30 px-4"
      @mousedown="onBackdropMousedown"
      @click="onBackdropClick($event, () => profileModal = null)"
    >
      <div class="bg-surface rounded-2xl shadow-lg w-full max-w-lg p-5">
        <h2
          class="font-bold text-base-c mb-3"
          style="font-size:16px"
        >
          {{ detail?.displayName }} 的標籤與備忘
        </h2>
        <label
          class="block text-hint-c mb-1"
          style="font-size:13px"
        >標籤（用逗號分隔，例如 VIP, 常客）</label>
        <input
          v-model="profileModal.tags"
          type="text"
          class="w-full border border-light-c rounded-lg px-3 py-2 mb-3 bg-surface2 text-base-c"
          style="font-size:14px"
        >
        <label
          class="block text-hint-c mb-1"
          style="font-size:13px"
        >備忘（AI 會參考，但不會說給顧客聽）</label>
        <textarea
          v-model="profileModal.note"
          rows="3"
          class="w-full border border-light-c rounded-lg px-3 py-2 mb-3 bg-surface2 text-base-c"
          style="font-size:14px"
        />
        <div class="flex items-center gap-2 mb-2">
          <button
            class="toggle"
            :class="profileModal.blacklisted ? 'toggle-on toggle-danger' : ''"
            @click="profileModal.blacklisted = !profileModal.blacklisted"
          />
          <span
            class="text-base-c"
            style="font-size:13.5px"
          >黑名單（AI 不回覆，只留紀錄）</span>
        </div>
        <div
          class="text-hint-c break-all"
          style="font-size:11.5px"
        >
          userId：{{ detail?.userId }}
        </div>
        <div class="flex justify-end gap-2 mt-4">
          <button
            class="btn-plain"
            @click="profileModal = null"
          >
            取消
          </button>
          <button
            class="btn-primary"
            @click="saveProfile"
          >
            儲存
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'staff', requiredPermission: 'content.line-ai' })
useHead({ title: 'LINE AI 客服 · 客服對話' })

const { api, accountId, loadAccounts, errMsg, fmtTime, ago, SOURCE_LABEL } = useLineAi()

// Modal 背景點擊關閉：mousedown 跟 click 都落在背景本身才關，避免在 Modal 裡拖曳選字放開到外面時誤關
const backdropMouseDownOnSelf = ref(false)
function onBackdropMousedown(e: MouseEvent) {
  backdropMouseDownOnSelf.value = e.target === e.currentTarget
}
function onBackdropClick(e: MouseEvent, close: () => void) {
  if (backdropMouseDownOnSelf.value && e.target === e.currentTarget) close()
  backdropMouseDownOnSelf.value = false
}

const pillActiveStyle = { background: '#15803d', borderColor: '#15803d', color: '#fff' }

const customers = ref<any[]>([])
const selectedId = ref('')
const detail = ref<any>(null)
const keyword = ref('')
const filter = ref<'all' | 'waiting' | 'handoff' | 'human'>('all')
const replyText = ref('')
const pauseAi = ref(true)
const sending = ref(false)
const replyError = ref('')
const scrollBox = ref<HTMLElement | null>(null)
const faqModal = ref<any>(null)
const profileModal = ref<any>(null)

let listTimer: any = null
let detailTimer: any = null

const countWaiting = computed(() => customers.value.filter(c => c.waiting).length)
const countHandoff = computed(() => customers.value.filter(c => c.handoffOpen).length)
const countHuman = computed(() => customers.value.filter(c => c.human).length)

const filters = computed(() => [
  { key: 'all', label: '全部', count: 0 },
  { key: 'waiting', label: '等待回覆', count: countWaiting.value },
  { key: 'handoff', label: '待處理轉人工', count: countHandoff.value },
  { key: 'human', label: '人工模式', count: countHuman.value },
] as const)

const filteredCustomers = computed(() => {
  const k = keyword.value.trim().toLowerCase()
  return customers.value.filter((c) => {
    if (filter.value === 'waiting' && !c.waiting) return false
    if (filter.value === 'handoff' && !c.handoffOpen) return false
    if (filter.value === 'human' && !c.human) return false
    if (!k) return true
    return (c.displayName || '').toLowerCase().includes(k)
      || (c.lastText || '').toLowerCase().includes(k)
      || (c.tags || []).some((t: string) => t.toLowerCase().includes(k))
  })
})

const isHuman = computed(() => detail.value && detail.value.humanUntil > Date.now())

function bubbleClass(m: any) {
  if (m.role === 'customer') return m.source === 'ignored' ? 'bubble-customer bubble-ignored' : 'bubble-customer'
  if (m.role === 'staff') return 'bubble-staff'
  if (m.source === 'nodata' || m.source === 'handoff' || m.source === 'forbidden') return 'bubble-warn'
  return 'bubble-ai'
}

async function loadCustomers() {
  if (!accountId.value) return
  try {
    customers.value = await api(`/${accountId.value}/customers`)
  } catch (e) {
    console.warn('載入顧客失敗', e)
  }
}

async function loadDetail(scroll = false) {
  if (!accountId.value || !selectedId.value) return
  try {
    const prevLen = detail.value?.messages?.length || 0
    detail.value = await api(`/${accountId.value}/customers/${selectedId.value}`)
    if (scroll || detail.value.messages.length !== prevLen) {
      await nextTick()
      if (scrollBox.value) scrollBox.value.scrollTop = scrollBox.value.scrollHeight
    }
  } catch (e) {
    console.warn('載入對話失敗', e)
  }
}

function select(uid: string) {
  selectedId.value = uid
  detail.value = null
  replyText.value = ''
  replyError.value = ''
  loadDetail(true)
}

async function action(kind: 'resolve' | 'takeover' | 'release') {
  try {
    detail.value = await api(`/${accountId.value}/customers/${selectedId.value}/${kind}`, { method: 'POST' })
    loadCustomers()
  } catch (e) {
    alert(errMsg(e))
  }
}

function onEnter(e: KeyboardEvent) {
  if (e.ctrlKey || e.metaKey) {
    e.preventDefault()
    sendReply()
  }
}

async function sendReply() {
  if (!replyText.value.trim() || sending.value) return
  sending.value = true
  replyError.value = ''
  try {
    const r: any = await api(`/${accountId.value}/customers/${selectedId.value}/reply`, {
      method: 'POST',
      body: { text: replyText.value, pauseAi: pauseAi.value },
    })
    if (!r.ok) {
      replyError.value = r.message || '送出失敗'
      return
    }
    replyText.value = ''
    await loadDetail(true)
    loadCustomers()
  } catch (e) {
    replyError.value = errMsg(e)
  } finally {
    sending.value = false
  }
}

async function rate(index: number, m: any, rating: number) {
  const next = m.rating === rating ? 0 : rating
  try {
    detail.value = await api(`/${accountId.value}/customers/${selectedId.value}/rate`, {
      method: 'POST',
      body: { index, ts: m.ts, rating: next },
    })
  } catch (e) {
    alert(errMsg(e))
    return
  }
  if (next === -1) {
    // 找這則 AI 回覆前面最近的一句顧客訊息當問題
    let q = ''
    for (let i = index - 1; i >= 0; i--) {
      const prev = detail.value.messages[i]
      if (prev.role === 'customer') { q = prev.text; break }
    }
    faqModal.value = { question: q, answer: m.source === 'nodata' ? '' : m.text, error: '' }
  }
}

async function saveFaq() {
  if (!faqModal.value.question.trim() || !faqModal.value.answer.trim()) {
    faqModal.value.error = '問題與答案都要填'
    return
  }
  try {
    await api(`/${accountId.value}/faqs`, {
      method: 'POST',
      body: { question: faqModal.value.question.trim(), synonyms: [], answer: faqModal.value.answer.trim() },
    })
    faqModal.value = null
  } catch (e) {
    faqModal.value.error = errMsg(e)
  }
}

function openProfile() {
  profileModal.value = {
    tags: (detail.value.tags || []).join(', '),
    note: detail.value.note || '',
    blacklisted: !!detail.value.blacklisted,
  }
}

async function saveProfile() {
  try {
    detail.value = await api(`/${accountId.value}/customers/${selectedId.value}`, {
      method: 'PUT',
      body: {
        tags: profileModal.value.tags.split(/[,，、]/).map((s: string) => s.trim()).filter(Boolean),
        note: profileModal.value.note,
        blacklisted: profileModal.value.blacklisted,
      },
    })
    profileModal.value = null
    loadCustomers()
  } catch (e) {
    alert(errMsg(e))
  }
}

function onAccountChange() {
  selectedId.value = ''
  detail.value = null
  customers.value = []
  loadCustomers()
}

onMounted(async () => {
  try {
    await loadAccounts()
  } catch (e) {
    console.warn(e)
  }
  await loadCustomers()
  listTimer = setInterval(loadCustomers, 8000)
  detailTimer = setInterval(() => loadDetail(false), 5000)
})

onBeforeUnmount(() => {
  clearInterval(listTimer)
  clearInterval(detailTimer)
})
</script>

<style scoped>
.panel {
  background: var(--surface);
  border-radius: 16px;
  padding: 16px;
  box-shadow: var(--shadow);
  overflow-x: auto;
}

.chat-panel {
  background: var(--surface);
  border-radius: 16px;
  box-shadow: var(--shadow);
  overflow: hidden;
  min-height: 0;
}

.stat-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 12px;
}

.stat-card {
  background: var(--surface);
  border-radius: 12px;
  padding: 14px;
  border-left: 4px solid #15803d;
  box-shadow: var(--shadow);
}

.stat-label {
  font-size: 12.5px;
  color: var(--text-hint);
  font-weight: 600;
}

.stat-value {
  font-size: 23px;
  font-weight: 700;
  color: var(--text);
  margin-top: 2px;
}

.pill-btn {
  flex-shrink: 0;
  padding: 6px 14px;
  border-radius: 999px;
  border: 1px solid var(--border);
  background: var(--surface2);
  color: var(--text-muted);
  font-size: 13.5px;
  font-weight: 700;
  white-space: nowrap;
}

.pill-btn:hover {
  border-color: var(--accent);
  color: var(--text);
}

.pill-active, .pill-active:hover {
  background: #15803d;
  border-color: #15803d;
  color: #fff;
}

.customer-row {
  width: 100%;
  text-align: left;
  padding: 12px;
  border-bottom: 1px solid var(--border-light);
  display: flex;
  gap: 10px;
  align-items: flex-start;
  background: transparent;
}

.customer-row:hover {
  background: var(--surface2);
}

.customer-row-active, .customer-row-active:hover {
  background: rgba(21, 128, 61, .1);
  box-shadow: inset 3px 0 0 #15803d;
}

.avatar-fallback {
  width: 40px;
  height: 40px;
  border-radius: 999px;
  background: rgba(21, 128, 61, .12);
  color: #15803d;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 15px;
}

.waiting-dot {
  position: absolute;
  top: -2px;
  right: -2px;
  width: 12px;
  height: 12px;
  border-radius: 999px;
  background: #ea580c;
  border: 2px solid var(--surface);
}

.tag-chip {
  font-size: 11px;
  font-weight: 600;
  padding: 1px 7px;
  border-radius: 999px;
  background: var(--surface2);
  border: 1px solid var(--border-light);
  color: var(--text-muted);
}

.handoff-banner {
  background: rgba(234, 88, 12, .1);
  color: #c2410c;
  font-weight: 600;
}

.bubble {
  border-radius: 16px;
  padding: 8px 12px;
  white-space: pre-wrap;
  word-break: break-word;
  font-size: 14.5px;
  line-height: 1.55;
}

.bubble-customer {
  background: var(--surface);
  border: 1px solid var(--border-light);
  color: var(--text);
  border-top-left-radius: 4px;
}

.bubble-ignored {
  border-style: dashed;
  color: var(--text-hint);
}

.bubble-ai {
  background: #15803d;
  color: #fff;
  border-top-right-radius: 4px;
}

.bubble-staff {
  background: #2563eb;
  color: #fff;
  border-top-right-radius: 4px;
}

.bubble-warn {
  background: #fef3c7;
  color: #92400e;
  border-top-right-radius: 4px;
}

.rate-btn {
  opacity: .4;
  background: transparent;
}

.rate-btn:hover, .rate-on {
  opacity: 1;
}

.status-badge {
  font-size: 12px;
  font-weight: 700;
  padding: 3px 9px;
  border-radius: 999px;
  white-space: nowrap;
}

.mini-btn {
  padding: 5px 10px;
  border-radius: 6px;
  background: var(--surface2);
  color: var(--text-muted);
  font-size: 12.5px;
  font-weight: 700;
  white-space: nowrap;
}

.mini-btn:hover {
  background: var(--bg);
}

.mini-primary {
  background: #15803d;
  color: #fff;
}

.mini-primary:hover {
  background: #15803d;
  filter: brightness(1.08);
}

.mini-warn {
  background: #ea580c;
  color: #fff;
}

.mini-warn:hover {
  background: #ea580c;
  filter: brightness(1.08);
}

.btn-plain {
  padding: 7px 14px;
  border-radius: 8px;
  background: var(--surface2);
  color: var(--text-muted);
  font-size: 14px;
  font-weight: 600;
}

.btn-plain:hover {
  background: var(--bg);
}

.btn-primary {
  padding: 7px 14px;
  border-radius: 8px;
  background: #15803d;
  color: #fff;
  font-size: 14px;
  font-weight: 700;
}

.btn-primary:disabled {
  opacity: .5;
}

.toggle {
  position: relative;
  width: 36px;
  height: 20px;
  border-radius: 999px;
  background: var(--border);
  border: none;
  flex-shrink: 0;
}

.toggle-on {
  background: #22c55e;
}

.toggle-danger {
  background: #e11d48;
}

.toggle::after {
  content: "";
  position: absolute;
  top: 2px;
  left: 2px;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: #fff;
  transition: left .15s;
}

.toggle-on::after {
  left: 18px;
}
</style>
