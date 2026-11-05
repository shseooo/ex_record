import type { Metadata, Viewport } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import './globals.css'
import { ClientRoot } from '@/components/ClientRoot'

const geistSans = Geist({ variable: '--font-geist-sans', subsets: ['latin'] })
const geistMono = Geist_Mono({ variable: '--font-geist-mono', subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'ex-record',
  description: 'Workout log backed by your own Google Sheet',
  appleWebApp: { capable: true, title: 'ex-record', statusBarStyle: 'default' },
  icons: { icon: '/icon.svg', apple: '/icon.svg' },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f6f6f4' },
    { media: '(prefers-color-scheme: dark)', color: '#111110' },
  ],
}

// 저장된 테마를 첫 페인트 전에 적용해 깜빡임 방지
const themeScript = `try{var s=JSON.parse(localStorage.getItem('ex-record')||'{}');var th=s.state&&s.state.data&&s.state.data.settings&&s.state.data.settings.theme;if(th==='light'||th==='dark')document.documentElement.setAttribute('data-theme',th);var l=s.state&&s.state.data&&s.state.data.settings&&s.state.data.settings.locale;if(l)document.documentElement.lang=l}catch(e){}`

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="ko" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-full">
        <ClientRoot>{children}</ClientRoot>
      </body>
    </html>
  )
}
