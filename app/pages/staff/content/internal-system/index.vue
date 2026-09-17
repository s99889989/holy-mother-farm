<template>
  <div class="menu-page">
    <h1 class="page-title">應用程式選單</h1>

    <section v-for="section in sections" :key="section.title" class="menu-section">
      <h2 class="section-title">{{ section.title }}</h2>
      <div class="apps-grid">
        <template v-for="item in section.items" :key="item.label">
          <NuxtLink v-if="item.to" :to="item.to" class="app-btn">
            <span class="app-icon">{{ item.icon }}</span>
            <span class="app-label">{{ item.label }}</span>
          </NuxtLink>
          <button v-else type="button" class="app-btn disabled" disabled title="尚未開放">
            <span class="app-icon">{{ item.icon }}</span>
            <span class="app-label">{{ item.label }}</span>
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
    icon: string
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
        { label: '個人資料修改', icon: '🧑‍💼' }, //, to: '/user/profile'
        { label: '行事曆刊登', icon: '📅', to: '/staff/content/internal-system/calendar' },
        { label: '公務車管理系統', icon: '🚗', to: '/staff/content/internal-system/vehicle/select-car-farm' },
        { label: '需求(維修)單功能', icon: '🛠️', to: '/staff/content/internal-system/request' },
        { label: '教育訓練網站(舊)(請使用IE瀏覽器)', icon: '📚' },
        { label: '教育訓練網站(新)', icon: '📖' },
        { label: '員工自我介紹', icon: '🙋' },
        { label: '員工出勤查詢', icon: '🕒', to: '/staff/content/internal-system/attendance' },
        { label: '採購作業系統', icon: '🛒' },
        { label: '院內最新公告管理', icon: '📢' },
        { label: '員工體檢系統', icon: '🩺' },
        { label: '員工績效考核系統', icon: '📊' },
        { label: '居服員休假管理系統', icon: '🏖️' },
      ],
    },
    {
      title: '會計與人資專區',
      items: [
        { label: '員工管理系統', icon: '👥' },
        { label: '農莊薪資系統', icon: '💰' },
        { label: '會館薪資系統', icon: '💰' },
        { label: '醫院薪資系統', icon: '💰' },
        { label: '芳心好美館薪資系統', icon: '💰' },
        { label: '東區職訓薪資系統', icon: '💰' },
        { label: '離職人員各系統使用權限管控', icon: '🔒' },
        { label: '薪資系統(舊版)', icon: '💵' },
        { label: '核銷管理系統', icon: '🧾' },
      ],
    },
    {
      title: '其他程式專區',
      items: [
        { label: '財產管理系統', icon: '🏢', to: '/staff/content/internal-system/property' },
        { label: '合約管理系統', icon: '📄' },
        { label: '院內異常事件通報', icon: '⚠️' },
        { label: '公文管理系統(舊)', icon: '📁' },
        { label: '醫療儀器管理系統', icon: '🩻' },
        { label: '醫師支援系統', icon: '👨‍⚕️' },
        { label: 'BMRI網路報名系統', icon: '📝' },
        { label: 'TPSRS', icon: '📝' },
        { label: '系統開發與維護管理系統', icon: '💻' },
        { label: '危急值或重要結果通報系統', icon: '🚨' },
        { label: '資訊資產風險管理', icon: '🔐' },
        { label: '防疫輪班管理系統', icon: '😷' },
        { label: '聖母回報系統', icon: '📣' },
        { label: '防疫資訊系統', icon: '🦠' },
        { label: '疫苗預約系統', icon: '💉' },
        { label: '院內課程報名管理系統', icon: '🎓' },
        { label: '地點編號查詢', icon: '📍' },
        { label: '員工APP後台', icon: '📱' },
        { label: '文件及表單管理系統', icon: '🗂️' },
        { label: '外部體檢管理系統', icon: '🏥' },
        { label: '預算管理系統', icon: '💹' },
        { label: '通信管理系統', icon: '📡' },
        { label: '主管審核系統', icon: '✅' },
      ],
    },
  ]
</script>

<style scoped>
  .menu-page {
    max-width: 1200px;
    margin: 0 auto;
    padding: 0 16px;
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
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 6px;
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

  .app-icon {
    font-size: 20px;
    line-height: 1;
  }

  .app-label {
    line-height: 1.4;
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

  @media (max-width: 480px) {
    .menu-page {
      padding: 0 12px;
    }

    .apps-grid {
      grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
      gap: 10px;
    }

    .app-btn {
      min-height: 56px;
      padding: 8px 10px;
      font-size: 13px;
      gap: 4px;
    }

    .app-icon {
      font-size: 18px;
    }
  }
</style>
