import { describe, it, expect } from 'vitest'
import { estimate1RM, setVolume, sessionVolume, bestSetValue } from './metrics'
import type { SetRecord } from './types'

const s = (p: Partial<SetRecord>): SetRecord => ({
  id: 'x',
  sessionId: 's1',
  date: '2026-11-01',
  exerciseId: 'bench',
  setNo: 1,
  isWarmup: false,
  ...p,
})

describe('estimate1RM (Epley)', () => {
  it('1회는 무게 그대로', () => {
    expect(estimate1RM(100, 1)).toBe(100)
  })
  it('w * (1 + reps/30)', () => {
    expect(estimate1RM(100, 10)).toBeCloseTo(133.33, 2)
  })
  it('무게나 횟수가 0 이하면 0', () => {
    expect(estimate1RM(0, 5)).toBe(0)
    expect(estimate1RM(100, 0)).toBe(0)
  })
})

describe('volume', () => {
  it('세트 볼륨 = 무게 × 횟수, 워밍업 제외', () => {
    expect(setVolume(s({ weightKg: 60, reps: 10 }))).toBe(600)
    expect(setVolume(s({ weightKg: 60, reps: 10, isWarmup: true }))).toBe(0)
    expect(setVolume(s({ reps: 10 }))).toBe(0)
  })
  it('세션 볼륨은 합계', () => {
    expect(
      sessionVolume([s({ weightKg: 60, reps: 10 }), s({ weightKg: 70, reps: 5 })]),
    ).toBe(950)
  })
})

describe('bestSetValue: 운동 타입별 대표 수치', () => {
  it('weight: 최고 중량', () => {
    expect(
      bestSetValue('weight', [s({ weightKg: 60, reps: 10 }), s({ weightKg: 80, reps: 3 })]),
    ).toBe(80)
  })
  it('weight: 워밍업은 무시', () => {
    expect(
      bestSetValue('weight', [s({ weightKg: 100, reps: 1, isWarmup: true }), s({ weightKg: 80, reps: 3 })]),
    ).toBe(80)
  })
  it('bodyweight: 최다 횟수', () => {
    expect(bestSetValue('bodyweight', [s({ reps: 12 }), s({ reps: 15 })])).toBe(15)
  })
  it('duration: 최장 시간', () => {
    expect(bestSetValue('duration', [s({ durationSec: 60 }), s({ durationSec: 90 })])).toBe(90)
  })
  it('cardio: 최장 거리', () => {
    expect(bestSetValue('cardio', [s({ distanceKm: 5 }), s({ distanceKm: 3 })])).toBe(5)
  })
  it('세트가 없으면 undefined', () => {
    expect(bestSetValue('weight', [])).toBeUndefined()
  })
})
