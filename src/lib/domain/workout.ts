import { toDateKey } from './dates'
import { lastPerformance, type LastPerformance } from './history'
import { newId } from './id'
import { itemsForDay } from './routine'
import type { Exercise, RoutineItem, Session, SetRecord, Weekday } from './types'

export interface DraftSet {
  id: string
  weightKg?: number
  reps?: number
  durationSec?: number
  distanceKm?: number
  rpe?: number
  isWarmup: boolean
  done: boolean
}

export interface WorkoutItem {
  key: string
  exerciseId: string
  restSec?: number
  targetReps?: number
  supersetGroup?: string
  last?: LastPerformance
  sets: DraftSet[]
}

export interface ActiveWorkout {
  sessionId: string
  date: string
  startedAt: string
  note: string
  /** 이미 저장된 세션을 고치는 중 */
  editing?: boolean
  items: WorkoutItem[]
}

type Gen = () => string

const draftFromRecord = (s: SetRecord, gen: Gen, done = false): DraftSet => ({
  id: gen(),
  weightKg: s.weightKg,
  reps: s.reps,
  durationSec: s.durationSec,
  distanceKm: s.distanceKm,
  rpe: s.rpe,
  isWarmup: s.isWarmup,
  done,
})

function draftFromTarget(r: Partial<RoutineItem>, gen: Gen): DraftSet {
  return {
    id: gen(),
    weightKg: r.targetWeightKg,
    reps: r.targetReps,
    durationSec: r.targetDurationSec,
    distanceKm: r.targetDistanceKm,
    isWarmup: false,
    done: false,
  }
}

function buildItem(
  exerciseId: string,
  history: SetRecord[],
  gen: Gen,
  r: Partial<RoutineItem> = {},
): WorkoutItem {
  const last = lastPerformance(history, exerciseId)
  const sets = last
    ? last.sets.map((s) => draftFromRecord(s, gen))
    : Array.from({ length: Math.max(1, r.targetSets ?? 1) }, () => draftFromTarget(r, gen))
  return {
    key: gen(),
    exerciseId,
    restSec: r.restSec,
    targetReps: r.targetReps,
    supersetGroup: r.supersetGroup,
    last,
    sets,
  }
}

export function startWorkout(
  data: { routine: RoutineItem[]; exercises: Exercise[]; sets: SetRecord[] },
  now = new Date(),
  gen: Gen = newId,
): ActiveWorkout {
  const active = new Set(data.exercises.filter((e) => !e.archived).map((e) => e.id))
  const today = itemsForDay(data.routine, now.getDay() as Weekday).filter((r) =>
    active.has(r.exerciseId),
  )
  return {
    sessionId: gen(),
    date: toDateKey(now),
    startedAt: now.toISOString(),
    note: '',
    items: today.map((r) => buildItem(r.exerciseId, data.sets, gen, r)),
  }
}

export function workoutFromSession(
  session: Session,
  sets: SetRecord[],
  exercises: Exercise[],
  gen: Gen = newId,
): ActiveWorkout {
  const mine = sets.filter((s) => s.sessionId === session.id)
  const order: string[] = []
  for (const s of mine) if (!order.includes(s.exerciseId)) order.push(s.exerciseId)
  const known = new Set(exercises.map((e) => e.id))
  return {
    sessionId: session.id,
    date: session.date,
    startedAt: session.startedAt,
    note: session.note,
    editing: true,
    items: order
      .filter((id) => known.has(id))
      .map((exerciseId) => ({
        key: gen(),
        exerciseId,
        last: lastPerformance(sets, exerciseId, session.id),
        sets: mine
          .filter((s) => s.exerciseId === exerciseId)
          .sort((a, b) => a.setNo - b.setNo)
          .map((s) => draftFromRecord(s, gen, true)),
      })),
  }
}

