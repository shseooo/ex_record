'use client'

import { useState } from 'react'
import { BODY_PARTS, type BodyPart, type Exercise, type ExerciseType } from '@/lib/domain/types'
import { newId } from '@/lib/domain/id'
import { useApp, useT } from '@/lib/store/use-app'
import { Button, Card, Field, Icon, PageHeader, Sheet, cx, inputClass } from './ui'

const TYPES: ExerciseType[] = ['weight', 'bodyweight', 'duration', 'cardio']

export function ExercisesView() {
  const { t, exName } = useT()
  const exercises = useApp((s) => s.data?.exercises ?? [])
  const dispatch = useApp((s) => s.dispatch)
  const [editing, setEditing] = useState<Exercise | null>(null)

  const save = (ex: Exercise) => {
    const exists = exercises.some((e) => e.id === ex.id)
    const next = exists ? exercises.map((e) => (e.id === ex.id ? ex : e)) : [...exercises, ex]
    void dispatch([{ type: 'setExercises', exercises: next }])
    setEditing(null)
  }

  return (
    <div>
      <PageHeader
        title={t('exercises.title')}
        right={
          <Button
            variant="primary"
            size="sm"
            onClick={() =>
              setEditing({ id: newId(), name: '', type: 'weight', bodyPart: 'chest', defaultRestSec: 90, incrementKg: 2.5, archived: false })
            }
          >
            <Icon name="plus" className="size-4" /> {t('exercises.new')}
          </Button>
        }
      />
      <div className="flex flex-col gap-4">
        {BODY_PARTS.map((part) => {
          const list = exercises.filter((e) => e.bodyPart === part)
          if (list.length === 0) return null
          return (
            <Card key={part} className="p-0">
              <h2 className="px-4 pt-3 text-xs font-semibold text-ink-3">{t(`part.${part}`)}</h2>
              <ul className="divide-y divide-line">
                {list.map((e) => (
                  <li key={e.id}>
                    <button type="button" onClick={() => setEditing(e)} className={cx('flex w-full items-center justify-between px-4 py-3 text-left', e.archived && 'opacity-50')}>
                      <span>{exName(e)}</span>
                      <span className="text-xs text-ink-3">{t(`type.${e.type}`)}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </Card>
          )
        })}
      </div>
      {editing && <ExerciseForm key={editing.id} initial={editing} onSave={save} onClose={() => setEditing(null)} />}
    </div>
  )
}

function ExerciseForm({ initial, onSave, onClose }: { initial: Exercise; onSave: (e: Exercise) => void; onClose: () => void }) {
  const { t, exName } = useT()
  const [ex, setEx] = useState<Exercise>({ ...initial, name: initial.name ? exName(initial) : '' })
  const set = (p: Partial<Exercise>) => setEx((e) => ({ ...e, ...p }))
  const nameUnchanged = initial.name.startsWith('@') && ex.name === exName(initial)

  return (
    <Sheet open onClose={onClose} title={initial.name ? exName(initial) : t('exercises.new')}>
      <form
        className="flex flex-col gap-3"
        onSubmit={(e) => {
          e.preventDefault()
          if (!ex.name.trim()) return
          // 기본 운동 이름을 바꾸지 않았다면 번역 키 유지
          onSave({ ...ex, name: nameUnchanged ? initial.name : ex.name.trim() })
        }}
      >
        <Field label={t('exercises.name')}>
          <input className={inputClass} value={ex.name} onChange={(e) => set({ name: e.target.value })} required />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label={t('exercises.type')}>
            <select className={inputClass} value={ex.type} onChange={(e) => set({ type: e.target.value as ExerciseType })}>
              {TYPES.map((v) => (
                <option key={v} value={v}>
                  {t(`type.${v}`)}
                </option>
              ))}
            </select>
          </Field>
          <Field label={t('exercises.bodyPart')}>
            <select className={inputClass} value={ex.bodyPart} onChange={(e) => set({ bodyPart: e.target.value as BodyPart })}>
              {BODY_PARTS.map((v) => (
                <option key={v} value={v}>
                  {t(`part.${v}`)}
                </option>
              ))}
            </select>
          </Field>
          <Field label={t('exercises.rest')}>
            <input className={inputClass} inputMode="numeric" value={ex.defaultRestSec} onChange={(e) => set({ defaultRestSec: Number(e.target.value) || 0 })} />
          </Field>
          {ex.type === 'weight' && (
            <Field label={t('exercises.increment')}>
              <input className={inputClass} inputMode="decimal" value={ex.incrementKg} onChange={(e) => set({ incrementKg: Number(e.target.value) || 0 })} />
            </Field>
          )}
        </div>
        <div className="mt-2 grid grid-cols-2 gap-2">
          <Button onClick={() => onSave({ ...ex, name: nameUnchanged ? initial.name : ex.name, archived: !ex.archived })} disabled={!initial.name}>
            {ex.archived ? t('exercises.unarchive') : t('exercises.archive')}
          </Button>
          <Button type="submit" variant="primary">
            {t('common.save')}
          </Button>
        </div>
      </form>
    </Sheet>
  )
}
