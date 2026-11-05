import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { SetRow } from './SetRow'
import type { DraftSet } from '@/lib/domain/workout'

const labels = { weight: 'weight', reps: 'reps', time: 'time', distance: 'km', done: 'done', remove: 'remove', warmup: 'W' }
const base: DraftSet = { id: 's1', weightKg: 60, reps: 10, isWarmup: false, done: false }

describe('SetRow', () => {
  it('weight 타입: 무게/횟수 입력, kg 단위 그대로 저장', () => {
    const onChange = vi.fn()
    render(<SetRow index={0} set={base} type="weight" unit="kg" labels={labels} onChange={onChange} onToggle={() => {}} onRemove={() => {}} />)
    const weight = screen.getByLabelText('weight')
    expect(weight).toHaveValue('60')
    fireEvent.change(weight, { target: { value: '62.5' } })
    expect(onChange).toHaveBeenLastCalledWith({ weightKg: 62.5 })
    fireEvent.change(screen.getByLabelText('reps'), { target: { value: '8' } })
    expect(onChange).toHaveBeenLastCalledWith({ reps: 8 })
  })

  it('lb 설정이면 lb로 표시하고 kg로 변환해 저장', () => {
    const onChange = vi.fn()
    render(<SetRow index={0} set={{ ...base, weightKg: 61.235 }} type="weight" unit="lb" labels={labels} onChange={onChange} onToggle={() => {}} onRemove={() => {}} />)
    expect(screen.getByLabelText('weight')).toHaveValue('135')
    fireEvent.change(screen.getByLabelText('weight'), { target: { value: '225' } })
    expect(onChange.mock.lastCall![0].weightKg).toBeCloseTo(102.06, 2)
  })

  it('빈 값은 undefined', () => {
    const onChange = vi.fn()
    render(<SetRow index={0} set={base} type="weight" unit="kg" labels={labels} onChange={onChange} onToggle={() => {}} onRemove={() => {}} />)
    fireEvent.change(screen.getByLabelText('weight'), { target: { value: '' } })
    expect(onChange).toHaveBeenLastCalledWith({ weightKg: undefined })
  })

  it('duration 타입: m:ss 입력을 초로', () => {
    const onChange = vi.fn()
    render(<SetRow index={0} set={{ id: 'p', durationSec: 60, isWarmup: false, done: false }} type="duration" unit="kg" labels={labels} onChange={onChange} onToggle={() => {}} onRemove={() => {}} />)
    const time = screen.getByLabelText('time')
    expect(time).toHaveValue('1:00')
    fireEvent.change(time, { target: { value: '1:30' } })
    fireEvent.blur(time)
    expect(onChange).toHaveBeenLastCalledWith({ durationSec: 90 })
    expect(screen.queryByLabelText('weight')).toBeNull()
  })

  it('cardio 타입: 거리 + 시간', () => {
    render(<SetRow index={0} set={{ id: 'c', distanceKm: 5, durationSec: 1500, isWarmup: false, done: false }} type="cardio" unit="kg" labels={labels} onChange={() => {}} onToggle={() => {}} onRemove={() => {}} />)
    expect(screen.getByLabelText('km')).toHaveValue('5')
    expect(screen.getByLabelText('time')).toHaveValue('25:00')
  })

  it('bodyweight 타입: 음수(보조) 무게 입력 가능', () => {
    const onChange = vi.fn()
    render(<SetRow index={0} set={{ id: 'd', reps: 8, isWarmup: false, done: false }} type="bodyweight" unit="kg" labels={labels} onChange={onChange} onToggle={() => {}} onRemove={() => {}} />)
    fireEvent.change(screen.getByLabelText('weight'), { target: { value: '-20' } })
    expect(onChange).toHaveBeenLastCalledWith({ weightKg: -20 })
  })

  it('bodyweight 타입: ± 버튼으로 부호 전환', () => {
    const onChange = vi.fn()
    render(<SetRow index={0} set={{ id: 'd', weightKg: 10, reps: 8, isWarmup: false, done: false }} type="bodyweight" unit="kg" labels={labels} onChange={onChange} onToggle={() => {}} onRemove={() => {}} />)
    fireEvent.click(screen.getByRole('button', { name: '±' }))
    expect(onChange).toHaveBeenLastCalledWith({ weightKg: -10 })
  })

  it('weight 타입은 음수를 받지 않는다', () => {
    const onChange = vi.fn()
    render(<SetRow index={0} set={base} type="weight" unit="kg" labels={labels} onChange={onChange} onToggle={() => {}} onRemove={() => {}} />)
    fireEvent.change(screen.getByLabelText('weight'), { target: { value: '-20' } })
    expect(onChange).toHaveBeenLastCalledWith({ weightKg: undefined })
    expect(screen.queryByRole('button', { name: '±' })).toBeNull()
  })

  it('완료 버튼과 워밍업 토글', () => {
    const onToggle = vi.fn()
    const onChange = vi.fn()
    render(<SetRow index={2} set={base} type="weight" unit="kg" labels={labels} onChange={onChange} onToggle={onToggle} onRemove={() => {}} />)
    fireEvent.click(screen.getByRole('button', { name: 'done' }))
    expect(onToggle).toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: '3' }))
    expect(onChange).toHaveBeenLastCalledWith({ isWarmup: true })
  })
})
