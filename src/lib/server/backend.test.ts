import { afterEach, describe, expect, it, vi } from 'vitest'

async function load(env: Record<string, string | undefined>) {
  vi.resetModules()
  vi.stubEnv('DATA_BACKEND', undefined)
  vi.stubEnv('VERCEL_ENV', undefined)
  vi.stubEnv('ALLOW_MEMORY_BACKEND_IN_PRODUCTION', undefined)
  for (const [key, value] of Object.entries(env)) vi.stubEnv(key, value)
  return (await import('./backend')).isMemoryBackend
}

afterEach(() => {
  vi.unstubAllEnvs()
})

describe('isMemoryBackend', () => {
  it('DATA_BACKEND가 memory가 아니면 꺼진다', async () => {
    expect(await load({ NODE_ENV: 'development' })).toBe(false)
  })

  it('development에서는 DATA_BACKEND=memory만으로 켜진다', async () => {
    expect(await load({ NODE_ENV: 'development', DATA_BACKEND: 'memory' })).toBe(true)
  })

  it('production에서는 opt-in 없이 꺼진다', async () => {
    expect(await load({ NODE_ENV: 'production', DATA_BACKEND: 'memory' })).toBe(false)
  })

  it('production에서는 ALLOW_MEMORY_BACKEND_IN_PRODUCTION=1이면 켜진다', async () => {
    expect(
      await load({
        NODE_ENV: 'production',
        DATA_BACKEND: 'memory',
        ALLOW_MEMORY_BACKEND_IN_PRODUCTION: '1',
      }),
    ).toBe(true)
  })

  it('opt-in 값은 정확히 1이어야 한다', async () => {
    expect(
      await load({
        NODE_ENV: 'production',
        DATA_BACKEND: 'memory',
        ALLOW_MEMORY_BACKEND_IN_PRODUCTION: 'true',
      }),
    ).toBe(false)
  })

  it('Vercel production에서는 opt-in이 있어도 꺼진다', async () => {
    expect(
      await load({
        NODE_ENV: 'production',
        VERCEL_ENV: 'production',
        DATA_BACKEND: 'memory',
        ALLOW_MEMORY_BACKEND_IN_PRODUCTION: '1',
      }),
    ).toBe(false)
  })
})
