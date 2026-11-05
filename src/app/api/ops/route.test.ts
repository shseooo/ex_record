import { describe, it, expect, vi, beforeAll } from 'vitest'

vi.mock('server-only', () => ({}))
vi.mock('next/server', () => ({ connection: async () => {} }))

let POST: (req: Request) => Promise<Response>
let GET: (req: Request) => Promise<Response>

beforeAll(async () => {
  // 실행 환경의 NODE_ENV와 무관하게 메모리 백엔드가 켜지도록 고정
  vi.stubEnv('NODE_ENV', 'test')
  vi.stubEnv('DATA_BACKEND', 'memory')
  ;({ POST } = await import('./route'))
  ;({ GET } = await import('../data/route'))
})

const req = (body: unknown) =>
  new Request('http://localhost/api/ops', { method: 'POST', body: JSON.stringify(body) })

describe('POST /api/ops (memory backend)', () => {
  it('잘못된 요청은 400', async () => {
    expect((await POST(req({ ops: [{ type: 'dropTable' }] }))).status).toBe(400)
    expect((await POST(req({}))).status).toBe(400)
    expect((await POST(req({ ops: [{ type: 'setExercises' }] }))).status).toBe(400)
  })

  it('ops를 적용하고 GET /api/data에 반영된다', async () => {
    const res = await POST(
      req({
        ops: [
          {
            type: 'upsertSession',
            session: { id: 's1', date: '2026-11-05', startedAt: 'a', endedAt: 'b', note: '' },
            sets: [],
          },
        ],
      }),
    )
    expect(res.status).toBe(200)
    const data = await (await GET(new Request('http://localhost/api/data'))).json()
    expect(data.sessions.map((s: { id: string }) => s.id)).toEqual(['s1'])
    expect(data.exercises.length).toBeGreaterThan(0)
  })
})
