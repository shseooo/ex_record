/**
 * 로컬 개발/E2E 전용: Google 없이 메모리 저장소 사용. 프로덕션에서는 켜지지 않는다.
 * proxy와 API가 같은 판단을 하도록 이 한 곳에서만 정의한다.
 */
export const isMemoryBackend =
  process.env.DATA_BACKEND === 'memory' && process.env.VERCEL_ENV !== 'production'
