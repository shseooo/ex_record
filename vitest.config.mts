import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tsconfigPaths from 'vite-tsconfig-paths'

export default defineConfig({
  plugins: [tsconfigPaths(), react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
    // next-auth는 확장자 없이 'next/server'를 import한다: 번들 처리해야 실제 설정으로 테스트할 수 있다
    server: { deps: { inline: ['next-auth'] } },
  },
})
