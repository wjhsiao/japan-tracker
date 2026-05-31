'use client'

import PageShell from '../components/layout/PageShell'
import PieChart, { COLORS } from '../components/ui/PieChart'
import { CATEGORIES } from '@/lib/types'
import { useExpenses } from '@/lib/useExpenses'
import { loadSettings } from '@/lib/settings'
import { formatJPY, formatTWD, sumJPY, groupByDate } from '@/lib/utils'

export default function StatsPage() {
  const { expenses, loading, error, refresh } = useExpenses()
  const settings = loadSettings()

  const total = sumJPY(expenses)

  const categorySlices = CATEGORIES.map((cat, i) => {
    const catExpenses = expenses.filter(e => e.category === cat.value)
    return {
      label: cat.value,
      emoji: cat.emoji,
      value: sumJPY(catExpenses),
      color: COLORS[i % COLORS.length],
    }
  }).filter(s => s.value > 0)

  const grouped = groupByDate(expenses)
  const dailyTotals = Array.from(grouped.entries())
    .map(([date, exps]) => ({ date, total: sumJPY(exps) }))
    .sort((a, b) => a.date.localeCompare(b.date))

  const maxDaily = Math.max(...dailyTotals.map(d => d.total), 1)

  const personTotals = settings.people.map(name => ({
    name,
    total: sumJPY(expenses.filter(e => e.paidBy === name)),
  }))

  return (
    <PageShell title="消費統計">
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
      ) : expenses.length === 0 ? (
        <div className="flex flex-col items-center py-20">
          <p className="text-4xl">📊</p>
          <p className="mt-3 text-gray-500">尚無統計資料</p>
        </div>
      ) : (
        <div className="space-y-4 px-4">
          {/* Summary */}
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-gray-100">
              <p className="text-xs text-gray-500">總消費</p>
              <p className="mt-0.5 text-xl font-bold text-gray-900">{formatJPY(total)}</p>
              <p className="text-xs text-gray-400">{formatTWD(total, settings.exchangeRateJPYtoTWD)}</p>
            </div>
            <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-gray-100">
              <p className="text-xs text-gray-500">消費筆數</p>
              <p className="mt-0.5 text-xl font-bold text-gray-900">{expenses.length} 筆</p>
              <p className="text-xs text-gray-400">共 {dailyTotals.length} 天</p>
            </div>
          </div>

          {/* Pie chart */}
          <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-gray-100">
            <h2 className="mb-4 text-sm font-semibold text-gray-700">類別分布</h2>
            <PieChart slices={categorySlices} />
            <div className="mt-4 space-y-1.5">
              {categorySlices.map((s, i) => (
                <div key={s.label} className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">{s.emoji} {s.label}</span>
                  <div className="text-right">
                    <span className="font-semibold text-gray-800">{formatJPY(s.value)}</span>
                    <span className="ml-2 text-xs text-gray-400">{((s.value / total) * 100).toFixed(0)}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Daily trend */}
          {dailyTotals.length > 0 && (
            <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-gray-100">
              <h2 className="mb-4 text-sm font-semibold text-gray-700">每日趨勢</h2>
              <div className="flex items-end gap-2 h-28">
                {dailyTotals.map(({ date, total: dt }) => {
                  const heightPct = (dt / maxDaily) * 100
                  const label = new Date(date + 'T00:00:00').toLocaleDateString('zh-TW', { month: 'numeric', day: 'numeric' })
                  return (
                    <div key={date} className="flex flex-1 flex-col items-center gap-1">
                      <p className="text-xs text-gray-600 font-medium" style={{ fontSize: '10px' }}>{formatJPY(dt).replace('¥', '')}</p>
                      <div className="w-full rounded-t-md bg-red-400" style={{ height: `${Math.max(heightPct, 4)}%` }} />
                      <p className="text-center text-gray-400" style={{ fontSize: '9px' }}>{label}</p>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Per person */}
          {personTotals.length > 0 && (
            <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-gray-100">
              <h2 className="mb-4 text-sm font-semibold text-gray-700">個人消費</h2>
              {personTotals.map(({ name, total: pt }) => (
                <div key={name} className="mb-4 last:mb-0">
                  <div className="flex justify-between text-sm mb-1">
                    <span className="font-medium text-gray-700">{name}</span>
                    <span className="font-semibold text-gray-900">{formatJPY(pt)}</span>
                  </div>
                  <div className="h-2.5 w-full rounded-full bg-gray-100 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-red-400 transition-all duration-500"
                      style={{ width: total > 0 ? `${(pt / total) * 100}%` : '0%' }}
                    />
                  </div>
                  <p className="mt-1 text-xs text-gray-400">
                    {formatTWD(pt, settings.exchangeRateJPYtoTWD)}
                    　{total > 0 ? ((pt / total) * 100).toFixed(0) : 0}%
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </PageShell>
  )
}
