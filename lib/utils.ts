export function formatJPY(amount: number): string {
  return `¥${Math.round(amount).toLocaleString('en-US')}`
}

export function formatTWD(amountJPY: number, rate: number): string {
  // Round directly to an integer in one pass — rounding to 2 decimals first
  // (as convertAmount's baseAmountTWD does) and then to an integer here would
  // double-round and occasionally be off by NT$1 at boundary values.
  const twd = Math.round(amountJPY * rate)
  return `NT$${twd.toLocaleString('en-US')}`
}

export function formatDate(dateStr: string): string {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('zh-TW', {
    month: 'numeric',
    day: 'numeric',
    weekday: 'short',
  })
}

export function formatDateFull(dateStr: string): string {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('zh-TW', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long',
  })
}

/** Format a Date as YYYY-MM-DD using LOCAL components (not UTC). */
export function localDate(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function today(): string {
  return localDate(new Date())
}

/** "2026-05-31".."2026-06-06" → "05/31 – 06/06" */
export function prettyRange(start: string, end: string): string {
  const md = (d: string) => d.slice(5).replace('-', '/')
  return `${md(start)} – ${md(end)}`
}

export function daysBetween(start: string, end: string): number {
  const s = new Date(start + 'T00:00:00')
  const e = new Date(end + 'T00:00:00')
  return Math.round((e.getTime() - s.getTime()) / 86400000)
}

export function groupByDate<T extends { date: string; createdAt?: string }>(items: T[]): Map<string, T[]> {
  const map = new Map<string, T[]>()
  // Newest date first; within the same date, newest createdAt first
  const sorted = [...items].sort(
    (a, b) => b.date.localeCompare(a.date) || (b.createdAt ?? '').localeCompare(a.createdAt ?? '')
  )
  for (const item of sorted) {
    const list = map.get(item.date) ?? []
    list.push(item)
    map.set(item.date, list)
  }
  return map
}

export function sumJPY<T extends { amountJPY: number }>(items: T[]): number {
  return items.reduce((s, e) => s + e.amountJPY, 0)
}

export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result as string
      resolve(result.split(',')[1])
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

export function getMimeType(file: File): string {
  return file.type || 'image/jpeg'
}

/**
 * fetch with a timeout (default 15s). Aborts the request if it hangs, throwing
 * a clear error instead of leaving the promise pending forever.
 */
export async function fetchWithTimeout(
  input: RequestInfo | URL,
  init: RequestInit = {},
  timeoutMs = 15000
): Promise<Response> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    return await fetch(input, { ...init, signal: controller.signal })
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      throw new Error('連線逾時，請稍後再試')
    }
    throw err
  } finally {
    clearTimeout(timer)
  }
}

/**
 * Compress an image file using canvas.
 * Resizes to max 1280px on the longest side and encodes as JPEG at given quality.
 * Returns { base64, mimeType } ready to send to the OCR API.
 */
export function compressImage(
  file: File,
  maxPx = 1280,
  quality = 0.75
): Promise<{ base64: string; mimeType: string }> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(url)
      let { width, height } = img
      if (width > maxPx || height > maxPx) {
        if (width >= height) {
          height = Math.round((height * maxPx) / width)
          width = maxPx
        } else {
          width = Math.round((width * maxPx) / height)
          height = maxPx
        }
      }
      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d')!
      ctx.drawImage(img, 0, 0, width, height)
      const dataUrl = canvas.toDataURL('image/jpeg', quality)
      resolve({ base64: dataUrl.split(',')[1], mimeType: 'image/jpeg' })
    }
    img.onerror = reject
    img.src = url
  })
}
