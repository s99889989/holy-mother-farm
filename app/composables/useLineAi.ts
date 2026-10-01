// LINE AI 客服後台共用：API 呼叫 + 目前檢視的官方帳號
export const useLineAi = () => {
  const commonStore = useCommonStore()

  const api = <T = any>(path: string, opts: Record<string, any> = {}) =>
    $fetch<T>(`${commonStore.data.main_url}/holy/line-ai/admin${path}`, {
      credentials: 'include',
      ...opts,
    })

  const accounts = useState<any[]>('lineai-accounts', () => [])
  const accountId = useState<string>('lineai-account-id', () => '')
  const current = computed(() => accounts.value.find(a => a.id === accountId.value) || null)

  async function loadAccounts() {
    accounts.value = await api<any[]>('/accounts')
    if (!accounts.value.find(a => a.id === accountId.value)) {
      const saved = import.meta.client ? localStorage.getItem('lineai_account') : null
      accountId.value = accounts.value.find(a => a.id === saved)?.id || accounts.value[0]?.id || ''
    }
  }

  function selectAccount(id: string) {
    accountId.value = id
    if (import.meta.client) localStorage.setItem('lineai_account', id)
  }

  function errMsg(e: any) {
    return e?.data?.message || e?.data?.error || e?.message || '發生錯誤'
  }

  function fmtTime(ts: number) {
    if (!ts) return ''
    const d = new Date(ts)
    const now = new Date()
    const hm = d.toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit', hour12: false })
    if (d.toDateString() === now.toDateString()) return hm
    return `${d.getMonth() + 1}/${d.getDate()} ${hm}`
  }

  function ago(ts: number) {
    if (!ts) return ''
    const s = Math.floor((Date.now() - ts) / 1000)
    if (s < 60) return '剛剛'
    if (s < 3600) return `${Math.floor(s / 60)} 分鐘前`
    if (s < 86400) return `${Math.floor(s / 3600)} 小時前`
    return `${Math.floor(s / 86400)} 天前`
  }

  const SOURCE_LABEL: Record<string, string> = {
    faq: '常見問題',
    knowledge: '知識庫',
    shopinfo: '店家資訊',
    greeting: '問候',
    nodata: '查無資料',
    handoff: '轉人工',
    forbidden: '禁止主題',
    decline: '不轉接',
    myid: '我的ID',
    welcome: '歡迎訊息',
    manual: '店家回覆',
    ignored: '不回應',
    silent: '未回覆',
    error: '模型錯誤',
  }

  return { api, accounts, accountId, current, loadAccounts, selectAccount, errMsg, fmtTime, ago, SOURCE_LABEL }
}
