'use client'

import { useState } from 'react'
import PageShell from '../components/layout/PageShell'
import CategoryBadge from '../components/expenses/CategoryBadge'
import ExpenseForm from '../components/expenses/ExpenseForm'
import { Expense, Category } from '@/lib/types'
import { deleteExpense, updateExpense } from '@/lib/gas'
import { useExpenses, invalidateExpensesCache } from '@/lib/useExpenses'
import { loadSettings } from '@/lib/settings'
import { formatJPY, formatTWD, formatDate, groupByDate, sumJPY } from '@/lib/utils'

export default function HistoryPage() {
  const { expenses, loading, error, refresh, setExpenses } = useExpenses()
  const [editing, setEditing] = useState<Expense | null>(null)
  const [filterCat, setFilterCat] = useState<Category | 'all'>('all')
  const [filterPerson, setFilterPerson] = useState<string | 'all'>('all')
  const settings = loadSettings()

  async function handleDelete(id: string) {
    if (!confirm('確定刪除這筆消費？')) return
    await deleteExpense(id)
    setExpenses(prev => prev.filter(e => e.id !== id))
    invalidateExpensesCache()
  }

  async function handleUpdate(expense: Expense) {
    await updateExpense(expense)
    setExpenses(prev => prev.map(e => e.id === expense.id ? expense : e))
    invalidateExpensesCache()
    setEditing(null)
  }

  const filtered = expenses
    .filter(e => filterCat === 'all' || e.category === filterCat)
    .filter(e => filterPerson === 'all' || e.paidBy === filterPerson)

  const grouped = groupByDate(filtered)
  const categories = Array.from(new Set(expenses.map(e => e.category)))
  const people = Array.from(new Set(expenses.map(e => e.paidBy).filter(Boolean)))

  if (editing) {
    return (
      <PageShell title="編輯消費">
        <ExpenseForm
          initial={{ ...editing, items: editing.items }}
          onSave={handleUpdate}
          onCancel={() => setEditing(null)}
          saveLabel="更新"
        />
      </PageShell>
    )
  }

  const chipClass = (active: boolean) =>
    `shrink-0 rounded-full px-3 py-1 text-xs font-medium border transition ${
      active ? 'bg-red-600 text-white border-red-600' : 'bg-white text-gray-600 border-gray-200'
    }`

  return (
    <PageShell title="消費紀錄" action={
      <span className="text-sm text-gray-500">{filtered.length} 筆</span>
    }>
      {/* Category filter */}
      {categories.length > 0 && (
        <div className="flex gap-2 overflow-x-auto px-4 pb-2 pt-0 scrollbar-hide">
          <button onClick={() => setFilterCat('all')} className={chipClass(filterCat === 'all')}>全部</button>
          {categories.map(c => (
            <button key={c} onClick={() => setFilterCat(c)} className={chipClass(filterCat === c)}>{c}</button>
          ))}
        </div>
      )}

      {/* Person filter */}
      {people.length > 1 && (
        <div className="flex gap-2 overflow-x-auto px-4 pb-3 scrollbar-hide">
          <button onClick={() => setFilterPerson('all')} className={chipClass(filterPerson === 'all')}>所有人</button>
          {people.map(p => (
            <button key={p} onClick={() => setFilterPerson(p)} className={chipClass(filterPerson === p)}>{p}</button>
          ))}
        </div>
      )}

      {loading ? (
        <div className="flex h-40 items-center justify-center text-sm text-gray-400">載入中...</div>
      ) : error ? (
        <div className="flex flex-col items-center py-20 text-center">
          <p className="text-3xl">⚠️</p>
          <p className="mt-3 text-sm text-gray-500">{error}</p>
          <button onClick={refresh}
            className="mt-3 rounded-xl bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 transition">
            重試
          </button>
        </div>
      ) : grouped.size === 0 ? (
        <div className="flex flex-col items-center py-20 text-center">
          <p className="text-4xl">🧾</p>
          <p className="mt-3 text-gray-500">尚無消費紀錄</p>
        </div>
      ) : (
        <div className="space-y-4 px-4 pb-4">
          {Array.from(grouped.entries()).map(([date, dayExp]) => (
            <section key={date}>
              <div className="mb-2 flex items-center justify-between">
                <p className="text-xs font-semibold text-gray-500">{formatDate(date)}</p>
                <p className="text-xs font-semibold text-gray-700">{formatJPY(sumJPY(dayExp))}</p>
              </div>
              <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-gray-100 divide-y divide-gray-50">
                {dayExp.map(e => (
                  <div key={e.id} className="px-4 py-3">
                    <div className="flex items-start gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 truncate">{e.storeName}</p>
                        {e.storeNameJa && <p className="text-xs text-gray-400 truncate">{e.storeNameJa}</p>}
                        <div className="mt-1 flex flex-wrap items-center gap-2">
                          <CategoryBadge category={e.category} />
                          <span className="text-xs text-gray-400">{e.paymentMethod} · {e.paidBy}</span>
                        </div>
                        {e.notes && <p className="mt-1 text-xs text-gray-500">{e.notes}</p>}
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="font-bold text-gray-900">{formatJPY(e.amountJPY)}</p>
                        <p className="text-xs text-gray-400">{formatTWD(e.amountJPY, settings.exchangeRateJPYtoTWD)}</p>
                      </div>
                    </div>
                    <div className="mt-2 flex gap-2">
                      <button onClick={() => setEditing(e)}
                        className="rounded-lg border border-gray-200 px-3 py-1 text-xs font-medium text-gray-600 hover:bg-gray-50 transition">
                        編輯
                      </button>
                      <button onClick={() => handleDelete(e.id)}
                        className="rounded-lg border border-red-100 px-3 py-1 text-xs font-medium text-red-600 hover:bg-red-50 transition">
                        刪除
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </PageShell>
  )
}
