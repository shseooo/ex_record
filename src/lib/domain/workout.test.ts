import { describe, it, expect } from 'vitest'
import {
  startWorkout,
  addExercise,
  addSet,
  updateSet,
  removeSet,
  toggleDone,
  finishWorkout,
  restFor,
  workoutFromSession,
} from './workout'
import type { Exercise, RoutineItem, SetRecord } from './types'

const ex = (id: string, type: Exercise['type'] = 'weight', defaultRestSec = 90): Exercise => ({
  id,
  name: id,
  type,
  bodyPart: 'chest',
  defaultRestSec,
  incrementKg: 2.5,
  archived: false,
})
const exercises = [ex('bench'), ex('plank', 'duration', 45), ex('squat', 'weight', 180)]

const routine: RoutineItem[] = [
  { id: 'r1', day: 4, order: 0, exerciseId: 'bench', targetSets: 3, targetReps: 8, targetWeightKg: 60 },
  { id: 'r2', day: 4, order: 1, exerciseId: 'plank', targetSets: 2, targetDurationSec: 60, restSec: 30 },
  { id: 'r3', day: 1, order: 0, exerciseId: 'squat', targetSets: 5 },
]

const history: SetRecord[] = [1, 2].map((n) => ({
  id: `h${n}`,
  sessionId: 'old',
  date: '2026-10-29',
  exerciseId: 'bench',
  setNo: n,
  weightKg: 62.5,
  reps: 10 - n,
  isWarmup: false,
}))

let k = 0
const gen = () => `id${k++}`
const NOW = new Date(2026, 10, 5, 19, 0) // 2026-11-05 목요일

describe('startWorkout', () => {
  it('오늘 요일 루틴으로 시작, 지난 기록이 있으면 지난 세트 수/값으로 채운다', () => {
    const w = startWorkout({ routine, exercises, sets: history }, NOW, gen)
    expect(w.date).toBe('2026-11-05')
    expect(w.items.map((i) => i.exerciseId)).toEqual(['bench', 'plank'])

    const bench = w.items[0]
    expect(bench.sets.map((s) => [s.weightKg, s.reps, s.done])).toEqual([
      [62.5, 9, false],
      [62.5, 8, false],
    ])
    expect(bench.last?.date).toBe('2026-10-29')
  })

  it('지난 기록이 없으면 루틴 목표값으로 targetSets 만큼', () => {
    const w = startWorkout({ routine, exercises, sets: [] }, NOW, gen)
    expect(w.items[0].sets.map((s) => [s.weightKg, s.reps])).toEqual([
      [60, 8],
      [60, 8],
      [60, 8],
    ])
    expect(w.items[1].sets.map((s) => s.durationSec)).toEqual([60, 60])
  })

  it('루틴이 없는 요일이면 빈 운동', () => {
    const w = startWorkout({ routine, exercises, sets: [] }, new Date(2026, 10, 8), gen)
    expect(w.items).toEqual([])
  })

  it('보관(archived)된 운동은 제외', () => {
    const archived = exercises.map((e) => (e.id === 'plank' ? { ...e, archived: true } : e))
    const w = startWorkout({ routine, exercises: archived, sets: [] }, NOW, gen)
    expect(w.items.map((i) => i.exerciseId)).toEqual(['bench'])
  })
})

describe('편집', () => {
  const base = () => startWorkout({ routine, exercises, sets: history }, NOW, gen)

  it('addExercise: 지난 기록으로 채운 항목 추가', () => {
    const w = addExercise(base(), ex('bench'), history, gen)
    expect(w.items).toHaveLength(3)
    expect(w.items[2].sets).toHaveLength(2)
  })

  it('addSet: 마지막 세트를 복사해 추가', () => {
    const w0 = base()
    const w = addSet(w0, w0.items[0].key, gen)
    const sets = w.items[0].sets
    expect(sets).toHaveLength(3)
    expect(sets[2]).toMatchObject({ weightKg: 62.5, reps: 8, done: false })
  })

  it('updateSet / removeSet', () => {
    const w0 = base()
    const item = w0.items[0]
    let w = updateSet(w0, item.key, item.sets[0].id, { weightKg: 65 })
    expect(w.items[0].sets[0].weightKg).toBe(65)
    w = removeSet(w, item.key, item.sets[0].id)
    expect(w.items[0].sets).toHaveLength(1)
  })

  it('toggleDone', () => {
    const w0 = base()
    const w = toggleDone(w0, w0.items[0].key, w0.items[0].sets[0].id)
    expect(w.items[0].sets[0].done).toBe(true)
  })
})

describe('restFor', () => {
  it('루틴 restSec 우선, 없으면 운동 기본값', () => {
    const w = startWorkout({ routine, exercises, sets: [] }, NOW, gen)
    expect(restFor(w.items[0], exercises)).toBe(90)
    expect(restFor(w.items[1], exercises)).toBe(30)
  })
  it('슈퍼세트 중간 운동이면 휴식 없음(0), 그룹 마지막이면 휴식', () => {
    const ss: RoutineItem[] = [
      { ...routine[0], supersetGroup: 'g' },
      { ...routine[1], supersetGroup: 'g' },
    ]
    const w = startWorkout({ routine: ss, exercises, sets: [] }, NOW, gen)
    expect(restFor(w.items[0], exercises, w)).toBe(0)
    expect(restFor(w.items[1], exercises, w)).toBe(30)
  })
})

describe('finishWorkout', () => {
  it('완료한 세트만 SetRecord로, 운동별 setNo를 1부터 다시 매긴다', () => {
    let w = startWorkout({ routine, exercises, sets: history }, NOW, gen)
    const bench = w.items[0]
    w = toggleDone(w, bench.key, bench.sets[1].id)
    w = toggleDone(w, w.items[1].key, w.items[1].sets[0].id)
    const { session, sets } = finishWorkout(w, new Date(2026, 10, 5, 20, 0), 'good')

    expect(session).toMatchObject({ id: w.sessionId, date: '2026-11-05', note: 'good' })
    expect(session.endedAt).toBe(new Date(2026, 10, 5, 20, 0).toISOString())
    expect(sets.map((s) => [s.exerciseId, s.setNo, s.weightKg, s.reps])).toEqual([
      ['bench', 1, 62.5, 8],
      ['plank', 1, undefined, undefined],
    ])
    expect(sets[1].durationSec).toBe(60)
    expect(sets.every((s) => s.sessionId === w.sessionId && s.date === '2026-11-05')).toBe(true)
  })
})

describe('workoutFromSession: 지난 세션 편집', () => {
  it('저장된 세션을 모두 완료 상태의 진행 중 운동으로 복원', () => {
    const session = { id: 'old', date: '2026-10-29', startedAt: 'a', endedAt: 'b', note: 'n' }
    const w = workoutFromSession(session, history, exercises, gen)
    expect(w.sessionId).toBe('old')
    expect(w.editing).toBe(true)
    expect(w.items).toHaveLength(1)
    expect(w.items[0].sets.every((s) => s.done)).toBe(true)
  })
})
