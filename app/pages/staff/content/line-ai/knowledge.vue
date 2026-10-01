<template>
  <div class="min-h-full bg-surface2 transition-colors">
    <LineAiHeader @change="loadAll" />

    <div class="max-w-5xl mx-auto px-3 sm:px-4 py-4">
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
        <div class="flex gap-1.5 mb-4 overflow-x-auto pb-1">
          <button
            v-for="t in tabs"
            :key="t.key"
            class="pill-btn"
            :class="tab === t.key ? 'pill-active' : ''"
            :style="tab === t.key ? pillActiveStyle : ''"
            @click="tab = t.key"
          >
            {{ t.label }}<span
            v-if="t.count"
            class="ml-1"
          >{{ t.count }}</span>
          </button>
        </div>

        <!-- ===================== 常見問題 ===================== -->
        <div
          v-if="tab === 'faq'"
          class="panel"
        >
          <div class="flex items-start justify-between flex-wrap gap-2 mb-3">
            <p
              class="text-hint-c flex-1"
              style="font-size:13px;min-width:240px"
            >
              顧客問題跟 FAQ 夠像時直接回標準答案，不經過 AI 生成。價格、營業時間、規定這類要一字不差的內容放這裡最保險。
            </p>
            <button
              class="mini-btn mini-primary"
              style="padding:7px 14px;font-size:13.5px"
              @click="editFaq()"
            >
              ＋ 新增 FAQ
            </button>
          </div>
          <input
            v-model="faqKeyword"
            type="text"
            placeholder="搜尋 FAQ"
            class="w-full border border-light-c rounded-lg px-3 py-2 mb-2 bg-surface2 text-base-c"
            style="font-size:14px"
          >
          <div
            v-if="!filteredFaqs.length"
            class="text-center py-8 text-hint-c"
            style="font-size:14px"
          >
            還沒有 FAQ
          </div>
          <div
            v-for="f in filteredFaqs"
            :key="f.id"
            class="py-3 border-t border-light-c flex items-start gap-3"
          >
            <div class="flex-1 min-w-0">
              <div
                class="font-bold text-base-c"
                style="font-size:14.5px"
              >
                {{ f.question }}
              </div>
              <div
                v-if="f.synonyms?.length"
                class="flex flex-wrap gap-1 mt-1"
              >
                <span
                  v-for="s in f.synonyms"
                  :key="s"
                  class="tag-chip"
                >{{ s }}</span>
              </div>
              <div
                class="text-base-c mt-1.5 whitespace-pre-wrap"
                style="font-size:13.5px;opacity:.85"
              >
                {{ f.answer }}
              </div>
            </div>
            <div class="flex gap-1.5 flex-shrink-0">
              <button
                class="mini-btn"
                @click="editFaq(f)"
              >
                編輯
              </button>
              <button
                class="mini-btn mini-danger"
                @click="confirmDelete('faq', f.id, f.question)"
              >
                刪除
              </button>
            </div>
          </div>
        </div>

        <!-- ===================== 參考文件 ===================== -->
        <div
          v-if="tab === 'docs'"
          class="lg:grid lg:grid-cols-[280px_1fr] gap-4 space-y-4 lg:space-y-0"
        >
          <div class="panel">
            <div class="flex gap-1.5 mb-3 flex-wrap">
              <button
                class="mini-btn mini-primary"
                @click="newDoc"
              >
                ＋ 新文件
              </button>
              <label class="mini-btn cursor-pointer">
                匯入 .md / .txt
                <input
                  type="file"
                  accept=".md,.txt,text/plain,text/markdown"
                  class="hidden"
                  multiple
                  @change="importFiles"
                >
              </label>
            </div>
            <div
              v-if="!docs.length"
              class="text-center py-6 text-hint-c"
              style="font-size:13.5px"
            >
              還沒有文件
            </div>
            <button
              v-for="d in docs"
              :key="d.id"
              class="doc-row"
              :class="docForm?.id === d.id ? 'doc-row-active' : ''"
              @click="openDoc(d)"
            >
              <div
                class="font-bold text-base-c truncate"
                style="font-size:14px"
              >
                {{ d.title }}
              </div>
              <div
                class="text-hint-c"
                style="font-size:12px"
              >
                {{ d.chars }} 字 · {{ d.chunks }} 段
              </div>
            </button>
          </div>

          <div class="panel">
            <div
              v-if="!docForm"
              class="text-hint-c leading-relaxed space-y-2"
              style="font-size:13.5px"
            >
              <p>用「# 標題」分段，例如 <code># 菜單</code>、<code># 交通方式</code>、<code># 退換貨規定</code>。系統依段落切塊，顧客問到相關內容時只把相關段落給 AI。</p>
              <p>文件裡如果有 <code># 系統指令</code> 段落，內容會套用到「回覆規則」的系統指令，不會進知識庫。</p>
              <p>一份文件建議三千字以內，太長就拆成幾份。營業時間請寫成「9:00」這種格式，比較不會被防亂編機制誤擋。</p>
            </div>
            <template v-else>
              <label
                class="block text-hint-c mb-1"
                style="font-size:13px"
              >文件標題</label>
              <input
                v-model="docForm.title"
                type="text"
                class="w-full border border-light-c rounded-lg px-3 py-2 mb-3 bg-surface2 text-base-c font-bold"
                style="font-size:14px"
              >
              <label
                class="block text-hint-c mb-1"
                style="font-size:13px"
              >內容</label>
              <textarea
                v-model="docForm.content"
                rows="22"
                class="w-full border border-light-c rounded-lg px-3 py-2 bg-surface2 text-base-c font-mono"
                style="font-size:13px"
                placeholder="# 菜單&#10;招牌便當 120 元&#10;&#10;# 交通方式&#10;…"
              />
              <div class="flex items-center gap-2 mt-3 flex-wrap">
                <span
                  class="text-hint-c"
                  style="font-size:12.5px"
                >{{ docForm.content.length }} 字</span>
                <span
                  v-if="docMsg"
                  class="text-green-700"
                  style="font-size:12.5px;font-weight:600"
                >{{ docMsg }}</span>
                <div class="ml-auto flex gap-2">
                  <button
                    v-if="docForm.id"
                    class="mini-btn mini-danger"
                    style="padding:7px 14px"
                    @click="confirmDelete('doc', docForm.id, docForm.title)"
                  >
                    刪除
                  </button>
                  <button
                    class="btn-primary"
                    @click="saveDoc"
                  >
                    儲存
                  </button>
                </div>
              </div>
            </template>
          </div>
        </div>

        <!-- ===================== 待補問題 ===================== -->
        <div
          v-if="tab === 'unanswered'"
          class="panel"
        >
          <p
            class="text-hint-c mb-3"
            style="font-size:13px"
          >
            AI 回了「查無資料」的問題會集中在這裡，相似問法自動合併。按「轉成 FAQ」只要填答案，下次就會自動回。
          </p>
          <div
            v-if="!unanswered.length"
            class="text-center py-8 text-hint-c"
            style="font-size:14px"
          >
            目前沒有待補問題 ✅
          </div>
          <div
            v-for="u in unanswered"
            :key="u.id"
            class="py-3 border-t border-light-c flex items-start gap-3"
          >
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2">
                <span
                  class="font-bold text-base-c"
                  style="font-size:14.5px"
                >{{ u.question }}</span>
                <span class="status-badge bg-amber-100 text-amber-700">{{ u.count }} 次</span>
              </div>
              <div
                v-if="u.variants?.length"
                class="text-hint-c mt-0.5"
                style="font-size:12.5px"
              >
                其他問法：{{ u.variants.join('、') }}
              </div>
              <div
                class="text-hint-c mt-0.5"
                style="font-size:12px"
              >
                最近 {{ ago(u.lastAt) }}
              </div>
            </div>
            <div class="flex gap-1.5 flex-shrink-0">
              <button
                class="mini-btn mini-primary"
                @click="toFaq(u)"
              >
                轉成 FAQ
              </button>
              <button
                class="mini-btn"
                @click="dismiss(u.id)"
              >
                忽略
              </button>
            </div>
          </div>
        </div>

        <!-- ===================== 測試問答 ===================== -->
        <div
          v-if="tab === 'test'"
          class="panel"
        >
          <p
            class="text-hint-c mb-3"
            style="font-size:13px"
          >
            模擬顧客提問，走完整流程但不會傳到 LINE。改完知識庫或回覆規則後先在這裡試幾句。
          </p>
          <div class="flex gap-2">
            <input
              v-model="testText"
              type="text"
              placeholder="例如：你們幾點開？"
              class="flex-1 border border-light-c rounded-lg px-3 py-2 bg-surface2 text-base-c"
              style="font-size:14px"
              @keyup.enter="runTest"
            >
            <button
              class="btn-primary"
              :disabled="testing"
              @click="runTest"
            >
              {{ testing ? '思考中...' : '送出' }}
            </button>
          </div>
          <div
            v-for="(r, i) in testResults"
            :key="i"
            class="test-card mt-3"
          >
            <div
              class="text-hint-c"
              style="font-size:13px"
            >
              顧客：{{ r.q }}
            </div>
            <div
              v-if="r.error"
              class="text-red-500 mt-2"
              style="font-size:13.5px"
            >
              {{ r.error }}
            </div>
            <template v-else>
              <div
                class="bubble mt-2 inline-block"
                :class="r.d.reply ? 'bubble-ai' : 'bubble-empty'"
              >
                {{ r.d.reply || '（不回覆）' }}
              </div>
              <div
                v-if="r.d.quick?.length"
                class="flex flex-wrap gap-1 mt-2"
              >
                <span
                  v-for="q in r.d.quick"
                  :key="q"
                  class="quick-chip"
                >{{ q }}</span>
              </div>
              <div class="flex flex-wrap gap-1.5 mt-2">
                <span class="status-badge bg-emerald-100 text-emerald-700">{{ SOURCE_LABEL[r.d.source] || r.d.source }}</span>
                <span class="status-badge bg-stone-100 text-stone-600">{{ r.d.action }}</span>
                <span class="status-badge bg-stone-100 text-stone-600">{{ (r.d.latencyMs / 1000).toFixed(1) }} 秒</span>
                <span
                  v-if="r.d.reason"
                  class="status-badge bg-amber-100 text-amber-700"
                >{{ r.d.reason }}</span>
              </div>
              <div
                v-if="r.d.refs?.length"
                class="text-hint-c mt-2"
                style="font-size:12px"
              >
                參考：{{ r.d.refs.join('、') }}
              </div>
              <div
                v-if="r.d.debug"
                class="text-amber-600 mt-1 break-all"
                style="font-size:12px"
              >
                除錯：{{ r.d.debug }}
              </div>
            </template>
          </div>
        </div>
      </template>
    </div>

    <!-- ===== FAQ 新增/編輯 Modal ===== -->
    <div
      v-if="faqForm"
      class="fixed inset-0 bg-black/50 flex items-center justify-center z-30 px-4"
      @mousedown="onBackdropMousedown"
      @click="onBackdropClick($event, () => faqForm = null)"
    >
      <div class="bg-surface rounded-2xl shadow-lg w-full max-w-lg p-5">
        <h2
          class="font-bold text-base-c mb-3"
          style="font-size:16px"
        >
          {{ faqForm.id ? '編輯 FAQ' : '新增 FAQ' }}
        </h2>
        <label
          class="block text-hint-c mb-1"
          style="font-size:13px"
        >問題</label>
        <input
          v-model="faqForm.question"
          type="text"
          class="w-full border border-light-c rounded-lg px-3 py-2 mb-3 bg-surface2 text-base-c"
          style="font-size:14px"
        >
        <label
          class="block text-hint-c mb-1"
          style="font-size:13px"
        >同義問法（一行一個）</label>
        <textarea
          v-model="faqForm.synonymsText"
          rows="3"
          class="w-full border border-light-c rounded-lg px-3 py-2 mb-3 bg-surface2 text-base-c"
          style="font-size:14px"
          placeholder="收信用卡嗎&#10;能用 LINE Pay 嗎"
        />
        <label
          class="block text-hint-c mb-1"
          style="font-size:13px"
        >標準答案</label>
        <textarea
          v-model="faqForm.answer"
          rows="4"
          class="w-full border border-light-c rounded-lg px-3 py-2 mb-1 bg-surface2 text-base-c"
          style="font-size:14px"
        />
        <p
          v-if="faqForm.error"
          class="text-red-500 mb-2"
          style="font-size:12.5px"
        >
          {{ faqForm.error }}
        </p>
        <div class="flex justify-end gap-2 mt-3">
          <button
            class="btn-plain"
            @click="faqForm = null"
          >
            取消
          </button>
          <button
            class="btn-primary"
            @click="saveFaq"
          >
            儲存
          </button>
        </div>
      </div>
    </div>

    <!-- ===== 刪除確認 Modal ===== -->
    <div
      v-if="pendingDelete"
      class="fixed inset-0 bg-black/50 flex items-center justify-center z-30 px-4"
      @mousedown="onBackdropMousedown"
      @click="onBackdropClick($event, () => pendingDelete = null)"
    >
      <div class="bg-surface rounded-2xl shadow-lg w-full max-w-sm p-5">
        <h2
          class="font-bold text-base-c mb-2"
          style="font-size:16px"
        >
          確定刪除？
        </h2>
        <p
          class="text-hint-c break-all"
          style="font-size:13.5px"
        >
          「{{ pendingDelete.label }}」刪除後無法復原。
        </p>
        <div class="flex justify-end gap-2 mt-4">
          <button
            class="btn-plain"
            @click="pendingDelete = null"
          >
            取消
          </button>
          <button
            class="btn-danger"
            @click="doDelete"
          >
            刪除
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'staff', requiredPermission: 'content.line-ai' })
useHead({ title: 'LINE AI 客服 · 知識庫' })

