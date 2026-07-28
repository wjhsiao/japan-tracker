'use client'

import { useMemo, useRef, useState } from 'react'
import PageShell from '../components/layout/PageShell'
import RecapCard from '../components/share/RecapCard'
import { useExpenses } from '@/lib/useExpenses'
import { loadSettings, getActiveTrip, tripEndDate } from '@/lib/settings'
import { buildTripRecap } from '@/lib/shareData'
import { exportCard } from '@/lib/shareExport'
import { compressImage, prettyRange, formatDate } from '@/lib/utils'

export default function RecapPage() {
  const { expenses, loading } = useExpenses()
  const settings = loadSettings()
  const trip = getActiveTrip(settings)
  const cardRef = useRef<HTMLDivElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const [photoUrl, setPhotoUrl] = useState('')
  const [exporting, setExporting] = useState(false)

  const recap = useMemo(() => buildTripRecap(expenses, trip, settings), [expenses, trip, settings])
  const period = prettyRange(trip.startDate, tripEndDate(trip))

  async function pickPhoto(file: File) {
    try {
      const { base64, mimeType } = await compressImage(file, 1280, 0.85)
      setPhotoUrl(`data:${mimeType};base64,${base64}`)
    } catch {
      setPhotoUrl(URL.createObjectURL(file))
    }
  }

  async function handleExport() {
    if (!cardRef.current) return
    setExporting(true)
    try {
      await exportCard(cardRef.current, `japan-recap-${trip.startDate}.png`)
    } catch (err) {
      if (!(err instanceof Error && err.name === 'AbortError')) {
        const msg = err instanceof Error ? `${err.name}: ${err.message}` : String(err)
        alert('輸出失敗：' + msg)
      }
    } finally {
      setExporting(false)
    }
  }

  return (
    <PageShell title="旅程回顧卡">
      <div className="space-y-5 px-4">
        {loading ? (
          <div className="flex h-40 items-center justify-center text-sm text-gray-400">載入中…</div>
        ) : recap.count === 0 ? (
          <div className="flex flex-col items-center py-20 text-center">
            <p className="text-4xl">🧳</p>
            <p className="mt-3 text-gray-500">「{trip.name}」目前還沒有消費</p>
            <p className="mt-1 text-xs text-gray-400">記幾筆帳後再回來做回顧卡</p>
          </div>
        ) : (
          <>
            {/* Detailed stats */}
            <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-gray-100 space-y-5">
              {/* Total */}
              <div>
                <p className="text-xs text-gray-400">{trip.name} · {period}</p>
                <p className="mt-1 text-3xl font-bold text-gray-900">¥{recap.total.toLocaleString()}</p>
                <p className="text-sm text-gray-400">NT${recap.totalTWD.toLocaleString()}</p>
              </div>

              {/* Key metrics */}
              <div className="grid grid-cols-3 gap-2 text-center">
                {[
                  { label: '天數', value: `${recap.days} 天` },
                  { label: '筆數', value: `${recap.count} 筆` },
                  { label: '日均', value: `¥${recap.dailyAvg.toLocaleString()}` },
                ].map(({ label, value }) => (
                  <div key={label} className="rounded-xl bg-gray-50 p-3">
                    <p className="text-xs text-gray-400">{label}</p>
                    <p className="mt-1 text-sm font-bold text-gray-900">{value}</p>
                  </div>
                ))}
              </div>

              {/* Per person */}
              {recap.byPerson.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-gray-500 mb-2">💳 各人花費</p>
                  <div className="space-y-2.5">
                    {recap.byPerson.map(p => (
                      <div key={p.name} className="flex items-center gap-3">
                        <p className="w-16 shrink-0 text-sm font-medium text-gray-700 truncate">{p.name}</p>
                        <div className="flex-1 h-2 rounded-full bg-gray-100 overflow-hidden">
                          <div className="h-full rounded-full bg-red-400 transition-all" style={{ width: `${p.pct}%` }} />
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-sm font-semibold text-gray-800">¥{p.amount.toLocaleString()}</p>
                          <p className="text-xs text-gray-400">NT${p.amountTWD.toLocaleString()}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Category breakdown */}
              {recap.categoryBars.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-gray-500 mb-2">📊 消費類別</p>
                  <div className="space-y-2">
                    {recap.categoryBars.map(c => (
                      <div key={c.label} className="flex items-center gap-3">
                        <p className="w-20 shrink-0 text-xs text-gray-600 truncate">{c.emoji} {c.label}</p>
                        <div className="flex-1 h-2 rounded-full bg-gray-100 overflow-hidden">
                          <div className={`h-full rounded-full ${c.colorClass} transition-all`} style={{ width: `${c.pct}%` }} />
                        </div>
                        <p className="text-xs text-gray-500 shrink-0 w-8 text-right">{c.pct}%</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Highlights */}
              <div className="grid grid-cols-2 gap-3">
                {recap.biggestDay && (
                  <div className="rounded-xl bg-orange-50 p-3">
                    <p className="text-xs font-medium text-orange-600">🔥 最貴一天</p>
                    <p className="mt-1 text-sm font-bold text-gray-800">{formatDate(recap.biggestDay.date)}</p>
                    <p className="text-xs text-gray-500">¥{recap.biggestDay.amount.toLocaleString()}</p>
                  </div>
                )}
                {recap.biggestItem && (
                  <div className="rounded-xl bg-purple-50 p-3">
                    <p className="text-xs font-medium text-purple-600">💸 最大單筆</p>
                    <p className="mt-1 text-sm font-bold text-gray-800 truncate">{recap.biggestItem.name}</p>
                    <p className="text-xs text-gray-500">¥{recap.biggestItem.amount.toLocaleString()}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Share card */}
            <p className="text-xs font-semibold text-gray-400 px-1">📤 分享卡片</p>
            <RecapCard ref={cardRef} recap={recap} period={period} photoUrl={photoUrl} />

            <input ref={fileRef} type="file" accept="image/*" className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) pickPhoto(f) }} />
            <button onClick={() => fileRef.current?.click()}
              className="w-full rounded-2xl border-2 border-red-600 py-3 font-semibold text-red-600 hover:bg-red-50 transition active:scale-95">
              {photoUrl ? '🔄 更換底圖' : '🖼 加底圖（選填）'}
            </button>
            {photoUrl && (
              <button onClick={() => setPhotoUrl('')}
                className="w-full rounded-xl py-2 text-sm font-medium text-gray-400 hover:text-gray-600 transition">
                移除底圖
              </button>
            )}

            <button onClick={handleExport} disabled={exporting}
              className="w-full rounded-2xl bg-red-600 py-3.5 font-semibold text-white shadow-sm transition hover:bg-red-700 disabled:opacity-50 active:scale-95">
              {exporting ? '產生中…' : '📤 輸出 / 分享'}
            </button>
            <div className="h-2" />
          </>
        )}
      </div>
    </PageShell>
  )
}
