import { describe, it, expect } from 'vitest'
import { toKg, fromKg, formatWeight, formatVolume, formatDuration, parseDuration } from './units'

describe('units', () => {
  it('kg는 그대로 둔다', () => {
    expect(toKg(100, 'kg')).toBe(100)
    expect(fromKg(100, 'kg')).toBe(100)
  })

  it('lb를 kg로 바꾸고 다시 lb로 되돌려도 값이 유지된다', () => {
    const kg = toKg(135, 'lb')
    expect(kg).toBeCloseTo(61.235, 3)
    expect(fromKg(kg, 'lb')).toBeCloseTo(135, 6)
  })

  it('무게를 단위와 함께 소수점 한 자리까지 표시한다', () => {
    expect(formatWeight(100, 'kg')).toBe('100kg')
    expect(formatWeight(62.5, 'kg')).toBe('62.5kg')
    expect(formatWeight(toKg(135, 'lb'), 'lb')).toBe('135lb')
    expect(formatWeight(undefined, 'kg')).toBe('-')
  })

  it('1.25kg 단위 증량이 보이도록 소수점 둘째 자리까지 표시', () => {
    expect(formatWeight(78.75, 'kg')).toBe('78.75kg')
    expect(formatWeight(81.25, 'kg')).toBe('81.25kg')
  })

  it('볼륨은 정수로, 천 단위 구분', () => {
    expect(formatVolume(4038.75, 'kg')).toBe('4,039kg')
  })

  it('초를 m:ss / h:mm:ss 로 표시한다', () => {
    expect(formatDuration(5)).toBe('0:05')
    expect(formatDuration(90)).toBe('1:30')
    expect(formatDuration(3725)).toBe('1:02:05')
  })

  it('m:ss 문자열이나 숫자를 초로 파싱한다', () => {
    expect(parseDuration('1:30')).toBe(90)
    expect(parseDuration('1:02:05')).toBe(3725)
    expect(parseDuration('45')).toBe(45)
    expect(parseDuration('abc')).toBeUndefined()
    expect(parseDuration('')).toBeUndefined()
  })
})
