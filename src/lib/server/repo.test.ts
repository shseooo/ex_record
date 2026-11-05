// @vitest-environment node
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { JWT } from 'next-auth/jwt'
import { googleSessionToken, mintSessionCookie, SESSION_COOKIE } from '../../../test/session-cookie'

vi.mock('server-only', () => ({}))

const SECRET = 'test-secret-test-secret-test-secret-123'

async function loadRepo(env: Record<string, string | undefined>) {
  vi.resetModules()
  vi.stubEnv('NODE_ENV', 'test')
  vi.stubEnv('AUTH_SECRET', SECRET)
  vi.stubEnv('AUTH_URL', 'http://localhost:3000')
  vi.stubEnv('DATA_BACKEND', undefined)
  for (const [k, v] of Object.entries(env)) vi.stubEnv(k, v)
  const mod = await import('./repo')
  const { SheetsRepository } = await import('@/lib/data/sheets')
  const { MemoryRepository } = await import('@/lib/data/repository')
  return { ...mod, SheetsRepository, MemoryRepository }
}

const requestWith = async (token?: JWT) =>
  new Request('http://localhost:3000/api/data', {
    headers: token ? { cookie: `${SESSION_COOKIE}=${await mintSessionCookie(token, SECRET)}` } : {},
  })

afterEach(() => {
  vi.unstubAllEnvs()
})

describe('repositoryFor (Google 백엔드)', () => {
  it('Google 세션이면 본인 시트 저장소', async () => {
    const { repositoryFor, SheetsRepository } = await loadRepo({})
    const { repo } = await repositoryFor(await requestWith(googleSessionToken('u1')))
    expect(repo).toBeInstanceOf(SheetsRepository)
  })

  it('세션이 없으면 Unauthorized', async () => {
    const { repositoryFor, UnauthorizedError } = await loadRepo({})
    await expect(repositoryFor(await requestWith())).rejects.toBeInstanceOf(UnauthorizedError)
  })

  it('개발 로그인 세션은 메모리 백엔드가 아니면 거부한다', async () => {
    const { repositoryFor, UnauthorizedError } = await loadRepo({})
    await expect(repositoryFor(await requestWith({ sub: 'dev-user', dev: true }))).rejects.toBeInstanceOf(
      UnauthorizedError,
    )
  })

  it('Google 토큰 갱신에 실패한 세션은 거부한다', async () => {
    const { repositoryFor, UnauthorizedError } = await loadRepo({})
    const failed = { ...googleSessionToken('u1'), error: 'RefreshTokenError' as const }
    await expect(repositoryFor(await requestWith(failed))).rejects.toBeInstanceOf(UnauthorizedError)
  })
})

describe('repositoryFor (메모리 백엔드)', () => {
  it('세션 사용자별 메모리 저장소', async () => {
    const { repositoryFor, MemoryRepository } = await loadRepo({ DATA_BACKEND: 'memory' })
    const a1 = (await repositoryFor(await requestWith(googleSessionToken('a')))).repo
    const a2 = (await repositoryFor(await requestWith({ sub: 'a', dev: true }))).repo
    const b = (await repositoryFor(await requestWith(googleSessionToken('b')))).repo
    expect(a1).toBeInstanceOf(MemoryRepository)
    expect(a2).toBe(a1)
    expect(b).not.toBe(a1)
  })

  it('세션이 없으면 Unauthorized', async () => {
    const { repositoryFor, UnauthorizedError } = await loadRepo({ DATA_BACKEND: 'memory' })
    await expect(repositoryFor(await requestWith())).rejects.toBeInstanceOf(UnauthorizedError)
  })
})
