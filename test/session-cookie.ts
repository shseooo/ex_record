import { encode, type JWT } from 'next-auth/jwt'

/** Auth.js 세션 쿠키 이름 (http). https면 __Secure- 접두사가 붙는다. */
export const SESSION_COOKIE = 'authjs.session-token'

/** 하루 뒤 만료되는 Google 형태 세션 토큰 (ensureFreshToken이 갱신하지 않는다) */
export function googleSessionToken(userId: string): JWT {
  return {
    sub: userId,
    access_token: `test-access-${userId}`,
    expires_at: Math.floor(Date.now() / 1000) + 60 * 60 * 24,
    spreadsheetId: `test-sheet-${userId}`,
  }
}

/** 테스트용: Auth.js가 발급하는 것과 같은 방식으로 세션 쿠키 값을 만든다 */
export function mintSessionCookie(token: JWT, secret: string): Promise<string> {
  return encode({ token, secret, salt: SESSION_COOKIE })
}