const { api, accountId, loadAccounts, errMsg, ago, SOURCE_LABEL } = useLineAi()

// Modal 背景點擊關閉：mousedown 跟 click 都落在背景本身才關
const backdropMouseDownOnSelf = ref(false)
function onBackdropMousedown(e: MouseEvent) {
  backdropMouseDownOnSelf.value = e.target === e.currentTarget
}
function onBackdropClick(e: MouseEvent, close: () => void) {
  if (backdropMouseDownOnSelf.value && e.target === e.currentTarget) close()
  backdropMouseDownOnSelf.value = false
}

const pillActiveStyle = { background: '#15803d', borderColor: '#15803d', color: '#fff' }

const tab = ref<'faq' | 'docs' | 'unanswered' | 'test'>('faq')
const faqs = ref<any[]>([])
const docs = ref<any[]>([])
const unanswered = ref<any[]>([])
const faqKeyword = ref('')
const faqForm = ref<any>(null)
const docForm = ref<any>(null)
const docMsg = ref('')
const pendingDelete = ref<any>(null)
const testText = ref('')
const testing = ref(false)
const testResults = ref<any[]>([])
let unansweredSourceId = ''

const tabs = computed(() => [
  { key: 'faq', label: '常見問題', count: faqs.value.length },
  { key: 'docs', label: '參考文件', count: docs.value.length },
  { key: 'unanswered', label: '待補問題', count: unanswered.value.length },
  { key: 'test', label: '測試問答', count: 0 },
] as const)

