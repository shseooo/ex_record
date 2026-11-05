import { describe, it, expect } from 'vitest'
import { toDateKey, parseDateKey, weekKey, monthKey, yearKey, monthGrid, addDays } from './dates'

describe('dates', () => {
  it('로컬 날짜를 YYYY-MM-DD로', () => {
    expect(toDateKey(new Date(2026, 0, 5, 23, 59))).toBe('2026-01-05')
  })
  it('파싱 왕복', () => {
    expect(toDateKey(parseDateKey('2026-11-05'))).toBe('2026-11-05')
  })
  it('addDays는 월 경계를 넘는다', () => {
    expect(addDays('2026-01-31', 1)).toBe('2026-02-01')
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28')
  })
  it('주 키는 그 주 월요일 날짜', () => {
    expect(weekKey('2026-11-05')).toBe('2026-11-02') // 목 → 월
    expect(weekKey('2026-11-08')).toBe('2026-11-02') // 일 → 같은 주 월
    expect(weekKey('2026-11-09')).toBe('2026-11-09') // 월
  })
  it('월/년 키', () => {
    expect(monthKey('2026-11-05')).toBe('2026-11')
    expect(yearKey('2026-11-05')).toBe('2026')
  })
  it('달력 그리드: 일요일 시작, 7의 배수, 앞뒤 달 채움', () => {
    const grid = monthGrid(2026, 10) // 2026년 11월 (0-index month)
    expect(grid.length % 7).toBe(0)
    expect(grid[0]).toEqual({ date: '2026-11-01', inMonth: true }) // 2026-11-01은 일요일
    expect(grid.filter((d) => d.inMonth)).toHaveLength(30)
    expect(grid.at(-1)!.inMonth).toBe(false)
  })
})
