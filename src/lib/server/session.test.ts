// @vitest-environment node
import { describe, it, expect, vi, beforeAll, afterEach } from 'vitest'
import { encode } from 'next-auth/jwt'

vi.mock('server-only', () => ({}))

const SECRET = 'test-secret-test-secret-test-secret-123'
const COOKIE = 'authjs.session-token'

let sessionToken: typeof import('./session').sessionToken
let mergeCookies: typeof import('./session').mergeCookies

beforeAll(async () => {
  vi.stubEnv('AUTH_SECRET', SECRET)
  vi.stubEnv('AUTH_URL', 'http://localhost:3000')
  vi.stubEnv('AUTH_GOOGLE_ID', 'cid')
  vi.stubEnv('AUTH_GOOGLE_SECRET', 'csecret')
  ;({ sessionToken, mergeCookies } = await import('./session'))
})

afterEach(() => vi.restoreAllMocks())

const nowSec = () => Math.floor(Date.now() / 1000)

async function requestWith(expiresAt: number) {
  const jwt = await encode({
    token: { access_token: 'old', expires_at: expiresAt, refresh_token: 'r1', spreadsheetId: 'sid' },
    secret: SECRET,
    salt: COOKIE,
  })
  return new Request('http://localhost:3000/api/data', { headers: { cookie: `${COOKIE}=${jwt}; other=1` } })
}

function mockGoogleToken() {
  return vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
    if (String(input) !== 'https://oauth2.googleapis.com/token') throw new Error(`unexpected ${input}`)
    return Response.json({ access_token: 'new', expires_in: 3600 })
  })
}

describe('sessionToken', () => {
  it('만료된 토큰은 한 번 갱신하고, 갱신된 세션 쿠키를 돌려준다', async () => {
    const fetchSpy = mockGoogleToken()
    const { token, setCookies } = await sessionToken(await requestWith(nowSec() - 10))

    expect(fetchSpy).toHaveBeenCalledTimes(1)
    expect(token?.access_token).toBe('new')
    expect(token?.spreadsheetId).toBe('sid')
    expect(setCookies.length).toBeGreaterThan(0)
    expect(setCookies.every((c) => c.startsWith(`${COOKIE}`))).toBe(true) // csrf 등은 내보내지 않는다

    // 브라우저가 그 쿠키를 저장한 뒤의 다음 요청은 다시 갱신하지 않는다
    const cookie = mergeCookies(`${COOKIE}=stale; other=1`, setCookies)
    const next = await sessionToken(
      new Request('http://localhost:3000/api/data', { headers: { cookie } }),
    )
    expect(fetchSpy).toHaveBeenCalledTimes(1)
    expect(next.token?.access_token).toBe('new')
  })

  it('아직 유효한 토큰은 갱신하지 않는다', async () => {
    const fetchSpy = mockGoogleToken()
    const { token } = await sessionToken(await requestWith(nowSec() + 3600))
    expect(fetchSpy).not.toHaveBeenCalled()
    expect(token?.access_token).toBe('old')
  })

  it('세션 쿠키가 없으면 null', async () => {
    const { token, setCookies } = await sessionToken(new Request('http://localhost:3000/api/data'))
    expect(token).toBeNull()
    expect(setCookies).toEqual([])
  })
})

describe('mergeCookies', () => {
  it('Set-Cookie 값으로 덮어쓰고, 만료된 쿠키는 뺀다', () => {
    expect(
      mergeCookies('a=1; b=2; c=3', [
        'a=9; Path=/; HttpOnly',
        'b=; Path=/; Max-Age=0',
        'c=x; Expires=Thu, 01 Jan 1970 00:00:00 GMT',
        'd=4; Path=/',
      ]),
    ).toBe('a=9; d=4')
  })

  it('값에 =가 들어 있어도 보존', () => {
    expect(mergeCookies(null, ['t=ab==; Path=/'])).toBe('t=ab==')
  })
})
