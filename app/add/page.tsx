'use client'

import { useRouter } from 'next/navigation'
import PageShell from '../components/layout/PageShell'
import ExpenseForm from '../components/expenses/ExpenseForm'
import { addExpense } from '@/lib/gas'
import { Expense } from '@/lib/types'

export default function AddPage() {
  const router = useRouter()

  async function handleSave(expense: Expense) {
    await addExpense(expense)
    router.push('/')
  }

  return (
    <PageShell title="手動新增">
      <ExpenseForm onSave={handleSave} onCancel={() => router.back()} saveLabel="新增消費" />
    </PageShell>
  )
}
