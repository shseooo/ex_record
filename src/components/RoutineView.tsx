'use client'

import { useRef, useState } from 'react'
import type { Exercise, Weekday } from '@/lib/domain/types'
import { useApp, useT } from '@/lib/store/use-app'
import { ExercisePicker } from './ExercisePicker'
import { RoutineEditor } from './RoutineEditor'
import { PageHeader } from './ui'

export function RoutineView() {
  const { t, exName, unit } = useT()
  const data = useApp((s) => s.data)
  const dispatch = useApp((s) => s.dispatch)
  const [picker, setPicker] = useState(false)
  const pickCb = useRef<((ex: Exercise) => void) | null>(null)
  if (!data) return null

  return (
    <div>
      <PageHeader title={t('routine.title')} />
      <RoutineEditor
        routine={data.routine}
        exercises={data.exercises}
        initialDay={new Date().getDay() as Weekday}
        dayLabels={[0, 1, 2, 3, 4, 5, 6].map((d) => t(`day.${d as 0}`))}
        unit={unit}
        exName={exName}
        t={t}
        onSave={(routine) => void dispatch([{ type: 'setRoutine', routine }])}
        onPickExercise={(cb) => {
          pickCb.current = cb
          setPicker(true)
        }}
      />
      <ExercisePicker open={picker} onClose={() => setPicker(false)} onPick={(ex) => pickCb.current?.(ex)} />
    </div>
  )
}
