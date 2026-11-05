const pad = (n: number) => String(n).padStart(2, '0')

export function toDateKey(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export function parseDateKey(key: string): Date {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function todayKey(now = new Date()): string {
  return toDateKey(now)
}

export function addDays(key: string, days: number): string {
  const d = parseDateKey(key)
  d.setDate(d.getDate() + days)
  return toDateKey(d)
}

/** 그 주 월요일 */
export function weekKey(key: string): string {
  const d = parseDateKey(key)
  const offset = (d.getDay() + 6) % 7
  return addDays(key, -offset)
}

export function monthKey(key: string): string {
  return key.slice(0, 7)
}

export function yearKey(key: string): string {
  return key.slice(0, 4)
}

export type Granularity = 'day' | 'week' | 'month' | 'year'

export function bucketKey(key: string, g: Granularity): string {
  switch (g) {
    case 'day':
      return key
    case 'week':
      return weekKey(key)
    case 'month':
      return monthKey(key)
    case 'year':
      return yearKey(key)
  }
}

export interface GridDay {
  date: string
  inMonth: boolean
}

/** 일요일 시작 달력 그리드 (month: 0-index) */
export function monthGrid(year: number, month: number): GridDay[] {
  const first = new Date(year, month, 1)
  const start = addDays(toDateKey(first), -first.getDay())
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const cells = Math.ceil((first.getDay() + daysInMonth) / 7) * 7
  const prefix = `${year}-${pad(month + 1)}`
  return Array.from({ length: cells }, (_, i) => {
    const date = addDays(start, i)
    return { date, inMonth: date.startsWith(prefix) }
  })
}
