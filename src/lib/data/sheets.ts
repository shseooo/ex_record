import type { BodyWeightEntry, Exercise, RoutineItem, Session, SetRecord, UserData } from '@/lib/domain/types'
import { DEFAULT_SETTINGS } from '@/lib/domain/types'
import { decodeSettings, decodeTab, encodeData, encodeTab, TAB_NAMES, type TabName } from './codec'
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
/**
 * 시트가 지워졌다(404). 다른 기기에서 초기화한 경우로, 다시 로그인하면 새 시트로 연결된다.
 * 그래서 인증 오류와 같게(401) 다룬다.
 */
export class SheetsGoneError extends SheetsAuthError {}
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
  if (res.status === 404) throw new SheetsGoneError('Spreadsheet not found')
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

/** id 열(A2부터)에서 마지막으로 값이 있는 행의 다음 행 번호. 중간의 빈 행은 그대로 두고 그 뒤부터 쓴다. */
function nextRow(ids: string[]): number {
  let last = -1
  ids.forEach((id, i) => {
    if (id !== '') last = i
  })
  return last + 3 // A2가 0번째이므로 마지막 행 번호(last + 2)의 다음
}

function decodeAll(rows: Record<TabName, RawRows>): UserData {
  return {
    exercises: decodeTab('exercises', rows.exercises) as Exercise[],
    routine: decodeTab('routine', rows.routine) as RoutineItem[],
    // 새 운동은 시트 끝에 붙이므로(지난 날짜를 나중에 기록하는 경우 포함) 시트 순서가 날짜순이 아닐 수 있다
    sessions: (decodeTab('sessions', rows.sessions) as Session[]).sort((a, b) =>
      (a.date + a.startedAt).localeCompare(b.date + b.startedAt),
    ),
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
   * ops가 모두 "시트에 아직 없는 세션 저장"이면 세션·세트 행을 쓰기 한 번(원자적)으로 끝내고 true.
   * 세션 id가 이미 있으면(수정, 또는 응답이 유실돼 다시 보낸 op) false → 전체 경로가 덮어써
   * 중복 행이 생기지 않는다.
   *
   * 쓸 위치는 id 열에서 "마지막으로 값이 있는 행" 바로 다음으로 직접 정한다. Google의 append
   * (appendCells 등)는 전체 쓰기 때 빈 문자열로 지운 행도 사용 중으로 보고 그 아래에 붙여
   * 중간에 빈 행이 생겼다.
   */
  private async tryAppendNewSessions(ops: Op[]): Promise<boolean> {
    if (ops.length === 0) return false
    const upserts = ops.filter((o): o is Extract<Op, { type: 'upsertSession' }> => o.type === 'upsertSession')
    if (upserts.length !== ops.length) return false
    const ids = upserts.map((o) => o.session.id)
    if (new Set(ids).size !== ids.length) return false

    const [sessionIds, setIds] = await this.idColumns(['sessions', 'sets'])
    const existing = new Set(sessionIds.filter(Boolean))
    if (ids.some((id) => existing.has(id))) return false

    const sessionRows = encodeTab('sessions', upserts.map((o) => o.session)).slice(1)
    const setRows = encodeTab('sets', upserts.flatMap((o) => o.sets)).slice(1)
    const data = [
      { range: `sessions!A${nextRow(sessionIds)}`, values: sessionRows },
      ...(setRows.length > 0 ? [{ range: `sets!A${nextRow(setIds)}`, values: setRows }] : []),
    ]
    await call(this.fetchFn, this.token, `${SHEETS}/${this.spreadsheetId}/values:batchUpdate`, {
      method: 'POST',
      body: { valueInputOption: 'RAW', data },
    })
    return true
  }

  /** 탭별 id 열(A2부터) 값. 세트 탭 전체가 아니라 한 열만이라 작다. 빈 행은 ''. */
  private async idColumns(tabs: TabName[]): Promise<string[][]> {
    const params = new URLSearchParams({ valueRenderOption: 'UNFORMATTED_VALUE' })
    for (const tab of tabs) params.append('ranges', `${tab}!A2:A`)
    const res = await call<{ valueRanges: { values?: RawRows }[] }>(
      this.fetchFn,
      this.token,
      `${SHEETS}/${this.spreadsheetId}/values:batchGet?${params}`,
    )
    return tabs.map((_, i) => (res.valueRanges[i]?.values ?? []).map((r) => String(r?.[0] ?? '')))
  }

  /**
   * 새 운동 저장(가장 흔한 쓰기)은 세션·세트 행을 시트 끝에 붙이기만 한다. 기록이 쌓여도
   * 요청 크기가 일정하고 전체를 읽지 않는다. 이때는 null을 돌려주고 클라이언트는 낙관적으로
   * 반영해 둔 로컬 데이터를 쓴다.
   *
   * 그 밖의 쓰기(수정·삭제·설정·루틴 등, 드묾)는 읽고 → 메모리에서 적용 → 바뀐 탭만 통째로
   * 다시 쓴다. 행 위치 추적이 필요 없어 단순하다.
   *
   * 둘 다 잠금 안에서 한다: 읽기~쓰기 사이에 다른 기기의 쓰기가 끼어들면 덮어쓰거나,
   * 같은 세션을 두 번 붙일 수 있기 때문이다.
   */
  async apply(ops: Op[]): Promise<UserData | null> {
    return this.withLock(async () => {
      if (await this.tryAppendNewSessions(ops)) return null
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

/** 초기화 중 어느 단계에서 실패했는지 남긴다 (인증 오류는 그대로 둬서 401로 처리되게) */
export class SheetResetError extends Error {
  constructor(
    public step: string,
    public cause: unknown,
  ) {
    super(`sheet reset failed at ${step}: ${cause instanceof Error ? cause.message : String(cause)}`)
  }
}

async function step<T>(name: string, fn: () => Promise<T>): Promise<T> {
  try {
    return await fn()
  } catch (e) {
    if (e instanceof SheetsAuthError) throw e
    throw new SheetResetError(name, e)
  }
}

/**
 * 시트 초기화: 이 앱의 시트를 지우고 기본값으로 새로 만든다.
 * - 지우기 전에 휴지통에 백업 사본을 남긴다(Drive 휴지통에서 30일 동안 복구 가능).
 *   사본을 못 만들면 원본도 지우지 않는다.
 * - 원본은 완전히 삭제한다. 그래야 예전 시트 id를 들고 있는 다른 기기가 404(SheetsGoneError)를
 *   받아 다시 로그인하게 되고, 휴지통의 시트에 계속 쓰는 일이 없다.
 * @returns 새 시트 id
 */
export async function resetSpreadsheet(
  token: string,
  fetchFn: typeof fetch = fetch,
  now = new Date(),
): Promise<string> {
  const pad = (n: number) => String(n).padStart(2, '0')
  const stamp = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
  // 동시에 만들어진 시트가 여럿일 수 있으니 모두 정리한다 (무한 반복 방지 상한)
  for (let i = 0; i < 10; i++) {
    const file = await findAppSheet(fetchFn, token)
    if (!file) break
    // copy 본문에는 문서화된 name만 넣고, 휴지통 이동/표시 제거는 update(PATCH)로 따로 한다
    const backup = await step('backup', () =>
      call<{ id: string }>(fetchFn, token, `${DRIVE}/${file.id}/copy?fields=id`, {
        method: 'POST',
        body: { name: `${SPREADSHEET_TITLE} backup ${stamp}` },
      }),
    )
    await step('trashBackup', () =>
      call(fetchFn, token, `${DRIVE}/${backup.id}`, {
        method: 'PATCH',
        body: { trashed: true, appProperties: { [APP_KEY]: null, [SETUP_KEY]: null } },
      }),
    )
    await step('delete', () => call(fetchFn, token, `${DRIVE}/${file.id}`, { method: 'DELETE' }))
  }
  return step('create', () => ensureSpreadsheet(token, fetchFn))
}

