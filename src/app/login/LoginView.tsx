'use client'

import { useSyncExternalStore } from 'react'
import { detectLocale, translate } from '@/lib/i18n'
import { signInWithGoogle } from './actions'

const subscribe = () => () => {}

export function LoginView() {
  const locale = useSyncExternalStore(
    subscribe,
    () => detectLocale(navigator.languages ?? [navigator.language]),
    () => 'ko' as const,
  )
  const t = (k: Parameters<typeof translate>[1]) => translate(locale, k)

  return (
    <main className="flex min-h-dvh items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-2xl border border-line bg-surface p-6">
        <p className="text-sm font-semibold text-accent">{t('appName')}</p>
        <h1 className="mt-2 text-2xl leading-snug font-bold">{t('login.title')}</h1>
        <p className="mt-3 text-sm text-ink-2">{t('login.desc')}</p>
        <form action={signInWithGoogle} className="mt-6">
          <button
            type="submit"
            className="flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-accent font-medium text-accent-ink"
          >
            {t('login.google')}
          </button>
        </form>
      </div>
    </main>
  )
}
