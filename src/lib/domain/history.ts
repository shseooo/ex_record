import { bestE1RM, bestSetValue } from './metrics'
import type { Exercise, SetRecord } from './types'

export interface LastPerformance {
  sessionId: string
  date: string
  sets: SetRecord[]
}

export function lastPerformance(
  sets: SetRecord[],
  exerciseId: string,
  excludeSessionId?: string,
): LastPerformance | undefined {
  const mine = sets.filter((s) => s.exerciseId === exerciseId && s.sessionId !== excludeSessionId)
  if (mine.length === 0) return undefined
  // 가장 최근 날짜, 같은 날짜면 나중에 기록된 세션
  let latest = mine[0]
  for (const s of mine) if (s.date >= latest.date) latest = s
  return {
    sessionId: latest.sessionId,
    date: latest.date,
    sets: mine.filter((s) => s.sessionId === latest.sessionId).sort((a, b) => a.setNo - b.setNo),
  }
}

export type PRKind = 'maxWeight' | 'e1rm' | 'best'

export interface PR {
  exerciseId: string
  kind: PRKind
  value: number
  previous: number
}

export function detectPRs(exercise: Exercise, history: SetRecord[], current: SetRecord[]): PR[] {
  const past = history.filter((s) => s.exerciseId === exercise.id && !s.isWarmup)
  const now = current.filter((s) => s.exerciseId === exercise.id && !s.isWarmup)
  if (past.length === 0 || now.length === 0) return []

  const prs: PR[] = []
  const prevBest = bestSetValue(exercise.type, past)
  const curBest = bestSetValue(exercise.type, now)
  if (prevBest !== undefined && curBest !== undefined && curBest > prevBest) {
    prs.push({
      exerciseId: exercise.id,
      kind: exercise.type === 'weight' ? 'maxWeight' : 'best',
      value: curBest,
      previous: prevBest,
    })
  }
  if (exercise.type === 'weight') {
    const prevE = bestE1RM(past)
    const curE = bestE1RM(now)
    if (prevE > 0 && curE > prevE + 1e-9) {
      prs.push({ exerciseId: exercise.id, kind: 'e1rm', value: curE, previous: prevE })
    }
  }
  return prs
}

export interface Suggestion {
  weightKg: number
  reps: number
  increased: boolean
}

/** 지난 세션에서 모든 본세트가 목표 횟수를 채웠으면 증량을 제안 */
export function suggestNext(
  exercise: Exercise,
  history: SetRecord[],
  targetReps: number,
): Suggestion | undefined {
  if (exercise.type !== 'weight') return undefined
  const last = lastPerformance(history, exercise.id)
  if (!last) return undefined
  const work = last.sets.filter((s) => !s.isWarmup && s.weightKg)
  if (work.length === 0) return undefined
  const topWeight = Math.max(...work.map((s) => s.weightKg!))
  const topSets = work.filter((s) => s.weightKg === topWeight)
  const allHit = topSets.every((s) => (s.reps ?? 0) >= targetReps)
  return {
    weightKg: allHit ? topWeight + exercise.incrementKg : topWeight,
    reps: targetReps,
    increased: allHit,
  }
}
