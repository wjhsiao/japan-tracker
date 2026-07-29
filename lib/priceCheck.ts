'use client'

import { PriceCheck } from './types'

const KEY = 'japan-tracker:price-checks'

export function loadPriceChecks(): PriceCheck[] {
  if (typeof window === 'undefined') return []
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? '[]')
  } catch {
    return []
  }
}

export function savePriceCheck(pc: PriceCheck): void {
  const all = loadPriceChecks()
  localStorage.setItem(KEY, JSON.stringify([pc, ...all]))
}

export function deletePriceCheck(id: string): void {
  const all = loadPriceChecks().filter(p => p.id !== id)
  localStorage.setItem(KEY, JSON.stringify(all))
}

export function getHistoryForBarcode(barcode: string): PriceCheck[] {
  return loadPriceChecks()
    .filter(p => p.barcode === barcode)
    .sort((a, b) => a.price - b.price)
}

export function updatePriceCheck(id: string, updated: PriceCheck): void {
  const all = loadPriceChecks().map(p => p.id === id ? updated : p)
  localStorage.setItem(KEY, JSON.stringify(all))
}
