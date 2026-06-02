import { Expense, Settings } from './types'
import { sumJPY } from './utils'

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
