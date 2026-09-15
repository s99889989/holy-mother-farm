export interface PropertyMenuItem {
  label: string
  slug: string
}

export interface PropertyMenuGroup {
  title: string
  defaultOpen: boolean
  items: PropertyMenuItem[]
}

export const internalSystemPropertyMenuGroups: PropertyMenuGroup[] = [
  {
    title: '財產管理',
    defaultOpen: true,
    items: [
      { label: '我的財產', slug: 'user' },
      { label: '代管中財產', slug: 'borrow' },
      { label: '財產查詢', slug: 'search' },
      { label: '財產編號歷程查詢', slug: 'num-record' },
      { label: '放置地點查詢', slug: 'site' },
      { label: '類別查詢', slug: 'class' },
    ],
  },
  {
    title: '財產建立&資料變更',
    defaultOpen: false,
    items: [
      { label: '個人財產補登', slug: 'user-draft' },
      { label: '未成立資料變更', slug: 'change-request-draft' },
    ],
  },
  {
    title: '財產異動',
    defaultOpen: true,
    items: [
      { label: '未成立異動單', slug: 'change-draft' },
      { label: '異動單查詢', slug: 'change-search' },
    ],
  },
  {
    title: '審核',
    defaultOpen: true,
    items: [
      { label: '異動單審核', slug: 'change-review' },
      { label: '補登財產審核', slug: 'create-review' },
      { label: '財產資料變更審核', slug: 'change-request-review' },
    ],
  },
  {
    title: '代理人',
    defaultOpen: true,
    items: [{ label: '代理人', slug: 'agent' }],
  },
  {
    title: '財產盤點',
    defaultOpen: true,
    items: [
      { label: '盤點設定', slug: 'inventory-set' },
      { label: '盤點資料', slug: 'inventory-dashboard' },
    ],
  },
]

export function getInternalSystemPropertyFeatureLabel(slug: string): string {
  for (const group of internalSystemPropertyMenuGroups) {
    const found = group.items.find((item) => item.slug === slug)
    if (found) return found.label
  }
  return slug
}