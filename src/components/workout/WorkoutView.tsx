'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { UserData, Weekday } from '@/lib/domain/types'
import {
  addExercise,
  addSet,
  completedSetCount,
  finishWorkout,
  logWorkout,
  moveExercise,
  plannedItemsForDay,
  removeExercise,
  removeSet,
  restFor,
  setWorkoutDate,
  startStopwatch,
  stopStopwatch,
  startWorkout,
  toggleDone,
  updateSet,
  type ActiveWorkout,
  type WorkoutItem,
} from '@/lib/domain/workout'
import { detectPRs, suggestNext, type PR } from '@/lib/domain/history'
import { sessionVolume, workingSetCount } from '@/lib/domain/metrics'
import { createTimer } from '@/lib/domain/timer'
import { displayWeight, formatDuration } from '@/lib/domain/units'
import { todayKey } from '@/lib/domain/dates'
import { unlockAudio } from '@/lib/alarm'
import { appStore, useApp, useT } from '@/lib/store/use-app'
import { ExercisePicker } from '../ExercisePicker'
import { PlateCalculator } from '../PlateCalculator'
import { Button, Card, Icon, PageHeader, Sheet, cx, inputClass } from '../ui'
import { SetRow } from './SetRow'
import { SetSummary } from '../SetSummary'

export function WorkoutView() {
  const { t } = useT()
  const router = useRouter()
  const data = useApp((s) => s.data)
  const workout = useApp((s) => s.workout)
  const setWorkout = useApp((s) => s.setWorkout)
  const setTimer = useApp((s) => s.setTimer)
  const dispatch = useApp((s) => s.dispatch)
  const [picker, setPicker] = useState(false)
  const [summary, setSummary] = useState<{ prs: PR[]; sets: number; volume: number } | null>(null)

  if (summary) {
    return (
      <FinishSummary
        {...summary}
        onClose={() => {
          setSummary(null)
          router.push('/')
        }}
      />
    )
  }

  if (!data) return null

  if (!workout) {
    // 홈과 같은 기준: 오늘 시작할 루틴(보관 운동 제외)이 없으면 "오늘 운동 시작"을 숨기고 빈 운동을 메인으로
    const hasRoutine = plannedItemsForDay(data, new Date().getDay() as Weekday).length > 0
    return (
      <div>
        <PageHeader title={t('nav.workout')} />
        <Card className="flex flex-col gap-2">
          {hasRoutine ? (
            <Button variant="primary" size="lg" onClick={() => setWorkout(startWorkout(data))}>
              {t('home.start')}
            </Button>
          ) : (
            <p className="text-sm text-ink-3">{t('home.noRoutine')}</p>
          )}
          <Button
            size="lg"
            variant={hasRoutine ? 'secondary' : 'primary'}
            onClick={() => setWorkout({ ...startWorkout(data), items: [] })}
          >
            {t('home.startEmpty')}
          </Button>
          <Button variant="ghost" onClick={() => setWorkout(logWorkout(data, todayKey()))}>
            <Icon name="edit" className="size-4" /> {t('home.logOnly')}
          </Button>
        </Card>
      </div>
    )
  }

  const update = (fn: (w: ActiveWorkout) => ActiveWorkout) => {
    const current = appStore.getState().workout
    if (current) setWorkout(fn(current))
  }

  const finish = async () => {
    if (completedSetCount(workout) === 0) {
      alert(t('workout.noSetsDone'))
      return
    }
    const { session, sets } = finishWorkout(workout)
    const history = data.sets.filter((s) => s.sessionId !== session.id)
    const prs = data.exercises.flatMap((ex) => detectPRs(ex, history, sets))
    setSummary({ prs, sets: workingSetCount(sets), volume: sessionVolume(sets) })
    setWorkout(null)
    setTimer(null)
    await dispatch([{ type: 'upsertSession', session, sets }])
  }

  const discard = () => {
    if (!confirm(t('workout.discardConfirm'))) return
    setWorkout(null)
    setTimer(null)
    router.push(workout.editing ? '/calendar' : '/')
  }

  return (
    <div>
      <PageHeader
        title={workout.editing ? t('workout.editTitle') : workout.log ? t('workout.logTitle') : t('workout.title')}
        right={!workout.editing && !workout.log && <Elapsed since={workout.startedAt} />}
      />
      {(workout.editing || workout.log) && (
        <label className="mb-3 flex items-center gap-2 text-sm text-ink-2">
          {t('workout.date')}
          <input
            type="date"
            className={cx(inputClass, 'w-auto flex-1 tabular')}
            value={workout.date}
            max={todayKey()}
            onChange={(e) => e.target.value && update((w) => setWorkoutDate(w, e.target.value))}
          />
        </label>
      )}

      <div className="flex flex-col gap-3">
        {workout.items.length === 0 && <p className="py-8 text-center text-ink-3">{t('workout.empty')}</p>}
        {workout.items.map((item, idx) => (
          <ExerciseCard
            key={item.key}
            item={item}
            data={data}
            workout={workout}
            isFirst={idx === 0}
            isLast={idx === workout.items.length - 1}
            update={update}
            onSetDone={(sec) => {
              // 바로 기록/편집 중에는 휴식 타이머를 띄우지 않는다
              if (workout.log || workout.editing) return
              unlockAudio()
              if (sec > 0) setTimer(createTimer(sec))
            }}
          />
        ))}

        <Button size="lg" onClick={() => setPicker(true)}>
          <Icon name="plus" /> {t('workout.addExercise')}
        </Button>

        <textarea
          className={cx(inputClass, 'h-20 py-2')}
          placeholder={t('workout.note')}
          aria-label={t('workout.note')}
          value={workout.note}
          onChange={(e) => update((w) => ({ ...w, note: e.target.value }))}
        />

        <div className="grid grid-cols-[auto_1fr] gap-2">
          <Button variant="danger" size="lg" onClick={discard}>
            {t('workout.discard')}
          </Button>
          <Button variant="primary" size="lg" onClick={finish}>
            {workout.log || workout.editing ? t('common.save') : t('workout.finish')} ({completedSetCount(workout)})
          </Button>
        </div>
      </div>

      <ExercisePicker
        open={picker}
        onClose={() => setPicker(false)}
        onPick={(ex) => update((w) => addExercise(w, ex, data.sets))}
      />
    </div>
  )
}

