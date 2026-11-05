'use client'

import { useEffect, useState } from 'react'
import type { ExerciseType, WeightUnit } from '@/lib/domain/types'
import { stopwatchSec, type DraftSet } from '@/lib/domain/workout'
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
  start?: string
  stop?: string
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
  /** 유산소 스톱워치. 주면 시작/정지 버튼이 생긴다. */
  onStopwatch?: (action: 'start' | 'stop') => void
}

/** 스톱워치가 도는 동안 1초마다 다시 그린다 */
function useNow(active: boolean): number {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (!active) return
    const tick = () => setNow(Date.now())
    const id = setInterval(tick, 1000)
    const t = setTimeout(tick, 0) // 시작 직후 바로 맞춘다
    return () => {
      clearInterval(id)
      clearTimeout(t)
    }
  }, [active])
  return now
}

const cell =
  'h-11 w-full min-w-0 rounded-lg border border-line bg-surface px-2 text-center text-base tabular outline-none focus:border-accent'

function parseNum(text: string, allowNegative = false): number | undefined {
  if (text.trim() === '') return undefined
  const n = Number(text.replace(',', '.').replace('−', '-'))
  return Number.isFinite(n) && (allowNegative || n >= 0) ? n : undefined
}

/** 입력 중 "62." 같은 중간 상태를 유지하기 위해 로컬 텍스트를 따로 둔다 */
function NumCell({
  label,
  value,
  onValue,
  decimal = true,
  allowNegative = false,
  done,
  placeholder = label,
}: {
  label: string
  placeholder?: string
  value: string
  onValue: (n: number | undefined) => void
  decimal?: boolean
  /** 맨몸 운동의 보조(어시스트) 무게용. 모바일 숫자 키패드에 '-'가 없을 수 있어 ± 버튼을 함께 둔다 */
  allowNegative?: boolean
  done: boolean
}) {
  const [text, setText] = useState(value)
  const [prev, setPrev] = useState(value)
  if (value !== prev) {
    setPrev(value)
    if (parseNum(text, allowNegative) !== parseNum(value, allowNegative)) setText(value)
  }
  const input = (
    <input
      aria-label={label}
      inputMode={decimal ? 'decimal' : 'numeric'}
      placeholder={placeholder}
      value={text}
      onChange={(e) => {
        setText(e.target.value)
        onValue(parseNum(e.target.value, allowNegative))
      }}
      onFocus={(e) => e.target.select()}
      className={cx(cell, done && 'border-transparent bg-accent-soft', allowNegative && 'pl-8')}
    />
  )
  if (!allowNegative) return input
  return (
    <div className="relative">
      {input}
      <button
        type="button"
        aria-label="±"
        title="±"
        onClick={() => {
          const n = parseNum(text, true)
          const next = n === undefined || n === 0 ? '-' : String(-n)
          setText(next)
          onValue(parseNum(next, true))
        }}
        className="absolute inset-y-1 left-1 flex w-7 items-center justify-center rounded-md text-sm font-semibold text-ink-3 hover:bg-surface-2"
      >
        ±
      </button>
    </div>
  )
}

function DurationCell({
  label,
  sec,
  onValue,
  done,
  readOnly = false,
}: {
  label: string
  sec?: number
  onValue: (n: number | undefined) => void
  done: boolean
  readOnly?: boolean
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
      readOnly={readOnly}
      onChange={(e) => setText(e.target.value)}
      onFocus={(e) => !readOnly && e.target.select()}
      onBlur={() => !readOnly && onValue(parseDuration(text))}
      className={cx(cell, done && 'border-transparent bg-accent-soft', readOnly && 'border-accent text-accent')}
    />
  )
}

export function SetRow({ index, set, type, unit, labels, onChange, onToggle, onRemove, onStopwatch }: Props) {
  const done = set.done
  const running = set.runningSince !== undefined
  const now = useNow(running)
  const weight = (
    <NumCell
      label={labels.weight}
      value={displayWeight(set.weightKg, unit)}
      onValue={(n) => onChange({ weightKg: n === undefined ? undefined : toKg(n, unit) })}
      allowNegative={type === 'bodyweight'}
      done={done}
    />
  )
  const reps = (
    <NumCell label={labels.reps} value={set.reps?.toString() ?? ''} decimal={false} onValue={(n) => onChange({ reps: n === undefined ? undefined : Math.round(n) })} done={done} />
  )
  const time = (
    <DurationCell
      label={labels.time}
      sec={running ? stopwatchSec(set, now) : set.durationSec}
      onValue={(n) => onChange({ durationSec: n })}
      done={done}
      readOnly={running}
    />
  )
  const stopwatch = onStopwatch && (
    <button
      type="button"
      onClick={() => onStopwatch(running ? 'stop' : 'start')}
      aria-label={running ? (labels.stop ?? 'stop') : (labels.start ?? 'start')}
      className={cx(
        'flex h-11 w-[5.5rem] items-center justify-center gap-1 rounded-lg border text-sm font-semibold whitespace-nowrap',
        running ? 'border-danger bg-danger text-white' : 'border-accent text-accent',
      )}
    >
      <span aria-hidden>{running ? '■' : '▶'}</span>
      {running ? (labels.stop ?? 'stop') : (labels.start ?? 'start')}
    </button>
  )
  const distance = (
    // 스톱워치 버튼이 있으면 칸이 좁아 placeholder는 단위만
    <NumCell label={labels.distance} placeholder={onStopwatch ? 'km' : undefined} value={set.distanceKm?.toString() ?? ''} onValue={(n) => onChange({ distanceKm: n })} done={done} />
  )

  const fields =
    type === 'weight' || type === 'bodyweight'
      ? [weight, reps]
      : type === 'duration'
        ? [time]
        : stopwatch
          ? [distance, time, stopwatch]
          : [distance, time]

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
      <div className={cx('grid gap-2', fields.length === 3 ? 'grid-cols-[1fr_1fr_auto]' : fields.length === 2 ? 'grid-cols-2' : 'grid-cols-1')}>
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
