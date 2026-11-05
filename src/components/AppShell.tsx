'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { ReactNode } from 'react'
import { useApp, useT } from '@/lib/store/use-app'
import type { DictKey } from '@/lib/i18n'
import { RestTimerDock } from './RestTimer'
import { Icon, cx } from './ui'

const NAV: { href: string; icon: string; key: DictKey }[] = [
  { href: '/', icon: 'home', key: 'nav.home' },
  { href: '/workout', icon: 'dumbbell', key: 'nav.workout' },
  { href: '/calendar', icon: 'calendar', key: 'nav.calendar' },
  { href: '/progress', icon: 'chart', key: 'nav.progress' },
  { href: '/routine', icon: 'list', key: 'nav.routine' },
  { href: '/settings', icon: 'settings', key: 'nav.settings' },
]

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const { t } = useT()
  const hasWorkout = useApp((s) => s.workout !== null)
  const isActive = (href: string) => (href === '/' ? pathname === '/' : pathname.startsWith(href))

  return (
    <div className="min-h-dvh md:flex">
      {/* 데스크톱 사이드바 */}
      <aside className="sticky top-0 hidden h-dvh w-56 shrink-0 flex-col border-r border-line bg-surface p-3 md:flex">
        <div className="mb-6 px-2 pt-2 text-lg font-bold">{t('appName')}</div>
        <nav className="flex flex-col gap-1">
          {NAV.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className={cx(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm',
                isActive(n.href) ? 'bg-accent-soft font-semibold text-accent' : 'text-ink-2 hover:bg-surface-2',
              )}
            >
              <Icon name={n.icon} />
              {t(n.key)}
              {n.href === '/workout' && hasWorkout && <LiveDot />}
            </Link>
          ))}
        </nav>
        <div className="mt-auto">
          <SyncBadge />
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-center justify-between px-4 pt-3 md:hidden">
          <span className="font-bold">{t('appName')}</span>
          <SyncBadge />
        </div>
        <main className="mx-auto w-full max-w-3xl flex-1 px-4 pt-4 pb-40 md:pb-24">{children}</main>
      </div>

      {/* 휴식 타이머: 모바일은 하단 탭 위, 데스크톱은 우하단 */}
      <div className="fixed inset-x-3 bottom-[calc(4.25rem+env(safe-area-inset-bottom))] z-30 md:inset-x-auto md:right-6 md:bottom-6 md:w-96">
        <RestTimerDock />
      </div>

      {/* 모바일 하단 탭 */}
      <nav className="fixed inset-x-0 bottom-0 z-20 grid grid-cols-6 border-t border-line bg-surface pb-[env(safe-area-inset-bottom)] md:hidden">
        {NAV.map((n) => (
          <Link
            key={n.href}
            href={n.href}
            className={cx(
              'relative flex h-16 flex-col items-center justify-center gap-0.5 text-[11px]',
              isActive(n.href) ? 'font-semibold text-accent' : 'text-ink-3',
            )}
          >
            <Icon name={n.icon} />
            {t(n.key)}
            {n.href === '/workout' && hasWorkout && (
              <span className="absolute top-2 right-[calc(50%-14px)]">
                <LiveDot />
              </span>
            )}
          </Link>
        ))}
      </nav>
    </div>
  )
}

function LiveDot() {
  return <span className="inline-block size-2 rounded-full bg-good" aria-hidden />
}

function SyncBadge() {
  const status = useApp((s) => s.status)
  const pending = useApp((s) => s.pending.length)
  const flush = useApp((s) => s.flush)
  const { t } = useT()

  if (status === 'idle' && pending === 0) return null
  if (status === 'unauthorized') {
    return (
      <a href="/login" className="rounded-full bg-danger px-3 py-1 text-xs font-medium text-white">
        {t('sync.unauthorized')}
      </a>
    )
  }
  const label =
    status === 'syncing'
      ? t('sync.syncing')
      : status === 'error'
        ? t('sync.error')
        : t('sync.offline', { n: pending })
  return (
    <button
      type="button"
      onClick={() => void flush()}
      className="flex items-center gap-1.5 rounded-full border border-line bg-surface px-3 py-1 text-xs text-ink-2"
    >
      <Icon name="cloud" className="size-4" />
      {label}
    </button>
  )
}
