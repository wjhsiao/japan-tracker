'use client'

import { forwardRef } from 'react'
import { TripRecap } from '@/lib/shareData'
import { formatJPY, formatDate } from '@/lib/utils'

interface Props {
  recap: TripRecap
  period: string
  photoUrl?: string
}

const numFont = { fontFamily: 'var(--font-display), ui-sans-serif, sans-serif' }

const RecapCard = forwardRef<HTMLDivElement, Props>(function RecapCard({ recap, period, photoUrl }, ref) {
  return (
    <div
      ref={ref}
      className="relative mx-auto aspect-[9/16] w-full max-w-sm overflow-hidden rounded-2xl text-white"
    >
      {/* Background: optional photo (dimmed) or branded gradient */}
      {photoUrl ? (
        <>
          <img src={photoUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-b from-red-900/80 via-rose-900/85 to-gray-950/90" />
        </>
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-red-600 via-rose-700 to-gray-900" />
      )}

      <div className="relative flex h-full flex-col p-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-medium backdrop-blur-sm">🗾 旅程回顧</span>
          <span className="text-xs opacity-80">{period}</span>
        </div>
        <h1 className="mt-3 text-2xl font-bold leading-tight">{recap.name}</h1>

        {/* Hero total */}
        <div className="mt-5">
          <p className="text-xs uppercase tracking-widest opacity-70">總花費</p>
          <p className="text-5xl font-black leading-none" style={numFont}>{formatJPY(recap.total)}</p>
          <p className="mt-1 text-sm opacity-80" style={numFont}>≈ NT${recap.totalTWD.toLocaleString()}</p>
        </div>

        {/* Quick stats */}
        <div className="mt-5 grid grid-cols-3 gap-2">
          {[
            { label: '天數', value: `${recap.days}`, unit: '天' },
            { label: '筆數', value: `${recap.count}`, unit: '筆' },
            { label: '日均', value: formatJPY(recap.dailyAvg).replace('¥', '¥'), unit: '' },
          ].map(s => (
            <div key={s.label} className="rounded-xl bg-white/10 px-2 py-2.5 text-center backdrop-blur-sm">
              <p className="text-[10px] opacity-70">{s.label}</p>
              <p className="text-base font-bold leading-tight" style={numFont}>{s.value}<span className="text-[10px] font-normal opacity-80">{s.unit}</span></p>
            </div>
          ))}
        </div>

        {/* Superlatives */}
        <div className="mt-4 space-y-2 text-sm">
          {recap.topCategory && (
            <Row icon={recap.topCategory.emoji} label="最愛類別" value={`${recap.topCategory.name} ${recap.topCategory.pct}%`} />
          )}
          {recap.biggestDay && (
            <Row icon="🔥" label="最敗家的一天" value={`${formatDate(recap.biggestDay.date)}　${formatJPY(recap.biggestDay.amount)}`} />
          )}
          {recap.biggestItem && (
            <Row icon="💸" label="最貴一筆" value={`${recap.biggestItem.name}　${formatJPY(recap.biggestItem.amount)}`} />
          )}
        </div>

        {/* Category mini bars */}
        {recap.categoryBars.length > 0 && (
          <div className="mt-4 space-y-1.5">
            <p className="text-[10px] uppercase tracking-widest opacity-70">類別分布</p>
            {recap.categoryBars.map(b => (
              <div key={b.label} className="flex items-center gap-2">
                <span className="w-14 shrink-0 text-xs">{b.emoji} {b.label}</span>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-white/15">
                  <div className={`h-full rounded-full ${b.colorClass}`} style={{ width: `${b.pct}%` }} />
                </div>
                <span className="w-8 shrink-0 text-right text-[10px] opacity-80" style={numFont}>{b.pct}%</span>
              </div>
            ))}
          </div>
        )}

        <div className="mt-auto pt-4 text-center text-[10px] opacity-60">Japan Travel Tracker</div>
      </div>
    </div>
  )
})

export default RecapCard

function Row({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2 rounded-xl bg-white/10 px-3 py-2 backdrop-blur-sm">
      <span className="text-base">{icon}</span>
      <span className="shrink-0 text-xs opacity-70">{label}</span>
      <span className="ml-auto text-right font-semibold">{value}</span>
    </div>
  )
}
