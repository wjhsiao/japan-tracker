import { Expense } from './types'
import { fetchWithTimeout } from './utils'

const BASE = '/api/expenses'
const SETTINGS_KEY = 'japan-tracker:settings'

/** Read the access code from localStorage and build the auth header. */
function authHeaders(): Record<string, string> {
  if (typeof window === 'undefined') return {}
  try {
    const s = JSON.parse(localStorage.getItem(SETTINGS_KEY) ?? '{}')
    return s.accessCode ? { 'x-access-code': s.accessCode } : {}
  } catch {
    return {}
  }
}

export async function fetchExpenses(): Promise<Expense[]> {
  const res = await fetchWithTimeout(BASE, { cache: 'no-store', headers: { ...authHeaders() } })
  if (res.status === 401) throw new Error('存取密碼錯誤或未設定，請至設定頁輸入')
  if (!res.ok) throw new Error('Failed to fetch expenses')
  const data = await res.json()
  if (!Array.isArray(data)) return []
  // Normalize date to YYYY-MM-DD — Google Sheets may return it as a full ISO
  // datetime, which breaks date matching / formatting in the UI.
  return data.map((e: Expense) => ({ ...e, date: String(e.date).slice(0, 10) }))
}

/**
 * POST a write action. GAS encodes success/failure in the *body*
 * ({ok:true} / {error:'...'}) while always replying HTTP 200, so checking
 * res.ok alone silently swallows failures. We inspect the body instead.
 */
async function postWrite(payload: object, fallbackMsg: string): Promise<Record<string, unknown>> {
  const res = await fetchWithTimeout(BASE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify(payload),
  })
  if (res.status === 401) throw new Error('存取密碼錯誤或未設定，請至設定頁輸入')
  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>
  if (!res.ok) throw new Error((data.error as string) || fallbackMsg)
  return data
}

export async function addExpense(expense: Expense): Promise<void> {
  const data = await postWrite({ action: 'add', expense }, '新增失敗')
  if (!data.ok) throw new Error((data.error as string) || '新增失敗')
}

export async function deleteExpense(id: string): Promise<void> {
  const data = await postWrite({ action: 'delete', id }, '刪除失敗')
  if (!data.ok) throw new Error((data.error as string) || '刪除失敗')
}

export async function updateExpense(expense: Expense): Promise<void> {
  const data = await postWrite({ action: 'update', expense }, '更新失敗')
  if (!data.ok) throw new Error((data.error as string) || '更新失敗')
}
