'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import PageShell from '../components/layout/PageShell'
import CategoryBadge from '../components/expenses/CategoryBadge'
import ExpenseForm from '../components/expenses/ExpenseForm'
import { Expense, Category } from '@/lib/types'
import { deleteExpense, updateExpense } from '@/lib/gas'
import { useExpenses, invalidateExpensesCache } from '@/lib/useExpenses'
import { loadSettings, getActiveTrip, expensesInTrip } from '@/lib/settings'
import { formatJPY, formatTWD, formatDate, groupByDate, sumJPY } from '@/lib/utils'
import { getPhotoIds, deletePhoto, getPhotosByIds } from '@/lib/photoStore'
import { exportZip } from '@/lib/exportZip'

export default function HistoryPage() {
  const { expenses, loading, error, refresh, setExpenses } = useExpenses()
  const [editing, setEditing] = useState<Expense | null>(null)
  const [filterCat, setFilterCat] = useState<Category | 'all'>('all')
  const [filterPerson, setFilterPerson] = useState<string | 'all'>('all')
  const [photoIds, setPhotoIds] = useState<Set<string>>(new Set())
  const [exporting, setExporting] = useState(false)
  const settings = loadSettings()
  const trip = getActiveTrip(settings)

  useEffect(() => {
    getPhotoIds().then(ids => setPhotoIds(new Set(ids))).catch(() => {})
  }, [])

  async function handleDelete(id: string) {
    if (!confirm('確定刪除這筆消費？')) return
    try {
      await deleteExpense(id)
      try { await deletePhoto(id) } catch {}
    } catch (err) {
      alert('刪除失敗，資料未變更：' + String(err))
    } finally {
      // Reconcile with the real backend state either way, so the list always
      // reflects what's actually in the sheet (no silent optimistic removal).
      invalidateExpensesCache()
      await refresh()
      getPhotoIds().then(ids => setPhotoIds(new Set(ids))).catch(() => {})
    }
  }

  async function handleExport() {
    setExporting(true)
    try {
      // Export exactly what's on screen (respects the active filters), and
      // limit photo access to just those expenses.
      const photos = await getPhotosByIds(filtered.map(e => e.id))
      await exportZip(filtered, settings, photos)
    } catch (err) {
      // User cancelling the native share sheet is not an error.
      if (!(err instanceof Error && err.name === 'AbortError')) {
        alert('匯出失敗：' + String(err))
      }
    } finally {
      setExporting(false)
    }
  }

  async function handleUpdate(expense: Expense) {
    await updateExpense(expense)
    setExpenses(prev => prev.map(e => e.id === expense.id ? expense : e))
    invalidateExpensesCache()
    setEditing(null)
  }

  const tripExpenses = expensesInTrip(expenses, trip)
  const filtered = tripExpenses
    .filter(e => filterCat === 'all' || e.category === filterCat)
    .filter(e => filterPerson === 'all' || e.paidBy === filterPerson)

  const grouped = groupByDate(filtered)
  const categories = Array.from(new Set(tripExpenses.map(e => e.category)))
  const people = Array.from(new Set(tripExpenses.map(e => e.paidBy).filter(Boolean)))

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
      <div className="flex items-center gap-3">
        <span className="text-sm text-gray-500">{filtered.length} 筆</span>
        {tripExpenses.length > 0 && (
          <button onClick={handleExport} disabled={exporting}
            className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600 hover:bg-gray-200 transition disabled:opacity-50">
            {exporting ? '匯出中…' : '📦 匯出'}
          </button>
        )}
      </div>
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
                <div className="flex items-center gap-3">
                  <p className="text-xs font-semibold text-gray-700">{formatJPY(sumJPY(dayExp))}</p>
                  <Link href={`/share?date=${date}`}
                    className="text-xs font-medium text-red-600 hover:text-red-700">
                    📤 分享
                  </Link>
                </div>
              </div>
              <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-gray-100 divide-y divide-gray-50">
                {dayExp.map(e => (
                  <div key={e.id} className="px-4 py-3">
                    <div className="flex items-start gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="font-medium text-gray-900 truncate">{e.storeName}</p>
                          {photoIds.has(e.id) && (
                            <span className="shrink-0 text-xs text-gray-400" title="已儲存收據照片">📷</span>
                          )}
                        </div>
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
