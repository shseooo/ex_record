import { mkdir, writeFile } from 'node:fs/promises'
import { dirname } from 'node:path'
import { googleSessionToken, mintSessionCookie, SESSION_COOKIE } from '../test/session-cookie'
import { AUTH_SECRET, E2E_USER_ID, STORAGE_STATE } from './env'

/**
 * 로그인한 상태로 E2E를 돌린다: Auth.js가 발급하는 것과 같은 Google 형태 세션 쿠키를 만들어 storageState로 저장한다.
 * 그래서 proxy 리다이렉트, 세션 복호화, jwt 콜백, API 인증이 production과 같은 경로로 실행된다.
 * (저장소만 메모리 백엔드로 바뀐다.)
 */
export default async function globalSetup() {
  const value = await mintSessionCookie(googleSessionToken(E2E_USER_ID), AUTH_SECRET)
  const state = {
    cookies: [
      {
        name: SESSION_COOKIE,
        value,
        domain: 'localhost',
        path: '/',
        expires: Math.floor(Date.now() / 1000) + 60 * 60 * 24,
        httpOnly: true,
        secure: false,
        sameSite: 'Lax' as const,
      },
    ],
    origins: [],
  }
  await mkdir(dirname(STORAGE_STATE), { recursive: true })
  await writeFile(STORAGE_STATE, JSON.stringify(state))
}
