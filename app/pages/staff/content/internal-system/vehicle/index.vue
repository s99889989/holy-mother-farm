<template>
  <InternalSystemVehicleShell>
    <div class="vehicle-page">
      <div class="tabs">
        <button
          type="button"
          class="tab-btn"
          :class="{ active: activeTab === 'news' }"
          @click="activeTab = 'news'"
        >
          最新消息
        </button>
        <button
          type="button"
          class="tab-btn"
          :class="{ active: activeTab === 'site' }"
          @click="activeTab = 'site'"
        >
          各站點負責人清單
        </button>
      </div>

      <p v-if="loading" class="hint-text">載入中...</p>
      <p v-else-if="error" class="error-text">載入失敗，請重新整理再試一次</p>

      <template v-else-if="data">
        <!-- 最新消息 -->
        <div v-show="activeTab === 'news'" class="card">
          <div class="card-header">
            <h2>📢 最新消息</h2>
          </div>
          <div class="card-body">
            <div class="news-content" v-html="data.newsHtml" />
          </div>
        </div>

        <!-- 各站點負責人清單 -->
        <div v-show="activeTab === 'site'" class="card">
          <div class="card-header">
            <h2>各站點負責人清單</h2>
          </div>
          <div class="card-body">
            <h3 class="section-title">總站負責人</h3>
            <table class="staff-table">
              <thead>
              <tr>
                <th>姓名(員編)</th>
                <th>聯絡信箱</th>
              </tr>
              </thead>
              <tbody>
              <tr v-for="s in data.headStaff" :key="s.name">
                <td>{{ s.name }}</td>
                <td>{{ s.email }}</td>
              </tr>
              </tbody>
            </table>

            <h3 class="section-title">站點負責人</h3>
            <table class="staff-table">
              <thead>
              <tr>
                <th>站點名稱</th>
                <th>主要負責人</th>
                <th>行政負責人</th>
              </tr>
              </thead>
              <tbody>
              <tr v-for="s in data.siteStaff" :key="s.site">
                <td>{{ s.site }}</td>
                <td>{{ s.main }}</td>
                <td :class="{ 'warn-text': s.admin.includes('尚未設定') }">{{ s.admin }}</td>
              </tr>
              </tbody>
            </table>
          </div>
        </div>
      </template>
    </div>
  </InternalSystemVehicleShell>
</template>

<script setup lang="ts">
  definePageMeta({ layout: 'staff', requiredPermission: 'content.internal-system', middleware: 'internal-system-auth' })

  interface VehicleHomeData {
    newsHtml: string
    headStaff: { name: string; email: string }[]
    siteStaff: { site: string; main: string; admin: string }[]
  }

  const activeTab = ref<'news' | 'site'>('news')
  const data = ref<VehicleHomeData | null>(null)
  const loading = ref(true)
  const error = ref(false)

  const load = async () => {
    loading.value = true
    error.value = false
    try {
      data.value = await $fetch<VehicleHomeData>('/api/internal-system/vehicle/home')
    } catch (e: any) {
      if (e?.statusCode === 401) {
        const loggedIn = useCookie('logged_in')
        loggedIn.value = null
        navigateTo('/staff/content/internal-system/login')
        return
      }
      error.value = true
    } finally {
      loading.value = false
    }
  }

  onMounted(load)
</script>

<style scoped>
  .vehicle-page {
    max-width: 900px;
  }

  .tabs {
    display: flex;
    gap: 4px;
    border-bottom: 1px solid var(--border-light);
    margin-bottom: 16px;
  }

  .tab-btn {
    padding: 10px 16px;
    background: none;
    border: none;
    border-bottom: 2px solid transparent;
    color: var(--text-muted);
    font-size: 16px;
    cursor: pointer;
  }

  .tab-btn.active {
    color: var(--accent);
    border-bottom-color: var(--accent);
    font-weight: 700;
  }

  .hint-text { color: var(--text-muted); }
  .error-text { color: #e53e3e; }

  .card {
    background: var(--surface);
    border: 1px solid var(--border-light);
    border-radius: var(--radius);
    box-shadow: var(--shadow);
  }

  .card-header {
    padding: 14px 18px;
    border-bottom: 1px solid var(--border-light);
  }

  .card-header h2 {
    margin: 0;
    font-size: 18px;
    color: var(--text);
  }

  .card-body {
    padding: 18px;
  }

  .news-content :deep(p) {
    margin: 0 0 10px;
    line-height: 1.7;
    color: var(--text);
  }

  .news-content :deep(table) {
    width: 100%;
    border-collapse: collapse;
    margin: 10px 0;
  }

  .news-content :deep(td) {
    border: 1px solid var(--border-light);
    padding: 6px 10px;
    font-size: 16px;
  }

  .section-title {
    font-size: 18px;
    font-weight: 700;
    color: var(--text);
    text-align: center;
    margin: 20px 0 12px;
  }
  .section-title:first-child { margin-top: 0; }

  .staff-table {
    width: 100%;
    border-collapse: collapse;
    margin-bottom: 10px;
  }

  .staff-table th,
  .staff-table td {
    border: 1px solid var(--border-light);
    padding: 8px 10px;
    text-align: center;
    font-size: 16px;
  }

  .staff-table th {
    background: var(--surface2);
    color: var(--text);
  }

  .warn-text {
    color: #dd6b20;
  }
</style>
