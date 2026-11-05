'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useApp, useT } from '@/lib/store/use-app'
import { todayKey } from '@/lib/domain/dates'
import { logWorkout } from '@/lib/domain/workout'
import { workoutDays } from '@/lib/domain/progress'
import { MonthCalendar } from './MonthCalendar'
import { SessionCard } from './SessionList'
import { Button, Card, Icon, PageHeader } from './ui'

export function CalendarView() {
  const { t } = useT()
  const data = useApp((s) => s.data)
  const hasActive = useApp((s) => s.workout !== null)
  const setWorkout = useApp((s) => s.setWorkout)
  const router = useRouter()
  const today = todayKey()
  const [selected, setSelected] = useState(today)
  const [ym, setYm] = useState(() => ({ y: new Date().getFullYear(), m: new Date().getMonth() }))
  const marked = useMemo(() => workoutDays(data?.sessions ?? []), [data?.sessions])
  if (!data) return null

  const prefix = `${ym.y}-${String(ym.m + 1).padStart(2, '0')}`
  const monthCount = data.sessions.filter((s) => s.date.startsWith(prefix)).length
  const daySessions = data.sessions.filter((s) => s.date === selected)
  const weekdays = [0, 1, 2, 3, 4, 5, 6].map((d) => t(`day.${d as 0}`))

  return (
    <div className="md:grid md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] md:gap-4">
      <div>
        <PageHeader title={t('calendar.title')} right={<span className="text-sm text-ink-2">{t('calendar.sessionCount', { n: monthCount })}</span>} />
        <Card>
          <MonthCalendar
            year={ym.y}
            month={ym.m}
            marked={marked}
            selected={selected}
            today={today}
            weekdays={weekdays}
            onSelect={setSelected}
            onMonthChange={(y, m) => setYm({ y, m })}
          />
        </Card>
      </div>
      <div className="mt-4 flex flex-col gap-3 md:mt-12">
        {daySessions.length === 0 ? (
          <p className="py-6 text-center text-sm text-ink-3">
            {selected} · {t('calendar.noWorkout')}
          </p>
        ) : (
          daySessions.map((s) => <SessionCard key={s.id} session={s} data={data} />)
        )}
        {selected <= today && (
          <Button
            disabled={hasActive}
            onClick={() => {
              setWorkout(logWorkout(data, selected))
              router.push('/workout')
            }}
          >
            <Icon name="plus" /> {t('calendar.addLog')}
          </Button>
        )}
      </div>
    </div>
  )
}
