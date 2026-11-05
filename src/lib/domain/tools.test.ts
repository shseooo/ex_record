import { describe, it, expect } from 'vitest'
import { calcPlates } from './plates'
import { remainingSec, createTimer, extendTimer } from './timer'

describe('calcPlates: 원판 계산기 (한쪽 기준)', () => {
  it('100kg, 20kg 바 → 한쪽 40kg = 25 + 15', () => {
    expect(calcPlates(100, 'kg')).toEqual({ perSide: [25, 15], remainder: 0, bar: 20 })
  })
  it('62.5kg → 한쪽 21.25 = 20 + 1.25', () => {
    expect(calcPlates(62.5, 'kg')).toEqual({ perSide: [20, 1.25], remainder: 0, bar: 20 })
  })
  it('lb: 225lb, 45lb 바 → 한쪽 45 x2', () => {
    expect(calcPlates(225, 'lb')).toEqual({ perSide: [45, 45], remainder: 0, bar: 45 })
  })
  it('딱 맞지 않으면 남는 무게(전체 기준) 표시', () => {
    expect(calcPlates(21, 'kg')).toEqual({ perSide: [], remainder: 1, bar: 20 })
  })
  it('바보다 가벼우면 빈 결과', () => {
    expect(calcPlates(10, 'kg')).toEqual({ perSide: [], remainder: 0, bar: 20 })
  })
})

describe('timer: 종료 시각 기반', () => {
  it('남은 시간은 올림한 초, 0 미만은 0', () => {
    expect(remainingSec(10_000, 0)).toBe(10)
    expect(remainingSec(10_000, 9_001)).toBe(1)
    expect(remainingSec(10_000, 12_000)).toBe(0)
  })
  it('createTimer: 시작/연장/정지', () => {
    let t = createTimer(90, 1_000)
    expect(t).toEqual({ endAt: 91_000, totalSec: 90 })
    t = extendTimer(t, 30)
    expect(t.endAt).toBe(121_000)
    expect(t.totalSec).toBe(120)
  })
})

