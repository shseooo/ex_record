/**
 * 로컬 개발/E2E 전용: Google 없이 메모리 저장소 사용. 켜지면 인증이 꺼지므로 프로덕션에서는 켜지지 않는다.
 * - Vercel production 배포에서는 항상 무시된다.
 * - production 빌드나 production 런타임(`next start`)에서는 ALLOW_MEMORY_BACKEND_IN_PRODUCTION=1을
 *   함께 줘야만 켜진다 (E2E가 `next build && next start`로 실행되기 때문에 필요한 명시적 opt-in).
 * proxy와 API가 같은 판단을 하도록 이 한 곳에서만 정의한다.
 */

// Next는 `process.env.NODE_ENV`를 빌드 시점 값으로 인라인한다. `next build --debug-prerender`처럼
// development로 빌드한 결과를 `next start`로 띄우는 경우까지 막으려면 런타임 값도 따로 읽어야 하므로,
// 인라인되지 않도록 키를 인자로 받는 함수를 거쳐 읽는다. (별칭 `env['NODE_ENV']`는 Turbopack이 인라인한다.)
function readRuntimeEnv(name: string): string | undefined {
  return process.env[name]
}

const isProductionBuildOrRuntime =
  process.env.NODE_ENV === 'production' || readRuntimeEnv('NODE_ENV') === 'production'

export const isMemoryBackend =
  process.env.DATA_BACKEND === 'memory' &&
  process.env.VERCEL_ENV !== 'production' &&
  (!isProductionBuildOrRuntime || process.env.ALLOW_MEMORY_BACKEND_IN_PRODUCTION === '1')
