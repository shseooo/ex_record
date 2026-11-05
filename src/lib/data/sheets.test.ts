import { describe, it, expect } from 'vitest'
import type { Op } from './ops'
import { SheetsRepository, ensureSpreadsheet, SheetsAuthError, LOCK_TITLE, type Clock } from './sheets'
import { encodeTab, encodeSettings, TAB_NAMES } from './codec'
import { DEFAULT_SETTINGS } from '@/lib/domain/types'

type Call = { url: string; method: string; body?: unknown; auth?: string | null }

function fakeFetch(handler: (call: Call) => { status?: number; json: unknown }) {
  const calls: Call[] = []
  const fn = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const call: Call = {
      url: String(input),
      method: init?.method ?? 'GET',
      body: init?.body ? JSON.parse(String(init.body)) : undefined,
      auth: new Headers(init?.headers).get('authorization'),
    }
    calls.push(call)
    const { status = 200, json } = handler(call)
    return new Response(JSON.stringify(json), { status })
  }) as typeof fetch
  return { fn, calls }
}

const sessionRows = encodeTab('sessions', [
  { id: 's1', date: '2026-11-01', startedAt: 'a', endedAt: 'b', note: '' },
])

describe('SheetsRepository.load', () => {
  it('batchGet 한 번으로 모든 탭을 읽는다', async () => {
    const { fn, calls } = fakeFetch(() => ({
      json: {
        valueRanges: TAB_NAMES.map((tab) => ({
          values:
            tab === 'sessions'
              ? sessionRows.slice(1)
              : tab === 'settings'
                ? encodeSettings({ ...DEFAULT_SETTINGS, locale: 'ja' }).slice(1)
                : undefined,
        })),
      },
    }))
    const repo = new SheetsRepository('tok', 'sheet123', fn)
    const data = await repo.load()

    expect(calls).toHaveLength(1)
    expect(calls[0].url).toContain('/spreadsheets/sheet123/values:batchGet')
    expect(calls[0].url).toContain('valueRenderOption=UNFORMATTED_VALUE')
    expect(calls[0].auth).toBe('Bearer tok')
    expect(data.sessions.map((s) => s.id)).toEqual(['s1'])
    expect(data.sets).toEqual([])
    expect(data.settings.locale).toBe('ja')
  })

  it('401이면 SheetsAuthError', async () => {
    const { fn } = fakeFetch(() => ({ status: 401, json: { error: { message: 'bad' } } }))
    await expect(new SheetsRepository('tok', 'id', fn).load()).rejects.toBeInstanceOf(SheetsAuthError)
  })
})

type Row = (string | number | boolean)[]
type SheetProps = { sheetId: number; title: string }
type DriveFile = { id: string; createdTime: number; trashed?: boolean; appProperties: Record<string, string> }

const tick = () => new Promise((r) => setTimeout(r, 0))

/**
 * 상태를 가진 가짜 Google API. 요청마다 한 틱 양보해서 동시 요청이 실제처럼 섞인다.
 * fail(call)이 상태 코드를 돌려주면 그 요청은 아무것도 바꾸지 않고 실패한다.
 */
