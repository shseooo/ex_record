import { describe, it, expect } from 'vitest'
import { describeSet } from './describe-set'

const fmtW = (kg?: number) => `${kg}kg`

describe('describeSet', () => {
  it('맨몸: 추가 무게는 +, 보조 무게는 -, 없으면 횟수만', () => {
    expect(describeSet({ type: 'bodyweight' }, { weightKg: 10, reps: 8 }, fmtW)).toBe('+10kg×8')
    expect(describeSet({ type: 'bodyweight' }, { weightKg: -20, reps: 8 }, fmtW)).toBe('-20kg×8')
    expect(describeSet({ type: 'bodyweight' }, { reps: 8 }, fmtW)).toBe('8')
  })
  it('중량', () => {
    expect(describeSet({ type: 'weight' }, { weightKg: 60, reps: 5 }, fmtW)).toBe('60kg×5')
  })
})
