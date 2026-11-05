'use client'

import { useEffect, useState, type ReactNode } from 'react'
import { appStore, useApp, useSettings } from '@/lib/store/use-app'

/** localStorage 복원 → 서버 동기화, 테마/언어를 <html>에 반영 */
export function AppProvider({ children }: { children: ReactNode }) {
  const [hydrated, setHydrated] = useState(false)
  const { theme, locale } = useSettings()

  useEffect(() => {
    Promise.resolve(appStore.persist.rehydrate()).then(() => {
      setHydrated(true)
      void appStore.getState().refresh()
    })
    const sync = () => void appStore.getState().flush()
    const onVisible = () => document.visibilityState === 'visible' && void appStore.getState().refresh()
    window.addEventListener('online', sync)
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      window.removeEventListener('online', sync)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [])

  useEffect(() => {
    const root = document.documentElement
    if (theme === 'system') root.removeAttribute('data-theme')
    else root.setAttribute('data-theme', theme)
    root.lang = locale
  }, [theme, locale])

  useEffect(() => {
    if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
      navigator.serviceWorker.register('/sw.js').catch(() => {})
    }
  }, [])

  const hasData = useApp((s) => s.data !== null)
  const status = useApp((s) => s.status)

  if (!hydrated || (!hasData && status !== 'unauthorized' && status !== 'offline' && status !== 'error')) {
    return <Splash />
  }
  return <>{children}</>
}

function Splash() {
  return (
    <div className="flex min-h-dvh items-center justify-center" aria-busy>
      <div className="size-8 animate-spin rounded-full border-2 border-line border-t-accent" />
    </div>
  )
}
