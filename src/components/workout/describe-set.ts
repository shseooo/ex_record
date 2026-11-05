import type { Exercise } from '@/lib/domain/types'
import { formatDuration } from '@/lib/domain/units'

/** 맨몸 운동의 weightKg: 양수 = 추가 무게, 음수 = 보조(어시스트) 무게 */
export function describeSet(
  exercise: Pick<Exercise, 'type'>,
  s: { weightKg?: number; reps?: number; durationSec?: number; distanceKm?: number },
  fmtW: (kg?: number) => string,
): string {
  switch (exercise.type) {
    case 'weight':
      return `${fmtW(s.weightKg)}×${s.reps ?? '-'}`
    case 'bodyweight':
      return s.weightKg ? `${s.weightKg > 0 ? '+' : ''}${fmtW(s.weightKg)}×${s.reps ?? '-'}` : `${s.reps ?? '-'}`
    case 'duration':
      return s.durationSec !== undefined ? formatDuration(s.durationSec) : '-'
    case 'cardio':
      return [s.distanceKm !== undefined ? `${s.distanceKm}km` : '', s.durationSec !== undefined ? formatDuration(s.durationSec) : '']
        .filter(Boolean)
        .join(' / ')
  }
}
