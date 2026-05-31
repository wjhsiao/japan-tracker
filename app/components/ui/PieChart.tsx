'use client'

interface Slice {
  label: string
  value: number
  color: string
  emoji?: string
}

const COLORS = [
  '#ef4444', '#f97316', '#eab308', '#22c55e',
  '#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899', '#94a3b8',
]

export { COLORS }

export default function PieChart({ slices }: { slices: Slice[] }) {
  const total = slices.reduce((s, sl) => s + sl.value, 0)
  if (total === 0) return <div className="flex h-40 items-center justify-center text-gray-400 text-sm">尚無資料</div>

  let cumAngle = -Math.PI / 2
  const cx = 80
  const cy = 80
  const r = 70

  function arc(value: number) {
    const angle = (value / total) * 2 * Math.PI
    const x1 = cx + r * Math.cos(cumAngle)
    const y1 = cy + r * Math.sin(cumAngle)
    cumAngle += angle
    const x2 = cx + r * Math.cos(cumAngle)
    const y2 = cy + r * Math.sin(cumAngle)
    const large = angle > Math.PI ? 1 : 0
    return `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} Z`
  }

  return (
    <div className="flex items-center gap-4">
      <svg width={160} height={160} viewBox="0 0 160 160" className="shrink-0">
        {slices.map((sl, i) => (
          <path key={i} d={arc(sl.value)} fill={sl.color} stroke="white" strokeWidth={2} />
        ))}
        <circle cx={cx} cy={cy} r={38} fill="white" />
      </svg>
      <div className="flex-1 space-y-1.5 min-w-0">
        {slices.map((sl, i) => (
          <div key={i} className="flex items-center gap-2 text-xs">
            <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: sl.color }} />
            <span className="truncate text-gray-600">{sl.emoji} {sl.label}</span>
            <span className="ml-auto shrink-0 font-semibold text-gray-800">
              {((sl.value / total) * 100).toFixed(0)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
