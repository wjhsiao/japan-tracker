export function formatJPY(amount: number): string {
  return `¥${Math.round(amount).toLocaleString('en-US')}`
}

export function formatTWD(amountJPY: number, rate: number): string {
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

export function today(): string {
  return new Date().toISOString().slice(0, 10)
}

export function daysBetween(start: string, end: string): number {
  const s = new Date(start + 'T00:00:00')
  const e = new Date(end + 'T00:00:00')
  return Math.round((e.getTime() - s.getTime()) / 86400000)
}

export function groupByDate<T extends { date: string }>(items: T[]): Map<string, T[]> {
  const map = new Map<string, T[]>()
  const sorted = [...items].sort((a, b) => b.date.localeCompare(a.date) || b.date.localeCompare(a.date))
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
