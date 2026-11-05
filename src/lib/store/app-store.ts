import { createStore, type StoreApi } from 'zustand/vanilla'
import { persist, createJSONStorage, type PersistOptions } from 'zustand/middleware'
import { applyOps, MAX_OPS_PER_REQUEST, type Op } from '@/lib/data/ops'
import type { UserData } from '@/lib/domain/types'
import type { ActiveWorkout } from '@/lib/domain/workout'
import type { RestTimer } from '@/lib/domain/timer'

export class HttpError extends Error {
  constructor(public status: number) {
    super(`HTTP ${status}`)
  }
}

export interface Transport {
  load(): Promise<UserData>
  /**
   * 반영 후 전체 데이터. null이면 "반영됨"만 알린 것으로, 로컬(이미 낙관적으로 반영됨)을 그대로 쓴다.
   * 새 운동 저장처럼 시트 끝에 행만 붙이는 경우 서버가 전체를 다시 읽지 않으려고 null을 돌려준다.
   */
  apply(ops: Op[]): Promise<UserData | null>
}

export type SyncStatus = 'idle' | 'syncing' | 'offline' | 'unauthorized' | 'error'

export interface AppState {
  data: UserData | null
  /** 아직 서버에 반영되지 않은 쓰기 */
  pending: Op[]
  status: SyncStatus
  lastSyncedAt?: number
  workout: ActiveWorkout | null
  timer: RestTimer | null

  refresh(): Promise<void>
  dispatch(ops: Op[]): Promise<void>
  flush(): Promise<void>
  setWorkout(w: ActiveWorkout | null): void
  setTimer(t: RestTimer | null): void
  /** 로그아웃용: 진행 중인 동기화 결과를 무시하고 로컬 상태를 비운다 */
  clearLocal(): void
}

function statusFor(e: unknown): SyncStatus {
  if (e instanceof HttpError) return e.status === 401 ? 'unauthorized' : 'error'
  return 'offline' // fetch 실패(TypeError) = 네트워크 문제
}

/** 서버가 요청 자체를 거부한 경우: 다시 보내도 결과가 같으므로 큐에서 빼야 한다 */
function isRejected(e: unknown): boolean {
  return e instanceof HttpError && (e.status === 400 || e.status === 413 || e.status === 422)
}

type Persisted = Pick<AppState, 'data' | 'pending' | 'workout' | 'timer' | 'lastSyncedAt'>

