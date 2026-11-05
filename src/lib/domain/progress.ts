import { addDays, bucketKey, weekKey, type Granularity } from './dates'
import { bestE1RM, bestSetValue, setVolume } from './metrics'
import type { BodyPart, Exercise, Session, SetRecord } from './types'

export interface ProgressPoint {
  key: string
  best: number
  /** weight 타입에서만 의미 있음 */
  e1rm: number
}

function groupBy<T>(items: T[], keyOf: (t: T) => string): Map<string, T[]> {
  const map = new Map<string, T[]>()
  for (const item of items) {
    const k = keyOf(item)
    const list = map.get(k)
    if (list) list.push(item)
    else map.set(k, [item])
  }
  return map
}

export function progressSeries(
  exercise: Exercise,
  sets: SetRecord[],
  granularity: Granularity,
  from?: string,
): ProgressPoint[] {
  const relevant = sets.filter(
    (s) => s.exerciseId === exercise.id && !s.isWarmup && (!from || s.date >= from),
  )
  const groups = groupBy(relevant, (s) => bucketKey(s.date, granularity))
  const points: ProgressPoint[] = []
  for (const [key, group] of groups) {
    const best = bestSetValue(exercise.type, group)
    if (best === undefined) continue
    points.push({ key, best, e1rm: exercise.type === 'weight' ? bestE1RM(group) : 0 })
  }
  return points.sort((a, b) => a.key.localeCompare(b.key))
}

export function volumeSeries(
  sets: SetRecord[],
  granularity: Granularity,
  from?: string,
): { key: string; volume: number }[] {
  const groups = groupBy(
    sets.filter((s) => !from || s.date >= from),
    (s) => bucketKey(s.date, granularity),
  )
  return [...groups]
    .map(([key, group]) => ({ key, volume: group.reduce((sum, s) => sum + setVolume(s), 0) }))
    .filter((p) => p.volume > 0)
    .sort((a, b) => a.key.localeCompare(b.key))
}

export function workoutDays(sessions: Session[]): Set<string> {
  return new Set(sessions.map((s) => s.date))
}

export function countSessionsInWeek(sessions: Session[], anyDayInWeek: string): number {
  const wk = weekKey(anyDayInWeek)
  return sessions.filter((s) => weekKey(s.date) === wk).length
}

/** 주간 목표를 달성한 연속 주 수. 이번 주가 아직 미달이면 진행 중으로 보고 건너뛴다. */
export function weeklyStreak(sessions: Session[], goal: number, today: string): number {
  if (goal <= 0) return 0
  const counts = groupBy(sessions, (s) => weekKey(s.date))
  const countOf = (wk: string) => counts.get(wk)?.length ?? 0
  let wk = weekKey(today)
  let streak = 0
  if (countOf(wk) >= goal) streak++
  wk = addDays(wk, -7)
  while (countOf(wk) >= goal) {
    streak++
    wk = addDays(wk, -7)
  }
  return streak
}

export function bodyPartDistribution(
  sets: SetRecord[],
  exercises: Exercise[],
): Partial<Record<BodyPart, number>> {
  const partOf = new Map(exercises.map((e) => [e.id, e.bodyPart]))
  const result: Partial<Record<BodyPart, number>> = {}
  for (const s of sets) {
    if (s.isWarmup) continue
    const part = partOf.get(s.exerciseId)
    if (!part) continue
    result[part] = (result[part] ?? 0) + 1
  }
  return result
}
