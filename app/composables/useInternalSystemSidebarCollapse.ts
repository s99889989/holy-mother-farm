/**
 * 側欄收合狀態，四個模組（行事曆/財產/需求單/公務車）共用同一份狀態，
 * 用 useState 讓同一個 client session 內導覽不同頁面時收合狀態不會跳回去，
 * 另外用 localStorage 讓整頁重新整理後也記得使用者上次的選擇。
 */
export function useInternalSystemSidebarCollapse() {
  const collapsed = useState('internal-system-sidebar-collapsed', () => {
    if (import.meta.client) {
      const stored = localStorage.getItem('internal_system_sidebar_collapsed')
      if (stored !== null) return stored === '1'
      // 沒存過偏好時：手機版預設收合（側欄不擋住畫面），桌機版預設展開
      return window.innerWidth <= 768
    }
    return false
  })

  const toggle = () => {
    collapsed.value = !collapsed.value
    if (import.meta.client) {
      localStorage.setItem('internal_system_sidebar_collapsed', collapsed.value ? '1' : '0')
    }
  }

  return { collapsed, toggle }
}
