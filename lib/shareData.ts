import { Expense, Settings } from './types'
import { sumJPY } from './utils'

export type ShareTheme = 'RECURRENT_FEED' | 'NEWSPAPER_CLIP'

export interface ShareData {
  date: string
  totalAmount: number
  totalAmountTWD: number
  count: number
  /** Largest single expense that day (store name preferred, else category) */
  topItemName: string
  topItemAmount: number
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