const filteredFaqs = computed(() => {
  const k = faqKeyword.value.trim().toLowerCase()
  const list = [...faqs.value].sort((a, b) => b.updatedAt - a.updatedAt)
  if (!k) return list
  return list.filter(f => [f.question, f.answer, ...(f.synonyms || [])].join(' ').toLowerCase().includes(k))
})

async function loadAll() {
  if (!accountId.value) return
  docForm.value = null
  const id = accountId.value
  const [f, d, u] = await Promise.all([
    api(`/${id}/faqs`).catch(() => []),
    api(`/${id}/docs`).catch(() => []),
    api(`/${id}/unanswered`).catch(() => []),
  ])
  faqs.value = f as any[]
  docs.value = d as any[]
  unanswered.value = u as any[]
}

// ───── FAQ ─────
function editFaq(f?: any) {
  unansweredSourceId = ''
  faqForm.value = f
    ? { id: f.id, question: f.question, synonymsText: (f.synonyms || []).join('\n'), answer: f.answer, error: '' }
    : { id: '', question: '', synonymsText: '', answer: '', error: '' }
}

async function saveFaq() {
  const form = faqForm.value
  if (!form.question.trim() || !form.answer.trim()) {
    form.error = '問題與答案都要填'
    return
  }
  try {
    await api(`/${accountId.value}/faqs`, {
      method: 'POST',
      body: {
        id: form.id || null,
        question: form.question.trim(),
        synonyms: form.synonymsText.split('\n').map((s: string) => s.trim()).filter(Boolean),
        answer: form.answer.trim(),
      },
    })
    if (unansweredSourceId) {
      await api(`/${accountId.value}/unanswered/${unansweredSourceId}`, { method: 'DELETE' }).catch(() => {})
      unansweredSourceId = ''
    }
    faqForm.value = null
    await loadAll()
  } catch (e) {
    form.error = errMsg(e)
  }
}

