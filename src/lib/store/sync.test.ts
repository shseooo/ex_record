import { describe, it, expect, vi } from 'vitest'
import { createAppStore, HttpError, type Transport } from './app-store'
import { emptyData, applyOps, MAX_OPS_PER_REQUEST, type Op } from '@/lib/data/ops'
import type { UserData } from '@/lib/domain/types'
import { createJSONStorage } from 'zustand/middleware'

const sessionOp = (id: string): Op => ({
  type: 'upsertSession',
  session: { id, date: '2026-11-05', startedAt: 'a', endedAt: 'b', note: '' },
  sets: [],
})

function fakeServer(initial: UserData = emptyData()) {
  let data = initial
  let mode: 'ok' | 'offline' | 'unauthorized' = 'ok'
  const transport: Transport = {
    load: vi.fn(async () => {
      if (mode === 'offline') throw new TypeError('Failed to fetch')
      if (mode === 'unauthorized') throw new HttpError(401)
      return structuredClone(data)
    }),
    apply: vi.fn(async (ops: Op[]) => {
      if (mode === 'offline') throw new TypeError('Failed to fetch')
      if (mode === 'unauthorized') throw new HttpError(401)
      data = applyOps(data, ops)
      return structuredClone(data)
    }),
  }
  return {
    transport,
    setMode: (m: typeof mode) => (mode = m),
    get data() {
      return data
    },
  }
}

