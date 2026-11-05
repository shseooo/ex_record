import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, within } from '@testing-library/react'
import { RoutineEditor } from './RoutineEditor'
import type { Exercise, RoutineItem } from '@/lib/domain/types'

const exercises: Exercise[] = [
  { id: 'bench', name: 'Bench', type: 'weight', bodyPart: 'chest', defaultRestSec: 90, incrementKg: 2.5, archived: false },
  { id: 'squat', name: 'Squat', type: 'weight', bodyPart: 'legs', defaultRestSec: 180, incrementKg: 5, archived: false },
]
const routine: RoutineItem[] = [
  { id: 'r1', day: 1, order: 0, exerciseId: 'bench', targetSets: 3, targetReps: 8 },
  { id: 'r2', day: 1, order: 1, exerciseId: 'squat', targetSets: 5, targetReps: 5 },
]
const dayLabels = ['일', '월', '화', '수', '목', '금', '토']

function setup(onSave = vi.fn()) {
  render(
    <RoutineEditor
      routine={routine}
      exercises={exercises}
      initialDay={1}
      dayLabels={dayLabels}
      exName={(e) => e.name}
      unit="kg"
      onSave={onSave}
      onPickExercise={() => {}}
      t={(k) => k}
    />,
  )
  return onSave
}

describe('RoutineEditor', () => {
  it('요일별 항목을 보여준다', () => {
    setup()
    expect(screen.getByText('Bench')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('radio', { name: '수' }))
    expect(screen.queryByText('Bench')).toBeNull()
    expect(screen.getByText('routine.empty')).toBeInTheDocument()
  })

  it('다른 요일에서 복사 → 저장', () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    const onSave = setup()
    fireEvent.click(screen.getByRole('radio', { name: '수' }))
    fireEvent.change(screen.getByLabelText('routine.copyFrom'), { target: { value: '1' } })
    expect(screen.getByText('Bench')).toBeInTheDocument()
    expect(screen.getByText('Squat')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'common.save' }))
    const saved: RoutineItem[] = onSave.mock.calls[0][0]
    expect(saved.filter((i) => i.day === 3).map((i) => i.exerciseId)).toEqual(['bench', 'squat'])
    expect(saved.filter((i) => i.day === 1)).toHaveLength(2)
  })

  it('목표 세트/횟수 수정 후 저장, 변경 없으면 저장 버튼 비활성', () => {
    const onSave = setup()
    const save = screen.getByRole('button', { name: 'common.save' })
    expect(save).toBeDisabled()
    const row = screen.getByText('Bench').closest('li')!
    fireEvent.change(within(row).getByLabelText('routine.sets'), { target: { value: '4' } })
    fireEvent.click(save)
    expect(onSave.mock.calls[0][0].find((i: RoutineItem) => i.id === 'r1').targetSets).toBe(4)
  })

  it('항목 삭제', () => {
    const onSave = setup()
    const row = screen.getByText('Bench').closest('li')!
    fireEvent.click(within(row).getByRole('button', { name: 'common.delete' }))
    expect(screen.queryByText('Bench')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'common.save' }))
    expect(onSave.mock.calls[0][0].map((i: RoutineItem) => i.id)).toEqual(['r2'])
  })
})
