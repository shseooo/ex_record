import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import Google from 'next-auth/providers/google'
import { ensureSpreadsheet } from '@/lib/data/sheets'
import { isMemoryBackend } from '@/lib/server/backend'
import { ensureFreshToken, hasGoogleToken } from '@/lib/server/google-token'

export const GOOGLE_SCOPES = [
  'openid',
  'email',
  'profile',
  // 앱이 만든 파일에만 접근. 민감 권한이 아니라 Google 앱 심사 부담이 적다.
  'https://www.googleapis.com/auth/drive.file',
].join(' ')

/** 메모리 백엔드 전용 개발 로그인. Google 없이 로그인 흐름 전체(세션 쿠키, proxy, API 인증)를 그대로 탄다. */
export const DEV_PROVIDER_ID = 'dev'
export const DEV_USER_ID = 'dev-user'

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Google({
      authorization: {
        params: {
          scope: GOOGLE_SCOPES,
          access_type: 'offline',
          prompt: 'consent',
          response_type: 'code',
        },
      },
    }),
    ...(isMemoryBackend
      ? [
          Credentials({
            id: DEV_PROVIDER_ID,
            name: 'Dev',
            credentials: {},
            authorize: () => (isMemoryBackend ? { id: DEV_USER_ID, name: 'Dev' } : null),
          }),
        ]
      : []),
  ],
  session: { strategy: 'jwt', maxAge: 60 * 60 * 24 * 90 },
  pages: { signIn: '/login' },
  callbacks: {
    async jwt({ token, account }) {
      if (account?.provider === DEV_PROVIDER_ID) {
        return { ...token, dev: true }
      }
      if (account) {
        if (!account.access_token || !account.expires_at) {
          throw new TypeError('Missing access_token or expires_at')
        }
        // 첫 로그인: 사용자 Drive에 기록용 시트를 찾거나 만든다
        const spreadsheetId = await ensureSpreadsheet(account.access_token)
        return {
          ...token,
          access_token: account.access_token,
          expires_at: account.expires_at,
          refresh_token: account.refresh_token,
          spreadsheetId,
        }
      }
      // 개발 로그인 세션은 메모리 백엔드에서만 유효하다. 아니면 세션을 지운다(null).
      if (token.dev) return isMemoryBackend ? token : null
      if (!hasGoogleToken(token)) return null
      return ensureFreshToken(token)
    },
    // access/refresh token은 세션(클라이언트)으로 내보내지 않는다
    async session({ session, token }) {
      session.error = token.error
      return session
    },
  },
})

declare module 'next-auth' {
  interface Session {
    error?: 'RefreshTokenError'
  }
}

declare module '@auth/core/jwt' {
  interface JWT {
    /** Google 로그인 세션에만 있다 */
    access_token?: string
    expires_at?: number
    refresh_token?: string
    spreadsheetId?: string
    error?: 'RefreshTokenError'
    /** 개발 로그인 세션 (메모리 백엔드 전용) */
    dev?: true
  }
}
