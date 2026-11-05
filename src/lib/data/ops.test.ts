import { describe, it, expect } from 'vitest'
import { applyOps, bodyWeightOps, changedTabs, emptyData, isOpArray, type Op } from './ops'
import type { Session, SetRecord } from '@/lib/domain/types'

const session = (id: string, date = '2026-11-01'): Session => ({
  id,
  date,
  startedAt: `${date}T10:00:00.000Z`,
  endedAt: `${date}T11:00:00.000Z`,
  note: '',
})
const set = (id: string, sessionId: string): SetRecord => ({
  id,
  sessionId,
  date: '2026-11-01',
  exerciseId: 'bench',
  setNo: 1,
  weightKg: 60,
  reps: 10,
  isWarmup: false,
})

describe('applyOps', () => {
  it('upsertSession: 새 세션과 세트를 추가', () => {
    const data = applyOps(emptyData(), [
      { type: 'upsertSession', session: session('s1'), sets: [set('a', 's1'), set('b', 's1')] },
    ])
    expect(data.sessions).toHaveLength(1)
    expect(data.sets).toHaveLength(2)
  })

  it('upsertSession은 멱등: 같은 세션을 다시 보내면 세트를 교체', () => {
    const op: Op = { type: 'upsertSession', session: session('s1'), sets: [set('a', 's1')] }
    const data = applyOps(emptyData(), [
      op,
      op,
      { type: 'upsertSession', session: { ...session('s1'), note: 'edited' }, sets: [set('c', 's1')] },
    ])
    expect(data.sessions).toEqual([{ ...session('s1'), note: 'edited' }])
    expect(data.sets.map((s) => s.id)).toEqual(['c'])
  })

  it('deleteSession: 세션과 그 세트 삭제', () => {
    const data = applyOps(emptyData(), [
      { type: 'upsertSession', session: session('s1'), sets: [set('a', 's1')] },
      { type: 'upsertSession', session: session('s2'), sets: [set('b', 's2')] },
      { type: 'deleteSession', id: 's1' },
    ])
    expect(data.sessions.map((s) => s.id)).toEqual(['s2'])
    expect(data.sets.map((s) => s.id)).toEqual(['b'])
  })

  it('체중: 같은 날짜는 덮어쓰고 날짜순 정렬', () => {
    const data = applyOps(emptyData(), [
      { type: 'upsertBodyWeight', entry: { date: '2026-11-02', weightKg: 70 } },
      { type: 'upsertBodyWeight', entry: { date: '2026-11-01', weightKg: 71 } },
      { type: 'upsertBodyWeight', entry: { date: '2026-11-02', weightKg: 69.5 } },
    ])
    expect(data.bodyWeights).toEqual([
      { date: '2026-11-01', weightKg: 71 },
      { date: '2026-11-02', weightKg: 69.5 },
    ])
    expect(applyOps(data, [{ type: 'deleteBodyWeight', date: '2026-11-01' }]).bodyWeights).toHaveLength(1)
  })

  it('원본 데이터를 변경하지 않는다', () => {
    const base = emptyData()
    applyOps(base, [{ type: 'upsertSession', session: session('s1'), sets: [] }])
    expect(base.sessions).toHaveLength(0)
  })
})

describe('changedTabs', () => {
  it('연산별로 다시 써야 할 시트 탭', () => {
    expect(changedTabs([{ type: 'deleteSession', id: 'x' }])).toEqual(['sessions', 'sets'])
    expect(
      changedTabs([
        { type: 'setRoutine', routine: [] },
        { type: 'setSettings', settings: emptyData().settings },
        { type: 'setRoutine', routine: [] },
      ]).sort(),
    ).toEqual(['routine', 'settings'])
  })
})

describe('isOpArray', () => {
  it('올바른 op는 통과', () => {
    expect(
      isOpArray([
        { type: 'upsertSession', session: session('s1'), sets: [set('x1', 's1')] },
        { type: 'deleteSession', id: 's1' },
        { type: 'setSettings', settings: emptyData().settings },
        { type: 'upsertBodyWeight', entry: { date: '2026-11-01', weightKg: 70 } },
        { type: 'setExercises', exercises: [] },
      ]),
    ).toBe(true)
  })

  it.each([
    ['알 수 없는 type', { type: 'dropTable' }],
    ['prototype 키', { type: 'toString' }],
    ['필드 누락', { type: 'setExercises' }],
    ['sets 누락', { type: 'upsertSession', session: session('s1') }],
    ['잘못된 세트', { type: 'upsertSession', session: session('s1'), sets: [{ id: 'x' }] }],
    ['숫자 대신 문자열', { type: 'upsertBodyWeight', entry: { date: 'd', weightKg: '70' } }],
    ['NaN', { type: 'upsertBodyWeight', entry: { date: 'd', weightKg: NaN } }],
    ['settings 누락 필드', { type: 'setSettings', settings: { locale: 'ko' } }],
    ['null', null],
  ])('%s는 거부', (_, op) => {
    expect(isOpArray([op])).toBe(false)
  })
})

describe('bodyWeightOps: 체중 저장/수정', () => {
  const base = applyOps(emptyData(), [{ type: 'upsertBodyWeight', entry: { date: '2026-11-03', weightKg: 72.5 } }])
  it('같은 날짜면 값만 수정', () => {
    const next = applyOps(base, bodyWeightOps({ date: '2026-11-03', weightKg: 72.8 }, '2026-11-03'))
    expect(next.bodyWeights).toEqual([{ date: '2026-11-03', weightKg: 72.8 }])
  })
  it('날짜를 바꾸면 원래 날짜 기록은 지우고 옮긴다', () => {
    const next = applyOps(base, bodyWeightOps({ date: '2026-11-02', weightKg: 72.5 }, '2026-11-03'))
    expect(next.bodyWeights).toEqual([{ date: '2026-11-02', weightKg: 72.5 }])
  })
})

