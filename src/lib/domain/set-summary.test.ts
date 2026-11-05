import { describe, it, expect } from 'vitest'
import { groupSets, uniformValue } from './set-summary'

describe('groupSets: 세트 표시를 읽기 쉽게 묶는다', () => {
  it('중량: 연속된 같은 무게끼리 묶고 횟수만 나열', () => {
    expect(
      groupSets('weight', [
        { weightKg: 60, reps: 10 },
        { weightKg: 60, reps: 10 },
        { weightKg: 62.5, reps: 8 },
        { weightKg: 60, reps: 12 },
      ]),
    ).toEqual([
      { kind: 'reps', weightKg: 60, reps: [10, 10] },
      { kind: 'reps', weightKg: 62.5, reps: [8] },
      { kind: 'reps', weightKg: 60, reps: [12] },
    ])
  })

  it('맨몸: 보조 무게(음수)도 같은 방식, 무게 없으면 횟수만', () => {
    expect(groupSets('bodyweight', [{ weightKg: -25, reps: 3 }, { weightKg: -25, reps: 5 }, { weightKg: -25, reps: 4 }])).toEqual([
      { kind: 'reps', weightKg: -25, reps: [3, 5, 4] },
    ])
    expect(groupSets('bodyweight', [{ reps: 12 }, { weightKg: 0, reps: 10 }])).toEqual([
      { kind: 'reps', weightKg: undefined, reps: [12, 10] },
    ])
  })

  it('시간: 한 묶음으로', () => {
    expect(groupSets('duration', [{ durationSec: 60 }, { durationSec: 45 }])).toEqual([{ kind: 'time', secs: [60, 45] }])
  })

  it('유산소: 세트마다 거리+시간', () => {
    expect(groupSets('cardio', [{ distanceKm: 5, durationSec: 1500 }])).toEqual([
      { kind: 'cardio', distanceKm: 5, durationSec: 1500 },
    ])
  })

  it('값이 비어 있는 세트는 건너뛴다', () => {
    expect(groupSets('weight', [{ weightKg: 60 }, { weightKg: 60, reps: 5 }])).toEqual([{ kind: 'reps', weightKg: 60, reps: [5] }])
    expect(groupSets('duration', [{}])).toEqual([])
  })

  it('uniformValue: 2개 이상이 모두 같으면 그 값', () => {
    expect(uniformValue([10, 10, 10])).toBe(10)
    expect(uniformValue([10, 8])).toBeUndefined()
    expect(uniformValue([10])).toBeUndefined()
  })
})
