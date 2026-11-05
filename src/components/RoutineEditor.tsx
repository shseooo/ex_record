'use client'

import { useState } from 'react'
import type { Exercise, RoutineItem, Weekday, WeightUnit } from '@/lib/domain/types'
import { copyDay, itemsForDay, reorder } from '@/lib/domain/routine'
import { newId } from '@/lib/domain/id'
import { displayWeight, toKg } from '@/lib/domain/units'
import type { DictKey, Vars } from '@/lib/i18n'
import { Button, Icon, Segmented, cx } from './ui'

interface Props {
  routine: RoutineItem[]
  exercises: Exercise[]
  initialDay: Weekday
  dayLabels: string[]
  unit: WeightUnit
  exName: (e: Exercise) => string
  t: (key: DictKey, vars?: Vars) => string
  onSave: (routine: RoutineItem[]) => void
  /** 운동 선택 UI를 열고, 고른 운동으로 콜백 */
  onPickExercise: (cb: (ex: Exercise) => void) => void
}

const DAYS: Weekday[] = [1, 2, 3, 4, 5, 6, 0]
const small =
  'h-9 w-full min-w-0 rounded-md border border-line bg-surface px-1 text-center text-sm tabular outline-none focus:border-accent'

const num = (v: string) => (v.trim() === '' || Number.isNaN(Number(v)) ? undefined : Number(v))

