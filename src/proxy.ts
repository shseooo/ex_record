import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { isMemoryBackend } from '@/lib/server/backend'

export const proxy = auth((req) => {
  if (isMemoryBackend) return NextResponse.next()
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
