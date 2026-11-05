'use client'

import type { ExerciseType } from '@/lib/domain/types'
import { groupSets, uniformValue, type SetGroup } from '@/lib/domain/set-summary'
import { formatDuration } from '@/lib/domain/units'
import type { DictKey, Vars } from '@/lib/i18n'
import { useT } from '@/lib/store/use-app'
import { cx } from './ui'

type SetLike = Parameters<typeof groupSets>[1][number]

interface ViewProps {
  type: ExerciseType
  sets: SetLike[]
  t: (key: DictKey, vars?: Vars) => string
  fmtW: (kg?: number) => string
  className?: string
}

/**
 * 세트 기록 표시. 같은 무게는 한 번만 쓰고 횟수를 나열한다.
 *   60kg 10 · 10 · 8회   /   60kg 10회 × 3세트   /   -25kg 3 · 5 · 4회   /   5km 25:00
 */
export function SetSummaryView({ type, sets, t, fmtW, className }: ViewProps) {
  const groups = groupSets(type, sets)
  // 맨몸 운동에서 무게 있는 묶음과 섞이면, 무게 없는 묶음이 앞 무게에 딸린 것처럼 보이지 않게 "맨몸" 표시
  const markBodyweight = type === 'bodyweight' && groups.some((g) => g.kind === 'reps' && g.weightKg !== undefined)
  if (groups.length === 0) return <span className={cx('text-ink-3', className)}>-</span>
  return (
    <span className={cx('inline-flex flex-wrap items-baseline gap-x-3 gap-y-0.5 tabular', className)}>
      {groups.map((g, i) => (
        <span key={i} className="inline-flex items-baseline gap-1.5 whitespace-nowrap">
          <Group g={g} type={type} t={t} fmtW={fmtW} markBodyweight={markBodyweight} />
        </span>
      ))}
    </span>
  )
}

function Group({
  g,
  type,
  t,
  fmtW,
  markBodyweight,
}: {
  g: SetGroup
  type: ExerciseType
  t: ViewProps['t']
  fmtW: ViewProps['fmtW']
  markBodyweight: boolean
}) {
  const strong = 'font-semibold text-ink'
  switch (g.kind) {
    case 'reps': {
      const same = uniformValue(g.reps)
      const weight =
        g.weightKg === undefined
          ? markBodyweight
            ? t('sets.bodyweight')
            : null
          : `${type === 'bodyweight' && g.weightKg > 0 ? '+' : ''}${fmtW(g.weightKg)}`
      return (
        <>
          {weight && <span className={strong}>{weight}</span>}
          <span className="text-ink-2">
            {same !== undefined ? t('sets.repsTimes', { reps: same, n: g.reps.length }) : t('sets.reps', { list: g.reps.join(' · ') })}
          </span>
        </>
      )
    }
    case 'time': {
      const same = uniformValue(g.secs)
      return (
        <span className="text-ink-2">
          {same !== undefined
            ? t('sets.timeTimes', { time: formatDuration(same), n: g.secs.length })
            : g.secs.map(formatDuration).join(' · ')}
        </span>
      )
    }
    case 'cardio':
      return (
        <>
          {g.distanceKm !== undefined && <span className={strong}>{g.distanceKm}km</span>}
          {g.durationSec !== undefined && <span className="text-ink-2">{formatDuration(g.durationSec)}</span>}
        </>
      )
  }
}

/** 현재 언어/단위 설정을 쓰는 버전 */
export function SetSummary(props: Omit<ViewProps, 't' | 'fmtW'>) {
  const { t, fmtW } = useT()
  return <SetSummaryView {...props} t={t} fmtW={fmtW} />
}
