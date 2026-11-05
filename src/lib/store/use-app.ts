'use client'

import { useCallback } from 'react'
import { useStore } from 'zustand'
import { createBrowserStore, type AppState } from './app-store'
import { translate, exerciseName, type DictKey, type Vars } from '@/lib/i18n'
import { DEFAULT_SETTINGS, type Exercise, type Settings } from '@/lib/domain/types'
import { formatVolume, formatWeight } from '@/lib/domain/units'

export const appStore = createBrowserStore()

/**
 * 공용 기기 대비 로그아웃 전 정리: 미전송 op는 잠깐 보내 보고, 그 뒤 진행 중인 동기화
 * 결과까지 무시하도록 상태를 비운 다음 저장소를 지운다.
 */
export async function clearLocalData(flushTimeoutMs = 3000) {
  await Promise.race([
    appStore.getState().flush(),
    new Promise((resolve) => setTimeout(resolve, flushTimeoutMs)),
  ])
  appStore.getState().clearLocal()
  appStore.persist.clearStorage()
}

export function useApp<T>(selector: (s: AppState) => T): T {
  return useStore(appStore, selector)
}

export function useSettings(): Settings {
  return useApp((s) => s.data?.settings) ?? DEFAULT_SETTINGS
}

export function useT() {
  const { locale, unit } = useSettings()
  const t = useCallback((key: DictKey, vars?: Vars) => translate(locale, key, vars), [locale])
  const exName = useCallback((ex: Pick<Exercise, 'name'> | undefined) => (ex ? exerciseName(ex, locale) : '?'), [locale])
  const fmtW = useCallback((kg: number | undefined) => formatWeight(kg, unit), [unit])
  const fmtVol = useCallback((kg: number) => formatVolume(kg, unit), [unit])
  return { t, exName, fmtW, fmtVol, locale, unit }
}
