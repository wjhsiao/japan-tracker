'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import PageShell from './components/layout/PageShell'
import CategoryBadge from './components/expenses/CategoryBadge'
import { Settings } from '@/lib/types'
import { loadSettings } from '@/lib/settings'
import { useExpenses } from '@/lib/useExpenses'
import { formatJPY, formatTWD, formatDate, sumJPY, today, daysBetween } from '@/lib/utils'

export default function Dashboard() {
  const { expenses, loading, error, refresh } = useExpenses()
  const [settings, setSettings] = useState<Settings | null>(null)

  useEffect(() => {
    setSettings(loadSettings())
  }, [])

  if (!settings) return null

  const todayStr = today()
  const todayExpenses = expenses.filter(e => e.date === todayStr)
  const todayTotal = sumJPY(todayExpenses)
  const tripTotal = sumJPY(expenses)
  const remaining = settings.budgetJPY - tripTotal
  const pct = Math.min((tripTotal / settings.budgetJPY) * 100, 100)
  const overBudget = remaining < 0

  const elapsed = Math.max(0, daysBetween(settings.startDate, todayStr)) + 1
  const daysLeft = Math.max(0, settings.tripDays - elapsed)
  const dailyAvg = elapsed > 0 ? tripTotal / elapsed : 0
  const dailyBudget = daysLeft > 0 ? remaining / daysLeft : 0

  const recent = [...expenses]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 5)

  return (
    <PageShell
      title="🗾 Japan Tracker"
      action={
        <Link href="/settings" className="rounded-full p-2 text-gray-400 hover:bg-gray-100">
          <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M7.84 1.804A1 1 0 018.82 1h2.36a1 1 0 01.98.804l.331 1.652a6.993 6.993 0 011.929 1.115l1.598-.54a1 1 0 011.186.447l1.18 2.044a1 1 0 01-.205 1.251l-1.267 1.113a7.047 7.047 0 010 2.228l1.267 1.113a1 1 0 01.206 1.25l-1.18 2.045a1 1 0 01-1.187.447l-1.598-.54a6.993 6.993 0 01-1.929 1.115l-.33 1.652a1 1 0 01-.98.804H8.82a1 1 0 01-.98-.804l-.331-1.652a6.993 6.993 0 01-1.929-1.115l-1.598.54a1 1 0 01-1.186-.447l-1.18-2.044a1 1 0 01.205-1.251l1.267-1.114a7.05 7.05 0 010-2.227L1.821 7.773a1 1 0 01-.206-1.25l1.18-2.045a1 1 0 011.187-.447l1.598.54A6.993 6.993 0 017.51 3.456l.33-1.652zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
          </svg>
        </Link>
      }
    >
      <div className="space-y-4 px-4">
        {/* Today */}
        <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-gray-100">
          <p className="text-sm font-medium text-gray-500">今日花費</p>
          <p className="mt-1 text-4xl font-bold text-gray-900">{formatJPY(todayTotal)}</p>
          <p className="mt-0.5 text-sm text-gray-400">{formatTWD(todayTotal, settings.exchangeRateJPYtoTWD)}</p>
          <p className="mt-2 text-xs text-gray-400">{todayExpenses.length} 筆消費 · {formatDate(todayStr)}</p>
        </div>

        {/* Budget progress */}
        <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-gray-100">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">旅遊總花費</p>
              <p className="mt-0.5 text-2xl font-bold text-gray-900">{formatJPY(tripTotal)}</p>
              <p className="text-xs text-gray-400">{formatTWD(tripTotal, settings.exchangeRateJPYtoTWD)}</p>
            </div>
            <div className="text-right">
              <p className="text-sm font-medium text-gray-500">預算</p>
              <p className="text-lg font-semibold text-gray-700">{formatJPY(settings.budgetJPY)}</p>
            </div>
          </div>
          <div className="mt-3">
            <div className="mb-1 flex justify-between text-xs text-gray-500">
              <span>{pct.toFixed(0)}% 已使用</span>
              <span>
                {overBudget ? `超支 ${formatJPY(Math.abs(remaining))}` : `剩餘 ${formatJPY(remaining)}`}
              </span>
            </div>
            <div className="h-2.5 w-full overflow-hidden rounded-full bg-gray-100">
              <div
                className="h-full rounded-full bg-gray-800 transition-all"
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        </div>

        {/* Trip stats */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: '旅遊天數', value: `第 ${elapsed} 天`, sub: `剩 ${daysLeft} 天` },
            { label: '日均消費', value: formatJPY(dailyAvg), sub: formatTWD(dailyAvg, settings.exchangeRateJPYtoTWD) },
            { label: '每日預算', value: daysLeft > 0 ? formatJPY(dailyBudget) : '-', sub: daysLeft > 0 ? formatTWD(dailyBudget, settings.exchangeRateJPYtoTWD) : '' },
          ].map(({ label, value, sub }) => (
            <div key={label} className="rounded-2xl bg-white p-3 text-center shadow-sm ring-1 ring-gray-100">
              <p className="text-xs text-gray-500">{label}</p>
              <p className="mt-1 text-sm font-bold text-gray-900 leading-tight">{value}</p>
              <p className="text-xs text-gray-400">{sub}</p>
            </div>
          ))}
        </div>

        {/* Quick actions */}
        <div className="grid grid-cols-2 gap-3">
          <Link href="/scan"
            className="flex items-center gap-3 rounded-2xl bg-red-600 p-4 text-white shadow-sm hover:bg-red-700 transition active:scale-95">
            <span className="text-2xl">📷</span>
            <div>
              <p className="font-semibold">掃描收據</p>
              <p className="text-xs text-red-200">用 AI 辨識</p>
            </div>
          </Link>
          <Link href="/add"
            className="flex items-center gap-3 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-gray-100 hover:bg-gray-50 transition active:scale-95">
            <span className="text-2xl">✏️</span>
            <div>
              <p className="font-semibold text-gray-900">手動新增</p>
              <p className="text-xs text-gray-400">快速記帳</p>
            </div>
          </Link>
        </div>

        {/* Recent */}
        {loading ? (
          <div className="text-center text-sm text-gray-400 py-4">載入中...</div>
        ) : error ? (
          <div className="rounded-2xl bg-white py-8 text-center shadow-sm ring-1 ring-gray-100">
            <p className="text-2xl">⚠️</p>
            <p className="mt-2 text-sm text-gray-500">{error}</p>
            <button onClick={refresh}
              className="mt-3 rounded-xl bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 transition">
              重試
            </button>
          </div>
        ) : recent.length > 0 ? (
          <div>
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-gray-700">最近消費</h2>
              <Link href="/history" className="text-xs text-red-600 font-medium">查看全部</Link>
            </div>
            <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-gray-100 divide-y divide-gray-50">
              {recent.map(e => (
                <div key={e.id} className="flex items-center gap-3 px-4 py-3">
                  <div className="flex-1 min-w-0">
                    <p className="truncate text-sm font-medium text-gray-800">{e.storeName}</p>
                    <div className="mt-0.5 flex items-center gap-2">
                      <CategoryBadge category={e.category} />
                      <span className="text-xs text-gray-400">{e.paidBy}</span>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-semibold text-gray-900">{formatJPY(e.amountJPY)}</p>
                    <p className="text-xs text-gray-400">{formatDate(e.date)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="rounded-2xl bg-white py-10 text-center shadow-sm ring-1 ring-gray-100">
            <p className="text-3xl">🧾</p>
            <p className="mt-2 text-sm text-gray-500">還沒有消費紀錄</p>
            <p className="text-xs text-gray-400 mt-1">點擊掃描或手動新增</p>
          </div>
        )}
      </div>
    </PageShell>
  )
}
