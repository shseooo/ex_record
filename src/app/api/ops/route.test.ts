// @vitest-environment node
import { describe, it, expect, vi, beforeAll } from 'vitest'
import type { JWT } from 'next-auth/jwt'
import { googleSessionToken, mintSessionCookie, SESSION_COOKIE } from '../../../../test/session-cookie'

vi.mock('server-only', () => ({}))
vi.mock('next/server', async (importOriginal) => ({
  ...(await importOriginal<typeof import('next/server')>()),
  connection: async () => {},
}))

const SECRET = 'test-secret-test-secret-test-secret-123'

let POST: (req: Request) => Promise<Response>
let GET: (req: Request) => Promise<Response>

beforeAll(async () => {
  // 실행 환경의 NODE_ENV와 무관하게 메모리 백엔드가 켜지도록 고정
  vi.stubEnv('NODE_ENV', 'test')
  vi.stubEnv('DATA_BACKEND', 'memory')
  vi.stubEnv('AUTH_SECRET', SECRET)
  vi.stubEnv('AUTH_URL', 'http://localhost:3000')
  ;({ POST } = await import('./route'))
  ;({ GET } = await import('../data/route'))
})

const cookieFor = async (token: JWT) => `${SESSION_COOKIE}=${await mintSessionCookie(token, SECRET)}`

const post = (body: unknown, cookie?: string) =>
  POST(
    new Request('http://localhost:3000/api/ops', {
      method: 'POST',
      body: JSON.stringify(body),
      headers: cookie ? { cookie } : {},
    }),
  )

const load = async (cookie?: string) =>
  GET(new Request('http://localhost:3000/api/data', { headers: cookie ? { cookie } : {} }))

const upsert = (id: string) => ({
  ops: [
    {
      type: 'upsertSession',
      session: { id, date: '2026-11-05', startedAt: 'a', endedAt: 'b', note: '' },
      sets: [],
    },
  ],
})

describe('POST /api/ops (memory backend)', () => {
  it('잘못된 요청은 400', async () => {
    const cookie = await cookieFor(googleSessionToken('u-invalid'))
    expect((await post({ ops: [{ type: 'dropTable' }] }, cookie)).status).toBe(400)
    expect((await post({}, cookie)).status).toBe(400)
    expect((await post({ ops: [{ type: 'setExercises' }] }, cookie)).status).toBe(400)
  })

  it('메모리 백엔드에서도 로그인하지 않으면 401', async () => {
    expect((await post(upsert('s0'))).status).toBe(401)
    expect((await load()).status).toBe(401)
  })

  it('ops를 적용하고 GET /api/data에 반영된다', async () => {
    const cookie = await cookieFor(googleSessionToken('u-a'))
    expect((await post(upsert('s1'), cookie)).status).toBe(200)
    const data = await (await load(cookie)).json()
    expect(data.sessions.map((s: { id: string }) => s.id)).toEqual(['s1'])
    expect(data.exercises.length).toBeGreaterThan(0)
  })

  it('메모리 저장소는 사용자별로 분리된다', async () => {
    const a = await cookieFor(googleSessionToken('u-iso-a'))
    const b = await cookieFor(googleSessionToken('u-iso-b'))
    expect((await post(upsert('only-a'), a)).status).toBe(200)
    const dataB = await (await load(b)).json()
    expect(dataB.sessions).toEqual([])
  })

  it('개발 로그인 세션도 메모리 백엔드에서는 받는다', async () => {
    const cookie = await cookieFor({ sub: 'dev-user', dev: true })
    expect((await load(cookie)).status).toBe(200)
  })
})