function fakeGoogle(opts: { fail?: (call: Call) => number | undefined } = {}) {
  const tabs = new Map<string, Row[]>()
  const sheets: SheetProps[] = []
  const lockCell = new Map<number, number>()
  const files: DriveFile[] = []
  const calls: Call[] = []
  let nextId = 1
  let created = 0

  const addTab = (title: string, rows: Row[] = [], sheetId = nextId++) => {
    sheets.push({ sheetId, title })
    tabs.set(title, rows)
  }
  const err = (status: number, message = 'error') => ({ status, json: { error: { message } } })

  function handle(call: Call): { status?: number; json: unknown } {
    const url = new URL(call.url)
    const path = decodeURIComponent(url.pathname)
    const body = call.body as Record<string, unknown> | undefined

    if (url.host === 'www.googleapis.com') {
      if (call.method === 'GET') {
        const live = files
          .filter((f) => !f.trashed && f.appProperties.exRecordApp === 'v1')
          .sort((a, b) => a.createdTime - b.createdTime)
        return { json: { files: live.slice(0, 1).map(({ id, appProperties }) => ({ id, appProperties })) } }
      }
      if (call.method === 'POST') {
        const id = `file${files.length + 1}`
        files.push({ id, createdTime: created++, appProperties: { ...(body!.appProperties as Record<string, string>) } })
        addTab('Sheet1')
        return { json: { id } }
      }
      const file = files.find((f) => path.endsWith(`/${f.id}`))!
      if (body!.trashed) file.trashed = true
      for (const [k, v] of Object.entries((body!.appProperties ?? {}) as Record<string, string | null>)) {
        if (v === null) delete file.appProperties[k]
        else file.appProperties[k] = v
      }
      return { json: {} }
    }

    if (path.endsWith('/values:batchGet')) {
      const ranges = url.searchParams.getAll('ranges').map((r) => r.split('!')[0])
      return { json: { valueRanges: ranges.map((t) => ({ values: (tabs.get(t) ?? []).slice(1) })) } }
    }
    if (path.endsWith('/values:batchUpdate')) {
      for (const d of body!.data as { range: string; values: Row[] }[]) {
        const t = d.range.split('!')[0]
        const rows = [...(tabs.get(t) ?? [])]
        d.values.forEach((r, i) => (rows[i] = r))
        const trimmed = rows.map((r) => r.filter((_, i) => r.slice(i).some((c) => c !== '')))
        while (trimmed.length && trimmed.at(-1)!.length === 0) trimmed.pop()
        tabs.set(t, trimmed)
      }
      return { json: {} }
    }
    if (path.includes('/values/')) {
      const lock = sheets.find((x) => x.title === LOCK_TITLE)
      return { json: lock ? { values: [[lockCell.get(lock.sheetId)]] } : {} }
    }
    if (path.endsWith(':batchUpdate')) {
      const reqs = body!.requests as Record<string, { properties?: SheetProps; sheetId?: number; start?: { sheetId: number }; rows?: { values: { userEnteredValue: { numberValue: number } }[] }[] }>[]
      // 검증 먼저: 하나라도 잘못되면 아무것도 적용하지 않는다 (실제 API와 같음)
      const titles = new Set(sheets.map((x) => x.title))
      const ids = new Set(sheets.map((x) => x.sheetId))
      for (const r of reqs) {
        if (r.addSheet) {
          if (titles.has(r.addSheet.properties!.title)) return err(400, 'already exists')
          titles.add(r.addSheet.properties!.title)
        }
        if (r.deleteSheet && !ids.has(r.deleteSheet.sheetId!)) return err(400, 'no sheet')
      }
      for (const r of reqs) {
        if (r.addSheet) addTab(r.addSheet.properties!.title, [], r.addSheet.properties!.sheetId)
        if (r.updateCells) lockCell.set(r.updateCells.start!.sheetId, r.updateCells.rows![0].values[0].userEnteredValue.numberValue)
        if (r.deleteSheet) {
          const i = sheets.findIndex((x) => x.sheetId === r.deleteSheet.sheetId)
          tabs.delete(sheets[i].title)
          sheets.splice(i, 1)
        }
      }
      return { json: {} }
    }
    if (call.method === 'GET') return { json: { sheets: sheets.map((p) => ({ properties: p })) } }
    throw new Error(`unhandled ${call.method} ${call.url}`)
  }

  const fn = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const call: Call = {
      url: String(input),
      method: init?.method ?? 'GET',
      body: init?.body ? JSON.parse(String(init.body)) : undefined,
    }
    calls.push(call)
    await tick()
    const failed = opts.fail?.(call)
    const { status = 200, json } = failed ? err(failed) : handle(call)
    return new Response(JSON.stringify(json), { status })
  }) as typeof fetch

  return { fn, calls, tabs, sheets, files, addTab, lockCell }
}

function fakeClock(start = 1_000_000): Clock & { t: number } {
  const clock = {
    t: start,
    now: () => clock.t,
    async sleep(ms: number) {
      clock.t += ms
      await tick()
    },
  }
  return clock
}

/** 데이터 탭이 갖춰진 시트 */
function seeded(opts?: Parameters<typeof fakeGoogle>[0]) {
  const g = fakeGoogle(opts)
  for (const tab of TAB_NAMES) g.addTab(tab, [])
  g.tabs.set('sessions', [...sessionRows.slice(0, 1)])
  return g
}

const sessionOp = (id: string): Op => ({
  type: 'upsertSession',
  session: { id, date: '2026-11-01', startedAt: 'a', endedAt: 'b', note: '' },
  sets: [],
})
const isLockAdd = (c: Call) =>
  c.url.endsWith(':batchUpdate') && !c.url.includes('values:') &&
  JSON.stringify(c.body ?? '').includes('"addSheet"')

