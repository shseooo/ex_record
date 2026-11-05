'use client'

import { usePathname } from 'next/navigation'
import type { ReactNode } from 'react'
import { AppProvider } from './AppProvider'
import { AppShell } from './AppShell'

export function ClientRoot({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  if (pathname.startsWith('/login')) return <>{children}</>
  return (
    <AppProvider>
      <AppShell>{children}</AppShell>
    </AppProvider>
  )
}
