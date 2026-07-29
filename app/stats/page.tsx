'use client'

import PageShell from '../components/layout/PageShell'
import PieChart, { COLORS } from '../components/ui/PieChart'
import { CATEGORIES, PAYMENT_METHODS } from '@/lib/types'
import { useExpenses } from '@/lib/useExpenses'
import { loadSettings, getActiveTrip, expensesInTrip, tripEndDate } from '@/lib/settings'
import { formatJPY, formatTWD, sumJPY, groupByDate, prettyRange } from '@/lib/utils'
import { buildTripRecap } from '@/lib/shareData'

export default function StatsPage() {
  const { expenses: allExpenses, loading, error, refresh } = useExpenses()
  const settings = loadSettings()
  const trip = getActiveTrip(settings)
  const expenses = expensesInTrip(allExpenses, trip)
  const recap = buildTripRecap(expenses, trip, settings)
  const period = trip.startDate ? prettyRange(trip.startDate, tripEndDate(trip)) : ''

  const storeFreq = new Map<string, number>()
  for (const e of expenses) {
    if (e.storeName) storeFreq.set(e.storeName, (storeFreq.get(e.storeName) ?? 0) + 1)
  }
  let topStore = ''
  let topStoreCount = 0
  for (const [name, count] of storeFreq) {
    if (count > topStoreCount) { topStore = name; topStoreCount = count }
  }

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

  // Bar fill color per payment method (solid, for the breakdown bars)
  const PAY_BAR: Record<string, string> = {
    現金: 'bg-green-500', 信用卡: 'bg-blue-500', PayPay: 'bg-red-500',
    Suica: 'bg-cyan-500', 其他: 'bg-gray-400',
  }
  const paymentTotals = PAYMENT_METHODS
    .map(m => ({ method: m, total: sumJPY(expenses.filter(e => e.paymentMethod === m)) }))
    .filter(p => p.total > 0)

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
          {/* Trip summary */}
          <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-gray-100 border-l-4 border-red-500">
            <p className="text-xs text-gray-400 mb-1 truncate">
              {trip.name}{period ? ` · ${period}` : ''}
            </p>
            <p className="text-3xl font-bold text-gray-900">{formatJPY(total)}</p>
            <p className="text-sm text-gray-400 mb-4">{formatTWD(total, settings.exchangeRateJPYtoTWD)}</p>
            <div className="grid grid-cols-3 gap-2 mb-3">
              {[
                { label: '天數', value: `${recap.days} 天` },
                { label: '筆數', value: `${recap.count} 筆` },
                { label: '日均', value: formatJPY(Math.round(recap.dailyAvg)) },
              ].map(({ label, value }) => (
                <div key={label} className="rounded-xl bg-gray-50 p-3 text-center">
                  <p className="text-xs text-gray-400">{label}</p>
                  <p className="mt-1 text-xs font-bold text-gray-800">{value}</p>
                </div>
              ))}
            </div>
            {(recap.topCategory || topStore) && (
              <div className="grid grid-cols-2 gap-2">
                {recap.topCategory && (
                  <div className="rounded-xl bg-gray-50 p-3">
                    <p className="text-xs text-gray-400">最多消費</p>
                    <p className="mt-1 text-xs font-semibold text-gray-800 truncate">
                      {recap.topCategory.emoji} {recap.topCategory.name}
                    </p>
                    <p className="text-xs text-gray-400">{recap.topCategory.pct}%</p>
                  </div>
                )}
                {topStore && (
                  <div className="rounded-xl bg-gray-50 p-3">
                    <p className="text-xs text-gray-400">最常光顧</p>
                    <p className="mt-1 text-xs font-semibold text-gray-800 truncate">{topStore}</p>
                  </div>
                )}
              </div>
            )}
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

          {/* Per payment method */}
          {paymentTotals.length > 0 && (
            <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-gray-100">
              <h2 className="mb-4 text-sm font-semibold text-gray-700">付款方式</h2>
              {paymentTotals.map(({ method, total: mt }) => (
                <div key={method} className="mb-4 last:mb-0">
                  <div className="flex justify-between text-sm mb-1">
                    <span className="font-medium text-gray-700">{method}</span>
                    <span className="font-semibold text-gray-900">{formatJPY(mt)}</span>
                  </div>
                  <div className="h-2.5 w-full rounded-full bg-gray-100 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${PAY_BAR[method] ?? 'bg-gray-400'}`}
                      style={{ width: total > 0 ? `${(mt / total) * 100}%` : '0%' }}
                    />
                  </div>
                  <p className="mt-1 text-xs text-gray-400">
                    {formatTWD(mt, settings.exchangeRateJPYtoTWD)}
                    　{total > 0 ? ((mt / total) * 100).toFixed(0) : 0}%
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
