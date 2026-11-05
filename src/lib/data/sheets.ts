import type { BodyWeightEntry, Exercise, RoutineItem, Session, SetRecord, UserData } from '@/lib/domain/types'
import { DEFAULT_SETTINGS } from '@/lib/domain/types'
import { decodeSettings, decodeTab, encodeData, TAB_NAMES, type TabName } from './codec'
import { DEFAULT_EXERCISES } from './defaults'
import { applyOps, changedTabs, emptyData, type Op } from './ops'
import type { Repository } from './repository'

const SHEETS = 'https://sheets.googleapis.com/v4/spreadsheets'
const DRIVE = 'https://www.googleapis.com/drive/v3/files'
const APP_KEY = 'exRecordApp'
const APP_VERSION = 'v1'
/** 만든 직후 'pending', 초기 설정이 끝나면 제거된다. 없으면(기존 시트 포함) 준비 완료. */
const SETUP_KEY = 'exRecordSetup'
/** 쓰기 잠금용 숨김 탭. 같은 이름의 탭은 하나만 만들 수 있다는 점을 잠금으로 쓴다. */
export const LOCK_TITLE = '_lock'
const LOCK_TTL_MS = 30_000
const LOCK_WAIT_MS = 10_000
export const SPREADSHEET_TITLE = 'Workout Log (ex-record)'

export class SheetsAuthError extends Error {}
export class SheetsApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message)
  }
}

async function call<T>(
  fetchFn: typeof fetch,
  token: string,
  url: string,
  init: { method?: string; body?: unknown } = {},
): Promise<T> {
  const res = await fetchFn(url, {
    method: init.method ?? 'GET',
    headers: {
      authorization: `Bearer ${token}`,
      ...(init.body ? { 'content-type': 'application/json' } : {}),
    },
    body: init.body ? JSON.stringify(init.body) : undefined,
    cache: 'no-store',
  })
  if (res.status === 401) throw new SheetsAuthError('Google access token rejected')
  const json = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new SheetsApiError(res.status, json?.error?.message ?? `Google API ${res.status}`)
  }
  return json as T
}

type RawRows = (string | number | boolean)[][]

/**
 * 새 내용 아래와 오른쪽을 빈 셀('')로 채워, 기존 행이 남지 않게 한다.
 * RAW 모드에서 ''는 셀을 비운다(null은 "건너뛰기"라 안 됨).
 */
export function padToCover(values: (string | number)[][], oldRows: RawRows): (string | number)[][] {
  const width = Math.max(values[0]?.length ?? 0, ...oldRows.map((r) => r.length))
  const height = Math.max(values.length, oldRows.length + 1) // +1 = 헤더
  return Array.from({ length: height }, (_, i) => {
    const row = values[i] ?? []
    return [...row, ...Array<string>(width - row.length).fill('')]
  })
}

/**
 * 바뀐 탭들을 batchUpdate 한 번으로 덮어쓴다. 먼저 지우고 쓰는 방식은 쓰기가 실패하면
 * 탭이 빈 채로 남으므로 쓰지 않는다. 요청 본문은 호출 전에 모두 만들어 둔다.
 */
async function writeTabs(
  fetchFn: typeof fetch,
  token: string,
  spreadsheetId: string,
  data: UserData,
  tabs: TabName[],
  oldRows: Record<TabName, RawRows>,
) {
  if (tabs.length === 0) return
  const body = {
    valueInputOption: 'RAW',
    data: tabs.map((tab) => ({
      range: `${tab}!A1`,
      values: padToCover(encodeData(data, tab), oldRows[tab]),
    })),
  }
  await call(fetchFn, token, `${SHEETS}/${spreadsheetId}/values:batchUpdate`, {
    method: 'POST',
    body,
  })
}

function decodeAll(rows: Record<TabName, RawRows>): UserData {
  return {
    exercises: decodeTab('exercises', rows.exercises) as Exercise[],
    routine: decodeTab('routine', rows.routine) as RoutineItem[],
    sessions: decodeTab('sessions', rows.sessions) as Session[],
    sets: decodeTab('sets', rows.sets) as SetRecord[],
    bodyWeights: decodeTab('bodyweights', rows.bodyweights) as BodyWeightEntry[],
    settings: decodeSettings(rows.settings),
  }
}

export interface Clock {
  now(): number
  sleep(ms: number): Promise<void>
}
const realClock: Clock = {
  now: () => Date.now(),
  sleep: (ms) => new Promise((r) => setTimeout(r, ms)),
}

export class SheetsRepository implements Repository {
  constructor(
    private token: string,
    private spreadsheetId: string,
    private fetchFn: typeof fetch = fetch,
    private clock: Clock = realClock,
  ) {}

  private url(path = '') {
    return `${SHEETS}/${this.spreadsheetId}${path}`
  }

