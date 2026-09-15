<template>
  <div class="menu-page">
    <h1 class="page-title">應用程式選單</h1>

    <section v-for="section in sections" :key="section.title" class="menu-section">
      <h2 class="section-title">{{ section.title }}</h2>
      <div class="apps-grid">
        <template v-for="item in section.items" :key="item.label">
          <NuxtLink v-if="item.to" :to="item.to" class="app-btn">
            {{ item.label }}
          </NuxtLink>
          <button v-else type="button" class="app-btn disabled" disabled title="尚未開放">
            {{ item.label }}
          </button>
        </template>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
  definePageMeta({ layout: 'staff', requiredPermission: 'content.internal-system', middleware: 'internal-system-auth' })

  interface MenuItem {
    label: string
    to?: string
  }

  interface MenuSection {
    title: string
    items: MenuItem[]
  }

  const sections: MenuSection[] = [
    {
      title: '員工公用程式區',
      items: [
        { label: '個人資料修改' }, //, to: '/user/profile'
        { label: '行事曆刊登', to: '/staff/content/internal-system/calendar' },
        { label: '公務車管理系統' },
        { label: '需求(維修)單功能', to: '/staff/content/internal-system/request' },
        { label: '教育訓練網站(舊)(請使用IE瀏覽器)' },
        { label: '教育訓練網站(新)' },
        { label: '員工自我介紹' },
        { label: '員工出勤查詢' },
        { label: '採購作業系統' },
        { label: '院內最新公告管理' },
        { label: '員工體檢系統' },
        { label: '員工績效考核系統' },
        { label: '居服員休假管理系統' },
      ],
    },
    {
      title: '會計與人資專區',
      items: [
        { label: '員工管理系統' },
        { label: '農莊薪資系統' },
        { label: '會館薪資系統' },
        { label: '醫院薪資系統' },
        { label: '芳心好美館薪資系統' },
        { label: '東區職訓薪資系統' },
        { label: '離職人員各系統使用權限管控' },
        { label: '薪資系統(舊版)' },
        { label: '核銷管理系統' },
      ],
    },
    {
      title: '其他程式專區',
      items: [
        { label: '財產管理系統', to: '/staff/content/internal-system/property' },
        { label: '合約管理系統' },
        { label: '院內異常事件通報' },
        { label: '公文管理系統(舊)' },
        { label: '醫療儀器管理系統' },
        { label: '醫師支援系統' },
        { label: 'BMRI網路報名系統' },
        { label: 'TPSRS' },
        { label: '系統開發與維護管理系統' },
        { label: '危急值或重要結果通報系統' },
        { label: '資訊資產風險管理' },
        { label: '防疫輪班管理系統' },
        { label: '聖母回報系統' },
        { label: '防疫資訊系統' },
        { label: '疫苗預約系統' },
        { label: '院內課程報名管理系統' },
        { label: '地點編號查詢' },
        { label: '員工APP後台' },
        { label: '文件及表單管理系統' },
        { label: '外部體檢管理系統' },
        { label: '預算管理系統' },
        { label: '通信管理系統' },
        { label: '主管審核系統' },
      ],
    },
  ]
</script>

<style scoped>
  .menu-page {
    max-width: 1200px;
    margin: 0 auto;
  }

  .page-title {
    font-size: 20px;
    font-weight: 700;
    color: var(--text);
    margin: 0 0 24px;
  }

  .menu-section {
    margin-bottom: 32px;
  }

  .section-title {
    font-size: 17px;
    font-weight: 700;
    color: var(--accent);
    margin: 0 0 16px;
  }

  .apps-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
    gap: 12px;
  }

  .app-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    text-align: center;
    min-height: 64px;
    padding: 10px 14px;
    background: var(--surface);
    border: 1px solid var(--border-light);
    border-radius: var(--radius);
    box-shadow: var(--shadow);
    color: var(--text);
    font-size: 14px;
    line-height: 1.4;
    cursor: pointer;
    transition: transform 0.15s, border-color 0.15s, background 0.15s;
  }

  a.app-btn:hover {
    border-color: var(--accent);
    background: var(--accent-light);
    transform: translateY(-2px);
  }

  .app-btn.disabled {
    color: var(--text-hint);
    background: var(--surface2);
    cursor: not-allowed;
  }

  .app-btn.disabled:hover {
    transform: none;
  }
</style>