function ExerciseCard({
  item,
  data,
  workout,
  isFirst,
  isLast,
  update,
  onSetDone,
}: {
  item: WorkoutItem
  data: UserData
  workout: ActiveWorkout
  isFirst: boolean
  isLast: boolean
  update: (fn: (w: ActiveWorkout) => ActiveWorkout) => void
  onSetDone: (restSec: number) => void
}) {
  const { t, exName, unit } = useT()
  const [plates, setPlates] = useState(false)
  const exercise = data.exercises.find((e) => e.id === item.exerciseId)
  const suggestion = useMemo(
    () =>
      exercise && item.targetReps && !workout.editing && !workout.log
        ? suggestNext(exercise, data.sets, item.targetReps)
        : undefined,
    [exercise, item.targetReps, data.sets, workout.editing, workout.log],
  )
  // 운동을 지워서 혼자 남은 슈퍼세트 항목은 표시하지 않는다
  const inSuperset = !!item.supersetGroup && workout.items.filter((i) => i.supersetGroup === item.supersetGroup).length > 1
  if (!exercise) return null

  const labels = {
    weight: exercise.type === 'bodyweight' ? `±${unit}` : unit,
    reps: t('workout.reps'),
    time: t('workout.time'),
    distance: t('workout.distance'),
    done: `${t('workout.set')} ✓`,
    remove: t('common.delete'),
    warmup: 'W',
    start: t('workout.start'),
    stop: t('workout.stop'),
  }
  // 유산소/시간 운동은 운동 중에만 스톱워치로 잰다 (바로 기록/편집은 직접 입력)
  const live = !workout.log && !workout.editing

  const firstWeight = item.sets.find((s) => !s.done)?.weightKg ?? item.sets[0]?.weightKg

  return (
    <Card className={cx(inSuperset && 'border-l-4 border-l-accent')}>
      <div className="mb-2 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="truncate font-semibold">{exName(exercise)}</h3>
          <p className="text-xs text-ink-3">
            {t(`part.${exercise.bodyPart}`)}
            {inSuperset && ` · ${t('workout.superset')}`}
          </p>
        </div>
        <div className="flex shrink-0 items-center">
          {exercise.type === 'weight' && (
            <Button variant="ghost" size="sm" onClick={() => setPlates(true)}>
              {t('workout.plates')}
            </Button>
          )}
          <button type="button" disabled={isFirst} aria-label={t('common.up')} className="p-1.5 text-ink-3 disabled:opacity-30" onClick={() => update((w) => moveExercise(w, item.key, -1))}>
            <Icon name="up" className="size-4" />
          </button>
          <button type="button" disabled={isLast} aria-label={t('common.down')} className="p-1.5 text-ink-3 disabled:opacity-30" onClick={() => update((w) => moveExercise(w, item.key, 1))}>
            <Icon name="down" className="size-4" />
          </button>
          <button type="button" aria-label={t('common.delete')} className="p-1.5 text-ink-3" onClick={() => update((w) => removeExercise(w, item.key))}>
            <Icon name="trash" className="size-4" />
          </button>
        </div>
      </div>

      <div className="mb-3 rounded-lg bg-surface-2 px-3 py-2 text-xs text-ink-2">
        {item.last ? (
          <>
            <span className="mr-2 font-medium">{t('workout.last', { date: item.last.date.slice(5) })}</span>
            <SetSummary type={exercise.type} sets={item.last.sets.filter((s) => !s.isWarmup)} />
          </>
        ) : (
          t('workout.noLast')
        )}
        {suggestion?.increased && (
          <p className="mt-1 flex items-baseline gap-2">
            <span className="font-medium text-good">{t('workout.suggest')}</span>
            <SetSummary type={exercise.type} sets={[{ weightKg: suggestion.weightKg, reps: suggestion.reps }]} />
          </p>
        )}
      </div>

      <div className="flex flex-col gap-2">
        {item.sets.map((set, i) => (
          <SetRow
            key={set.id}
            index={i}
            set={set}
            type={exercise.type}
            unit={unit}
            labels={labels}
            onChange={(patch) => update((w) => updateSet(w, item.key, set.id, patch))}
            onToggle={() => {
              const willBeDone = !set.done
              update((w) => toggleDone(w, item.key, set.id))
              if (willBeDone) onSetDone(restFor(item, data.exercises, workout))
            }}
            onRemove={() => update((w) => removeSet(w, item.key, set.id))}
            onStopwatch={
              (exercise.type === 'cardio' || exercise.type === 'duration') && live
                ? (action) =>
                    update((w) =>
                      action === 'start' ? startStopwatch(w, item.key, set.id) : stopStopwatch(w, item.key, set.id),
                    )
                : undefined
            }
          />
        ))}
      </div>
      <Button variant="ghost" size="sm" className="mt-2 w-full" onClick={() => update((w) => addSet(w, item.key))}>
        <Icon name="plus" className="size-4" /> {t('workout.addSet')}
      </Button>

      <PlateCalculator
        open={plates}
        onClose={() => setPlates(false)}
        initial={firstWeight ? Number(displayWeight(firstWeight, unit)) : undefined}
      />
    </Card>
  )
}

