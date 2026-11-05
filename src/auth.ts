import NextAuth from 'next-auth'
import Google from 'next-auth/providers/google'
import { ensureSpreadsheet } from '@/lib/data/sheets'
import { ensureFreshToken } from '@/lib/server/google-token'

export const GOOGLE_SCOPES = [
  'openid',
  'email',
  'profile',
  // 앱이 만든 파일에만 접근. 민감 권한이 아니라 Google 앱 심사 부담이 적다.
  'https://www.googleapis.com/auth/drive.file',
].join(' ')

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
  ],
  session: { strategy: 'jwt', maxAge: 60 * 60 * 24 * 90 },
  pages: { signIn: '/login' },
  callbacks: {
    async jwt({ token, account }) {
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
    access_token: string
    expires_at: number
    refresh_token?: string
    spreadsheetId: string
    error?: 'RefreshTokenError'
  }
}
