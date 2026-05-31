'use client'

import { useCallback, useEffect, useState } from 'react'
import { Expense } from './types'
import { fetchExpenses } from './gas'

const CACHE_KEY = 'japan-tracker:expenses-cache'

function readCache(): Expense[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = sessionStorage.getItem(CACHE_KEY)
    const data = raw ? JSON.parse(raw) : []
    return Array.isArray(data) ? data : []
  } catch {
    return []
  }
}

function writeCache(data: Expense[]) {
  try {
    sessionStorage.setItem(CACHE_KEY, JSON.stringify(data))
  } catch {
    // sessionStorage full or unavailable — ignore, cache is best-effort
  }
}

/** Clear the cache so the next read hits the network (call after writes). */
export function invalidateExpensesCache() {
  try {
    sessionStorage.removeItem(CACHE_KEY)
  } catch {
    /* ignore */
  }
}

interface UseExpenses {
  expenses: Expense[]
  /** True only on the very first load when there's no cached data to show. */
  loading: boolean
  error: string
  /** Re-fetch from the network and update cache. */
  refresh: () => Promise<void>
  /** Optimistically set local state (used after add/update/delete). */
  setExpenses: React.Dispatch<React.SetStateAction<Expense[]>>
}

export function useExpenses(): UseExpenses {
  const [expenses, setExpenses] = useState<Expense[]>(() => readCache())
  const [loading, setLoading] = useState(expenses.length === 0)
  const [error, setError] = useState('')

  const refresh = useCallback(async () => {
    setError('')
    try {
      const data = await fetchExpenses()
      setExpenses(data)
      writeCache(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  return { expenses, loading, error, refresh, setExpenses }
}
