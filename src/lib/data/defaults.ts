import type { BodyPart, Exercise, ExerciseType } from '@/lib/domain/types'

/**
 * 기본 운동. name이 '@'로 시작하면 번역 키로 취급되어 UI 언어에 따라 표시된다.
 * 사용자가 이름을 바꾸면 일반 문자열로 저장된다.
 */
const seed: [string, ExerciseType, BodyPart, number, number][] = [
  ['bench_press', 'weight', 'chest', 120, 2.5],
  ['db_press', 'weight', 'chest', 90, 2],
  ['incline_db_press', 'weight', 'chest', 90, 2],
  ['push_up', 'bodyweight', 'chest', 60, 0],
  ['dips', 'bodyweight', 'chest', 90, 0],
  ['deadlift', 'weight', 'back', 180, 5],
  ['barbell_row', 'weight', 'back', 120, 2.5],
  ['lat_pulldown', 'weight', 'back', 90, 2.5],
  ['pull_up', 'bodyweight', 'back', 120, 0],
  ['squat', 'weight', 'legs', 180, 5],
  ['leg_press', 'weight', 'legs', 120, 5],
  ['lunge', 'weight', 'legs', 90, 2],
  ['overhead_press', 'weight', 'shoulders', 120, 2.5],
  ['lateral_raise', 'weight', 'shoulders', 60, 1],
  ['barbell_curl', 'weight', 'arms', 60, 2.5],
  ['triceps_pushdown', 'weight', 'arms', 60, 2.5],
  ['plank', 'duration', 'core', 60, 0],
  ['running', 'cardio', 'cardio', 0, 0],
  ['cycling', 'cardio', 'cardio', 0, 0],
]

export const DEFAULT_EXERCISES: Exercise[] = seed.map(
  ([key, type, bodyPart, defaultRestSec, incrementKg]) => ({
    id: key,
    name: `@${key}`,
    type,
    bodyPart,
    defaultRestSec,
    incrementKg,
    archived: false,
  }),
)
