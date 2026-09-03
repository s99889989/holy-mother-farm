// 專案 holy-mother-farm 位置 stores/courseSchedule.js
//
// 課程排課表 store，對接 CourseScheduleController（/holy/course-schedule）。
// 跟 courseRegistration.js 的呼叫慣例一樣：commonStore.data.main_url + 端點，
// $fetch 帶 credentials: 'include' 讓 holy_customer cookie 一起送出。
// ⚠️ 如果專案裡 courseRegistration.js 實際上是用別的方式呼叫（例如另一個
// useRequest/useApi 封裝），請比照那個改掉這支的 fetch 方式，行為不變即可。
//
// v2：改成多月份快取（monthsCache），因為「匯入課程簽到日期」可能一次橫跨
// 好幾個月（例如課程從 6/30 排到隔月），單一 this.days 沒辦法同時處理多個月份。

export const useCourseScheduleStore = defineStore('courseSchedule', {
  state: () => ({
    monthsCache: {},   // { "2026-07": { "2026-07-01": {...} } }
    currentYearMonth: '',
    loading: false,
  }),

  getters: {
    // 目前檢視月份的資料（維持跟舊版一樣的 scheduleStore.days 用法）
    days(state) {
      return state.monthsCache[state.currentYearMonth] || {}
    },
  },

  actions: {
    _base() {
      const commonStore = useCommonStore()
      return commonStore.data.main_url
    },

    async _fetchMonthRaw(yearMonth) {
      const data = await $fetch(`${this._base()}/holy/course-schedule/${yearMonth}`, {
        credentials: 'include',
      })
      this.monthsCache = { ...this.monthsCache, [yearMonth]: data || {} }
      return this.monthsCache[yearMonth]
    },

    // 切換檢視月份用：一定重新打 API 拿最新資料
    async fetchMonth(yearMonth) {
      this.loading = true
      try {
        await this._fetchMonthRaw(yearMonth)
        this.currentYearMonth = yearMonth
      } finally {
        this.loading = false
      }
    },

    // 確保某月份已經在快取裡（沒有才打 API），不影響目前檢視月份
    async ensureMonth(yearMonth) {
      if (!(yearMonth in this.monthsCache)) {
        await this._fetchMonthRaw(yearMonth)
      }
      return this.monthsCache[yearMonth]
    },

    dayOf(date) {
      return this.days[date] || { date, slots: [], adminTasks: [], promotion: '' }
    },

    // 讀任意月份（不一定是目前檢視月份）裡某一天的資料，匯入功能會用到
    dayOfIn(yearMonth, date) {
      const month = this.monthsCache[yearMonth] || {}
      return month[date] || { date, slots: [], adminTasks: [], promotion: '' }
    },

    _setDayInCache(yearMonth, date, patch) {
      const month = { ...(this.monthsCache[yearMonth] || {}) }
      month[date] = { ...(month[date] || { date, slots: [], adminTasks: [], promotion: '' }), ...patch }
      this.monthsCache = { ...this.monthsCache, [yearMonth]: month }
    },

    async updateSlots(date, slots) {
      const yearMonth = date.slice(0, 7)
      await $fetch(`${this._base()}/holy/course-schedule/${date}/slots`, {
        method: 'PUT',
        credentials: 'include',
        body: slots,
      })
      this._setDayInCache(yearMonth, date, { slots })
    },

    async updateAdminTasks(date, adminTasks) {
      const yearMonth = date.slice(0, 7)
      await $fetch(`${this._base()}/holy/course-schedule/${date}/admin-tasks`, {
        method: 'PUT',
        credentials: 'include',
        body: adminTasks,
      })
      this._setDayInCache(yearMonth, date, { adminTasks })
    },

    async updatePromotion(date, promotion) {
      const yearMonth = date.slice(0, 7)
      await $fetch(`${this._base()}/holy/course-schedule/${date}/promotion`, {
        method: 'PUT',
        credentials: 'include',
        body: { promotion },
      })
      this._setDayInCache(yearMonth, date, { promotion })
    },

    async clearDay(date) {
      const yearMonth = date.slice(0, 7)
      await $fetch(`${this._base()}/holy/course-schedule/${date}`, {
        method: 'DELETE',
        credentials: 'include',
      })
      const month = { ...(this.monthsCache[yearMonth] || {}) }
      delete month[date]
      this.monthsCache = { ...this.monthsCache, [yearMonth]: month }
    },
  },
})
