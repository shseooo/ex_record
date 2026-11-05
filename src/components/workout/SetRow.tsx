'use client'

import { useState } from 'react'
import type { ExerciseType, WeightUnit } from '@/lib/domain/types'
import type { DraftSet } from '@/lib/domain/workout'
import { displayWeight, formatDuration, parseDuration, toKg } from '@/lib/domain/units'
import { Icon, cx } from '../ui'

interface Labels {
  weight: string
  reps: string
  time: string
  distance: string
  done: string
  remove: string
  warmup: string
}

interface Props {
  index: number
  set: DraftSet
  type: ExerciseType
  unit: WeightUnit
  labels: Labels
  onChange: (patch: Partial<DraftSet>) => void
  onToggle: () => void
  onRemove: () => void
}

const cell =
  'h-11 w-full min-w-0 rounded-lg border border-line bg-surface px-2 text-center text-base tabular outline-none focus:border-accent'

function parseNum(text: string): number | undefined {
  if (text.trim() === '') return undefined
  const n = Number(text.replace(',', '.'))
  return Number.isFinite(n) && n >= 0 ? n : undefined
}

/** 입력 중 "62." 같은 중간 상태를 유지하기 위해 로컬 텍스트를 따로 둔다 */
function NumCell({
  label,
  value,
  onValue,
  decimal = true,
  done,
}: {
  label: string
  value: string
  onValue: (n: number | undefined) => void
  decimal?: boolean
  done: boolean
}) {
  const [text, setText] = useState(value)
  const [prev, setPrev] = useState(value)
  if (value !== prev) {
    setPrev(value)
    if (parseNum(text) !== parseNum(value)) setText(value)
  }
  return (
    <input
      aria-label={label}
      inputMode={decimal ? 'decimal' : 'numeric'}
      placeholder={label}
      value={text}
      onChange={(e) => {
        setText(e.target.value)
        onValue(parseNum(e.target.value))
      }}
      onFocus={(e) => e.target.select()}
      className={cx(cell, done && 'border-transparent bg-accent-soft')}
    />
  )
}

function DurationCell({
  label,
  sec,
  onValue,
  done,
}: {
  label: string
  sec?: number
  onValue: (n: number | undefined) => void
  done: boolean
}) {
  const formatted = sec === undefined ? '' : formatDuration(sec)
  const [text, setText] = useState(formatted)
  const [prev, setPrev] = useState(formatted)
  if (formatted !== prev) {
    setPrev(formatted)
    setText(formatted)
  }
  return (
    <input
      aria-label={label}
      inputMode="numeric"
      placeholder="m:ss"
      value={text}
      onChange={(e) => setText(e.target.value)}
      onFocus={(e) => e.target.select()}
      onBlur={() => onValue(parseDuration(text))}
      className={cx(cell, done && 'border-transparent bg-accent-soft')}
    />
  )
}

export function SetRow({ index, set, type, unit, labels, onChange, onToggle, onRemove }: Props) {
  const done = set.done
  const weight = (
    <NumCell
      label={labels.weight}
      value={displayWeight(set.weightKg, unit)}
      onValue={(n) => onChange({ weightKg: n === undefined ? undefined : toKg(n, unit) })}
      done={done}
    />
  )
  const reps = (
    <NumCell label={labels.reps} value={set.reps?.toString() ?? ''} decimal={false} onValue={(n) => onChange({ reps: n === undefined ? undefined : Math.round(n) })} done={done} />
  )
  const time = <DurationCell label={labels.time} sec={set.durationSec} onValue={(n) => onChange({ durationSec: n })} done={done} />
  const distance = (
    <NumCell label={labels.distance} value={set.distanceKm?.toString() ?? ''} onValue={(n) => onChange({ distanceKm: n })} done={done} />
  )

  const fields =
    type === 'weight' ? [weight, reps] : type === 'bodyweight' ? [weight, reps] : type === 'duration' ? [time] : [distance, time]

  return (
    <div className="grid grid-cols-[2.25rem_1fr_auto] items-center gap-2">
      <button
        type="button"
        onClick={() => onChange({ isWarmup: !set.isWarmup })}
        aria-label={String(index + 1)}
        aria-pressed={set.isWarmup}
        className={cx(
          'h-11 rounded-lg text-sm font-semibold tabular',
          set.isWarmup ? 'bg-surface-2 text-ink-3' : 'text-ink-2',
        )}
        title={labels.warmup}
      >
        {set.isWarmup ? labels.warmup : index + 1}
      </button>
      <div className={cx('grid gap-2', fields.length === 2 ? 'grid-cols-2' : 'grid-cols-1')}>
        {fields.map((f, i) => (
          <div key={i}>{f}</div>
        ))}
      </div>
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={onToggle}
          aria-label={labels.done}
          aria-pressed={done}
          className={cx(
            'flex size-11 items-center justify-center rounded-lg border',
            done ? 'border-accent bg-accent text-accent-ink' : 'border-line text-ink-3',
          )}
        >
          <Icon name="check" />
        </button>
        <button type="button" onClick={onRemove} aria-label={labels.remove} className="flex size-8 items-center justify-center text-ink-3">
          <Icon name="x" className="size-4" />
        </button>
      </div>
    </div>
  )
}
