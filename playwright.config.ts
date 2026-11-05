import { defineConfig, devices } from '@playwright/test'
import { AUTH_SECRET, BASE_URL, PORT, STORAGE_STATE } from './e2e/env'

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  reporter: 'list',
  globalSetup: './e2e/global-setup.ts',
  // 테스트용 세션 쿠키로 로그인한 상태에서 시작한다 (global-setup.ts)
  use: { baseURL: BASE_URL, trace: 'retain-on-failure', storageState: STORAGE_STATE },
  projects: [
    { name: 'mobile', use: { ...devices['Pixel 7'] } },
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
  ],
  webServer: {
    // 인증은 production과 같고, 저장소만 메모리 (Google 없이 실행)
    command: `npm run build && npx next start -p ${PORT}`,
    url: `${BASE_URL}/login`,
    timeout: 180_000,
    reuseExistingServer: false,
    env: {
      DATA_BACKEND: 'memory',
      // next start는 NODE_ENV=production이므로 메모리 백엔드를 명시적으로 허용
      ALLOW_MEMORY_BACKEND_IN_PRODUCTION: '1',
      // next start는 production이라 Auth.js가 기본으로 호스트를 신뢰하지 않음 (UntrustedHost)
      AUTH_TRUST_HOST: '1',
      AUTH_SECRET,
    },
  },
})
