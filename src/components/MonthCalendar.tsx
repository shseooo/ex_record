'use client'

import { monthGrid } from '@/lib/domain/dates'
import { Icon, cx } from './ui'

interface Props {
  year: number
  /** 0-index */
  month: number
  marked: Set<string>
  selected?: string
  today?: string
  weekdays: string[]
  title?: string
  onSelect: (date: string) => void
  onMonthChange: (year: number, month: number) => void
}

export function MonthCalendar({ year, month, marked, selected, today, weekdays, title, onSelect, onMonthChange }: Props) {
  const grid = monthGrid(year, month)
  const shift = (delta: number) => {
    const d = new Date(year, month + delta, 1)
    onMonthChange(d.getFullYear(), d.getMonth())
  }

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <button type="button" aria-label="prev" onClick={() => shift(-1)} className="rounded-lg p-2 text-ink-2 hover:bg-surface-2">
          <Icon name="left" />
        </button>
        <span className="font-semibold tabular">{title ?? `${year}.${String(month + 1).padStart(2, '0')}`}</span>
        <button type="button" aria-label="next" onClick={() => shift(1)} className="rounded-lg p-2 text-ink-2 hover:bg-surface-2">
          <Icon name="right" />
        </button>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center">
        {weekdays.map((w, i) => (
          <div key={w} className={cx('py-1 text-xs', i === 0 ? 'text-danger' : 'text-ink-3')}>
            {w}
          </div>
        ))}
        {grid.map(({ date, inMonth }) => {
          const isMarked = marked.has(date)
          const isSelected = date === selected
          return (
            <button
              key={date}
              type="button"
              aria-label={date}
              aria-pressed={isSelected}
              data-marked={isMarked}
              onClick={() => onSelect(date)}
              className={cx(
                'relative flex aspect-square flex-col items-center justify-center rounded-lg text-sm tabular',
                !inMonth && 'text-ink-3 opacity-40',
                isSelected ? 'bg-accent font-semibold text-accent-ink' : 'hover:bg-surface-2',
                date === today && !isSelected && 'font-bold text-accent',
              )}
            >
              {Number(date.slice(8))}
              <span
                className={cx(
                  'mt-0.5 size-1.5 rounded-full',
                  isMarked ? (isSelected ? 'bg-accent-ink' : 'bg-accent') : 'bg-transparent',
                )}
                aria-hidden
              />
            </button>
          )
        })}
      </div>
    </div>
  )
}
