import { describe, it, expect } from 'vitest'
import { TABS, encodeTab, decodeTab, encodeSettings, decodeSettings } from './codec'
import type { Exercise, SetRecord } from '@/lib/domain/types'
import { DEFAULT_SETTINGS } from '@/lib/domain/types'

describe('codec', () => {
  it('헤더 + 행으로 인코딩하고 다시 디코딩하면 같은 객체', () => {
    const sets: SetRecord[] = [
      {
        id: 'a',
        sessionId: 's1',
        date: '2026-11-01',
        exerciseId: 'bench',
        setNo: 1,
        weightKg: 60,
        reps: 10,
        isWarmup: false,
      },
      {
        id: 'b',
        sessionId: 's1',
        date: '2026-11-01',
        exerciseId: 'plank',
        setNo: 1,
        durationSec: 60,
        rpe: 8,
        isWarmup: true,
      },
    ]
    const rows = encodeTab('sets', sets)
    expect(rows[0]).toEqual(TABS.sets.map((c) => c.key))
    expect(rows[1][TABS.sets.findIndex((c) => c.key === 'isWarmup')]).toBe('FALSE')
    expect(decodeTab('sets', rows.slice(1))).toEqual(sets)
  })

  it('Sheets가 돌려주는 문자열/숫자/빈 셀을 견고하게 파싱', () => {
    const rows = [['e1', 'Bench', 'weight', 'chest', '90', 2.5, 'TRUE']]
    const [ex] = decodeTab('exercises', rows) as Exercise[]
    expect(ex).toEqual({
      id: 'e1',
      name: 'Bench',
      type: 'weight',
      bodyPart: 'chest',
      defaultRestSec: 90,
      incrementKg: 2.5,
      archived: true,
    })
  })

  it('끝의 빈 셀이 잘린 행과 id 없는 행 처리', () => {
    const rows = [['s1', '2026-11-01', 'a', 'b'], [], ['', 'x']]
    expect(decodeTab('sessions', rows)).toEqual([
      { id: 's1', date: '2026-11-01', startedAt: 'a', endedAt: 'b', note: '' },
    ])
  })

  it('settings는 key/value 행', () => {
    const rows = encodeSettings({ ...DEFAULT_SETTINGS, unit: 'lb', weeklyGoal: 4 })
    expect(rows[0]).toEqual(['key', 'value'])
    expect(decodeSettings(rows.slice(1))).toEqual({ ...DEFAULT_SETTINGS, unit: 'lb', weeklyGoal: 4 })
  })

  it('settings의 잘못된 값은 기본값으로', () => {
    expect(decodeSettings([['unit', 'stone'], ['weeklyGoal', 'abc']])).toEqual(DEFAULT_SETTINGS)
  })
})
