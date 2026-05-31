'use client'

import { useEffect, useState } from 'react'
import PageShell from '../components/layout/PageShell'
import CategoryBadge from '../components/expenses/CategoryBadge'
import ExpenseForm from '../components/expenses/ExpenseForm'
import { Expense, Category } from '@/lib/types'
import { fetchExpenses, deleteExpense, updateExpense } from '@/lib/gas'
import { loadSettings } from '@/lib/settings'
import { formatJPY, formatTWD, formatDate, groupByDate, sumJPY } from '@/lib/utils'

export default function HistoryPage() {
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<Expense | null>(null)
  const [filterCat, setFilterCat] = useState<Category | 'all'>('all')
  const settings = loadSettings()

  useEffect(() => {
    fetchExpenses().then(setExpenses).catch(() => {}).finally(() => setLoading(false))
  }, [])

  async function handleDelete(id: string) {
    if (!confirm('確定刪除這筆消費？')) return
    await deleteExpense(id)
    setExpenses(prev => prev.filter(e => e.id !== id))
  }

  async function handleUpdate(expense: Expense) {
    await updateExpense(expense)
    setExpenses(prev => prev.map(e => e.id === expense.id ? expense : e))
    setEditing(null)
  }

  const filtered = filterCat === 'all' ? expenses : expenses.filter(e => e.category === filterCat)
  const grouped = groupByDate(filtered)
  const categories = Array.from(new Set(expenses.map(e => e.category)))

  if (editing) {
    return (
      <PageShell title="編輯消費">
        <ExpenseForm
          initial={{ ...editing, items: editing.items }}
          receiptBase64={editing.receiptBase64}
          onSave={handleUpdate}
          onCancel={() => setEditing(null)}
          saveLabel="更新"
        />
      </PageShell>
    )
  }

  return (
    <PageShell title="消費紀錄" action={
      <span className="text-sm text-gray-500">{expenses.length} 筆</span>
    }>
      {/* Filter chips */}
      {categories.length > 0 && (
        <div className="flex gap-2 overflow-x-auto px-4 pb-3 pt-0 scrollbar-hide">
          <button
            onClick={() => setFilterCat('all')}
            className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium border transition ${
              filterCat === 'all' ? 'bg-red-600 text-white border-red-600' : 'bg-white text-gray-600 border-gray-200'
            }`}
          >全部</button>
          {categories.map(c => (
            <button key={c}
              onClick={() => setFilterCat(c)}
              className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium border transition ${
                filterCat === c ? 'bg-red-600 text-white border-red-600' : 'bg-white text-gray-600 border-gray-200'
              }`}
            >{c}</button>
          ))}
        </div>
      )}

      {loading ? (
        <div className="flex h-40 items-center justify-center text-sm text-gray-400">載入中...</div>
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
