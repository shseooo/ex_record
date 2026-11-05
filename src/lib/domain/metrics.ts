import type { ExerciseType, SetRecord } from './types'

/** Epley 공식 */
export function estimate1RM(weight: number, reps: number): number {
  if (weight <= 0 || reps <= 0) return 0
  if (reps === 1) return weight
  return weight * (1 + reps / 30)
}

export function setVolume(set: SetRecord): number {
  if (set.isWarmup || !set.weightKg || !set.reps) return 0
  return set.weightKg * set.reps
}

/** 화면에 보이는 '세트 수'는 항상 워밍업을 뺀 본 세트 수 */
export function workingSetCount(sets: Pick<SetRecord, 'isWarmup'>[]): number {
  return sets.filter((s) => !s.isWarmup).length
}

export function sessionVolume(sets: SetRecord[]): number {
  return sets.reduce((sum, s) => sum + setVolume(s), 0)
}

/** 운동 타입별 대표 수치를 꺼낸다 (차트/PR 공통) */
export function setValue(type: ExerciseType, set: SetRecord): number | undefined {
  switch (type) {
    case 'weight':
      return set.weightKg
    case 'bodyweight':
      return set.reps
    case 'duration':
      return set.durationSec
    case 'cardio':
      return set.distanceKm
  }
}

export function bestSetValue(type: ExerciseType, sets: SetRecord[]): number | undefined {
  let best: number | undefined
  for (const s of sets) {
    if (s.isWarmup) continue
    const v = setValue(type, s)
    if (v === undefined || Number.isNaN(v)) continue
    if (best === undefined || v > best) best = v
  }
  return best
}

export function bestE1RM(sets: SetRecord[]): number {
  let best = 0
  for (const s of sets) {
    if (s.isWarmup || !s.weightKg || !s.reps) continue
    best = Math.max(best, estimate1RM(s.weightKg, s.reps))
  }
  return best
}
