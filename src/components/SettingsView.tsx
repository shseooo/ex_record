'use client'

import Link from 'next/link'
import { useEffect, useState, useSyncExternalStore, useTransition } from 'react'
import type { Settings } from '@/lib/domain/types'
import { LOCALES } from '@/lib/i18n'
import { canVibrate } from '@/lib/alarm'
import { appStore, clearLocalData, useApp, useSettings, useT } from '@/lib/store/use-app'
import { signOutAction } from '@/app/settings/actions'
import { Button, Card, Field, Icon, PageHeader, Segmented, inputClass } from './ui'

const noop = () => () => {}

export function SettingsView() {
  const { t } = useT()
  const settings = useSettings()
  const dispatch = useApp((s) => s.dispatch)
  const [sheetUrl, setSheetUrl] = useState<string | null>(null)
  const vibrate = useSyncExternalStore(noop, canVibrate, () => true)
  const [signingOut, startSignOut] = useTransition()
  const [resetting, startReset] = useTransition()

  const loadSheetUrl = () =>
    fetch('/api/sheet')
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => setSheetUrl(j?.url ?? null))
      .catch(() => {})

  useEffect(() => {
    void loadSheetUrl()
  }, [])

  const resetSheet = () => {
    if (!confirm(t('settings.resetConfirm'))) return
    startReset(async () => {
      const ok = await fetch('/api/sheet/reset', { method: 'POST' })
        .then((r) => r.ok)
        .catch(() => false)
      if (!ok) {
        alert(t('settings.resetFailed'))
        return
      }
      // 전송 대기 중인 변경, 진행 중 운동, 캐시를 모두 버리고 새 시트에서 다시 읽는다
      appStore.getState().clearLocal()
      await appStore.getState().refresh()
      await loadSheetUrl()
      alert(t('settings.resetDone'))
    })
  }

  const save = (patch: Partial<Settings>) => void dispatch([{ type: 'setSettings', settings: { ...settings, ...patch } }])

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title={t('settings.title')} />
      <Card className="flex flex-col gap-4">
        <Field group label={t('settings.language')}>
          <Segmented label={t('settings.language')} value={settings.locale} onChange={(locale) => save({ locale })} options={LOCALES} />
        </Field>
        <Field group label={t('settings.unit')}>
          <Segmented
            label={t('settings.unit')}
            value={settings.unit}
            onChange={(unit) => save({ unit })}
            options={[
              { value: 'kg', label: 'kg' },
              { value: 'lb', label: 'lb' },
            ]}
          />
        </Field>
        <Field group label={t('settings.theme')}>
          <Segmented
            label={t('settings.theme')}
            value={settings.theme}
            onChange={(theme) => save({ theme })}
            options={(['system', 'light', 'dark'] as const).map((v) => ({ value: v, label: t(`settings.theme.${v}`) }))}
          />
        </Field>
        <Field label={t('settings.weeklyGoal')}>
          <select className={inputClass} value={settings.weeklyGoal} onChange={(e) => save({ weeklyGoal: Number(e.target.value) })}>
            {[1, 2, 3, 4, 5, 6, 7].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </Field>
        {!vibrate && <p className="text-xs text-ink-3">{t('settings.vibrationUnsupported')}</p>}
      </Card>

      <Card className="flex flex-col divide-y divide-line p-0">
        <Link href="/settings/exercises" className="flex items-center justify-between px-4 py-3">
          {t('settings.exercises')} <Icon name="right" className="size-4 text-ink-3" />
        </Link>
        {sheetUrl && (
          <a href={sheetUrl} target="_blank" rel="noreferrer" className="flex items-center justify-between px-4 py-3">
            {t('settings.sheet')} <Icon name="external" className="size-4 text-ink-3" />
          </a>
        )}
        <Link href="/privacy" className="flex items-center justify-between px-4 py-3">
          {t('common.privacy')} <Icon name="right" className="size-4 text-ink-3" />
        </Link>
      </Card>

      <Card className="flex flex-col gap-2">
        <p className="text-xs text-ink-3">{t('settings.resetHint')}</p>
        <Button type="button" variant="danger" disabled={resetting} onClick={resetSheet}>
          {t('settings.resetSheet')}
        </Button>
      </Card>

      <Button
        type="button"
        variant="danger"
        className="w-full"
        disabled={signingOut}
        onClick={() =>
          startSignOut(async () => {
            await clearLocalData()
            await signOutAction()
          })
        }
      >
        {t('settings.signOut')}
      </Button>
    </div>
  )
}