function Elapsed({ since }: { since: string }) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [])
  const { t } = useT()
  return (
    <span className="flex items-center gap-1 text-sm text-ink-2 tabular">
      <Icon name="timer" className="size-4" />
      <span className="sr-only">{t('workout.elapsed')}</span>
      {formatDuration((now - new Date(since).getTime()) / 1000)}
    </span>
  )
}

function FinishSummary({ prs, sets, volume, onClose }: { prs: PR[]; sets: number; volume: number; onClose: () => void }) {
  const { t, exName, fmtW, fmtVol } = useT()
  const exercises = useApp((s) => s.data?.exercises ?? [])
  return (
    <Sheet open onClose={onClose} title={t('workout.saved')}>
      <p className="text-ink-2">{t('workout.summary', { sets, volume: fmtVol(volume) })}</p>
      {prs.length > 0 && (
        <div className="mt-4">
          <h3 className="mb-2 flex items-center gap-2 font-semibold">
            <Icon name="trophy" className="size-5 text-accent" /> {t('workout.prTitle')}
          </h3>
          <ul className="divide-y divide-line rounded-lg border border-line">
            {prs.map((pr, i) => {
              const ex = exercises.find((e) => e.id === pr.exerciseId)
              const fmt = (v: number) =>
                ex?.type === 'duration' ? formatDuration(v) : ex?.type === 'cardio' ? `${v}km` : ex?.type === 'bodyweight' ? String(v) : fmtW(v)
              return (
                <li key={i} className="flex items-center justify-between px-3 py-2 text-sm">
                  <span>
                    {exName(ex)} <span className="text-ink-3">· {t(`workout.pr.${pr.kind}`)}</span>
                  </span>
                  <span className="tabular">
                    <span className="text-ink-3">{fmt(pr.previous)} → </span>
                    <b>{fmt(pr.value)}</b>
                  </span>
                </li>
              )
            })}
          </ul>
        </div>
      )}
      <Button variant="primary" size="lg" className="mt-5 w-full" onClick={onClose}>
        {t('common.close')}
      </Button>
    </Sheet>
  )
}