const mapItem = (w: ActiveWorkout, key: string, fn: (i: WorkoutItem) => WorkoutItem): ActiveWorkout => ({
  ...w,
  items: w.items.map((i) => (i.key === key ? fn(i) : i)),
})

export function addExercise(
  w: ActiveWorkout,
  exercise: Exercise,
  history: SetRecord[],
  gen: Gen = newId,
): ActiveWorkout {
  const item = buildItem(exercise.id, history, gen, { targetSets: 3 })
  return { ...w, items: [...w.items, item] }
}

export function removeExercise(w: ActiveWorkout, key: string): ActiveWorkout {
  return { ...w, items: w.items.filter((i) => i.key !== key) }
}

export function moveExercise(w: ActiveWorkout, key: string, delta: -1 | 1): ActiveWorkout {
  const idx = w.items.findIndex((i) => i.key === key)
  const target = idx + delta
  if (idx < 0 || target < 0 || target >= w.items.length) return w
  const items = [...w.items]
  ;[items[idx], items[target]] = [items[target], items[idx]]
  return { ...w, items }
}

export function addSet(w: ActiveWorkout, key: string, gen: Gen = newId): ActiveWorkout {
  return mapItem(w, key, (i) => {
    const prev = i.sets.at(-1)
    const next: DraftSet = prev
      ? { ...prev, id: gen(), done: false, isWarmup: false }
      : { id: gen(), isWarmup: false, done: false }
    return { ...i, sets: [...i.sets, next] }
  })
}

export function updateSet(
  w: ActiveWorkout,
  key: string,
  setId: string,
  patch: Partial<Omit<DraftSet, 'id'>>,
): ActiveWorkout {
  return mapItem(w, key, (i) => ({
    ...i,
    sets: i.sets.map((s) => (s.id === setId ? { ...s, ...patch } : s)),
  }))
}

export function removeSet(w: ActiveWorkout, key: string, setId: string): ActiveWorkout {
  return mapItem(w, key, (i) => ({ ...i, sets: i.sets.filter((s) => s.id !== setId) }))
}

export function toggleDone(w: ActiveWorkout, key: string, setId: string): ActiveWorkout {
  return mapItem(w, key, (i) => ({
    ...i,
    sets: i.sets.map((s) => (s.id === setId ? { ...s, done: !s.done } : s)),
  }))
}

/** 세트 완료 후 휴식 시간. 슈퍼세트 중간 운동이면 바로 다음 운동으로 넘어가므로 0. */
export function restFor(item: WorkoutItem, exercises: Exercise[], w?: ActiveWorkout): number {
  if (w && item.supersetGroup) {
    const group = w.items.filter((i) => i.supersetGroup === item.supersetGroup)
    if (group.at(-1)?.key !== item.key) return 0
  }
  if (item.restSec !== undefined) return item.restSec
  return exercises.find((e) => e.id === item.exerciseId)?.defaultRestSec ?? 90
}

export function finishWorkout(
  w: ActiveWorkout,
  now = new Date(),
  note = w.note,
): { session: Session; sets: SetRecord[] } {
  const session: Session = {
    id: w.sessionId,
    date: w.date,
    startedAt: w.startedAt,
    endedAt: now.toISOString(),
    note,
  }
  const sets: SetRecord[] = []
  for (const item of w.items) {
    let setNo = 1
    for (const d of item.sets) {
      if (!d.done) continue
      sets.push({
        id: d.id,
        sessionId: w.sessionId,
        date: w.date,
        exerciseId: item.exerciseId,
        setNo: setNo++,
        weightKg: d.weightKg,
        reps: d.reps,
        durationSec: d.durationSec,
        distanceKm: d.distanceKm,
        rpe: d.rpe,
        isWarmup: d.isWarmup,
      })
    }
  }
  return { session, sets }
}

export function completedSetCount(w: ActiveWorkout): number {
  return w.items.reduce((n, i) => n + i.sets.filter((s) => s.done).length, 0)
}
