// POS 系統的導覽分組，供頂部導覽（StaffNavbar）與 POS 左側收合導覽（layouts/pos.vue）共用，
// 避免兩處各存一份項目清單、日後改動時漏掉其中一邊。
export interface PosNavItem {
  to: string
  icon: string
  label: string
  key: string
}

export interface PosNavGroup {
  label: string
  items: PosNavItem[]
}

export function usePosNav() {
  const groups: PosNavGroup[] = [
    {
      label: '🛒 日常作業',
      items: [
        { to: '/staff/pos/daily/sales', icon: '🛒', label: '商品販賣', key: 'pos.daily.sales' },
        { to: '/staff/pos/daily/account-inquiry', icon: '🧾', label: '帳務查詢', key: 'pos.account-inquiry' },
        { to: '/staff/pos/daily/stock', icon: '📦', label: '庫存管理', key: 'pos.daily.stock' }
      ]
    },
    {
      label: '📊 營業分析',
      items: [
        { to: '/staff/pos/analyze/sales-analysis', icon: '📈', label: '銷售報表', key: 'pos.analyze.pos-sales' }
      ]
    },
    {
      label: '⚙️ 系統設定',
      items: [
        { to: '/staff/pos/settings/menu-setting', icon: '🍴', label: '品項設置', key: 'pos.pos-accounting' },
        { to: '/staff/pos/settings/database-setting', icon: '🗄️', label: '資料庫設置', key: 'pos.pos-accounting' },
        { to: '/staff/pos/settings/equipment-setting', icon: '🖨️', label: '設備設置', key: 'pos.settings.equipment-setting' }
      ]
    }
  ]

  return { groups }
}
