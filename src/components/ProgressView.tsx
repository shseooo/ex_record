'use client'

import { useMemo, useState } from 'react'
import { bodyWeightOps, useApp, useT } from '@/lib/store/use-app'
import { addDays, todayKey, type Granularity } from '@/lib/domain/dates'
import { bodyPartDistribution, progressSeries, volumeSeries } from '@/lib/domain/progress'
import { fromKg, formatDuration, round1 } from '@/lib/domain/units'
import type { Exercise } from '@/lib/domain/types'
import { Card, PageHeader, SectionTitle, Segmented, inputClass } from './ui'
import { BodyWeightEditor } from './BodyWeightEditor'
import { HBarList, SimpleBarChart, TrendLineChart } from './charts/Charts'

const RANGE: Record<Granularity, number | null> = { day: 90, week: 7 * 26, month: 31 * 24, year: null }

export function ProgressView() {
  const { t, exName, unit } = useT()
  const data = useApp((s) => s.data)
  const dispatch = useApp((s) => s.dispatch)
  const [g, setG] = useState<Granularity>('week')
  const [exerciseId, setExerciseId] = useState<string | null>(null)

  const today = todayKey()
  const from = RANGE[g] === null ? undefined : addDays(today, -RANGE[g]!)

  const recorded = useMemo(() => {
    if (!data) return []
    const ids = new Set(data.sets.map((s) => s.exerciseId))
    return data.exercises.filter((e) => ids.has(e.id))
  }, [data])

  const selected: Exercise | undefined =
    recorded.find((e) => e.id === exerciseId) ??
    recorded.find((e) => e.id === data?.sets.at(-1)?.exerciseId) ??
    recorded[0]

  if (!data) return null

  const isWeight = selected?.type === 'weight'
  const toDisplay = (v: number) =>
    selected?.type === 'weight' ? round1(fromKg(v, unit)) : v
  const fmtValue = (v: number) => {
    switch (selected?.type) {
      case 'weight':
        return `${v}${unit}`
      case 'bodyweight':
        return `${v}`
      case 'duration':
        return formatDuration(v)
      case 'cardio':
        return `${v}km`
      default:
        return String(v)
    }
  }
  const labelFormat = (k: string) => (g === 'year' ? k : g === 'month' ? k.slice(2).replace('-', '.') : k.slice(5).replace('-', '/'))

  const points = selected ? progressSeries(selected, data.sets, g, from) : []
  const chartData = points.map((p) => ({
    key: p.key,
    best: toDisplay(p.best),
    ...(isWeight ? { e1rm: round1(fromKg(p.e1rm, unit)) } : {}),
  }))
  const allTime = selected ? progressSeries(selected, data.sets, 'year') : []
  const allTimeBest = allTime.length ? Math.max(...allTime.map((p) => p.best)) : undefined
  const first = chartData[0]?.best
  const last = chartData.at(-1)?.best
  const delta = first !== undefined && last !== undefined ? round1(last - first) : undefined

  const vol = volumeSeries(data.sets, g, from).map((p) => ({ key: p.key, value: Math.round(fromKg(p.volume, unit)) }))
  const parts = bodyPartDistribution(
    data.sets.filter((s) => !from || s.date >= from),
    data.exercises,
  )
  const partItems = Object.entries(parts)
    .map(([k, v]) => ({ label: t(`part.${k as 'chest'}`), value: v ?? 0 }))
    .sort((a, b) => b.value - a.value)

  const bwData = data.bodyWeights
    .filter((b) => !from || b.date >= from)
    .sort((a, b) => a.date.localeCompare(b.date)) // 지난 날짜를 나중에 넣어도 선이 날짜순으로
    .map((b) => ({ key: b.date, weight: round1(fromKg(b.weightKg, unit)) }))

  const series = [
    { key: 'best', label: t('progress.best'), color: 'var(--series-1)' },
    ...(isWeight ? [{ key: 'e1rm', label: t('progress.e1rm'), color: 'var(--series-2)' }] : []),
  ]

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title={t('progress.title')} />

      <Segmented
        label="granularity"
        value={g}
        onChange={setG}
        options={[
          { value: 'day', label: t('progress.session') },
          { value: 'week', label: t('progress.weekly') },
          { value: 'month', label: t('progress.monthly') },
          { value: 'year', label: t('progress.yearly') },
        ]}
      />

      <Card>
        {recorded.length === 0 || !selected ? (
          <p className="py-8 text-center text-sm text-ink-3">{t('progress.noData')}</p>
        ) : (
          <>
            <select
              className={inputClass}
              aria-label={t('progress.exercise')}
              value={selected.id}
              onChange={(e) => setExerciseId(e.target.value)}
            >
              {recorded.map((e) => (
                <option key={e.id} value={e.id}>
                  {exName(e)}
                </option>
              ))}
            </select>

            <div className="my-4 grid grid-cols-3 gap-2">
              <Stat label={t('progress.best')} value={last !== undefined ? fmtValue(last) : '-'} />
              <Stat
                label={t('progress.change')}
                value={delta !== undefined ? `${delta > 0 ? '+' : ''}${selected.type === 'duration' ? formatDuration(delta) : fmtValue(delta)}` : '-'}
                tone={delta === undefined ? undefined : delta > 0 ? 'good' : delta < 0 ? 'bad' : undefined}
              />
              <Stat label={t('progress.prs')} value={allTimeBest !== undefined ? fmtValue(toDisplay(allTimeBest)) : '-'} />
            </div>

            {chartData.length === 0 ? (
              <p className="py-8 text-center text-sm text-ink-3">{t('progress.noData')}</p>
            ) : (
              <TrendLineChart data={chartData} series={series} format={fmtValue} labelFormat={labelFormat} />
            )}
          </>
        )}
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <SectionTitle>
            {t('progress.volume')} ({unit})
          </SectionTitle>
          {vol.length === 0 ? (
            <p className="py-6 text-center text-sm text-ink-3">{t('progress.noData')}</p>
          ) : (
            <SimpleBarChart data={vol} label={t('progress.volume')} format={(v) => `${v.toLocaleString()}${unit}`} labelFormat={labelFormat} />
          )}
        </Card>
        <Card>
          <SectionTitle>{t('progress.bodyParts')}</SectionTitle>
          {partItems.length === 0 ? (
            <p className="py-6 text-center text-sm text-ink-3">{t('progress.noData')}</p>
          ) : (
            <HBarList items={partItems} />
          )}
        </Card>
      </div>

      <Card>
        <SectionTitle>{t('progress.bodyWeight')}</SectionTitle>
        {bwData.length > 0 && (
          <div className="mb-3">
          <TrendLineChart
            data={bwData}
            series={[{ key: 'weight', label: t('progress.bodyWeight'), color: 'var(--series-1)' }]}
            format={(v) => `${v}${unit}`}
            labelFormat={(k) => k.slice(5).replace('-', '/')}
            height={180}
          />
          </div>
        )}
        <BodyWeightEditor
          variant="full"
          entries={data.bodyWeights}
          unit={unit}
          today={today}
          t={t}
          onSave={(entry, prev) => void dispatch(bodyWeightOps(entry, prev))}
          onDelete={(date) => void dispatch([{ type: 'deleteBodyWeight', date }])}
        />
      </Card>
    </div>
  )
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: 'good' | 'bad' }) {
  return (
    <div className="rounded-lg bg-surface-2 px-3 py-2">
      <p className="text-[11px] text-ink-3">{label}</p>
      <p className={`mt-0.5 truncate text-base font-bold whitespace-nowrap tabular sm:text-lg ${tone === 'good' ? 'text-good' : tone === 'bad' ? 'text-danger' : ''}`}>
        {tone === 'good' && <span aria-hidden className="text-xs">▲ </span>}
        {tone === 'bad' && <span aria-hidden className="text-xs">▼ </span>}
        {value}
      </p>
    </div>
  )
}
