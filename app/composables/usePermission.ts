// composables/usePermission.ts
//
// 用法：
//   const perm = usePermission()
//   perm.can('staff.booking')         → boolean
//   perm.canAny('staff.news', 'staff.news.edit')
//   perm.canAll('staff.booking', 'staff.booking.edit')
//
// 在 template 中：
//   <button v-if="perm.can('staff.booking.edit')">編輯</button>
//   <NavItem v-if="perm.can('staff.home')" to="/staff/home" />

import { usePermissionStore } from '~/stores/permission'

export const usePermission = () => {
  const store = usePermissionStore()

  return {
    /** 是否有某項權限 */
    can: (key: string): boolean => store.can(key),

    /** 是否有任一權限（OR） */
    canAny: (...keys: string[]): boolean => store.canAny(...keys),

    /** 是否全部都有（AND） */
    canAll: (...keys: string[]): boolean => store.canAll(...keys),

    /** 原始 perms map，供需要迭代的場合使用 */
    perms: store.perms,
  }
}
