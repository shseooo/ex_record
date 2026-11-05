'use client'

import { usePathname } from 'next/navigation'
import type { ReactNode } from 'react'
import { AppProvider } from './AppProvider'
import { AppShell } from './AppShell'

export function ClientRoot({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const isPublic = ['/login', '/privacy', '/about'].some((p) => pathname.startsWith(p))
  if (isPublic) return <>{children}</>
  return (
    <AppProvider>
      <AppShell>{children}</AppShell>
    </AppProvider>
  )
}
