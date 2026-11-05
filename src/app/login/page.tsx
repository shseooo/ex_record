import { Suspense } from 'react'
import { connection } from 'next/server'
import { isMemoryBackend } from '@/lib/server/backend'
import { DevLoginButton, LoginView } from './LoginView'

export const metadata = { title: 'Sign in · ex-record' }

export default function LoginPage() {
  return (
    <LoginView>
      <Suspense fallback={null}>
        <DevLogin />
      </Suspense>
    </LoginView>
  )
}

/** 개발 로그인 노출 여부는 런타임 env로 정해지므로, 페이지는 프리렌더하고 이 부분만 요청 시점에 그린다 */
async function DevLogin() {
  await connection()
  return isMemoryBackend ? <DevLoginButton /> : null
}
