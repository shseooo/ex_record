'use client'

import { useRouter } from 'next/navigation'
import type { Session, UserData } from '@/lib/domain/types'
import { workoutFromSession } from '@/lib/domain/workout'
import { sessionVolume, workingSetCount } from '@/lib/domain/metrics'
import { formatDuration } from '@/lib/domain/units'
import { useApp, useT } from '@/lib/store/use-app'
import { describeSet } from './workout/WorkoutView'
import { Button, Icon } from './ui'

export function SessionCard({ session, data, editable = true }: { session: Session; data: UserData; editable?: boolean }) {
  const { t, exName, fmtW, fmtVol } = useT()
  const router = useRouter()
  const setWorkout = useApp((s) => s.setWorkout)
  const dispatch = useApp((s) => s.dispatch)
  const hasActive = useApp((s) => s.workout !== null)

  const sets = data.sets.filter((s) => s.sessionId === session.id)
  const order: string[] = []
  for (const s of sets) if (!order.includes(s.exerciseId)) order.push(s.exerciseId)
  const minutes = (new Date(session.endedAt).getTime() - new Date(session.startedAt).getTime()) / 1000

  return (
    <div className="rounded-xl border border-line bg-surface p-4">
      <div className="mb-2 flex items-center justify-between gap-2">
        <div>
          <p className="font-semibold tabular">{session.date}</p>
          <p className="text-xs text-ink-3 tabular">
            {Number.isFinite(minutes) && minutes > 0 ? formatDuration(minutes) + ' · ' : ''}
            {t('workout.summary', { sets: workingSetCount(sets), volume: fmtVol(sessionVolume(sets)) })}
          </p>
        </div>
        {editable && (
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="sm"
              aria-label={t('common.edit')}
              disabled={hasActive}
              onClick={() => {
                setWorkout(workoutFromSession(session, data.sets, data.exercises))
                router.push('/workout')
              }}
            >
              <Icon name="edit" className="size-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              aria-label={t('common.delete')}
              onClick={() => confirm(t('common.confirmDelete')) && dispatch([{ type: 'deleteSession', id: session.id }])}
            >
              <Icon name="trash" className="size-4" />
            </Button>
          </div>
        )}
      </div>
      <ul className="flex flex-col gap-1.5 text-sm">
        {order.map((id) => {
          const ex = data.exercises.find((e) => e.id === id)
          const exSets = sets.filter((s) => s.exerciseId === id && !s.isWarmup)
          return (
            <li key={id} className="flex flex-wrap justify-between gap-x-3">
              <span className="font-medium">{exName(ex)}</span>
              <span className="text-ink-2 tabular">{ex ? exSets.map((s) => describeSet(ex, s, fmtW)).join(', ') : ''}</span>
            </li>
          )
        })}
      </ul>
      {session.note && <p className="mt-2 border-t border-line pt-2 text-sm text-ink-2">{session.note}</p>}
    </div>
  )
}