export function createAppStore(
  transport: Transport,
  persistOptions?: Pick<PersistOptions<AppState, Persisted>, 'name' | 'storage' | 'skipHydration'>,
): StoreApi<AppState> {
  let inflight: Promise<void> | null = null
  /** 로컬 쓰기(dispatch)와 서버 반영 성공마다 증가. 그 사이에 받은 load 결과는 낡은 것이다. */
  let writeSeq = 0
  /** clearLocal마다 증가. 이전 세대의 비동기 결과는 상태에 쓰지 않는다. */
  let epoch = 0

  const init = (
    set: StoreApi<AppState>['setState'],
    get: StoreApi<AppState>['getState'],
  ): AppState => {
    /** @returns 서버가 거부해 버린 op가 있으면 true */
    async function flushOnce(): Promise<boolean> {
      const batch = get().pending.slice(0, MAX_OPS_PER_REQUEST)
      if (batch.length === 0) return false
      const gen = epoch
      set({ status: 'syncing' })
      try {
        const server = await transport.apply(batch)
        if (gen !== epoch) return false
        writeSeq++
        const rest = get().pending.slice(batch.length)
        set({
          pending: rest,
          data: server ? applyOps(server, rest) : get().data,
          status: 'idle',
          lastSyncedAt: Date.now(),
        })
        return false
      } catch (e) {
        if (gen !== epoch) return false
        if (isRejected(e)) {
          // 재시도해도 계속 거부되므로 버린다. 그대로 두면 큐가 영원히 막힌다.
          console.error('Server rejected ops; dropping them', batch, e)
          set({ pending: get().pending.slice(batch.length), status: 'error' })
          return true
        }
        set({ status: statusFor(e) })
        throw e
      }
    }

    /**
     * 서버 스냅샷을 받아 반영한다. 받는 동안 쓰기가 있었다면 그 스냅샷에는 새 쓰기가 빠져
     * 있을 수 있으므로 버린다 (그 쓰기의 flush 응답이 이미 더 최신 데이터를 넣었다).
     */
    async function loadIfUnchanged(keepStatus = false): Promise<boolean> {
      const seq = writeSeq
      const gen = epoch
      const server = await transport.load()
      if (seq !== writeSeq || gen !== epoch) return false
      set({
        data: applyOps(server, get().pending),
        lastSyncedAt: Date.now(),
        ...(keepStatus ? {} : { status: 'idle' as const }),
      })
      return true
    }

    async function flush() {
      if (inflight) return inflight
      if (get().pending.length === 0) return
      const run = (async () => {
        let dropped = false
        try {
          // 전송 중 쌓인 op까지 모두 비울 때까지 반복
          while (get().pending.length > 0) dropped = (await flushOnce()) || dropped
        } catch {
          /* 상태에 기록됨, 큐는 유지 */
          return
        }
        if (!dropped) return
        // 버린 op가 낙관적으로 반영된 로컬 데이터를 서버 기준으로 되돌린다
        try {
          await loadIfUnchanged(true) // 'error'는 남겨 사용자에게 알린다
        } catch {
          /* 다음 refresh에서 맞춰진다 */
        }
      })()
      inflight = run
      run.finally(() => {
        if (inflight === run) inflight = null
      })
      return run
    }

    return {
      data: null,
      pending: [],
      status: 'idle',
      workout: null,
      timer: null,

      async refresh() {
        await flush()
        if (get().pending.length > 0) return // 아직 못 보냈으면 로컬 상태 유지
        const gen = epoch
        try {
          await loadIfUnchanged()
        } catch (e) {
          if (gen === epoch) set({ status: statusFor(e) })
        }
      },

      async dispatch(ops) {
        writeSeq++
        const base = get().data
        set({
          data: base ? applyOps(base, ops) : base,
          pending: [...get().pending, ...ops],
        })
        await flush()
        // flush가 진행 중이던 경우, 그 루프가 새 op까지 처리한다
        if (get().pending.length > 0 && get().status === 'idle') await flush()
      },

      flush,
      setWorkout: (workout) => set({ workout }),
      setTimer: (timer) => set({ timer }),

      clearLocal() {
        epoch++
        writeSeq++
        inflight = null
        set({
          data: null,
          pending: [],
          status: 'idle',
          lastSyncedAt: undefined,
          workout: null,
          timer: null,
        })
      },
    }
  }

  if (!persistOptions) return createStore<AppState>()(init)

  return createStore<AppState>()(
    persist(init, {
      ...persistOptions,
      version: 1,
      partialize: (s) => ({
        data: s.data,
        pending: s.pending,
        workout: s.workout,
        timer: s.timer,
        lastSyncedAt: s.lastSyncedAt,
      }),
    }),
  )
}

export const fetchTransport: Transport = {
  async load() {
    const res = await fetch('/api/data', { cache: 'no-store' })
    if (!res.ok) throw new HttpError(res.status)
    return res.json()
  },
  async apply(ops) {
    const res = await fetch('/api/ops', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ ops }),
    })
    if (!res.ok) throw new HttpError(res.status)
    return res.json()
  },
}

export type PersistedStore = StoreApi<AppState> & {
  persist: { rehydrate: () => Promise<void> | void; clearStorage: () => void }
}

export function createBrowserStore(): PersistedStore {
  return createAppStore(fetchTransport, {
    name: 'ex-record',
    storage: createJSONStorage(() => localStorage),
    skipHydration: true,
  }) as PersistedStore
}
