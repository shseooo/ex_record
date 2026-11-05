'use client'

import { useMemo, useState } from 'react'
import { BODY_PARTS, type Exercise } from '@/lib/domain/types'
import { useApp, useT } from '@/lib/store/use-app'
import { Sheet, inputClass } from './ui'

export function ExercisePicker({
  open,
  onClose,
  onPick,
}: {
  open: boolean
  onClose: () => void
  onPick: (ex: Exercise) => void
}) {
  const { t, exName } = useT()
  const exercises = useApp((s) => s.data?.exercises ?? [])
  const [q, setQ] = useState('')

  const groups = useMemo(() => {
    const query = q.trim().toLowerCase()
    const visible = exercises.filter(
      (e) => !e.archived && (!query || exName(e).toLowerCase().includes(query)),
    )
    return BODY_PARTS.map((part) => ({
      part,
      items: visible.filter((e) => e.bodyPart === part).sort((a, b) => exName(a).localeCompare(exName(b))),
    })).filter((g) => g.items.length > 0)
  }, [exercises, q, exName])

  return (
    <Sheet open={open} onClose={onClose} title={t('workout.addExercise')}>
      <input
        className={inputClass}
        placeholder={t('exercises.search')}
        value={q}
        onChange={(e) => setQ(e.target.value)}
        aria-label={t('exercises.search')}
      />
      <div className="mt-3 flex flex-col gap-4">
        {groups.map((g) => (
          <div key={g.part}>
            <h3 className="mb-1 text-xs font-semibold text-ink-3">{t(`part.${g.part}`)}</h3>
            <ul className="divide-y divide-line rounded-lg border border-line">
              {g.items.map((e) => (
                <li key={e.id}>
                  <button
                    type="button"
                    className="flex w-full items-center justify-between px-3 py-3 text-left hover:bg-surface-2"
                    onClick={() => {
                      onPick(e)
                      onClose()
                      setQ('')
                    }}
                  >
                    <span>{exName(e)}</span>
                    <span className="text-xs text-ink-3">{t(`type.${e.type}`)}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ))}
        <a href="/settings/exercises" className="text-center text-sm text-accent">
          + {t('exercises.new')}
        </a>
      </div>
    </Sheet>
  )
}
