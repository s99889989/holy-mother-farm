<template>
  <InternalSystemPropertyShell>
  <div class="property-home">
    <div class="card todo-card">
      <div class="card-header">
        <div class="card-header-title">🔔 個人待辦事項</div>
        <span class="badge">{{ todo?.total ?? 0 }}</span>
      </div>
      <div class="card-body">
        <p v-if="todoLoading" class="hint-text">載入中...</p>
        <p v-else-if="todoError" class="error-text">載入失敗</p>
        <div v-else-if="!todo || todo.items.length === 0" class="todo-empty">
          <div class="todo-empty-icon">✅</div>
          <div class="todo-empty-title">目前沒有待辦事項</div>
          <div class="hint-text">所有待辦事項皆已完成</div>
        </div>
        <div v-else class="todo-list">
          <template v-for="(item, idx) in todo.items" :key="idx">
            <NuxtLink
                v-if="internalPath(item.url)"
                :to="internalPath(item.url)!"
                class="todo-item"
                :class="`level-${item.level}`"
            >
              <span class="todo-text">
                還有 <strong>{{ item.count }}</strong> 筆{{ item.title }}
              </span>
              <span class="todo-arrow">›</span>
            </NuxtLink>
            <a
                v-else
                :href="resolveUrl(item.url)"
                target="_blank"
                class="todo-item"
                :class="`level-${item.level}`"
            >
              <span class="todo-text">
                還有 <strong>{{ item.count }}</strong> 筆{{ item.title }}
              </span>
              <span class="todo-arrow">›</span>
            </a>
          </template>
        </div>
      </div>
    </div>

    <div class="card news-card">
      <div class="card-header">
        <div class="card-header-title">📰 最新消息</div>
        <button type="button" class="edit-btn" @click="toggleEdit">
          {{ editing ? '取消編輯' : '編輯公告' }}
        </button>
      </div>
      <div class="card-body">
        <p v-if="newsLoading" class="hint-text">載入中...</p>
        <p v-else-if="newsError" class="error-text">載入失敗</p>
        <template v-else>
          <div v-if="!editing" class="news-content" v-html="news?.news || '<p>目前沒有公告</p>'" />
          <div v-else class="news-edit">
            <textarea v-model="editHtml" class="news-textarea" rows="10" placeholder="輸入公告內容（HTML）"></textarea>
            <div class="news-edit-actions">
              <button type="button" class="save-btn" :disabled="saving" @click="saveNews">
                {{ saving ? '儲存中...' : '儲存' }}
              </button>
            </div>
          </div>
        </template>
      </div>
    </div>
  </div>
  </InternalSystemPropertyShell>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'staff', requiredPermission: 'content.internal-system', middleware: 'internal-system-auth' })

interface TodoItem {
  level: 'danger' | 'warning' | 'info' | 'success'
  url: string
  title: string
  count: number
}

interface TodoResponse {
  total: number
  items: TodoItem[]
}

interface NewsResponse {
  news: string
  identity: string
}

const todo = ref<TodoResponse | null>(null)
const todoLoading = ref(true)
const todoError = ref(false)

const news = ref<NewsResponse | null>(null)
const newsLoading = ref(true)
const newsError = ref(false)

const editing = ref(false)
const editHtml = ref('')
const saving = ref(false)

const LEGACY_BASE = 'http://192.168.181.249/A113'
const resolveUrl = (url: string) => (url.startsWith('http') ? url : `${LEGACY_BASE}/${url}`)

/**
 * 待辦事項連結對照表：已經遷移成 Vue 頁面的項目在這裡加一筆，
 * 沒對到的會照原本行為導去舊系統。目前只有「財產盤點(個人)」接上。
 */
function internalPath(url: string): string | null {
  if (url.startsWith('inventory_user.php')) return '/staff/content/internal-system/property/inventory-user'
  return null
}

