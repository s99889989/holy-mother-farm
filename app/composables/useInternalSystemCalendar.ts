/**
 * composables/useInternalSystemCalendar.ts
 * 加入 SWR 快取：先讀 localStorage，背景更新
 */
import { internalSystemSwr, internalSystemCacheGet, internalSystemCacheSet } from '~/utils/internal-system/swrCache'

export const useInternalSystemCalendar = () => {
  const loading = ref(false)
  const error = ref<string | null>(null)

  const handleError = (e: any, fallbackMsg = '載入失敗') => {
    if (e?.statusCode === 401) {
      const loggedIn = useCookie('logged_in')
      loggedIn.value = null
      navigateTo('/staff/content/internal-system/login')
      return
    }
    error.value = e?.data?.message ?? e?.statusMessage ?? fallbackMsg
  }

  /**
   * 月曆列表：SWR 快取
   * onUpdate 回調讓呼叫端更新畫面
   */
  const fetchList = async (
    year: number,
    month: number,
    onUpdate?: (data: any) => void
  ) => {
    loading.value = true
    error.value = null

    const key = `calendar_${year}_${month}`
    const fetcher = () => $fetch<any>('/api/internal-system/calendar/list', { params: { y: year, m: month } })

    try {
      if (onUpdate) {
        // SWR 模式：立即回傳快取，背景更新
        const result = await internalSystemSwr(key, fetcher, (fresh) => {
          onUpdate(fresh)
          loading.value = false
        })
        // 有快取就馬上關掉 loading
        if (result !== null) loading.value = false
        return result
      } else {
        // 一般模式
        const result = await fetcher()
        internalSystemCacheSet(key, result)
        return result
      }
    } catch (e: any) {
      handleError(e)
      return null
    } finally {
      // 沒快取的情況（第一次）才在這裡關 loading
      if (internalSystemCacheGet(key) === null) loading.value = false
    }
  }

  const fetchDetail = async (id: string) => {
    loading.value = true
    error.value = null
    const key = `calendar_detail_${id}`
    const fetcher = () => $fetch<any>('/api/internal-system/calendar/detail', { params: { id } })

    try {
      const result = await internalSystemSwr(key, fetcher, () => {
        // detail 頁面不需要背景更新通知（只讀）
      })
      return result
    } catch (e: any) {
      handleError(e)
      return null
    } finally {
      loading.value = false
    }
  }

  const fetchForm = async (
    type: 'add' | 'edit',
    options: { date?: string; id?: string } = {},
    onUpdate?: (data: any) => void
  ) => {
    loading.value = true
    error.value = null

    // form 資料快取 key（add 共用一份，edit 每個 id 一份）
    const key = type === 'edit' ? `calendar_form_edit_${options.id}` : 'calendar_form_add'
    const fetcher = () => $fetch<any>('/api/internal-system/calendar/form', { params: { type, ...options } })

    try {
      if (onUpdate) {
        const result = await internalSystemSwr(key, fetcher, (fresh) => {
          onUpdate(fresh)
        })
        if (result !== null) loading.value = false
        return result
      } else {
        const result = await fetcher()
        internalSystemCacheSet(key, result)
        return result
      }
    } catch (e: any) {
      handleError(e)
      return null
    } finally {
      if (internalSystemCacheGet(key) === null) loading.value = false
    }
  }

  const fetchPlaces = async (area: string, use: string) => {
    // 地點列表也快取（依 area+use 組合）
    const key = `places_${area}_${use}`
    const cached = internalSystemCacheGet<any[]>(key)
    if (cached) {
      // 背景更新
      $fetch<any>('/api/internal-system/calendar/places', { method: 'POST', body: { area, use } })
        .then(fresh => internalSystemCacheSet(key, fresh))
        .catch(() => {})
      return cached
    }
    try {
      const result = await $fetch<any>('/api/internal-system/calendar/places', { method: 'POST', body: { area, use } })
      internalSystemCacheSet(key, result)
      return result
    } catch (e: any) {
      handleError(e)
      return []
    }
  }

  const submitAdd = async (formData: Record<string, any>) => {
    loading.value = true
    try {
      const result = await $fetch<any>('/api/internal-system/calendar/add', { method: 'POST', body: formData })
      // 送出成功後清除該月的月曆快取，確保下次看到最新資料
      if (result?.success && formData.publish_start) {
        const [year, month] = formData.publish_start.split('-')
        localStorage.removeItem(`swr_calendar_${year}_${parseInt(month)}`)
      }
      return result
    } catch (e: any) {
      if (e?.statusCode === 401) { handleError(e); return null }
      return { success: false, message: e?.statusMessage ?? '送出失敗' }
    } finally {
      loading.value = false
    }
  }

  const submitEdit = async (formData: Record<string, any>) => {
    loading.value = true
    try {
      const result = await $fetch<any>('/api/internal-system/calendar/edit', { method: 'POST', body: formData })
      // 清除相關快取
      if (result?.success) {
        if (formData.publish_start) {
          const [year, month] = formData.publish_start.split('-')
          localStorage.removeItem(`swr_calendar_${year}_${parseInt(month)}`)
        }
        if (formData.calendar_id) {
          localStorage.removeItem(`swr_calendar_detail_${formData.calendar_id}`)
          localStorage.removeItem(`swr_calendar_form_edit_${formData.calendar_id}`)
        }
      }
      return result
    } catch (e: any) {
      if (e?.statusCode === 401) { handleError(e); return null }
      return { success: false, message: e?.statusMessage ?? '送出失敗' }
    } finally {
      loading.value = false
    }
  }

  return { loading, error, fetchList, fetchDetail, fetchForm, fetchPlaces, submitAdd, submitEdit }
}
