import type {
  BodyWeightEntry,
  Exercise,
  RoutineItem,
  Session,
  SetRecord,
  Settings,
  UserData,
} from '@/lib/domain/types'
import { DEFAULT_SETTINGS } from '@/lib/domain/types'
import type { TabName } from './codec'

/**
 * 모든 쓰기는 Op 단위. 클라이언트(낙관적 업데이트/오프라인 큐)와 서버(시트 반영)가
 * 같은 applyOps를 사용한다. 재전송돼도 결과가 같도록 멱등하게 설계.
 */
export type Op =
  | { type: 'upsertSession'; session: Session; sets: SetRecord[] }
  | { type: 'deleteSession'; id: string }
  | { type: 'setExercises'; exercises: Exercise[] }
  | { type: 'setRoutine'; routine: RoutineItem[] }
  | { type: 'setSettings'; settings: Settings }
  | { type: 'upsertBodyWeight'; entry: BodyWeightEntry }
  | { type: 'deleteBodyWeight'; date: string }

export function emptyData(): UserData {
  return {
    exercises: [],
    routine: [],
    sessions: [],
    sets: [],
    bodyWeights: [],
    settings: { ...DEFAULT_SETTINGS },
  }
}

function applyOp(data: UserData, op: Op): UserData {
  switch (op.type) {
    case 'upsertSession': {
      const others = data.sessions.filter((s) => s.id !== op.session.id)
      return {
        ...data,
        sessions: [...others, op.session].sort((a, b) =>
          (a.date + a.startedAt).localeCompare(b.date + b.startedAt),
        ),
        sets: [...data.sets.filter((s) => s.sessionId !== op.session.id), ...op.sets],
      }
    }
    case 'deleteSession':
      return {
        ...data,
        sessions: data.sessions.filter((s) => s.id !== op.id),
        sets: data.sets.filter((s) => s.sessionId !== op.id),
      }
    case 'setExercises':
      return { ...data, exercises: op.exercises }
    case 'setRoutine':
      return { ...data, routine: op.routine }
    case 'setSettings':
      return { ...data, settings: op.settings }
    case 'upsertBodyWeight':
      return {
        ...data,
        bodyWeights: [...data.bodyWeights.filter((b) => b.date !== op.entry.date), op.entry].sort(
          (a, b) => a.date.localeCompare(b.date),
        ),
      }
    case 'deleteBodyWeight':
      return { ...data, bodyWeights: data.bodyWeights.filter((b) => b.date !== op.date) }
  }
}

export function applyOps(data: UserData, ops: Op[]): UserData {
  return ops.reduce(applyOp, data)
}

const TABS_BY_OP: Record<Op['type'], TabName[]> = {
  upsertSession: ['sessions', 'sets'],
  deleteSession: ['sessions', 'sets'],
  setExercises: ['exercises'],
  setRoutine: ['routine'],
  setSettings: ['settings'],
  upsertBodyWeight: ['bodyweights'],
  deleteBodyWeight: ['bodyweights'],
}

export function changedTabs(ops: Op[]): TabName[] {
  return [...new Set(ops.flatMap((op) => TABS_BY_OP[op.type]))]
}

/** 한 요청에 담을 수 있는 최대 op 수 (서버 검증과 클라이언트 전송 단위가 공유) */
export const MAX_OPS_PER_REQUEST = 200

type Rec = Record<string, unknown>
const isObj = (v: unknown): v is Rec => typeof v === 'object' && v !== null && !Array.isArray(v)
const str = (v: unknown) => typeof v === 'string'
const num = (v: unknown) => typeof v === 'number' && Number.isFinite(v)
const bool = (v: unknown) => typeof v === 'boolean'
const opt = (check: (v: unknown) => boolean) => (v: unknown) => v === undefined || v === null || check(v)

/** 필드별 타입 검사. 시트에 쓰는 값의 모양만 확인한다 (codec 컬럼과 일치). */
function shape(fields: Record<string, (v: unknown) => boolean>) {
  return (v: unknown): boolean => isObj(v) && Object.entries(fields).every(([k, check]) => check(v[k]))
}
const arrayOf = (check: (v: unknown) => boolean) => (v: unknown) =>
  Array.isArray(v) && v.every(check)

const isExercise = shape({
  id: str,
  name: str,
  type: str,
  bodyPart: str,
  defaultRestSec: num,
  incrementKg: num,
  archived: bool,
})
const isRoutineItem = shape({
  id: str,
  day: num,
  order: num,
  exerciseId: str,
  targetSets: num,
  targetReps: opt(num),
  targetWeightKg: opt(num),
  targetDurationSec: opt(num),
  targetDistanceKm: opt(num),
  restSec: opt(num),
  supersetGroup: opt(str),
})
const isSession = shape({ id: str, date: str, startedAt: str, endedAt: str, note: str })
const isSet = shape({
  id: str,
  sessionId: str,
  date: str,
  exerciseId: str,
  setNo: num,
  weightKg: opt(num),
  reps: opt(num),
  durationSec: opt(num),
  distanceKm: opt(num),
  rpe: opt(num),
  isWarmup: bool,
})
const isBodyWeight = shape({ date: str, weightKg: num })
const isSettings = shape({ locale: str, unit: str, weeklyGoal: num, theme: str })

const OP_SHAPES: Record<Op['type'], (op: Rec) => boolean> = {
  upsertSession: (op) => isSession(op.session) && arrayOf(isSet)(op.sets),
  deleteSession: (op) => str(op.id),
  setExercises: (op) => arrayOf(isExercise)(op.exercises),
  setRoutine: (op) => arrayOf(isRoutineItem)(op.routine),
  setSettings: (op) => isSettings(op.settings),
  upsertBodyWeight: (op) => isBodyWeight(op.entry),
  deleteBodyWeight: (op) => str(op.date),
}

export function isOp(value: unknown): value is Op {
  if (!isObj(value) || typeof value.type !== 'string') return false
  const check = OP_SHAPES[value.type as Op['type']]
  return Object.hasOwn(OP_SHAPES, value.type) && check(value)
}

/** API 경계 검증: 잘못된 op가 시트 쓰기까지 가면 탭이 망가질 수 있다 */
export function isOpArray(value: unknown): value is Op[] {
  return Array.isArray(value) && value.every(isOp)
}