describe('app store 동기화', () => {
  it('refresh: 서버 데이터를 불러온다', async () => {
    const server = fakeServer(applyOps(emptyData(), [sessionOp('s0')]))
    const store = createAppStore(server.transport)
    await store.getState().refresh()
    expect(store.getState().data?.sessions).toHaveLength(1)
    expect(store.getState().status).toBe('idle')
  })

  it('dispatch: 즉시 로컬에 반영(낙관적)하고 서버에 전송', async () => {
    const server = fakeServer()
    const store = createAppStore(server.transport)
    await store.getState().refresh()
    const p = store.getState().dispatch([sessionOp('s1')])
    expect(store.getState().data?.sessions.map((s) => s.id)).toEqual(['s1'])
    await p
    expect(server.data.sessions.map((s) => s.id)).toEqual(['s1'])
    expect(store.getState().pending).toEqual([])
  })

  it('서버가 데이터 없이 "반영됨"(null)만 돌려주면 로컬 데이터를 그대로 유지', async () => {
    const server = fakeServer(applyOps(emptyData(), [sessionOp('s0')]))
    const store = createAppStore(server.transport)
    await store.getState().refresh()
    vi.mocked(server.transport.apply).mockImplementationOnce(async () => null)
    await store.getState().dispatch([sessionOp('s1')])
    expect(store.getState().data?.sessions.map((s) => s.id)).toEqual(['s0', 's1'])
    expect(store.getState().pending).toEqual([])
    expect(store.getState().status).toBe('idle')
  })

  it('null 응답 뒤에도 아직 못 보낸 op는 로컬에 반영된 채로 남는다', async () => {
    const server = fakeServer()
    const store = createAppStore(server.transport)
    await store.getState().refresh()
    let release!: () => void
    vi.mocked(server.transport.apply)
      .mockImplementationOnce(() => new Promise((r) => (release = () => r(null))))
      .mockImplementation(async () => null)
    const first = store.getState().dispatch([sessionOp('a')])
    void store.getState().dispatch([sessionOp('b')]) // 첫 전송 중에 추가
    release()
    await first
    expect(store.getState().data?.sessions.map((s) => s.id)).toEqual(['a', 'b'])
  })

  it('오프라인이면 큐에 보관하고, 다시 연결되면 전송', async () => {
    const server = fakeServer()
    const store = createAppStore(server.transport)
    await store.getState().refresh()

    server.setMode('offline')
    await store.getState().dispatch([sessionOp('s1')])
    await store.getState().dispatch([sessionOp('s2')])
    expect(store.getState().status).toBe('offline')
    expect(store.getState().pending).toHaveLength(2)
    expect(store.getState().data?.sessions).toHaveLength(2)

    server.setMode('ok')
    await store.getState().flush()
    expect(store.getState().pending).toEqual([])
    expect(server.data.sessions.map((s) => s.id)).toEqual(['s1', 's2'])
    expect(store.getState().status).toBe('idle')
  })

  it('refresh 시 남은 큐를 먼저 보내고 불러온다', async () => {
    const server = fakeServer()
    const store = createAppStore(server.transport)
    server.setMode('offline')
    await store.getState().dispatch([sessionOp('s1')])
    server.setMode('ok')
    await store.getState().refresh()
    expect(store.getState().data?.sessions.map((s) => s.id)).toEqual(['s1'])
  })

  it('401이면 unauthorized 상태, 큐 유지', async () => {
    const server = fakeServer()
    const store = createAppStore(server.transport)
    await store.getState().refresh()
    server.setMode('unauthorized')
    await store.getState().dispatch([sessionOp('s1')])
    expect(store.getState().status).toBe('unauthorized')
    expect(store.getState().pending).toHaveLength(1)
  })

  it('전송 중 추가된 op는 서버 응답 위에 다시 적용되고 이어서 전송', async () => {
    const server = fakeServer()
    const store = createAppStore(server.transport)
    await store.getState().refresh()
    const first = store.getState().dispatch([sessionOp('s1')])
    const second = store.getState().dispatch([sessionOp('s2')])
    await Promise.all([first, second])
    await store.getState().flush()
    expect(server.data.sessions.map((s) => s.id)).toEqual(['s1', 's2'])
    expect(store.getState().data?.sessions.map((s) => s.id)).toEqual(['s1', 's2'])
    expect(store.getState().pending).toEqual([])
  })

  it('큐가 요청 한도보다 길면 나눠서 보낸다', async () => {
    const server = fakeServer()
    const store = createAppStore(server.transport)
    await store.getState().refresh()
    server.setMode('offline')
    const ops = Array.from({ length: MAX_OPS_PER_REQUEST * 2 + 5 }, (_, i) => sessionOp(`s${i}`))
    await store.getState().dispatch(ops)
    expect(store.getState().pending).toHaveLength(ops.length)

    server.setMode('ok')
    await store.getState().flush()
    const sizes = vi.mocked(server.transport.apply).mock.calls.map(([batch]) => batch.length)
    expect(sizes.every((n) => n <= MAX_OPS_PER_REQUEST)).toBe(true)
    expect(store.getState().pending).toEqual([])
    expect(server.data.sessions).toHaveLength(ops.length)
  })

  it('서버가 400으로 거부한 묶음은 버리고 서버 데이터로 되돌린다', async () => {
    const server = fakeServer()
    const store = createAppStore(server.transport)
    await store.getState().refresh()
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.mocked(server.transport.apply).mockRejectedValueOnce(new HttpError(400))

    await store.getState().dispatch([sessionOp('bad')])
    expect(store.getState().pending).toEqual([])
    expect(store.getState().status).toBe('error')
    expect(store.getState().data?.sessions).toEqual([]) // 낙관적 반영 취소

    // 막히지 않고 이후 op는 정상 전송
    await store.getState().dispatch([sessionOp('s1')])
    expect(server.data.sessions.map((s) => s.id)).toEqual(['s1'])
    expect(store.getState().status).toBe('idle')
    errorSpy.mockRestore()
  })

  it('5xx는 거부가 아니므로 큐를 유지한다', async () => {
    const server = fakeServer()
    const store = createAppStore(server.transport)
    await store.getState().refresh()
    vi.mocked(server.transport.apply).mockRejectedValueOnce(new HttpError(502))
    await store.getState().dispatch([sessionOp('s1')])
    expect(store.getState().pending).toHaveLength(1)
    expect(store.getState().status).toBe('error')
  })

  it('refresh가 불러오는 동안 저장이 끝나면, 낡은 스냅샷으로 덮어쓰지 않는다', async () => {
    const server = fakeServer()
    const store = createAppStore(server.transport)
    await store.getState().refresh()

    // load가 저장 이전 시점의 스냅샷을 들고 늦게 돌아오는 상황
    let release!: () => void
    const stale = structuredClone(server.data)
    vi.mocked(server.transport.load).mockImplementationOnce(
      () => new Promise((r) => (release = () => r(stale))),
    )
    const refreshing = store.getState().refresh()
    await Promise.resolve()
    await store.getState().dispatch([sessionOp('s1')])
    expect(store.getState().pending).toEqual([])
    release()
    await refreshing

    expect(store.getState().data?.sessions.map((s) => s.id)).toEqual(['s1'])
  })

  it('clearLocal: 진행 중이던 전송 결과가 비운 상태를 되살리지 않는다', async () => {
    const server = fakeServer()
    const store = createAppStore(server.transport)
    await store.getState().refresh()

    let release!: () => void
    vi.mocked(server.transport.apply).mockImplementationOnce(
      async (ops) =>
        new Promise((r) => (release = () => r(applyOps(server.data, ops)))),
    )
    const sending = store.getState().dispatch([sessionOp('s1')])
    store.getState().clearLocal()
    release()
    await sending

    expect(store.getState().data).toBeNull()
    expect(store.getState().pending).toEqual([])
    expect(store.getState().status).toBe('idle')
  })

  it('clearLocal 후 저장소에 이전 사용자 데이터가 남지 않는다', async () => {
    const mem = new Map<string, string>()
    const storage = {
      getItem: (k: string) => mem.get(k) ?? null,
      setItem: (k: string, v: string) => void mem.set(k, v),
      removeItem: (k: string) => void mem.delete(k),
    }
    const server = fakeServer()
    let release!: () => void
    vi.mocked(server.transport.apply).mockImplementationOnce(
      async (ops) => new Promise((r) => (release = () => r(applyOps(server.data, ops)))),
    )
    const store = createAppStore(server.transport, {
      name: 'ex-record',
      storage: createJSONStorage(() => storage),
    }) as ReturnType<typeof createAppStore> & { persist: { clearStorage: () => void } }

    await store.getState().refresh()
    const sending = store.getState().dispatch([sessionOp('s1')])
    store.getState().clearLocal()
    store.persist.clearStorage()
    release()
    await sending

    const saved = mem.get('ex-record')
    const state = saved ? JSON.parse(saved).state : null
    expect(state?.data ?? null).toBeNull()
    expect(state?.pending ?? []).toEqual([])
  })
})
