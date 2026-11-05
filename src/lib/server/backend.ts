/**
 * 로컬 개발/E2E 전용: Google 없이 메모리 저장소 사용. 켜지면 인증이 꺼지므로 프로덕션에서는 켜지지 않는다.
 * - Vercel production 배포에서는 항상 무시된다.
 * - production 빌드(NODE_ENV=production)에서는 ALLOW_MEMORY_BACKEND_IN_PRODUCTION=1을 함께 줘야만 켜진다
 *   (E2E가 `next build && next start`로 실행되기 때문에 필요한 명시적 opt-in).
 * proxy와 API가 같은 판단을 하도록 이 한 곳에서만 정의한다.
 */
export const isMemoryBackend =
  process.env.DATA_BACKEND === 'memory' &&
  process.env.VERCEL_ENV !== 'production' &&
  (process.env.NODE_ENV !== 'production' ||
    process.env.ALLOW_MEMORY_BACKEND_IN_PRODUCTION === '1')
