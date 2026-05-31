'use client'

import { Settings, DEFAULT_SETTINGS } from './types'

const KEY = 'japan-tracker:settings'

export function loadSettings(): Settings {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? '{}')

    // Migrate old person1Name / person2Name to people[]
    if (!raw.people && (raw.person1Name || raw.person2Name)) {
      const p1 = raw.person1Name || ''
      const p2 = raw.person2Name || ''
      raw.people = [p1, p2].filter(Boolean)
      delete raw.person1Name
      delete raw.person2Name
    }

    return { ...DEFAULT_SETTINGS, ...raw }
  } catch {
    return DEFAULT_SETTINGS
  }
}

export function saveSettings(s: Settings): void {
  localStorage.setItem(KEY, JSON.stringify(s))
}