const loadTodo = async () => {
  todoLoading.value = true
  todoError.value = false
  try {
    todo.value = await $fetch<TodoResponse>('/api/internal-system/property/todo')
  } catch {
    todoError.value = true
  } finally {
    todoLoading.value = false
  }
}

const loadNews = async () => {
  newsLoading.value = true
  newsError.value = false
  try {
    news.value = await $fetch<NewsResponse>('/api/internal-system/property/news')
  } catch {
    newsError.value = true
  } finally {
    newsLoading.value = false
  }
}

const toggleEdit = () => {
  if (!editing.value) {
    editHtml.value = news.value?.news ?? ''
  }
  editing.value = !editing.value
}

const saveNews = async () => {
  saving.value = true
  try {
    const res = await $fetch<{ rs: string; msg: string }>('/api/internal-system/property/news', {
      method: 'POST',
      body: { html: editHtml.value },
    })
    if (res.rs === '1') {
      editing.value = false
      await loadNews()
    } else {
      alert(res.msg ?? '儲存失敗')
    }
  } catch {
    alert('儲存失敗，請稍後再試')
  } finally {
    saving.value = false
  }
}

onMounted(() => {
  loadTodo()
  loadNews()
})
</script>

<style scoped>
.property-home {
  display: flex;
  flex-direction: column;
  gap: 20px;
  max-width: 900px;
}

.card {
  background: var(--surface);
  border: 1px solid var(--border-light);
  border-radius: var(--radius);
  box-shadow: var(--shadow);
  overflow: hidden;
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 18px;
  border-bottom: 1px solid var(--border-light);
}

.card-header-title {
  font-weight: 700;
  color: var(--text);
  font-size: 15px;
}

.badge {
  background: #e53e3e;
  color: white;
  font-size: 12px;
  font-weight: 700;
  padding: 2px 10px;
  border-radius: 999px;
}

.card-body {
  padding: 16px 18px;
}

.hint-text {
  color: var(--text-hint);
  font-size: 13px;
  margin: 0;
}

.error-text {
  color: #e53e3e;
  font-size: 13px;
  margin: 0;
}

.todo-empty {
  text-align: center;
  padding: 24px 0;
}

.todo-empty-icon {
  font-size: 28px;
  margin-bottom: 8px;
}

.todo-empty-title {
  font-weight: 700;
  color: var(--text);
  margin-bottom: 4px;
}

.todo-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.todo-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 14px;
  border-radius: var(--radius-sm);
  background: var(--surface2);
  border-left: 4px solid var(--border);
  color: var(--text);
  font-size: 14px;
  transition: transform 0.15s;
}

.todo-item:hover { transform: translateX(3px); }

.todo-item.level-danger { border-left-color: #e53e3e; }
.todo-item.level-warning { border-left-color: #f97316; }
.todo-item.level-info { border-left-color: var(--accent); }
.todo-item.level-success { border-left-color: #38a169; }

.todo-arrow {
  color: var(--text-hint);
  font-size: 18px;
}

.edit-btn {
  padding: 6px 14px;
  border: 1px solid var(--border);
  border-radius: 6px;
  background: var(--surface);
  color: var(--text);
  font-size: 13px;
  cursor: pointer;
}
.edit-btn:hover { background: var(--surface2); }

.news-content {
  color: var(--text);
  font-size: 14px;
  line-height: 1.7;
}

.news-textarea {
  width: 100%;
  box-sizing: border-box;
  padding: 10px;
  border: 1px solid var(--border);
  border-radius: 8px;
  font-size: 14px;
  font-family: inherit;
  background: var(--surface);
  color: var(--text);
  resize: vertical;
}

.news-edit-actions {
  margin-top: 10px;
  text-align: right;
}

.save-btn {
  padding: 8px 20px;
  background: var(--accent);
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  cursor: pointer;
}
.save-btn:disabled { opacity: 0.6; cursor: not-allowed; }
</style>