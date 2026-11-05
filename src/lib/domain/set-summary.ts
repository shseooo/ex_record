import type { ExerciseType } from './types'

type SetLike = { weightKg?: number; reps?: number; durationSec?: number; distanceKm?: number }

/** 화면 표시용 세트 묶음 */
export type SetGroup =
  /** 중량/맨몸: 연속된 같은 무게(맨몸은 추가·보조 무게, 없으면 undefined)의 횟수들 */
  | { kind: 'reps'; weightKg: number | undefined; reps: number[] }
  /** 시간 운동: 세트별 초 */
  | { kind: 'time'; secs: number[] }
  /** 유산소: 세트마다 거리와 시간 */
  | { kind: 'cardio'; distanceKm?: number; durationSec?: number }

/**
 * "-25kg×3, -25kg×5, -25kg×4"처럼 무게가 반복되지 않도록, 같은 무게가 이어지면 한 묶음으로 만든다.
 * 값이 비어 있는 세트는 뺀다.
 */
export function groupSets(type: ExerciseType, sets: SetLike[]): SetGroup[] {
  if (type === 'duration') {
    const secs = sets.map((s) => s.durationSec).filter((v): v is number => v !== undefined)
    return secs.length ? [{ kind: 'time', secs }] : []
  }
  if (type === 'cardio') {
    return sets
      .filter((s) => s.distanceKm !== undefined || s.durationSec !== undefined)
      .map((s) => ({ kind: 'cardio', distanceKm: s.distanceKm, durationSec: s.durationSec }))
  }
  const groups: Extract<SetGroup, { kind: 'reps' }>[] = []
  for (const s of sets) {
    if (s.reps === undefined) continue
    const weightKg = s.weightKg ? s.weightKg : undefined // 0은 "무게 없음"
    const last = groups.at(-1)
    if (last && last.weightKg === weightKg) last.reps.push(s.reps)
    else groups.push({ kind: 'reps', weightKg, reps: [s.reps] })
  }
  return groups
}

/** 2개 이상이 모두 같으면 그 값 ("10회 × 3세트"로 줄여 쓰기용) */
export function uniformValue(values: number[]): number | undefined {
  return values.length >= 2 && values.every((v) => v === values[0]) ? values[0] : undefined
}
