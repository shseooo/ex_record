import { NextResponse } from 'next/server'
import { auth } from '@/auth'

// 메모리 백엔드에서도 인증은 항상 거친다. 메모리 백엔드는 저장소만 바꾼다 (개발 로그인으로 로그인).
export const proxy = auth((req) => {
  if (!req.auth || req.auth.error) {
    return NextResponse.redirect(new URL('/login', req.nextUrl))
  }
})

export const config = {
  matcher: [
    {
      source: '/((?!api|login|_next/static|_next/image|favicon.ico|manifest.webmanifest|sw.js|icon.svg).*)',
      missing: [
        { type: 'header', key: 'next-router-prefetch' },
        { type: 'header', key: 'purpose', value: 'prefetch' },
      ],
    },
  ],
}