// ───── 文件 ─────
function newDoc() {
  docMsg.value = ''
  docForm.value = { id: '', title: '', content: '' }
}

function openDoc(d: any) {
  docMsg.value = ''
  docForm.value = { id: d.id, title: d.title, content: d.content }
}

async function saveDoc() {
  try {
    const r: any = await api(`/${accountId.value}/docs`, { method: 'POST', body: docForm.value })
    docForm.value.id = r.id
    docMsg.value = r.appliedSystemPrompt ? '已儲存，「# 系統指令」已套用到回覆規則' : '已儲存，重新建立索引中'
    const keep = docForm.value
    docs.value = (await api(`/${accountId.value}/docs`)) as any[]
    docForm.value = keep
  } catch (e) {
    alert(errMsg(e))
  }
}

async function importFiles(ev: Event) {
  const input = ev.target as HTMLInputElement
  const files = Array.from(input.files || [])
  for (const f of files) {
    const content = await f.text()
    await api(`/${accountId.value}/docs`, {
      method: 'POST',
      body: { title: f.name.replace(/\.(md|txt)$/i, ''), content },
    }).catch(e => alert(`${f.name}：${errMsg(e)}`))
  }
  input.value = ''
  await loadAll()
}

// ───── 待補問題 ─────
function toFaq(u: any) {
  faqForm.value = { id: '', question: u.question, synonymsText: (u.variants || []).join('\n'), answer: '', error: '' }
  unansweredSourceId = u.id
}

