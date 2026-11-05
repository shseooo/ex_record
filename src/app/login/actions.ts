'use server'

import { DEV_PROVIDER_ID, signIn } from '@/auth'
import { isMemoryBackend } from '@/lib/server/backend'

export async function signInWithGoogle() {
  await signIn('google', { redirectTo: '/' })
}

/** 메모리 백엔드 전용 개발 로그인 */
export async function signInDev() {
  if (!isMemoryBackend) throw new Error('Dev sign-in is only available with the memory backend')
  await signIn(DEV_PROVIDER_ID, { redirectTo: '/' })
}
