import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, within } from '@testing-library/react'
import { BodyWeightEditor } from './BodyWeightEditor'
import { translate } from '@/lib/i18n'
import type { BodyWeightEntry } from '@/lib/domain/types'

const t = (k: Parameters<typeof translate>[1], v?: Record<string, string | number>) => translate('ko', k, v)
const entries: BodyWeightEntry[] = [
  { date: '2026-11-01', weightKg: 73 },
  { date: '2026-11-03', weightKg: 72.5 },
]
const setup = (variant: 'quick' | 'full', unit: 'kg' | 'lb' = 'kg', list = entries) => {
  const onSave = vi.fn()
  const onDelete = vi.fn()
  render(<BodyWeightEditor variant={variant} entries={list} unit={unit} today="2026-11-05" t={t} onSave={onSave} onDelete={onDelete} />)
  return { onSave, onDelete }
}

describe('BodyWeightEditor', () => {
  it('quick: 오늘 체중 입력 후 저장 (안내 문구에 단위)', () => {
    const { onSave } = setup('quick')
    const input = screen.getByLabelText('오늘 체중')
    expect(input).toHaveAttribute('placeholder', '오늘 체중 (kg)')
    fireEvent.change(input, { target: { value: '71,8' } })
    fireEvent.click(screen.getByRole('button', { name: '저장' }))
    expect(onSave).toHaveBeenCalledWith({ date: '2026-11-05', weightKg: 71.8 }, undefined)
  })

  it('quick: 오늘 이미 기록했으면 그 값을 보여주고, 다시 저장하면 수정', () => {
    const { onSave } = setup('quick', 'kg', [...entries, { date: '2026-11-05', weightKg: 72 }])
    expect(screen.getByLabelText('오늘 체중')).toHaveValue('72')
    expect(screen.getByText('오늘 기록됨')).toBeInTheDocument()
    fireEvent.change(screen.getByLabelText('오늘 체중'), { target: { value: '71.5' } })
    fireEvent.click(screen.getByRole('button', { name: '저장' }))
    expect(onSave).toHaveBeenCalledWith({ date: '2026-11-05', weightKg: 71.5 }, undefined)
  })

  it('잘못된 값은 저장하지 않는다', () => {
    const { onSave } = setup('quick')
    fireEvent.change(screen.getByLabelText('오늘 체중'), { target: { value: '0' } })
    fireEvent.click(screen.getByRole('button', { name: '저장' }))
    expect(onSave).not.toHaveBeenCalled()
  })

  it('lb 설정이면 lb로 받고 kg로 저장', () => {
    const { onSave } = setup('quick', 'lb')
    fireEvent.change(screen.getByLabelText('오늘 체중'), { target: { value: '160' } })
    fireEvent.click(screen.getByRole('button', { name: '저장' }))
    expect(onSave.mock.calls[0][0].weightKg).toBeCloseTo(72.57, 2)
  })

  it('full: 날짜를 골라 입력', () => {
    const { onSave } = setup('full')
    fireEvent.change(screen.getByLabelText('날짜'), { target: { value: '2026-11-04' } })
    fireEvent.change(screen.getByLabelText('체중'), { target: { value: '72.2' } })
    fireEvent.click(screen.getByRole('button', { name: '저장' }))
    expect(onSave).toHaveBeenCalledWith({ date: '2026-11-04', weightKg: 72.2 }, undefined)
  })

  it('full: 최근 기록을 최신순으로 보여주고 삭제', () => {
    const { onDelete } = setup('full')
    const rows = screen.getAllByRole('listitem')
    expect(rows.map((r) => r.textContent)).toEqual([expect.stringContaining('11-03'), expect.stringContaining('11-01')])
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    fireEvent.click(within(rows[1]).getByRole('button', { name: '삭제' }))
    expect(onDelete).toHaveBeenCalledWith('2026-11-01')
  })

  it('full: 편집을 누르면 폼에 채우고, 저장하면 그 날짜 값을 수정', () => {
    const { onSave } = setup('full')
    fireEvent.click(within(screen.getAllByRole('listitem')[0]).getByRole('button', { name: '편집' }))
    expect(screen.getByLabelText('날짜')).toHaveValue('2026-11-03')
    expect(screen.getByLabelText('체중')).toHaveValue('72.5')
    fireEvent.change(screen.getByLabelText('체중'), { target: { value: '72.8' } })
    fireEvent.click(screen.getByRole('button', { name: '저장' }))
    expect(onSave).toHaveBeenCalledWith({ date: '2026-11-03', weightKg: 72.8 }, '2026-11-03')
  })

  it('full: 편집 중 날짜를 바꾸면 원래 날짜를 함께 넘겨 옮긴다', () => {
    const { onSave } = setup('full')
    fireEvent.click(within(screen.getAllByRole('listitem')[0]).getByRole('button', { name: '편집' }))
    fireEvent.change(screen.getByLabelText('날짜'), { target: { value: '2026-11-02' } })
    fireEvent.click(screen.getByRole('button', { name: '저장' }))
    expect(onSave).toHaveBeenCalledWith({ date: '2026-11-02', weightKg: 72.5 }, '2026-11-03')
  })

  it('full: 편집 취소', () => {
    setup('full')
    fireEvent.click(within(screen.getAllByRole('listitem')[0]).getByRole('button', { name: '편집' }))
    fireEvent.click(screen.getByRole('button', { name: '취소' }))
    expect(screen.getByLabelText('날짜')).toHaveValue('2026-11-05')
    expect(screen.getByLabelText('체중')).toHaveValue('')
  })
})
