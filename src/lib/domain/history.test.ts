import { describe, it, expect } from 'vitest'
import { lastPerformance, detectPRs, suggestNext } from './history'
import type { Exercise, SetRecord } from './types'

const bench: Exercise = {
  id: 'bench',
  name: 'Bench',
  type: 'weight',
  bodyPart: 'chest',
  defaultRestSec: 90,
  incrementKg: 2.5,
  archived: false,
}
const plank: Exercise = { ...bench, id: 'plank', type: 'duration', bodyPart: 'core' }

const set = (p: Partial<SetRecord>): SetRecord => ({
  id: Math.random().toString(36),
  sessionId: 's1',
  date: '2026-10-01',
  exerciseId: 'bench',
  setNo: 1,
  isWarmup: false,
  ...p,
})

const history: SetRecord[] = [
  set({ sessionId: 's1', date: '2026-10-01', setNo: 1, weightKg: 60, reps: 10 }),
  set({ sessionId: 's1', date: '2026-10-01', setNo: 2, weightKg: 60, reps: 9 }),
  set({ sessionId: 's2', date: '2026-10-08', setNo: 2, weightKg: 62.5, reps: 8 }),
  set({ sessionId: 's2', date: '2026-10-08', setNo: 1, weightKg: 62.5, reps: 10 }),
  set({ sessionId: 's3', date: '2026-10-09', exerciseId: 'squat', weightKg: 100, reps: 5 }),
]

describe('lastPerformance', () => {
  it('해당 운동을 마지막으로 한 세션의 세트를 setNo 순으로', () => {
    const last = lastPerformance(history, 'bench')
    expect(last?.date).toBe('2026-10-08')
    expect(last?.sets.map((s) => [s.setNo, s.weightKg, s.reps])).toEqual([
      [1, 62.5, 10],
      [2, 62.5, 8],
    ])
  })
  it('기록이 없으면 undefined', () => {
    expect(lastPerformance(history, 'deadlift')).toBeUndefined()
  })
  it('특정 세션 제외 (진행 중 세션)', () => {
    expect(lastPerformance(history, 'bench', 's2')?.date).toBe('2026-10-01')
  })
})

describe('detectPRs', () => {
  it('최고 중량 / 추정 1RM 갱신을 감지', () => {
    const today = [set({ sessionId: 'new', date: '2026-10-15', weightKg: 70, reps: 6 })]
    const prs = detectPRs(bench, history, today)
    expect(prs.map((p) => p.kind).sort()).toEqual(['e1rm', 'maxWeight'])
    expect(prs.find((p) => p.kind === 'maxWeight')?.previous).toBe(62.5)
  })
  it('갱신 못하면 빈 배열', () => {
    const today = [set({ sessionId: 'new', date: '2026-10-15', weightKg: 60, reps: 5 })]
    expect(detectPRs(bench, history, today)).toEqual([])
  })
  it('첫 기록은 PR로 치지 않는다', () => {
    const today = [set({ sessionId: 'new', exerciseId: 'deadlift', weightKg: 100, reps: 5 })]
    expect(detectPRs({ ...bench, id: 'deadlift' }, history, today)).toEqual([])
  })
  it('duration 타입은 최장 시간', () => {
    const past = [set({ exerciseId: 'plank', durationSec: 60 })]
    const today = [set({ sessionId: 'new', exerciseId: 'plank', durationSec: 75 })]
    expect(detectPRs(plank, past, today)).toEqual([{ exerciseId: 'plank', kind: 'best', value: 75, previous: 60 }])
  })
})

describe('suggestNext: 점진적 과부하', () => {
  it('지난 세션 모든 본세트가 목표 횟수 이상이면 증량', () => {
    expect(suggestNext(bench, history, 8)).toEqual({ weightKg: 65, reps: 8, increased: true })
  })
  it('목표 미달이면 같은 무게 유지', () => {
    expect(suggestNext(bench, history, 10)).toEqual({ weightKg: 62.5, reps: 10, increased: false })
  })
  it('기록 없으면 undefined', () => {
    expect(suggestNext({ ...bench, id: 'none' }, history, 8)).toBeUndefined()
  })
})
