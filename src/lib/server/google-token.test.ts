import { describe, it, expect, vi } from 'vitest'
import { ensureFreshToken, type GoogleTokenState } from './google-token'

const base: GoogleTokenState = {
  access_token: 'old',
  refresh_token: 'refresh',
  expires_at: 1_000, // epoch sec
}

describe('ensureFreshToken', () => {
  it('만료 60초 전까지는 그대로 사용', async () => {
    const fetchFn = vi.fn()
    const result = await ensureFreshToken(base, { now: 900_000, fetchFn, clientId: 'c', clientSecret: 's' })
    expect(result).toBe(base)
    expect(fetchFn).not.toHaveBeenCalled()
  })

  it('만료 임박이면 refresh_token으로 갱신 (refresh_token 미반환 시 기존 유지)', async () => {
    const fetchFn = vi.fn(async () =>
      Response.json({ access_token: 'new', expires_in: 3600 }),
    ) as unknown as typeof fetch
    const result = await ensureFreshToken(base, { now: 950_000, fetchFn, clientId: 'c', clientSecret: 's' })
    expect(result).toEqual({ access_token: 'new', refresh_token: 'refresh', expires_at: 950 + 3600 })
    const [url, init] = (fetchFn as unknown as ReturnType<typeof vi.fn>).mock.calls[0]
    expect(url).toBe('https://oauth2.googleapis.com/token')
    expect(String(init.body)).toContain('grant_type=refresh_token')
  })

  it('갱신 실패 시 error 표시', async () => {
    const fetchFn = vi.fn(async () =>
      Response.json({ error: 'invalid_grant' }, { status: 400 }),
    ) as unknown as typeof fetch
    const result = await ensureFreshToken(base, { now: 2_000_000, fetchFn, clientId: 'c', clientSecret: 's' })
    expect(result.error).toBe('RefreshTokenError')
  })

  it('refresh_token이 없으면 error', async () => {
    const result = await ensureFreshToken(
      { ...base, refresh_token: undefined },
      { now: 2_000_000, fetchFn: vi.fn(), clientId: 'c', clientSecret: 's' },
    )
    expect(result.error).toBe('RefreshTokenError')
  })
})