  /**
   * 시트 단위 상호 배제. 같은 제목의 탭 추가는 실패하므로 '_lock' 탭을 만든 쪽이 잠금을 가진다.
   * 탭 추가와 획득 시각 기록은 한 batchUpdate라 원자적이다. 함수가 죽어 남은 잠금은 TTL 뒤에
   * 그 탭의 sheetId로만 지우므로, 그 사이 다른 쪽이 새로 잡은 잠금을 지우지 않는다.
   */
  private async acquireLock(): Promise<number> {
    const deadline = this.clock.now() + LOCK_WAIT_MS
    let unexplained = 0
    for (;;) {
      const sheetId = Math.floor(Math.random() * 1_000_000_000) + 1_000_000_000
      try {
        await call(this.fetchFn, this.token, this.url(':batchUpdate'), {
          method: 'POST',
          body: {
            requests: [
              { addSheet: { properties: { sheetId, title: LOCK_TITLE, hidden: true } } },
              {
                updateCells: {
                  start: { sheetId, rowIndex: 0, columnIndex: 0 },
                  rows: [{ values: [{ userEnteredValue: { numberValue: this.clock.now() } }] }],
                  fields: 'userEnteredValue',
                },
              },
            ],
          },
        })
        return sheetId
      } catch (e) {
        if (!(e instanceof SheetsApiError) || e.status !== 400) throw e
        // 400: 잠금이 이미 있거나(정상적인 경쟁), 다른 이유로 거부됨
        const held = await this.readLock()
        if (!held && ++unexplained >= 3) throw e // 잠금이 없는데 계속 거부되면 경쟁이 아니다
        if (this.clock.now() >= deadline) {
          throw new SheetsApiError(409, 'Spreadsheet is locked by another write')
        }
        if (held && this.clock.now() - held.acquiredAt > LOCK_TTL_MS) {
          await this.deleteSheet(held.sheetId) // 죽은 쪽이 남긴 잠금
        } else {
          await this.clock.sleep(held ? 200 + Math.random() * 300 : 100)
        }
      }
    }
  }

  private async readLock(): Promise<{ sheetId: number; acquiredAt: number } | null> {
    const meta = await call<{ sheets?: { properties: { sheetId: number; title: string } }[] }>(
      this.fetchFn,
      this.token,
      this.url(`?${new URLSearchParams({ fields: 'sheets.properties(sheetId,title)' })}`),
    )
    const lock = meta.sheets?.find((s) => s.properties.title === LOCK_TITLE)
    if (!lock) return null
    const cell = await call<{ values?: unknown[][] }>(
      this.fetchFn,
      this.token,
      this.url(`/values/${encodeURIComponent(`'${LOCK_TITLE}'!A1`)}?valueRenderOption=UNFORMATTED_VALUE`),
    ).catch(() => ({ values: undefined }))
    const at = Number(cell.values?.[0]?.[0])
    // 기록이 없으면(이론상 불가) 오래된 잠금으로 취급
    return { sheetId: lock.properties.sheetId, acquiredAt: Number.isFinite(at) ? at : 0 }
  }

  private async deleteSheet(sheetId: number) {
    await call(this.fetchFn, this.token, this.url(':batchUpdate'), {
      method: 'POST',
      body: { requests: [{ deleteSheet: { sheetId } }] },
    }).catch(() => {}) // 이미 지워졌으면 그만
  }

  private async withLock<T>(fn: () => Promise<T>): Promise<T> {
    const sheetId = await this.acquireLock()
    try {
      return await fn()
    } finally {
      await this.deleteSheet(sheetId) // 실패해도 TTL 뒤에 풀린다
    }
  }

  /** 탭별 데이터 행(헤더 제외)을 그대로 읽는다 */
  private async loadRows(): Promise<Record<TabName, RawRows>> {
    const params = new URLSearchParams({ valueRenderOption: 'UNFORMATTED_VALUE' })
    for (const tab of TAB_NAMES) params.append('ranges', `${tab}!A2:Z`)
    const res = await call<{ valueRanges: { values?: RawRows }[] }>(
      this.fetchFn,
      this.token,
      `${SHEETS}/${this.spreadsheetId}/values:batchGet?${params}`,
    )
    return Object.fromEntries(
      TAB_NAMES.map((tab, i) => [tab, res.valueRanges[i]?.values ?? []]),
    ) as Record<TabName, RawRows>
  }

  async load(): Promise<UserData> {
    return decodeAll(await this.loadRows())
  }

