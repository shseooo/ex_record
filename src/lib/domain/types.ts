export type ExerciseType = 'weight' | 'bodyweight' | 'duration' | 'cardio'

export const BODY_PARTS = [
  'chest',
  'back',
  'legs',
  'shoulders',
  'arms',
  'core',
  'cardio',
  'full',
] as const
export type BodyPart = (typeof BODY_PARTS)[number]

/** 0 = Sunday ... 6 = Saturday (Date#getDay 기준) */
export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6

export interface Exercise {
  id: string
  name: string
  type: ExerciseType
  bodyPart: BodyPart
  defaultRestSec: number
  /** 점진적 과부하 제안 시 증량 단위 (kg) */
  incrementKg: number
  archived: boolean
}

export interface RoutineItem {
  id: string
  day: Weekday
  order: number
  exerciseId: string
  targetSets: number
  targetReps?: number
  targetWeightKg?: number
  targetDurationSec?: number
  targetDistanceKm?: number
  restSec?: number
  /** 같은 값을 가진 항목끼리 슈퍼세트 */
  supersetGroup?: string
}

export interface Session {
  id: string
  /** YYYY-MM-DD (로컬 날짜) */
  date: string
  startedAt: string
  endedAt: string
  note: string
}

export interface SetRecord {
  id: string
  sessionId: string
  date: string
  exerciseId: string
  setNo: number
  weightKg?: number
  reps?: number
  durationSec?: number
  distanceKm?: number
  rpe?: number
  isWarmup: boolean
}

export interface BodyWeightEntry {
  date: string
  weightKg: number
}

export type Locale = 'ko' | 'en' | 'ja'
export type WeightUnit = 'kg' | 'lb'
export type Theme = 'system' | 'light' | 'dark'

export interface Settings {
  locale: Locale
  unit: WeightUnit
  weeklyGoal: number
  theme: Theme
}

export const DEFAULT_SETTINGS: Settings = {
  locale: 'ko',
  unit: 'kg',
  weeklyGoal: 3,
  theme: 'system',
}

export interface UserData {
  exercises: Exercise[]
  routine: RoutineItem[]
  sessions: Session[]
  sets: SetRecord[]
  bodyWeights: BodyWeightEntry[]
  settings: Settings
}
