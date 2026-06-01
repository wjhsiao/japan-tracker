'use client'

import { Settings, Trip, DEFAULT_SETTINGS, DEFAULT_TRIP_ID } from './types'
import { localDate } from './utils'

const KEY = 'japan-tracker:settings'

export function loadSettings(): Settings {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? '{}')

    // Migrate old person1Name / person2Name to people[]
    if (!raw.people && (raw.person1Name || raw.person2Name)) {
      raw.people = [raw.person1Name || '', raw.person2Name || ''].filter(Boolean)
      delete raw.person1Name
      delete raw.person2Name
    }

    // Migrate old flat trip fields (budgetJPY / tripDays / startDate) → trips[]
    if (!raw.trips) {
      raw.trips = [{
        id: DEFAULT_TRIP_ID,
        name: '我的旅程',
        startDate: raw.startDate ?? DEFAULT_SETTINGS.trips[0].startDate,
        tripDays: raw.tripDays ?? 7,
        budgetJPY: raw.budgetJPY ?? 150000,
      }]
      raw.activeTripId = DEFAULT_TRIP_ID
      delete raw.startDate
      delete raw.tripDays
      delete raw.budgetJPY
    }

    return { ...DEFAULT_SETTINGS, ...raw }
  } catch {
    return DEFAULT_SETTINGS
  }
}

export function saveSettings(s: Settings): void {
  localStorage.setItem(KEY, JSON.stringify(s))
}

/* ── Trip helpers ─────────────────────────────────────────── */

export function getActiveTrip(s: Settings): Trip {
  return s.trips.find(t => t.id === s.activeTripId) ?? s.trips[0] ?? DEFAULT_SETTINGS.trips[0]
}

/** Inclusive end date (YYYY-MM-DD) of a trip. Uses local date math (no UTC shift). */
export function tripEndDate(t: Trip): string {
  const d = new Date(t.startDate + 'T00:00:00')
  d.setDate(d.getDate() + Math.max(0, t.tripDays - 1))
  return localDate(d)
}

/** Is a given date within the trip's inclusive range? */
export function isInTrip(date: string, t: Trip): boolean {
  const d = date.slice(0, 10)
  return d >= t.startDate && d <= tripEndDate(t)
}

/** Filter expenses to a trip's date range. */
export function expensesInTrip<T extends { date: string }>(items: T[], t: Trip): T[] {
  return items.filter(e => isInTrip(e.date, t))
}
