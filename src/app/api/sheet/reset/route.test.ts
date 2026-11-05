// @vitest-environment node
import { describe, it, expect, vi, beforeAll } from 'vitest'
import { mintSessionCookie, SESSION_COOKIE } from '../../../../../test/session-cookie'

vi.mock('server-only', () => ({}))
vi.mock('next/server', async (importOriginal) => ({
  ...(await importOriginal<typeof import('next/server')>()),
  connection: async () => {},
}))

const SECRET = 'test-secret-test-secret-test-secret-123'
let RESET: (req: Request) => Promise<Response>
let OPS: (req: Request) => Promise<Response>
let DATA: (req: Request) => Promise<Response>

beforeAll(async () => {
  vi.stubEnv('NODE_ENV', 'test')
  vi.stubEnv('DATA_BACKEND', 'memory')
  vi.stubEnv('AUTH_SECRET', SECRET)
  vi.stubEnv('AUTH_URL', 'http://localhost:3000')
  ;({ POST: RESET } = await import('./route'))
  ;({ POST: OPS } = await import('../../ops/route'))
  ;({ GET: DATA } = await import('../../data/route'))
})

const url = 'http://localhost:3000'

describe('POST /api/sheet/reset', () => {
  it('로그인하지 않았으면 401', async () => {
    expect((await RESET(new Request(`${url}/api/sheet/reset`, { method: 'POST' }))).status).toBe(401)
  })

  it('본인 데이터를 기본값으로 초기화한다', async () => {
    const cookie = `${SESSION_COOKIE}=${await mintSessionCookie({ sub: 'reset-user', dev: true }, SECRET)}`
    const headers = { cookie }
    await OPS(
      new Request(`${url}/api/ops`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          ops: [{ type: 'upsertSession', session: { id: 's1', date: '2026-11-05', startedAt: 'a', endedAt: 'b', note: '' }, sets: [] }],
        }),
      }),
    )
    expect((await (await DATA(new Request(`${url}/api/data`, { headers }))).json()).sessions).toHaveLength(1)

    expect((await RESET(new Request(`${url}/api/sheet/reset`, { method: 'POST', headers }))).status).toBe(204)

    const after = await (await DATA(new Request(`${url}/api/data`, { headers }))).json()
    expect(after.sessions).toEqual([])
    expect(after.exercises.length).toBeGreaterThan(10)
  })
})
