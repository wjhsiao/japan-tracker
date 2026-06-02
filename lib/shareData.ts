import { Expense, Settings, Trip, CATEGORIES } from './types'
import { sumJPY } from './utils'
import { expensesInTrip } from './settings'

export type ShareTheme =
  | 'RECURRENT_FEED'
  | 'NEWSPAPER_CLIP'
  | 'RETRO_ANIME'
  | 'RETRO_POSTCARD'
  | 'MAGAZINE'
  | 'TICKET'
  | 'GAME'
  | 'POLAROID'

export interface ShareData {
  date: string
  totalAmount: number
  totalAmountTWD: number
  count: number
  /** Largest single expense that day (store name preferred, else category) */
  topItemName: string
  topItemAmount: number
}

/* ── Trip recap (Wrapped-style) ───────────────────────────── */

export interface CategoryBar {
  label: string
  emoji: string
  value: number
  pct: number
  colorClass: string
}

export interface TripRecap {
  name: string
  total: number
  totalTWD: number
  days: number
  count: number
  dailyAvg: number
  topCategory: { name: string; emoji: string; pct: number } | null
  biggestDay: { date: string; amount: number } | null
  biggestItem: { name: string; amount: number } | null
  categoryBars: CategoryBar[]
}

/** Solid bar fill per category index (parallel to CATEGORIES order). */
const CAT_BAR = [
  'bg-orange-400', 'bg-yellow-400', 'bg-blue-400', 'bg-pink-400',
  'bg-purple-400', 'bg-rose-400', 'bg-green-400', 'bg-indigo-400', 'bg-gray-400',
]

export function buildTripRecap(expenses: Expense[], trip: Trip, settings: Settings): TripRecap {
  const items = expensesInTrip(expenses, trip)
  const total = sumJPY(items)
  const totalTWD = Math.round(total * settings.exchangeRateJPYtoTWD)
  const days = Math.max(1, trip.tripDays)

  // Category aggregation (by amount)
  const byCat = new Map<string, number>()
  for (const e of items) byCat.set(e.category, (byCat.get(e.category) ?? 0) + e.amountJPY)
  const categoryBars: CategoryBar[] = CATEGORIES
    .map((c, i) => ({
      label: c.value,
      emoji: c.emoji,
      value: byCat.get(c.value) ?? 0,
      pct: total > 0 ? Math.round(((byCat.get(c.value) ?? 0) / total) * 100) : 0,
      colorClass: CAT_BAR[i % CAT_BAR.length],
    }))
    .filter(b => b.value > 0)
    .sort((a, b) => b.value - a.value)
  const topCategory = categoryBars[0]
    ? { name: categoryBars[0].label, emoji: categoryBars[0].emoji, pct: categoryBars[0].pct }
    : null

  // Biggest day (by summed amount)
  const byDay = new Map<string, number>()
  for (const e of items) byDay.set(e.date, (byDay.get(e.date) ?? 0) + e.amountJPY)
  let biggestDay: { date: string; amount: number } | null = null
  for (const [date, amount] of byDay) {
    if (!biggestDay || amount > biggestDay.amount) biggestDay = { date, amount }
  }

  // Biggest single expense
  let top: Expense | null = null
  for (const e of items) if (!top || e.amountJPY > top.amountJPY) top = e
  const biggestItem = top ? { name: top.storeName || top.category, amount: top.amountJPY } : null

  return {
    name: trip.name,
    total,
    totalTWD,
    days,
    count: items.length,
    dailyAvg: Math.round(total / days),
    topCategory,
    biggestDay,
    biggestItem,
    categoryBars: categoryBars.slice(0, 5),
  }
}

/** Which optional info the user chose to show on the card (金句 is always the hero). */
export interface ShareFields {
  showAmount: boolean
  showDayNumber: boolean
  showLocation: boolean
  showCount: boolean
  /** Weather string e.g. "☀️ 26°C"; empty = off */
  weather: string
}

export const DEFAULT_SHARE_FIELDS: ShareFields = {
  showAmount: true,
  showDayNumber: false,
  showLocation: true,
  showCount: false,
  weather: '',
}

/**
 * Secondary info chips (excludes amount & location, which themes place in their
 * own dedicated slots). Used for a theme's status / meta line.
 */
export function metaChips(d: ShareData, f: ShareFields, dayNumber: number): string[] {
  const parts: string[] = []
  if (f.showDayNumber && dayNumber > 0) parts.push(`Day ${dayNumber}`)
  if (f.weather) parts.push(f.weather)
  if (f.showCount && d.count > 0) parts.push(`${d.count} 筆`)
  return parts
}

/** Build the data payload for a share card from a given day's expenses. */
export function buildShareData(
  expenses: Expense[],
  date: string,
  settings: Settings
): ShareData {
  const dayExpenses = expenses.filter(e => e.date === date)
  const totalAmount = sumJPY(dayExpenses)
  const totalAmountTWD = Math.round(totalAmount * settings.exchangeRateJPYtoTWD)

  // Largest single expense → its store name (fallback to category)
  let top: Expense | null = null
  for (const e of dayExpenses) {
    if (!top || e.amountJPY > top.amountJPY) top = e
  }
  const topItemName = top ? (top.storeName || top.category) : '—'
  const topItemAmount = top ? top.amountJPY : 0

  return {
    date,
    totalAmount,
    totalAmountTWD,
    count: dayExpenses.length,
    topItemName,
    topItemAmount,
  }
}
