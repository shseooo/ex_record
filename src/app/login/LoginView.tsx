'use client'

import { useSyncExternalStore, type ReactNode } from 'react'
import { detectLocale, translate } from '@/lib/i18n'
import { signInDev, signInWithGoogle } from './actions'

const subscribe = () => () => {}

function useT() {
  const locale = useSyncExternalStore(
    subscribe,
    () => detectLocale(navigator.languages ?? [navigator.language]),
    () => 'ko' as const,
  )
  return (k: Parameters<typeof translate>[1]) => translate(locale, k)
}

/** children: Google 로그인 아래에 붙는 추가 로그인 수단 (메모리 백엔드의 개발 로그인) */
export function LoginView({ children }: { children?: ReactNode }) {
  const t = useT()

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
        {children}
      </div>
    </main>
  )
}

/** 메모리 백엔드 전용 개발 로그인 버튼 */
export function DevLoginButton() {
  const t = useT()
  return (
    <form action={signInDev} className="mt-3">
      <button
        type="submit"
        className="flex h-12 w-full items-center justify-center rounded-lg border border-line font-medium"
      >
        {t('login.dev')}
      </button>
    </form>
  )
}
