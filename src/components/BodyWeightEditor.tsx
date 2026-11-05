'use client'

import { useState } from 'react'
import type { BodyWeightEntry, WeightUnit } from '@/lib/domain/types'
import { displayWeight, toKg } from '@/lib/domain/units'
import type { DictKey, Vars } from '@/lib/i18n'
import { Button, Icon, cx, inputClass } from './ui'

interface Props {
  /** quick: 홈의 "오늘 체중" 한 줄 / full: 날짜 선택 + 최근 기록 목록(편집·삭제) */
  variant: 'quick' | 'full'
  entries: BodyWeightEntry[]
  unit: WeightUnit
  today: string
  t: (key: DictKey, vars?: Vars) => string
  /** previousDate: 편집 중이던 기록의 원래 날짜 (날짜를 바꿨으면 그 기록을 옮긴다) */
  onSave: (entry: BodyWeightEntry, previousDate?: string) => void
  onDelete: (date: string) => void
}

const RECENT = 10

function parseWeight(text: string): number | undefined {
  const n = Number(text.trim().replace(',', '.'))
  return Number.isFinite(n) && n > 0 && n < 1000 ? n : undefined
}

export function BodyWeightEditor({ variant, entries, unit, today, t, onSave, onDelete }: Props) {
  const todayEntry = entries.find((e) => e.date === today)
  const initial = variant === 'quick' && todayEntry ? displayWeight(todayEntry.weightKg, unit) : ''

  const [date, setDate] = useState(today)
  const [text, setText] = useState(initial)
  const [editing, setEditing] = useState<string | undefined>()
  const [showAll, setShowAll] = useState(false)
  // 저장 후(또는 다른 기기에서) 오늘 값이 바뀌면 홈 입력칸도 맞춘다
  const [prevInitial, setPrevInitial] = useState(initial)
  if (initial !== prevInitial) {
    setPrevInitial(initial)
    setText(initial)
  }

  const reset = () => {
    setEditing(undefined)
    setDate(today)
    setText('')
  }

  const submit = () => {
    const n = parseWeight(text)
    if (n === undefined) return
    const target = variant === 'quick' ? today : date
    onSave({ date: target, weightKg: toKg(n, unit) }, editing)
    if (variant === 'full') reset()
  }

  const sorted = [...entries].sort((a, b) => b.date.localeCompare(a.date))
  const latest = sorted[0]

  const weightInput = (
    <input
      className={cx(inputClass, 'min-w-0 flex-1 tabular')}
      inputMode="decimal"
      aria-label={variant === 'quick' ? t('bodyWeight.today') : t('progress.bodyWeight')}
      placeholder={variant === 'quick' ? t('bodyWeight.todayPlaceholder', { unit }) : unit}
      value={text}
      onChange={(e) => setText(e.target.value)}
      onFocus={(e) => e.target.select()}
    />
  )

  if (variant === 'quick') {
    return (
      <div>
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault()
            submit()
          }}
        >
          {weightInput}
          <Button type="submit" variant="primary">
            {t('common.save')}
          </Button>
        </form>
        {todayEntry && parseWeight(text) === parseWeight(initial) && (
          <p className="mt-1.5 flex items-center gap-1 text-xs text-good">
            <Icon name="check" className="size-3.5" /> {t('bodyWeight.savedToday')}
          </p>
        )}
        {!todayEntry && latest && (
          <p className="mt-1.5 text-xs text-ink-3 tabular">
            {t('bodyWeight.latest', { date: latest.date.slice(5), weight: `${displayWeight(latest.weightKg, unit)}${unit}` })}
          </p>
        )}
      </div>
    )
  }

  const shown = showAll ? sorted : sorted.slice(0, RECENT)
  return (
    <div className="flex flex-col gap-3">
      <form
        className="grid grid-cols-[auto_minmax(0,1fr)_auto] gap-2"
        onSubmit={(e) => {
          e.preventDefault()
          submit()
        }}
      >
        <input
          type="date"
          className={cx(inputClass, 'w-[9.5rem] px-2 tabular')}
          aria-label={t('workout.date')}
          value={date}
          max={today}
          onChange={(e) => e.target.value && setDate(e.target.value)}
        />
        {weightInput}
        <div className="flex gap-2">
          {editing && (
            <Button type="button" variant="ghost" onClick={reset}>
              {t('common.cancel')}
            </Button>
          )}
          <Button type="submit" variant="primary">
            {t('common.save')}
          </Button>
        </div>
      </form>

      {sorted.length > 0 && (
        <ul className="divide-y divide-line rounded-lg border border-line">
          {shown.map((e) => (
            <li
              key={e.date}
              className={cx('flex items-center justify-between gap-2 px-3 py-1.5 text-sm', editing === e.date && 'bg-accent-soft')}
            >
              <span className="text-ink-2 tabular">{e.date}</span>
              <span className="ml-auto font-semibold tabular">
                {displayWeight(e.weightKg, unit)}
                <span className="ml-0.5 text-xs font-normal text-ink-3">{unit}</span>
              </span>
              <span className="flex shrink-0">
                <button
                  type="button"
                  aria-label={t('common.edit')}
                  className="p-1.5 text-ink-3"
                  onClick={() => {
                    setEditing(e.date)
                    setDate(e.date)
                    setText(displayWeight(e.weightKg, unit))
                  }}
                >
                  <Icon name="edit" className="size-4" />
                </button>
                <button
                  type="button"
                  aria-label={t('common.delete')}
                  className="p-1.5 text-ink-3"
                  onClick={() => {
                    if (!confirm(t('common.confirmDelete'))) return
                    if (editing === e.date) reset()
                    onDelete(e.date)
                  }}
                >
                  <Icon name="trash" className="size-4" />
                </button>
              </span>
            </li>
          ))}
        </ul>
      )}
      {sorted.length > RECENT && (
        <button type="button" className="self-center text-xs text-ink-3 underline" onClick={() => setShowAll((v) => !v)}>
          {showAll ? t('bodyWeight.showLess') : t('bodyWeight.showAll', { n: sorted.length })}
        </button>
      )}
    </div>
  )
}
