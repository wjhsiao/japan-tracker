'use client'

import { useState, useEffect } from 'react'
import PageShell from '../components/layout/PageShell'
import ExpenseForm from '../components/expenses/ExpenseForm'
import { Expense, Category, CATEGORIES } from '@/lib/types'
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
  const [filterPayment, setFilterPayment] = useState<string | 'all'>('all')
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState(false)
  const [showFilter, setShowFilter] = useState(false)
  const [photoIds, setPhotoIds] = useState<Set<string>>(new Set())
  const [exporting, setExporting] = useState(false)
  const [searchText, setSearchText] = useState('')
  const settings = loadSettings()
  const trip = getActiveTrip(settings)

  useEffect(() => {
    getPhotoIds().then(ids => setPhotoIds(new Set(ids))).catch(() => {})
  }, [])

  useEffect(() => {
    const cat = new URLSearchParams(window.location.search).get('cat') as Category | null
    if (cat) setFilterCat(cat)
  }, [])

  async function handleDeleteFromSheet() {
    if (!selectedExpense) return
    const id = selectedExpense.id
    setSelectedExpense(null)
    setDeleteConfirm(false)
    try {
      await deleteExpense(id)
      try { await deletePhoto(id) } catch {}
    } catch (err) {
      alert('刪除失敗，資料未變更：' + String(err))
    } finally {
      invalidateExpensesCache()
      await refresh()
      getPhotoIds().then(ids => setPhotoIds(new Set(ids))).catch(() => {})
    }
  }

  async function handleExport() {
    setExporting(true)
    try {
      const photos = await getPhotosByIds(filtered.map(e => e.id))
      await exportZip(filtered, settings, photos)
    } catch (err) {
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
    setSelectedExpense(null)
  }

  const tripExpenses = expensesInTrip(expenses, trip)
  const filtered = tripExpenses
    .filter(e => filterCat === 'all' || e.category === filterCat)
    .filter(e => filterPerson === 'all' || e.paidBy === filterPerson)
    .filter(e => filterPayment === 'all' || e.paymentMethod === filterPayment)
    .filter(e => !searchText || e.storeName.toLowerCase().includes(searchText.toLowerCase()))

  const grouped = groupByDate(filtered)
  const categories = Array.from(new Set(tripExpenses.map(e => e.category)))
  const people = Array.from(new Set(tripExpenses.map(e => e.paidBy).filter(Boolean)))
  const paymentMethods = Array.from(new Set(tripExpenses.map(e => e.paymentMethod).filter(Boolean)))
  const hasFilter = filterCat !== 'all' || filterPerson !== 'all' || filterPayment !== 'all' || !!searchText

  const chipCls = (active: boolean) =>
    `rounded-full px-3 py-1.5 text-xs font-medium border transition ${
      active ? 'bg-red-600 text-white border-red-600' : 'bg-white text-gray-600 border-gray-200'
    }`

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

  return (
    <PageShell title="消費紀錄" action={
      <div className="flex items-center gap-2">
        <button
          onClick={() => setShowFilter(true)}
          className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
            hasFilter ? 'bg-red-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          篩選{hasFilter ? ' ●' : ''}
        </button>
        {tripExpenses.length > 0 && (
          <button onClick={handleExport} disabled={exporting}
            className="rounded-full bg-gray-100 p-1.5 text-gray-600 hover:bg-gray-200 transition disabled:opacity-50"
            title="匯出">
            {exporting ? (
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-gray-600" />
            ) : (
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 0 0 3 3h10a3 3 0 0 0 3-3v-1m-8-5 4 4 4-4m-4 4V4" />
              </svg>
            )}
          </button>
        )}
      </div>
    }>
      {/* Search bar */}
      <div className="px-4 pb-3">
        <div className="relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <circle cx="11" cy="11" r="8" /><path strokeLinecap="round" d="m21 21-4.35-4.35" />
          </svg>
          <input
            type="text"
            value={searchText}
            onChange={e => setSearchText(e.target.value)}
            placeholder="搜尋店名…"
            className="w-full rounded-xl bg-gray-100 py-2.5 pl-9 pr-9 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-400 focus:bg-white transition"
          />
          {searchText && (
            <button onClick={() => setSearchText('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" d="M6 18 18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>

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
          <p className="mt-3 text-gray-500">{hasFilter ? '此篩選條件無資料' : '尚無消費紀錄'}</p>
          {hasFilter && (
            <button
              onClick={() => { setFilterCat('all'); setFilterPerson('all'); setFilterPayment('all'); setSearchText('') }}
              className="mt-3 text-sm font-medium text-red-600 hover:text-red-700"
            >
              清除篩選
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-4 px-4 pb-4">
          {Array.from(grouped.entries()).map(([date, dayExp]) => (
            <section key={date}>
              <div className="mb-1 flex items-center justify-between px-1">
                <p className="text-xs font-semibold text-gray-500">{formatDate(date)}</p>
                <p className="text-xs font-semibold text-gray-700">{formatJPY(sumJPY(dayExp))}</p>
              </div>
              <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-gray-100 divide-y divide-gray-50">
                {dayExp.map(e => {
                  const catObj = CATEGORIES.find(c => c.value === e.category)
                  return (
                    <button
                      key={e.id}
                      onClick={() => { setSelectedExpense(e); setDeleteConfirm(false) }}
                      className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 active:bg-gray-100 transition"
                    >
                      <span className="text-xl flex-shrink-0">{catObj?.emoji ?? '💴'}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{e.storeName}</p>
                        <p className="text-xs text-gray-400 truncate">
                          {e.paymentMethod}{e.paidBy ? ` · ${e.paidBy}` : ''}{photoIds.has(e.id) ? ' · 📷' : ''}
                        </p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-sm font-semibold text-gray-900">{formatJPY(e.amountJPY)}</p>
                        <p className="text-xs text-gray-400">{formatTWD(e.amountJPY, settings.exchangeRateJPYtoTWD)}</p>
                      </div>
                      <svg className="h-4 w-4 text-gray-200 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="m9 18 6-6-6-6" />
                      </svg>
                    </button>
                  )
                })}
              </div>
            </section>
          ))}
        </div>
      )}

      {/* ── Detail bottom sheet ── */}
      {selectedExpense && (
        <div
          className="fixed inset-0 z-[60] flex items-end justify-center"
          onClick={() => { setSelectedExpense(null); setDeleteConfirm(false) }}
        >
          <div className="absolute inset-0 bg-black/40" />
          <div
            className="relative w-full max-w-lg bg-white rounded-t-2xl pb-[env(safe-area-inset-bottom)]"
            onClick={e => e.stopPropagation()}
          >
            <div className="mx-auto mt-2.5 h-1 w-9 rounded-full bg-gray-200 mb-4" />
            <div className="px-5 pb-5">
              <div className="flex items-start justify-between mb-0.5">
                <p className="text-lg font-semibold text-gray-900 leading-tight flex-1 min-w-0">{selectedExpense.storeName}</p>
                {photoIds.has(selectedExpense.id) && (
                  <span className="text-gray-400 text-sm ml-2 mt-0.5 flex-shrink-0">📷</span>
                )}
              </div>
              {selectedExpense.storeNameJa && (
                <p className="text-sm text-gray-400 mb-3">{selectedExpense.storeNameJa}</p>
              )}

              <div className="flex items-baseline gap-2 mb-4">
                <p className="text-2xl font-bold text-gray-900">{formatJPY(selectedExpense.amountJPY)}</p>
                <p className="text-sm text-gray-400">{formatTWD(selectedExpense.amountJPY, settings.exchangeRateJPYtoTWD)}</p>
              </div>

              <div className="space-y-1.5 mb-4 bg-gray-50 rounded-xl px-4 py-3">
                {(() => {
                  const catObj = CATEGORIES.find(c => c.value === selectedExpense.category)
                  return (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">類別</span>
                      <span className="font-medium text-gray-800">{catObj?.emoji} {selectedExpense.category}</span>
                    </div>
                  )
                })()}
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">日期</span>
                  <span className="font-medium text-gray-800">{formatDate(selectedExpense.date)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">付款方式</span>
                  <span className="font-medium text-gray-800">{selectedExpense.paymentMethod}</span>
                </div>
                {selectedExpense.paidBy && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">付款人</span>
                    <span className="font-medium text-gray-800">{selectedExpense.paidBy}</span>
                  </div>
                )}
                {selectedExpense.items.length > 0 && (
                  <div className="flex justify-between text-sm gap-2">
                    <span className="text-gray-500 flex-shrink-0">品項</span>
                    <span className="font-medium text-gray-800 text-right">
                      {selectedExpense.items.slice(0, 3).map(i => i.nameTw || i.nameJa).filter(Boolean).join('、')}
                      {selectedExpense.items.length > 3 ? `… 等 ${selectedExpense.items.length} 項` : ''}
                    </span>
                  </div>
                )}
                {selectedExpense.notes && (
                  <div className="flex justify-between text-sm gap-2">
                    <span className="text-gray-500 flex-shrink-0">備註</span>
                    <span className="font-medium text-gray-800 text-right">{selectedExpense.notes}</span>
                  </div>
                )}
              </div>

              {!deleteConfirm ? (
                <div className="flex gap-3">
                  <button
                    onClick={() => setEditing(selectedExpense)}
                    className="flex-1 rounded-xl border-2 border-red-600 py-3 text-sm font-semibold text-red-600 hover:bg-red-50 transition active:scale-95"
                  >
                    編輯
                  </button>
                  <button
                    onClick={() => setDeleteConfirm(true)}
                    className="rounded-xl border border-gray-200 px-4 py-3 text-sm font-medium text-gray-400 hover:text-red-500 hover:border-red-200 transition"
                  >
                    🗑
                  </button>
                </div>
              ) : (
                <div className="flex gap-3">
                  <button
                    onClick={() => setDeleteConfirm(false)}
                    className="flex-1 rounded-xl border border-gray-200 py-3 text-sm font-medium text-gray-500 hover:bg-gray-50 transition"
                  >
                    取消
                  </button>
                  <button
                    onClick={handleDeleteFromSheet}
                    className="flex-1 rounded-xl bg-red-100 py-3 text-sm font-semibold text-red-600 hover:bg-red-200 transition active:scale-95"
                  >
                    確認刪除
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Filter panel ── */}
      {showFilter && (
        <div
          className="fixed inset-0 z-[60] flex items-end justify-center"
          onClick={() => setShowFilter(false)}
        >
          <div className="absolute inset-0 bg-black/40" />
          <div
            className="relative w-full max-w-lg bg-white rounded-t-2xl pb-[env(safe-area-inset-bottom)]"
            onClick={e => e.stopPropagation()}
          >
            <div className="mx-auto mt-2.5 h-1 w-9 rounded-full bg-gray-200 mb-4" />
            <div className="px-5 pb-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2">類別</p>
              <div className="flex flex-wrap gap-2 mb-4">
                <button onClick={() => setFilterCat('all')} className={chipCls(filterCat === 'all')}>全部</button>
                {categories.map(c => (
                  <button key={c} onClick={() => setFilterCat(c)} className={chipCls(filterCat === c)}>{c}</button>
                ))}
              </div>

              {people.length > 1 && (
                <>
                  <div className="h-px bg-gray-100 mb-4" />
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2">付款人</p>
                  <div className="flex flex-wrap gap-2 mb-4">
                    <button onClick={() => setFilterPerson('all')} className={chipCls(filterPerson === 'all')}>所有人</button>
                    {people.map(p => (
                      <button key={p} onClick={() => setFilterPerson(p)} className={chipCls(filterPerson === p)}>{p}</button>
                    ))}
                  </div>
                </>
              )}

              {paymentMethods.length > 0 && (
                <>
                  <div className="h-px bg-gray-100 mb-4" />
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2">付款方式</p>
                  <div className="flex flex-wrap gap-2 mb-4">
                    <button onClick={() => setFilterPayment('all')} className={chipCls(filterPayment === 'all')}>全部</button>
                    {paymentMethods.map(m => (
                      <button key={m} onClick={() => setFilterPayment(m)} className={chipCls(filterPayment === m)}>{m}</button>
                    ))}
                  </div>
                </>
              )}

              {hasFilter && (
                <button
                  onClick={() => { setFilterCat('all'); setFilterPerson('all'); setFilterPayment('all'); setSearchText('') }}
                  className="w-full mb-3 rounded-xl border border-gray-200 py-3 text-sm font-medium text-gray-500 hover:bg-gray-50 transition"
                >
                  清除所有篩選
                </button>
              )}
              <button
                onClick={() => setShowFilter(false)}
                className="w-full rounded-xl bg-red-600 py-3.5 text-sm font-semibold text-white hover:bg-red-700 transition active:scale-95"
              >
                套用篩選
              </button>
            </div>
          </div>
        </div>
      )}
    </PageShell>
  )
}