describe('SheetsRepository.apply', () => {
  it('변경된 탭만 batchUpdate 한 번으로 덮어쓰고, 지우는 요청은 보내지 않는다', async () => {
    const g = seeded()
    const result = await new SheetsRepository('tok', 'sid', g.fn, fakeClock()).apply([sessionOp('s1')])

    expect(result.sessions).toHaveLength(1)
    expect(g.calls.some((c) => c.url.includes('batchClear'))).toBe(false)
    const updates = g.calls.filter((c) => c.url.includes('values:batchUpdate'))
    expect(updates).toHaveLength(1)
    expect(updates[0].body).toMatchObject({
      valueInputOption: 'RAW',
      data: [
        { range: 'sessions!A1', values: sessionRows },
        { range: 'sets!A1', values: [expect.arrayContaining(['id', 'sessionId'])] },
      ],
    })
  })

  it('기존 행이 더 많으면 남는 행을 빈 셀로 덮어쓴다', async () => {
    const g = seeded()
    const old = encodeTab('sessions', [
      { id: 's1', date: '2026-11-01', startedAt: 'a', endedAt: 'b', note: '' },
      { id: 's2', date: '2026-11-02', startedAt: 'a', endedAt: 'b', note: '' },
      { id: 's3', date: '2026-11-03', startedAt: 'a', endedAt: 'b', note: 'extra' },
    ])
    old[3].push('stray') // 사용자가 옆 칸에 적어 둔 값
    g.tabs.set('sessions', old)
    const result = await new SheetsRepository('tok', 'sid', g.fn, fakeClock()).apply([
      { type: 'deleteSession', id: 's2' },
      { type: 'deleteSession', id: 's3' },
    ])
    expect(result.sessions.map((s) => s.id)).toEqual(['s1'])

    const update = g.calls.find((c) => c.url.includes('values:batchUpdate'))!
    const sessions = (update.body as { data: { range: string; values: unknown[][] }[] }).data.find(
      (d) => d.range === 'sessions!A1',
    )!
    expect(sessions.values).toHaveLength(4) // 헤더 + 기존 3행
    expect(sessions.values.every((r) => r.length === 6)).toBe(true)
    expect(sessions.values[2]).toEqual(['', '', '', '', '', ''])
    expect(g.tabs.get('sessions')).toHaveLength(2) // 헤더 + s1, 남는 행·'stray' 모두 지워짐
    expect(g.tabs.get('sessions')!.flat()).not.toContain('stray')
  })

  it('쓰기가 실패해도 데이터는 그대로이고 잠금은 풀린다', async () => {
    const g = seeded({ fail: (c) => (c.url.includes('values:batchUpdate') ? 503 : undefined) })
    g.tabs.set('sessions', sessionRows)
    await expect(
      new SheetsRepository('tok', 'sid', g.fn, fakeClock()).apply([sessionOp('s2')]),
    ).rejects.toThrow()
    expect(g.tabs.get('sessions')).toEqual(sessionRows)
    expect(g.sheets.some((x) => x.title === LOCK_TITLE)).toBe(false)
  })

  it('잠금을 잡은 뒤 읽고 쓰고, 끝나면 푼다', async () => {
    const g = seeded()
    await new SheetsRepository('tok', 'sid', g.fn, fakeClock()).apply([sessionOp('s1')])
    const order = g.calls.map((c) =>
      isLockAdd(c) ? 'lock' : c.url.includes('batchGet') ? 'read' : c.url.includes('values:batchUpdate') ? 'write' : 'unlock',
    )
    expect(order).toEqual(['lock', 'read', 'write', 'unlock'])
    expect(g.sheets.some((x) => x.title === LOCK_TITLE)).toBe(false)
  })

  it('두 기기가 동시에 저장해도 서로의 세션을 덮어쓰지 않는다', async () => {
    const g = seeded()
    const clock = fakeClock()
    const a = new SheetsRepository('tok', 'sid', g.fn, clock)
    const b = new SheetsRepository('tok', 'sid', g.fn, clock)
    await Promise.all([a.apply([sessionOp('phone')]), b.apply([sessionOp('laptop')])])
    const ids = (await a.load()).sessions.map((s) => s.id).sort()
    expect(ids).toEqual(['laptop', 'phone'])
  })

  it('죽은 쪽이 남긴 오래된 잠금은 그 sheetId로 지우고 진행한다', async () => {
    const g = seeded()
    const clock = fakeClock()
    g.addTab(LOCK_TITLE, [], 777)
    g.lockCell.set(777, clock.t - 60_000)
    await new SheetsRepository('tok', 'sid', g.fn, clock).apply([sessionOp('s1')])
    const del = g.calls.find((c) => JSON.stringify(c.body ?? '').includes('"deleteSheet":{"sheetId":777}'))
    expect(del).toBeDefined()
    expect((await new SheetsRepository('tok', 'sid', g.fn).load()).sessions).toHaveLength(1)
  })

  it('살아 있는 잠금이 끝까지 안 풀리면 409로 포기하고 아무것도 쓰지 않는다', async () => {
    const g = seeded()
    const clock = fakeClock()
    g.addTab(LOCK_TITLE, [], 777)
    // 시계가 흘러도 잠금이 계속 새로 갱신된 것처럼 보이게
    g.lockCell.set(777, Number.MAX_SAFE_INTEGER)
    await expect(
      new SheetsRepository('tok', 'sid', g.fn, clock).apply([sessionOp('s1')]),
    ).rejects.toMatchObject({ status: 409 })
    expect(g.calls.some((c) => c.url.includes('values:batchUpdate'))).toBe(false)
    expect(g.sheets.find((x) => x.title === LOCK_TITLE)?.sheetId).toBe(777)
  })
})

