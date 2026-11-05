'use client'

import Link from 'next/link'
import { useEffect, useState, useSyncExternalStore, useTransition } from 'react'
import type { Settings } from '@/lib/domain/types'
import { LOCALES } from '@/lib/i18n'
import { canVibrate } from '@/lib/alarm'
import { clearLocalData, useApp, useSettings, useT } from '@/lib/store/use-app'
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

  useEffect(() => {
    fetch('/api/sheet')
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => setSheetUrl(j?.url ?? null))
      .catch(() => {})
  }, [])

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