export function RoutineEditor({ routine, exercises, initialDay, dayLabels, unit, exName, t, onSave, onPickExercise }: Props) {
  const [draft, setDraft] = useState(routine)
  const [base, setBase] = useState(routine)
  const [day, setDay] = useState<Weekday>(initialDay)
  if (routine !== base) {
    // 서버에서 새 데이터가 오면 초안 리셋
    setBase(routine)
    setDraft(routine)
  }
  const dirty = draft !== routine
  const items = itemsForDay(draft, day)

  const patch = (id: string, p: Partial<RoutineItem>) =>
    setDraft((d) => d.map((i) => (i.id === id ? { ...i, ...p } : i)))

  const add = (ex: Exercise) =>
    setDraft((d) => [
      ...d,
      {
        id: newId(),
        day,
        order: itemsForDay(d, day).length,
        exerciseId: ex.id,
        targetSets: 3,
        targetReps: ex.type === 'weight' || ex.type === 'bodyweight' ? 10 : undefined,
        targetDurationSec: ex.type === 'duration' ? 60 : undefined,
      },
    ])

  const toggleSuperset = (idx: number) => {
    const cur = items[idx]
    const prev = items[idx - 1]
    if (!prev) return
    if (cur.supersetGroup && cur.supersetGroup === prev.supersetGroup) {
      patch(cur.id, { supersetGroup: undefined })
    } else {
      const g = prev.supersetGroup ?? newId()
      setDraft((d) => d.map((i) => (i.id === prev.id || i.id === cur.id ? { ...i, supersetGroup: g } : i)))
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <Segmented
        label="day"
        value={day}
        onChange={setDay}
        options={DAYS.map((d) => ({ value: d, label: dayLabels[d] }))}
      />

      <div className="flex items-center gap-2">
        <Icon name="copy" className="size-4 shrink-0 text-ink-3" />
        <select
          aria-label={t('routine.copyFrom')}
          className="h-9 flex-1 rounded-lg border border-line bg-surface px-2 text-sm"
          value=""
          onChange={(e) => {
            const from = Number(e.target.value) as Weekday
            if (Number.isNaN(from)) return
            if (!confirm(t('routine.copyConfirm', { from: dayLabels[from], to: dayLabels[day] }))) return
            setDraft((d) => copyDay(d, from, day))
          }}
        >
          <option value="">{t('routine.copyFrom')}</option>
          {DAYS.filter((d) => d !== day && itemsForDay(draft, d).length > 0).map((d) => (
            <option key={d} value={d}>
              {dayLabels[d]} ({itemsForDay(draft, d).length})
            </option>
          ))}
        </select>
      </div>

      {items.length === 0 ? (
        <p className="py-6 text-center text-sm text-ink-3">{t('routine.empty')}</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {items.map((item, idx) => {
            const ex = exercises.find((e) => e.id === item.exerciseId)
            if (!ex) return null
            const linked = idx > 0 && !!item.supersetGroup && item.supersetGroup === items[idx - 1].supersetGroup
            return (
              <li key={item.id} className={cx('rounded-xl border border-line bg-surface p-3', item.supersetGroup && 'border-l-4 border-l-accent')}>
                <div className="mb-2 flex items-center justify-between gap-2">
                  <span className="truncate font-medium">{exName(ex)}</span>
                  <div className="flex shrink-0 items-center">
                    <button type="button" aria-label={t('common.up')} disabled={idx === 0} className="p-1.5 text-ink-3 disabled:opacity-30" onClick={() => setDraft((d) => reorder(d, day, item.id, -1))}>
                      <Icon name="up" className="size-4" />
                    </button>
                    <button type="button" aria-label={t('common.down')} disabled={idx === items.length - 1} className="p-1.5 text-ink-3 disabled:opacity-30" onClick={() => setDraft((d) => reorder(d, day, item.id, 1))}>
                      <Icon name="down" className="size-4" />
                    </button>
                    <button type="button" aria-label={t('common.delete')} className="p-1.5 text-ink-3" onClick={() => setDraft((d) => d.filter((i) => i.id !== item.id))}>
                      <Icon name="trash" className="size-4" />
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-4 gap-2 text-[11px] text-ink-3">
                  <label className="flex flex-col gap-0.5">
                    {t('routine.sets')}
                    <input aria-label={t('routine.sets')} inputMode="numeric" className={small} value={item.targetSets} onChange={(e) => patch(item.id, { targetSets: Math.max(1, num(e.target.value) ?? 1) })} />
                  </label>
                  {(ex.type === 'weight' || ex.type === 'bodyweight') && (
                    <label className="flex flex-col gap-0.5">
                      {t('routine.reps')}
                      <input aria-label={t('routine.reps')} inputMode="numeric" className={small} value={item.targetReps ?? ''} onChange={(e) => patch(item.id, { targetReps: num(e.target.value) })} />
                    </label>
                  )}
                  {ex.type === 'weight' && (
                    <label className="flex flex-col gap-0.5">
                      {unit}
                      <input
                        aria-label={unit}
                        inputMode="decimal"
                        className={small}
                        defaultValue={displayWeight(item.targetWeightKg, unit)}
                        onBlur={(e) => {
                          const n = num(e.target.value)
                          patch(item.id, { targetWeightKg: n === undefined ? undefined : toKg(n, unit) })
                        }}
                      />
                    </label>
                  )}
                  {ex.type === 'duration' && (
                    <label className="flex flex-col gap-0.5">
                      {t('workout.time')}(s)
                      <input aria-label={t('workout.time')} inputMode="numeric" className={small} value={item.targetDurationSec ?? ''} onChange={(e) => patch(item.id, { targetDurationSec: num(e.target.value) })} />
                    </label>
                  )}
                  <label className="flex flex-col gap-0.5">
                    {t('routine.rest')}
                    <input aria-label={t('routine.rest')} inputMode="numeric" className={small} placeholder={String(ex.defaultRestSec)} value={item.restSec ?? ''} onChange={(e) => patch(item.id, { restSec: num(e.target.value) })} />
                  </label>
                </div>
                {idx > 0 && (
                  <label className="mt-2 flex items-center gap-2 text-xs text-ink-2">
                    <input type="checkbox" checked={linked} onChange={() => toggleSuperset(idx)} className="accent-[var(--accent)]" />
                    {t('routine.supersetWithPrev')}
                  </label>
                )}
              </li>
            )
          })}
        </ul>
      )}

      <Button onClick={() => onPickExercise(add)}>
        <Icon name="plus" /> {t('workout.addExercise')}
      </Button>

      <div className="sticky bottom-[calc(4rem+env(safe-area-inset-bottom))] z-10 -mx-4 grid grid-cols-[auto_1fr] gap-2 border-t border-line bg-bg px-4 py-3 md:bottom-0 md:mx-0 md:px-0">
        <Button variant="ghost" disabled={!dirty} onClick={() => setDraft(routine)}>
          {t('common.cancel')}
        </Button>
        <Button variant="primary" disabled={!dirty} onClick={() => onSave(draft)}>
          {t('common.save')}
        </Button>
      </div>
    </div>
  )
}
