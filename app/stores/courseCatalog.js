// 專案 holy-mother-farm 位置 stores/courseCatalog.js
//
// 課程管理（課程目錄）store，對接 CourseCatalogController（/holy/course-catalog）。
// 呼叫慣例比照 courseRegistration.js：plain fetch + credentials: 'include'。
import { defineStore } from 'pinia'

export const useCourseCatalogStore = defineStore('courseCatalog', {
  state: () => ({
    catalogs: [], // { id, name, coach, content }
  }),

  actions: {
    _base() {
      const commonStore = useCommonStore()
      return `${commonStore.data.main_url}/holy/course-catalog`
    },

    async fetchCatalogs() {
      const res = await fetch(`${this._base()}/get`, { credentials: 'include' })
      this.catalogs = await res.json()
    },
    async addCatalog(name, coach, content) {
      const res = await fetch(`${this._base()}/add`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, coach, content })
      })
      const id = await res.text()
      await this.fetchCatalogs()
      return id
    },
    async updateCatalog(id, name, coach, content) {
      await fetch(`${this._base()}/update`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, name, coach, content })
      })
      await this.fetchCatalogs()
    },
    async removeCatalog(id) {
      await fetch(`${this._base()}/remove/${id}`, { method: 'DELETE', credentials: 'include' })
      await this.fetchCatalogs()
    }
  }
})
