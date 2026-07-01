import { Currency } from './types'

/** Round to 2 decimal places, avoiding floating-point noise (e.g. 0.1 + 0.2). */
export function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100
}

/**
 * Convert an amount typed in `currency` into both JPY and TWD using the given JPY→TWD rate.
 * amountJPY is always rounded to an integer (JPY has no decimals); baseAmountTWD to 2 decimals.
 */
export function convertAmount(
  inputAmount: number,
  currency: Currency,
  rateJPYtoTWD: number
): { amountJPY: number; baseAmountTWD: number } {
  if (currency === 'JPY') {
    const amountJPY = Math.round(inputAmount)
    return { amountJPY, baseAmountTWD: round2(amountJPY * rateJPYtoTWD) }
  }
  const baseAmountTWD = round2(inputAmount)
  const amountJPY = Math.round(rateJPYtoTWD > 0 ? baseAmountTWD / rateJPYtoTWD : 0)
  return { amountJPY, baseAmountTWD }
}

/** Apply a credit card's overseas fee/cashback to a TWD base amount → estimated statement total. */
export function calcCardTotal(baseAmountTWD: number, feeRate: number, cashbackRate: number): number {
  return round2(baseAmountTWD * (1 + feeRate - cashbackRate))
}
