import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { SetSummaryView } from './SetSummary'
import { translate } from '@/lib/i18n'

const t = (k: Parameters<typeof translate>[1], v?: Record<string, string | number>) => translate('ko', k, v)
const fmtW = (kg?: number) => `${kg}kg`
const text = (el: React.ReactElement) => render(el).container.textContent?.replace(/\s+/g, ' ').trim()

describe('SetSummaryView', () => {
  it('보조 무게 반복을 한 번만 쓰고 횟수 나열', () => {
    const sets = [3, 5, 4].map((reps) => ({ weightKg: -25, reps }))
    expect(text(<SetSummaryView type="bodyweight" sets={sets} t={t} fmtW={fmtW} />)).toBe('-25kg3 · 5 · 4회')
  })
  it('모두 같으면 "10회 × 3세트"', () => {
    const sets = [1, 2, 3].map(() => ({ weightKg: 60, reps: 10 }))
    expect(text(<SetSummaryView type="weight" sets={sets} t={t} fmtW={fmtW} />)).toBe('60kg10회 × 3세트')
  })
  it('무게가 바뀌면 묶음이 나뉜다', () => {
    const sets = [{ weightKg: 60, reps: 10 }, { weightKg: 60, reps: 8 }, { weightKg: 70, reps: 5 }]
    expect(text(<SetSummaryView type="weight" sets={sets} t={t} fmtW={fmtW} />)).toBe('60kg10 · 8회70kg5회')
  })
  it('맨몸: 무게 있는 세트와 섞이면 무게 없는 묶음에 "맨몸" 표시', () => {
    const sets = [{ weightKg: 10, reps: 8 }, { reps: 12 }]
    expect(text(<SetSummaryView type="bodyweight" sets={sets} t={t} fmtW={fmtW} />)).toBe('+10kg8회맨몸12회')
    expect(text(<SetSummaryView type="bodyweight" sets={[{ reps: 12 }, { reps: 10 }]} t={t} fmtW={fmtW} />)).toBe('12 · 10회')
  })

  it('맨몸 추가 무게는 +, 시간/유산소', () => {
    expect(text(<SetSummaryView type="bodyweight" sets={[{ weightKg: 10, reps: 8 }]} t={t} fmtW={fmtW} />)).toBe('+10kg8회')
    expect(text(<SetSummaryView type="duration" sets={[{ durationSec: 60 }, { durationSec: 60 }]} t={t} fmtW={fmtW} />)).toBe('1:00 × 2세트')
    expect(text(<SetSummaryView type="cardio" sets={[{ distanceKm: 5, durationSec: 1500 }]} t={t} fmtW={fmtW} />)).toBe('5km25:00')
  })
})
