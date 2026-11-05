import type { Settings, UserData } from '@/lib/domain/types'
import { DEFAULT_SETTINGS } from '@/lib/domain/types'

type Kind = 'string' | 'number' | 'boolean' | 'optNumber' | 'optString'
interface Column {
  key: string
  kind: Kind
}

const col = (key: string, kind: Kind): Column => ({ key, kind })

/** 시트 탭별 컬럼 정의. 컬럼 추가는 항상 맨 뒤에 (기존 데이터 호환). */
export const TABS = {
  exercises: [
    col('id', 'string'),
    col('name', 'string'),
    col('type', 'string'),
    col('bodyPart', 'string'),
    col('defaultRestSec', 'number'),
    col('incrementKg', 'number'),
    col('archived', 'boolean'),
  ],
  routine: [
    col('id', 'string'),
    col('day', 'number'),
    col('order', 'number'),
    col('exerciseId', 'string'),
    col('targetSets', 'number'),
    col('targetReps', 'optNumber'),
    col('targetWeightKg', 'optNumber'),
    col('targetDurationSec', 'optNumber'),
    col('targetDistanceKm', 'optNumber'),
    col('restSec', 'optNumber'),
    col('supersetGroup', 'optString'),
  ],
  sessions: [
    col('id', 'string'),
    col('date', 'string'),
    col('startedAt', 'string'),
    col('endedAt', 'string'),
    col('note', 'string'),
  ],
  sets: [
    col('id', 'string'),
    col('sessionId', 'string'),
    col('date', 'string'),
    col('exerciseId', 'string'),
    col('setNo', 'number'),
    col('weightKg', 'optNumber'),
    col('reps', 'optNumber'),
    col('durationSec', 'optNumber'),
    col('distanceKm', 'optNumber'),
    col('rpe', 'optNumber'),
    col('isWarmup', 'boolean'),
  ],
  bodyweights: [col('date', 'string'), col('weightKg', 'number')],
} as const satisfies Record<string, Column[]>

export type ListTab = keyof typeof TABS
export type TabName = ListTab | 'settings'
export const TAB_NAMES = [
  'exercises',
  'routine',
  'sessions',
  'sets',
  'bodyweights',
  'settings',
] as const satisfies readonly TabName[]

export const TAB_DATA_KEY: Record<ListTab, keyof UserData> = {
  exercises: 'exercises',
  routine: 'routine',
  sessions: 'sessions',
  sets: 'sets',
  bodyweights: 'bodyWeights',
}

type Cell = string | number | boolean | null | undefined

function encodeCell(kind: Kind, value: unknown): string | number {
  if (value === undefined || value === null) return ''
  if (kind === 'boolean') return value ? 'TRUE' : 'FALSE'
  return value as string | number
}

function decodeCell(kind: Kind, cell: Cell): unknown {
  const empty = cell === undefined || cell === null || cell === ''
  switch (kind) {
    case 'string':
      return empty ? '' : String(cell)
    case 'optString':
      return empty ? undefined : String(cell)
    case 'number': {
      const n = Number(cell)
      return empty || Number.isNaN(n) ? 0 : n
    }
    case 'optNumber': {
      const n = Number(cell)
      return empty || Number.isNaN(n) ? undefined : n
    }
    case 'boolean':
      return cell === true || String(cell).toUpperCase() === 'TRUE'
  }
}

export function encodeTab(tab: ListTab, items: object[]): (string | number)[][] {
  const cols: readonly Column[] = TABS[tab]
  return [
    cols.map((c) => c.key),
    ...items.map((item) =>
      cols.map((c) => encodeCell(c.kind, (item as Record<string, unknown>)[c.key])),
    ),
  ]
}

/** rows: 헤더 제외 */
export function decodeTab(tab: ListTab, rows: Cell[][]): unknown[] {
  const cols: readonly Column[] = TABS[tab]
  return rows
    .filter((row) => row && row[0] !== undefined && row[0] !== '')
    .map((row) => {
      const obj: Record<string, unknown> = {}
      cols.forEach((c, i) => {
        const v = decodeCell(c.kind, row[i])
        if (v !== undefined) obj[c.key] = v
      })
      return obj
    })
}

export function encodeSettings(settings: Settings): (string | number)[][] {
  return [['key', 'value'], ...Object.entries(settings).map(([k, v]) => [k, v as string | number])]
}

const VALID: { [K in keyof Settings]: (v: string) => Settings[K] | undefined } = {
  locale: (v) => (['ko', 'en', 'ja'].includes(v) ? (v as Settings['locale']) : undefined),
  unit: (v) => (v === 'kg' || v === 'lb' ? v : undefined),
  weeklyGoal: (v) => {
    const n = Number(v)
    return v !== '' && Number.isInteger(n) && n >= 0 && n <= 14 ? n : undefined
  },
  theme: (v) => (['system', 'light', 'dark'].includes(v) ? (v as Settings['theme']) : undefined),
}

export function decodeSettings(rows: Cell[][]): Settings {
  const result: Settings = { ...DEFAULT_SETTINGS }
  for (const [k, v] of rows) {
    const key = String(k) as keyof Settings
    if (!(key in VALID)) continue
    const parsed = VALID[key](String(v ?? ''))
    if (parsed !== undefined) (result as unknown as Record<string, unknown>)[key] = parsed
  }
  return result
}

export function encodeData(data: UserData, tab: TabName): (string | number)[][] {
  if (tab === 'settings') return encodeSettings(data.settings)
  return encodeTab(tab, data[TAB_DATA_KEY[tab]] as object[])
}