describe('ensureSpreadsheet', () => {
  it('앱이 만든 시트가 있으면 그 id를 반환', async () => {
    const g = fakeGoogle()
    g.files.push({ id: 'existing', createdTime: 0, appProperties: { exRecordApp: 'v1' } })
    expect(await ensureSpreadsheet('tok', g.fn)).toBe('existing')
    expect(g.calls).toHaveLength(1)
    expect(new URL(g.calls[0].url).searchParams.get('q')).toContain("appProperties has { key='exRecordApp'")
  })

  it('없으면 표시를 단 채로 만들고, 탭/헤더/기본 운동을 채운 뒤 pending 표시를 지운다', async () => {
    const g = fakeGoogle()
    expect(await ensureSpreadsheet('tok', g.fn)).toBe('file1')

    const create = g.calls.find((c) => c.method === 'POST' && c.url.includes('/drive/v3/files'))!
    expect(create.body).toMatchObject({
      mimeType: 'application/vnd.google-apps.spreadsheet',
      appProperties: { exRecordApp: 'v1', exRecordSetup: 'pending' },
    })
    expect(g.sheets.map((x) => x.title)).toEqual([...TAB_NAMES]) // 기본 'Sheet1'은 제거
    expect(g.tabs.get('exercises')!.length).toBeGreaterThan(10)
    expect(g.files[0].appProperties).toEqual({ exRecordApp: 'v1' })
  })

  it('설정 도중 실패한 시트는 다음 로그인에서 새로 만들지 않고 이어서 마무리한다', async () => {
    let failing = true
    const g = fakeGoogle({
      fail: (c) => (failing && c.url.includes('values:batchUpdate') ? 503 : undefined),
    })
    await expect(ensureSpreadsheet('tok', g.fn)).rejects.toThrow()
    expect(g.files[0].appProperties.exRecordSetup).toBe('pending')

    failing = false
    expect(await ensureSpreadsheet('tok', g.fn)).toBe('file1')
    expect(g.files).toHaveLength(1)
    expect(g.sheets.map((x) => x.title)).toEqual([...TAB_NAMES])
    expect(g.files[0].appProperties.exRecordSetup).toBeUndefined()
  })

  it('동시에 만들어졌으면 가장 오래된 시트로 맞추고 내 것은 휴지통으로', async () => {
    const g = fakeGoogle()
    const realFn = g.fn
    let raced = false
    // 내 생성 요청 직전에 다른 기기가 먼저 만든 상황
    const fn = (async (input: RequestInfo | URL, init?: RequestInit) => {
      if (!raced && init?.method === 'POST' && String(input).includes('/drive/v3/files')) {
        raced = true
        g.files.push({ id: 'other', createdTime: -1, appProperties: { exRecordApp: 'v1' } })
      }
      return realFn(input, init)
    }) as typeof fetch
    expect(await ensureSpreadsheet('tok', fn)).toBe('other')
    expect(g.files.find((f) => f.id === 'file2')?.trashed).toBe(true)
  })
})
