import { Expense } from './types'

const BASE = '/api/expenses'

export async function fetchExpenses(): Promise<Expense[]> {
  const res = await fetch(BASE, { cache: 'no-store' })
  if (!res.ok) throw new Error('Failed to fetch expenses')
  const data = await res.json()
  return Array.isArray(data) ? data : []
}

export async function addExpense(expense: Expense): Promise<void> {
  const res = await fetch(BASE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'add', expense }),
  })
  if (!res.ok) throw new Error('Failed to add expense')
}

export async function deleteExpense(id: string): Promise<void> {
  const res = await fetch(BASE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'delete', id }),
  })
  if (!res.ok) throw new Error('Failed to delete expense')
}

export async function updateExpense(expense: Expense): Promise<void> {
  const res = await fetch(BASE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'update', expense }),
  })
  if (!res.ok) throw new Error('Failed to update expense')
}
