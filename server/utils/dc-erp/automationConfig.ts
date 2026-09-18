// server/utils/dc-erp/automationConfig.ts
//
// 自動化功能的客戶清單設定，存成一份 JSON 檔案——跟 settings.vue 其他區塊
// 用 localStorage 存的「列表顯示設定」不同，這份要給「伺服器排程/手動
// 觸發」用，不能只存在使用者瀏覽器裡，所以存 server 端檔案。
// 檔案位置刻意放在 data/ 底下、不進 public/，避免被靜態網址直接讀到。

import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { join, dirname } from 'node:path'

export interface AutomationCustomer {
  id: string
  firmCode: string
  label: string
  enabled: boolean
}

const CONFIG_PATH = join(process.cwd(), 'data', 'dc-erp-automation', 'customers.json')

export async function loadAutomationCustomers(): Promise<AutomationCustomer[]> {
  try {
    const raw = await readFile(CONFIG_PATH, 'utf-8')
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return [] // 檔案還不存在時就是空清單，不算錯誤
  }
}

export async function saveAutomationCustomers(list: AutomationCustomer[]): Promise<void> {
  await mkdir(dirname(CONFIG_PATH), { recursive: true })
  await writeFile(CONFIG_PATH, JSON.stringify(list, null, 2), 'utf-8')
}
