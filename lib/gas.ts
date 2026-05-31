import { Expense } from './types'

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
  const res = await fetch(BASE, { cache: 'no-store', headers: { ...authHeaders() } })
  if (res.status === 401) throw new Error('存取密碼錯誤或未設定，請至設定頁輸入')
  if (!res.ok) throw new Error('Failed to fetch expenses')
  const data = await res.json()
  return Array.isArray(data) ? data : []
}

export async function addExpense(expense: Expense): Promise<void> {
  const res = await fetch(BASE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({ action: 'add', expense }),
  })
  if (!res.ok) throw new Error('Failed to add expense')
}

export async function deleteExpense(id: string): Promise<void> {
  const res = await fetch(BASE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({ action: 'delete', id }),
  })
  if (!res.ok) throw new Error('Failed to delete expense')
}

export async function updateExpense(expense: Expense): Promise<void> {
  const res = await fetch(BASE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({ action: 'update', expense }),
  })
  if (!res.ok) throw new Error('Failed to update expense')
}