  /**
   * 읽고 → 메모리에서 적용 → 바뀐 탭만 통째로 다시 쓴다.
   * 개인 기록 규모(연간 수천 행)에서는 충분히 빠르고, 행 위치 추적이 필요 없어 단순하다.
   * 읽기~쓰기 사이에 다른 기기의 쓰기가 끼어들면 그 내용을 덮어쓰므로 잠금 안에서 한다.
   */
  async apply(ops: Op[]): Promise<UserData> {
    return this.withLock(async () => {
      const rows = await this.loadRows()
      const next = applyOps(decodeAll(rows), ops)
      await writeTabs(this.fetchFn, this.token, this.spreadsheetId, next, changedTabs(ops), rows)
      return next
    })
  }
}

type DriveFile = { id: string; appProperties?: Record<string, string> }

/** 이 앱이 만든 시트 중 가장 먼저 만들어진 것 (동시에 여러 개가 생겨도 모두 같은 것을 고른다) */
async function findAppSheet(fetchFn: typeof fetch, token: string): Promise<DriveFile | undefined> {
  const q = `appProperties has { key='${APP_KEY}' and value='${APP_VERSION}' } and trashed=false`
  const found = await call<{ files?: DriveFile[] }>(
    fetchFn,
    token,
    `${DRIVE}?${new URLSearchParams({
      q,
      fields: 'files(id,appProperties)',
      orderBy: 'createdTime',
      pageSize: '1',
    })}`,
  )
  return found.files?.[0]
}

/**
 * 탭 구성과 초기 데이터를 맞춘다. 중간에 실패해도 다시 실행하면 이어서 끝낸다.
 * 'pending' 상태의 시트에는 사용자 데이터가 없으므로 덮어써도 안전하다.
 */
async function setUpSpreadsheet(fetchFn: typeof fetch, token: string, id: string) {
  const meta = await call<{ sheets?: { properties: { sheetId: number; title: string } }[] }>(
    fetchFn,
    token,
    `${SHEETS}/${id}?${new URLSearchParams({ fields: 'sheets.properties(sheetId,title)' })}`,
  )
  const existing = (meta.sheets ?? []).map((s) => s.properties)
  const titles = new Set(existing.map((p) => p.title))
  const keep = new Set<string>([...TAB_NAMES, LOCK_TITLE])
  const requests = [
    // 추가를 먼저 해야 기본 탭('Sheet1' 등)을 지워도 탭이 0개가 되지 않는다
    ...TAB_NAMES.filter((t) => !titles.has(t)).map((title) => ({
      addSheet: { properties: { title, gridProperties: { frozenRowCount: 1 } } },
    })),
    ...existing.filter((p) => !keep.has(p.title)).map((p) => ({ deleteSheet: { sheetId: p.sheetId } })),
  ]
  if (requests.length > 0) {
    await call(fetchFn, token, `${SHEETS}/${id}:batchUpdate`, { method: 'POST', body: { requests } })
  }

  const initial: UserData = { ...emptyData(), exercises: DEFAULT_EXERCISES, settings: DEFAULT_SETTINGS }
  await call(fetchFn, token, `${SHEETS}/${id}/values:batchUpdate`, {
    method: 'POST',
    body: {
      valueInputOption: 'RAW',
      data: TAB_NAMES.map((tab) => ({ range: `${tab}!A1`, values: encodeData(initial, tab) })),
    },
  })
  await call(fetchFn, token, `${DRIVE}/${id}`, {
    method: 'PATCH',
    body: { appProperties: { [SETUP_KEY]: null } },
  })
}

/**
 * 사용자 Drive에서 이 앱이 만든 시트를 찾고, 없으면 만든다.
 * drive.file 권한은 앱이 만든 파일만 보이므로 appProperties로 표시해 둔다.
 * 표시는 파일을 만드는 요청에 함께 넣어, 만들어진 시트는 항상 다시 찾을 수 있다.
 */
export async function ensureSpreadsheet(token: string, fetchFn: typeof fetch = fetch): Promise<string> {
  let file = await findAppSheet(fetchFn, token)

  if (!file) {
    const created = await call<{ id: string }>(fetchFn, token, `${DRIVE}?fields=id`, {
      method: 'POST',
      body: {
        name: SPREADSHEET_TITLE,
        mimeType: 'application/vnd.google-apps.spreadsheet',
        appProperties: { [APP_KEY]: APP_VERSION, [SETUP_KEY]: 'pending' },
      },
    })
    // 다른 기기가 동시에 처음 로그인해 먼저 만들었다면 그쪽(가장 오래된 것)으로 맞춘다
    const oldest = await findAppSheet(fetchFn, token)
    if (oldest && oldest.id !== created.id) {
      await call(fetchFn, token, `${DRIVE}/${created.id}`, {
        method: 'PATCH',
        body: { trashed: true },
      }).catch(() => {})
      file = oldest
    } else {
      file = { id: created.id, appProperties: { [SETUP_KEY]: 'pending' } }
    }
  }

  if (file.appProperties?.[SETUP_KEY] === 'pending') await setUpSpreadsheet(fetchFn, token, file.id)
  return file.id
}