async function dismiss(id: string) {
  await api(`/${accountId.value}/unanswered/${id}`, { method: 'DELETE' }).catch(e => alert(errMsg(e)))
  unanswered.value = unanswered.value.filter(u => u.id !== id)
}

// ───── 刪除 ─────
function confirmDelete(kind: 'faq' | 'doc', id: string, label: string) {
  pendingDelete.value = { kind, id, label }
}

async function doDelete() {
  const p = pendingDelete.value
  try {
    await api(`/${accountId.value}/${p.kind === 'faq' ? 'faqs' : 'docs'}/${p.id}`, { method: 'DELETE' })
    if (p.kind === 'doc') docForm.value = null
    pendingDelete.value = null
    await loadAll()
  } catch (e) {
    alert(errMsg(e))
  }
}

// ───── 測試 ─────
async function runTest() {
  const q = testText.value.trim()
  if (!q || testing.value) return
  testing.value = true
  try {
    const d = await api(`/${accountId.value}/test`, { method: 'POST', body: { text: q } })
    testResults.value.unshift({ q, d })
    testText.value = ''
  } catch (e) {
    testResults.value.unshift({ q, error: errMsg(e) })
  } finally {
    testing.value = false
  }
}

onMounted(async () => {
  try {
    await loadAccounts()
  } catch (e) {
    console.warn(e)
  }
  await loadAll()
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

.pill-btn {
  flex-shrink: 0;
  padding: 6px 14px;
  border-radius: 999px;
  border: 1px solid var(--border);
  background: var(--surface);
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

.tag-chip {
  font-size: 11.5px;
  font-weight: 600;
  padding: 1px 8px;
  border-radius: 999px;
  background: var(--surface2);
  border: 1px solid var(--border-light);
  color: var(--text-muted);
}

.doc-row {
  width: 100%;
  text-align: left;
  padding: 8px 10px;
  border-radius: 8px;
  background: transparent;
  margin-bottom: 2px;
}

.doc-row:hover {
  background: var(--surface2);
}

.doc-row-active, .doc-row-active:hover {
  background: rgba(21, 128, 61, .1);
  box-shadow: inset 3px 0 0 #15803d;
}

.test-card {
  background: var(--surface2);
  border: 1px solid var(--border-light);
  border-radius: 12px;
  padding: 12px;
}

.bubble {
  border-radius: 16px;
  border-top-right-radius: 4px;
  padding: 8px 12px;
  white-space: pre-wrap;
  word-break: break-word;
  font-size: 14.5px;
  line-height: 1.55;
}

.bubble-ai {
  background: #15803d;
  color: #fff;
}

.bubble-empty {
  background: var(--surface);
  border: 1px dashed var(--border);
  color: var(--text-hint);
}

.quick-chip {
  font-size: 12px;
  font-weight: 600;
  padding: 2px 10px;
  border-radius: 999px;
  border: 1px solid #15803d;
  color: #15803d;
  background: var(--surface);
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

.mini-danger {
  background: transparent;
  border: 1px solid #e11d48;
  color: #e11d48;
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

.btn-danger {
  padding: 7px 14px;
  border-radius: 8px;
  background: #e11d48;
  color: #fff;
  font-size: 14px;
  font-weight: 700;
}

code {
  background: var(--surface2);
  padding: 0 4px;
  border-radius: 4px;
}
</style>
