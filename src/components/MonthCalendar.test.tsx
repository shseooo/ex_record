import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MonthCalendar } from './MonthCalendar'

const weekdays = ['일', '월', '화', '수', '목', '금', '토']

describe('MonthCalendar', () => {
  it('운동한 날을 표시하고, 날짜 클릭 시 onSelect', () => {
    const onSelect = vi.fn()
    render(
      <MonthCalendar
        year={2026}
        month={10}
        marked={new Set(['2026-11-03', '2026-11-05'])}
        selected="2026-11-05"
        today="2026-11-05"
        weekdays={weekdays}
        onSelect={onSelect}
        onMonthChange={() => {}}
      />,
    )
    const day3 = screen.getByRole('button', { name: /2026-11-03/ })
    expect(day3).toHaveAttribute('data-marked', 'true')
    expect(screen.getByRole('button', { name: /2026-11-04/ })).toHaveAttribute('data-marked', 'false')
    expect(screen.getByRole('button', { name: /2026-11-05/ })).toHaveAttribute('aria-pressed', 'true')

    fireEvent.click(day3)
    expect(onSelect).toHaveBeenCalledWith('2026-11-03')
  })

  it('이전/다음 달 이동 (연도 경계)', () => {
    const onMonthChange = vi.fn()
    const { rerender } = render(
      <MonthCalendar year={2026} month={0} marked={new Set()} weekdays={weekdays} onSelect={() => {}} onMonthChange={onMonthChange} />,
    )
    fireEvent.click(screen.getByRole('button', { name: 'prev' }))
    expect(onMonthChange).toHaveBeenLastCalledWith(2025, 11)

    rerender(
      <MonthCalendar year={2026} month={11} marked={new Set()} weekdays={weekdays} onSelect={() => {}} onMonthChange={onMonthChange} />,
    )
    fireEvent.click(screen.getByRole('button', { name: 'next' }))
    expect(onMonthChange).toHaveBeenLastCalledWith(2027, 0)
  })
})
