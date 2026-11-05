import { describe, it, expect } from 'vitest'
import { itemsForDay, copyDay, reorder } from './routine'
import type { RoutineItem } from './types'

const item = (p: Partial<RoutineItem>): RoutineItem => ({
  id: Math.random().toString(36).slice(2),
  day: 1,
  order: 0,
  exerciseId: 'bench',
  targetSets: 3,
  ...p,
})

const routine: RoutineItem[] = [
  item({ id: 'a', day: 1, order: 1, exerciseId: 'squat' }),
  item({ id: 'b', day: 1, order: 0, exerciseId: 'bench', supersetGroup: 'g1' }),
  item({ id: 'c', day: 3, order: 0, exerciseId: 'deadlift' }),
]

describe('routine', () => {
  it('itemsForDay: 요일 항목을 order 순으로', () => {
    expect(itemsForDay(routine, 1).map((i) => i.id)).toEqual(['b', 'a'])
    expect(itemsForDay(routine, 0)).toEqual([])
  })

  it('copyDay: 대상 요일을 원본으로 교체하고 새 id를 부여한다', () => {
    let k = 0
    const next = copyDay(routine, 1, 3, () => `new${k++}`)
    const wed = itemsForDay(next, 3)
    expect(wed.map((i) => i.exerciseId)).toEqual(['bench', 'squat'])
    expect(wed.map((i) => i.id)).toEqual(['new0', 'new1'])
    expect(wed.every((i) => i.day === 3)).toBe(true)
    // 원본 요일은 그대로, 기존 수요일 항목(deadlift)은 제거
    expect(itemsForDay(next, 1).map((i) => i.id)).toEqual(['b', 'a'])
    expect(next.find((i) => i.id === 'c')).toBeUndefined()
  })

  it('copyDay: 슈퍼세트 그룹은 대상 요일에서 새 그룹 id로 유지된다', () => {
    let k = 0
    const next = copyDay(routine, 1, 5, () => `id${k++}`)
    const fri = itemsForDay(next, 5)
    expect(fri[0].supersetGroup).toBeDefined()
    expect(fri[0].supersetGroup).not.toBe('g1')
  })

  it('copyDay: 같은 요일이면 변경 없음', () => {
    expect(copyDay(routine, 1, 1)).toBe(routine)
  })

  it('reorder: 항목을 위/아래로 옮기고 order를 다시 매긴다', () => {
    const moved = reorder(routine, 1, 'a', -1)
    expect(itemsForDay(moved, 1).map((i) => [i.id, i.order])).toEqual([
      ['a', 0],
      ['b', 1],
    ])
    // 맨 위에서 위로 이동은 무시
    expect(itemsForDay(reorder(routine, 1, 'b', -1), 1).map((i) => i.id)).toEqual(['b', 'a'])
  })
})
