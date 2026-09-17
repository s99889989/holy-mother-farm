/**
 * 側欄收合狀態，四個模組（行事曆/財產/需求單/公務車）共用同一份狀態，
 * 用 useState 讓同一個 client session 內導覽不同頁面時收合狀態不會跳回去，
 * 另外用 localStorage 讓整頁重新整理後也記得使用者上次的選擇。
 *
 * @param defaultCollapsed 還沒存過使用者偏好時要用的預設值。不傳的話沿用原本邏輯：
 *   手機版預設收合、桌機版預設展開。個別模組如果想要一進來就固定收合/展開
 *   （例如公務車管理系統希望預設關閉），可以在呼叫時指定 true/false 覆蓋掉。
 */
export function useInternalSystemSidebarCollapse(defaultCollapsed?: boolean) {
  const collapsed = useState('internal-system-sidebar-collapsed', () => {
    if (import.meta.client) {
      const stored = localStorage.getItem('internal_system_sidebar_collapsed')
      if (stored !== null) return stored === '1'
      if (defaultCollapsed !== undefined) return defaultCollapsed
      // 沒存過偏好、呼叫端也沒指定時：手機版預設收合（側欄不擋住畫面），桌機版預設展開
      return window.innerWidth <= 768
    }
    return defaultCollapsed ?? false
  })

  const toggle = () => {
    collapsed.value = !collapsed.value
    if (import.meta.client) {
      localStorage.setItem('internal_system_sidebar_collapsed', collapsed.value ? '1' : '0')
    }
  }

  // 點了選單裡的連結之後收合側欄（只在手機版做，桌機版側欄本來就常駐展開，
  // 點連結不該把它收起來）
  const closeOnMobile = () => {
    if (import.meta.client && window.innerWidth <= 768 && !collapsed.value) {
      toggle()
    }
  }

  return { collapsed, toggle, closeOnMobile }
}
