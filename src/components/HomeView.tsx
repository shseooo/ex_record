'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { bodyWeightOps, useApp, useT } from '@/lib/store/use-app'
import { lastPerformance } from '@/lib/domain/history'
import { logWorkout, plannedItemsForDay, startWorkout } from '@/lib/domain/workout'
import { countSessionsInWeek, weeklyStreak } from '@/lib/domain/progress'
import { todayKey } from '@/lib/domain/dates'
import type { Weekday } from '@/lib/domain/types'
import { Button, Card, Icon, SectionTitle } from './ui'
import { SessionCard } from './SessionList'
import { SetSummary } from './SetSummary'
import { BodyWeightEditor } from './BodyWeightEditor'

export function HomeView() {
  const { t, exName, unit } = useT()
  const dispatch = useApp((s) => s.dispatch)
  const router = useRouter()
  const data = useApp((s) => s.data)
  const workout = useApp((s) => s.workout)
  const setWorkout = useApp((s) => s.setWorkout)
  if (!data) return null

  const now = new Date()
  const today = todayKey(now)
  const day = now.getDay() as Weekday
  const routine = plannedItemsForDay(data, day)
  const goal = data.settings.weeklyGoal
  const done = countSessionsInWeek(data.sessions, today)
  const streak = weeklyStreak(data.sessions, goal, today)
  const recent = [...data.sessions].reverse().slice(0, 3)

  const start = (empty = false) => {
    const w = startWorkout(data, now)
    setWorkout(empty ? { ...w, items: [] } : w)
    router.push('/workout')
  }
  const logOnly = () => {
    setWorkout(logWorkout(data, today, now))
    router.push('/workout')
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3">
        <Card>
          <p className="text-xs text-ink-3">{t('home.weekGoal', { done, goal })}</p>
          <div className="mt-2 flex gap-1" aria-hidden>
            {Array.from({ length: Math.max(goal, done) }, (_, i) => (
              <span key={i} className={`h-2 flex-1 rounded-full ${i < done ? 'bg-accent' : 'bg-surface-2'}`} />
            ))}
          </div>
          <p className="mt-2 text-2xl font-bold tabular">
            {done}
            <span className="text-base font-normal text-ink-3">/{goal}</span>
          </p>
        </Card>
        <Card>
          <p className="text-xs text-ink-3">{t('home.streakLabel')}</p>
          <p className="mt-4 text-2xl font-bold tabular">{streak}</p>
        </Card>
      </div>

      <Card>
        <SectionTitle right={<span className="text-xs text-ink-3">{t(`dayLong.${day}`)}</span>}>{t('home.today')}</SectionTitle>
        {routine.length === 0 ? (
          <p className="text-sm text-ink-3">{t('home.noRoutine')}</p>
        ) : (
          <ul className="divide-y divide-line">
            {routine.map((r) => {
              const ex = data.exercises.find((e) => e.id === r.exerciseId)
              const last = lastPerformance(data.sets, r.exerciseId)
              return (
                <li key={r.id} className="flex flex-wrap items-baseline justify-between gap-x-3 py-2 text-sm">
                  <span className="font-medium">{exName(ex)}</span>
                  {ex && (
                    <span className="flex items-baseline gap-1.5 text-xs">
                      {last && <span className="text-ink-3">{t('home.lastTime')}</span>}
                      <SetSummary
                        type={ex.type}
                        sets={
                          last
                            ? last.sets.filter((s) => !s.isWarmup)
                            : Array.from({ length: r.targetSets }, () => ({
                                weightKg: r.targetWeightKg,
                                reps: r.targetReps,
                                durationSec: r.targetDurationSec,
                                distanceKm: r.targetDistanceKm,
                              }))
                        }
                      />
                    </span>
                  )}
                </li>
              )
            })}
          </ul>
        )}
        <div className="mt-4 flex flex-col gap-2">
          {workout ? (
            <Link href="/workout" className="flex h-12 items-center justify-center rounded-lg bg-accent font-medium text-accent-ink">
              {t('home.resume')}
            </Link>
          ) : (
            <>
              {routine.length > 0 && (
                <Button variant="primary" size="lg" onClick={() => start()}>
                  <Icon name="dumbbell" /> {t('home.start')}
                </Button>
              )}
              <Button size="lg" variant={routine.length > 0 ? 'secondary' : 'primary'} onClick={() => start(true)}>
                {t('home.startEmpty')}
              </Button>
              <Button variant="ghost" onClick={logOnly}>
                <Icon name="edit" className="size-4" /> {t('home.logOnly')}
              </Button>
            </>
          )}
        </div>
      </Card>

      <Card>
        <SectionTitle>{t('progress.bodyWeight')}</SectionTitle>
        <BodyWeightEditor
          variant="quick"
          entries={data.bodyWeights}
          unit={unit}
          today={today}
          t={t}
          onSave={(entry, prev) => void dispatch(bodyWeightOps(entry, prev))}
          onDelete={(date) => void dispatch([{ type: 'deleteBodyWeight', date }])}
        />
      </Card>

      {recent.length > 0 && (
        <div>
          <SectionTitle>{t('home.recent')}</SectionTitle>
          <div className="flex flex-col gap-3">
            {recent.map((s) => (
              <SessionCard key={s.id} session={s} data={data} editable={false} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
