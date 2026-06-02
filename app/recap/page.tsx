'use client'

import { useMemo, useRef, useState } from 'react'
import PageShell from '../components/layout/PageShell'
import RecapCard from '../components/share/RecapCard'
import { useExpenses } from '@/lib/useExpenses'
import { loadSettings, getActiveTrip, tripEndDate } from '@/lib/settings'
import { buildTripRecap } from '@/lib/shareData'
import { exportCard } from '@/lib/shareExport'
import { compressImage, prettyRange } from '@/lib/utils'

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
