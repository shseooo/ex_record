import { describe, it, expect } from 'vitest'
import {
  progressSeries,
  workoutDays,
  weeklyStreak,
  countSessionsInWeek,
  bodyPartDistribution,
  volumeSeries,
} from './progress'
import type { Exercise, Session, SetRecord } from './types'

const bench: Exercise = {
  id: 'bench',
  name: 'Bench Press',
  type: 'weight',
  bodyPart: 'chest',
  defaultRestSec: 90,
  incrementKg: 2.5,
  archived: false,
}
const squat: Exercise = { ...bench, id: 'squat', name: 'Squat', bodyPart: 'legs' }

let n = 0
const set = (date: string, exerciseId: string, weightKg: number, reps: number, isWarmup = false): SetRecord => ({
  id: `set${n++}`,
  sessionId: `s-${date}`,
  date,
  exerciseId,
  setNo: 1,
  weightKg,
  reps,
  isWarmup,
})
const session = (date: string): Session => ({
  id: `s-${date}`,
  date,
  startedAt: `${date}T10:00:00.000Z`,
  endedAt: `${date}T11:00:00.000Z`,
  note: '',
})

const sets = [
  set('2026-10-05', 'bench', 60, 10),
  set('2026-10-05', 'bench', 65, 8),
  set('2026-10-07', 'bench', 67.5, 5),
  set('2026-10-14', 'bench', 70, 5),
  set('2026-10-14', 'bench', 90, 1, true), // 워밍업 무시
  set('2026-10-14', 'squat', 100, 5),
]

describe('progressSeries: 운동별 중량 추이', () => {
  it('day 단위: 날짜별 최고 중량과 추정 1RM', () => {
    const series = progressSeries(bench, sets, 'day')
    expect(series.map((p) => p.key)).toEqual(['2026-10-05', '2026-10-07', '2026-10-14'])
    expect(series.map((p) => p.best)).toEqual([65, 67.5, 70])
    expect(series[0].e1rm).toBeCloseTo(65 * (1 + 8 / 30), 5)
  })

  it('week 단위: 주(월요일)별로 묶어 최고값', () => {
    const series = progressSeries(bench, sets, 'week')
    expect(series.map((p) => [p.key, p.best])).toEqual([
      ['2026-10-05', 67.5],
      ['2026-10-12', 70],
    ])
  })

  it('month 단위', () => {
    expect(progressSeries(bench, sets, 'month')).toEqual([
      expect.objectContaining({ key: '2026-10', best: 70 }),
    ])
  })

  it('기간 필터(from) 적용', () => {
    expect(progressSeries(bench, sets, 'day', '2026-10-10').map((p) => p.key)).toEqual(['2026-10-14'])
  })
})

describe('volumeSeries', () => {
  it('주별 총 볼륨 (워밍업 제외)', () => {
    expect(volumeSeries(sets, 'week')).toEqual([
      { key: '2026-10-05', volume: 600 + 520 + 337.5 },
      { key: '2026-10-12', volume: 350 + 500 },
    ])
  })
})

describe('달력/통계', () => {
  const sessions = ['2026-10-05', '2026-10-07', '2026-10-14', '2026-10-28', '2026-11-03'].map(session)

  it('workoutDays: 운동한 날짜 집합', () => {
    const days = workoutDays(sessions)
    expect(days.has('2026-10-07')).toBe(true)
    expect(days.has('2026-10-08')).toBe(false)
  })

  it('countSessionsInWeek', () => {
    expect(countSessionsInWeek(sessions, '2026-10-08')).toBe(2)
  })

  it('weeklyStreak: 목표 이상 달성한 연속 주 수 (이번 주는 진행 중이면 미달이어도 끊지 않음)', () => {
    // goal 1: 11-02주(1회) ← 10-26주(1회) ← 10-19주(0회) 끊김 → 2
    expect(weeklyStreak(sessions, 1, '2026-11-05')).toBe(2)
    // goal 2: 이번 주(1회) 진행 중이라 무시, 지난주 10-26주 1회 미달 → 0
    expect(weeklyStreak(sessions, 2, '2026-11-05')).toBe(0)
  })

  it('bodyPartDistribution: 부위별 세트 수 (워밍업 제외)', () => {
    expect(bodyPartDistribution(sets, [bench, squat])).toEqual({ chest: 4, legs: 1 })
  })
})
