<template>
  <div class="app-wrapper">
    <aside class="sidebar">
      <div class="sidebar-header">
        <div class="brand">🏢 財產管理系統</div>
        <span v-if="identity?.currentLabel" class="identity-badge">
          {{ identity.currentLabel }}
        </span>
        <div class="sidebar-actions">
          <button class="action-btn" type="button" @click="openAgentModal">🔁 更改代理身分</button>
          <NuxtLink to="/staff/content/internal-system" class="action-btn">🏠 返回選單</NuxtLink>
          <button class="action-btn logout-btn" @click="handleLogout">登出</button>
        </div>
      </div>

      <NuxtLink to="/staff/content/internal-system/property" class="sidebar-top-link" :class="{ active: route.path === '/staff/content/internal-system/property' }">
        📰 最新消息
      </NuxtLink>

      <div v-for="group in internalSystemPropertyMenuGroups" :key="group.title" class="sidebar-group">
        <button type="button" class="sidebar-group-header" @click="toggleGroup(group.title)">
          <span>{{ group.title }}</span>
          <span class="sidebar-arrow" :class="{ open: isOpen(group.title) }">▾</span>
        </button>
        <div v-show="isOpen(group.title)" class="sidebar-group-items">
          <NuxtLink
              v-for="item in group.items"
              :key="item.slug"
              :to="`/staff/content/internal-system/property/${item.slug}`"
              class="sidebar-link"
              :class="{ active: route.path === `/staff/content/internal-system/property/${item.slug}` }"
          >
            {{ item.label }}
          </NuxtLink>
        </div>
      </div>
    </aside>

    <main class="main-content">
      <slot />
    </main>

    <!-- 更改代理身分 -->
    <div v-if="showAgentModal" class="modal-backdrop" @click.self="closeAgentModal">
      <div class="modal-box">
        <h3 class="modal-title">切換代理身分</h3>
        <p class="modal-text">選擇一個身分</p>
        <select v-model="selectedAgentValue" class="agent-select">
          <option v-for="o in identity?.options ?? []" :key="o.value" :value="o.value">
            {{ o.name }} ({{ o.value === identity?.options.find(x => x.selected)?.value ? '原身分' : '使用者' }})
          </option>
        </select>
        <div class="modal-actions">
          <button type="button" class="btn-sm" @click="closeAgentModal">取消</button>
          <button type="button" class="btn-sm btn-confirm" :disabled="switching" @click="confirmSwitchAgent">
            {{ switching ? '切換中...' : '確認切換' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { internalSystemPropertyMenuGroups } from '~/utils/internal-system/propertyMenu'

/** 對應 server/api/internal-system/property/identity.get.ts 的回傳形狀 */
interface AgentOption {
  value: string
  sn: string
  role: string
  name: string
  label: string
  selected: boolean
}
interface IdentityResponse {
  currentLabel: string
  options: AgentOption[]
}

const route = useRoute()

const openGroups = reactive<Record<string, boolean>>(
    Object.fromEntries(internalSystemPropertyMenuGroups.map((g) => [g.title, g.defaultOpen]))
)

const isOpen = (title: string) => openGroups[title]
const toggleGroup = (title: string) => {
  openGroups[title] = !openGroups[title]
}

const handleLogout = async () => {
  await $fetch('/api/internal-system/auth/logout', { method: 'POST' }).catch(() => {})
  navigateTo('/staff/content/internal-system/login')
}

const loggedIn = useCookie('logged_in')
let cookieCheckTimer: ReturnType<typeof setInterval> | null = null

const checkLoggedIn = () => {
  if (!loggedIn.value) {
    navigateTo('/staff/content/internal-system/login')
  }
}

/* =========================================================
 * 目前登入身份 / 更改代理身分
 * =======================================================*/
const identity = ref<IdentityResponse | null>(null)
const showAgentModal = ref(false)
const selectedAgentValue = ref('')
const switching = ref(false)

const loadIdentity = async () => {
  try {
    identity.value = await $fetch<IdentityResponse>('/api/internal-system/property/identity')
  } catch {
    identity.value = null
  }
}

const openAgentModal = async () => {
  if (!identity.value) await loadIdentity()
  const current = identity.value?.options.find((o) => o.selected)
  selectedAgentValue.value = current?.value ?? identity.value?.options[0]?.value ?? ''
  showAgentModal.value = true
}

const closeAgentModal = () => {
  showAgentModal.value = false
}

const confirmSwitchAgent = async () => {
  const target = identity.value?.options.find((o) => o.value === selectedAgentValue.value)
  if (!target) return

  switching.value = true
  try {
    const res = await $fetch<{ rs: string; msg: string }>('/api/internal-system/property/change-agent', {
      method: 'POST',
      body: {
        agent: target.value,
        role: target.role,
        name: target.name,
        sn: target.sn,
      },
    })
    if (res.rs === '1') {
      // 切換身分後權限/選單可能不同，比照舊系統整頁重新整理
      window.location.reload()
    } else {
      alert(res.msg ?? '切換失敗')
    }
  } catch {
    alert('切換失敗，請稍後再試')
  } finally {
    switching.value = false
  }
}

onMounted(() => {
  loadIdentity()
  cookieCheckTimer = setInterval(checkLoggedIn, 5000)
  document.addEventListener('visibilitychange', checkLoggedIn)
})

onUnmounted(() => {
  if (cookieCheckTimer) clearInterval(cookieCheckTimer)
  document.removeEventListener('visibilitychange', checkLoggedIn)
})
</script>

<style scoped>
.app-wrapper {
  min-height: 100vh;
  display: flex;
}

.sidebar {
  width: 240px;
  flex-shrink: 0;
  background: var(--surface);
  border-right: 1px solid var(--border-light);
  padding: 0 0 12px;
  overflow-y: auto;
}

.sidebar-header {
  background: #2d3748;
  padding: 16px 16px 12px;
  margin-bottom: 8px;
}

html.dark .sidebar-header {
  background: #14161a;
}

.brand {
  font-size: 18px;
  font-weight: bold;
  color: white;
  letter-spacing: 1px;
  margin-bottom: 8px;
}

.identity-badge {
  display: block;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.85);
  padding: 4px 8px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 6px;
  margin-bottom: 10px;
  width: fit-content;
}

.sidebar-actions {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.action-btn {
  display: block;
  padding: 5px 10px;
  border: 1px solid rgba(255,255,255,0.3);
  border-radius: 6px;
  background: transparent;
  color: white;
  font-size: 13px;
  cursor: pointer;
  transition: background 0.2s;
  text-decoration: none;
  text-align: left;
  font-family: inherit;
}
.action-btn:hover { background: rgba(255,255,255,0.15); }

.sidebar-top-link {
  display: block;
  padding: 10px 20px;
  font-size: 14px;
  font-weight: 700;
  color: var(--text);
  border-bottom: 1px solid var(--border-light);
  margin-bottom: 8px;
}

.sidebar-top-link.active,
.sidebar-top-link:hover {
  background: var(--accent-light);
  color: var(--accent);
}

.sidebar-group-header {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 20px;
  background: none;
  border: none;
  color: var(--text);
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  text-align: left;
}

.sidebar-arrow {
  color: var(--text-hint);
  transition: transform 0.2s;
  font-size: 12px;
}

.sidebar-arrow.open { transform: rotate(180deg); }

.sidebar-group-items {
  display: flex;
  flex-direction: column;
  padding-bottom: 6px;
}

.sidebar-link {
  padding: 8px 20px 8px 32px;
  font-size: 13px;
  color: var(--text-muted);
}

.sidebar-link.active,
.sidebar-link:hover {
  background: var(--accent-light);
  color: var(--accent);
}

.main-content {
  flex: 1;
  padding: 20px;
  min-width: 0;
}

.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 200;
}

.modal-box {
  background: var(--surface);
  border-radius: var(--radius);
  padding: 20px;
  width: 340px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
}

.modal-title {
  margin: 0 0 10px;
  font-size: 16px;
  color: var(--text);
}

.modal-text {
  font-size: 13px;
  color: var(--text-muted);
  margin: 0 0 8px;
}

.agent-select {
  width: 100%;
  padding: 8px 10px;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--surface);
  color: var(--text);
  font-size: 13px;
  margin-bottom: 16px;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

.btn-sm {
  padding: 4px 10px;
  border: 1px solid var(--border);
  border-radius: 6px;
  background: var(--surface);
  color: var(--text);
  font-size: 12px;
  cursor: pointer;
}
.btn-sm:hover { background: var(--surface2); }

.btn-confirm {
  background: var(--accent);
  color: white;
  border-color: var(--accent);
}
.btn-confirm:disabled { opacity: 0.6; cursor: not-allowed; }
</style>
