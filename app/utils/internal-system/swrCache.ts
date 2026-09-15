/**
 * app/utils/swrCache.ts
 * Stale-While-Revalidate 快取工具
 * 先從 localStorage 取舊資料立即顯示，背景更新後 callback 通知
 */

const PREFIX = 'swr_'
const DEFAULT_TTL = 60 * 60 * 1000 // 1小時，過期才強制重抓

interface CacheEntry<T> {
  data: T
  cachedAt: number
}

export function internalSystemCacheGet<T>(key: string): T | null {
  if (!import.meta.client) return null
  try {
    const raw = localStorage.getItem(PREFIX + key)
    if (!raw) return null
    const entry: CacheEntry<T> = JSON.parse(raw)
    return entry.data
  } catch {
    return null
  }
}

export function internalSystemCacheSet<T>(key: string, data: T): void {
  if (!import.meta.client) return
  try {
    const entry: CacheEntry<T> = { data, cachedAt: Date.now() }
    localStorage.setItem(PREFIX + key, JSON.stringify(entry))
  } catch {
    // localStorage 滿了就跳過
  }
}

export function internalSystemCacheAge(key: string): number {
  if (!import.meta.client) return Infinity
  try {
    const raw = localStorage.getItem(PREFIX + key)
    if (!raw) return Infinity
    const entry: CacheEntry<unknown> = JSON.parse(raw)
    return Date.now() - entry.cachedAt
  } catch {
    return Infinity
  }
}

export function internalSystemCacheClear(key: string): void {
  if (!import.meta.client) return
  localStorage.removeItem(PREFIX + key)
}

/**
 * SWR 核心函式
 * 1. 立即從 cache 取資料回傳（stale）
 * 2. 背景發請求取新資料
 * 3. 新資料回來後存 cache，並呼叫 onUpdate callback
 *
 * @param key        cache key
 * @param fetcher    實際發請求的函式
 * @param onUpdate   新資料回來時呼叫（只在資料有變動時才呼叫）
 * @param ttl        超過這個時間才強制等新資料（預設 1 小時）
 * @returns          立即可用的舊資料（可能是 null 如果第一次）
 */
export async function internalSystemSwr<T>(
  key: string,
  fetcher: () => Promise<T>,
  onUpdate: (data: T) => void,
  ttl = DEFAULT_TTL
): Promise<T | null> {
  const cached = internalSystemCacheGet<T>(key)
  const age = internalSystemCacheAge(key)

  // 有快取就先回傳（即使很舊）
  if (cached !== null) {
    // 背景更新（不 await）
    fetcher().then((fresh) => {
      internalSystemCacheSet(key, fresh)
      // 不管資料有無變動都呼叫 onUpdate，讓呼叫端能更新同步狀態
      onUpdate(fresh)
    }).catch(() => {
      // 背景更新失敗，也要通知讓狀態恢復
      onUpdate(cached)
    })
    return cached
  }

  // 第一次，沒有快取，必須等
  try {
    const fresh = await fetcher()
    internalSystemCacheSet(key, fresh)
    return fresh
  } catch {
    return null
  }
}
