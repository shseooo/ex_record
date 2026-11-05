import { defineConfig, devices } from '@playwright/test'

const PORT = 3100

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  reporter: 'list',
  use: { baseURL: `http://localhost:${PORT}`, trace: 'retain-on-failure' },
  projects: [
    { name: 'mobile', use: { ...devices['Pixel 7'] } },
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
  ],
  webServer: {
    // Google 없이 메모리 저장소로 실행 (production 배포에서는 무시됨)
    command: `npm run build && npx next start -p ${PORT}`,
    url: `http://localhost:${PORT}/login`,
    timeout: 180_000,
    reuseExistingServer: false,
    env: {
      DATA_BACKEND: 'memory',
      // next start는 NODE_ENV=production이므로 메모리 백엔드를 명시적으로 허용
      ALLOW_MEMORY_BACKEND_IN_PRODUCTION: '1',
      AUTH_SECRET: 'e2e-secret-e2e-secret-e2e-secret-00',
    },
  },
})
